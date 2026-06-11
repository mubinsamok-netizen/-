export const statuses = ["รอส่ง", "ส่งแล้ว", "รอชำระ", "เตือนแล้ว", "รอตรวจสอบการชำระ", "รอส่งมอบงาน", "ชำระแล้ว"] as const;

export function formatBaht(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function getDueTone(dueDate: string, status: string) {
  if (status === "ชำระแล้ว") return "paid";
  if (status === "รอส่งมอบงาน" || status === "รอตรวจสอบการชำระ") return "normal";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 3) return "soon";
  return "normal";
}

export function createId(prefix: string) {
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  return `${prefix}-${stamp}`;
}
