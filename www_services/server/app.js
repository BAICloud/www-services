import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { logger } from "@hono/hono/logger";

import * as middlewares from "./middlewares.js";
import * as taskControl from "./task-control.js";
import * as authControl from "./auth-control.js";

const app = new Hono();

// CORS configuration to allow frontend access
app.use("/*", cors({
  origin: ['http://localhost:5173', 'http://localhost:8000'],
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
app.get("/auth/session", (c) => {
  return c.json({ user: c.user || null });
});

export default app;