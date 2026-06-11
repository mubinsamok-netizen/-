import type { Config, Context } from "@netlify/functions";
import { json } from "./_shared/http";
import { listBillings, listSettings, saveBilling } from "./_shared/googleSheets";
import { pushBillingMessage } from "./_shared/line";
import type { Billing } from "./_shared/types";

type ReminderStage = "before" | "due" | "overdue";

type ReminderPlan = {
  stage: ReminderStage;
  sentField: "reminderBeforeSentAt" | "reminderDueSentAt" | "reminderOverdueSentAt";
};

type ReminderSettings = {
  autoEnabled: boolean;
  beforeDays: number;
  dueDayEnabled: boolean;
  overdueDays: number;
};

export default async (_req: Request, _context: Context) => {
  const settings = await getReminderSettings();
  const billings = await listBillings();
  const todayKey = getBangkokDateKey(new Date());
  const today = parseDateOnly(todayKey);

  if (!settings.autoEnabled) {
    return json({ checked: billings.length, reminded: 0, skipped: "REMINDER_AUTO_ENABLED is FALSE" });
  }

  const results: Array<{ id: string; stage?: ReminderStage; ok: boolean; error?: string }> = [];

  for (const billing of billings) {
    const plan = getReminderPlan(billing, today, settings);
    if (!plan) continue;

    try {
      await pushBillingMessage(billing, "reminder");
      await saveBilling({
        ...billing,
        status: "เตือนแล้ว",
        reminderCount: billing.reminderCount + 1,
        lastSentAt: new Date().toISOString(),
        [plan.sentField]: new Date().toISOString()
      });
      results.push({ id: billing.id, stage: plan.stage, ok: true });
    } catch (err) {
      results.push({ id: billing.id, stage: plan.stage, ok: false, error: err instanceof Error ? err.message : "unknown error" });
    }
  }

  return json({
    checked: billings.length,
    reminded: results.filter((result) => result.ok).length,
    settings,
    results
  });
};

function getReminderPlan(billing: Billing, today: Date, settings: ReminderSettings): ReminderPlan | null {
  if (["ชำระแล้ว", "รอส่ง", "รอตรวจสอบการชำระ", "รอส่งมอบงาน"].includes(billing.status)) return null;
  if (!billing.dueDate || !billing.lineUserId) return null;

  const due = parseDateOnly(billing.dueDate);
  const diffDays = daysBetween(today, due);

  if (diffDays === settings.beforeDays && !billing.reminderBeforeSentAt) {
    return { stage: "before", sentField: "reminderBeforeSentAt" };
  }

  if (diffDays === 0 && settings.dueDayEnabled && !billing.reminderDueSentAt) {
    return { stage: "due", sentField: "reminderDueSentAt" };
  }

  if (diffDays === -settings.overdueDays && !billing.reminderOverdueSentAt) {
    return { stage: "overdue", sentField: "reminderOverdueSentAt" };
  }

  return null;
}

async function getReminderSettings(): Promise<ReminderSettings> {
  const sheetSettings = await listSettings();
  return {
    autoEnabled: readBoolean(sheetSettings["เปิดแจ้งเตือนอัตโนมัติ"] ?? sheetSettings.REMINDER_AUTO_ENABLED, true),
    beforeDays: readNumber(
      sheetSettings["เตือนก่อนครบกำหนดกี่วัน"] ?? sheetSettings.REMINDER_BEFORE_DAYS,
      Number(Netlify.env.get("AUTO_REMINDER_DAYS_BEFORE") || 3)
    ),
    dueDayEnabled: readBoolean(sheetSettings["เตือนในวันครบกำหนด"] ?? sheetSettings.REMINDER_DUE_DAY_ENABLED, true),
    overdueDays: readNumber(
      sheetSettings["ติดตามหลังเลยกำหนดกี่วัน"] ?? sheetSettings.REMINDER_OVERDUE_DAYS,
      Number(Netlify.env.get("AUTO_REMINDER_OVERDUE_DAYS") || 3)
    )
  };
}

function readNumber(value: string | undefined, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  return ["TRUE", "YES", "1", "ON", "เปิด"].includes(value.trim().toUpperCase());
}

function getBangkokDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function daysBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export const config: Config = {
  schedule: "@daily"
};
