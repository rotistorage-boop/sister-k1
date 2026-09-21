import test, { describe, it } from "node:test";
import assert from "node:assert";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.STUDENT_SERVICE_URL || "http://localhost:3002";

describe("Node 2: Student Server API Tests", () => {
  it("GET / - Harus mengembalikan semua data mahasiswa", async () => {
    const res = await fetch(BASE_URL);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  it("POST / - Harus berhasil menambahkan mahasiswa baru", async () => {
    const testNim = `TEST_${Date.now()}`;
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nim: testNim,
        nama: "Mahasiswa Test",
        status: "aktif",
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.nim, testNim);
  });

  it("GET /:nim - Harus mengembalikan mahasiswa berdasarkan NIM", async () => {
    const res = await fetch(`${BASE_URL}/240411100000`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.nim, "240411100000");
  });

  it("GET /:nim/status - Harus mengembalikan status mahasiswa", async () => {
    const res = await fetch(`${BASE_URL}/240411100000/status`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.status);
  });
});
