import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import dotenv from "dotenv";

const rl = readline.createInterface({ input, output });
const STUDENT_SERVICE_URL = process.env.STUDENT_SERVICE_URL as string;

async function main() {
  while (true) {
    console.log("\n==============================");
    console.log("   NODE 1: STUDENT CLIENT     ");
    console.log("==============================");
    console.log("1. Lihat Semua Mahasiswa (RPC)");
    console.log("2. Cari Mahasiswa by NIM (RPC)");
    console.log("3. Cek Status Mahasiswa (RPC)");
    console.log("4. Keluar");

    const choice = await rl.question("\nPilih menu (1-4): ");
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
      console.log("Keluar dari client. Bye!");
      rl.close();
      process.exit(0);
    } else {
      console.log("Pilihan tidak valid! Masukkan angka 1 sampai 4.");
    }
  }
}

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

main();
