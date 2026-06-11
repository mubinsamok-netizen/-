import { ExternalLink, MessageCircle } from "lucide-react";
import { formatBaht, formatDate } from "../lib/format";
import type { Billing } from "../types";

const heroImages = {
  invoice: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1040&q=80",
  reminder: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1040&q=80",
  overdue: "https://images.unsplash.com/photo-1673190889421-c02cccd99e2f?auto=format&fit=crop&w=1040&q=80",
  paid: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1040&q=80"
};

type PreviewTheme = {
  title: string;
  subtitle: string;
  badge: string;
  status: string;
  note: string;
  tone: "invoice" | "reminder" | "overdue" | "paid";
};

export function FlexPreview({ billing }: { billing: Billing }) {
  const theme = getPreviewTheme(billing);
  const isPaid = theme.tone === "paid";

  return (
    <section className={`flex-preview flex-preview--${theme.tone}`} aria-label="ตัวอย่าง LINE Flex Message">
      <div className="flex-preview__hero">
        <img src={heroImages[theme.tone]} alt="" />
        <span>{theme.badge}</span>
      </div>

      <div className="flex-preview__content">
        <div className="flex-preview__heading">
          <h3>{theme.title}</h3>
          <p>{theme.subtitle}</p>
        </div>

        <strong className="flex-preview__customer">{billing.customerName}</strong>

        <div className="flex-preview__amount-card">
          <span>ยอดชำระ</span>
          <strong>{formatBaht(billing.amount)}</strong>
          <div className="flex-preview__divider" />
          <div className="flex-preview__line">
            <span>ครบกำหนด</span>
            <b>{formatDate(billing.dueDate)}</b>
          </div>
          <div className="flex-preview__line">
            <span>สถานะ</span>
            <b>{theme.status}</b>
          </div>
        </div>

        <p className="flex-preview__note">{theme.note}</p>
      </div>

      <div className="flex-preview__actions">
        <button type="button">
          <ExternalLink size={16} />
          {isPaid ? "ดูเอกสาร" : "เปิดเอกสาร"}
        </button>
        {!isPaid && (
          <>
            <button type="button" className="secondary">
              <MessageCircle size={16} />
              พิมพ์แจ้งชำระเงิน
            </button>
            <button type="button" className="secondary">
              <MessageCircle size={16} />
              พิมพ์สอบถาม/แจ้งปัญหา
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function getPreviewTheme(billing: Billing): PreviewTheme {
  if (billing.status === "ชำระแล้ว") {
    return {
      title: "รับแจ้งชำระเงินแล้ว",
      subtitle: "PMC CONNEXT | ฝ่ายบัญชี",
      badge: "PAID",
      status: "ชำระแล้ว",
      note: "ฝ่ายบัญชีได้รับแจ้งการชำระเงินเรียบร้อยแล้วค่ะ ขอบคุณมากค่ะ",
      tone: "paid"
    };
  }

  if (billing.status === "รอตรวจสอบการชำระ") {
    return {
      title: "รอตรวจสอบการชำระ",
      subtitle: "PMC CONNEXT | ฝ่ายบัญชี",
      badge: "REVIEW",
      status: "รอตรวจสอบการชำระ",
      note: "ฝ่ายบัญชีได้รับแจ้งชำระเงินแล้วค่ะ และจะตรวจสอบรายละเอียดให้เรียบร้อยก่อนยืนยันอีกครั้งค่ะ",
      tone: "paid"
    };
  }

  if (billing.status === "รอส่งมอบงาน") {
    return {
      title: "รับเรื่องไว้แล้ว",
      subtitle: "PMC CONNEXT | ประสานงานโครงการ",
      badge: "HOLD",
      status: "รอส่งมอบงาน",
      note: "ฝ่ายบัญชีจะตรวจสอบสถานะงานกับทีมโครงการก่อนค่ะ และจะแจ้งกำหนดวางบิลใหม่เมื่อเรียบร้อยค่ะ",
      tone: "invoice"
    };
  }

  if (billing.status === "เตือนแล้ว") {
    return {
      title: "เตือนชำระเงิน",
      subtitle: "PMC CONNEXT | ใกล้ครบกำหนด",
      badge: "REMINDER",
      status: "ใกล้ครบกำหนด",
      note: "รบกวนตรวจสอบเอกสารด้านล่างค่ะ หากต้องการแจ้งชำระเงินหรือสอบถามเพิ่มเติม กดปุ่มด้านล่างเพื่อเปิดช่องพิมพ์ได้ค่ะ",
      tone: "reminder"
    };
  }

  if (isOverdue(billing.dueDate)) {
    return {
      title: "ติดตามยอดวางบิล",
      subtitle: "PMC CONNEXT | เลยกำหนด",
      badge: "OVERDUE",
      status: "เลยกำหนด",
      note: "รบกวนตรวจสอบเอกสารอีกครั้งค่ะ หากต้องการแจ้งชำระเงินหรือสอบถามเพิ่มเติม กดปุ่มด้านล่างเพื่อเปิดช่องพิมพ์ได้ค่ะ",
      tone: "overdue"
    };
  }

  return {
    title: "แจ้งใบวางบิล",
    subtitle: "PMC CONNEXT | ฝ่ายบัญชี",
    badge: "NEW",
    status: "รอชำระ",
    note: "เปิดเอกสารเพื่อตรวจสอบรายละเอียดได้เลยค่ะ หากต้องการแจ้งชำระเงินหรือสอบถามเพิ่มเติม กดปุ่มด้านล่างเพื่อเปิดช่องพิมพ์ได้ค่ะ",
    tone: "invoice"
  };
}

function isOverdue(value: string) {
  const due = new Date(value);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}
