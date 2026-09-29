import { callRpc } from "./client";
import type { Course } from "./course";

export interface KrsItem {
  id: number;
  nim: string;
  courses: Course[];
}

export interface SubmitKrsPayload {
  nim: string;
  courseIds: number[];
}

export interface SubmitKrsResult {
  krs: {
    id: number;
    nim: string;
  };
  student: {
    nim: string;
    nama: string;
    status: string;
  };
  courses: Course[];
  scheduleCheck: {
    hasConflict: boolean;
    conflicts: string[];
    schedules: unknown[];
  };
  status?: string;
}

const KRS_RPC_URL = import.meta.env.VITE_KRS_SERVICE_URL || "/rpc/krs";

export async function getAllKrs(): Promise<KrsItem[]> {
  return callRpc<KrsItem[]>(KRS_RPC_URL, "getAllKrs");
}

export async function getKrsByNim(nim: string): Promise<KrsItem[]> {
  return callRpc<KrsItem[]>(KRS_RPC_URL, "getKrsByNim", { nim });
}

export async function getKrsById(id: number): Promise<KrsItem> {
  return callRpc<KrsItem>(KRS_RPC_URL, "getKrsById", { id });
}

export async function submitKrs(
  nim: string,
  courseIds: number[],
): Promise<SubmitKrsResult> {
  return callRpc<SubmitKrsResult>(KRS_RPC_URL, "submitKrs", {
    nim,
    courseIds,
  });
}
