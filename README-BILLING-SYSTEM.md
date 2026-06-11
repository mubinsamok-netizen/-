# ระบบวางบิลลูกค้า

เว็บแอปสำหรับฝ่ายบัญชี 1-2 คน ใช้ Google Sheets เป็นฐานข้อมูล และใช้ Netlify Functions เป็น backend สำหรับส่ง LINE Messaging API

## ใช้งานระหว่างพัฒนา

```bash
npm install
npm run netlify:dev
```

เปิด:

```text
http://localhost:8888
```

ถ้ายังไม่ได้ตั้งค่า Google/LINE env หน้าเว็บจะแสดงข้อมูลตัวอย่างให้ทดลองเพิ่มรายการ บันทึกสถานะ และดู preview LINE Flex card ได้

## Build

```bash
npm run build
```

## โครงสร้างสำคัญ

```text
src/
  App.tsx
  styles.css
  lib/api.ts
  data/sampleData.ts
netlify/functions/
  billings.ts
  customers.ts
  billing-action.ts
  scheduled-reminders.ts
  line-webhook.ts
  _shared/googleSheets.ts
  _shared/line.ts
docs/
  ENVIRONMENT.md
  LINE_FLEX_MESSAGE.md
```

## API

```text
GET  /api/billings
POST /api/billings
GET  /api/customers
POST /api/customers
POST /api/billings/:id/action
POST /api/line-webhook
```

`/api/billings/:id/action` รับ body:

```json
{ "action": "invoice" }
```

ค่า `action` ที่ใช้ได้:

```text
invoice
reminder
paid
```
