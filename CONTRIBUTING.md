# CONTRIBUTE.md - Aturan Kontribusi Tim

Panduan ini dibuat untuk mengatur alur pengerjaan dan kolaborasi tim pada proyek Sistem Terdistribusi (Multi-Node Microservices berbasis JSON-RPC 2.0).

---

## 1. Aturan Spesialisasi Node (Strict Scope Isolation)

Setiap anggota tim bertanggung jawab atas Node yang telah ditugaskan. Batas pengerjaan (boundary) harus dipatuhi secara ketat:

- **Tugas Node 1 (Client CLI):** Seluruh perubahan HANYA BOLEH dilakukan di dalam folder `src/node1-client/`.
- **Tugas Node 2 (Student Microservice):** Seluruh perubahan HANYA BOLEH dilakukan di dalam folder `src/node2-student/`.
- **Tugas Node 3 (Course Microservice):** Seluruh perubahan HANYA BOLEH dilakukan di dalam folder `src/node3-course/`.
- **Tugas Node 4 (KRS Microservice):** Seluruh perubahan HANYA BOLEH dilakukan di dalam folder `src/node4-krs/`.
- **Tugas Node 5 (Schedule Microservice):** Seluruh perubahan HANYA BOLEH dilakukan di dalam folder `src/node5-schedule/`.

---

## 2. Aturan Database dan Komunikasi Antar-Node

1. **Database Terpisah (Database-per-Service):** Setiap Node mengelola SQLite masing-masing (`student.db`, `course.db`, `krs.db`, `schedule.db`). Dilarang mengakses DB node lain secara langsung.
2. **Protokol JSON-RPC 2.0:** Seluruh komunikasi antar-node wajib menggunakan format standar JSON-RPC 2.0 melalui `POST /rpc`.
3. **Pola RPC (Synchronous):** Gunakan `callJsonRpc(url, method, params)` yang menyertakan field `id` dan menunggu `result`.

---

## 3. Format Protokol JSON-RPC 2.0

* **Success Response:**
  ```json
  {
    "jsonrpc": "2.0",
    "result": {},
    "id": 12345
  }
  ```
* **Error Response:**
  ```json
  {
    "jsonrpc": "2.0",
    "error": {
      "code": -32601,
      "message": "Method not found"
    },
    "id": 12345
  }
  ```

---

## 4. Aturan Workflow Git dan Commit

1. Dilarang menggunakan `git add .` atau `git add -A`.
2. Stage file secara individual menggunakan exact file path (`git add path/to/file`).
3. Commit setiap file secara terpisah (1 file = 1 commit).
4. Gunakan Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
