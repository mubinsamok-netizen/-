export type BillingStatus =
  | "รอส่ง"
  | "ส่งแล้ว"
  | "รอชำระ"
  | "เตือนแล้ว"
  | "รอตรวจสอบการชำระ"
  | "รอส่งมอบงาน"
  | "ชำระแล้ว";

export type Customer = {
  id: string;
  name: string;
  contactName: string;
  lineUserId: string;
  phone: string;
  email: string;
  note: string;
  status: string;
};

export type Billing = {
  id: string;
  customerId: string;
  customerName: string;
  contactName: string;
  lineUserId: string;
  amount: number;
  dueDate: string;
  pdfUrl: string;
  status: BillingStatus;
  lastSentAt?: string;
  reminderCount: number;
  reminderBeforeSentAt?: string;
  reminderDueSentAt?: string;
  reminderOverdueSentAt?: string;
  paidAt?: string;
  customerComment?: string;
  customerCommentAt?: string;
  note: string;
};

export type BillingAction = "invoice" | "reminder" | "paid";
