# Panduan Bedah Kode dan Alur Asistensi (Studi Kasus: Submit KRS)

Dokumentasi ini dibuat khusus untuk persiapan asistensi dan tanya-jawab kode, membedah alur eksekusi Submit KRS dari Node 1 (Client UI) hingga Node 4 (KRS Orchestrator), serta pemanggilan turunan ke Node 2, Node 3, dan Node 5.

---

## 1. PETA ALUR BESAR ASISTENSI (SUBMIT KRS)

```
[ FRONTEND NODE 1 ] (Vite / Browser)
   |  1. User klik 'Submit KRS' di UI
   |  2. Manggil submitKrs(nim, courseIds) -> [src/node1-client/src/rpc/krs.ts]
   |  3. Manggil callRpc() (CLIENT STUB) -> [src/node1-client/src/rpc/client.ts]
   |     |- Marshalling: Membungkus payload { jsonrpc: "2.0", method: "submitKrs", params: { nim, courseIds }, id }
   |
   |-> [ HTTP POST Request via Jaringan / Vite Proxy ]
   |   Target URL: http://localhost:3004/rpc (Node 4)
   |
[ BACKEND NODE 4 ] (KRS Orchestrator Server)
   |  4. Diterima Endpoint POST /rpc -> [src/node4-krs/src/routes/krs.route.ts]
   |  5. Masuk ke createJsonRpcRouter() (SERVER STUB) -> [src/utils/jsonrpc.util.ts]
   |     |- Unmarshalling: c.req.json() -> Ekstrak method & params
   |     |- Dispatching: Mencari methods["submitKrs"] -> Menjalankan submitKrsHandler
   |
   |-> 6. Eksekusi submitKrsHandler() -> [src/node4-krs/src/controllers/krs.controller.ts]
   |     |
   |     |-> Pemanggilan A (RPC Sync): Node 4 -> Node 2 (Student Server)
   |     |   - callJsonRpc("http://localhost:3002/rpc", "checkStudentStatus", { nim })
   |     |   - Bedah Paket: { jsonrpc: "2.0", method: "checkStudentStatus", params: { nim: "22001" }, id }
   |     |   - Server Stub Node 2 eksekusi -> Query DB student.db
   |     |
   |     |-> Pemanggilan B (RPC Sync): Node 4 -> Node 3 (Course Server)
   |     |   - callJsonRpc("http://localhost:3003/rpc", "checkQuota", { id: cid })
   |     |   - Bedah Paket: { jsonrpc: "2.0", method: "checkQuota", params: { id: 1 }, id }
   |     |   - Server Stub Node 3 eksekusi -> Query DB course.db
   |     |
   |     |-> Pemanggilan C (RMI OOP): Node 4 -> Node 5 (Schedule Server)
   |     |   - createRmiProxy<IScheduleRemoteService>("http://localhost:3005/rmi", "ScheduleService")
   |     |   - Memanggil: scheduleRemote.checkScheduleConflict(courseIds)
   |     |   - Client Stub RMI (ES6 Proxy) me-marshall payload RMI:
   |     |     { rmi: "1.0", service: "ScheduleService", method: "checkScheduleConflict", args: [[1, 2]], id }
   |     |   - Server Stub RMI Node 5 (createRmiRouter) lookup RmiRegistry -> Servant -> Eksekusi
   |     |
   |     |-> 7. Simpan Transaksi ke DB krs.db Lokal Node 4
   |
   |-> 8. Kirim JSON-RPC Success Response ke Client Node 1
```

---

## 2. ENDPOINT PER NODE (VERSI TERBARU)

Setiap node hanya memiliki satu jalur endpoint tunggal (tidak ada duplikasi route):

| Node | Port | Endpoint | Protokol |
| :--- | :--- | :--- | :--- |
| Node 2 (Student Server) | 3002 | `POST /rpc` | JSON-RPC 2.0 |
| Node 3 (Course Server) | 3003 | `POST /rpc` | JSON-RPC 2.0 |
| Node 4 (KRS Orchestrator) | 3004 | `POST /rpc` | JSON-RPC 2.0 |
| Node 5 (Schedule Server) | 3005 | `POST /rpc` | JSON-RPC 2.0 (legacy) |
| Node 5 (Schedule Server) | 3005 | `POST /rmi` | RMI 1.0 |

---

## 3. SISTEM LOGGING SERVER

Setiap request yang masuk ke server (Node 2-5) akan otomatis mencetak log lengkap ke terminal CLI. Logging ditangani secara terpusat di file utilitas:
- RPC Logging: `src/utils/jsonrpc.util.ts` (fungsi `logRpcRequest` dan `logRpcResponse`)
- RMI Logging: `src/utils/rmi.util.ts` (fungsi `logRmiRequest` dan `logRmiResponse`)

### Contoh Output Log RPC di Terminal Node 2 (Saat getAllStudents dipanggil):

```
========== [RPC] INCOMING REQUEST ==========
Timestamp   : 2026-10-03T14:30:00.123Z
HTTP Method : POST
URL         : http://localhost:3002/rpc
RPC Method  : getAllStudents
RPC ID      : 1727938500123
--- Headers ---
{
  "content-type": "application/json",
  "host": "localhost:3002",
  "connection": "keep-alive"
}
--- Request Body ---
{
  "jsonrpc": "2.0",
  "method": "getAllStudents",
  "params": {},
  "id": 1727938500123
}
--- Response (SUCCESS) ---
Status Code : 200
Duration    : 5ms
{
  "jsonrpc": "2.0",
  "result": [
    { "id": 1, "nim": "240411100000", "nama": "Budi", "status": "aktif" }
  ],
  "id": 1727938500123
}
========== [RPC] END ==========
```

### Contoh Output Log RMI di Terminal Node 5 (Saat checkScheduleConflict dipanggil):

```
========== [RMI] INCOMING REQUEST ==========
Timestamp   : 2026-10-03T14:30:01.456Z
HTTP Method : POST
URL         : http://localhost:3005/rmi
RMI Service : ScheduleService
RMI Method  : checkScheduleConflict
RMI ID      : 1727938500999
RMI Args    : [[1,2]]
--- Headers ---
{
  "content-type": "application/json",
  "host": "localhost:3005",
  "connection": "keep-alive"
}
--- Request Body ---
{
  "rmi": "1.0",
  "service": "ScheduleService",
  "method": "checkScheduleConflict",
  "args": [[1, 2]],
  "id": 1727938500999
}
--- Response (SUCCESS) ---
Status Code : 200
Duration    : 12ms
{
  "rmi": "1.0",
  "result": {
    "hasConflict": false,
    "conflicts": [],
    "schedules": []
  },
  "id": 1727938500999
}
========== [RMI] END ==========
```

### Data yang Dicatat di Setiap Log:

| Field | Keterangan |
| :--- | :--- |
| Timestamp | Waktu request diterima server (format ISO 8601) |
| HTTP Method | Selalu POST |
| URL | Alamat endpoint lengkap yang ditembak client |
| RPC/RMI Method | Nama method yang dipanggil (misal: "checkQuota", "checkScheduleConflict") |
| RPC/RMI ID | ID unik request dari client |
| Headers | Seluruh HTTP Headers yang dikirim client |
| Request Body | Payload JSON lengkap yang dikirim client |
| Response Status | SUCCESS atau ERROR |
| Status Code | HTTP Status Code balasan (200, 400, 404, 500) |
| Duration | Waktu eksekusi dalam milidetik |
| Response Body | Payload JSON lengkap yang dikembalikan server |

---

## 4. BEDAH RINCIAN KODE DAN PAKET DATA (STEP-BY-STEP)

### STEP 1: Inisiasi Panggilan di Node 1 Client (UI / Frontend)
File: [`src/node1-client/src/rpc/krs.ts`](file:///d:/semester%205/Sistem%20Terdistribusi/rpc-rmi/src/node1-client/src/rpc/krs.ts#L48-L56)

```typescript
// Line 48-56: Fungsi yang dipanggil saat user submit form KRS di UI
export async function submitKrs(
  nim: string,
  courseIds: number[],
): Promise<SubmitKrsResult> {
  return callRpc<SubmitKrsResult>(KRS_RPC_URL, "submitKrs", {
    nim,
    courseIds,
  });
}
```

---

### STEP 2: CLIENT STUB Beraksi (callRpc di Node 1)
File: [`src/node1-client/src/rpc/client.ts`](file:///d:/semester%205/Sistem%20Terdistribusi/rpc-rmi/src/node1-client/src/rpc/client.ts#L38-L63)

`callRpc` bertindak sebagai CLIENT STUB. Dia menerima parameter lokal (`nim`, `courseIds`) dan melakukan Marshalling membungkusnya menjadi paket JSON-RPC 2.0.

```typescript
// Line 44-53: Proses Marshalling Payload
const id = Date.now() + Math.floor(Math.random() * 1000);

const payload: JsonRpcRequest = {
  jsonrpc: "2.0",
  method: "submitKrs",
  params: { nim, courseIds },
  id,
};

// Line 56-63: Pengiriman Paket via HTTP POST ke Node 4
const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

BEDAH ISI PAKET (Package Data yang Dikirim dari Client 1 ke Node 4):
- URL Endpoint: `http://localhost:3004/rpc`
- HTTP Header: `Content-Type: application/json`
- HTTP Body (Teks String JSON):
  ```json
  {
    "jsonrpc": "2.0",
    "method": "submitKrs",
    "params": {
      "nim": "22001",
      "courseIds": [1, 2]
    },
    "id": 1727938500123
  }
  ```

---

### STEP 3: Menerima Paket di Route Node 4
File: [`src/node4-krs/src/routes/krs.route.ts`](file:///d:/semester%205/Sistem%20Terdistribusi/rpc-rmi/src/node4-krs/src/routes/krs.route.ts)

Node 4 menggunakan framework Hono untuk mendefinisikan satu endpoint tunggal HTTP POST `/rpc`.

```typescript
const rpcHandler = createJsonRpcRouter({
  submitKrs: submitKrsHandler,
  submitKRS: submitKrsHandler, // Alias
  getAllKrs: getAllKrsHandler,
  getKrsById: getKrsByIdHandler,
  getKrsByNim: getKrsByNimHandler,
});

krsRoute.post("/rpc", rpcHandler);
```

---

### STEP 4: SERVER STUB Beraksi (createJsonRpcRouter di Utils)
File: [`src/utils/jsonrpc.util.ts`](file:///d:/semester%205/Sistem%20Terdistribusi/rpc-rmi/src/utils/jsonrpc.util.ts)

`createJsonRpcRouter` bertindak sebagai SERVER STUB / DISPATCHER. Sekarang juga menjalankan logging lengkap.

```typescript
const startTime = Date.now();

// Unmarshalling (Membongkar Paket JSON Request)
let body = await c.req.json();
const { method, params, id } = body;

// Logging Request (Timestamp, Headers, Body)
logRpcRequest(c, body);

// Dispatching (Mencari handler di daftar methods)
const handler = methods[method];

// Eksekusi handler asli dengan menyalurkan params
const result = await handler(params || {}, id ?? null, c);

// Logging Response (Status, Duration, Body)
const successResp = createJsonRpcSuccess(id, result);
logRpcResponse(successResp, 200, Date.now() - startTime, false);
```

---

### STEP 5: Orkestrasi di Backend Controller (submitKrsHandler Node 4)
File: [`src/node4-krs/src/controllers/krs.controller.ts`](file:///d:/semester%205/Sistem%20Terdistribusi/rpc-rmi/src/node4-krs/src/controllers/krs.controller.ts#L44-L156)

Di dalam `submitKrsHandler`, Node 4 bertindak sebagai Orchestrator yang memanggil 3 node lainnya:

#### Sub-Proses 5.1: Cek Status Mahasiswa ke Node 2 (RPC)
```typescript
studentData = await callJsonRpc(
  SERVICE_URLS.student(), // "http://localhost:3002/rpc"
  "checkStudentStatus",
  { nim },
  { timeoutMs: 5000 }
);
```
Isi Paket Node 4 -> Node 2:
```json
{
  "jsonrpc": "2.0",
  "method": "checkStudentStatus",
  "params": { "nim": "22001" },
  "id": 1727938500456
}
```

#### Sub-Proses 5.2: Cek Kuota Mata Kuliah ke Node 3 (RPC)
```typescript
const course = await callJsonRpc(
  SERVICE_URLS.course(), // "http://localhost:3003/rpc"
  "checkQuota",
  { id: cid },
  { timeoutMs: 5000 }
);
```
Isi Paket Node 4 -> Node 3:
```json
{
  "jsonrpc": "2.0",
  "method": "checkQuota",
  "params": { "id": 1 },
  "id": 1727938500789
}
```

#### Sub-Proses 5.3: Cek Bentrok Jadwal ke Node 5 (RMI)
File: [`src/node4-krs/src/controllers/krs.controller.ts:L117-L124`](file:///d:/semester%205/Sistem%20Terdistribusi/rpc-rmi/src/node4-krs/src/controllers/krs.controller.ts#L117-L124)

```typescript
const scheduleRemote = createRmiProxy<IScheduleRemoteService>(
  SERVICE_URLS.scheduleRmi(), // "http://localhost:3005/rmi"
  "ScheduleService"
);

scheduleResult = await scheduleRemote.checkScheduleConflict(courseIds);
```
Isi Paket RMI Node 4 -> Node 5:
```json
{
  "rmi": "1.0",
  "service": "ScheduleService",
  "method": "checkScheduleConflict",
  "args": [ [1, 2] ],
  "id": 1727938500999
}
```

#### Sub-Proses 5.4: Penyimpanan Transaksi ke Database Lokal Node 4
```typescript
const newKrs = await createKrsService(nim, courseIds);
```

---

### STEP 6: Mengembalikan Balasan ke Node 1 UI (Response Flow)

Isi Paket Balasan Node 4 -> Node 1 UI:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "krs": { "id": 5, "nim": "22001" },
    "student": { "nim": "22001", "nama": "Budi", "status": "aktif" },
    "courses": [
      { "id": 1, "nama": "Pemrograman Terdistribusi", "kuota": 25 }
    ],
    "scheduleCheck": { "hasConflict": false, "conflicts": [] },
    "status": "KRS berhasil disimpan"
  },
  "id": 1727938500123
}
```

---

## 5. CHEAT SHEET PERTANYAAN DOSEN / ASISTEN DAN JAWABANNYA

| Pertanyaan Asistensi | Jawaban Singkat dan Lokasi Kode |
| :--- | :--- |
| Mana kode Client Stub di Node 1? | `callRpc()` di `src/node1-client/src/rpc/client.ts:L38`. Tugasnya mengemas `jsonrpc: "2.0"`, `method`, `params`, dan `id`. |
| Mana kode Server Stub di Node 4? | `createJsonRpcRouter()` di `src/utils/jsonrpc.util.ts`. Tugasnya mendekomposisi JSON request dan mencari handler di dictionary `methods`. |
| Apa beda paket RPC sama paket RMI waktu terbang di jaringan? | RPC: `{ jsonrpc: "2.0", method, params, id }` / RMI: `{ rmi: "1.0", service, method, args, id }` |
| Bagaimana RMI Client Stub di Node 4 bekerja tanpa sebut method string? | Memakai ES6 `Proxy` di `src/utils/rmi.util.ts`. Saat kita panggil `proxy.checkScheduleConflict()`, handler `get()` Proxy mencegat nama method tersebut secara otomatis. |
| Di mana registrasi objek RMI di Node 5? | Di `rmiRegistry.bind("ScheduleService", scheduleServant)` pada `src/node5-schedule/src/routes/schedule.route.ts:L19`. |
| Kenapa ada 2 route (/ dan /rpc)? | Sudah dihapus. Sekarang hanya ada 1 endpoint tunggal `/rpc` per node (dan `/rmi` untuk Node 5). |
| Gimana cara lihat log request di terminal? | Logging otomatis sudah ditambahkan di `jsonrpc.util.ts` dan `rmi.util.ts`. Setiap request masuk akan mencetak timestamp, headers, request body, response body, status code, dan duration ke terminal. |
