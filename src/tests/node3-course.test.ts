import test, { describe, it } from "node:test";
import assert from "node:assert";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.COURSE_SERVICE_URL as string;

describe("Node 3: Course Server API Tests", () => {
  it("GET / - Harus mengembalikan semua daftar mata kuliah", async () => {
    const res = await fetch(BASE_URL);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  it("GET /:kode - Harus mengembalikan mata kuliah berdasarkan kode", async () => {
    const res = await fetch(`${BASE_URL}/IF101`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.kode, "IF101");
  });

  it("GET /id/:id - Harus mengembalikan mata kuliah berdasarkan ID", async () => {
    const res = await fetch(`${BASE_URL}/id/1`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.id, 1);
  });
});
