import { CheckCircle2, Clock3, ExternalLink, MessageCircle } from "lucide-react";
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
  const internalState = getInternalState(billing);
  if (internalState) {
    return (
      <section className="internal-status-preview" aria-label="สถานะภายในระบบ">
        <div className={`internal-status-preview__icon ${internalState.tone}`}>
          {internalState.tone === "review" ? <Clock3 size={22} /> : <CheckCircle2 size={22} />}
        </div>
        <div>
          <p>สถานะภายในระบบ</p>
          <h3>{internalState.title}</h3>
          <span>{billing.customerName}</span>
        </div>
        <div className="internal-status-preview__box">
          <div>
            <span>ยอดชำระ</span>
            <strong>{formatBaht(billing.amount)}</strong>
          </div>
          <div>
            <span>ครบกำหนด</span>
            <b>{formatDate(billing.dueDate)}</b>
          </div>
          <div>
            <span>สถานะ</span>
            <b>{billing.status}</b>
          </div>
        </div>
        <p className="internal-status-preview__note">{internalState.note}</p>
      </section>
    );
  }

  const theme = getPreviewTheme(billing);
  const isPaid = theme.tone === "paid";

  return (
    <section className={`flex-preview flex-preview--${theme.tone}`} aria-label="ตัวอย่าง LINE Flex Message">
      <div className="flex-preview__hero">
        <img src={heroImages[theme.tone]} alt="" loading="lazy" decoding="async" fetchPriority="low" />
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
          {!isPaid ? (
            <div className="flex-preview__line">
              <span>ครบกำหนด</span>
              <b>{formatDate(billing.dueDate)}</b>
            </div>
          ) : null}
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
              แจ้งชำระเงิน
            </button>
            <button type="button" className="secondary">
              <MessageCircle size={16} />
              สอบถาม/แจ้งปัญหา
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function getInternalState(billing: Billing) {
  if (billing.status === "รอตรวจสอบการชำระ") {
    return {
      title: "รอตรวจสอบการชำระ",
      note: "ลูกค้าแจ้งชำระเงินกลับมาทาง LINE แล้ว ระบบเก็บไว้ให้ฝ่ายบัญชีตรวจสอบหลักฐานและกดชำระแล้วเองเมื่อเรียบร้อย ไม่ได้ส่งการ์ดนี้เข้ากลุ่มอัตโนมัติ",
      tone: "review" as const
    };
  }

  if (billing.status === "รอส่งมอบงาน") {
    return {
      title: "รอประสานงานโครงการ",
      note: "ลูกค้าสอบถามหรือแจ้งปัญหากลับมาทาง LINE ระบบพักรายการไว้ให้ทีมตรวจสอบก่อน ไม่ได้ส่งการ์ดนี้เข้ากลุ่มอัตโนมัติ",
      tone: "hold" as const
    };
  }

  return null;
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

  if (billing.status === "เตือนแล้ว") {
    return {
      title: "เตือนชำระเงิน",
      subtitle: "PMC CONNEXT | ใกล้ครบกำหนด",
      badge: "REMINDER",
      status: "ใกล้ครบกำหนด",
      note: "รบกวนตรวจสอบเอกสารด้านล่างค่ะ หากต้องการแจ้งชำระเงินหรือสอบถามเพิ่มเติม กดปุ่มด้านล่างได้เลยค่ะ",
      tone: "reminder"
    };
  }

  if (isOverdue(billing.dueDate)) {
    return {
      title: "ติดตามยอดวางบิล",
      subtitle: "PMC CONNEXT | เลยกำหนด",
      badge: "OVERDUE",
      status: "เลยกำหนด",
      note: "รบกวนตรวจสอบเอกสารอีกครั้งค่ะ หากต้องการแจ้งชำระเงินหรือสอบถามเพิ่มเติม กดปุ่มด้านล่างได้เลยค่ะ",
      tone: "overdue"
    };
  }

  return {
    title: "แจ้งใบวางบิล",
    subtitle: "PMC CONNEXT | ฝ่ายบัญชี",
    badge: "NEW",
    status: "รอชำระ",
    note: "เปิดเอกสารเพื่อตรวจสอบรายละเอียดได้เลยค่ะ หากต้องการแจ้งชำระเงินหรือสอบถามเพิ่มเติม กดปุ่มด้านล่างได้เลยค่ะ",
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
