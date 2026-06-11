# 05 Checklist ทดสอบระบบ

## ทดสอบเฟส 1: รูปพร้อม note/caption

ส่งรูปสลิป 1 รูปใน LINE พร้อม note/caption:

```text
มูบิน ประชาอุทิศ 13 ค่าช่าง
```

ต้องได้ผล:

```text
Make route image วิ่ง
HTTP ดาวน์โหลดรูปผ่าน
Gemini อ่านรูปได้
Gemini อ่าน note/caption ได้
JSON Parse ผ่าน
รูปเข้า Drive
Google Sheet tab รายการสลิป มีแถวใหม่
โน้ตสลิป = มูบิน ประชาอุทิศ 13 ค่าช่าง
เจ้าของอัลบั้ม = มูบิน
ไซต์ = ประชาอุทิศ 13
หมวดรายการ = labor หรือค่าช่างตาม mapping
สถานะแท็ก = แท็กแล้ว
LINE bot ตอบกลับ
```

ถ้า Make ไม่เห็น note/caption ใน image event:

```text
แถวจะเป็น สถานะแท็ก = รอแท็กชื่อ
ให้ใช้ text route fallback
```

## ทดสอบเฟส 2: fallback text route

ส่ง:

```text
รูปสลิป
มูบิน ประชาอุทิศ 13 ค่าช่าง
```

ต้องได้ผล:

```text
image route เพิ่มแถวเป็น รอแท็กชื่อ
text route หาแถวนั้นเจอ
text route update เจ้าของอัลบั้ม / ไซต์ / หมวด
สถานะแท็ก = แท็กแล้ว
```

## ทดสอบเฟส 3: หลายรูปแล้ว note ครั้งเดียว

ส่ง:

```text
รูป 1
รูป 2
รูป 3
มูบิน ประชาอุทิศ 13 ค่าช่าง
```

ต้องได้ผล:

```text
ทั้ง 3 แถวถูก update เป็นเจ้าของอัลบั้มเดียวกัน
ไซต์เดียวกัน
หมวดเดียวกัน
สถานะแท็กของทั้ง 3 แถว = แท็กแล้ว
```

## ปัญหาที่พบบ่อย

### Make ไม่เห็น note/caption ใน image event

สาเหตุ:

```text
LINE อาจส่งรูปกับข้อความเป็นคนละ event
```

วิธีแก้:

```text
ใช้ text route fallback
```

### HTTP error 401

สาเหตุ:

```text
LINE Channel Access Token ผิด
ลืมใส่ Bearer
```

### HTTP error 404

สาเหตุ:

```text
message.id ว่าง
map message.id ผิด
route ไม่ใช่ image
```

### JSON Parse พัง

สาเหตุ:

```text
Gemini ตอบมี markdown เช่น ```json
Gemini ตอบข้อความอธิบายปน JSON
```

แก้:

```text
เพิ่มใน prompt ว่า Return ONLY valid raw JSON.
```

### Search Rows ไม่เจอ row

สาเหตุ:

```text
แถวรูปไม่ได้ใส่ สถานะแท็ก = รอแท็กชื่อ
filter ใช้คำไม่ตรง
เลือก tab ผิด
```

### Update a Row error rowNumber

สาเหตุ:

```text
Search Rows ไม่เจอ row
ไม่ได้ map Row number จาก Search Rows
```

## เกณฑ์ว่าพร้อมใช้งานจริง

ถือว่าพร้อมใช้จริงเมื่อ:

```text
ส่งรูปพร้อม note แล้วลง Sheet ได้
Gemini แยกคน / ไซต์ / หมวด ได้
รูปเข้า Drive ทุกครั้ง
ค้นย้อนหลังใน Sheet ด้วย เจ้าของอัลบั้ม / ไซต์ ได้
fallback text route ใช้ได้ถ้า note ไม่มากับรูป
```
