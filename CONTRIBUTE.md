# CONTRIBUTE.md - Aturan Kontribusi Tim

Panduan ini dibuat untuk mengatur alur pengerjaan dan kolaborasi tim pada proyek Sistem Terdistribusi (Multi-Node Microservices).

---

## 1. Aturan Spesialisasi Node (Strict Scope Isolation)

Setiap anggota tim bertanggung jawab atas Node yang telah ditugaskan. Batas pengerjaan (boundary) harus dipatuhi secara ketat:

* Tugas Node 1 (Client CLI): Seluruh perubahan HANYA BOLEH dilakukan di dalam folder `src/node1-client/`. Dilarang mengedit file di folder Node 2, Node 3, Node 4, maupun Node 5.
* Tugas Node 2 (Student Microservice): Seluruh perubahan HANYA BOLEH dilakukan di dalam folder `src/node2-student/`.
* Tugas Node 3 (Course Microservice): Seluruh perubahan HANYA BOLEH dilakukan di dalam folder `src/node3-course/`.
* Tugas Node 4 (KRS Microservice): Seluruh perubahan HANYA BOLEH dilakukan di dalam folder `src/node4-krs/`.
* Tugas Node 5 (Notification Microservice): Seluruh perubahan HANYA BOLEH dilakukan di dalam folder `src/node5-notification/`.

Catatan: Mengubah kode milik Node lain tanpa konfirmasi tim akan merusak isolasi microservice dan dapat menyebabkan bentrok pada Git.

---

## 2. Aturan Database dan Independensi Node

1. Database Terpisah (Database-per-Service): Setiap Node Service mengelola database SQLite sendiri (student.db, course.db, krs.db, notification.db). Dilarang membaca atau menulis file db milik Node lain secara langsung.
2. Inter-Node Communication via HTTP / RPC: Jika Node Anda memerlukan data dari Node lain, peroleh data tersebut melalui panggilan HTTP REST / RPC API ke endpoint Node bersangkutan.
3. Database Migration dan Seeding: Drizzle schema (schema.ts), seeder (seed.ts), dan konfigurasi (drizzle.config.ts) dikelola secara mandiri di dalam folder masing-masing Node.

---

## 3. Aturan Workflow Git dan Commit (ruleGit.txt)

Seluruh anggota tim wajib mematuhi aturan Git yang ditetapkan pada D:\promt\ruleGit.txt:

1. Dilarang menggunakan `git add .` atau `git add -A`.
2. Stage file secara individual menggunakan exact file path (`git add path/to/file`).
3. Commit setiap file secara terpisah (1 file = 1 commit).
4. Gunakan Conventional Commits untuk pesan commit (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
5. Eksekusi perintah Git dalam satu baris terantai (chained command) menggunakan pemisah `;`:
   ```bash
   git add path/to/file1; git commit -m "feat: deskripsi fitur"; git add path/to/file2; git commit -m "docs: update docs"
   ```

---

## 4. Standardisasi Response API dan Port Mapping

* Port Mapping Default:
  * Node 1: Client CLI (No HTTP Listener)
  * Node 2: Student Service -> http://localhost:3002
  * Node 3: Course Service -> http://localhost:3003
  * Node 4: KRS Service -> http://localhost:3004
  * Node 5: Notification Service -> http://localhost:3005

* Response Format: Semua HTTP response dari service wajib menggunakan format JSON standar:
  ```json
  {
    "success": true,
    "message": "Pesan status",
    "data": {}
  }
  ```
