import { Hono } from "hono";
import {
  submitKrsHandler,
  getAllKrsHandler,
  getKrsByIdHandler,
  getKrsByNimHandler,
  getTimeHandler,
  getKrsPeriodHandler,
  setKrsPeriodHandler,
  getTokenStatusHandler,
} from "../controllers/krs.controller.js";
import { createJsonRpcRouter } from "../../../utils/jsonrpc.util.js";

const krsRoute = new Hono();

const rpcHandler = createJsonRpcRouter({
  submitKrs: submitKrsHandler,
  submitKRS: submitKrsHandler, // Alias
  getAllKrs: getAllKrsHandler,
  getKrsById: getKrsByIdHandler,
  getKrsByNim: getKrsByNimHandler,
  // Physical Clock Synchronization (Cristian) - time authority
  getTime: getTimeHandler,
  getKrsPeriod: getKrsPeriodHandler,
  setKrsPeriod: setKrsPeriodHandler,
  // Token-based mutual exclusion introspection
  getTokenStatus: getTokenStatusHandler,
});

krsRoute.post("/rpc", rpcHandler);

export default krsRoute;
