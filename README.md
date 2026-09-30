# Sistem Akademik Terdistribusi - Multi-Node Microservices (Hybrid RPC & RMI)

Project ini merupakan implementasi Sistem Terdistribusi berbasis arsitektur **Hybrid RPC (*Remote Procedure Call*) & RMI (*Remote Method Invocation*)**, dibangun menggunakan TypeScript, Hono, Drizzle ORM, dan SQLite yang terdiri dari 5 node independen.

---

## 🏛️ Paradigma Komunikasi Antar-Node

1. **Node 2 (Student), Node 3 (Course), Node 4 (KRS Orchestrator):** Menggunakan protokol **JSON-RPC 2.0** (`id`, `method`, `params`, `result`).
2. **Node 5 (Schedule Server):** Menggunakan konsep **RMI (Remote Method Invocation)** dengan *Remote Object*, *RMI Registry*, dan dynamic *Client Stub Proxy*.
3. **Node 4 (KRS Orchestrator):** Memvalidasi pendaftaran KRS dengan memanggil Node 2 & 3 via JSON-RPC, serta memanggil Node 5 via RMI Stub Proxy.
4. **Node 1 (Client):** Menyediakan Web UI dan CLI yang dapat berinteraksi dengan layanan RPC maupun RMI.

---

## 1. Requirements

Pastikan environment berikut telah terinstall:
- Node.js 20.x atau 22.x
- npm / pnpm
- TypeScript (dijalankan via tsx)
- SQLite (via better-sqlite3 dan drizzle-orm)

---

## 2. Cara Menjalankan (How to Run)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup Database dan Migration (Node 2 hingga Node 5)
Setiap Node Service mengelola database SQLite masing-masing:

```bash
# Setup semua database sekaligus (Rekomendasi)
npm run db:setup:all
```

Atau setup per-node secara manual:
```bash
npm run db:setup2
npm run db:setup3
npm run db:setup4
npm run db:setup5
```

### Step 3: Menjalankan Node Service

Jalankan seluruh node secara bersamaan:
```bash
npm run start:all
```

Atau jalankan per terminal:
```bash
# Terminal 1: Node 1 Client Web UI (Vite dev server di http://localhost:5173)
npm run node1

# Atau Terminal 1 Alternative: Node 1 Interactive CLI Client
npm run node1:cli

# Terminal 2: Node 2 Student Server (:3002 - RPC)
npm run node2

# Terminal 3: Node 3 Course Server (:3003 - RPC)
npm run node3

# Terminal 4: Node 4 KRS Server (:3004 - RPC + RMI Client)
npm run node4

# Terminal 5: Node 5 Schedule Server (:3005 - RMI Registry & Remote Object)
npm run node5
```

---

## 3. Menjalankan Automated Tests

Untuk memvalidasi pemanggilan RPC dan RMI:
```bash
# Jalankan seluruh test suite
npm run test

# Atau jalankan test spesifik per node
npm run test2
npm run test3
npm run test4
npm run test5
```

---

## 4. Dokumentasi dan Panduan
* [CONCEPT.md](CONCEPT.md): Penjelasan rinci arsitektur hybrid, diagram sekuensial submit KRS, dan komparasi RPC vs RMI.
* [RULE.md](RULE.md): Konfigurasi environment variabel per node.
* [CONTRIBUTING.md](CONTRIBUTING.md): Batasan isolasi tugas per node dalam tim.
