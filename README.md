# Sistem Akademik Terdistribusi - Multi-Node Microservices (JSON-RPC 2.0)

Project ini merupakan implementasi Sistem Terdistribusi berbasis protokol **JSON-RPC 2.0**, TypeScript, Hono, Drizzle ORM, dan SQLite yang terdiri dari 5 node independen.

Sistem menerapkan **RPC (Remote Procedure Call):** Komunikasi sinkron antar-node dengan payload standar JSON-RPC 2.0 (`id`, `method`, `params`, `result`).

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
# Terminal 1: Node 1 Client CLI (JSON-RPC Client)
npm run node1

# Terminal 2: Node 2 Student Server (:3002)
npm run node2

# Terminal 3: Node 3 Course Server (:3003)
npm run node3

# Terminal 4: Node 4 KRS Server (:3004)
npm run node4

# Terminal 5: Node 5 Schedule Server (:3005)
npm run node5
```

---

## 3. Menjalankan Automated Tests

Untuk memvalidasi pemanggilan RPC antar-node:
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
* [CONCEPT.md](CONCEPT.md): Penjelasan rinci arsitektur, spesifikasi JSON-RPC 2.0, dan alur submit KRS.
* [RULE.md](RULE.md): Konfigurasi environment variabel per node.
* [CONTRIBUTING.md](CONTRIBUTING.md): Batasan isolasi tugas per node dalam tim.
