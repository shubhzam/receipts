export function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// item names come from the checklist as snake case
export function itemLabel(item: string): string {
  return item.replaceAll("_", " ");
}
