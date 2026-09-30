# CONCEPT.md - Arsitektur Hybrid: Sistem Akademik Terdistribusi (RPC & RMI)

Dokumentasi ini menjelaskan implementasi Sistem Terdistribusi multi-node yang menggabungkan dua paradigma utama:
1. **RPC (*Remote Procedure Call*)** berbasis standar **JSON-RPC 2.0** pada Node 2, Node 3, dan Node 4.
2. **RMI (*Remote Method Invocation*)** berbasis **Distributed Remote Object & Client Stub Proxy** pada Node 5.

---

## 1. Arsitektur Topologi Sistem

```mermaid
flowchart TD
    subgraph ClientLayer [Client Layer]
        N1["Node 1: Student Client<br/>(Web UI & CLI)"]
    end

    subgraph RpcServices [RPC Services Layer - JSON-RPC 2.0]
        N2["Node 2: Student Server<br/>Port 3002<br/>DB: student.db<br/>(Endpoint: POST /rpc)"]
        N3["Node 3: Course Server<br/>Port 3003<br/>DB: course.db<br/>(Endpoint: POST /rpc)"]
        N4["Node 4: KRS Orchestrator<br/>Port 3004<br/>DB: krs.db<br/>(Endpoint: POST /rpc)"]
    end

    subgraph RmiServices [RMI Service Layer - Remote Object]
        N5["Node 5: Schedule Server<br/>Port 3005<br/>DB: schedule.db<br/>(RMI Registry: POST /rmi)"]
    end

    N1 -->|JSON-RPC| N2
    N1 -->|JSON-RPC| N3
    N1 -->|JSON-RPC| N4
    N1 -.->|RMI Stub Proxy| N5

    N4 -->|JSON-RPC Sync| N2
    N4 -->|JSON-RPC Sync| N3
    N4 -.->|RMI Remote Invocation| N5
```

---

## 2. Diagram Alur: Submit KRS (Hybrid RPC & RMI Flow)

Diagram sekuensial berikut menunjukkan interaksi saat mahasiswa melakukan submit KRS di mana Node 4 memanggil Node 2 & Node 3 via RPC, serta memanggil Node 5 via RMI Stub Proxy:

```mermaid
sequenceDiagram
    autonumber
    actor User as Mahasiswa Node 1
    participant N4 as Node 4 KRS Server (Orchestrator)
    participant N2 as Node 2 Student Server (RPC)
    participant N3 as Node 3 Course Server (RPC)
    participant N5Proxy as RMI Stub Proxy (Node 4)
    participant N5 as Node 5 Schedule Remote Object (RMI)

    User->>N4: 1. POST /rpc (submitKrs, id: 101)
    
    activate N4
    Note over N4,N2: Validasi Status Mahasiswa via JSON-RPC
    N4->>N2: 2. POST /rpc { method: "checkStudentStatus", params: { nim } }
    activate N2
    N2-->>N4: 3. JSON-RPC Result: status aktif
    deactivate N2

    Note over N4,N3: Validasi Kuota Mata Kuliah via JSON-RPC
    N4->>N3: 4. POST /rpc { method: "checkQuota", params: { id } }
    activate N3
    N3-->>N4: 5. JSON-RPC Result: kuota tersedia
    deactivate N3

    Note over N4,N5: Validasi Konflik Jadwal via RMI Stub Proxy
    N4->>N5Proxy: 6. scheduleProxy.checkScheduleConflict(courseIds)
    activate N5Proxy
    N5Proxy->>N5: 7. POST /rmi { rmi: "1.0", service: "ScheduleService", method: "checkScheduleConflict", args: [courseIds] }
    activate N5
    N5-->>N5Proxy: 8. RMI Result: no conflict
    deactivate N5
    N5Proxy-->>N4: 9. Return ScheduleConflictResult object
    deactivate N5Proxy

    Note over N4: 10. Simpan ke Database Lokal krs.db

    N4-->>User: 11. JSON-RPC Result: KRS berhasil disimpan
    deactivate N4
```

---

## 3. Komparasi Protokol: RPC vs RMI dalam Sistem Ini

| Aspek | Node 2, 3, 4 (JSON-RPC 2.0) | Node 5 (RMI - Remote Method Invocation) |
| :--- | :--- | :--- |
| **Paradigma** | Berorientasi Prosedur/Fungsi (*Procedural*) | Berorientasi Objek (*Object-Oriented*) |
| **Pemanggilan di Client** | `callJsonRpc(url, "methodName", { params })` | `proxy.methodName(arg1, arg2)` via Client Stub Proxy |
| **Server-Side Dispatcher** | Router mencocokkan string method ke handler fungsi | `RmiRegistry` mencari instans *Servant* dan memanggil method pada objek |
| **Payload Spesifikasi** | `{ jsonrpc: "2.0", method: "...", params: {...}, id: ... }` | `{ rmi: "1.0", service: "ScheduleService", method: "...", args: [...], id: ... }` |
| **Lokasi Utilitas** | `src/utils/jsonrpc.util.ts` | `src/utils/rmi.util.ts` |

---

## 4. Ringkasan Node dan Protokol

| Node | Peran | Database | Port | Protokol Utama | Endpoint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Node 1** | Student Client (Web UI & CLI) | - | 5173 | Client (RPC + RMI Stub) | - |
| **Node 2** | Student Server | `student.db` | `3002` | JSON-RPC 2.0 | `POST /rpc` |
| **Node 3** | Course Server | `course.db` | `3003` | JSON-RPC 2.0 | `POST /rpc` |
| **Node 4** | KRS Server (Orchestrator) | `krs.db` | `3004` | JSON-RPC 2.0 + RMI Client | `POST /rpc` |
| **Node 5** | Schedule Server | `schedule.db` | `3005` | **RMI (Remote Object)** | `POST /rmi` |

---

## 5. Daftar Method Remote per Node

### Node 2 (Student Server - RPC)
* `getAllStudents`: `params: {}`
* `getStudentByNim`: `params: { nim }`
* `getStudentStatus`: `params: { nim }`
* `createStudent`: `params: { nim, nama, status }`

### Node 3 (Course Server - RPC)
* `getAllCourses`: `params: {}`
* `getCourseByKode`: `params: { kode }`
* `getCourseById`: `params: { id }`
* `checkQuota`: `params: { id }`

### Node 4 (KRS Server - RPC Orchestrator)
* `submitKrs`: `params: { nim, courseIds }` -> Orkestrasi RPC ke Node 2 & 3, serta RMI ke Node 5.
* `getAllKrs`: `params: {}` -> Mengambil semua KRS yang diperkaya dengan detail matkul dari Node 3.
* `getKrsById`: `params: { id }`
* `getKrsByNim`: `params: { nim }`

### Node 5 (Schedule Server - RMI `ScheduleService`)
* `getAllSchedules()` -> Mengambil semua jadwal.
* `getScheduleByCourseId(courseId: number)` -> Mengambil jadwal mata kuliah.
* `getScheduleByDay(day: string)` -> Mengambil jadwal berdasarkan hari.
* `checkScheduleConflict(courseIds: number[])` -> Memeriksa bentrok jam perkuliahan antar-mata kuliah.
