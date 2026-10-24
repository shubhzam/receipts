import type { AgentEventView } from "@receipts/shared";
import { prisma } from "../db.js";

// reasoning is plain sentences only, no tokens, no secrets, no card data
export async function recordEvent(orderId: string | null, step: string, reasoning: string): Promise<void> {
  await prisma.agentEvent.create({ data: { orderId, step, reasoning } });
}

export async function latestEvents(limit: number): Promise<AgentEventView[]> {
  const rows = await prisma.agentEvent.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((row) => ({
    id: row.id,
    orderId: row.orderId ? row.orderId.slice(-8) : null,
    step: row.step,
    reasoning: row.reasoning,
    createdAt: row.createdAt.toISOString(),
  }));
}
