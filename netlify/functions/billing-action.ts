import type { Config, Context } from "@netlify/functions";
import { requireAdmin } from "./_shared/auth";
import { getBilling, saveBilling } from "./_shared/googleSheets";
import { error, json, readJson } from "./_shared/http";
import { pushBillingMessage } from "./_shared/line";
import type { BillingAction } from "./_shared/types";

export default async (req: Request, context: Context) => {
  try {
    const authError = requireAdmin(req);
    if (authError) return authError;

    if (req.method !== "POST") return error("Method not allowed", 405);
    const id = context.params.id;
    const { action } = await readJson<{ action: BillingAction }>(req);
    const billing = await getBilling(id);
    if (!billing) return error("ไม่พบรายการวางบิล", 404);

    if (action === "invoice") {
      await pushBillingMessage(billing, "invoice");
      const updated = await saveBilling({
        ...billing,
        status: "รอชำระ",
        lastSentAt: new Date().toISOString()
      });
      return json({ billing: updated, message: "ส่งแจ้งวางบิลผ่าน LINE และเปลี่ยนสถานะเป็นรอชำระแล้ว" });
    }

    if (action === "reminder") {
      await pushBillingMessage(billing, "reminder");
      const updated = await saveBilling({
        ...billing,
        status: "เตือนแล้ว",
        reminderCount: billing.reminderCount + 1,
        lastSentAt: new Date().toISOString()
      });
      return json({ billing: updated, message: "ส่งข้อความเตือนชำระผ่าน LINE แล้ว" });
    }

    if (action === "paid") {
      const updated = await saveBilling({
        ...billing,
        status: "ชำระแล้ว",
        paidAt: new Date().toISOString()
      });
      await pushBillingMessage(updated, "paid");
      return json({ billing: updated, message: "ทำเครื่องหมายว่าชำระแล้ว และส่งข้อความยืนยันผ่าน LINE แล้ว" });
    }

    return error("คำสั่งไม่ถูกต้อง");
  } catch (err) {
    return error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด", 500);
  }
};

export const config: Config = {
  path: "/api/billings/:id/action",
  method: ["POST"]
};
