# Sistem Akademik Terdistribusi - Multi-Node Microservices

Project ini merupakan simulasi Sistem Terdistribusi berbasis Hono, TypeScript, Drizzle ORM, dan SQLite yang terdiri dari 5 node independen.

---

## 1. Requirements

Sebelum menjalankan aplikasi, pastikan environment berikut telah terinstall di sistem Anda:

* Node.js (v18.0.0 atau lebih baru)
* npm atau pnpm
* TypeScript (dijalankan via tsx)
* SQLite (via better-sqlite3 dan drizzle-orm)

---

## 2. Cara Menjalankan (How to Run)

### Step 1: Install Dependencies

Jalankan perintah berikut di root project:

```bash
npm install
```

### Step 2: Setup Database & Migration (Node 2 hingga Node 5)

Setiap Node Service (Node 2 - Node 5) menggunakan database SQLite terpisah. Sebelum menjalankan server, database harus di-migrate dan di-seed.

Setup semua database sekaligus (Rekomendasi):

```bash
npm run db:setup:all
```

Atau setup per-node secara terpisah:

```bash
# Setup Node 2 (Student)
npm run db:setup2

# Setup Node 3 (Course)
npm run db:setup3

# Setup Node 4 (KRS)
npm run db:setup4

# Setup Node 5 (Notification)
npm run db:setup5
```

### Step 3: Menjalankan Node Service

Menjalankan seluruh node secara bersamaan:

```bash
npm run start:all
```

Atau menjalankan node secara individu di terminal terpisah:

```bash
# Terminal 1: Node 1 Client CLI
npm run node1

# Terminal 2: Node 2 Student Server
npm run node2

# Terminal 3: Node 3 Course Server
npm run node3

# Terminal 4: Node 4 KRS Server
npm run node4

# Terminal 5: Node 5 Notification Server
npm run node5
```

---

## 3. Daftar Script (package.json)

```json
"scripts": {
  "node1": "tsx src/node1-client/index.ts",
  "node2": "cd src/node2-student && tsx src/index.ts",
  "migrate:node2": "cd src/node2-student && npx drizzle-kit push",
  "seed:node2": "cd src/node2-student && tsx src/db/seed.ts",
  "db:setup2": "npm run migrate:node2 && npm run seed:node2",
  "node3": "cd src/node3-course && tsx src/index.ts",
  "migrate:node3": "cd src/node3-course && npx drizzle-kit push",
  "seed:node3": "cd src/node3-course && tsx src/db/seed.ts",
  "db:setup3": "npm run migrate:node3 && npm run seed:node3",
  "node4": "cd src/node4-krs && tsx src/index.ts",
  "migrate:node4": "cd src/node4-krs && npx drizzle-kit push",
  "seed:node4": "cd src/node4-krs && tsx src/db/seed.ts",
  "db:setup4": "npm run migrate:node4 && npm run seed:node4",
  "node5": "cd src/node5-notification && tsx src/index.ts",
  "migrate:node5": "cd src/node5-notification && npx drizzle-kit push",
  "seed:node5": "cd src/node5-notification && tsx src/db/seed.ts",
  "db:setup5": "npm run migrate:node5 && npm run seed:node5",
  "db:setup:all": "npm run db:setup2 && npm run db:setup3 && npm run db:setup4 && npm run db:setup5",
  "start:all": "npx concurrently \"npm run node1\" \"npm run node2\" \"npm run node3\" \"npm run node4\" \"npm run node5\""
}
```

---

## 4. Aturan Kontribusi

Lihat file CONTRIBUTE.md untuk aturan lengkap kontribusi dan isolasi tugas per node.
