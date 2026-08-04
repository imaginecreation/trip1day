# เอกสารข้อกำหนดระบบ (System Requirements Specification) — v10
**ชื่อโครงการ:** ระบบบันทึกเบิกค่าเดินทาง (Mileage Reimbursement System) - Phase 2 (Multi-Trip, Multi-Site)
**Platform:** LINE LIFF (Mobile-first Web App)
**วันที่จัดทำ:** 31 กรกฎาคม 2026
**สถานะ:** พร้อมส่งต่อให้ Developer (v10 แก้ไข: (1) Toggle "เที่ยวเดียว/ไปกลับ" ให้แสดงทั้งเส้นทาง Fix และ Custom — Custom ไม่คูณ 2 ให้ (ผู้ใช้กรอกระยะทางจริงเองเหมือนเดิม) แต่**บันทึกสถานะ `trip_type` ลง JSON เสมอทั้งคู่**เพื่อให้ HR ตรวจสอบย้อนหลังได้ว่าค่าที่คำนวณมาจากระยะทางแบบไหน (2) เพิ่มข้อกำหนดการ Pin Version ของ Library ภายนอกที่โหลดผ่าน CDN (unpkg.com หรืออื่นๆ) ให้ระบุเลข Version เจาะจงเสมอ ห้ามใช้ Link แบบไม่ระบุ Version หรือ `@latest` — ส่วนอื่นทั้งหมดคงเดิมจาก v9)

> **หมายเหตุถึงผู้ตรวจทาน:** v10 แก้ไข 2 เรื่องตามคำขอ (1) เดิม Toggle "ไปกลับ" ซ่อนทั้งหมดสำหรับเส้นทาง Custom — ตอนนี้เปลี่ยนเป็น**แสดง Toggle เหมือนกันทั้ง Fix และ Custom** ต่างกันแค่ผลต่อการคำนวณ: Fix คูณ 2 อัตโนมัติเหมือนเดิม ส่วน Custom ไม่คูณ (ผู้ใช้กรอกระยะทางรวมจริงเองเหมือนเดิม) แต่ทั้งคู่ต้องบันทึก `trip_type` ("SINGLE"/"ROUND_TRIP") ลงใน `Trip_Details` JSON เสมอ เป็นข้อมูล Audit ให้ HR ตรวจสอบว่าค่าที่คำนวณมาจากการเดินทางแบบเที่ยวเดียวหรือไปกลับ ดูรายละเอียดข้อ 2.4/3.2/3.4 (2) เพิ่มข้อกำหนดใหม่ข้อ 5.3 เรื่อง Pin Version ของ External Library/CDN (เช่น unpkg.com) เพื่อป้องกันปัญหาที่เคยเจอ — Provider อัปเดต Version โดยไม่แจ้งล่วงหน้าแล้วทำให้ระบบ error ทั้งที่โค้ดฝั่งเราไม่ได้แก้อะไรเลย

> **หมายเหตุถึงผู้ตรวจทาน:** v9 เพิ่ม 1 เรื่องตามคำถามเรื่อง Performance/UX ของ Dropdown "SITE งาน" เมื่อ `Master_Site` มีจำนวนมาก (50-70 แถว) — สรุปคือ**ไม่กระทบ Performance การโหลด** (ข้อมูลเล็กมาก + มี Cache อยู่แล้วตามข้อ 4.6.3) แต่ประเด็นจริงคือ**หา Site เจอยากบนจอเล็กถ้าลำดับไม่เป็นระเบียบ** จึงเพิ่มข้อกำหนดให้ Backend **เรียงลำดับ `Master_Site` ตาม `Site_Name` (A-Z/ก-ฮ) ก่อนส่งให้ Frontend เสมอ** (ทำครั้งเดียวตอน Cache ไม่ใช่ให้ Frontend เรียงเอง) ดูรายละเอียดในข้อ 2.1b และ 4.6.3

> **หมายเหตุถึงผู้ตรวจทาน:** v8 เพิ่ม 2 ฟังก์ชันตามคำขอ (1) `dailyMaintenance()` — Job ลบ Transaction ที่ `Req_Date` เก่ากว่าจำนวนวันที่กำหนดไว้ในค่าคงที่ `RETENTION_DAYS` (ปรับค่าได้ภายหลังโดยไม่ต้องแก้ Logic) เพื่อกันข้อมูลสะสมมากเกินไปจนกระทบ Performance ตามหลักข้อ 4.6 — ก่อนลบทุกครั้งต้องเรียก `sendData()` สำรองข้อมูลก่อนเสมอ (2) `sendData()` — ฟังก์ชันกลาง **ไม่รับพารามิเตอร์**, ทุกครั้งที่ถูกเรียกจะสำรอง**ข้อมูลทั้งหมดของ Sheet `Transactions`** (ไม่ใช่เฉพาะแถวที่จะลบ) เป็นไฟล์ Excel (.xlsx) แล้วแนบส่งอีเมลไปยังผู้รับที่ระบุในค่าคงที่ `MAINTENANCE_EMAIL_RECIPIENTS` (รองรับมากกว่า 1 คน) ทำงานเหมือนกันทุกครั้งไม่ว่าจะถูกเรียกจาก `dailyMaintenance()` ก่อนลบ หรือเรียกแบบ Standalone ที่ผู้ใช้ตั้ง Time-based Trigger เองตามรอบเวลาที่ต้องการ — ดูรายละเอียดในข้อ 4.7/4.8

---

## 1. ภาพรวมของระบบ (Project Overview)

อัปเกรดระบบบันทึกเบิกค่าเดินทางเดิม (v1.4.2, Single-Trip) → **Multi-Trip + Multi-Site per Day** โดย 1 Record ผูกกับ **1 วัน + 1 คน + 1 Site งาน** และภายใน Record นั้นมีได้หลายเส้นทางย่อย (Trip Card) เพื่อ:

1. ลดจำนวน Row/Transaction ที่ซ้ำซ้อนในวันเดียวกัน (ป้องกันปัญหา Key ซ้ำ / แถวซ้ำที่ทำให้ผู้อนุมัติสับสน)
2. ให้ผู้อนุมัติเห็นทุกเส้นทางของวันนั้นในหน้าจอเดียว ตรวจสอบง่ายและเร็วขึ้น
3. ลดข้อผิดพลาดของระยะทาง ด้วยเส้นทาง Fix (ล็อก KM มาตรฐาน) และเปิดช่องให้ระบุเอง (Custom) เฉพาะกรณีเดินทางนอกเส้นทางปกติ พร้อม Audit ว่าเส้นทางใดเป็น Fix / Custom
4. *(v6 — ใหม่)* รองรับพนักงานที่ไปมากกว่า 1 Site ในวันเดียวกัน โดยแยกเป็นคนละ Record (คนละ Site คนละใบอนุมัติ) แต่ยังเห็นภาพรวมทุก Site ของวันนั้นในหน้าจอเดียวก่อนเข้าไปทำรายการ (ดูข้อ 3.0)

**Non-Goals (ไม่ได้ทำใน Phase นี้):** ไม่มีระบบอนุมัติหลายลำดับขั้น (Multi-level Approval), ไม่มีการคำนวณ overtime/เบี้ยเลี้ยงร่วม, ไม่มี Native App — เป็น Web App บน LIFF เท่านั้น

---

## 2. โครงสร้างฐานข้อมูล (Database Schema — Google Sheets)

สถาปัตยกรรม **Header-Detail**: เก็บ Trip ย่อยเป็น JSON Array ในคอลัมน์เดียว (`Trip_Details`) เพื่อลด I/O ของ GAS

### 2.1 Sheet: `users_profile` *(v7 — ใหม่, แทนที่ `Master_Vehicles` ที่ตัดออกทั้งหมด)*
ใช้ผูกข้อมูลผู้ใช้กับ LINE UID เพื่อ Auto-fill ชื่อ, ทะเบียนรถ, และกลุ่มอัตรา ตอนเปิดแอป — มาจากตารางที่ผู้ใช้แนบมา:

| Column | Type | หมายเหตุ |
|---|---|---|
| `Line_uid` | String | Primary Key — Match กับ `liff.getProfile().userId` |
| `requester_name` | String | ชื่อผู้ขอเบิก — ใช้ Auto-fill ช่อง "ชื่อผู้ขอเบิก" ใน Header (ดู 3.1) |
| `car_no` | String | ทะเบียนรถ — ใช้ Auto-fill ช่อง "เลขทะเบียนรถ" ใน Header (ยังเป็น Free text แก้ไขได้ตามปกติ ไม่ใช่ Dropdown) |
| `group_car` | Number | กลุ่มอัตรา บาท/กม. ของ**คนนี้** — ค่าปัจจุบันมีแต่ `1` หมายถึงใช้อัตราจากคอลัมน์ `Rate_Car.group_car1` ถ้าเป็น `2` ก็ใช้ `Rate_Car.group_car2` (ดู Logic ที่แก้ไขในข้อ 2.3b) |

**Logic การ Auto-fill:** ทันทีที่ `liff.init()` สำเร็จและได้ `lineUserId` มา ให้เรียก `getDataOnLoad(lineUserId)` (ดู 4.1) ซึ่งรวมการค้นหาแถวใน `users_profile` ที่ `Line_uid` ตรงกันไว้ในนั้นเลย (ลด round-trip ตามหลัก Performance ข้อ 4.6) **ถ้าพบ** → Auto-fill `requester_name` และ `car_no` ลงในช่อง Header ทันที (ผู้ใช้ยังแก้ไขได้เผื่อข้อมูล default ผิด) และเก็บ `group_car` ไว้ใช้คำนวณอัตราตอน Submit **ถ้าไม่พบ** (ยังไม่เคยลงทะเบียน) → ปล่อยช่องชื่อ/ทะเบียนว่างให้พิมพ์เอง และใช้ `group_car` default เป็น `1`

### 2.1b Sheet: `Master_Site` *(ใหม่ — ตัวขับเคลื่อนการกรองเส้นทางตัวจริง)*
คือ "SITE งาน / ปลายทาง" ที่เห็นเป็นช่องพิมพ์อิสระในหน้าจอเดิม — v5 เปลี่ยนเป็น Master data ที่กำหนดไว้ล่วงหน้า เพื่อผูกกับเส้นทางที่เลือกได้ในแต่ละ Site

| Column | Type | หมายเหตุ |
|---|---|---|
| `Site_ID` | String | Primary Key |
| `Site_Name` | String | ชื่อ Site แสดงใน Dropdown (เช่น "คลังขอนแก่น", "โครงการ ABC สาขาอุดร") |
| `Active` | Boolean | ซ่อน Site ที่เลิกใช้งานจาก Dropdown |

**Sorting (v9 — ใหม่, สำคัญเมื่อจำนวน Site เยอะ):** เมื่อจำนวนแถวใน `Master_Site` มีมาก (ระดับ 50-70 แถวขึ้นไป) การ Render Dropdown เองไม่ช้า (ดูเหตุผลที่ 4.6.3) แต่ผู้ใช้จะหา Site ที่ต้องการเจอยากบนจอมือถือถ้าลำดับไม่เป็นระเบียบ — **Backend ต้องเรียงข้อมูล `Active = TRUE` ตาม `Site_Name` (A-Z/ก-ฮ) ก่อนส่งให้ Frontend เสมอ** ทำครั้งเดียวตอนอ่าน/Cache ข้อมูล (ไม่ใช่ให้ Frontend เรียงเอง) เพื่อให้ผู้ใช้ scroll หาแบบเรียงตัวอักษรได้ทันที ไม่ต้องพิมพ์กรอง (ยังไม่จำเป็นต้องทำ Searchable/Autocomplete Dropdown ในเฟสนี้ที่จำนวน Site ยังอยู่ระดับ 50-70 — ถ้าในอนาคตโตเกิน ~100 แถวค่อยพิจารณาเพิ่ม Searchable Dropdown ทีหลัง)

### 2.1c Sheet: `Approve_users` *(v7 — ใหม่, ปรับให้ตรงกับโครงสร้าง Sheet จริงที่ใช้งานอยู่)*
แหล่งข้อมูลสำหรับ Dropdown "ส่งขออนุมัติไปยัง" ที่มีอยู่แล้วในหน้าจอเดิม (ท้ายฟอร์ม ก่อนปุ่มบันทึก — ดู 3.1 ข้อ 5) โครงสร้างคอลัมน์ตามที่ใช้งานจริง:

| Column | Type | หมายเหตุ |
|---|---|---|
| `approve_request` | String | ชื่อผู้อนุมัติที่แสดงเป็นตัวเลือกใน Dropdown — ดึงคอลัมน์นี้มาเป็น Label ของแต่ละตัวเลือก |
| `line_profile` | String | รหัสอ้างอิงภายใน (เช่น รหัสพนักงาน) — เก็บไว้เป็นข้อมูลประกอบ ไม่ได้ใช้ในการเลือก/กรองใด ๆ ของเฟสนี้ |
| `line_uid` | String | LINE UID ของผู้อนุมัติคนนั้น — **เตรียมไว้สำหรับอนาคต** (เช่น ส่ง LINE Notify/Flex Message แจ้งเตือนผู้อนุมัติโดยตรงตอนมีรายการใหม่ หรือใช้ยืนยันตัวตนตอนกดอนุมัติ) ยังไม่ต้องมี Logic ใช้งานจริงในเฟสนี้ |
| `Active` | Boolean | *(v7 — เพิ่มใหม่ตามคำแนะนำ)* ซ่อนผู้อนุมัติที่ไม่ได้ใช้งานแล้วออกจาก Dropdown โดยไม่ต้องลบแถวประวัติ (ถ้ายังไม่มีคอลัมน์นี้ใน Sheet จริง ให้เพิ่มคอลัมน์ใหม่แล้ว default เป็น `TRUE` ทุกแถวเดิม)

### 2.2 Sheet: `Master_Routes` *(v5 — เปลี่ยนความสัมพันธ์จาก Branch เป็น Site)*
| Column | Type | หมายเหตุ |
|---|---|---|
| `Route_ID` | String | Primary Key |
| `Site_ID` | String | *(v5 — แทนที่ `Branch`)* FK → `Master_Site.Site_ID` — ตัวนี้คือตัวที่ระบบใช้กรอง Dropdown เส้นทางในแต่ละ Trip Card |
| `Route_Name` | String | ชื่อที่แสดงใน Dropdown |
| `Origin` / `Destination` | String | |
| `Distance_KM` | Number | ระยะทางมาตรฐาน (อนุญาตทศนิยม 1 ตำแหน่ง) |
| `Active` | Boolean | ซ่อนเส้นทางที่เลิกใช้ |

### 2.3 Sheet: `Master_Config` *(ใหม่ — สำคัญ)*
เดิม v2 ไม่ได้ระบุที่มาของ **ค่ารถเหมา 150 บาท** ที่เห็นในภาพหน้าจอ ถ้า hardcode ในโค้ด Frontend จะแก้อัตราทีต้อง deploy ใหม่ทุกครั้ง — ให้ดึงจาก Sheet นี้แทน (อัตรา บาท/กม. แยกไปอยู่ Sheet `Rate_Car` ในข้อ 2.3b เพราะเป็นอัตราแบบ **มีผลตามช่วงวันที่**):

| Key | Value | หมายเหตุ |
|---|---|---|
| `FLAT_RATE_FEE` | 150 | บาทต่อวันเมื่อเปิดสวิตช์ "ค่ารถ" |
| `MAX_TRIPS_PER_DAY` | 10 | ใช้จำกัดการกดเพิ่ม Trip Card ฝั่ง Frontend + validate ซ้ำฝั่ง Backend |
| `MIN_TRIPS_PER_DAY` | 1 | |

### 2.3b Sheet: `Rate_Car` *(ใหม่ — ตามข้อมูลที่ผู้ใช้แนบมาเพิ่มเติม)*
อัตราบาท/กม. ไม่ใช่ค่าคงที่ แต่ **ผูกกับวันที่มีผล (Effective Date)** — เมื่อประกาศอัตราใหม่ ให้เพิ่มแถวใหม่โดยไม่ต้องลบแถวเก่า (เก็บประวัติอัตราไว้ audit ย้อนหลังได้):

| Column | Type | หมายเหตุ |
|---|---|---|
| `dt_date` | Date (ISO `YYYY-MM-DD`) | วันที่เริ่มมีผลของอัตรานี้ |
| `group_car1` | Number | อัตรา บาท/กม. ของกลุ่มรถ 1 — **กลุ่มเดียวที่ใช้งานจริงตอนนี้** |
| `group_car2`, ... | Number | เตรียมไว้สำหรับรถกลุ่มอื่นในอนาคต — สร้างคอลัมน์รอไว้ได้แต่ยังไม่ต้องมี Logic ใช้งานในเฟสนี้ |

ตัวอย่างข้อมูล:
| dt_date | group_car1 | group_car2 |
|---|---|---|
| 2026-01-01 | 4 | 4 |
| 2026-04-17 | 5 | 5 |
| 2026-06-26 | 4.8 | 4.8 |

**Logic การหาอัตราที่ใช้ (`getRateForDate(reqDate, groupCarNumber)`):** หาแถวที่ `dt_date` **มากที่สุดแต่ยังน้อยกว่าหรือเท่ากับ** `reqDate` (ไม่ใช่มากกว่า) แล้วอ่านค่าจากคอลัมน์ที่ชื่อ `"group_car" + groupCarNumber` (ประกอบชื่อคอลัมน์แบบ Dynamic เช่น `groupCarNumber = 1` → อ่านคอลัมน์ `group_car1`) โดย `groupCarNumber` มาจาก `users_profile.group_car` ของผู้ใช้คนนั้น (v7 — เปลี่ยนจาก `Master_Vehicles.Rate_Group` เดิมที่ผูกกับรถ) ถ้าหา `users_profile` ของคนนั้นไม่เจอเลย ให้ default `groupCarNumber = 1` ตัวอย่าง: `Req_Date = 2026-07-28`, `groupCarNumber = 1` → แถวที่เข้าเงื่อนไขล่าสุดคือ `2026-06-26` → อ่านคอลัมน์ `group_car1` → ใช้อัตรา 4.8 หากไม่พบแถวใดเลยที่ `dt_date <= reqDate` (เช่น key ข้อมูลย้อนหลังก่อนอัตราแรกมีผล) ให้ Backend ตอบ error `VALIDATION_ERROR` แจ้งว่ายังไม่มีอัตราที่ประกาศสำหรับวันที่นี้ ห้ามเดาใช้อัตราแถวแรกโดยพลการ

### 2.4 Sheet: `Transactions`
1 แถว = 1 วัน + 1 คน + **1 Site** (**v6 — เปลี่ยนจาก "1 วัน + 1 คน" ใน v5** เพราะพนักงานอาจไปหลาย Site ในวันเดียวกัน แต่ละ Site ต้องแยก Record เพื่อให้ผู้อนุมัติตรวจทีละ Site ได้ — ดูหน้าจอ Day Summary List ข้อ 3.0 และฟังก์ชัน Backend ข้อ 4.2/4.3)

| Column | Type | หมายเหตุ |
|---|---|---|
| `Transaction_ID` | String | Primary Key (UUID) |
| `Req_Name` | String | ดึงจาก LIFF Profile อัตโนมัติ (แก้ไขได้) |
| `Req_LINE_UserId` | String | เก็บ LINE `userId` ไว้คู่กับชื่อ — **v6: เป็นส่วนหนึ่งของ Key คู่กับ `Req_Date` + `Site_ID`** (ดู 4.2/4.3) |
| `Req_Date` | Date (ISO `YYYY-MM-DD`) | **v7 — ต้องระบุ Timezone ชัดเจน:** ค่า default ของ field นี้ต้องคำนวณจากวันที่ปัจจุบันใน **Timezone `Asia/Bangkok` (UTC+7) เสมอ** ห้ามใช้ Timezone ของ Browser/Device หรือ Default ของ Server เพราะถ้า Server รันอยู่คนละ Timezone (เช่น UTC) การ key ข้อมูลช่วงเช้ามืดของไทยจะได้วันที่ของ "เมื่อวาน" ผิดเพี้ยน — ดู 4.5 สำหรับวิธีคำนวณทั้งฝั่ง Frontend/Backend |
| `Plate_No` | String | *(v7)* ผู้ใช้พิมพ์อิสระ, Auto-fill ค่าเริ่มต้นจาก `users_profile.car_no` ตาม LINE UID (แก้ไขได้ — ดู 2.1) — เป็นข้อมูลประกอบเท่านั้น **ไม่ใช้เป็น Key และไม่ใช้กรองเส้นทาง** |
| `Site_ID` / `Site_Name` | String | Site งานที่เลือกจาก `Master_Site` — **v6: เป็นส่วนหนึ่งของ Key หลักของ Record นี้** (คู่กับ `Req_Date`+`Req_LINE_UserId`) เลือกได้ครั้งเดียวตอนสร้าง Record ใหม่จาก Day Summary List (ข้อ 3.0) แล้ว **ล็อกทันทีหลัง Save ครั้งแรก** ไม่ให้แก้ไข Site ของ Record ที่มีอยู่แล้ว (ถ้าเลือกผิด ให้ติดต่อผู้ดูแลระบบแก้ไขตรง Sheet เหมือนนโยบายของ `APPROVED` ในข้อ 4.4) — และเป็นตัวกรอง Dropdown เส้นทางในทุก Trip Card ของ Record นี้ (ดู 3.2)
| `Travel_Purpose` | String | |
| `Image_URL` | String | รูปแนบของทั้งวัน (ไม่ผูกกับ Trip ใดเส้นหนึ่ง) |
| `Total_KM` | Number | คำนวณจาก Trip_Details แล้ว **คำนวณซ้ำฝั่ง Backend เสมอ** (ห้ามเชื่อค่าที่ Frontend ส่งมาตรง ๆ — กัน manipulate) |
| `Toll_Fee` / `Park_Fee` | Number | รวมทั้งวัน |
| `Flat_Rate_Fee` | Number | 0 หรือค่าจาก `Master_Config.FLAT_RATE_FEE` |
| `Net_Total` | Number | = `Total_KM` × อัตราจาก `Rate_Car` (ตามวันที่ + `users_profile.group_car` — v7) + Toll + Park + Flat — คำนวณฝั่ง Backend ทั้งหมด ดูสูตรละเอียดในข้อ 3.4 |
| `Approver` | String | *(v7)* เลือกจาก Dropdown ที่ดึงค่ามาจาก `Approve_users.approve_request` (ดู 2.1c/3.1) |
| `Status` | String enum: `DRAFT` \| `PENDING` \| `APPROVED` \| `REJECTED` | ดูข้อ 4.4 เรื่อง Edit-Lock |
| `Approve_Datetime` | DateTime (ISO) | *(v7 — ใหม่)* วันที่-เวลาที่มีการอนุมัติ — ในเฟสนี้เตรียมคอลัมน์ไว้เฉยๆ (ยังไม่มีฟังก์ชัน "อนุมัติ" ให้ค่านี้เขียนเอง จะทำเพิ่มในเฟสถัดไปตามที่แจ้ง) ปล่อยว่างตอน Insert/Update ปกติ |
| `Trip_Details` | JSON String | ดูโครงสร้างด้านล่าง |
| `Created_At` / `Updated_At` | DateTime (ISO) | Audit timestamp |

**โครงสร้าง `Trip_Details` (v4 — เพิ่ม `trip_id` ที่ไม่ซ้ำ แทนการอิง `trip_no` ลำดับอย่างเดียว เพราะเมื่อลบการ์ดกลาง ลำดับ trip_no จะสับสน, และย้าย `trip_type` เข้ามาไว้ระดับนี้แทนที่จะเป็นระดับทั้งวัน / v10 — `trip_type` เก็บทั้ง `FIX` และ `CUSTOM` แล้ว ไม่ใช่ `null` สำหรับ Custom อีกต่อไป เพื่อเป็นข้อมูล Audit ให้ HR ตรวจสอบว่าค่าที่คำนวณมาจากระยะทางแบบไหน — ดู 3.4 สำหรับผลต่อการคำนวณที่ยังต่างกันระหว่าง Fix/Custom):**

```json
[
  {
    "trip_id": "t-8f3a",
    "trip_no": 1,
    "type": "FIX",
    "trip_type": "ROUND_TRIP",
    "route_id": "RT-045",
    "route_name": "คลังขอนแก่น -> สาขาอุดร",
    "origin": "คลังขอนแก่น",
    "dest": "สาขาอุดร",
    "km": 50
  },
  {
    "trip_id": "t-2b91",
    "trip_no": 2,
    "type": "CUSTOM",
    "trip_type": "ROUND_TRIP",
    "route_id": null,
    "route_name": "ระบุเอง",
    "origin": "สาขาอุดร",
    "dest": "ร้านลูกค้า X",
    "km": 24
  }
]
```
*(ตัวอย่างข้างต้น: Card 1 เป็น Fix ไปกลับ → Backend จะคูณ 2 จาก `km: 50` มาตรฐานตอนคำนวณ (ไม่แก้ค่า `km` ใน JSON) ส่วน Card 2 เป็น Custom ไปกลับ → ผู้ใช้กรอก `km: 24` เป็นระยะทางรวมไป-กลับที่วัดจริงเองแล้ว Backend ใช้ค่านี้ตรง ๆ ไม่คูณซ้ำ — `trip_type: "ROUND_TRIP"` ที่เก็บไว้เป็นเพียงข้อมูล Audit บอกว่าเที่ยวนี้เป็นการเดินทางไปกลับ ไม่ได้มีผลต่อสูตรคำนวณของ Custom)*
`trip_id` สร้างฝั่ง Frontend ตอนเพิ่มการ์ด (เช่น `crypto.randomUUID()` หรือ timestamp+random) ใช้เป็น React/DOM key และอ้างอิงตอนลบ/แก้ — ไม่ผูกกับลำดับการวางบนจอ

`trip_type` (v10 — ใช้ค่าเดียวกันทั้ง `type = "FIX"` และ `type = "CUSTOM"` แล้ว): ค่าที่เป็นไปได้คือ `"SINGLE"` (เที่ยวเดียว, default) หรือ `"ROUND_TRIP"` (ไปกลับ) — ห้ามเป็น `null` ไม่ว่า Trip นั้นจะเป็น FIX หรือ CUSTOM (ดูข้อ 3.2/3.4 สำหรับผลต่อการคำนวณที่ยังต่างกันระหว่าง Fix/Custom)

---

## 3. ข้อกำหนด UI/UX (Mobile-First — ต่อยอดจาก Layout เดิมในภาพแนบ)

### 3.0 หน้าจอแรก (Entry Point) — Day Summary List *(v6 — ใหม่)*

เมื่อ 1 คนอาจมีได้หลาย Record ในวันเดียวกัน (คนละ Site) หน้าแรกที่เปิดแอปต้อง**ไม่พาผู้ใช้เข้าฟอร์มบันทึกทันที** แต่ต้องให้เห็นภาพรวมของวันนั้นก่อน เพื่อกันบันทึกซ้ำ/ตกหล่น Site และกันความเสี่ยงข้อมูลหายจากการสลับ Site กลางฟอร์ม (ดูเหตุผลเปรียบเทียบกับแนวทาง "silent lookup ตอนเลือก Site" ที่ตัดสินใจไม่ใช้)

**Flow:**
1. เปิดแอป → `liff.init()` → ได้ `lineUserId` → เลือกวันที่ (default วันนี้)
2. เรียก `listTransactionsByDate(date, lineUserId)` (ดูข้อ 4.2) — Read-only, ไม่ต้องขอ Lock
3. **ถ้าไม่มี Record เลยของวันนั้น:** แสดง Empty State พร้อมปุ่มใหญ่ `[ + เริ่มบันทึกการเดินทาง ]` กดแล้วเข้าฟอร์มเปล่าทันที (บังคับเลือก SITE งานก่อนถึงจะเพิ่ม Trip Card ได้ — ตาม 3.1) ผู้ใช้ที่ไป Site เดียวต่อวัน (เคสส่วนใหญ่) แทบไม่รู้สึกว่าเพิ่มขั้นตอนจากเดิม
4. **ถ้ามี Record อยู่แล้ว:** แสดงเป็น List การ์ดสรุปทีละ Site เช่น:
   - "📍 คลังขอนแก่น · 3 เส้นทาง · 620฿ · 🟡 รออนุมัติ" (แตะ = เปิด Edit Mode ผ่าน `getTransactionDetail`)
   - "📍 สาขาอุดร · 1 เส้นทาง · 240฿ · 🟢 อนุมัติแล้ว" (แตะ = เปิดแบบ Read-only ตามข้อ 4.4)
   - ปุ่ม `[ + เพิ่ม Site ใหม่ ]` ท้าย List เสมอ
5. กด `+ เพิ่ม Site ใหม่` → ฟอร์มเปล่า → Dropdown SITE งาน **ต้องซ่อน/ไม่ให้เลือก Site ที่มี Record อยู่แล้วของวันนั้นซ้ำ** (ป้องกันสร้าง Record ซ้อนตั้งแต่ต้นทาง โดยไม่ต้องรอ Backend reject) — ถ้าเผลอเกิด race กัน (2 แท็บ) Backend ยังมี validation สำรองด้วย `error_code: "DUPLICATE_SITE_RECORD"` (ดู 4.3)

### 3.1 Layout Structure (หน้าจอฟอร์มบันทึก/แก้ไข — 1 Record ต่อ 1 Site)

**Constraint เดิม (คงไว้):** ห้ามตัด Header Section และ Summary Section (บล็อกสีฟ้า) ทิ้ง ปรับปรุงเฉพาะ Section กลาง (จาก/ถึง/ระยะทาง เดิม 1 ชุด) ให้เป็น **Dynamic Trip Card List**

1. **Header Section (v7 — แก้ไข):** ชื่อผู้ขอเบิก และ **เลขทะเบียนรถ** (ทั้งคู่ Auto-fill จาก `users_profile` ตาม LINE UID ถ้าพบข้อมูล — ยังแก้ไขได้เผื่อ default ผิด, ดู 2.1), วันที่ (default = วันนี้ตาม Timezone `Asia/Bangkok` เสมอ — ดู 2.4/4.5), **SITE งาน** (Dropdown บังคับเลือกจาก `Master_Site` — เลือกได้ครั้งเดียวตอนสร้าง Record ใหม่ แล้ว **ล็อกทันทีหลัง Save ครั้งแรก** เป็นตัว Trigger กรอง Route ในทุก Trip Card ด้านล่าง) — **ตัด Field "ทีม/ฝ่าย" ออกทั้งหมด**
2. **Dynamic Trip Section (ใหม่):** List ของ Trip Card + ปุ่ม `[ ➕ เพิ่มเส้นทางการเดินทาง ]` ท้าย List
3. **General Details Section (คงเดิม):** รายละเอียดการเดินทาง, แนบรูปภาพ (1 รูปต่อวัน)
4. **Summary Section (บล็อกสีฟ้า — คงเดิม, Data Source ใหม่):** **นำ Dropdown "ประเภทการเดินทาง" เดิมออกจาก Section นี้** (ย้ายไปอยู่ในแต่ละ Trip Card แทน — ดูข้อ 3.2/3.4) เหลือเฉพาะ: ระยะทางรวม (Read-only, sum จากทุก Card ตามสูตรข้อ 3.4), ค่าทางด่วน/ค่าที่จอด/ค่ารถ (กรอกเอง), ยอดเบิกสุทธิ (คำนวณอัตโนมัติ)
5. **Approver Section (v7 — ระบุ Data Source ชัดเจน, Element เดิมจากภาพ v1):** Dropdown "ส่งขออนุมัติไปยัง" อยู่ท้ายฟอร์มก่อนปุ่มบันทึก — ตัวเลือกดึงมาจากคอลัมน์ `approve_request` ใน Sheet `Approve_users` (ดู 2.1c)

### 3.2 Trip Card Component

**Field 1 — `Select Route`:** Searchable dropdown (**ห้ามใช้ native `<select>` เพราะบนมือถือค้นหายาก** — ใช้ custom combobox / bottom-sheet picker ที่พิมพ์ค้นหาได้ และรองรับ tap เลือกด้วยนิ้วขนาดปุ่มขั้นต่ำ 44×44px) รายการที่แสดงกรองจาก **`Master_Routes` ที่ `Site_ID` ตรงกับ SITE งาน ที่เลือกไว้ใน Header เท่านั้น** (v5 — เปลี่ยนตัว Trigger กรองจากเลขทะเบียนรถเป็น SITE งาน, ดู 3.1) ตัวเลือกสุดท้ายเสมอคือ **"📍 ระบุเส้นทางเอง (Custom)"** — ถ้า Header ยังไม่ได้เลือก SITE งาน ให้ Trip Card ทุกใบ disable Field นี้ไว้ก่อนพร้อมข้อความ "กรุณาเลือก SITE งานก่อน"

**Field 2/3 — `Origin`/`Destination`:** Auto-fill + `readonly` (พื้นหลังเทาอ่อน) เมื่อเลือก Fix / ปลดล็อกเมื่อเลือก Custom (ตามที่ v2 ระบุไว้แล้ว — คงเดิม)

**Field 4 — `Distance (KM)`:**
- Fix: auto-fill, `readonly`, ไอคอน 🔒
- Custom: ปลดล็อก, **`inputmode="decimal"`** (เรียกคีย์แพดตัวเลขบนมือถือ ไม่ใช่คีย์บอร์ดเต็ม), placeholder ตัวอย่างเช่น "0.0", จำกัดค่า 0 < km ≤ 500 (กันพิมพ์ผิดหลักเช่น 5000)

**Field 5 — `ประเภทการเดินทาง` (v4 — ใหม่, ระดับเส้นทางย่อย ไม่ใช่ทั้งวัน / v10 — แก้ไข: แสดง Toggle นี้ทั้ง Fix และ Custom แล้ว ไม่ซ่อนสำหรับ Custom อีกต่อไป):**
- **แสดงเสมอทั้ง Card ที่เป็น Fix และ Custom** — เป็น Toggle/Segmented control 2 ตัวเลือกเหมือนกัน: `เที่ยวเดียว` (default) / `ไปกลับ`
- **Card ที่เป็น Fix:** เมื่อกด "ไปกลับ" ให้แสดง badge เล็ก ๆ บนการ์ด เช่น "🔁 ไปกลับ ×2" (ตัวเลข KM ใน Field 4 ยังคงโชว์ค่าเที่ยวเดียวตาม Master data เหมือนเดิม ไม่แก้ตัวเลขในช่อง — การคูณ 2 เกิดตอนรวมยอดเท่านั้น ดูสูตรข้อ 3.4)
- **Card ที่เป็น Custom:** เมื่อกด "ไปกลับ" ให้แสดง badge "🔁 ไปกลับ" เช่นกัน (**ไม่มี ×2** ต่อท้าย เพราะไม่มีการคูณให้) — ตัวเลข KM ใน Field 4 ยังคงเป็นค่าที่ผู้ใช้กรอกตรง ๆ เหมือนเดิม (Backend ไม่คูณซ้ำ) และยังคงแสดงข้อความ hint เล็ก ๆ ใต้ช่อง KM ว่า "กรอกระยะทางรวมตามจริง (รวมขากลับด้วยหากมีเดินทางไปกลับ)" เพื่อย้ำว่าตัวเลขที่กรอกต้องเป็นระยะทางรวมแล้ว — Toggle นี้ใช้**เก็บสถานะเพื่อการตรวจสอบ (Audit) เท่านั้น** ไม่มีผลต่อการคำนวณของ Custom
- เมื่อสลับ Card จาก Fix → Custom (หรือกลับกัน) **ไม่ต้องรีเซ็ตค่า Toggle นี้เป็น `null`** อีกต่อไป (ต่างจาก v4-v9) เพราะ Field นี้มีความหมายเดียวกันในทั้งสองโหมดแล้ว — คงค่า `เที่ยวเดียว`/`ไปกลับ` ที่เลือกไว้ข้ามการสลับประเภทเส้นทางได้เลย (ส่วน Field 2/3/4 อื่นที่ผูกกับ Route/KM ยังคงต้องรีเซ็ตตามเดิมเมื่อสลับ Fix↔Custom)

**ปุ่มลบ 🗑️:** อยู่มุมขวาบนของการ์ด, Card แรกไม่มีปุ่มลบ (ต้องมีอย่างน้อย 1 Trip เสมอ), **กดแล้วต้องมี Confirm dialog สั้น ๆ ("ลบเส้นทางนี้?")** ก่อนลบจริง (กันมือลั่นบนจอสัมผัส)

**Card Numbering:** แสดงเลขลำดับ "เส้นทางที่ 1", "เส้นทางที่ 2" ... มุมซ้ายบนของการ์ด อัปเดตอัตโนมัติเมื่อมีการลบ/เพิ่ม (numbering ใช้แสดงผลเท่านั้น ไม่ใช่ key อ้างอิงข้อมูล — ดู `trip_id` ข้างต้น)

**เมื่อจำนวน Trip Card เกิน `MAX_TRIPS_PER_DAY`:** ปุ่ม `➕ เพิ่มเส้นทาง` ให้ disable พร้อมข้อความแจ้ง "สูงสุด {n} เส้นทางต่อวัน"

### 3.3 Mobile UX เฉพาะจุด (ระบุเพิ่มจาก v2)
- **Sticky Summary Bar:** เมื่อมีหลายการ์ดจน scroll ยาว ให้ยอดเบิกสุทธิ (หรืออย่างน้อยระยะทางรวม) แสดงแบบ sticky ที่ด้านล่างจอตลอดเวลา ไม่ต้อง scroll กลับไปดูบล็อกสีฟ้า
- **Card ยุบ/ขยาย (Collapse):** เมื่อกรอก Card ครบแล้วและ blur ออกจาก field สุดท้าย ให้ยุบการ์ดเหลือแสดงบรรทัดเดียว (เช่น "1. คลังขอนแก่น → สาขาอุดร · 50 กม." + ไอคอนแก้ไข) เพื่อให้เลื่อนดูภาพรวม 4-10 เส้นทางได้ในจอเดียวโดยไม่ยาวเกินไป — แตะเพื่อขยายกลับมาแก้ไข
- ทุก Input ตัวเลข (KM, ค่าทางด่วน, ค่าที่จอด) ใช้ `inputmode="decimal"` หรือ `"numeric"` เพื่อเรียกคีย์แพดตัวเลขของมือถือ
- ปุ่ม `บันทึกข้อมูลและส่งขออนุมัติ` ต้องมี Loading state (spinner + disable ปุ่มกันกดซ้ำ) ระหว่างรอ GAS ตอบกลับ — ป้องกัน submit ซ้ำจากการกดรัว
- แสดง Inline error ใต้ field ที่ผิด (เช่น กม. ต้องมากกว่า 0) แทนการเด้ง alert popup ซึ่งรบกวนการใช้งานบนมือถือ
- **เปลี่ยน SITE งาน ก่อน Save ครั้งแรก หลังจากมี Trip Card ที่เลือกเส้นทาง Fix ไปแล้ว (v5, ยังใช้ได้เฉพาะช่วงก่อน Save ครั้งแรกเท่านั้น — หลัง Save แล้ว Site ถูกล็อกตามข้อ 2.4/v6):** ให้ขึ้น Confirm dialog เตือนก่อนว่า "เปลี่ยน SITE งานจะล้างเส้นทาง Fix ที่เลือกไว้ทั้งหมด (การ์ด Custom ไม่ถูกล้าง)" เพราะเส้นทาง Fix ของ Site เดิมอาจไม่อยู่ใน Site ใหม่ — ถ้ายืนยัน ให้รีเซ็ต Card ที่เป็น Fix ทุกใบกลับเป็นค่าว่าง (คงจำนวน Card ไว้เท่าเดิม ให้ผู้ใช้เลือกเส้นทางใหม่)

### 3.4 พฤติกรรม "ประเภทการเดินทาง" (ไปกลับ) กับ Multi-Trip *(v4 — แก้ไขจาก v3: ตัวเลือกนี้อยู่ระดับเส้นทางย่อยแต่ละเส้น ไม่ใช่ทั้งวัน / v10 — แก้ไข: Custom ก็มี Toggle นี้และบันทึกลง JSON แล้วเหมือนกัน ต่างแค่ไม่คูณ 2 ให้)*

แต่ละ Trip Card มีสถานะ "ไปกลับ" ของตัวเอง (Field 5 ในข้อ 3.2) เป็นอิสระจากกัน — วันเดียวกันอาจมีบางเส้นทางไปกลับ บางเส้นทางไปทางเดียวปนกันได้ ตามพฤติกรรมจริงของพนักงานที่ไปหลายจุดในวันเดียว:

- **เส้นทาง Fix (`type: "FIX"`):** มี Toggle "เที่ยวเดียว/ไปกลับ" ให้เลือกต่อการ์ด เมื่อเลือก "ไปกลับ" ระบบ **คูณ 2 อัตโนมัติ** กับ `km` มาตรฐานของ Card นั้น (ระบบรู้ระยะทางแน่นอนจาก `Master_Routes` จึงคูณให้เองได้) และบันทึก `trip_type: "ROUND_TRIP"` ลง JSON
- **เส้นทาง Custom (`type: "CUSTOM"`, v10 — แก้ไข):** มี Toggle "เที่ยวเดียว/ไปกลับ" เหมือนกันแล้ว และบันทึก `trip_type` ลง JSON เหมือนกัน **แต่ไม่มีผลต่อการคำนวณ** — ผู้ใช้พิมพ์ระยะทางเองตามหน้าปัดรถ ถือว่าตัวเลขที่พิมพ์คือค่าที่ใช้คำนวณเงินตรง ๆ เสมอไม่ว่าจะเลือก Toggle เป็นค่าใด (ผู้ใช้เป็นผู้ประเมินเองว่าจะรวมขากลับในตัวเลขที่พิมพ์หรือไม่ ตาม hint text ที่แสดงในการ์ด) — เหตุผลที่ยังต้องมี Toggle นี้ทั้งที่ไม่กระทบการคำนวณ คือเพื่อเป็น**ข้อมูล Audit ให้ HR ตรวจสอบย้อนหลัง**ว่าเที่ยวนั้นเป็นการเดินทางไปกลับหรือเที่ยวเดียว ประกอบการพิจารณาความสมเหตุสมผลของระยะทางที่กรอก

**สูตรคำนวณ (คำนวณฝั่ง Backend เสมอ ไม่เชื่อค่าจาก Client, v10 — เงื่อนไขเดิมไม่เปลี่ยน เพียงยืนยันว่า `trip_type` ของ Custom ไม่เข้าเงื่อนไขการคูณ):**
```
effective_km(trip) = (trip.type === "FIX" && trip.trip_type === "ROUND_TRIP")
                        ? trip.km * 2
                        : trip.km
// หมายเหตุ: trip.type === "CUSTOM" ไม่เข้าเงื่อนไขนี้เลยไม่ว่า trip_type จะเป็น ROUND_TRIP หรือ SINGLE
//           เพราะ km ที่ผู้ใช้กรอกถือเป็นระยะทางรวมที่ใช้คำนวณตรง ๆ อยู่แล้ว trip_type ของ Custom
//           เก็บไว้เพื่อ Audit เท่านั้น ไม่ใช่ Input ของสูตรนี้
Total_KM  = Σ effective_km(trip)  ทุก trip ใน Trip_Details
rate      = getRateForDate(Req_Date, userProfile.group_car)   // ดูข้อ 2.1/2.3b — default group_car = 1 ถ้าไม่พบ users_profile
Net_Total = (Total_KM * rate) + Toll_Fee + Park_Fee + Flat_Rate_Fee
```
สังเกตว่า `trip_type` เป็น property ของแต่ละ object ใน `Trip_Details` (ดูตัวอย่าง JSON ข้อ 2.4) และตั้งแต่ v10 มีค่าเสมอทั้ง Fix และ Custom (ไม่เป็น `null` อีกต่อไป) — **ไม่มี Field ระดับ Transaction ชื่อ `Trip_Type` อีกต่อไป** เพราะไม่มีความหมายเมื่อแต่ละเส้นทางไปกลับไม่เท่ากัน

---

## 4. ข้อกำหนด Backend & API (GAS Developer)

ทุกฟังก์ชัน Return JSON ตาม Contract เดียวกัน:
```json
// สำเร็จ
{ "success": true, "data": { ... } }
// ผิดพลาด
{ "success": false, "error_code": "VALIDATION_ERROR", "message": "กม. ต้องมากกว่า 0 (เส้นทางที่ 2)" }
```
`error_code` มาตรฐานที่ต้องรองรับ: `VALIDATION_ERROR`, `LOCKED_TRANSACTION` (ดู 4.4), `NOT_FOUND`, `DUPLICATE_SITE_RECORD` (ดู 3.0/4.3), `CONCURRENT_WRITE_CONFLICT` (ดู 4.4/4.6), `SERVER_ERROR`

### 4.1 `getDataOnLoad(lineUserId)` *(v7 — เพิ่ม parameter `lineUserId`, ตัด `Master_Vehicles` ออก)*
โหลดครั้งเดียวตอนเปิดแอป รวม 2 ส่วนไว้ใน Response เดียว (ลด round-trip ตามหลัก Performance ข้อ 4.6):
- **Master data (Cache ได้, ใช้ร่วมกันทุกคน):** `Master_Site`, `Master_Routes`, `Master_Config`, `Rate_Car`, `Approve_users` (Active เท่านั้น) — Cache ด้วย `CacheService` ตามข้อ 4.6.3
- **User-specific (ไม่ Cache แบบ Global, lookup สดทุกครั้งหรือ Cache แยกต่อคน):** ค้นหาแถวใน `users_profile` ที่ `Line_uid = lineUserId` → คืนค่า `{ requester_name, car_no, group_car }` ถ้าไม่พบคืน `null` (Frontend จะปล่อยช่องชื่อ/ทะเบียนว่างและใช้ `group_car = 1` ตาม 2.1)
- **Default Date:** ให้ Backend คำนวณและส่ง `today_th` (วันนี้ตาม Timezone `Asia/Bangkok`) กลับไปด้วยเสมอ แทนที่จะให้ Frontend คำนวณเองจาก `new Date()` ของเครื่อง (ดูเหตุผลและวิธีคำนวณทั้ง 2 ฝั่งในข้อ 4.5)

### 4.2 `listTransactionsByDate(date, lineUserId)` *(v6 — แทนที่ `checkExistingTransaction` เดิม)*
- **Read-only ไม่ต้องขอ `LockService`** (ดูเหตุผลข้อ 4.6.6)
- Return **Array** ของ Record ทั้งหมดที่ `Req_Date` และ `Req_LINE_UserId` ตรงกัน (ปกติมี 0-3 รายการต่อวัน) แต่ละ item เป็น**ข้อมูลสรุปแบบเบา** เท่านั้น (ไม่ส่ง `Trip_Details` เต็มมาด้วยเพื่อความเร็ว): `{ transaction_id, site_id, site_name, trip_count, total_km, net_total, status }`
- ใช้ผลลัพธ์นี้ Render หน้า Day Summary List (ข้อ 3.0)

### 4.2b `getTransactionDetail(transactionId)` *(v6 — ใหม่)*
- **Read-only ไม่ต้องขอ Lock**
- Return ข้อมูลเต็มของ Record เดียว (รวม `Trip_Details` JSON) — เรียกเมื่อผู้ใช้แตะการ์ดใดการ์ดหนึ่งใน Day Summary List เพื่อเปิด Edit Mode/Read-only Mode ตาม `Status` (ข้อ 4.4)
- Frontend เก็บ `transaction_id` ที่ได้ไว้ และส่งกลับไปพร้อม payload ตอนเรียก `submitTransaction` เสมอ (ดู 4.3, 4.6.2) — ทำให้ Backend หา row ที่จะ Update ได้ตรงจุดโดยไม่ต้อง Query ซ้ำ

### 4.3 `submitTransaction(payload)`
Payload ต้องมี `transaction_id` (ว่าง/null = สร้างใหม่, มีค่า = แก้ไขของเดิม) รวมกับ `site_id`, `trip_details`, ฯลฯ

1. **Validate ฝั่ง Backend ซ้ำเสมอ** (ห้ามเชื่อ Frontend อย่างเดียว) — ทำขั้นตอนนี้ทั้งหมด **ก่อน** ขอ Lock (ดู 4.6.4): ต้องมี `Site_ID` ที่ตรงกับแถวใน `Master_Site` (Active), ต้องมี `Approver` ที่ตรงกับแถวใน `Approve_users.approve_request` (Active — v7), จำนวน Trip อยู่ในช่วง `MIN_TRIPS_PER_DAY`–`MAX_TRIPS_PER_DAY`, ทุก Trip มี origin/dest/km ไม่ว่าง, km > 0, `trip_type` ต้องเป็น `"SINGLE"` หรือ `"ROUND_TRIP"` เท่านั้น (ห้ามเป็น `null`/ว่าง ไม่ว่า Trip นั้นจะเป็น FIX หรือ CUSTOM — v10), และถ้า Trip เป็น `type: "FIX"` ต้องตรวจว่า `route_id` นั้นอยู่ภายใต้ `Site_ID` ที่ส่งมาจริง
2. คำนวณ `Total_KM` และ `Net_Total` ใหม่ทั้งหมดฝั่ง Backend ตามสูตรในข้อ 3.4 โดยดึงอัตราจาก `Rate_Car` ตาม `Req_Date` + `users_profile.group_car` ของผู้ใช้ (ตาม `lineUserId`, default `1` ถ้าไม่พบ — v7) ไม่ใช้ค่าที่ Frontend ส่งมาโดยตรง
3. เปิด `LockService.getScriptLock()` เฉพาะช่วงต่อไปนี้ (สั้นที่สุดเท่าที่ทำได้ — ดู 4.6.4):
   - ถ้า `transaction_id` ว่าง (สร้างใหม่): เช็คซ้ำอีกครั้งว่า `Req_Date`+`Req_LINE_UserId`+`Site_ID` นี้ยังไม่มี Record อยู่แล้ว (กัน race จาก 2 แท็บ) ถ้ามีแล้ว → reject ด้วย `error_code: "DUPLICATE_SITE_RECORD"` พร้อม `transaction_id` ของ Record เดิมกลับไปให้ Frontend เด้งไปเปิด Record นั้นแทน ถ้าไม่มี → generate UUID ใหม่ → `appendRow()`
   - ถ้ามี `transaction_id`: หา row จาก `transaction_id` โดยตรง (ไม่ใช่ scan ด้วย Date/User/Site) → เช็ค `Status` ตามข้อ 4.4 ก่อนเขียนทับ → เขียนทับด้วย `setValues()` ครั้งเดียว
4. `JSON.stringify()` ก่อนเขียนคอลัมน์ `Trip_Details`
5. `Approve_Datetime` **ไม่แตะต้องในฟังก์ชันนี้** — ปล่อยว่างเสมอตอน Insert/Update ปกติ (จะถูกเขียนโดยฟังก์ชัน "อนุมัติ" ที่จะทำเพิ่มในเฟสถัดไป — v7)
6. อัปเดต `Updated_At` แล้วปล่อย Lock ทันที (`finally { lock.releaseLock() }`)

### 4.4 กติกาการแก้ไข (Edit-Lock ตาม Status) *(ใหม่ตั้งแต่ v2 — ช่องโหว่ใหญ่สุดของ v2)*
v2 ไม่ได้ระบุว่าจะเกิดอะไรขึ้นถ้าผู้ใช้เข้าไปแก้ Transaction ที่ผู้อนุมัติอนุมัติไปแล้ว — กำหนดกติกาดังนี้ (v6: ใช้กับแต่ละ Record ต่อ Site แยกกัน ไม่ใช่ทั้งวันรวมกัน — Site หนึ่งอนุมัติแล้วแต่อีก Site ของวันเดียวกันยังแก้ไขได้ตามปกติ):

| Status | พฤติกรรมเมื่อแตะ Record นั้นจาก Day Summary List |
|---|---|
| `DRAFT` / `PENDING` | เปิด Edit Mode ปกติ (ดึง Trip Card เดิมมาแก้/เพิ่ม/ลบได้ผ่าน `getTransactionDetail`, submit ซ้ำ = Update แถวเดิมด้วย `transaction_id`, สถานะกลับเป็น `PENDING`) |
| `APPROVED` | **ห้ามแก้ไขผ่านฟอร์มนี้** — Frontend แสดงข้อมูลแบบ Read-only พร้อมข้อความ "รายการนี้อนุมัติแล้ว หากต้องแก้ไขกรุณาติดต่อผู้ดูแลระบบ" ปุ่มบันทึกถูกซ่อน/disable, `submitTransaction` ฝั่ง Backend ต้อง reject ด้วย `error_code: "LOCKED_TRANSACTION"` เสมอแม้ Frontend จะถูก bypass มา |
| `REJECTED` | เปิด Edit Mode ได้ (ให้แก้ไขแล้วส่งใหม่ สถานะเปลี่ยนกลับเป็น `PENDING`) |

### 4.5 LINE LIFF Integration

- เรียก `liff.init({ liffId })` ตอนเปิดแอป ก่อนเรียก `getDataOnLoad()` — ถ้า `liff.isLoggedIn()` เป็น false ให้ `liff.login()`
- ดึง `liff.getProfile()` → `displayName` auto-fill ช่อง "ชื่อผู้ขอเบิก" (แก้ไขได้ตามที่ label ระบุ) และเก็บ `userId` ส่งไปกับทุก request เพื่อใช้ตาม 4.2/4.2b
- หลัง `submitTransaction` สำเร็จ: แสดงข้อความยืนยันสั้น ๆ แล้วพากลับไปหน้า Day Summary List (ข้อ 3.0) เพื่อให้เห็นสถานะล่าสุด (ไม่ปิดแอปทันที เผื่อผู้ใช้จะเพิ่ม Site อื่นต่อ) — `liff.closeWindow()` ใช้เมื่อผู้ใช้กดปิดจาก Day Summary List เองเท่านั้น
- แนบรูป: ใช้ `<input type="file" accept="image/*" capture="environment">` เพื่อให้เปิดกล้องได้ตรงบนมือถือ
- **Default วันที่ต้องเป็น Timezone `Asia/Bangkok` เสมอ (v7 — สำคัญ):** ห้ามใช้ `new Date()` ของ Browser ตรง ๆ เพราะเครื่องผู้ใช้อาจตั้ง Timezone ผิดหรือ Server ของ GAS อาจรันคนละ Timezone ทำให้ Key วันที่ตอนเช้ามืดของไทยกลายเป็น "เมื่อวาน" ให้ทำ 2 ชั้น:
  1. **ฝั่ง Backend (แหล่งความจริงหลัก):** ใน `getDataOnLoad()` ให้คำนวณวันที่ปัจจุบันด้วย `Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd")` แล้วส่งกลับเป็น `today_th` ให้ Frontend ใช้เป็นค่า default ของช่องวันที่ (แทนที่จะให้ Frontend คำนวณเอง) และตั้งค่า Time zone ของ GAS Project เป็น `Asia/Bangkok` ใน `appsscript.json` (`"timeZone": "Asia/Bangkok"`) ด้วยเพื่อให้ Trigger/Log อื่น ๆ ตรงกันทั้งระบบ
  2. **ฝั่ง Frontend (สำรอง เผื่อกรณีต้องคำนวณเอง เช่น เปลี่ยนวันที่ในปฏิทิน):** ใช้ `new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })` (locale `en-CA` ให้ format `YYYY-MM-DD` ตรงตัวพอดี) ห้ามใช้ `new Date().toISOString()` เฉย ๆ เพราะนั่นคือ UTC ไม่ใช่เวลาไทย

### 4.6 ประสิทธิภาพ & การทำงานพร้อมกันหลายคน (Performance & Concurrency) *(v6 — ใหม่, สำคัญ)*

**บริบท:** ผู้ใช้พร้อมกันสูงสุดราว 3-4 คนในเวลาเดียวกัน (ไม่ใช่ Enterprise scale) แต่ GAS + Google Sheets มีข้อจำกัดเรื่อง Cell-by-cell latency และ Lock contention ถ้าเขียนโค้ดไม่ระวังจะทำให้ผู้ใช้รอกันนานเกินจำเป็นทั้งที่จำนวนคนไม่เยอะ ให้ยึดหลัก 6 ข้อนี้:

**4.6.1 อ่าน/เขียนแบบ Bulk เสมอ ห้าม Cell-by-cell:**
ห้ามใช้ `sheet.getRange(i, j).getValue()` วนลูปทีละ Cell — ให้ `sheet.getDataRange().getValues()` อ่านทั้งตารางเป็น 2D Array ครั้งเดียว แล้วประมวลผลใน Memory (JS Array/Map) ซึ่งเร็วกว่า cell-by-cell เป็นสิบ-ร้อยเท่า การเขียนก็เช่นกัน: ประกอบเป็น Array เต็มแถวก่อน แล้วยิง `setValues()` ครั้งเดียว (Insert ใหม่ใช้ `appendRow()` เร็วสุด), ห้ามลูป `setValue()` ทีละ Cell

**4.6.2 ใช้ `transaction_id` เป็น Key ตรง ไม่ต้อง scan ด้วย composite key ซ้ำทุกครั้ง:**
เมื่อ Frontend มี `transaction_id` อยู่แล้ว (จากการเปิด Record เดิมผ่าน `getTransactionDetail`) ให้ส่งกลับมาพร้อม `submitTransaction` เสมอ (ดู 4.3) Backend หา row เป้าหมายจาก `transaction_id` โดยตรงในรอบ scan เดียว (ยัง scan อยู่เพราะ Sheets ไม่มี index ในตัว แต่ scan แค่ 1 ครั้งจาก Array ที่โหลดมาแล้ว ไม่ query Sheet API ซ้ำหลายรอบ)

**4.6.3 Cache Master Data ที่อ่านบ่อยแต่เปลี่ยนไม่บ่อย:**
`Master_Vehicles`, `Master_Site`, `Master_Routes`, `Master_Config`, `Rate_Car` ให้ Cache ด้วย `CacheService.getScriptCache()` (TTL แนะนำ 5-10 นาที) แทนการอ่านจาก Sheet ทุกครั้งที่ `getDataOnLoad()` ถูกเรียก ลดภาระ Sheets API ช่วง Peak (เช่น ทุกคนเปิดแอปพร้อมกันตอนเช้า) — **`Master_Site` (v9):** ให้กรอง `Active = TRUE` และเรียงตาม `Site_Name` (A-Z/ก-ฮ) **ก่อน**เก็บเข้า Cache (ทำครั้งเดียวตอน Loader function ทำงาน ไม่ใช่เรียงตอน Frontend Render) เพื่อให้ทุกคนที่อ่านจาก Cache ได้ลำดับที่เรียงพร้อมใช้ทันที ไม่ต้องเรียงซ้ำที่ Client — จำนวนแถวระดับ 50-70 (หรือมากกว่านั้นพอสมควร) ไม่กระทบเวลาโหลดหรือความลื่นของ Dropdown บนมือถือแต่อย่างใด เพราะขนาดข้อมูลเล็กมากและ Native `<select>` ของมือถือจัดการ List ยาวได้อยู่แล้ว

**4.6.4 `LockService` — ใช้เฉพาะช่วงเขียนจริง ให้สั้นที่สุด:**
ทำ Validation + คำนวณ `Total_KM`/`Net_Total` + `JSON.stringify()` **ให้เสร็จทั้งหมดก่อน** แล้วค่อยเรียก `LockService.getScriptLock()` ครอบเฉพาะช่วง "หา row + เขียนแถว" เท่านั้น (ดูลำดับใน 4.3) เพื่อลดเวลาที่คนอื่นต้องรอ ใช้ `lock.tryLock(15000)` (รอสูงสุด 15 วิ) แทน `lock.waitLock()` ที่รอไม่มีกำหนด — ถ้าไม่ได้ Lock ให้ return `error_code: "CONCURRENT_WRITE_CONFLICT"` (ที่ 3-4 คนพร้อมกัน โอกาสชนสูงสุดแค่ไม่กี่ครั้งต่อวัน 15 วิเพียงพอ) ปล่อย `lock.releaseLock()` ใน `finally` เสมอกัน Lock ค้างเมื่อเกิด error กลางทาง

**4.6.5 หลีกเลี่ยง `SpreadsheetApp.flush()` พร่ำเพรื่อ:** เรียกเมื่อจำเป็นต้องมั่นใจว่าเขียนเสร็จก่อน Return response เท่านั้น (จุดเดียวหลัง `setValues()`/`appendRow()` ใน critical section) ไม่เรียกซ้ำหลายจุดในฟังก์ชันเดียวเพราะแต่ละครั้งบังคับ sync การเขียนซึ่งช้า

**4.6.6 แยก "อ่าน" ออกจาก "เขียน" ให้ชัด:** `listTransactionsByDate`, `getTransactionDetail`, `getDataOnLoad` เป็น Read-only **ไม่ต้องขอ Lock เลย** (Sheets อ่านพร้อมกันได้ไม่ชนกัน) — ขอ Lock เฉพาะใน `submitTransaction` เท่านั้น จุดนี้สำคัญมาก เพราะถ้า Lock ครอบการอ่านด้วย ผู้ใช้ที่แค่เปิดดู Day Summary List จะต้องรอคิวคนที่กำลังบันทึกอยู่โดยไม่จำเป็น ทั้งที่ไม่เกี่ยวกัน

### 4.7 `dailyMaintenance()` — ลบ Transaction เก่าเกินกำหนด *(v8 — ใหม่)*

**วัตถุประสงค์:** กันไม่ให้ Sheet `Transactions` มีข้อมูลสะสมมากเกินไปจนกระทบ Performance การอ่าน/เขียนของทั้งระบบ (ตามหลักข้อ 4.6) โดยลบแถวที่เก่ากว่าจำนวนวันที่กำหนดออก **ก่อนลบทุกครั้งต้องสำรองข้อมูลทั้ง Sheet ผ่าน `sendData()` ก่อนเสมอ**

**ค่าคงที่ (`Config.gs`):**
| Key | Value | หมายเหตุ |
|---|---|---|
| `RETENTION_DAYS` | `10` | จำนวนวันที่เก็บข้อมูลไว้ นับย้อนหลังจากวันที่ปัจจุบัน (Asia/Bangkok) — เป็น Const ปรับค่าได้ภายหลังโดยแก้เลขนี้ค่าเดียว ไม่ต้องแก้ Logic ของฟังก์ชัน |

**Flow:**
1. คำนวณ `cutoffDate` = วันนี้ (Timezone `Asia/Bangkok` ผ่าน `Util_Date.gs` เดียวกับข้อ 4.5) ลบด้วย `RETENTION_DAYS` วัน
2. Bulk read ทั้ง Sheet `Transactions` ผ่าน `Repository_Sheets.bulkRead()` เป็น Array เดียว (ห้าม cell-by-cell ตามข้อ 4.6.1)
3. แยกเป็น 2 กลุ่มใน Memory: `rowsToKeep` (`Req_Date >= cutoffDate`) และ `rowsToDelete` (`Req_Date < cutoffDate`)
4. **ถ้า `rowsToDelete` ว่าง (ไม่มีแถวเก่าเกินกำหนด)** → จบการทำงานทันที ไม่เรียก `sendData()` (กันส่งอีเมลพร่ำเพรื่อทั้งที่ไม่มีอะไรจะลบ) และไม่แตะ Sheet — log "ไม่มีข้อมูลต้องลบรอบนี้" แล้ว return
5. **ถ้ามี `rowsToDelete`** → เรียก `sendData()` (ดู 4.8 — ไม่ต้องส่งพารามิเตอร์ใด ๆ ฟังก์ชันจะสำรอง**ทั้ง Sheet ปัจจุบันทั้งหมด** ไม่ใช่เฉพาะแถวที่จะลบ) แบบ Synchronous แล้วตรวจผลลัพธ์ก่อนไปขั้นตอนถัดไปเสมอ
6. **ตรวจผลจาก `sendData()`:**
   - **สำเร็จ** → ดำเนินการลบต่อในขั้นตอน 7
   - **ล้มเหลว** (เช่น `GmailApp` error, quota เกิน) → **ห้ามลบข้อมูลเด็ดขาด** — log error ไว้ (`Logger.log` + เขียนแถวลง Sheet `Maintenance_Log` ถ้ามี) แล้ว return โดยไม่ทำอะไรต่อ เพื่อป้องกันข้อมูลหายทั้งที่ยังไม่มีสำรอง (ข้อมูลทุกแถวยังอยู่ครบ รอบ Trigger ถัดไปจะพยายามใหม่เองอัตโนมัติ)
7. เขียนทับ Sheet ทั้งหมดด้วย `rowsToKeep` เท่านั้น: `clearContents()` ช่วงข้อมูลเดิมทั้งหมด แล้ว `setValues()` ครั้งเดียวด้วย Array ใหม่ (ตามหลัก Bulk เขียนของข้อ 4.6.1 — **ห้าม** วนลูป `deleteRow()` ทีละแถว เพราะช้าและ Index จะเลื่อนสับสนเมื่อแถวที่ต้องลบไม่ติดกัน)
8. Log สรุปผลการทำงาน: จำนวนแถวที่ลบ, ช่วงวันที่ของแถวที่ลบ (`Req_Date` เก่าสุด/ใหม่สุดใน `rowsToDelete`), timestamp ที่รัน

**Concurrency:** แนะนำครอบขั้นตอน 7 (Clear + setValues) ด้วย `LockService.getScriptLock()` แบบเดียวกับข้อ 4.6.4 เพื่อกันชนกับ `submitTransaction` ที่อาจกำลังเขียนแถวใหม่พร้อมกันพอดี

**Trigger:** ผู้ใช้ (Pingly) จะไปตั้ง Time-based Trigger เรียก `dailyMaintenance()` เองผ่านเมนู Triggers ของ Apps Script Editor — สเปกนี้ไม่ต้องมีโค้ดสร้าง Trigger อัตโนมัติ

### 4.8 `sendData()` — Backup ทั้ง Sheet เป็น Excel + ส่งอีเมล *(v8 — ใหม่)*

**วัตถุประสงค์:** ฟังก์ชันกลาง ไม่รับพารามิเตอร์ใด ๆ — ทุกครั้งที่ถูกเรียกจะแปลง**ข้อมูลทั้งหมดปัจจุบันของ Sheet `Transactions`** (ไม่ใช่แค่บางส่วน) เป็นไฟล์ Excel (.xlsx) แล้วแนบส่งอีเมลไปยังผู้รับที่กำหนดไว้ในค่าคงที่ ใช้ Logic เดียวกันทั้ง 2 บริบท: (1) ถูกเรียกจาก `dailyMaintenance()` เป็น Full Backup ก่อนลบข้อมูล (2) เรียกแบบ Standalone ผ่าน Time-based Trigger ที่ผู้ใช้ตั้งเอง สำหรับส่งรายงาน/สำรองตามรอบเวลาที่ต้องการ — ทั้งสองกรณีทำงานเหมือนกันทุกประการ ไม่ต้องแยก Logic

**ค่าคงที่ (`Config.gs`):**
| Key | Value | หมายเหตุ |
|---|---|---|
| `MAINTENANCE_EMAIL_RECIPIENTS` | `"pingly69@gmail.com,pingly69@outlook.com"` | String คั่นด้วย comma รองรับผู้รับมากกว่า 1 คน — `split(',')` แล้ว `trim()` แต่ละตัวก่อนใช้กับ `GmailApp` เพิ่ม/ลดผู้รับได้ภายหลังโดยแก้ค่านี้ค่าเดียว |

**Flow:**
1. Bulk read ทั้ง Sheet `Transactions` ทั้งหมด (รวม Header) ผ่าน `Repository_Sheets.bulkRead()` เป็น 2D Array เดียว (ตามหลักข้อ 4.6.1)
2. สร้าง Temporary Google Sheet ชั่วคราวด้วย `SpreadsheetApp.create()` แล้วใส่ข้อมูลจากขั้นตอน 1 ด้วย `setValues()` ครั้งเดียว
3. แปลง Temporary Sheet เป็นไฟล์ Excel ผ่าน Export URL (`https://docs.google.com/spreadsheets/d/{id}/export?format=xlsx`) เรียกด้วย `UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } })` แล้วเก็บผลลัพธ์เป็น Blob ตั้งชื่อไฟล์รูปแบบ `เบิกค่าเดินทาง_backup_{yyyyMMdd_HHmm}.xlsx` (Timezone `Asia/Bangkok` ผ่าน `Util_Date.gs` เดียวกับข้อ 4.5)
4. ลบ Temporary Sheet ทิ้งทันทีหลังแปลงเสร็จ (`DriveApp.getFileById(tempId).setTrashed(true)`) ไม่ปล่อยให้ค้างสะสมใน Drive
5. ส่งอีเมลด้วย `GmailApp.sendEmail()` ไปยังผู้รับทุกคนใน `MAINTENANCE_EMAIL_RECIPIENTS` ในครั้งเดียว (ใส่ comma-separated string ใน field ผู้รับได้เลย ไม่ต้องวนลูปส่งทีละคน) พร้อมแนบไฟล์จากขั้นตอน 3 หัวเรื่อง: "สำรองข้อมูลค่าเดินทาง - {วันที่รัน}" ระบุจำนวนแถวทั้งหมดที่แนบมาในเนื้อหา
6. Return ผลลัพธ์ตาม Contract เดียวกับฟังก์ชันอื่นในระบบ (`buildSuccess`/`buildError` จาก `Util_Response.gs`) เพื่อให้ `dailyMaintenance()` เช็คสถานะสำเร็จ/ล้มเหลวได้ (ดู 4.7 ข้อ 6) — ถ้า `GmailApp.sendEmail()` throw exception (เช่น quota เกิน) ต้อง catch แล้ว return `buildError('EMAIL_SEND_FAILED', ...)` ห้ามปล่อยให้ Error หลุดขึ้นไปทำให้ `dailyMaintenance()` พังกลางทาง

**Trigger:** ผู้ใช้ (Pingly) จะไปตั้ง Time-based Trigger เรียก `sendData()` เองสำหรับกรณี Standalone Backup/Report (กำหนดความถี่/เวลาส่งเอง) — สเปกนี้ไม่ต้องมีโค้ดสร้าง Trigger อัตโนมัติ

**หมายเหตุ Quota:** การเรียก `sendData()` 1 ครั้งนับเป็น 1 อีเมลต่อ Quota ของ `GmailApp` (ไม่ใช่นับตามจำนวนผู้รับ) ซึ่งไม่กระทบการใช้งานจริงของระบบนี้ที่ความถี่ต่ำ

---

## 5. โครงสร้าง Source Code (File/Function Organization) *(v7 — ใหม่, สำคัญสำหรับการดูแลรักษาในระยะยาว)*

**ข้อกำหนด:** ห้ามยัดทุกอย่างไว้ในไฟล์เดียว (`Code.gs` ไฟล์เดียวหมื่นบรรทัด หรือ `index.html` ที่มี CSS/JS/Markup ปนกันหมด) ให้แยกไฟล์ตามหน้าที่ชัดเจน เพื่อให้แก้/ตรวจ/ปรับจูนทีละส่วนได้โดยไม่กระทบส่วนอื่น โครงสร้างที่แนะนำสำหรับ GAS + LIFF Web App (clasp project):

### 5.1 ฝั่ง Backend (Google Apps Script — `.gs` files)

```
src/
├── Code.gs                 # Entry point เท่านั้น: doGet(e) + เรียก HtmlService — ไม่มี Business logic ในไฟล์นี้
├── Config.gs                # ค่าคงที่ทั้งหมด: ชื่อ Sheet, ชื่อคอลัมน์/Index, CACHE_KEYS, TIMEZONE = "Asia/Bangkok", RETENTION_DAYS, MAINTENANCE_EMAIL_RECIPIENTS (v8 — ดู 4.7/4.8)
├── Api_Read.gs               # ฟังก์ชัน Read-only ที่ Frontend เรียกตรง: getDataOnLoad, listTransactionsByDate, getTransactionDetail (ไม่มี Lock ใด ๆ ในไฟล์นี้ตามข้อ 4.6.6)
├── Api_Write.gs               # ฟังก์ชัน Write: submitTransaction (มี Lock ในนี้ที่เดียว)
├── Service_RateCalc.gs        # Logic คำนวณล้วนๆ: getRateForDate(), effective_km(), calcTotals() — ไม่แตะ Sheet โดยตรง รับ/คืนค่าเป็น Object เพื่อ Unit Test ได้ง่าย
├── Service_Validation.gs      # validateSubmitPayload() รวม Validation ทั้งหมดของข้อ 4.3 ข้อ 1
├── Repository_Sheets.gs       # Layer เดียวที่แตะ SpreadsheetApp ตรง ๆ: bulkRead(sheetName), bulkWrite(), findRowByValue() — ฟังก์ชันอื่นเรียกผ่าน Layer นี้เท่านั้น ห้ามฟังก์ชันอื่น getRange() เอง (รวม Bulk-read/write pattern ของข้อ 4.6.1 ไว้ที่เดียว)
├── Repository_Cache.gs        # Wrapper รอบ CacheService: getCached(key, loaderFn, ttl) ใช้ร่วมกันทุก Master data (ข้อ 4.6.3)
├── Util_Date.gs               # คำนวณวันที่ Timezone Asia/Bangkok ทั้งหมดอยู่ไฟล์เดียว (ข้อ 4.5) กันกระจายไปเขียนซ้ำหลายที่
├── Util_Response.gs           # buildSuccess(data), buildError(code, message) ให้ทุกฟังก์ชัน Return รูปแบบเดียวกันตาม Contract ข้อ 4
├── Job_DailyMaintenance.gs    # (v8 — ใหม่) dailyMaintenance() ทั้งหมด — Logic ลบ Transaction เก่าเกินกำหนด (ข้อ 4.7)
└── Service_Email.gs           # (v8 — ใหม่) sendData() — สำรองข้อมูลทั้ง Sheet เป็น Excel + ส่งอีเมลผ่าน GmailApp (ข้อ 4.8, ไม่รับพารามิเตอร์)
```

**เหตุผลที่แยกแบบนี้:** `Api_Read`/`Api_Write` เป็นเพียง "หน้าด่าน" รับ request แล้วเรียก `Service_*` (คำนวณ) + `Repository_*` (เข้าถึงข้อมูล) — เวลาต้องปรับจูน Performance (เช่น เปลี่ยนวิธี Cache) แก้แค่ `Repository_Cache.gs` ไฟล์เดียว ไม่ต้องไล่หาโค้ดที่กระจายอยู่ในทุกฟังก์ชัน เวลา Business logic เปลี่ยน (เช่น สูตรคำนวณ "ไปกลับ") แก้แค่ `Service_RateCalc.gs`

### 5.2 ฝั่ง Frontend (HTML/JS/CSS ที่ Serve ผ่าน HtmlService)

GAS ไม่รองรับ ES6 `import`/`export` ตรง ๆ ในไฟล์ที่ Serve ผ่าน `HtmlService` — วิธีมาตรฐานคือแยกเป็นไฟล์ `.html` หลายไฟล์ แล้วใช้ Template include รวมกันตอน `doGet()` ทำงาน:

```
src/
├── Index.html                 # Shell หลัก: <div id="app"></div> + include ไฟล์อื่นทั้งหมดต่อท้าย
├── Styles_Main.html            # CSS ทั้งหมดห่อด้วย <style>...</style>
├── Js_App.html                 # Bootstrap: liff.init(), เก็บ state กลาง (currentDate, lineUserId, masterDataCache), เรียก getDataOnLoad ครั้งแรก
├── Js_ApiClient.html            # ห่อ google.script.run เป็น Promise เดียว เช่น callApi('submitTransaction', payload) — ไฟล์เดียวที่คุยกับ Backend ทั้งหมด
├── Js_DaySummaryList.html       # Render หน้า Day Summary List (ข้อ 3.0) + Empty state + การ์ดสรุปแต่ละ Site
├── Js_TripForm.html             # Render Header Section + Summary Section (บล็อกสีฟ้า) + ปุ่ม Submit
├── Js_TripCard.html             # Component เดียว: render/add/remove Trip Card, Toggle ไปกลับ, Field 1-5 ทั้งหมดของข้อ 3.2
└── Js_Validation.html           # Client-side validation + format ตัวเลข/inline error message ของข้อ 3.3
```

Code.gs รวมไฟล์ตอน Serve ด้วย Helper มาตรฐาน:
```javascript
// Code.gs
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('บันทึกเบิกค่าเดินทาง');
}
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```
```html
<!-- Index.html -->
<?!= include('Styles_Main'); ?>
<div id="app"></div>
<?!= include('Js_ApiClient'); ?>
<?!= include('Js_Validation'); ?>
<?!= include('Js_TripCard'); ?>
<?!= include('Js_TripForm'); ?>
<?!= include('Js_DaySummaryList'); ?>
<?!= include('Js_App'); ?>
```
**ข้อควรระวัง:** ไฟล์ include ต้องเรียงลำดับให้ dependency มาก่อนตัวที่ใช้งาน (เช่น `Js_ApiClient` ต้องมาก่อน `Js_App` ที่เรียกใช้) เพราะทุกไฟล์ถูกต่อกันเป็น Global Scope เดียวตอน Runtime ไม่ใช่ Module แยกจริง ๆ

### 5.3 การอ้างอิง Library ภายนอกผ่าน CDN — ต้องระบุ Version เจาะจงเสมอ *(v10 — ใหม่)*

**เหตุผล:** เคยเจอปัญหาจริงมาก่อน — ตอน Link CDN (เช่น unpkg.com) แบบไม่ระบุ Version หรือใช้ Version แบบลอย (เช่น `@latest` หรือไม่มี `@version` เลย) พอผู้ให้บริการอัปเดต Package เป็นเวอร์ชันใหม่ ระบบที่ Deploy ไว้แล้วพังทันทีโดยที่โค้ดฝั่งเราไม่ได้แก้อะไรเลย เพราะ URL เดิมชี้ไปที่โค้ดใหม่ที่มี Breaking change โดยอัตโนมัติ — ข้อนี้บังคับใช้กับทุก External script/style ที่โหลดผ่าน CDN ในโปรเจกต์นี้ (ปัจจุบันคือ LINE LIFF SDK และ Library เสริมอื่นใดที่จะเพิ่มในอนาคต)

**ข้อบังคับ:**
1. **ห้าม** ใช้ URL ของ CDN (unpkg.com, jsdelivr.net, cdnjs.cloudflare.com, ฯลฯ) แบบไม่ระบุ Version หรือใช้ Tag แบบลอย เช่น `@latest`, `@next`, หรือไม่มี `@version` ต่อท้ายชื่อ Package เลย
2. **ต้อง** ระบุเลข Version แบบเจาะจง (Exact version, ไม่ใช่ Range เช่น `^1.2.0` หรือ `~1.2.0`) ต่อท้ายชื่อ Package เสมอ ตัวอย่าง:
   - ❌ ผิด: `https://unpkg.com/some-lib/dist/lib.min.js`
   - ❌ ผิด: `https://unpkg.com/some-lib@latest/dist/lib.min.js`
   - ✅ ถูก: `https://unpkg.com/some-lib@2.3.1/dist/lib.min.js`
3. **LINE LIFF SDK:** URL มาตรฐานที่ LINE แนะนำ (`https://static.line-scdn.net/liff/edge/2/sdk.js`) เป็น "Edge" channel ที่อัปเดตตัวเองอัตโนมัติ ซึ่งมีความเสี่ยงแบบเดียวกัน — ให้ Developer ตรวจสอบ ณ ตอนพัฒนาว่า LINE มี URL แบบ Pin Version ให้เลือกใช้หรือไม่ (ดู LIFF SDK versioning ในเอกสารทางการของ LINE Developers ล่าสุด ณ ตอนพัฒนา) ถ้ามีให้ใช้ตัว Pin Version แทน Edge channel เสมอ ถ้าไม่มีจริง ๆ ให้บันทึกความเสี่ยงนี้ไว้เป็น Known limitation และวางแผนทดสอบ Regression หลัง LINE ประกาศอัปเดต SDK ครั้งใหญ่
4. **บันทึก Version ที่ Pin ไว้เป็นคอมเมนต์กำกับทุกครั้ง** ข้าง `<script>`/`<link>` tag นั้น ๆ ระบุวันที่ Pin และเหตุผล (ถ้ามี) เพื่อให้ผู้ดูแลระบบในอนาคตรู้ว่าจะอัปเกรด Version เมื่อไหร่/อย่างไร เช่น:
   ```html
   <!-- Pinned unpkg version 2.3.1 (2026-07-31) — อย่าเปลี่ยนเป็น @latest, ดูข้อ 5.3 ของสเปกก่อนอัปเกรด -->
   <script src="https://unpkg.com/some-lib@2.3.1/dist/lib.min.js"></script>
   ```
5. การอัปเกรด Version ของ Library ใด ๆ ต้องเป็นการเปลี่ยนแปลงที่ตั้งใจทำ (แก้ URL ในโค้ดแล้ว Deploy ใหม่) ไม่ใช่สิ่งที่เกิดขึ้นเองจากฝั่ง CDN — ถ้าจะอัปเกรดให้ทดสอบทุกหน้าจอที่เกี่ยวข้องก่อน Deploy จริงเสมอ

---

## 6. จุดที่ต้องทดสอบ (QA Checklist — ขยายถึง v7)

**users_profile / Approve_users / Timezone (v7 — ใหม่):**
- [ ] LINE UID ที่มีอยู่ใน `users_profile` → เปิดแอปแล้ว ชื่อ+ทะเบียนรถถูก Auto-fill ถูกต้อง และแก้ไขได้ปกติ
- [ ] LINE UID ที่ไม่มีใน `users_profile` → เปิดแอปแล้ว ช่องชื่อ/ทะเบียนว่าง ให้พิมพ์เอง ไม่ error และคำนวณอัตราด้วย `group_car = 1` (default)
- [ ] คนที่มี `group_car = 2` ใน `users_profile` → คำนวณ `Net_Total` โดยอ้างอิงคอลัมน์ `Rate_Car.group_car2` ถูกต้อง (ไม่ใช้ `group_car1`)
- [ ] Dropdown "ส่งขออนุมัติไปยัง" แสดงรายชื่อจากคอลัมน์ `approve_request` ของ `Approve_users` ที่ `Active = TRUE` เท่านั้น
- [ ] ไม่เลือก Approver แล้วกด Save → error `VALIDATION_ERROR` แจ้งให้เลือกผู้อนุมัติก่อน
- [ ] Key ข้อมูลช่วงเวลา 00:00-07:00 น. ตามเวลาไทย (จำลองโดยตั้ง Timezone เครื่องทดสอบเป็น UTC) → ช่องวันที่ default ต้องยังเป็น "วันนี้" ตามเวลาไทย ไม่ใช่ "เมื่อวาน"
- [ ] ตรวจว่า `Approve_Datetime` ยังว่างอยู่หลังจาก Insert/Update ปกติ (ยังไม่มีการอนุมัติ)

**Day Summary List / Multi-Site (v6 — ใหม่):**
- [ ] วันที่ยังไม่มี Record เลย → Empty State พร้อมปุ่ม "+ เริ่มบันทึกการเดินทาง" ขึ้นตรง ไม่มี List ว่างโชว์
- [ ] คนเดียวกัน บันทึก Site A แล้ว กลับมาเปิดแอปอีกครั้งวันเดียวกัน → เห็น Site A ใน List และกด "+ เพิ่ม Site ใหม่" ได้โดย Dropdown SITE งาน **ไม่มี Site A ให้เลือกซ้ำ**
- [ ] Site A สถานะ `PENDING`, Site B สถานะ `APPROVED` ในวันเดียวกัน → แตะ Site A เข้า Edit Mode ปกติ, แตะ Site B เข้า Read-only (Edit-Lock ของ Site B ไม่กระทบ Site A)
- [ ] จำลอง race condition: เปิด 2 แท็บพร้อมกัน กด "+ เพิ่ม Site ใหม่" เลือก Site เดียวกันแล้ว Save พร้อมกัน → แท็บที่ 2 ต้องได้ `error_code: "DUPLICATE_SITE_RECORD"` ไม่ใช่สร้าง Record ซ้ำ
- [ ] Save Record ของ Site A สำเร็จแล้ว → กลับมาเปิดแก้ไข Site A อีกครั้ง → Field SITE งาน เป็น Read-only/ล็อก ไม่ให้เปลี่ยน

**Routing/Lock พื้นฐาน (v5 — แก้จาก Plate เป็น Site):**
- [ ] เลือก SITE งาน ต่างกัน → Dropdown เส้นทาง (`Select Route`) ในทุก Trip Card กรองเฉพาะ Site นั้น
- [ ] ยังไม่เลือก SITE งาน → Field `Select Route` ทุก Card ถูก disable พร้อมข้อความแจ้ง
- [ ] เปลี่ยน SITE งาน หลังมีการ์ด Fix ที่กรอกไว้แล้ว → ขึ้น Confirm dialog และล้างเฉพาะการ์ด Fix (การ์ด Custom ไม่ถูกล้าง)
- [ ] พิมพ์/แก้เลขทะเบียนรถเป็นค่าอื่นที่ไม่ตรงกับ `users_profile.car_no` เดิม → ระบบยังบันทึกได้ปกติ ไม่ error (เพราะเป็น Free text เสมอ)
- [ ] เลือกเส้นทาง Fix → origin/dest/km ล็อก + ไอคอน 🔒ตามที่กำหนด
- [ ] เปลี่ยนกลับ "ระบุเอง" → ปลดล็อกให้พิมพ์ได้ปกติ

**Multi-Trip (ใหม่):**
- [ ] ลบ Card กลาง → ผลรวม กม. หักถูกต้อง และเลขลำดับการ์ดที่เหลือเรียงใหม่ถูกต้อง
- [ ] ดึงข้อมูลเก่าที่มี 3 เส้นทางขึ้นมาแก้ไขได้ถูกต้องครบ
- [ ] เพิ่ม Trip ถึง `MAX_TRIPS_PER_DAY` แล้วปุ่มเพิ่มถูก disable
- [ ] ลบจนเหลือ Card เดียว → ปุ่มลบของ Card สุดท้ายหายไป (บังคับมีอย่างน้อย 1 Trip)

**Edit-Lock / Concurrency (ใหม่ — สำคัญ):**
- [ ] เปิดฟอร์ม Transaction ที่ `Status = APPROVED` → ฟอร์มเป็น Read-only ปุ่มบันทึกถูกซ่อน
- [ ] ยิง `submitTransaction` ตรงเข้า Backend (ข้าม UI) กับ Transaction ที่อนุมัติแล้ว → ต้อง reject ด้วย `LOCKED_TRANSACTION`
- [ ] จำลอง 2 requests ยิงพร้อมกันที่ วันที่+คน+Site เดียวกัน (`Req_Date`+`Req_LINE_UserId`+`Site_ID`) → ไม่มีข้อมูลสูญหาย/เขียนทับกันแบบเงียบ

**การคำนวณเงิน (ใหม่):**
- [ ] เพิ่มแถวอัตราใหม่ใน `Rate_Car` (dt_date ในอนาคต) แล้วรายการที่บันทึกด้วยวันที่ก่อนหน้ายังใช้อัตราเดิมถูกต้อง (ไม่ retroactive ย้อนหลัง)
- [ ] บันทึกรายการด้วย `Req_Date` ที่ตรงกับช่วงอัตราต่าง ๆ กัน (เช่น 2026-02-01, 2026-05-01, 2026-07-28) → ระบบดึงอัตรา 4 / 5 / 4.8 ตามลำดับถูกต้อง ตรงกับตัวอย่างใน `Rate_Car`
- [ ] ในวันเดียวกัน ใส่ 3 เส้นทาง โดยเส้นที่ 1 (Fix) เลือก "ไปกลับ", เส้นที่ 2 (Fix) เลือก "เที่ยวเดียว", เส้นที่ 3 (Custom) เลือก "ไปกลับ" และกรอก km เอง → เฉพาะเส้นที่ 1 ถูกคูณ 2 ใน `Total_KM`/`Net_Total` (badge "🔁 ไปกลับ ×2"), เส้นที่ 2 ไม่คูณ, เส้นที่ 3 (Custom) ใช้ค่า km ที่พิมพ์ตรง ๆ **ไม่ถูกคูณ 2** แม้เลือก "ไปกลับ" (badge "🔁 ไปกลับ" แบบไม่มี ×2)
- [ ] เลือกเส้นทาง Custom → ต้อง**มี** Toggle "เที่ยวเดียว/ไปกลับ" ให้กดเหมือน Fix (ต่างจาก v4-v9 ที่ซ่อนไว้) และ hint text ใต้ช่อง KM ยังคงแสดงอยู่เหมือนเดิม
- [ ] บันทึก Trip Custom ที่เลือก "ไปกลับ" แล้วเปิดดู `Trip_Details` JSON ที่บันทึกจริง → ต้องเห็น `trip_type: "ROUND_TRIP"` ของ Card นั้น (ไม่ใช่ `null`) เพื่อยืนยันว่าเก็บไว้เป็นข้อมูล Audit ให้ HR ตรวจสอบได้
- [ ] สลับ Card จาก Fix (เคยเลือกไปกลับ) → Custom (หรือกลับกัน) → ค่า Toggle "เที่ยวเดียว/ไปกลับ" **ยังคงค่าเดิมไว้** ไม่รีเซ็ตเป็น null (ต่างจาก v4-v9) ส่วน Field อื่นที่ผูกกับ Route/KM ยังรีเซ็ตตามปกติ
- [ ] ส่งค่า `km`/`Total_KM` ปลอมจาก client (แก้ผ่าน dev tools) → Backend คำนวณ `Total_KM`/`Net_Total` ใหม่เองไม่เชื่อค่าที่ส่งมา
- [ ] ส่ง Trip ที่ `trip_type` เป็น `null`/ว่างมาจาก Client (จำลอง Bug ฝั่ง Frontend) → Backend ต้อง Reject การ Submit ทั้งหมดพร้อม Error message ชัดเจน (ตาม Validation ข้อ 4.3 ข้อ 1 ที่แก้ไข v10)

**External Library / CDN Version Pinning (v10 — ใหม่):**
- [ ] ตรวจโค้ด Frontend ทั้งหมดก่อน Deploy จริง ว่าไม่มี `<script src="...">`/`<link href="...">` ที่ชี้ไป CDN แบบไม่ระบุ Version หรือใช้ `@latest`/`@next` หลงเหลืออยู่เลย
- [ ] ทุก External script/style ที่ใช้งานจริงมีคอมเมนต์กำกับ Version + วันที่ Pin ตามรูปแบบข้อ 5.3
- [ ] จำลองการเปลี่ยน Version ของ Library หนึ่งตัวโดยตั้งใจ (แก้ URL ในโค้ด ไม่ใช่รอ CDN อัปเดตเอง) → ต้องมีการทดสอบ Regression ทุกหน้าจอที่พึ่งพา Library นั้นก่อน Deploy จริง

**Mobile UX (ใหม่):**
- [ ] ทดสอบบนหน้าจอมือถือจริง (ไม่ใช่ desktop resize) ทุก field ตัวเลขเรียกคีย์แพดตัวเลข ไม่ใช่คีย์บอร์ดเต็ม
- [ ] Sticky summary bar แสดงตลอดเวลาแม้ scroll ผ่าน 5+ การ์ด
- [ ] กดปุ่มบันทึกซ้ำ ๆ ระหว่างรอผล → ไม่เกิด submit ซ้ำ (ปุ่ม disable ระหว่าง loading)

**Performance / Concurrency (v6 — ใหม่):**
- [ ] จำลอง 3-4 คนกด `submitTransaction` (คนละ Record) พร้อมกัน → ทุกคนได้รับผลสำเร็จภายในเวลาที่สมเหตุสมผล (ไม่ค้างเกิน ~15-20 วิ) ไม่มี Record ไหนข้อมูลหาย/เขียนทับผิดแถว
- [ ] ระหว่างมีคนกำลัง `submitTransaction` อยู่ ให้อีกคนเปิด Day Summary List (`listTransactionsByDate`) พร้อมกัน → ต้อง**ไม่ถูกบล็อกรอ Lock** โหลดเร็วตามปกติ (พิสูจน์ว่าอ่าน/เขียนแยก Lock กันจริงตาม 4.6.6)
- [ ] ตรวจโค้ดจริงว่าไม่มีการวนลูป `getValue()`/`setValue()` ทีละ Cell ในฟังก์ชันที่ทำงานกับ `Transactions` sheet (ตรวจตาม 4.6.1)
- [ ] ปิด Master data sheet ชั่วคราว (จำลอง error) ระหว่างที่ Cache ยังไม่หมดอายุ → แอปยังใช้ Master data จาก Cache ได้ปกติ (พิสูจน์ Cache ทำงานตาม 4.6.3)

**Data Retention / Email Export (v8 — ใหม่):**
- [ ] Transaction ที่ `Req_Date` เก่ากว่า `RETENTION_DAYS` (10 วัน) จากวันปัจจุบัน → ถูกจัดเข้ากลุ่ม `rowsToDelete` ถูกต้อง ส่วน Transaction ในช่วง 10 วันล่าสุดไม่ถูกลบ
- [ ] เรียก `dailyMaintenance()` ตอนไม่มีแถวเก่าเกินกำหนดเลย → ไม่มีการส่งอีเมลใด ๆ และ Sheet ไม่ถูกเขียนทับ
- [ ] จำลอง `sendData()` ล้มเหลว (เช่น ปิด/ทำให้ Gmail quota เกิน) ระหว่าง `dailyMaintenance()` ทำงาน → ต้อง**ไม่มี**แถวถูกลบออกจาก Sheet เลย (ข้อมูลปลอดภัยไว้ก่อนเสมอ ไม่มีการลบโดยไม่มีสำรอง)
- [ ] สำรองข้อมูลสำเร็จ → ไฟล์แนบเป็น `.xlsx` เปิดได้จริง มีแถว Header + ข้อมูล**ทั้งหมด**ของ Sheet `Transactions` ณ ขณะนั้น (ไม่ใช่แค่ส่วนที่จะลบ)
- [ ] อีเมลที่ส่งออกต้องถึงผู้รับทุกคนใน `MAINTENANCE_EMAIL_RECIPIENTS` (ทดสอบกับ 2 อีเมลขึ้นไปตามตัวอย่างที่กำหนด)
- [ ] Temporary Google Sheet ที่สร้างระหว่างแปลงเป็น Excel ต้องถูกลบ/ย้ายลงถังขยะหลังใช้งานเสร็จทุกครั้ง ไม่ค้างสะสมใน Drive
- [ ] เรียก `sendData()` แบบ Standalone (ไม่ผ่าน `dailyMaintenance`) → ทำงานเหมือนกันทุกประการกับตอนถูกเรียกจาก `dailyMaintenance` คือส่งไฟล์แนบข้อมูลทั้ง Sheet ปัจจุบัน ไม่ error
- [ ] ปรับค่า `RETENTION_DAYS` ใน `Config.gs` (เช่นจาก 10 → 20) แล้วรันใหม่ → เกณฑ์การลบเปลี่ยนตามค่าใหม่ทันที โดยไม่ต้องแก้โค้ดจุดอื่น

**Master_Site Sorting (v9 — ใหม่):**
- [ ] ทดสอบด้วย `Master_Site` ที่มี 50-70 แถว (Active = TRUE ปนกับ FALSE) → Dropdown "SITE งาน" แสดงเฉพาะแถว Active และเรียงตาม `Site_Name` A-Z/ก-ฮ ถูกต้อง
- [ ] วัดเวลาโหลด `getDataOnLoad()` ตอน Cache ยังไม่หมดอายุ เทียบก่อน/หลังเพิ่มจำนวน `Master_Site` เป็น 70 แถว → เวลาโหลดต้องไม่แตกต่างอย่างมีนัยสำคัญ
- [ ] เพิ่ม Site ใหม่กลางลิสต์ (เช่นชื่อขึ้นต้นด้วยตัวอักษรกลางๆ) → หลัง Cache หมดอายุรอบถัดไป Dropdown ต้องแทรกตามลำดับตัวอักษรถูกที่ ไม่ใช่ต่อท้าย
