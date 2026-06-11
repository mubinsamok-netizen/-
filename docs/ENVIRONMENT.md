# การตั้งค่า Environment Variables บน Netlify

ห้ามใส่ LINE token หรือ Google credential ใน frontend หรือไฟล์ที่ขึ้นต้นด้วย `VITE_`

## Google Drive / Google Sheets

Drive ที่ใช้เก็บฐานข้อมูล:

```text
GOOGLE_DRIVE_ID=0AFf9PJLlmSq-Uk9PVA
```

Google Sheet ฐานข้อมูลที่สร้างไว้แล้ว:

```text
GOOGLE_SHEET_ID=1dLYIxFRVvbpv-GL-2Yr6wHBc_QHvYoLbM7oAi781OqY
```

ไฟล์ Sheet:

```text
ฐานข้อมูลระบบวางบิลลูกค้า PMC CONNEXT
https://docs.google.com/spreadsheets/d/1dLYIxFRVvbpv-GL-2Yr6wHBc_QHvYoLbM7oAi781OqY/edit
```

Tabs ที่ระบบใช้:

```text
วางบิล
ลูกค้า
ตั้งค่า
```

## Netlify Environment Variables

ตั้งค่าใน Netlify Site settings > Environment variables:

```text
GOOGLE_SHEET_ID=1dLYIxFRVvbpv-GL-2Yr6wHBc_QHvYoLbM7oAi781OqY
GOOGLE_SERVICE_ACCOUNT_EMAIL=pmc-connext@pcm-connext-login.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=ใส่ private key จาก service account โดยคง \n ตามต้นฉบับ
GOOGLE_BILLINGS_TAB=วางบิล
GOOGLE_CUSTOMERS_TAB=ลูกค้า
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
LINE_TEST_GROUP_ID=C512b905da442874d3bcc318e02a731c9
ENABLE_TEST_LINE_FLEX=FALSE
AUTO_REMINDER_DAYS_BEFORE=3
AUTO_REMINDER_OVERDUE_DAYS=3
```

ถ้าใช้ `GOOGLE_SERVICE_ACCOUNT_JSON` แทนการแยก email/private key ก็ได้ แต่ต้องเก็บใน Netlify Environment Variables เท่านั้น

ตั้ง `ENABLE_TEST_LINE_FLEX=TRUE` เฉพาะตอนต้องการทดสอบ endpoint `/api/test-line-flex` เท่านั้น หลังทดสอบเสร็จควรกลับเป็น `FALSE`

## LINE Webhook

## ตั้งค่าการเตือนอัตโนมัติใน Google Sheet

แก้ได้ที่ tab `ตั้งค่า`:

```text
เปิดแจ้งเตือนอัตโนมัติ = TRUE
เตือนก่อนครบกำหนดกี่วัน = 3
เตือนในวันครบกำหนด = TRUE
ติดตามหลังเลยกำหนดกี่วัน = 3
```

ความหมาย:

```text
เตือนก่อนครบกำหนดกี่วัน = 3      เตือนก่อนครบกำหนด 3 วัน
เตือนในวันครบกำหนด = TRUE        ส่งเตือนในวันครบกำหนด
ติดตามหลังเลยกำหนดกี่วัน = 3     ติดตามหลังเลยกำหนด 3 วัน
```

ระบบจะบันทึกใน tab `วางบิล` ว่าแต่ละรอบส่งแล้วหรือยัง:

```text
ส่งเตือนก่อนครบกำหนดแล้วเมื่อ
ส่งเตือนวันครบกำหนดแล้วเมื่อ
ส่งติดตามหลังเลยกำหนดแล้วเมื่อ
```

เมื่อลูกค้ากดปุ่มใน LINE:

```text
แจ้งชำระเงิน       ระบบเปลี่ยนสถานะเป็น รอตรวจสอบการชำระ
สอบถาม/แจ้งปัญหา  ระบบเปลี่ยนสถานะเป็น รอส่งมอบงาน
```

ข้อความจากลูกค้าจะถูกเก็บใน tab `วางบิล`:

```text
ข้อความจากลูกค้า
รับข้อความลูกค้าเมื่อ
```

หลัง deploy ให้ตั้งค่า Webhook URL ใน LINE Developers:

```text
https://pmcinvoice.netlify.app/api/line-webhook
```
