import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const dbs = [
    "src/node2-student/student.db",
    "src/node3-course/course.db",
    "src/node4-krs/krs.db",
    "src/node5-notification/notification.db"
];

const basePath = process.cwd();

console.log("Menghapus database lokal...");

for (const dbPath of dbs) {
    const fullPath = path.join(basePath, dbPath);

    const filesToDelete = [
        fullPath,
        `${fullPath}-shm`,
        `${fullPath}-wal`,
        `${fullPath}-journal`
    ];

    let deletedAny = false;
    for (const file of filesToDelete) {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            deletedAny = true;
        }
    }

    if (deletedAny) {
        console.log(`Terhapus: ${dbPath} (dan temporary filenya)`);
    } else {
        console.log(`Tidak ditemukan: ${dbPath}`);
    }
}

console.log("\nMenjalankan setup ulang database (npm run db:setup:all)...");
try {
    execSync("npm run db:setup:all", { stdio: "inherit" });
    console.log("\nSemua proses reset database berhasil!");
} catch (error) {
    console.error("\nGagal menjalankan setup database:", error);
    process.exit(1);
}
