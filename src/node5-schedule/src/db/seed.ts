import { db } from ".";
import { schedules } from "./schema";

async function seed() {
  console.log("Seeding schedules....");

  try {
    db.insert(schedules)
      .values([
        {
          courseId: 1,
          day: "Senin",
          startTime: "08:00",
          endTime: "10:30",
          room: "Lab A1",
        },
        {
          courseId: 2,
          day: "Selasa",
          startTime: "10:00",
          endTime: "12:30",
          room: "Lab B2",
        },
        {
          courseId: 3,
          day: "Rabu",
          startTime: "13:00",
          endTime: "15:30",
          room: "R.301",
        },
        {
          courseId: 4,
          day: "Kamis",
          startTime: "08:00",
          endTime: "10:30",
          room: "R.202",
        },
      ])
      .run();

    console.log("Seeding success");
  } catch (err) {
    console.error("Seeding failed", err);
  }
}

seed();
