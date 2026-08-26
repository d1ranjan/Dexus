export type PersonWithId = { id: number; name: string };
export type FollowupWithPerson = { personId: number; status: "open" | "completed" | "snoozed" };

export function countOpenFollowups(followups: FollowupWithPerson[]) {
  return followups.reduce<Record<number, number>>((counts, followup) => {
    if (followup.status === "open") counts[followup.personId] = (counts[followup.personId] ?? 0) + 1;
    return counts;
  }, {});
}

export function sortPeopleByOpenFollowups<T extends PersonWithId>(people: T[], followups: FollowupWithPerson[]) {
  const counts = countOpenFollowups(followups);
  return [...people].sort((left, right) => {
    const byOpenFollowups = (counts[right.id] ?? 0) - (counts[left.id] ?? 0);
    return byOpenFollowups || left.name.localeCompare(right.name);
  });
}
