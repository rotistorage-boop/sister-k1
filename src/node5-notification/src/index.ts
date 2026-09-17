import { serve } from "@hono/node-server";
import { Hono } from "hono";
import dotenv from "dotenv";
import notificationRoute from "./routes/notification.route";

dotenv.config({ path: "../../.env" });
dotenv.config();

const app = new Hono();

app.route("/", notificationRoute);

const port = Number(process.env.PORT_NODE5);
const hostname = process.env.HOST;

console.log(
  `Node 5 (Notification Server) is running on http://${hostname}:${port}`,
);

serve({
  fetch: app.fetch,
  port,
  hostname,
});
