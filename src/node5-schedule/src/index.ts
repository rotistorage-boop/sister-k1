import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import dotenv from "dotenv";
import scheduleRoute from "./routes/schedule.route";

dotenv.config({ path: "../../.env" });
dotenv.config();

const app = new Hono();
app.use("*", cors());

app.route("/", scheduleRoute);

const port = Number(process.env.PORT_NODE5);
const hostname = process.env.HOST;

console.log(
  `Node 5 (Schedule Server) is running on http://${hostname}:${port}`,
);

serve({
  fetch: app.fetch,
  port,
  hostname,
});
