# 04 วิธีทำใน Make แบบ Step by Step

เอกสารนี้ปรับเป็นแนวทาง **แบบ A-first**:

```text
รูปสลิป + note/caption -> จบใน image route ให้มากที่สุด
```

ตัวอย่าง note:

```text
มูบิน ประชาอุทิศ 13 ค่าช่าง
```

## ภาพรวม Scenario

ใช้ scenario เดียว แยก route เป็น image และ text:

```text
LINE Watch Events
-> Iterator
-> Router
   -> image route หลัก
   -> text route fallback
```

## Route image หลัก

```text
image route
-> HTTP Download a file
-> Gemini Upload a file
-> Gemini Generate a response พร้อม prompt + note/caption
-> JSON Parse
-> Google Drive Upload a File
-> Google Sheets Add a Row
-> LINE Reply
```

## Route text fallback

ใช้เฉพาะกรณี LINE/Make ไม่ส่ง note/caption มากับ image event

```text
text route
-> Google Sheets Search Rows: รายการสลิป ที่ สถานะแท็ก = รอแท็กชื่อ
-> Google Sheets Update a Row
-> LINE Reply
```

---

# A. ตั้งต้น LINE

## Module 1: LINE Watch Events

เพิ่ม module:

```text
LINE > Watch Events
```

ตั้ง webhook แล้วนำ URL ไปใส่ใน LINE Developers

เปิด:

```text
Use webhook = Enabled
```

## Module 2: Iterator

เพิ่ม:

```text
Tools > Iterator
```

Array:

```text
events[]
```

## Module 3: Router

เพิ่ม Router แล้วแยก 2 route:

```text
Route image
Route text
```

Filter image:

```text
message.type Equal to image
```

Filter text:

```text
message.type Equal to text
```

---

# B. Route image

## Module 4: HTTP Download a file

เพิ่ม:

```text
HTTP > Download a file
```

Authentication:

```text
No authentication
```

URL:

```text
https://api-data.line.me/v2/bot/message/{{message.id}}/content
```

Header:

```text
Authorization = Bearer LINE_CHANNEL_ACCESS_TOKEN
```

ต้อง map `message.id` จาก Iterator

## Module 5: Gemini Upload a file

เพิ่ม:

```text
Google Gemini AI > Upload a file
```

File:

```text
ไฟล์จาก HTTP Download a file
```

MIME type:

```text
image/jpeg
```

File name:

```text
{{message.id}}.jpg
```

## Module 6: Gemini Generate a response

เพิ่ม:

```text
Google Gemini AI > Generate a response
```

Model:

```text
Gemini 2.5 Flash หรือ Flash รุ่นล่าสุดที่บัญชีมี
```

Messages:

```text
Role = User
Part 1 = prompt จาก 03-prompt-gemini.md + LINE note/caption
Part 2 = File จาก Gemini Upload a file
```

ถ้า Make มี field note/caption จาก image event ให้ต่อท้าย prompt:

```text
LINE note/caption:
{{LINE_NOTE_OR_CAPTION}}
```

ถ้า Make ไม่มี field note/caption ให้ใส่:

```text
LINE note/caption:
NA
```

ถ้ามี response format:

```text
application/json
```

## Module 7: JSON Parse

เพิ่ม:

```text
JSON > Parse JSON
```

JSON string:

```text
ข้อความ output จาก Gemini Generate a response
```

Data structure:

```json
{
  "document_type": "unknown",
  "transfer_datetime": "NA",
  "amount": 0,
  "fee": 0,
  "bank_or_source": "NA",
  "payer_name": "NA",
  "payer_account_masked": "NA",
  "payee_name": "NA",
  "payee_account_masked": "NA",
  "transaction_ref": "NA",
  "merchant_or_vendor": "NA",
  "category": "unknown",
  "album_owner_name": "NA",
  "person_key": "NA",
  "site_name": "NA",
  "site_code": "NA",
  "line_note": "NA",
  "note": "NA",
  "confidence": 0,
  "needs_review": true
}
```

## Module 8: Google Drive Upload a File

เพิ่ม:

```text
Google Drive > Upload a File
```

ช่วงแรก upload เข้า:

```text
01_รอแท็กชื่อ
```

Folder ID:

```text
1_0g_OM3bHrhfqwXirdwyC47-xQHIRByI
```

File:

```text
ไฟล์จาก HTTP Download a file
```

File name:

```text
{{formatDate(now; "YYYYMMDD_HHmmss"; "Asia/Bangkok")}}_{{amount}}_{{message.id}}.jpg
```

ถ้า amount map ยาก ใช้:

```text
{{formatDate(now; "YYYYMMDD_HHmmss"; "Asia/Bangkok")}}_{{message.id}}.jpg
```

## Module 9: Google Sheets Add a Row

เพิ่ม:

```text
Google Sheets > Add a Row
```

Spreadsheet:

```text
ฐานข้อมูลสลิปโอนเงิน
```

Spreadsheet ID:

```text
1xhAvdc3EGNmxxYtmeqYyMOOVNsebxA5ghOHVTcxbv9I
```

Sheet:

```text
รายการสลิป
```

Column range:

```text
A:AI
```

Map คอลัมน์หลัก:

```text
วันที่บันทึก = now
ประเภทแหล่งไลน์ = source.type
ไอดีกลุ่มไลน์ = source.groupId
ไอดีผู้ส่ง = source.userId
ไอดีข้อความรูป = message.id
ไอดีเหตุการณ์เว็บฮุก = webhookEventId
โน้ตสลิป = line_note จาก JSON หรือ note/caption จาก LINE

ประเภทเอกสาร = document_type
วันที่เวลาโอน = transfer_datetime
จำนวนเงิน = amount
ค่าธรรมเนียม = fee
ธนาคาร = bank_or_source
ชื่อผู้โอน = payer_name
เลขบัญชีผู้โอน = payer_account_masked
ชื่อผู้รับเงิน = payee_name
เลขบัญชีผู้รับ = payee_account_masked
เลขอ้างอิง = transaction_ref
ร้านค้า/ผู้ขาย = merchant_or_vendor
หมวดรายการ = category

เจ้าของอัลบั้ม = album_owner_name
รหัสคน = person_key
ไซต์ = site_name
รหัสไซต์ = site_code
ข้อความแท็ก/โน้ต = line_note

สถานะแท็ก = ถ้า album_owner_name ไม่ใช่ NA ให้ใส่ แท็กแล้ว, ถ้า NA ให้ใส่ รอแท็กชื่อ
ลิงก์ไฟล์ Drive = webViewLink จาก Google Drive Upload
ไอดีไฟล์ Drive = file ID จาก Google Drive Upload
JSON จาก AI = raw output จาก Gemini
ความมั่นใจ = confidence
สถานะ = ถ้า album_owner_name ไม่ใช่ NA ให้ใส่ บันทึกแล้ว, ถ้า NA ให้ใส่ รอข้อมูลเพิ่ม
หมายเหตุ = note
```

ถ้า Make ทำเงื่อนไขในช่องยาก ให้เริ่มง่าย ๆ:

```text
สถานะแท็ก = รอแท็กชื่อ
สถานะ = รอข้อมูลเพิ่ม
```

แล้วค่อยปรับเป็น dynamic ภายหลัง

## Module 10: LINE Reply

เพิ่ม:

```text
LINE > Send a Reply Message
```

Reply token:

```text
replyToken จาก Iterator
```

ข้อความ:

```text
รับสลิปแล้วครับ
ยอด: {{amount}} บาท
ผู้รับเงิน: {{payee_name}}
เจ้าของอัลบั้ม: {{album_owner_name}}
ไซต์: {{site_name}}
หมวด: {{category}}

บันทึกลง Drive และ Google Sheets แล้วครับ
```

---

# C. Route text fallback

ใช้เมื่อ LINE ไม่ส่ง note/caption มากับ image event หรือเจ้านายส่ง note ตามหลังรูป

## Module 11: Google Sheets Search Rows

เพิ่มหลัง route text:

```text
Google Sheets > Search Rows
```

Spreadsheet:

```text
ฐานข้อมูลสลิปโอนเงิน
```

Sheet:

```text
รายการสลิป
```

Filter:

```text
สถานะแท็ก Equal to รอแท็กชื่อ
```

Limit:

```text
10
```

## Module 12: Gemini หรือ Text Parser สำหรับ note

ถ้าต้องการแยกคน/ไซต์/หมวดจากข้อความ เช่น:

```text
มูบิน ประชาอุทิศ 13 ค่าช่าง
```

ให้ใช้ Gemini text prompt หรือ rule ง่าย ๆ เพื่อแยก:

```text
เจ้าของอัลบั้ม
ไซต์
หมวดรายการ
รหัสคน
รหัสไซต์
```

เวอร์ชันง่ายที่สุดก่อน:

```text
เจ้าของอัลบั้ม = message.text
ข้อความแท็ก/โน้ต = message.text
สถานะแท็ก = แท็กแล้ว
```

## Module 13: Google Sheets Update a Row

เพิ่ม:

```text
Google Sheets > Update a Row
```

Row number:

```text
Row number จาก Search Rows
```

Update ค่า:

```text
เจ้าของอัลบั้ม = ค่าที่แยกได้ หรือ message.text
ไซต์ = ค่าที่แยกได้
รหัสไซต์ = ค่าที่แยกได้
หมวดรายการ = ค่าที่แยกได้
ข้อความแท็ก/โน้ต = message.text
เวลาแท็ก = now
สถานะแท็ก = แท็กแล้ว
ไอดีข้อความแท็ก = message.id จาก Iterator
สถานะ = บันทึกแล้ว
หมายเหตุ = fallback text route
```

## Module 14: LINE Reply

เพิ่ม:

```text
LINE > Send a Reply Message
```

ข้อความ:

```text
ผูกสลิปกับ note นี้แล้วครับ
{{message.text}}
```

---

# D. เฟสย้ายไฟล์ไปโฟลเดอร์รายคน

ทำหลังจากระบบแยก `รหัสคน` ได้แม่นแล้ว

เพิ่ม logic:

```text
รหัสคน
-> Search Rows ใน tab รายชื่อคน
-> ได้ ไอดีโฟลเดอร์
-> หา/สร้างโฟลเดอร์ไซต์ใต้โฟลเดอร์รายคน เช่น S01_ประชาอุทิศ 13
-> Move file จาก 01_รอแท็กชื่อ ไปโฟลเดอร์ ชื่อคน/ไซต์
```

หัวใจ:

```text
ถ้า รหัสคน ถูก การย้ายไฟล์จะง่าย
ถ้า รหัสไซต์ ถูก จะวางไฟล์ใต้ไซต์ได้แม่น
```
