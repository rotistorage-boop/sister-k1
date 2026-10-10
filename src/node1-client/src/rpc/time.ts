import { callRpc } from "./client";

export interface TimeResponse {
  serverTime: number;
  iso: string;
}

export interface KrsPeriodResponse {
  openAt: number | null;
  closeAt: number | null;
  openAtIso: string | null;
  closeAtIso: string | null;
  updatedAt: number;
  note?: string;
  serverTime: number;
  serverIso: string;
  isOpen: boolean;
  reason: string;
}

export interface CristianSample {
  t1: number;
  t4: number;
  rtt: number;
  serverTime: number;
  offset: number;
}

export interface SyncResult {
  samples: CristianSample[];
  best: CristianSample;
  rtt: number;
  offset: number;
  estimatedServerNow: number;
  adjustedNow: number;
  period: KrsPeriodResponse;
  withinPeriod: boolean;
}

const KRS_RPC_URL = import.meta.env.VITE_KRS_SERVICE_URL || "/rpc/krs";

export async function getServerTime(): Promise<TimeResponse> {
  return callRpc<TimeResponse>(KRS_RPC_URL, "getTime");
}

export async function getKrsPeriod(): Promise<KrsPeriodResponse> {
  return callRpc<KrsPeriodResponse>(KRS_RPC_URL, "getKrsPeriod");
}

export interface SetKrsPeriodPayload {
  openAt?: number | null;
  closeAt?: number | null;
  note?: string;
}

export async function setKrsPeriod(payload: SetKrsPeriodPayload): Promise<KrsPeriodResponse> {
  return callRpc<KrsPeriodResponse>(KRS_RPC_URL, "setKrsPeriod", {
    openAt: payload.openAt ?? null,
    closeAt: payload.closeAt ?? null,
    ...(payload.note !== undefined ? { note: payload.note } : {}),
  });
}

/** Pintasan: buka periode sekarang (openAt = sekarang, tanpa batas tutup). */
export async function openKrsPeriodNow(note = "dibuka via Node 1"): Promise<KrsPeriodResponse> {
  return setKrsPeriod({ openAt: Date.now(), closeAt: null, note });
}

/** Pintasan: tutup periode sekarang (closeAt = sekarang). */
export async function closeKrsPeriodNow(note = "ditutup via Node 1"): Promise<KrsPeriodResponse> {
  return setKrsPeriod({ openAt: null, closeAt: Date.now(), note });
}

/**
 * Cristian's Algorithm di sisi client (Node 1 -> Node 4 time authority).
 * T1 dicatat sebelum kirim, T4 sesudah terima; offset = (T_server + RTT/2) - T4.
 * Diambil N sampel, dipakai yang RTT-nya terkecil.
 */
export async function synchronizeTime(samples = 4): Promise<SyncResult> {
  const n = Math.max(1, Math.min(10, samples));
  const all: CristianSample[] = [];
  for (let i = 0; i < n; i++) {
    const t1 = Date.now();
    const res = await getServerTime();
    const t4 = Date.now();
    const rtt = Math.max(0, t4 - t1);
    all.push({ t1, t4, rtt, serverTime: res.serverTime, offset: res.serverTime + rtt / 2 - t4 });
  }
  const best = all.slice().sort((a, b) => a.rtt - b.rtt)[0];
  const adjustedNow = Date.now() + best.offset;
  const period = await getKrsPeriod();
  const withinPeriod =
    (period.openAt === null || adjustedNow >= period.openAt) &&
    (period.closeAt === null || adjustedNow <= period.closeAt);
  return {
    samples: all,
    best,
    rtt: best.rtt,
    offset: best.offset,
    estimatedServerNow: adjustedNow,
    adjustedNow,
    period,
    withinPeriod,
  };
}
