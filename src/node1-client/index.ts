import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import dotenv from "dotenv";

dotenv.config();

const rl = readline.createInterface({ input, output });

const STUDENT_SERVICE_URL = process.env.STUDENT_SERVICE_URL as string;
const COURSE_SERVICE_URL = process.env.COURSE_SERVICE_URL as string;
const KRS_SERVICE_URL = process.env.KRS_SERVICE_URL;
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL;

async function main() {
  while (true) {
    console.log("\n==========================================");
    console.log("   NODE 1: STUDENT CLIENT (TEST SUITE)    ");
    console.log("==========================================");
    console.log("--- NODE 2: STUDENT SERVER ---");
    console.log("1. Lihat Semua Mahasiswa");
    console.log("2. Cari Mahasiswa by NIM");
    console.log("3. Cek Status Mahasiswa by NIM");
    console.log("4. Tambah Mahasiswa Baru");
    console.log("\n--- NODE 3: COURSE SERVER ---");
    console.log("5. Lihat Semua Mata Kuliah");
    console.log("6. Cari Mata Kuliah by Kode/ID");
    console.log("\n--- NODE 4: KRS SERVER (ORKESTRATOR) ---");
    console.log(
      "7. Submit KRS Mahasiswa (Tes Validasi RPC Node 2+3 & Notifikasi AMI Node 5)",
    );
    console.log("8. Cari KRS Mahasiswa by NIM");
    console.log("9. Lihat Detail KRS by ID");
    console.log("\n--- NODE 5: NOTIFICATION SERVER ---");
    console.log("10. Lihat Notifikasi Mahasiswa by NIM");
    console.log("11. Keluar");

    const choice = await rl.question("\nPilih menu (1-11): ");
    const trimmedChoice = choice.trim();

    if (trimmedChoice === "1") {
      await getAllStudents();
    } else if (trimmedChoice === "2") {
      const nim = await rl.question("Masukkan NIM: ");
      await getStudentByNim(nim.trim());
    } else if (trimmedChoice === "3") {
      const nim = await rl.question("Masukkan NIM untuk cek status: ");
      await checkStudentStatus(nim.trim());
    } else if (trimmedChoice === "4") {
      const nim = await rl.question("Masukkan NIM Baru: ");
      const nama = await rl.question("Masukkan Nama Mahasiswa: ");
      const statusInput = await rl.question(
        "Masukkan Status (default: aktif): ",
      );
      const status = statusInput.trim() || "aktif";
      await createStudent(nim.trim(), nama.trim(), status);
    } else if (trimmedChoice === "5") {
      await getAllCourses();
    } else if (trimmedChoice === "6") {
      const query = await rl.question("Masukkan Kode atau ID Matkul: ");
      await getCourseByQuery(query.trim());
    } else if (trimmedChoice === "7") {
      const nim = await rl.question("Masukkan NIM Mahasiswa: ");
      const courseIdsInput = await rl.question(
        "Masukkan ID Mata Kuliah (pisahkan koma, contoh: 1,2): ",
      );
      const courseIds = courseIdsInput
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n));
      await submitKrs(nim.trim(), courseIds);
    } else if (trimmedChoice === "8") {
      const nim = await rl.question("Masukkan NIM untuk cari KRS: ");
      await getKrsByNim(nim.trim());
    } else if (trimmedChoice === "9") {
      const id = await rl.question("Masukkan ID KRS: ");
      await getKrsById(id.trim());
    } else if (trimmedChoice === "10") {
      const nim = await rl.question("Masukkan NIM untuk cek notifikasi: ");
      await getNotifications(nim.trim());
    } else if (trimmedChoice === "11") {
      console.log("Keluar dari client. Sampai jumpa!");
      rl.close();
      process.exit(0);
    } else {
      console.log("Pilihan tidak valid! Masukkan angka 1 sampai 11.");
    }
  }
}

// === FUNCTIONS NODE 2 ===
async function getAllStudents() {
  try {
    console.log(`\nMengirim RPC GET ke ${STUDENT_SERVICE_URL}...`);
    const res = await fetch(STUDENT_SERVICE_URL);
    const data = await res.json();
    console.log("Response dari Node 2:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Gagal terhubung ke Node 2:", err.message);
  }
}

async function getStudentByNim(nim: string) {
  try {
    console.log(`\nMengirim RPC GET ke ${STUDENT_SERVICE_URL}/${nim}...`);
    const res = await fetch(`${STUDENT_SERVICE_URL}/${nim}`);
    const data = await res.json();
    console.log("Response dari Node 2:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Gagal terhubung ke Node 2:", err.message);
  }
}

async function checkStudentStatus(nim: string) {
  try {
    console.log(
      `\nMengirim RPC GET ke ${STUDENT_SERVICE_URL}/${nim}/status...`,
    );
    const res = await fetch(`${STUDENT_SERVICE_URL}/${nim}/status`);
    const data = await res.json();
    console.log("Response dari Node 2:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Gagal terhubung ke Node 2:", err.message);
  }
}

async function createStudent(nim: string, nama: string, status: string) {
  try {
    console.log(`\nMengirim RPC POST ke ${STUDENT_SERVICE_URL}...`);
    const res = await fetch(STUDENT_SERVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nim, nama, status }),
    });
    const data = await res.json();
    console.log("Response dari Node 2:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Gagal terhubung ke Node 2:", err.message);
  }
}

// === FUNCTIONS NODE 3 ===
async function getAllCourses() {
  try {
    console.log(`\nMengirim RPC GET ke ${COURSE_SERVICE_URL}...`);
    const res = await fetch(COURSE_SERVICE_URL);
    const data = await res.json();
    console.log("Response dari Node 3:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Gagal terhubung ke Node 3:", err.message);
  }
}

async function getCourseByQuery(query: string) {
  try {
    const isId = !isNaN(Number(query));
    const url = isId
      ? `${COURSE_SERVICE_URL}/id/${query}`
      : `${COURSE_SERVICE_URL}/${query}`;
    console.log(`\nMengirim RPC GET ke ${url}...`);
    const res = await fetch(url);
    const data = await res.json();
    console.log("Response dari Node 3:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Gagal terhubung ke Node 3:", err.message);
  }
}

// === FUNCTIONS NODE 4 ===
async function submitKrs(nim: string, courseIds: number[]) {
  try {
    console.log(`\nMengirim RPC POST ke ${KRS_SERVICE_URL}/submit...`);
    const res = await fetch(`${KRS_SERVICE_URL}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nim, courseIds }),
    });
    const data = await res.json();
    console.log("Response dari Node 4:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Gagal terhubung ke Node 4:", err.message);
  }
}

async function getKrsByNim(nim: string) {
  try {
    console.log(`\nMengirim RPC GET ke ${KRS_SERVICE_URL}/student/${nim}...`);
    const res = await fetch(`${KRS_SERVICE_URL}/student/${nim}`);
    const data = await res.json();
    console.log("Response dari Node 4:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Gagal terhubung ke Node 4:", err.message);
  }
}

async function getKrsById(id: string) {
  try {
    console.log(`\nMengirim RPC GET ke ${KRS_SERVICE_URL}/${id}...`);
    const res = await fetch(`${KRS_SERVICE_URL}/${id}`);
    const data = await res.json();
    console.log("Response dari Node 4:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Gagal terhubung ke Node 4:", err.message);
  }
}

// === FUNCTIONS NODE 5 ===
async function getNotifications(nim: string) {
  try {
    console.log(`\nMengirim RPC GET ke ${NOTIFICATION_SERVICE_URL}/${nim}...`);
    const res = await fetch(`${NOTIFICATION_SERVICE_URL}/${nim}`);
    const data = await res.json();
    console.log("Response dari Node 5:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Gagal terhubung ke Node 5:", err.message);
  }
}

main();
