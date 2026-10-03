import { Hono } from "hono";
import { ScheduleRemoteService } from "../servants/schedule.servant.js";
import { RmiRegistry, createRmiRouter } from "../../../utils/rmi.util.js";
import {
  getScheduleByCourseIdHandler,
  getAllSchedulesHandler,
  getScheduleByDayHandler,
  checkScheduleConflictHandler,
} from "../controllers/schedule.controller.js";
import { createJsonRpcRouter } from "../../../utils/jsonrpc.util.js";

const scheduleRoute = new Hono();

// === 1. INSIALISASI RMI REGISTRY & REMOTE OBJECT (SERVANT) ===
export const rmiRegistry = new RmiRegistry();
const scheduleServant = new ScheduleRemoteService();

// Mendaftarkan objek remote "ScheduleService" ke dalam Registry (Naming Service)
rmiRegistry.bind("ScheduleService", scheduleServant);

// === 2. ENDPOINT RMI (Remote Method Invocation) ===
const rmiHandler = createRmiRouter(rmiRegistry);
scheduleRoute.post("/rmi", rmiHandler);

// === 3. ENDPOINT JSON-RPC ===
const rpcHandler = createJsonRpcRouter({
  getScheduleByCourseId: getScheduleByCourseIdHandler,
  getAllSchedules: getAllSchedulesHandler,
  getScheduleByDay: getScheduleByDayHandler,
  checkScheduleConflict: checkScheduleConflictHandler,
});

scheduleRoute.post("/rpc", rpcHandler);

// Endpoint info registry
scheduleRoute.get("/rmi/services", (c) => {
  return c.json({
    status: "online",
    protocol: "RMI (Remote Method Invocation)",
    registeredServices: rmiRegistry.list(),
  });
});

export default scheduleRoute;
