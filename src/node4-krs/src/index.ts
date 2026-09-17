import { serve } from "@hono/node-server";
import { Hono } from "hono";
import dotenv from "dotenv";
import krsRoute from "./routes/krs.route";

dotenv.config({ path: "../../.env" });
dotenv.config();

const app = new Hono();

app.route("/", krsRoute);

const port = Number(process.env.PORT_NODE4);
const hostname = process.env.HOST;

console.log(`Node 4 (KRS Server) is running on http://${hostname}:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname,
});
