import { Hono } from "hono";
import {
  createStudentHandler,
  getStudentByNimHandler,
  getStudentStatusHandler,
  getAllStudentsHandler,
} from "../controllers/student.controller.js";
import { createJsonRpcRouter } from "../../../utils/jsonrpc.util.js";

const studentRoute = new Hono();

const rpcHandler = createJsonRpcRouter({
  createStudent: createStudentHandler,
  getStudentByNim: getStudentByNimHandler,
  getStudentStatus: getStudentStatusHandler,
  checkStudentStatus: getStudentStatusHandler,
  getAllStudents: getAllStudentsHandler,
});

studentRoute.post("/rpc", rpcHandler);

export default studentRoute;
