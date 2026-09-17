import { Context } from "hono";
import {
  createNotificationService,
  getNotificationsByNimService,
  getAllNotificationsService,
} from "../services/notification.service";
import { successResponse, errorResponse } from "../../../utils/response.util";

export async function createNotificationHandler(c: Context) {
  try {
    const { nim, message } = await c.req.json();
    if (!nim || !message) {
      return errorResponse(c, "NIM and message are required", 400);
    }

    const notification = await createNotificationService(nim, message);
    return successResponse(c, notification, "Notification sent successfully", 201);
  } catch (err) {
    return errorResponse(c, "Failed to send notification", 500, err);
  }
}

export async function getNotificationsByNimHandler(c: Context) {
  try {
    const nim = c.req.param("nim");
    if (!nim) {
      return errorResponse(c, "NIM is required", 400);
    }

    const list = await getNotificationsByNimService(nim);
    return successResponse(c, list, "Notifications retrieved successfully");
  } catch (err) {
    return errorResponse(c, "Failed to retrieve notifications", 500, err);
  }
}

export async function getAllNotificationsHandler(c: Context) {
  try {
    const list = await getAllNotificationsService();
    return successResponse(c, list, "All notifications retrieved successfully");
  } catch (err) {
    return errorResponse(c, "Failed to retrieve all notifications", 500, err);
  }
}
