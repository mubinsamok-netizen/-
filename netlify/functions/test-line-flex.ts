import type { Config, Context } from "@netlify/functions";
import { requireAdmin } from "./_shared/auth";
import { error, json } from "./_shared/http";
import { pushBillingMessage } from "./_shared/line";
import type { Billing } from "./_shared/types";

export default async (req: Request, _context: Context) => {
  try {
    if (req.method !== "POST") return error("Method not allowed", 405);

    const authError = requireAdmin(req);
    if (authError) return authError;

    if (Netlify.env.get("ENABLE_TEST_LINE_FLEX") !== "TRUE") {
      return error("ปิด endpoint ทดสอบ LINE อยู่ ตั้งค่า ENABLE_TEST_LINE_FLEX=TRUE เมื่อต้องการทดสอบ", 403);
    }

    const groupId = Netlify.env.get("LINE_TEST_GROUP_ID");
    if (!groupId) return error("ยังไม่ได้ตั้งค่า LINE_TEST_GROUP_ID", 400);

    const billing: Billing = {
      id: "TEST-FLEX-001",
      customerId: "TEST-CUSTOMER",
      customerName: "กลุ่มทดสอบ",
      contactName: "คุณลูกค้า",
      lineUserId: groupId,
      amount: 18500,
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      pdfUrl: "https://example.com/test-billing.pdf",
      status: "รอชำระ",
      reminderCount: 0,
      note: "ทดสอบส่ง Flex Message"
    };

    await pushBillingMessage(billing, "invoice");
    return json({ ok: true, message: "ส่ง Flex card ทดสอบไปยังกลุ่ม LINE แล้ว" });
  } catch (err) {
    return error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด", 500);
  }
};

export const config: Config = {
  path: "/api/test-line-flex",
  method: ["POST"]
};
