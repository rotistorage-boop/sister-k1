# CONCEPT.md - Konsep Sistem Akademik Terdistribusi (RPC + AMI)

Simulasi sistem KRS (Kartu Rencana Studi) sederhana yang terdiri dari 5 node/program terpisah, mendemonstrasikan dua pola komunikasi antar-service dalam sistem terdistribusi:

* RPC (Remote Procedure Call): synchronous HTTP request/response. Pemanggil mengirim request dan menunggu hasilnya sebelum lanjut.
* AMI (Asynchronous Method Invocation): pemanggil mengirim request lalu langsung lanjut tanpa menunggu proses selesai.

Catatan: RPC di sistem ini diimplementasikan sebagai HTTP request/response (via Hono.js di Node.js/TypeScript), bukan protokol RPC baku seperti gRPC/XML-RPC/JSON-RPC. Yang membedakan RPC vs AMI di sini murni dari pola pemanggilannya (blocking vs non-blocking), bukan dari protokol jaringannya.

---

## 1. Arsitektur

```text
                    +-------------------+
                    |      NODE 1       |
                    |   Student Client  |
                    |     (Mahasiswa)   |
                    +---------+---------+
                              |
                       RPC (synchronous)
                              |
         +--------------------+--------------------+
         |                    |                    |
         v                    v                    v
+------------------+ +------------------+ +------------------+
|      NODE 2      | |      NODE 3      | |      NODE 4      |
|  Student Server  | |  Course Server   | |    KRS Server    |
|    student.db    | |    course.db     | |      krs.db      |
+------------------+ +------------------+ +---------+--------+
                                                    |
                                            AMI (asynchronous)
                                                    |
                                                    v
                                          +------------------+
                                          |      NODE 5      |
                                          |   Notification   |
                                          | notification.db  |
                                          +------------------+
```

Poin penting: Node 4 bukan cuma menerima request dari Node 1. Saat memproses submitKRS, Node 4 juga jadi client yang memanggil balik Node 2 (checkStudentStatus) dan Node 3 (checkQuota) via RPC untuk validasi, sebelum akhirnya menyimpan data dan mengirim notifikasi secara asinkron ke Node 5.

---

## 2. Ringkasan Node

| Node | Peran | Database | Port |
| --- | --- | --- | --- |
| Node 1 | Student Client (UI/CLI mahasiswa) | - | - |
| Node 2 | Student Server | student.db | 3002 |
| Node 3 | Course Server | course.db | 3003 |
| Node 4 | KRS Server (orkestrator) | krs.db | 3004 |
| Node 5 | Notification Server | notification.db | 3005 |

---

## 3. Mana RPC, Mana AMI

| Method | Dipanggil oleh -> tujuan | Mekanisme | Alasan |
| --- | --- | --- | --- |
| getStudent(nim) | Node 1 -> Node 2 | RPC | Hasil dibutuhkan langsung untuk ditampilkan |
| checkStudentStatus(nim) | Node 1 -> Node 2, Node 4 -> Node 2 | RPC | Validasi harus selesai sebelum lanjut |
| getCourses() | Node 1 -> Node 3 | RPC | Hasil dibutuhkan langsung |
| getCourse(courseId) | Node 1 -> Node 3 | RPC | Hasil dibutuhkan langsung |
| checkQuota(courseId) | Node 4 -> Node 3 | RPC | Validasi harus selesai sebelum KRS disimpan |
| submitKRS(nim, courses) | Node 1 -> Node 4 | RPC | Mahasiswa perlu tahu KRS berhasil/gagal saat itu juga |
| getKRS(nim) | Node 1 -> Node 4 | RPC | Hasil dibutuhkan langsung |
| sendNotification(nim, message) | Node 4 -> Node 5 | AMI | KRS sudah selesai diproses; kirim notifikasi tidak perlu ditunggu |

Prinsip: RPC dipakai kalau pemanggil butuh hasilnya untuk melanjutkan logika berikutnya. AMI dipakai kalau pemanggil tidak peduli kapan prosesnya selesai, cukup tahu request sudah diterima.

---

## 4. Alur Lengkap: Mahasiswa Mengisi KRS

```text
1. Node 1 --RPC: getStudent(nim)-------------> Node 2
   Node 1 <----------------------------------- {nama, status}

2. Node 1 --RPC: getCourses()----------------> Node 3
   Node 1 <----------------------------------- [daftar mata kuliah]

3. Node 1 --RPC: submitKRS(nim, [kode_mk])---> Node 4
                                                  |
                                                  +-- RPC: checkStudentStatus(nim) -> Node 2 (tunggu balasan)
                                                  |
                                                  +-- RPC: checkQuota(courseId) -> Node 3 (tunggu balasan)
                                                  |
                                                  +-- simpan ke krs.db
                                                  |
   Node 1 <---- response "KRS berhasil" ----------+
                                                  |
                                                  +-- AMI: sendNotification(nim, msg) -> Node 5
                                                       (TIDAK ditunggu, Node 4 sudah selesai
                                                        merespons Node 1 di langkah sebelumnya)
                                                                                         |
                                                                                         v
                                                                              Node 5 simpan ke
                                                                              notification.db
```

Yang membuktikan ini AMI: Node 1 sudah menerima "KRS berhasil" duluan, sebelum Node 5 selesai memproses notifikasi. Kalau Node 5 mati/lambat, proses submitKRS di Node 1 tetap sukses dan tidak ikut lambat.

---

## 5. Skema Database per Node

### Node 2 - student.db, tabel students

| Field | Tipe | Contoh |
| --- | --- | --- |
| id | int, PK | 1 |
| nim | varchar | 230001 |
| nama | varchar | Budi |
| status | varchar | aktif |

### Node 3 - course.db, tabel courses

| Field | Tipe | Contoh |
| --- | --- | --- |
| id | int, PK | 10 |
| kode | varchar | IF101 |
| nama | varchar | Pemrograman Web |
| sks | int | 3 |
| kuota | int | 30 |

### Node 4 - krs.db, tabel krs dan krs_details

```text
krs
- id (PK)
- nim
- status (pending / approved / rejected)
- created_at

krs_details
- id (PK)
- krs_id (FK -> krs.id)
- course_id
```

### Node 5 - notification.db, tabel notifications

| Field | Tipe | Contoh |
| --- | --- | --- |
| id | int, PK | 1 |
| nim | varchar | 230001 |
| message | varchar | KRS berhasil |
| status | varchar | sent |

Setiap node punya database sendiri (pola database-per-service). Tidak ada node yang mengakses DB milik node lain secara langsung, semua harus lewat pemanggilan RPC/AMI.

---

## 6. Implementasi Kunci: Membedakan RPC vs AMI di Hono / Node.js

RPC (blocking) - di Node 4 saat validasi ke Node 2/3:

```typescript
const res = await fetch(`${STUDENT_SERVICE_URL}/students/${nim}/status`);
const status = await res.json(); // baris ini BARU jalan setelah Node 2 membalas
```

AMI (non-blocking) - di Node 4 saat kirim notifikasi ke Node 5:

```typescript
// Tanpa await di pemanggilan fetch notifikasi:
fetch(`${NOTIFICATION_SERVICE_URL}/notify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nim, message: "KRS berhasil" }),
}).catch((err) => console.error("Gagal kirim notifikasi:", err));

// response ke Node 1 langsung dikirim, tidak menunggu fetch ke Node 5 selesai
return c.json({ status: "KRS berhasil disimpan" });
```

Kalau pemanggilan fetch notifikasi menggunakan await, itu otomatis menjadi RPC (blocking) lagi, bukan AMI.
