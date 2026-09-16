import { serve } from "@hono/node-server";
import { Hono } from "hono";
import studentRoute from "./routes/student.route";

const app = new Hono();

app.route("/", studentRoute);

const port = 3002;
console.log(`Node 2 (Student Server) is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
