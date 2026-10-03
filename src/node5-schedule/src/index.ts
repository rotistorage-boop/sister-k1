import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import dotenv from "dotenv";
import scheduleRoute, { rmiRegistry } from "./routes/schedule.route.js";

dotenv.config({ path: "../../.env" });
dotenv.config();

const app = new Hono();
app.use("*", cors());

app.route("/", scheduleRoute);

const port = Number(process.env.PORT_NODE5) || 3005;
const hostname = process.env.HOST || "localhost";

console.log(
  `Node 5 (Schedule RMI Server) is running on http://${hostname}:${port}`,
);
console.log(
  `RMI Registry active at http://${hostname}:${port}/rmi [Registered Objects: ${rmiRegistry.list().join(", ")}]`,
);

serve({
  fetch: app.fetch,
  port,
  hostname,
});
