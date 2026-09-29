# CONCEPT.md - Konsep Sistem Akademik Terdistribusi (JSON-RPC 2.0)

Dokumentasi ini menjelaskan simulasi sistem KRS (Kartu Rencana Studi) terdistribusi yang terdiri dari 5 node/service independen, dengan menerapkan Remote Procedure Call (RPC) secara penuh berbasis protokol standar JSON-RPC 2.0.

---

## 1. Arsitektur Topologi Sistem

```mermaid
flowchart TD
    subgraph ClientLayer [Client Layer]
        N1["Node 1: Student Client (CLI)"]
    end

    subgraph ServiceLayer [Core Services - Synchronous RPC]
        N2["Node 2: Student Server<br/>Port 3002<br/>DB: student.db"]
        N3["Node 3: Course Server<br/>Port 3003<br/>DB: course.db"]
        N4["Node 4: KRS Server<br/>Orchestrator<br/>Port 3004<br/>DB: krs.db"]
        N5["Node 5: Schedule Server<br/>Port 3005<br/>DB: schedule.db"]
    end

    N1 --> N2
    N1 --> N3
    N1 --> N4
    N1 --> N5

    N4 -.->|RPC Sync| N2
    N4 -.->|RPC Sync| N3
    N4 -.->|RPC Sync| N5
```

---

## 2. Diagram Alur Lengkap: Submit KRS (Full RPC Flow)

Diagram sekuensial berikut mendemonstrasikan bagaimana seluruh komunikasi antar-node menggunakan RPC (Blocking Synchronous) saat seorang mahasiswa melakukan pengisian KRS:

```mermaid
sequenceDiagram
    autonumber
    actor User as Mahasiswa Node 1
    participant N4 as Node 4 KRS Server
    participant N2 as Node 2 Student Server
    participant N3 as Node 3 Course Server
    participant N5 as Node 5 Schedule Server

    User->>N4: 1. POST /rpc (submitKrs, id: 101)
    
    activate N4
    Note over N4,N2: Validasi Status Mahasiswa via RPC (Blocking)
    N4->>N2: 2. POST /rpc (checkStudentStatus, id: 201)
    activate N2
    N2-->>N4: 3. Result: status aktif (id: 201)
    deactivate N2

    Note over N4,N3: Validasi Kuota Matkul via RPC (Blocking)
    N4->>N3: 4. POST /rpc (checkQuota, id: 301)
    activate N3
    N3-->>N4: 5. Result: kuota tersedia (id: 301)
    deactivate N3

    Note over N4,N5: Cek Konflik Jadwal via RPC (Blocking)
    N4->>N5: 6. POST /rpc (checkScheduleConflict, id: 501)
    activate N5
    N5-->>N4: 7. Result: tidak ada konflik (id: 501)
    deactivate N5

    Note over N4: 8. Simpan ke Database Lokal krs.db

    N4-->>User: 9. Result: KRS berhasil disimpan (id: 101)
    deactivate N4
```

---

## 3. Flowchart Logika Eksekusi Node 4 (Orkestrator)

```mermaid
flowchart TD
    A["Mulai: Terima Request submitKrs"] --> B{"Validasi Parameter Input"}
    B -- "Tidak Valid" --> C["Return Error: Invalid Params"]
    B -- "Valid" --> D["Panggil RPC Node 2: checkStudentStatus"]

    D --> E{"Mahasiswa Aktif?"}
    E -- "Tidak" --> F["Return Error: Mahasiswa Tidak Aktif"]
    E -- "Ya" --> G["Panggil RPC Node 3: checkQuota"]

    G --> H{"Kuota Tersedia?"}
    H -- "Habis" --> I["Return Error: Kuota Habis"]
    H -- "Tersedia" --> J["Panggil RPC Node 5: checkScheduleConflict"]

    J --> K{"Jadwal Bentrok?"}
    K -- "Bentrok" --> L["Return Error: Jadwal Bentrok"]
    K -- "Tidak Bentrok" --> M["Simpan Data ke Database krs.db"]

    M --> N["Return JSON-RPC Success ke Node 1"]
```

---

## 4. Mekanisme RPC (Spesifikasi JSON-RPC 2.0)

Seluruh komunikasi antar-node menggunakan pola RPC Synchronous (Blocking Request/Response):

```mermaid
flowchart LR
    subgraph RPC_Box [Pola RPC Synchronous]
        direction TB
        C1["Caller / Client"] -->|Request dengan ID| S1["Server"]
        S1 -->|Response Result dengan ID| C1
    end
```

Setiap request JSON-RPC 2.0 wajib menyertakan field `id` dan server wajib mengembalikan response dengan `id` yang sama. Caller akan menunggu (blocking) sampai response diterima sebelum melanjutkan eksekusi.

---

## 5. Ringkasan Node dan Port

| Node | Peran | Database | Port | Endpoint |
| :--- | :--- | :--- | :--- | :--- |
| **Node 1** | Student Client (CLI) | - | - | Client Only |
| **Node 2** | Student Server | `student.db` | `3002` | `POST /rpc` |
| **Node 3** | Course Server | `course.db` | `3003` | `POST /rpc` |
| **Node 4** | KRS Server (Orkestrator) | `krs.db` | `3004` | `POST /rpc` |
| **Node 5** | Schedule Server | `schedule.db` | `3005` | `POST /rpc` |

---

## 6. Daftar Method JSON-RPC 2.0 per Node

### Node 2 (Student Server)
* `getAllStudents`: `params: {}` -> Mengambil semua data mahasiswa.
* `getStudentByNim`: `params: { nim }` -> Mencari mahasiswa berdasarkan NIM.
* `getStudentStatus`: `params: { nim }` -> Mengecek status keaktifan (aktif, cuti, non-aktif).
* `createStudent`: `params: { nim, nama, status }` -> Menambahkan mahasiswa baru.

### Node 3 (Course Server)
* `getAllCourses`: `params: {}` -> Mengambil semua mata kuliah.
* `getCourseByKode`: `params: { kode }` -> Mencari mata kuliah berdasarkan kode.
* `getCourseById`: `params: { id }` -> Mencari mata kuliah berdasarkan ID.
* `checkQuota`: `params: { id }` -> Mengecek ketersediaan kuota.

### Node 4 (KRS Server - Orkestrator)
* `submitKrs`: `params: { nim, courseIds }` -> Orkestrasi validasi ke Node 2, 3, dan 5 via RPC, lalu simpan ke DB.
* `getAllKrs`: `params: {}` -> Mengambil semua KRS yang telah diagregasi dengan detail matkul dari Node 3.
* `getKrsById`: `params: { id }` -> Mengambil detail 1 KRS berdasarkan ID.
* `getKrsByNim`: `params: { nim }` -> Mengambil daftar riwayat KRS per NIM.

### Node 5 (Schedule Server)
* `getScheduleByCourseId`: `params: { courseId }` -> Mengambil jadwal berdasarkan ID mata kuliah.
* `getAllSchedules`: `params: {}` -> Mengambil seluruh daftar jadwal.
* `getScheduleByDay`: `params: { day }` -> Mengambil jadwal berdasarkan hari tertentu.
* `checkScheduleConflict`: `params: { courseIds }` -> Mengecek apakah ada bentrok jadwal antar mata kuliah yang dipilih.
