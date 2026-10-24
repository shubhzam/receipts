// shape of a real sandbox payment.succeeded body, trimmed to the fields we read, ids and values are made up
export const realPaymentSucceeded = {
  id: "msg_TESTTESTTESTTESTTESTTEST",
  api_version: "v1",
  type: "payment.succeeded",
  company_id: "biz_TESTTESTTESTTE",
  data: {
    id: "pay_TESTTESTTESTTE",
    status: "paid",
    substatus: "succeeded",
    currency: "usd",
    total: 29.0,
    subtotal: 29.0,
    usd_total: 29.0,
    amount_after_fees: 27.18,
    tax_amount: 0.0,
    metadata: { orderId: "01a16f8f-0000-7000-8000-000000000001" },
    checkout_configuration_id: "ch_TESTTESTTESTTES",
    plan: { id: "plan_TESTTESTTESTT", metadata: {} },
    company: { id: "biz_TESTTESTTESTTE" },
  },
};
