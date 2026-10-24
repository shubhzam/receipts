// INCRBY returns the last slot taken, so this participant owns slots end-k+1..end
export function pickCaseIds(sortedCaseIds: string[], endSlot: number, count: number): string[] {
  const start = endSlot - count;
  return Array.from({ length: count }, (_, i) => sortedCaseIds[(start + i) % sortedCaseIds.length]!);
}
