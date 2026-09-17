import { serve } from "@hono/node-server";
import { Hono } from "hono";
import dotenv from "dotenv";
import courseRoute from "./routes/course.route";

dotenv.config({ path: "../../.env" });
dotenv.config();

const app = new Hono();

app.route("/", courseRoute);

const port = Number(process.env.PORT_NODE3);
const hostname = process.env.HOST;

console.log(`Node 3 (Course Server) is running on http://${hostname}:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname,
});
