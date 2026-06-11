import type { Config, Context } from "@netlify/functions";
import { error, json, readJson } from "./_shared/http";
import { listCustomers, saveCustomer } from "./_shared/googleSheets";
import type { Customer } from "./_shared/types";

export default async (req: Request, _context: Context) => {
  try {
    if (req.method === "GET") {
      const customers = await listCustomers();
      return json({ customers });
    }

    if (req.method === "POST") {
      const customer = await readJson<Customer>(req);
      if (!customer.id || !customer.name) {
        return error("กรุณาระบุรหัสและชื่อลูกค้า");
      }
      const saved = await saveCustomer(customer);
      return json({ customer: saved });
    }

    return error("Method not allowed", 405);
  } catch (err) {
    return error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด", 500);
  }
};

export const config: Config = {
  path: "/api/customers",
  method: ["GET", "POST"]
};
