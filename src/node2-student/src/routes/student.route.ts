import { Hono } from "hono";
import {
  getStudentByNimHandler,
  getAllStudentsHandler,
} from "../controllers/student.controller.js";

const studentRoute = new Hono();

studentRoute.get("/", getAllStudentsHandler);
studentRoute.get("/:nim", getStudentByNimHandler);

export default studentRoute;
