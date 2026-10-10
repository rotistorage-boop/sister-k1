/**
 * Periode KRS + jam acuan (time authority) di Node 4.
 * Node 4 adalah server acuan waktu untuk validasi deadline KRS.
 * Client (Node 1) memakai Cristian's algorithm terhadap getTime ini.
 */

export interface KrsPeriod {
  openAt: number | null; // epoch ms, null = sudah dibuka sejak dulu
  closeAt: number | null; // epoch ms, null = tidak ada batas
  updatedAt: number;
  note?: string;
}

function parseTimeEnv(v: string | undefined): number | null {
  if (!v || !v.trim()) return null;
  const t = Date.parse(v.trim());
  if (!isNaN(t)) return t;
  const n = Number(v.trim());
  if (!isNaN(n)) return n;
  return null;
}

const state: KrsPeriod = {
  openAt: parseTimeEnv(process.env.KRS_OPEN_AT),
  closeAt: parseTimeEnv(process.env.KRS_CLOSE_AT),
  updatedAt: Date.now(),
};

export function getKrsPeriod(): KrsPeriod {
  return { ...state };
}

export function setKrsPeriod(openAt: number | null, closeAt: number | null, note?: string): KrsPeriod {
  if (openAt !== null && closeAt !== null && openAt > closeAt) {
    throw new Error("openAt tidak boleh lebih besar dari closeAt");
  }
  state.openAt = openAt;
  state.closeAt = closeAt;
  state.updatedAt = Date.now();
  if (note !== undefined) state.note = note;
  return getKrsPeriod();
}

export function checkPeriod(now = Date.now()): { isOpen: boolean; reason: string } {
  if (state.openAt !== null && now < state.openAt) {
    return { isOpen: false, reason: `Periode KRS belum dibuka (dibuka: ${new Date(state.openAt).toISOString()})` };
  }
  if (state.closeAt !== null && now > state.closeAt) {
    return { isOpen: false, reason: `Periode KRS sudah ditutup (ditutup: ${new Date(state.closeAt).toISOString()})` };
  }
  return { isOpen: true, reason: "Periode KRS sedang dibuka" };
}
