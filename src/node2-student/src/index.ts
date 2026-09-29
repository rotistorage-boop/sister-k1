import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import dotenv from "dotenv";
import studentRoute from "./routes/student.route.js";

dotenv.config({ path: "../../.env" });
dotenv.config();

const app = new Hono();
app.use("*", cors());

app.route("/", studentRoute);

const port = Number(process.env.PORT_NODE2);
const hostname = process.env.HOST;

console.log(`Node 2 (Student Server) is running on http://${hostname}:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname,
});
