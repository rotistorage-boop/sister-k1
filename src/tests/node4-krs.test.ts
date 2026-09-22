import test, { describe, it } from "node:test";
import assert from "node:assert";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.KRS_SERVICE_URL as string;

describe("Node 4: KRS Server API Tests", () => {
  it("POST /submit - Harus berhasil submit KRS dengan RPC ke Node 2 & 3", async () => {
    const res = await fetch(`${BASE_URL}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nim: "240411100000",
        courseIds: [1, 2],
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.krs);
    assert.ok(Array.isArray(body.data.courses));
  });

  it("GET / - Harus mengembalikan seluruh data KRS", async () => {
    const res = await fetch(BASE_URL);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  it("GET /student/:nim - Harus mengembalikan daftar KRS berdasarkan NIM beserta detail matkul", async () => {
    const res = await fetch(`${BASE_URL}/student/240411100000`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    if (body.data.length > 0) {
      assert.ok(Array.isArray(body.data[0].courses));
    }
  });

  it("GET /:id - Harus mengembalikan KRS spesifik berdasarkan ID beserta detail matkul", async () => {
    const res = await fetch(`${BASE_URL}/1`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.id, 1);
    assert.ok(Array.isArray(body.data.courses));
  });
});
