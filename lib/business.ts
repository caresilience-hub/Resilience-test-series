export function calculateEligibility(totalMarksAttempted: number, deadlinesMet: boolean, sincereAttempt: boolean) {
  const meetsMarkThreshold = totalMarksAttempted >= 80;
  const eligible = meetsMarkThreshold && deadlinesMet && sincereAttempt;
  const progress = Math.min(100, Math.round((totalMarksAttempted / 80) * 100));

  return {
    eligible,
    progress,
    meetsMarkThreshold
  };
}

export function addDays(start: Date, days: number) {
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

export function clampTimeline(days: number) {
  return Math.min(30, Math.max(10, days));
}

