import { Hono } from "hono";
import {
  submitKrsHandler,
  getAllKrsHandler,
  getKrsByIdHandler,
  getKrsByNimHandler,
} from "../controllers/krs.controller.js";
import { createJsonRpcRouter } from "../../../utils/jsonrpc.util.js";

const krsRoute = new Hono();

const rpcHandler = createJsonRpcRouter({
  submitKrs: submitKrsHandler,
  submitKRS: submitKrsHandler, // Alias
  getAllKrs: getAllKrsHandler,
  getKrsById: getKrsByIdHandler,
  getKrsByNim: getKrsByNimHandler,
});

krsRoute.post("/", rpcHandler);
krsRoute.post("/rpc", rpcHandler);

export default krsRoute;
