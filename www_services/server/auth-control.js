import { hash, verify } from "scrypt";
import { z } from "zod";

import * as sessionService from "./session-service.js";
import * as userService from "./user-service.js";
import * as emailService from "./email-service.js";

// In-memory store for verification codes (in production, use Redis or database)
const verificationCodes = new Map(); // email -> { code, expiresAt }

const validator = z.object({
  email: z.string().email({ message: "Not a valid e-mail address" }),
});

// Validate Aalto email
const isAaltoEmail = (email) => {
  return email.trim().toLowerCase().endsWith('@aalto.fi');
};

// Generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification code to email
const sendVerificationCode = async (c) => {
  const data = await c.req.json();
  const { email } = data;

  if (!email) {
    return c.json({ error: "Email is required" }, 400);
  }

  // Validate email format
  const validationResult = validator.safeParse({ email });
  if (!validationResult.success) {
    return c.json({ error: "Invalid email address" }, 400);
  }

  // Check if it's an Aalto email
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAaltoEmail(normalizedEmail)) {
    return c.json({ error: "Please use an Aalto email address (@aalto.fi)" }, 400);
  }

  // Generate and store verification code
  const code = generateVerificationCode();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  verificationCodes.set(normalizedEmail, { code, expiresAt });

  // Check if email service is configured
  const hasEmailConfig = Deno.env.get('SENDGRID_API_KEY') || Deno.env.get('SMTP_HOST');
  
  // Try to send email
  try {
    await emailService.sendVerificationCodeEmail(normalizedEmail, code);
    console.log(`[Email] Verification code sent to ${normalizedEmail}`);
    
    // Return success (don't include code in production)
    return c.json({ 
      message: "Verification code sent to your email",
      ...(hasEmailConfig ? {} : { code: code, devMode: true })
    }, 200);
  } catch (error) {
    console.error(`[Email] Failed to send email to ${normalizedEmail}:`, error);
    // In development, still log the code even if email fails
    console.log(`[DEV] Verification code for ${normalizedEmail}: ${code}`);
    console.log(`[DEV] Code expires at: ${new Date(expiresAt).toISOString()}`);
    
    // Always return code in dev mode for testing
    return c.json({ 
      message: hasEmailConfig ? "Failed to send email. Check server logs." : "Verification code sent (dev mode - no email service configured)",
      code: code,
      devMode: !hasEmailConfig
    }, 200);
  }
};

// Verify code
const verifyCode = async (c) => {
  const data = await c.req.json();
  const { email, code } = data;

  if (!email || !code) {
    return c.json({ error: "Email and code are required" }, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const stored = verificationCodes.get(normalizedEmail);

  if (!stored) {
    return c.json({ error: "No verification code found for this email" }, 400);
  }

  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(normalizedEmail);
    return c.json({ error: "Verification code has expired" }, 400);
  }

  if (stored.code !== code) {
    return c.json({ error: "Invalid verification code" }, 400);
  }

  // Code is valid, remove it from store
  verificationCodes.delete(normalizedEmail);

  return c.json({ message: "Verification code is valid" }, 200);
};

const registerUser = async (c) => {
  const data = await c.req.json();
  const validationResult = validator.safeParse(data);

  if(!validationResult.success) {
    return c.json(validationResult.error.format(), 400);
  }

  const { username, email, password, verificationCode } = data;

  // Validate Aalto email
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAaltoEmail(normalizedEmail)) {
    return c.json({ error: "Please use an Aalto email address (@aalto.fi)" }, 400);
  }

  // Verify code if provided
  if (verificationCode) {
    const stored = verificationCodes.get(normalizedEmail);
    if (!stored || stored.code !== verificationCode || Date.now() > stored.expiresAt) {
      return c.json({ error: "Invalid or expired verification code" }, 400);
    }
    // Remove code after successful registration
    verificationCodes.delete(normalizedEmail);
  }

  const result = await userService.createUser(username, normalizedEmail, hash(password.trim()));
  
  return c.json(result, 200);
}

//TODO: replace error messages with generic ones
const loginUser = async (c) => {
  const data = await c.req.json();
  const { email, password, username } = data;

  // Support login with either email or username
  let userResult;
  if (email) {
    userResult = await userService.getUserFromEmail(email.trim().toLowerCase());
  } else if (username) {
    // If we need username lookup, add it to user-service
    // For now, treat username as email
    userResult = await userService.getUserFromEmail(username.trim().toLowerCase());
  } else {
    return c.json({ error: "Email or username is required" }, 400);
  }

  if (userResult.length === 0) {
    return c.json({ error: "Invalid email/username or password" }, 401);
  }

  const user = userResult[0];

  const validPass = verify(password.trim(), user.password_hash);
  if(validPass) {
    //Set a new session here
    await sessionService.createSession(c, user);
    return c.json({ 
      message: `Logged in as ${user.email}`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } else {
    return c.json({ error: "Invalid email/username or password" }, 401);
  }
}

const logoutUser = async (c) => {
  await sessionService.deleteSession(c);

  return c.json({ message: "Session deleted." });
}

export { registerUser, loginUser, logoutUser, sendVerificationCode, verifyCode }

