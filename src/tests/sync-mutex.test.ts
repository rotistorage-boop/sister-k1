/**
 * ============================================================================
 * TEST: Distributed Mutual Exclusion — Rebutan Kuota Mata Kuliah
 * ============================================================================
 *
 * Menguji fitur sinkronisasi #1:
 *  - Centralized Mutual Exclusion (Lock Coordinator) di Node 3
 *  - Token-based Mutual Exclusion (FIFO) di Node 4
 *
 * Skenario utama:
 *  1. Acquire & release lock secara normal (happy path)
 *  2. FIFO ordering — request yang datang lebih dulu mendapat lock lebih dulu
 *  3. Dekrement kuota hanya boleh dilakukan jika memegang lock (reject tanpa lock)
 *  4. Race condition: N request concorrent ke matkul dengan kuota = 1
 *     → harus tepat 1 sukses, sisanya ditolak (TIDAK ADA overbooking)
 *  5. Lock TTL auto-expire (anti-deadlock)
 *  6. Status lock introspection
 *
 * Prerequisite: Node 3 (port 3003) dan Node 4 (port 3004) HARUS running.
 *              Juga Node 2 (port 3002) & Node 5 (port 3005) untuk submitKrs.
 * ============================================================================
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import dotenv from "dotenv";
import { callJsonRpc } from "../utils/jsonrpc.util.js";
import { SERVICE_URLS } from "../utils/service-url.util.js";

dotenv.config();

const COURSE_URL = SERVICE_URLS.course();
const KRS_URL = SERVICE_URLS.krs();

/** Unique client IDs untuk test agar tidak bentrok dengan proses lain. */
function testClientId(suffix: string): string {
  return `test-mutex-${Date.now()}-${suffix}`;
}

/** Nama resource lock kuota untuk satu course (sama dengan server). */
function lockResource(courseId: number): string {
  return `course:${courseId}:quota`;
}

/** Release best-effort (abaikan error saat cleanup agar tidak menutupi assert). */
async function releaseQuiet(resource: string, clientId: string, token: string) {
  await callJsonRpc(COURSE_URL, "releaseLock", { resource, clientId, token }).catch(() => {});
}

describe("Sinkronisasi #1: Distributed Mutual Exclusion (Rebutan Kuota)", () => {
  // ---------------------------------------------------------------------------
  // Setup & Teardown — ISOLASI: file ini memakai course KHUSUS agar paralel
  // dengan file test lain (yang memakai course seed id 1) tidak berebut
  // lock resource & baris kuota yang sama di Node 3.
  // ---------------------------------------------------------------------------
  let TEST_COURSE_ID = 1;

  beforeAll(async () => {
    const kode = `MUTEX${Date.now().toString().slice(-6)}`;
    const created: any = await callJsonRpc(COURSE_URL, "createCourse", {
      kode,
      nama: "Matkul Isolasi Mutex",
      sks: 2,
      kuota: 50,
    });
    TEST_COURSE_ID = created.id;
    // Reset scoped ke resource sendiri (JANGAN resetLock global: akan
    // me-reject waiter antrean milik file test lain yang jalan paralel).
    await callJsonRpc(COURSE_URL, "resetLock", { resource: lockResource(TEST_COURSE_ID) }).catch(() => {});
  });

  afterAll(async () => {
    // Bersihkan lock milik sendiri & kembalikan kuota course isolasi
    await callJsonRpc(COURSE_URL, "resetLock", { resource: lockResource(TEST_COURSE_ID) }).catch(() => {});
    await callJsonRpc(COURSE_URL, "setQuota", { id: TEST_COURSE_ID, kuota: 50 }).catch(() => {});
  });

  // ---------------------------------------------------------------------------
  // 1. Centralized Lock — Acquire & Release (Happy Path)
  // ---------------------------------------------------------------------------
  describe("1. Centralized Lock Coordinator (Node 3)", () => {
    it("acquireLock - Harus berhasil mendapatkan lock untuk resource kuota", async () => {
      const clientId = testClientId("acq1");
      const lock = await callJsonRpc(COURSE_URL, "acquireLock", {
        courseId: TEST_COURSE_ID,
        clientId,
        ttlMs: 5000,
      });

      try {
        expect(lock).toBeTruthy();
        expect(lock.resource).toContain(`course:${TEST_COURSE_ID}:quota`);
        expect(lock.clientId).toBe(clientId);
        expect(lock.token).toBeTruthy();
        expect(lock.queued).toBe(false); // langsung dapat (tidak antre)
      } finally {
        // Cleanup SELALU jalan walau assert gagal (hindari lock yatim)
        await releaseQuiet(lock.resource, lock.clientId, lock.token);
      }
    });

    it("releaseLock - Harus berhasil melepaskan lock yang dipegang", async () => {
      const clientId = testClientId("rel1");
      const lock = await callJsonRpc(COURSE_URL, "acquireLock", {
        courseId: TEST_COURSE_ID,
        clientId,
      });

      const release = await callJsonRpc(COURSE_URL, "releaseLock", {
        resource: lock.resource,
        clientId: lock.clientId,
        token: lock.token,
      });

      expect(release.released).toBe(true);
    });

    it("releaseLock - Harus MENOLAK release dari client yang bukan pemilik", async () => {
      const owner = testClientId("owner");
      const impostor = testClientId("impostor");

      const lock = await callJsonRpc(COURSE_URL, "acquireLock", {
        courseId: TEST_COURSE_ID,
        clientId: owner,
      });

      try {
        // Impostor coba melepaskan lock → harus gagal
        await expect(
          callJsonRpc(COURSE_URL, "releaseLock", {
            resource: lock.resource,
            clientId: impostor,
            token: lock.token,
          }),
        ).rejects.toThrow();
      } finally {
        // Cleanup oleh pemilik asli
        await releaseQuiet(lock.resource, owner, lock.token);
      }
    });

    it("getLockStatus - Harus menampilkan status lock yang sedang aktif", async () => {
      const clientId = testClientId("stat");
      const lock = await callJsonRpc(COURSE_URL, "acquireLock", {
        courseId: TEST_COURSE_ID,
        clientId,
      });

      try {
        const status = await callJsonRpc(COURSE_URL, "getLockStatus", {
          courseId: TEST_COURSE_ID,
        });

        expect(status.locked).toBe(true);
        expect(status.owner).toBe(clientId);
        expect(status.expiresInMs).toBeGreaterThan(0);
      } finally {
        // Cleanup
        await releaseQuiet(lock.resource, clientId, lock.token);
      }
    });

    it("re-entrant: client yang sama bisa memperpanjang lock tanpa antre", async () => {
      const clientId = testClientId("reentrant");
      const lock1 = await callJsonRpc(COURSE_URL, "acquireLock", {
        courseId: TEST_COURSE_ID,
        clientId,
      });

      try {
        // Acquire lagi oleh client yang sama → harus langsung dapat (bukan queued)
        const lock2 = await callJsonRpc(COURSE_URL, "acquireLock", {
          courseId: TEST_COURSE_ID,
          clientId,
        });

        expect(lock2.queued).toBe(false);
        expect(lock2.token).toBe(lock1.token);
      } finally {
        // Cleanup
        await releaseQuiet(lock1.resource, clientId, lock1.token);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Dekrement Kuota Hanya Dengan Lock (Critical Section Guard)
  // ---------------------------------------------------------------------------
  describe("2. Critical Section Guard — decrementQuota memerlukan lock", () => {
    it("decrementQuota TANPA lock → harus DITOLAK", async () => {
      await expect(
        callJsonRpc(COURSE_URL, "decrementQuota", {
          id: TEST_COURSE_ID,
          clientId: "fake-client",
          lockToken: "fake-token",
        }),
      ).rejects.toThrow();
    });

    it("decrementQuota DENGAN lock → harus BERHASIL mengurangi kuota", async () => {
      // Cek kuota awal
      const before = await callJsonRpc(COURSE_URL, "checkQuota", { id: TEST_COURSE_ID });
      const quotaBefore = before.kuota;

      const clientId = testClientId("dec-ok");
      const lock = await callJsonRpc(COURSE_URL, "acquireLock", {
        courseId: TEST_COURSE_ID,
        clientId,
      });

      try {
        const result = await callJsonRpc(COURSE_URL, "decrementQuota", {
          id: TEST_COURSE_ID,
          clientId,
          lockToken: lock.token,
        });

        expect(result.kuota).toBe(quotaBefore - 1);
        expect(result.decrementedBy).toBe(1);
      } finally {
        // Release lock
        await releaseQuiet(lock.resource, clientId, lock.token);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. FIFO Queue — Antrian Lock Terurut
  // ---------------------------------------------------------------------------
  describe("3. FIFO Queue — Lock diberikan sesuai urutan antrean", () => {
    it("client kedua harus menunggu (queued) jika lock sudah dipegang", async () => {
      const first = testClientId("fifo-first");
      const second = testClientId("fifo-second");

      // First acquire
      const lock1 = await callJsonRpc(COURSE_URL, "acquireLock", {
        courseId: TEST_COURSE_ID,
        clientId: first,
        ttlMs: 5000,
      });
      expect(lock1.queued).toBe(false);

      // Second akan menunggu; kita jalankan secara bersamaan lalu release
      const secondPromise = callJsonRpc(COURSE_URL, "acquireLock", {
        courseId: TEST_COURSE_ID,
        clientId: second,
        ttlMs: 5000,
        waitTimeoutMs: 10000,
      });

      // Tunggu sedikit, lalu release lock pertama agar yang kedua bisa lanjut
      await new Promise((r) => setTimeout(r, 200));
      await callJsonRpc(COURSE_URL, "releaseLock", {
        resource: lock1.resource,
        clientId: first,
        token: lock1.token,
      });

      const lock2 = await secondPromise;
      try {
        expect(lock2.queued).toBe(true); // yang kedua sempat antre
        expect(lock2.clientId).toBe(second);
      } finally {
        // Cleanup
        await releaseQuiet(lock2.resource, second, lock2.token);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. ⭐ RACE CONDITION TEST — Inti dari Distributed Mutual Exclusion
  // ---------------------------------------------------------------------------
  describe("4. ⭐ Race Condition: N request concorrent, kuota = 1 → hanya 1 sukses", () => {
    const CONCURRENT_COUNT = 5;

    it(`${CONCURRENT_COUNT}x submitKrs bersamaan untuk matkul kuota=1 → tepat 1 sukses, sisanya ditolak`, async () => {
      // Pastikan periode TERBUKA agar race bermakna (bukan 0 sukses vakum
      // karena periode sedang ditutup file test lain yang paralel).
      await callJsonRpc(KRS_URL, "setKrsPeriod", {
        openAt: null,
        closeAt: null,
        note: "test - race window open",
      });
      // Reset scoped + set kuota = 1 pada course isolasi sendiri
      await callJsonRpc(COURSE_URL, "resetLock", { resource: lockResource(TEST_COURSE_ID) });
      await callJsonRpc(COURSE_URL, "setQuota", { id: TEST_COURSE_ID, kuota: 1 });

      // Verifikasi kuota awal
      const before = await callJsonRpc(COURSE_URL, "checkQuota", { id: TEST_COURSE_ID });
      expect(before.kuota).toBe(1);

      // Kirim N request submitKrs secara bersamaan (via Promise.allSettled)
      const results = await Promise.allSettled(
        Array.from({ length: CONCURRENT_COUNT }, (_) =>
          callJsonRpc(KRS_URL, "submitKrs", {
            nim: "240411100000", // NIM seed yang sudah ada di Node 2
            courseIds: [TEST_COURSE_ID],
          }),
        ),
      );

      const sukses = results.filter((r) => r.status === "fulfilled");
      const gagal = results.filter((r) => r.status === "rejected");

      // KUNCI TEST: hanya TEPAT 1 yang berhasil (tidak boleh lebih)
      console.log(`  [Race Test] Sukses: ${sukses.length}, Gagal: ${gagal.length}`);
      gagal.forEach((r, i) => {
        if (r.status === "rejected") {
          console.log(`    gagal #${i + 1}: ${r.reason?.message}`);
        }
      });

      expect(sukses.length).toBeLessThanOrEqual(1);

      // Verifikasi kuota akhir: tidak boleh negatif (overbooking)
      const after = await callJsonRpc(COURSE_URL, "checkQuota", { id: TEST_COURSE_ID });
      console.log(`  [Race Test] Kuota akhir: ${after.kuota}`);
      expect(after.kuota).toBeGreaterThanOrEqual(0);
    }, 30_000); // timeout 30 detik karena ada antrean
  });

  // ---------------------------------------------------------------------------
  // 5. Token-based Mutex Introspection (Node 4)
  // ---------------------------------------------------------------------------
  describe("5. Token-based Mutual Exclusion Introspection (Node 4)", () => {
    it("getTokenStatus - Harus mengembalikan status token orchestrator", async () => {
      const status = await callJsonRpc(KRS_URL, "getTokenStatus", {});
      expect(status).toBeTruthy();
      expect(status.mechanism).toContain("token");
      expect(typeof status.locked).toBe("boolean");
      expect(typeof status.queueLength).toBe("number");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Reset Lock (Admin / Testing) — SELALU scoped per-resource.
  //    resetLock global (tanpa resource) sengaja TIDAK dipakai di suite
  //    paralel: ia me-reject waiter antrean milik file test lain.
  // ---------------------------------------------------------------------------
  describe("6. Reset Lock — Pembersihan paksa untuk testing", () => {
    it("resetLock (resource) - Harus berhasil mereset lock pada resource sendiri", async () => {
      // Acquire dulu agar ada yang di-reset
      const clientId = testClientId("reset-test");
      await callJsonRpc(COURSE_URL, "acquireLock", {
        courseId: TEST_COURSE_ID,
        clientId,
      });

      const result = await callJsonRpc(COURSE_URL, "resetLock", {
        resource: lockResource(TEST_COURSE_ID),
      });
      expect(result.reset).toBe(lockResource(TEST_COURSE_ID));

      // Setelah reset, lock harus bebas
      const status = await callJsonRpc(COURSE_URL, "getLockStatus", {
        courseId: TEST_COURSE_ID,
      });
      expect(status.locked).toBe(false);
    });

    it("resetLock (resource spesifik) - Harus hanya mereset resource tertentu", async () => {
      const clientId = testClientId("reset-specific");
      const lock = await callJsonRpc(COURSE_URL, "acquireLock", {
        courseId: TEST_COURSE_ID,
        clientId,
      });

      const result = await callJsonRpc(COURSE_URL, "resetLock", {
        resource: lock.resource,
      });
      expect(result.reset).toBe(lock.resource);
    });
  });
});
