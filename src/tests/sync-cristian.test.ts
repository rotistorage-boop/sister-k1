/**
 * ============================================================================
 * TEST: Physical Clock Synchronization — Cristian's Algorithm
 * ============================================================================
 *
 * Menguji fitur sinkronisasi #2:
 *  - Node 4 sebagai server acuan waktu (time authority)
 *  - Node 1 (client) memakai Cristian's algorithm untuk mengoreksi jam lokal
 *  - Validasi periode KRS memakai jam tersinkron (bukan jam mentah)
 *
 * Skenario test:
 *  1. getTime — endpoint acuan mengembalikan serverTime yang valid
 *  2. Cristian's probe — T1, T4, RTT, offset dihitung dengan benar
 *  3. Cristian's sync (multi-sampel) — memilih sampel dengan RTT terkecil
 *  4. Validasi periode KRS — isWithinPeriod benar sesuai jam tersinkron
 *  5. getKrsPeriod & setKrsPeriod — CRUD periode
 *  6. Integrasi: submitKrs ditolak jika di luar periode (jam server)
 *
 * Prerequisite: Node 4 (port 3004) HARUS running.
 * ============================================================================
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import dotenv from "dotenv";
import { callJsonRpc } from "../utils/jsonrpc.util.js";
import { SERVICE_URLS } from "../utils/service-url.util.js";
import {
  cristianProbe,
  cristianSync,
  isWithinPeriod,
  type CristianSample,
} from "../utils/time-sync.util.js";

dotenv.config();

const KRS_URL = SERVICE_URLS.krs();
const COURSE_URL = SERVICE_URLS.course();

/** Helper: panggil getTime di Node 4 via JSON-RPC. */
async function getTimeFromNode4(): Promise<{ serverTime: number }> {
  return callJsonRpc(KRS_URL, "getTime", {});
}

/** Buka periode selebar mungkin (state aman untuk file test lain yang paralel). */
async function openPeriodWide() {
  await callJsonRpc(KRS_URL, "setKrsPeriod", {
    openAt: null,
    closeAt: null,
    note: "test - always open",
  }).catch(() => {});
}

describe("Sinkronisasi #2: Physical Clock Synchronization (Cristian's Algorithm)", () => {
  // Simpan periode awal untuk di-restore setelah test
  let originalPeriod: any = null;
  // ISOLASI: course KHUSUS untuk submitKrs di file ini (jangan pakai id 1
  // milik seed — file lain menulis kuota/lock resource yang sama).
  let TEST_COURSE_ID = 1;

  beforeAll(async () => {
    const kode = `CRIST${Date.now().toString().slice(-6)}`;
    const created: any = await callJsonRpc(COURSE_URL, "createCourse", {
      kode,
      nama: "Matkul Isolasi Cristian",
      sks: 2,
      kuota: 20,
    });
    TEST_COURSE_ID = created.id;
  });

  afterAll(async () => {
    // Kembalikan periode ke state awal (null = tidak dibatasi)
    if (originalPeriod) {
      await callJsonRpc(KRS_URL, "setKrsPeriod", {
        openAt: originalPeriod.openAt,
        closeAt: originalPeriod.closeAt,
      }).catch(() => {});
    } else {
      await callJsonRpc(KRS_URL, "setKrsPeriod", {
        openAt: null,
        closeAt: null,
        note: "reset by test",
      }).catch(() => {});
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Server Time Authority (getTime endpoint)
  // ---------------------------------------------------------------------------
  describe("1. Time Authority — getTime endpoint (Node 4)", () => {
    it("getTime - Harus mengembalikan serverTime dalam epoch ms yang valid", async () => {
      // CATATAN: test ini TIDAK boleh mengasumsikan jam client & server sinkron.
      // Antar-device, skew jam fisik bisa > 1 detik (itulah gunanya Cristian).
      // Yang diuji: validitas + konsistensi internal server, bukan kesamaan jam.
      const result: any = await callJsonRpc(KRS_URL, "getTime", {});

      expect(result).toBeTruthy();
      expect(typeof result.serverTime).toBe("number");
      expect(result.serverTime).toBeGreaterThan(0);
      expect(typeof result.iso).toBe("string");

      // Konsistensi internal: iso harus mempresentasikan serverTime yang sama
      expect(Date.parse(result.iso)).toBe(result.serverTime);

      // Monotonik: pemanggilan kedua tidak boleh mundur
      const second: any = await callJsonRpc(KRS_URL, "getTime", {});
      expect(second.serverTime).toBeGreaterThanOrEqual(result.serverTime);

      // Sanity antar-device dengan toleransi longgar (1 jam): hanya untuk
      // menangkap error satuan (detik-vs-ms, nilai 0/negatif), bukan NTP-sync.
      expect(Math.abs(second.serverTime - Date.now())).toBeLessThan(3_600_000);

      console.log(`  [getTime] serverTime: ${result.serverTime} (${result.iso})`);
      console.log(`  [getTime] skew vs jam client: ${result.serverTime - Date.now()}ms`);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Cristian's Probe — Satu Putaran (T1, T4, RTT, offset)
  // ---------------------------------------------------------------------------
  describe("2. Cristian's Probe — Satu putaran pengukuran", () => {
    it("cristianProbe - Harus menghitung T1, T4, RTT, serverTime, dan offset", async () => {
      const sample: CristianSample = await cristianProbe(getTimeFromNode4);

      // Validasi field ada dan masuk akal
      expect(sample.t1).toBeGreaterThan(0);
      expect(sample.t4).toBeGreaterThanOrEqual(sample.t1);
      expect(sample.rtt).toBeGreaterThanOrEqual(0);
      expect(sample.rtt).toBe(sample.t4 - sample.t1);
      expect(sample.serverTime).toBeGreaterThan(0);
      expect(typeof sample.offset).toBe("number");

      // Rumus: offset = T_server + RTT/2 - T4
      const expectedOffset = sample.serverTime + sample.rtt / 2 - sample.t4;
      expect(sample.offset).toBe(expectedOffset);

      console.log(`  [Probe] T1=${sample.t1} T4=${sample.t4} RTT=${sample.rtt}ms offset=${sample.offset.toFixed(1)}ms`);
    });

    it("cristianProbe - Offset stabil antar probe (toleran skew antar-device)", async () => {
      // Skew jam fisik boleh BESAR antar-device; yang diuji Cristian bukan
      // kecilnya offset, melainkan STABILNYA estimasi antar pengukuran.
      const s1 = await cristianProbe(getTimeFromNode4);
      const s2 = await cristianProbe(getTimeFromNode4);

      expect(Math.abs(s1.offset - s2.offset)).toBeLessThan(2000);

      console.log(`  [Probe] offset=${s1.offset.toFixed(1)}ms (besar = wajar jika beda device; itulah gunanya Cristian)`);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Cristian's Sync — Multi-Sampel, Pilih RTT Terkecil
  // ---------------------------------------------------------------------------
  describe("3. Cristian's Sync — Multi-sampel (pilih RTT terkecil)", () => {
    it("cristianSync - Harus mengambil N sampel dan memilih yang RTT-nya terkecil", async () => {
      const N = 4;
      const result = await cristianSync(getTimeFromNode4, N);

      // Harus ada N sampel
      expect(result.samples).toHaveLength(N);

      // Best sample harus RTT terkecil
      const sortedByRtt = [...result.samples].sort((a, b) => a.rtt - b.rtt);
      expect(result.best.rtt).toBe(sortedByRtt[0].rtt);
      expect(result.rtt).toBe(result.best.rtt);
      expect(result.offset).toBe(result.best.offset);

      // estimatedServerNow harus MELACAK jam server (bukan jam client!):
      // bandingkan dengan pembacaan server yang baru. Berlaku berapa pun
      // skew antar-device karena kedua sisi dalam domain jam server.
      const tEnd = Date.now();
      const fresh = await getTimeFromNode4();
      const elapsed = Date.now() - tEnd;
      expect(Math.abs(fresh.serverTime - (result.estimatedServerNow + elapsed))).toBeLessThan(10000);
      expect(result.adjustedNow).toBe(result.estimatedServerNow);

      console.log(`  [Sync] ${N} sampel, RTT terbaik: ${result.rtt}ms, offset: ${result.offset.toFixed(1)}ms`);
      console.log(`  [Sync] Jam lokal: ${new Date().toISOString()}`);
      console.log(`  [Sync] Jam tersinkron: ${new Date(result.adjustedNow).toISOString()}`);
    });

    it("cristianSync - Sampel minimal 1, maksimal 10", async () => {
      const r1 = await cristianSync(getTimeFromNode4, 0); // floor ke 1
      expect(r1.samples.length).toBeGreaterThanOrEqual(1);

      const r2 = await cristianSync(getTimeFromNode4, 1);
      expect(r2.samples).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. isWithinPeriod — Validasi Deadline memakai Jam Tersinkron
  // ---------------------------------------------------------------------------
  describe("4. isWithinPeriod — Validasi deadline KRS memakai jam tersinkron", () => {
    it("isWithinPeriod - Harus TRUE jika jam di antara open dan close", () => {
      const now = Date.now();
      const open = now - 60_000;  // 1 menit lalu
      const close = now + 60_000; // 1 menit ke depan
      expect(isWithinPeriod(now, open, close)).toBe(true);
    });

    it("isWithinPeriod - Harus FALSE jika jam sebelum openAt", () => {
      const now = Date.now();
      const open = now + 60_000; // 1 menit ke depan
      expect(isWithinPeriod(now, open, null)).toBe(false);
    });

    it("isWithinPeriod - Harus FALSE jika jam setelah closeAt", () => {
      const now = Date.now();
      const close = now - 60_000; // 1 menit lalu
      expect(isWithinPeriod(now, null, close)).toBe(false);
    });

    it("isWithinPeriod - Harus TRUE jika open & close keduanya null (tak terbatas)", () => {
      expect(isWithinPeriod(Date.now(), null, null)).toBe(true);
    });

    it("isWithinPeriod - Integrasi dengan Cristian offset", async () => {
      const sync = await cristianSync(getTimeFromNode4, 3);
      const adjustedNow = sync.adjustedNow;

      // Periode yang pasti mencakup sekarang
      const open = adjustedNow - 60_000;
      const close = adjustedNow + 60_000;
      expect(isWithinPeriod(adjustedNow, open, close)).toBe(true);

      // Periode yang pasti sudah lewat
      const pastClose = adjustedNow - 1;
      expect(isWithinPeriod(adjustedNow, null, pastClose)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Periode KRS — CRUD via Node 4 RPC
  // ---------------------------------------------------------------------------
  describe("5. Periode KRS — getKrsPeriod & setKrsPeriod (Node 4)", () => {
    it("getKrsPeriod - Harus mengembalikan info periode lengkap", async () => {
      const period: any = await callJsonRpc(KRS_URL, "getKrsPeriod", {});
      originalPeriod = period; // simpan untuk restore

      expect(period).toBeTruthy();
      expect(typeof period.serverTime).toBe("number");
      expect(typeof period.isOpen).toBe("boolean");
      expect(typeof period.reason).toBe("string");
      expect(period.serverIso).toBeTruthy();

      console.log(`  [Periode] isOpen: ${period.isOpen}, reason: ${period.reason}`);
    });

    it("setKrsPeriod - Harus bisa mengatur periode buka-tutup", async () => {
      const open = Date.now() - 3600_000; // 1 jam lalu
      const close = Date.now() + 3600_000; // 1 jam lagi

      const result: any = await callJsonRpc(KRS_URL, "setKrsPeriod", {
        openAt: open,
        closeAt: close,
        note: "test periode",
      });

      expect(result.openAt).toBe(open);
      expect(result.closeAt).toBe(close);
      expect(typeof result.serverTime).toBe("number");
    });

    it("setKrsPeriod - Harus MENOLAK jika openAt > closeAt", async () => {
      const future = Date.now() + 3600_000;
      const past = Date.now() - 3600_000;

      await expect(
        callJsonRpc(KRS_URL, "setKrsPeriod", {
          openAt: future,
          closeAt: past,
        }),
      ).rejects.toThrow();
    });

    it("setKrsPeriod - Harus menerima format ISO 8601", async () => {
      const openIso = new Date(Date.now() - 86400_000).toISOString(); // kemarin
      const closeIso = new Date(Date.now() + 86400_000).toISOString(); // besok

      const result: any = await callJsonRpc(KRS_URL, "setKrsPeriod", {
        openAt: openIso,
        closeAt: closeIso,
      });

      expect(result.openAt).toBeTruthy();
      expect(result.closeAt).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Integrasi: submitKrs Ditolak di Luar Periode
  // ---------------------------------------------------------------------------
  describe("6. Integrasi: submitKrs ditolak jika di luar periode KRS", () => {
    it("submitKrs - DITOLAK jika periode sudah ditutup (closeAt di masa lalu)", async () => {
      // Set periode yang sudah lewat
      await callJsonRpc(KRS_URL, "setKrsPeriod", {
        openAt: Date.now() - 7200_000,   // 2 jam lalu
        closeAt: Date.now() - 3600_000,  // 1 jam lalu (sudah tutup)
      });

      try {
        await expect(
          callJsonRpc(KRS_URL, "submitKrs", {
            nim: "240411100000",
            courseIds: [TEST_COURSE_ID],
          }),
        ).rejects.toThrow(/ditutup/i);
      } finally {
        // Restore SEGERA: jendela periode-tutup global harus sesempit
        // mungkin agar submitKrs file test lain yang paralel tidak kena.
        await openPeriodWide();
      }
    });

    it("submitKrs - DITOLAK jika periode belum dibuka (openAt di masa depan)", async () => {
      // Set periode yang belum buka
      await callJsonRpc(KRS_URL, "setKrsPeriod", {
        openAt: Date.now() + 3600_000,   // 1 jam lagi (belum buka)
        closeAt: Date.now() + 7200_000,  // 2 jam lagi
      });

      try {
        await expect(
          callJsonRpc(KRS_URL, "submitKrs", {
            nim: "240411100000",
            courseIds: [TEST_COURSE_ID],
          }),
        ).rejects.toThrow(/belum dibuka/i);
      } finally {
        await openPeriodWide();
      }
    });

    it("submitKrs - DITERIMA jika periode sedang terbuka", async () => {
      // Set periode terbuka lebar
      await callJsonRpc(KRS_URL, "setKrsPeriod", {
        openAt: null,
        closeAt: null,
        note: "test - always open",
      });

      // Reset kuota course isolasi agar bisa submit (scoped, bukan global)
      await callJsonRpc(COURSE_URL, "setQuota", { id: TEST_COURSE_ID, kuota: 10 });
      await callJsonRpc(COURSE_URL, "resetLock", { resource: `course:${TEST_COURSE_ID}:quota` });

      // Submit harus berhasil (asumsi Node 2, 3, 5 running)
      const result = await callJsonRpc(KRS_URL, "submitKrs", {
        nim: "240411100000",
        courseIds: [TEST_COURSE_ID],
      });

      expect(result).toBeTruthy();
      expect(result.krs).toBeTruthy();
      expect(result.status).toContain("berhasil");
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Integrasi End-to-End: Cristian + Validasi Periode
  // ---------------------------------------------------------------------------
  describe("7. End-to-End: Cristian sync + periode check dari sisi client", () => {
    it("Client menyinkronkan jam lalu memvalidasi apakah layak submit", async () => {
      // Set periode terbuka
      await callJsonRpc(KRS_URL, "setKrsPeriod", {
        openAt: Date.now() - 3600_000,
        closeAt: Date.now() + 3600_000,
      });

      // Cristian sync
      const sync = await cristianSync(getTimeFromNode4, 3);
      const adjustedNow = sync.adjustedNow;

      // Ambil periode
      const period: any = await callJsonRpc(KRS_URL, "getKrsPeriod", {});

      // Validasi dengan jam tersinkron
      const layak = isWithinPeriod(adjustedNow, period.openAt, period.closeAt);
      expect(layak).toBe(true);

      console.log(`  [E2E] Jam tersinkron: ${new Date(adjustedNow).toISOString()}`);
      console.log(`  [E2E] Periode: ${period.openAtIso ?? "-"} s/d ${period.closeAtIso ?? "-"}`);
      console.log(`  [E2E] Layak submit: ${layak}`);
    });

    it("Client mendeteksi periode sudah tutup melalui jam tersinkron", async () => {
      // Set periode yang sudah tutup
      await callJsonRpc(KRS_URL, "setKrsPeriod", {
        openAt: Date.now() - 7200_000,
        closeAt: Date.now() - 3600_000, // sudah tutup 1 jam lalu
      });

      try {
        const sync = await cristianSync(getTimeFromNode4, 2);
        const period: any = await callJsonRpc(KRS_URL, "getKrsPeriod", {});
        const layak = isWithinPeriod(sync.adjustedNow, period.openAt, period.closeAt);

        expect(layak).toBe(false);
        console.log(`  [E2E] Sudah tutup → layak: ${layak}`);
      } finally {
        // Restore segera (jangan biarkan periode-tutup bocor ke file paralel)
        await openPeriodWide();
      }
    });
  });
});
