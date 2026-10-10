import { Hono } from "hono";
import {
  getAllCoursesHandler,
  getCourseByKodeHandler,
  getCourseByIdHandler,
  checkQuotaHandler,
  createCourseHandler,
  acquireLockHandler,
  releaseLockHandler,
  getLockStatusHandler,
  decrementQuotaHandler,
  setQuotaHandler,
  resetLockHandler,
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
  // Distributed Mutual Exclusion (Centralized Lock Coordinator)
  acquireLock: acquireLockHandler,
  releaseLock: releaseLockHandler,
  getLockStatus: getLockStatusHandler,
  decrementQuota: decrementQuotaHandler,
  setQuota: setQuotaHandler,
  resetLock: resetLockHandler,
});

courseRoute.post("/rpc", rpcHandler);

export default courseRoute;
