import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { logger } from "@hono/hono/logger";

import * as middlewares from "./middlewares.js";
import * as taskControl from "./task-control.js";
import * as authControl from "./auth-control.js";
import * as messageControl from "./message-control.js";
import * as userControl from "./user-control.js";

const app = new Hono();

// CORS configuration to allow frontend access
app.use("/*", cors({
  origin: (origin) => {
    // Allow localhost for development
    if (!origin || 
        origin.startsWith('http://localhost') || 
        origin.startsWith('http://127.0.0.1')) {
      return true;
    }
    // Allow all Vercel deployments (production and preview)
    if (origin.includes('vercel.app')) {
      return true;
    }
    return false;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use("/*", logger());        //For logging requests to this URL

// Middleware to add user to context (c.user)
app.use("*", middlewares.addUserToContextMiddleware);

app.get("/tasks", taskControl.listAllTasks);
app.post("/tasks", taskControl.createTask);
app.get("/tasks/:id", taskControl.showTask);
app.post("/tasks/:id", taskControl.updateTask);
app.post("/tasks/:id/delete", taskControl.deleteTask);
app.post("/tasks/:id/complete", taskControl.markTaskAsComplete);
app.post("/tasks/:id/incomplete", taskControl.markTaskAsIncomplete);

// Auth endpoints
app.post("/auth/registration", authControl.registerUser);
app.post("/auth/send-code", authControl.sendVerificationCode);
app.post("/auth/verify-code", authControl.verifyCode);
app.post("/auth/login", authControl.loginUser);
app.post("/auth/logout", authControl.logoutUser);
app.post("/auth/update-profile", authControl.updateProfile);
app.get("/auth/session", (c) => {
  if (c.user) {
    return c.json({ 
      user: {
        id: c.user.id,
        username: c.user.username,
        email: c.user.email,
        name: c.user.name || null,
        avatar_url: c.user.avatar_url || null,
        bio: c.user.bio || null,
        address: c.user.address || null,
        phone: c.user.phone || null
      }
    });
  }
  return c.json({ user: null });
});

// Message endpoints
app.post("/messages", messageControl.sendMessage);
app.get("/messages/conversations", messageControl.getUserConversations);
app.get("/messages/task/:taskId", messageControl.getOrCreateConversation);
app.get("/messages/task/:taskId/messages", messageControl.getConversationMessages);

// User endpoints
app.get("/users/:id", userControl.showUser);

export default app;