import { Hono } from "hono";
import {
  getAllCoursesHandler,
  getCourseByKodeHandler,
  getCourseByIdHandler,
  checkQuotaHandler,
} from "../controllers/course.controller.js";
import { createJsonRpcRouter } from "../../../utils/jsonrpc.util.js";

const courseRoute = new Hono();

const rpcHandler = createJsonRpcRouter({
  getAllCourses: getAllCoursesHandler,
  getCourseByKode: getCourseByKodeHandler,
  getCourseById: getCourseByIdHandler,
  checkQuota: checkQuotaHandler,
});

courseRoute.post("/", rpcHandler);
courseRoute.post("/rpc", rpcHandler);

export default courseRoute;
