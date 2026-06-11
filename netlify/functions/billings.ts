import type { Config, Context } from "@netlify/functions";
import { error, json, readJson } from "./_shared/http";
import { listBillings, saveBilling } from "./_shared/googleSheets";
import type { Billing } from "./_shared/types";

export default async (req: Request, _context: Context) => {
  try {
    if (req.method === "GET") {
      const billings = await listBillings();
      return json({ billings });
    }

    if (req.method === "POST") {
      const billing = await readJson<Billing>(req);
      if (!billing.id || !billing.customerName) {
        return error("กรุณาระบุเลขที่รายการและชื่อลูกค้า");
      }
      const saved = await saveBilling(billing);
      return json({ billing: saved });
    }

    return error("Method not allowed", 405);
  } catch (err) {
    return error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด", 500);
  }
};

export const config: Config = {
  path: "/api/billings",
  method: ["GET", "POST"]
};
