import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { logger } from "@hono/hono/logger";

import * as middlewares from "./middlewares.js";
import * as taskControl from "./task-control.js"

const app = new Hono();

app.use("/*", cors());
app.use("/*", logger());        //For logging requests to this URL

// Middleware to add user to context (c.user)
app.use("*", middlewares.addUserToContextMiddleware);
/*
const sql = postgres();

app.get("/", (c) => c.json({ message: "Hello world!" }));
app.get("/todos", async (c) => {
  const todos = await sql`SELECT * FROM todos`;
  return c.json(todos);
});

app.post("/", async (c) => {
  const { query } = await c.req.json();
  const result = await sql.unsafe(query);
  return c.json(result);
});
*/
app.get("/tasks", taskControl.listAllTasks);    
app.post("/tasks", taskControl.createTask);
app.get("/tasks/:id", taskControl.showTask);
app.post("/tasks/:id", taskControl.updateTask);
app.post("/tasks/:id/delete", taskControl.deleteTask);

// Auth endpoints - return current user from context
app.get("/auth/session", (c) => {
  // Return current user from middleware (c.user)
  return c.json({ user: c.user || null });
});

export default app;