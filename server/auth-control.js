import { hash, verify } from "scrypt";
import { z } from "zod";

import * as sessionService from "./session-service.js";
import * as userService from "./user-service.js";

const validator = z.object({
  email: z.string().email({ message: "Not a valid e-mail address" }),
});

const registerUser = async (c) => {
  const data = await c.req.json();
  const validationResult = validator.safeParse(data);

  if(!validationResult.success) {
    return c.json(validationResult.error.format(), 201);
  }

  const { username, email, password } = data;

  const result = await userService.createUser(username, email.trim().toLowerCase(), hash(password.trim()));
  
  return c.json(result, 200);
}
//TODO: replace error messages with generic ones
const loginUser = async (c) => {
  const data = await c.req.json();
  const { email, password } = data;

  const result = await userService.getUserFromEmail(email.trim().toLowerCase());

  if (result.length === 0) {
    return c.json({ message: `No users found with email: ${email.trim().toLowerCase()}` });
  }

  const user = result[0];

  const validPass = verify(password.trim(), user.password_hash);
  if(validPass) {
    //Set a new session here
    await sessionService.createSession(c, user);
    return c.json({ message: `Logged in as ${user.email}` });
  } else {
    return c.json({ message: "Incorrect password." });
  }
}

const logoutUser = async (c) => {
  await sessionService.deleteSession(c);

  return c.json({ message: "Session deleted." });
}

export { registerUser, loginUser, logoutUser }