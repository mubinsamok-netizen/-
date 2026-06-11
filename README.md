# ระบบอ่านบิล AI จาก LINE ด้วย Make

โปรเจกต์นี้ใช้สำหรับแทนการเก็บสลิปลง LINE Album แบบเดิม

เป้าหมายหลัก:

```text
เจ้านายส่งรูปสลิปใน LINE กลุ่ม พร้อม note เช่น "มูบิน ประชาอุทิศ 13 ค่าช่าง"
ระบบอ่านข้อมูลจากรูปสลิป
ระบบอ่าน คน / ไซต์ / หมวด จาก note
ระบบเก็บรูปเข้า Google Drive
ระบบบันทึกข้อมูลลง Google Sheets
ใช้ Google Sheets filter ตามคนและไซต์แทน LINE Album
```

## หลักการของระบบ

```text
LINE = ช่องทางรับรูปและ note/caption
Make = ตัวทำ automation ทั้งหมด
Gemini = ตัวอ่านข้อมูลจากรูปสลิปและ note
Google Drive = ที่เก็บรูปหลักฐาน
Google Sheets = ฐานข้อมูลสำหรับค้นย้อนหลังและ filter ตามคน/ไซต์
```

## รูปแบบข้อความที่แนะนำ

```text
มูบิน ประชาอุทิศ 13 ค่าช่าง
```

ระบบควรแยกเป็น:

```text
เจ้าของอัลบั้ม = มูบิน
ไซต์ = ประชาอุทิศ 13
หมวดรายการ = ค่าช่าง
```

## เอกสารในโฟลเดอร์นี้

อ่านตามลำดับนี้:

```text
01-ภาพรวม-flow.md
02-โครงสร้าง-google-drive-and-sheet.md
03-prompt-gemini.md
04-make-step-by-step.md
05-checklist-ทดสอบระบบ.md
```

## Resource ปัจจุบัน

Google Sheet:

```text
ฐานข้อมูลสลิปโอนเงิน
https://docs.google.com/spreadsheets/d/1xhAvdc3EGNmxxYtmeqYyMOOVNsebxA5ghOHVTcxbv9I/edit
```

Google Drive:

```text
ระบบอ่านบิล AI
https://drive.google.com/drive/folders/1fK-luXNXlTPrfhPFXu157f14XYFnWyFG
```

โฟลเดอร์สำคัญ:

```text
01_รอแท็กชื่อ
https://drive.google.com/drive/folders/1_0g_OM3bHrhfqwXirdwyC47-xQHIRByI

02_แยกตามคน
https://drive.google.com/drive/folders/1MxnjPqG5lVCcICRPm8m8ALT8HA0CnxAH

03_ไม่รู้ชื่อ
https://drive.google.com/drive/folders/1wAGUK9EOL3taw8ddlCsTBPNyBIhVxsDu

04_รายการซ้ำ
https://drive.google.com/drive/folders/1X2xD3cAV6Whj9LTranNw8MctX1-umjwM

05_ผิดพลาด
https://drive.google.com/drive/folders/1ZJrw2zQj_WUaPEfUkYv4BUb9JIupcRUV
```
