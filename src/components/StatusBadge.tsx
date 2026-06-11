import type { BillingStatus } from "../types";

const statusClass: Record<BillingStatus, string> = {
  รอส่ง: "status wait",
  ส่งแล้ว: "status sent",
  รอชำระ: "status pending",
  เตือนแล้ว: "status remind",
  รอตรวจสอบการชำระ: "status review",
  รอส่งมอบงาน: "status hold",
  ชำระแล้ว: "status paid"
};

export function StatusBadge({ status }: { status: BillingStatus }) {
  return <span className={statusClass[status]}>{status}</span>;
}
