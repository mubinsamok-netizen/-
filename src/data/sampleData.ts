import type { Billing, Customer } from "../types";

export const sampleCustomers: Customer[] = [
  {
    id: "CUS-001",
    name: "บริษัท สบายดี จำกัด",
    contactName: "คุณมิน",
    lineUserId: "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    phone: "02-123-4567",
    email: "account@sabaidee.example",
    note: "ติดต่อช่วงเช้าได้สะดวก",
    status: "ใช้งาน"
  },
  {
    id: "CUS-002",
    name: "ร้านบ้านฟ้า",
    contactName: "คุณฟ้า",
    lineUserId: "Uyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    phone: "081-234-5678",
    email: "baanfah@example.com",
    note: "ส่งเอกสารเข้ากลุ่ม LINE เดิม",
    status: "ใช้งาน"
  },
  {
    id: "CUS-003",
    name: "ห้างหุ้นส่วนเติมใจ",
    contactName: "คุณต้น",
    lineUserId: "Uzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    phone: "089-111-2222",
    email: "billing@termjai.example",
    note: "ต้องแนบ PDF ทุกครั้ง",
    status: "ใช้งาน"
  }
];

export const sampleBillings: Billing[] = [
  {
    id: "BILL-2026-001",
    customerId: "CUS-001",
    customerName: "บริษัท สบายดี จำกัด",
    contactName: "คุณมิน",
    lineUserId: "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    amount: 18500,
    dueDate: "2026-06-18",
    pdfUrl: "https://example.com/billing-001.pdf",
    status: "รอส่ง",
    reminderCount: 0,
    note: "รอบบริการเดือนมิถุนายน"
  },
  {
    id: "BILL-2026-002",
    customerId: "CUS-002",
    customerName: "ร้านบ้านฟ้า",
    contactName: "คุณฟ้า",
    lineUserId: "Uyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    amount: 7200,
    dueDate: "2026-06-12",
    pdfUrl: "https://example.com/billing-002.pdf",
    status: "รอชำระ",
    lastSentAt: "2026-06-05T09:10:00.000Z",
    reminderCount: 1,
    note: "ส่งเอกสารแล้ว รอชำระ"
  },
  {
    id: "BILL-2026-003",
    customerId: "CUS-003",
    customerName: "ห้างหุ้นส่วนเติมใจ",
    contactName: "คุณต้น",
    lineUserId: "Uzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    amount: 32900,
    dueDate: "2026-06-04",
    pdfUrl: "https://example.com/billing-003.pdf",
    status: "เตือนแล้ว",
    lastSentAt: "2026-06-09T04:20:00.000Z",
    reminderCount: 2,
    note: "เลยกำหนดแล้ว ติดตามแบบสุภาพ"
  },
  {
    id: "BILL-2026-004",
    customerId: "CUS-001",
    customerName: "บริษัท สบายดี จำกัด",
    contactName: "คุณมิน",
    lineUserId: "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    amount: 12800,
    dueDate: "2026-05-28",
    pdfUrl: "https://example.com/billing-004.pdf",
    status: "ชำระแล้ว",
    lastSentAt: "2026-05-20T03:30:00.000Z",
    reminderCount: 0,
    paidAt: "2026-05-27T10:20:00.000Z",
    note: "ปิดรอบแล้ว"
  }
];
