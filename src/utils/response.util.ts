import { Context } from "hono";

export const successResponse = (
  c: Context,
  data: any,
  message: string,
  statusCode = 200,
) => {
  return c.json({ success: true, message, data }, statusCode as any);
};

export const errorResponse = (
  c: Context,
  message: string,
  statusCode = 500,
  error?: any,
) => {
  return c.json(
    { success: false, message, error: error?.message || error },
    statusCode as any,
  );
};
