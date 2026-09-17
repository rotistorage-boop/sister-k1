import { Hono } from "hono";
import {
  getAllKrsHandler,
  getKrsByIdHandler,
  getKrsByNimHandler,
  submitKrsHandler,
} from "../controllers/krs.controller";

const krsRoute = new Hono();

krsRoute.post("/submit", submitKrsHandler);
krsRoute.get("/", getAllKrsHandler);
krsRoute.get("/student/:nim", getKrsByNimHandler);
krsRoute.get("/:id", getKrsByIdHandler);

export default krsRoute;

