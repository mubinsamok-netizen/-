import { timingSafeEqual } from "node:crypto";
import { error } from "./http";

export function requireAdmin(req: Request) {
  const adminPassword = Netlify.env.get("ADMIN_PASSWORD");
  if (!adminPassword) {
    return error("ยังไม่ได้ตั้งค่า ADMIN_PASSWORD ใน Netlify Environment Variables", 500);
  }

  const suppliedPassword = req.headers.get("x-admin-password") || "";
  if (!safeEqual(suppliedPassword, adminPassword)) {
    return error("กรุณาเข้าสู่ระบบใหม่", 401);
  }

  return null;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
