import { db } from ".";
import { students } from "./schema";

async function seed() {
  console.log("seeding....");

  try {
    db.insert(students)
      .values([
        {
          nim: "240411100000",
          nama: "Budi Santoso",
          status: "aktif",
        },
        {
          nim: "240411100034",
          nama: "Wowok",
          status: "aktif",
        },
        {
          nim: "240411100021",
          nama: "Wiranto",
          status: "cuti",
        },
      ])
      .run();
  } catch (err) {
    console.error("Seeding failed");
  }
}

seed();
