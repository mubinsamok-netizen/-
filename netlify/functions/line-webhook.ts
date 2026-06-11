import type { Config, Context } from "@netlify/functions";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getBilling, saveBilling } from "./_shared/googleSheets";
import { error, json } from "./_shared/http";
import type { Billing } from "./_shared/types";

type LineWebhookPayload = {
  events?: Array<{
    type?: string;
    message?: {
      type?: string;
      text?: string;
    };
  }>;
};

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return error("Method not allowed", 405);

  const body = await req.text();
  const channelSecret = Netlify.env.get("LINE_CHANNEL_SECRET");
  if (channelSecret) {
    const signature = req.headers.get("x-line-signature") || "";
    if (!verifySignature(body, channelSecret, signature)) {
      return error("LINE signature ไม่ถูกต้อง", 401);
    }
  }

  const payload = JSON.parse(body) as LineWebhookPayload;
  const results: Array<{ billingId?: string; action?: string; ok: boolean; error?: string }> = [];

  for (const event of payload.events ?? []) {
    if (event.type !== "message" || event.message?.type !== "text" || !event.message.text) continue;
    const result = await handleTextMessage(event.message.text);
    if (result) results.push(result);
  }

  return json({ ok: true, results });
};

export const config: Config = {
  path: "/api/line-webhook",
  method: ["POST"]
};

async function handleTextMessage(text: string) {
  const billingId = extractBillingId(text);
  if (!billingId) return null;

  const billing = await getBilling(billingId);
  if (!billing) return { billingId, ok: false, error: "ไม่พบรายการวางบิล" };

  const action = detectCustomerAction(text);
  const updated = updateBillingFromCustomerMessage(billing, text, action);
  await saveBilling(updated);

  return { billingId, action, ok: true };
}

function updateBillingFromCustomerMessage(billing: Billing, text: string, action: string): Billing {
  const now = new Date().toISOString();
  const base = {
    ...billing,
    customerComment: appendCustomerComment(billing.customerComment, text, now),
    customerCommentAt: now
  };

  if (action === "payment") {
    return { ...base, status: "รอตรวจสอบการชำระ" };
  }

  if (action === "issue") {
    return { ...base, status: "รอส่งมอบงาน" };
  }

  return base;
}

function detectCustomerAction(text: string) {
  if (text.includes("แจ้งชำระเงิน")) return "payment";
  if (text.includes("สอบถามเรื่องบิล") || text.includes("แจ้งปัญหา") || text.includes("ยังไม่เสร็จ") || text.includes("งานไม่เสร็จ")) {
    return "issue";
  }
  return "comment";
}

function extractBillingId(text: string) {
  return text.match(/BILL[-A-Z0-9]+/i)?.[0]?.toUpperCase();
}

function appendCustomerComment(current: string | undefined, text: string, isoDate: string) {
  const line = `[${formatBangkokDateTime(isoDate)}] ${text.trim()}`;
  return current ? `${current}\n${line}` : line;
}

function formatBangkokDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function verifySignature(body: string, secret: string, signature: string) {
  const digest = createHmac("sha256", secret).update(body).digest("base64");
  const expected = Buffer.from(digest);
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
