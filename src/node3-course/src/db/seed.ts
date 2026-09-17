import { db } from ".";
import { courses } from "./schema";

async function seed() {
  console.log("Seeding....");

  try {
    db.insert(courses)
      .values([
        {
          kode: "IF101",
          nama: "Pemrograman Web",
          sks: 4,
          kuota: 40,
        },
        {
          kode: "IF102",
          nama: "Struktur Data",
          sks: 4,
          kuota: 35,
        },
        {
          kode: "IF103",
          nama: "Jaringan Komputer 2",
          sks: 3,
          kuota: 30,
        },
        {
          kode: "IF104",
          nama: "Sistem Terdistribusi",
          sks: 3,
          kuota: 60,
        },
      ])
      .run();
    console.log("Seeding success");
  } catch (err) {
    console.error("Seeding failed");
  }
}

seed();
