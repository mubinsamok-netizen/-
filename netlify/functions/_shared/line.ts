import type { Billing } from "./types";

type FlexMessage = { type: "flex"; altText: string; contents: Record<string, unknown> };
type StickerMessage = { type: "sticker"; packageId: string; stickerId: string };
type LineMessage = FlexMessage | StickerMessage;
type MessageKind = "invoice" | "reminder" | "paid";

type Theme = {
  title: string;
  badge: string;
  status: string;
  note: string;
  cardBg: string;
  amountColor: string;
  heroTone: HeroTone;
};

type HeroTone = "invoice" | "reminder" | "overdue" | "paid";

const defaultHeroImages: Record<HeroTone, string> = {
  invoice: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1040&q=80",
  reminder: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1040&q=80",
  overdue: "https://images.unsplash.com/photo-1673190889421-c02cccd99e2f?auto=format&fit=crop&w=1040&q=80",
  paid: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1040&q=80"
};

export async function pushBillingMessage(billing: Billing, kind: MessageKind) {
  const token = Netlify.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token) {
    throw new Error("ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN");
  }
  if (!billing.lineUserId) {
    throw new Error("รายการนี้ยังไม่มี LINE userId หรือ groupId");
  }

  const overdue = kind === "reminder" && isOverdue(billing.dueDate);
  const messages: LineMessage[] = [createFlexMessage(billing, kind, overdue)];
  const sticker = createOptionalStickerMessage();
  if (sticker) messages.push(sticker);

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({ to: billing.lineUserId, messages })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ส่ง LINE ไม่สำเร็จ: ${body}`);
  }
}

export function createFlexMessage(billing: Billing, kind: MessageKind = "invoice", overdue = false): FlexMessage {
  const theme = getTheme(kind, overdue);
  const heroImage = getHeroImage(theme.heroTone);
  const footerButtons = createFooterButtons(billing, kind);
  const detailRows = [
    ...(kind === "paid" ? [] : [createDetailRow("ครบกำหนด", formatThaiDateShort(billing.dueDate))]),
    createDetailRow("สถานะ", theme.status)
  ];

  return {
    type: "flex",
    altText: `${theme.title} ${billing.customerName} ${formatAmount(billing.amount)} บาท`,
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: theme.cardBg,
        paddingAll: "0px",
        spacing: "none",
        contents: [
          {
            type: "box",
            layout: "vertical",
            position: "relative",
            contents: [
              {
                type: "image",
                url: heroImage,
                size: "full",
                aspectRatio: "20:13",
                aspectMode: "cover"
              },
              createImageBadge(theme.badge)
            ]
          },
          {
            type: "box",
            layout: "vertical",
            paddingAll: "20px",
            paddingTop: "18px",
            spacing: "lg",
            contents: [
              {
                type: "box",
                layout: "vertical",
                spacing: "xs",
                contents: [
                  { type: "text", text: theme.title, size: "xl", weight: "bold", color: "#FFFFFF", wrap: true },
                  { type: "text", text: "PMC CONNEXT | ฝ่ายบัญชี", size: "xs", color: "#B8C7D6", wrap: true }
                ]
              },
              { type: "text", text: billing.customerName, size: "lg", weight: "bold", color: "#FFFFFF", wrap: true, margin: "xs" },
              {
                type: "box",
                layout: "vertical",
                paddingAll: "16px",
                cornerRadius: "12px",
                backgroundColor: "#FFFFFF",
                spacing: "sm",
                contents: [
                  { type: "text", text: "ยอดชำระ", size: "xs", color: "#6B7B8C" },
                  { type: "text", text: `${formatAmount(billing.amount)} บาท`, size: "xxl", weight: "bold", color: theme.amountColor, wrap: true },
                  { type: "separator", margin: "md" },
                  ...detailRows
                ]
              },
              { type: "text", text: theme.note, size: "xs", color: "#D8E3EE", wrap: true, lineSpacing: "5px", margin: "xs" }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        backgroundColor: theme.cardBg,
        paddingAll: "20px",
        paddingTop: "0px",
        spacing: "md",
        contents: footerButtons
      }
    }
  };
}

function createFooterButtons(billing: Billing, kind: MessageKind) {
  const documentButton = {
    type: "button",
    style: "primary",
    height: "sm",
    color: "#28B99A",
    action: {
      type: "uri",
      label: kind === "paid" ? "ดูเอกสาร" : "เปิดเอกสาร",
      uri: billing.pdfUrl || "https://line.me"
    }
  };

  if (kind === "paid") return [documentButton];

  return [
    documentButton,
    {
      type: "button",
      style: "secondary",
      height: "sm",
      action: {
        type: "postback",
        label: "แจ้งชำระเงิน",
        data: `action=payment&billingId=${billing.id}`,
        inputOption: "openKeyboard",
        fillInText: `แจ้งชำระเงิน ${billing.id} `
      }
    },
    {
      type: "button",
      style: "secondary",
      height: "sm",
      action: {
        type: "postback",
        label: "สอบถาม/แจ้งปัญหา",
        data: `action=issue&billingId=${billing.id}`,
        inputOption: "openKeyboard",
        fillInText: `สอบถามเรื่องบิล ${billing.id} `
      }
    }
  ];
}

function getTheme(kind: MessageKind, overdue: boolean): Theme {
  if (kind === "paid") {
    return {
      title: "รับแจ้งชำระเงินแล้ว",
      badge: "PAID",
      status: "ชำระแล้ว",
      note: "ฝ่ายบัญชีได้รับแจ้งการชำระเงินเรียบร้อยแล้วค่ะ ขอบคุณมากค่ะ",
      cardBg: "#223B35",
      amountColor: "#0F8F75",
      heroTone: "paid"
    };
  }

  if (kind === "invoice") {
    return {
      title: "แจ้งใบวางบิล",
      badge: "NEW",
      status: "รอชำระ",
      note: "เปิดเอกสารเพื่อตรวจสอบรายละเอียดได้เลยค่ะ หากต้องการแจ้งชำระเงินหรือสอบถามเพิ่มเติม กดปุ่มด้านล่างได้เลยค่ะ",
      cardBg: "#263447",
      amountColor: "#0F8F75",
      heroTone: "invoice"
    };
  }

  if (overdue) {
    return {
      title: "ติดตามยอดวางบิล",
      badge: "OVERDUE",
      status: "เลยกำหนด",
      note: "รบกวนตรวจสอบเอกสารอีกครั้งค่ะ หากต้องการแจ้งชำระเงินหรือสอบถามเพิ่มเติม กดปุ่มด้านล่างได้เลยค่ะ",
      cardBg: "#302C2A",
      amountColor: "#B66512",
      heroTone: "overdue"
    };
  }

  return {
    title: "เตือนชำระเงิน",
    badge: "REMINDER",
    status: "ใกล้ครบกำหนด",
    note: "รบกวนตรวจสอบเอกสารด้านล่างค่ะ หากต้องการแจ้งชำระเงินหรือสอบถามเพิ่มเติม กดปุ่มด้านล่างได้เลยค่ะ",
    cardBg: "#24364B",
    amountColor: "#0F8F75",
    heroTone: "reminder"
  };
}

function getHeroImage(tone: HeroTone) {
  const key = `LINE_FLEX_HERO_${tone.toUpperCase()}_URL`;
  return Netlify.env.get(key) || Netlify.env.get("LINE_FLEX_HERO_IMAGE_URL") || defaultHeroImages[tone];
}

function createImageBadge(text: string) {
  return {
    type: "box",
    layout: "vertical",
    position: "absolute",
    offsetTop: "12px",
    offsetStart: "12px",
    paddingTop: "5px",
    paddingBottom: "5px",
    paddingStart: "10px",
    paddingEnd: "10px",
    cornerRadius: "999px",
    backgroundColor: "#FF5F6D",
    contents: [{ type: "text", text, size: "xxs", weight: "bold", color: "#FFFFFF", align: "center", wrap: false }]
  };
}

function createDetailRow(label: string, value: string) {
  return {
    type: "box",
    layout: "baseline",
    spacing: "sm",
    margin: "sm",
    contents: [
      { type: "text", text: label, size: "xs", color: "#6B7B8C", flex: 4 },
      { type: "text", text: value, size: "sm", color: "#1D2B2F", weight: "bold", flex: 6, wrap: true }
    ]
  };
}

function createOptionalStickerMessage(): StickerMessage | null {
  const packageId = Netlify.env.get("LINE_STICKER_PACKAGE_ID");
  const stickerId = Netlify.env.get("LINE_STICKER_ID");
  if (!packageId || !stickerId) return null;
  return { type: "sticker", packageId, stickerId };
}

function isOverdue(value: string) {
  const due = new Date(value);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(amount);
}

function formatThaiDateShort(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
