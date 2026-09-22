import test, { describe, it } from "node:test";
import assert from "node:assert";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.NOTIFICATION_SERVICE_URL as string;

describe("Node 5: Notification Server API Tests", () => {
  it("POST /notify - Harus berhasil menerima dan menyimpan notifikasi baru", async () => {
    const res = await fetch(`${BASE_URL}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nim: "240411100000",
        message: "Notifikasi Test dari Integration Test",
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.nim, "240411100000");
  });

  it("GET / - Harus mengembalikan seluruh daftar notifikasi", async () => {
    const res = await fetch(BASE_URL);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  it("GET /:nim - Harus mengembalikan notifikasi berdasarkan NIM", async () => {
    const res = await fetch(`${BASE_URL}/240411100000`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
  });
});
