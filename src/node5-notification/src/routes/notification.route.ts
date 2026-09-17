import { Hono } from "hono";
import {
  createNotificationHandler,
  getNotificationsByNimHandler,
  getAllNotificationsHandler,
} from "../controllers/notification.controller";

const notificationRoute = new Hono();

notificationRoute.post("/notify", createNotificationHandler);
notificationRoute.get("/", getAllNotificationsHandler);
notificationRoute.get("/:nim", getNotificationsByNimHandler);

export default notificationRoute;
