/**
 * Physical Clock Synchronization - Cristian's Algorithm (shared helper).
 *
 * Skema: client mencatat T1 (kirim), server menjawab dengan T_server,
 * client mencatat T4 (terima). Estimasi:
 *   RTT    = T4 - T1
 *   offset = (T_server + RTT/2) - T4
 * Jam logis client yang tersinkron: now() + offset, TANPA memundurkan
 * jam sistem secara kasar.
 */

export interface CristianSample {
  t1: number;
  t4: number;
  rtt: number;
  serverTime: number;
  offset: number;
}

export interface CristianResult {
  samples: CristianSample[];
  /** Sampel dengan RTT terkecil (paling minim noise jaringan). */
  best: CristianSample;
  rtt: number;
  offset: number;
  serverTime: number;
  /** Estimasi jam server "saat ini" menurut client. */
  estimatedServerNow: number;
  adjustedNow: number;
}

export type GetTimeFn = () => Promise<{ serverTime: number } | number>;

/** Satu putaran Cristian: T1 -> getTime -> T4. */
export async function cristianProbe(getTime: GetTimeFn): Promise<CristianSample> {
  const t1 = Date.now();
  const res = await getTime();
  const t4 = Date.now();
  const serverTime = typeof res === "number" ? res : Number((res as any)?.serverTime);
  if (isNaN(serverTime)) throw new Error("Respons getTime tidak valid (serverTime hilang)");
  const rtt = Math.max(0, t4 - t1);
  const offset = serverTime + rtt / 2 - t4;
  return { t1, t4, rtt, serverTime, offset };
}

/**
 * Ambil beberapa sampel lalu pilih RTT terkecil agar estimasi offset
 * tahan terhadap jitter jaringan.
 */
export async function cristianSync(getTime: GetTimeFn, samples = 4): Promise<CristianResult> {
  const n = Math.max(1, Math.min(10, Math.floor(samples)));
  const all: CristianSample[] = [];
  for (let i = 0; i < n; i++) {
    all.push(await cristianProbe(getTime));
  }
  const best = all.slice().sort((a, b) => a.rtt - b.rtt)[0];
  const now = Date.now();
  return {
    samples: all,
    best,
    rtt: best.rtt,
    offset: best.offset,
    serverTime: best.serverTime,
    estimatedServerNow: now + best.offset,
    adjustedNow: now + best.offset,
  };
}

/** Validasi deadline KRS memakai jam tersinkron (bukan jam mentah client). */
export function isWithinPeriod(adjustedNow: number, openAt: number | null, closeAt: number | null): boolean {
  if (openAt !== null && adjustedNow < openAt) return false;
  if (closeAt !== null && adjustedNow > closeAt) return false;
  return true;
}
