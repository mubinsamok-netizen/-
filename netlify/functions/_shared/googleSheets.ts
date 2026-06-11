import { google } from "googleapis";
import type { Billing, Customer } from "./types";

type SheetColumn = {
  key: string;
  label: string;
  aliases?: string[];
};

const DEFAULT_SHEET_ID = "1dLYIxFRVvbpv-GL-2Yr6wHBc_QHvYoLbM7oAi781OqY";
const BILLING_SHEET = Netlify.env.get("GOOGLE_BILLINGS_TAB") || "วางบิล";
const CUSTOMER_SHEET = Netlify.env.get("GOOGLE_CUSTOMERS_TAB") || "ลูกค้า";
const SETTING_SHEET = Netlify.env.get("GOOGLE_SETTINGS_TAB") || "ตั้งค่า";

const billingColumns: SheetColumn[] = [
  { key: "id", label: "รหัสบิล", aliases: ["id"] },
  { key: "customerId", label: "รหัสลูกค้า", aliases: ["customerId"] },
  { key: "customerName", label: "ชื่อลูกค้า", aliases: ["customerName"] },
  { key: "contactName", label: "ชื่อผู้ติดต่อ", aliases: ["contactName"] },
  { key: "lineUserId", label: "LINE userId / groupId", aliases: ["lineUserId"] },
  { key: "amount", label: "ยอดชำระ", aliases: ["amount"] },
  { key: "dueDate", label: "วันครบกำหนด", aliases: ["dueDate"] },
  { key: "pdfUrl", label: "ลิงก์เอกสาร PDF", aliases: ["pdfUrl"] },
  { key: "status", label: "สถานะ", aliases: ["status"] },
  { key: "lastSentAt", label: "ส่งล่าสุดเมื่อ", aliases: ["lastSentAt"] },
  { key: "reminderCount", label: "จำนวนครั้งที่เตือน", aliases: ["reminderCount"] },
  { key: "reminderBeforeSentAt", label: "ส่งเตือนก่อนครบกำหนดแล้วเมื่อ", aliases: ["reminderBeforeSentAt"] },
  { key: "reminderDueSentAt", label: "ส่งเตือนวันครบกำหนดแล้วเมื่อ", aliases: ["reminderDueSentAt"] },
  { key: "reminderOverdueSentAt", label: "ส่งติดตามหลังเลยกำหนดแล้วเมื่อ", aliases: ["reminderOverdueSentAt"] },
  { key: "paidAt", label: "ชำระแล้วเมื่อ", aliases: ["paidAt"] },
  { key: "customerComment", label: "ข้อความจากลูกค้า", aliases: ["customerComment"] },
  { key: "customerCommentAt", label: "รับข้อความลูกค้าเมื่อ", aliases: ["customerCommentAt"] },
  { key: "note", label: "หมายเหตุ", aliases: ["note"] },
  { key: "createdAt", label: "สร้างเมื่อ", aliases: ["createdAt"] },
  { key: "updatedAt", label: "แก้ไขล่าสุด", aliases: ["updatedAt"] }
];

const customerColumns: SheetColumn[] = [
  { key: "id", label: "รหัสลูกค้า", aliases: ["id"] },
  { key: "name", label: "ชื่อลูกค้า", aliases: ["name"] },
  { key: "contactName", label: "ชื่อผู้ติดต่อ", aliases: ["contactName"] },
  { key: "lineUserId", label: "LINE userId / groupId", aliases: ["lineUserId"] },
  { key: "phone", label: "เบอร์โทร", aliases: ["phone"] },
  { key: "email", label: "อีเมล", aliases: ["email"] },
  { key: "note", label: "หมายเหตุ", aliases: ["note"] },
  { key: "status", label: "สถานะ", aliases: ["status"] },
  { key: "createdAt", label: "สร้างเมื่อ", aliases: ["createdAt"] },
  { key: "updatedAt", label: "แก้ไขล่าสุด", aliases: ["updatedAt"] }
];

const settingColumns: SheetColumn[] = [
  { key: "key", label: "หัวข้อ", aliases: ["key"] },
  { key: "value", label: "ค่า", aliases: ["value"] },
  { key: "description", label: "คำอธิบาย", aliases: ["description"] }
];

const defaultSettings = [
  ["เปิดแจ้งเตือนอัตโนมัติ", "TRUE", "TRUE = เปิด, FALSE = ปิด"],
  ["เตือนก่อนครบกำหนดกี่วัน", "3", "เช่น 3 หมายถึงเตือนก่อนครบกำหนด 3 วัน"],
  ["เตือนในวันครบกำหนด", "TRUE", "TRUE = ส่งเตือนในวันครบกำหนด"],
  ["ติดตามหลังเลยกำหนดกี่วัน", "3", "เช่น 3 หมายถึงติดตามหลังเลยกำหนด 3 วัน"]
];

const settingKeyAliases: Record<string, string> = {
  REMINDER_AUTO_ENABLED: "เปิดแจ้งเตือนอัตโนมัติ",
  REMINDER_BEFORE_DAYS: "เตือนก่อนครบกำหนดกี่วัน",
  REMINDER_DUE_DAY_ENABLED: "เตือนในวันครบกำหนด",
  REMINDER_OVERDUE_DAYS: "ติดตามหลังเลยกำหนดกี่วัน"
};

function getSheetId() {
  return Netlify.env.get("GOOGLE_SHEET_ID") || DEFAULT_SHEET_ID;
}

function getCredentials() {
  const rawJson = Netlify.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (rawJson) {
    const credentials = JSON.parse(rawJson);
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
    }
    return credentials;
  }

  const clientEmail = Netlify.env.get("GOOGLE_CLIENT_EMAIL") || Netlify.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = Netlify.env.get("GOOGLE_PRIVATE_KEY");
  if (clientEmail && privateKey) {
    return {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n")
    };
  }

  throw new Error("ยังไม่ได้ตั้งค่า Google service account ใน Netlify Environment Variables");
}

async function sheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return google.sheets({ version: "v4", auth });
}

async function ensureSheet(tabName: string, columns: SheetColumn[]) {
  const sheets = await sheetsClient();
  const spreadsheetId = getSheetId();
  const headers = columns.map((column) => column.label);
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetExists = spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === tabName);

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }]
      }
    });
  }

  const headerResult = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheet(tabName)}!1:1`
  });

  const currentHeaders = headerResult.data.values?.[0] ?? [];
  if (headers.some((header, index) => currentHeaders[index] !== header)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteSheet(tabName)}!A1:${columnName(headers.length)}1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] }
    });
  }
}

async function readRows(tabName: string, columns: SheetColumn[]) {
  await ensureSheet(tabName, columns);
  const sheets = await sheetsClient();
  const headers = columns.map((column) => column.label);
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${quoteSheet(tabName)}!A2:${columnName(headers.length)}`
  });

  return (result.data.values ?? []).map((row) =>
    Object.fromEntries(columns.map((column, index) => [column.key, row[index] ?? ""]))
  );
}

async function ensureDefaultSettings() {
  await ensureSheet(SETTING_SHEET, settingColumns);
  const sheets = await sheetsClient();
  const spreadsheetId = getSheetId();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheet(SETTING_SHEET)}!A2:C`
  });
  const existingKeys = new Set((result.data.values ?? []).map((row) => String(row[0] ?? "")));
  const missing = defaultSettings.filter(([key]) => !existingKeys.has(key));

  if (missing.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${quoteSheet(SETTING_SHEET)}!A:C`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: missing }
    });
  }
}

async function upsertRow(tabName: string, columns: SheetColumn[], id: string, row: Record<string, unknown>) {
  await ensureSheet(tabName, columns);
  const sheets = await sheetsClient();
  const spreadsheetId = getSheetId();
  const headers = columns.map((column) => column.label);
  const idColumn = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheet(tabName)}!A2:A`
  });
  const ids = idColumn.data.values?.map((value) => value[0]) ?? [];
  const existingIndex = ids.findIndex((value) => value === id);
  const now = new Date().toISOString();
  const values = columns.map((column) => {
    if (column.key === "createdAt") return String(row.createdAt || now);
    if (column.key === "updatedAt") return now;
    return row[column.key] == null ? "" : String(row[column.key]);
  });

  if (existingIndex >= 0) {
    const sheetRow = existingIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteSheet(tabName)}!A${sheetRow}:${columnName(headers.length)}${sheetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] }
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${quoteSheet(tabName)}!A:${columnName(headers.length)}`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] }
    });
  }
}

export async function listBillings(): Promise<Billing[]> {
  const rows = await readRows(BILLING_SHEET, billingColumns);
  return rows
    .filter((row) => row.id)
    .map((row) => ({
      id: String(row.id),
      customerId: String(row.customerId),
      customerName: String(row.customerName),
      contactName: String(row.contactName),
      lineUserId: String(row.lineUserId),
      amount: Number(row.amount || 0),
      dueDate: String(row.dueDate),
      pdfUrl: String(row.pdfUrl),
      status: normalizeStatus(String(row.status)),
      lastSentAt: String(row.lastSentAt || ""),
      reminderCount: Number(row.reminderCount || 0),
      reminderBeforeSentAt: String(row.reminderBeforeSentAt || ""),
      reminderDueSentAt: String(row.reminderDueSentAt || ""),
      reminderOverdueSentAt: String(row.reminderOverdueSentAt || ""),
      paidAt: String(row.paidAt || ""),
      customerComment: String(row.customerComment || ""),
      customerCommentAt: String(row.customerCommentAt || ""),
      note: String(row.note || "")
    }));
}

export async function saveBilling(billing: Billing): Promise<Billing> {
  const normalized = {
    ...billing,
    amount: Number(billing.amount || 0),
    reminderCount: Number(billing.reminderCount || 0),
    status: normalizeStatus(billing.status)
  };
  await upsertRow(BILLING_SHEET, billingColumns, normalized.id, normalized);
  return normalized;
}

export async function getBilling(id: string) {
  const billings = await listBillings();
  return billings.find((billing) => billing.id === id);
}

export async function listCustomers(): Promise<Customer[]> {
  const rows = await readRows(CUSTOMER_SHEET, customerColumns);
  return rows
    .filter((row) => row.id)
    .map((row) => ({
      id: String(row.id),
      name: String(row.name),
      contactName: String(row.contactName),
      lineUserId: String(row.lineUserId),
      phone: String(row.phone),
      email: String(row.email),
      note: String(row.note),
      status: String(row.status || "ใช้งาน")
    }));
}

export async function saveCustomer(customer: Customer): Promise<Customer> {
  await upsertRow(CUSTOMER_SHEET, customerColumns, customer.id, customer);
  return customer;
}

export async function listSettings() {
  await ensureDefaultSettings();
  const rows = await readRows(SETTING_SHEET, settingColumns);
  const entries = rows
    .filter((row) => row.key)
    .flatMap((row) => {
      const key = String(row.key).trim();
      const value = String(row.value ?? "").trim();
      const alias = settingKeyAliases[key];
      return alias ? [[key, value], [alias, value]] : [[key, value]];
    });
  return Object.fromEntries(entries);
}

function normalizeStatus(status: string): Billing["status"] {
  const allowed = ["รอส่ง", "ส่งแล้ว", "รอชำระ", "เตือนแล้ว", "รอตรวจสอบการชำระ", "รอส่งมอบงาน", "ชำระแล้ว"] as const;
  return allowed.includes(status as Billing["status"]) ? (status as Billing["status"]) : "รอส่ง";
}

function quoteSheet(name: string) {
  return `'${name.replace(/'/g, "''")}'`;
}

function columnName(index: number) {
  let name = "";
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}
