import { Hono } from "hono";
import {
  getAllCourseHandler,
  getCourseByKodeHandler,
  getCourseByIdHandler,
} from "../controllers/course.controller";

const courseRoute = new Hono();

courseRoute.get("/", getAllCourseHandler);
courseRoute.get("/id/:id", getCourseByIdHandler);
courseRoute.get("/:kode", getCourseByKodeHandler);

export default courseRoute;
