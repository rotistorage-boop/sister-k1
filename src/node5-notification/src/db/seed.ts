import { db } from ".";
import { notifications } from "./schema";

async function seed() {
  console.log("Seeding notifications....");
  try {
    db.insert(notifications)
      .values([
        {
          nim: "240411100000",
          message: "KRS berhasil diajukan",
          status: "sent",
        },
      ])
      .run();
    console.log("Seeding success");
  } catch (err) {
    console.error("Seeding failed", err);
  }
}

seed();
