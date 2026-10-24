import {
  checkoutResponseSchema,
  createOrderResponseSchema,
  errorResponseSchema,
  eventsResponseSchema,
  orderResponseSchema,
  type CheckoutResponse,
  type CreateOrderResponse,
  type EventsResponse,
  type OrderResponse,
} from "@receipts/shared";
import { apiFetch } from "@/api";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function parse<T>(res: Response, schema: { parse: (body: unknown) => T }): Promise<T> {
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = errorResponseSchema.safeParse(body);
    throw new ApiError(res.status, parsed.success ? parsed.data.error.message : "something went wrong, please try again");
  }
  return schema.parse(body);
}

const jsonHeaders = { "Content-Type": "application/json" };

export async function createOrder(intake: unknown): Promise<CreateOrderResponse> {
  const res = await apiFetch("/orders", { method: "POST", headers: jsonHeaders, body: JSON.stringify(intake) });
  return parse(res, createOrderResponseSchema);
}

export async function fetchOrder(token: string): Promise<OrderResponse> {
  const res = await apiFetch(`/orders/${encodeURIComponent(token)}`, { cache: "no-store" });
  return parse(res, orderResponseSchema);
}

export async function startCheckout(token: string): Promise<CheckoutResponse> {
  const res = await apiFetch(`/orders/${encodeURIComponent(token)}/checkout`, { method: "POST" });
  return parse(res, checkoutResponseSchema);
}

export async function fetchEvents(): Promise<EventsResponse> {
  const res = await apiFetch("/events?limit=50", { cache: "no-store" });
  return parse(res, eventsResponseSchema);
}
