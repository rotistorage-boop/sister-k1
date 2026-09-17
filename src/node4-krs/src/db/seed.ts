import { db } from ".";
import { krs, krsDetails } from "./schema";

async function seed() {
  console.log("Seeding....");

  try {
    db.insert(krs)
      .values([
        {
          nim: "240411100000",
          status: "approved",
        },
        {
          nim: "240411100034",
          status: "pending",
        },
        {
          nim: "240411100021",
          status: "rejected",
        },
      ])
      .run();

    // 2. Seed data Detail KRS (menghubungkan krs_id dan course_id)
    db.insert(krsDetails)
      .values([
        {
          krsId: 1,
          courseId: 1,
        },
        {
          krsId: 1,
          courseId: 2,
        },
        {
          krsId: 2,
          courseId: 1,
        },
        {
          krsId: 3,
          courseId: 3,
        },
      ])
      .run();

    console.log("Seeding success");
  } catch (err) {
    console.error("Seeding failed", err);
  }
}

seed();
