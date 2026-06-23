import type { Config, Context } from "@netlify/functions";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getBilling, saveBilling } from "./_shared/googleSheets";
import { error, json } from "./_shared/http";
import type { Billing } from "./_shared/types";

type LineWebhookPayload = {
  events?: Array<{
    type?: string;
    replyToken?: string;
    message?: {
      type?: string;
      text?: string;
    };
    postback?: {
      data?: string;
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
    const result = await handleLineEvent(event);
    if (result) results.push(result);
  }

  return json({ ok: true, results });
};

export const config: Config = {
  path: "/api/line-webhook",
  method: ["POST"]
};

type WebhookEvent = NonNullable<LineWebhookPayload["events"]>[number];

async function handleLineEvent(event: WebhookEvent) {
  if (event.type === "message" && event.message?.type === "text" && event.message.text) {
    return handleTextMessage(event.message.text);
  }

  if (event.type === "postback" && event.postback?.data) {
    return handlePostback(event.postback.data, event.replyToken);
  }

  return null;
}

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

async function handlePostback(data: string, replyToken?: string) {
  const params = new URLSearchParams(data);
  const billingId = params.get("billingId")?.toUpperCase();
  const action = params.get("action") || "comment";
  if (!billingId) return null;

  const billing = await getBilling(billingId);
  if (!billing) return { billingId, action, ok: false, error: "ไม่พบรายการวางบิล" };

  const text = createPostbackComment(action, billingId);
  const updated = updateBillingFromCustomerMessage(billing, text, action);
  await saveBilling(updated);

  if (replyToken) await replyToCustomer(replyToken, createPostbackReply(action, billingId));

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

function createPostbackComment(action: string, billingId: string) {
  if (action === "payment") return `แจ้งชำระเงิน ${billingId}`;
  if (action === "issue") return `สอบถามเรื่องบิล ${billingId}`;
  return `ข้อความจากลูกค้า ${billingId}`;
}

function createPostbackReply(action: string, billingId: string) {
  if (action === "payment") {
    return `รับแจ้งชำระเงินสำหรับบิล ${billingId} แล้วค่ะ หากมีสลิปหรือรายละเอียดเพิ่มเติม สามารถส่งต่อในแชทนี้ได้เลยค่ะ`;
  }

  if (action === "issue") {
    return `รับเรื่องสอบถามสำหรับบิล ${billingId} แล้วค่ะ สามารถพิมพ์รายละเอียดเพิ่มเติมต่อในแชทนี้ได้เลยค่ะ`;
  }

  return `รับข้อความสำหรับบิล ${billingId} แล้วค่ะ`;
}

async function replyToCustomer(replyToken: string, text: string) {
  const token = Netlify.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token) return;

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    console.warn(`ตอบกลับ LINE ไม่สำเร็จ: ${body}`);
  }
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
