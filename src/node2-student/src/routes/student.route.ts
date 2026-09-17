import { Hono } from "hono";
import {
  getStudentByNimHandler,
  getStudentStatusHandler,
  getAllStudentsHandler,
  createStudentHandler,
} from "../controllers/student.controller.js";

const studentRoute = new Hono();

studentRoute.get("/", getAllStudentsHandler);
studentRoute.post("/", createStudentHandler);
studentRoute.get("/:nim/status", getStudentStatusHandler);
studentRoute.get("/:nim", getStudentByNimHandler);

export default studentRoute;
