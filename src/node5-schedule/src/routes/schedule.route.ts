import { Hono } from "hono";
import {
  getScheduleByCourseIdHandler,
  getAllSchedulesHandler,
  getScheduleByDayHandler,
  checkScheduleConflictHandler,
} from "../controllers/schedule.controller.js";
import { createJsonRpcRouter } from "../../../utils/jsonrpc.util.js";

const scheduleRoute = new Hono();

const rpcHandler = createJsonRpcRouter({
  getScheduleByCourseId: getScheduleByCourseIdHandler,
  getAllSchedules: getAllSchedulesHandler,
  getScheduleByDay: getScheduleByDayHandler,
  checkScheduleConflict: checkScheduleConflictHandler,
});

scheduleRoute.post("/", rpcHandler);
scheduleRoute.post("/rpc", rpcHandler);

export default scheduleRoute;
