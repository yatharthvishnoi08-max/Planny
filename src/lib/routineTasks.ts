import type { Routine, RoutineInstance } from "../types/database";
import { localDate, routineOccursOn } from "./dates";

export function routineItemsForDate(
  routines: Routine[],
  instances: RoutineInstance[],
  date = new Date(),
) {
  const day = localDate(date);
  return routines
    .filter((routine) => routineOccursOn(routine, date))
    .map((routine) => {
      const instance = instances.find(
        (item) => item.routine_id === routine.id && item.date === day,
      );
      return {
        routine,
        instance,
        completed: instance?.status === "completed",
      };
    });
}
