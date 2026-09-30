import dotenv from "dotenv";

dotenv.config();

function buildRpcUrl(envKey: string): string {
  const baseUrl = process.env[envKey];
  if (!baseUrl) {
    throw new Error(`Environment variable "${envKey}" is not defined`);
  }
  return `${baseUrl}/rpc`;
}

function buildRmiUrl(envKey: string): string {
  const baseUrl = process.env[envKey];
  if (!baseUrl) {
    throw new Error(`Environment variable "${envKey}" is not defined`);
  }
  return `${baseUrl}/rmi`;
}

export const SERVICE_URLS = {
  student: () => buildRpcUrl("STUDENT_SERVICE_URL"),
  course: () => buildRpcUrl("COURSE_SERVICE_URL"),
  krs: () => buildRpcUrl("KRS_SERVICE_URL"),
  schedule: () => buildRpcUrl("SCHEDULE_SERVICE_URL"),
  scheduleRmi: () => buildRmiUrl("SCHEDULE_SERVICE_URL"),
} as const;
