import app from "./app.js";

// Use port from environment variable, default to 8000
// Note: If running locally with frontend on 8000, set PORT=8001
const PORT = Deno.env.get("PORT") ? parseInt(Deno.env.get("PORT")) : 8000;
const HOST = Deno.env.get("HOST") || "0.0.0.0";

Deno.serve({ port: PORT, hostname: HOST }, app.fetch);
console.log(`🚀 Server running on http://${HOST}:${PORT}`);