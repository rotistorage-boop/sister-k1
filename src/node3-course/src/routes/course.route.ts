import { Hono } from "hono";
import {
  getAllCoursesHandler,
  getCourseByKodeHandler,
  getCourseByIdHandler,
  checkQuotaHandler,
  createCourseHandler,
} from "../controllers/course.controller.js";
import { createJsonRpcRouter } from "../../../utils/jsonrpc.util.js";

const courseRoute = new Hono();

const rpcHandler = createJsonRpcRouter({
  getAllCourses: getAllCoursesHandler,
  getCourseByKode: getCourseByKodeHandler,
  getCourseById: getCourseByIdHandler,
  checkQuota: checkQuotaHandler,
  createCourse: createCourseHandler,
  addCourse: createCourseHandler,
});

courseRoute.post("/rpc", rpcHandler);

export default courseRoute;
