# 📝 Development Notes & Core Patterns (trip1day)

เอกสารนี้สรุป **รูปแบบการเขียนโค้ด (Design Patterns)** และ **เทคนิคที่ใช้แก้ปัญหา (Solutions)** จากการพัฒนาระบบบันทึกเบิกค่าเดินทางในเฟสที่ผ่านมา เพื่อใช้เป็นไกด์ไลน์สำหรับการพัฒนาฟีเจอร์ถัดไป (เช่น การปรับปรุงระบบเส้นทาง Master Route และระบบสายอนุมัติ)

---

## 🏗️ 1. สถาปัตยกรรมระบบ (Architecture)
- **Frontend:** HTML, CSS, JS ล้วน (ไม่มี Node.js/Webpack) โฮสต์อยู่บน **GitHub Pages**
- **Backend:** Google Apps Script (GAS) ทำตัวเป็น REST API
- **Database:** Google Sheets
- **การเชื่อมต่อ:** ใช้ `fetch` ยิง POST Request ด้วย `Content-Type: text/plain;charset=utf-8` เพื่อหลบเลี่ยงปัญหา CORS Preflight

## ⚡ 2. การจัดการประสิทธิภาพและกันระบบล่ม (Performance & Scalability)
ปัญหาใหญ่ของการใช้ Google Sheets เป็น Database คือ **Rate Limit** ถ้ามีการอ่าน/เขียนถี่เกินไป (เช่น 3 ครั้งใน 10 วินาที) Google จะบล็อกและตอบกลับมาเป็นหน้าเว็บ HTML (Error 429) ซึ่งจะทำให้ Frontend พัง 

**เทคนิคที่ใช้แก้ปัญหา (กฎเหล็ก):**
1. **Bulk Read/Write เสมอ:** ห้ามใช้ `sheet.getRange(row, col).getValue()` วนลูปทีละแถวเด็ดขาด ให้ใช้ `sheet.getRange().getValues()` ดึงข้อมูลทั้งตารางมารอบเดียว
2. **ระบบ Cache (CacheService):** ข้อมูลที่ดึงจาก Sheet ต้องถูกจับยัดใส่ RAM (`CacheService.getScriptCache()`) ทันที
   - **Master Data** (Sites, Routes, Approvers, Rate): ตั้งเวลาหมดอายุ (TTL) 10 นาที
   - **Transaction Data** (ประวัติการเดินทาง, Profile): ตั้งเวลาหมดอายุ 10 นาทีเช่นกัน **แต่** มีข้อยกเว้นคือ "ต้องสั่งล้าง Cache ทิ้งทันที (Cache Invalidation)" เมื่อมีการบันทึกหรือแก้ไขข้อมูลสำเร็จ (`Repository_Cache.clearCache('TRANSACTIONS_ALL')`) เพื่อให้ผู้ใช้เห็นข้อมูลใหม่ทันทีแบบ Real-time
3. **ป้องกัน UI ฝั่งผู้ใช้:** 
   - เมื่อผู้ใช้กดปุ่ม "บันทึก" ต้องสร้าง Loading Overlay บังเต็มหน้าจอทันที ห้ามให้ผู้ใช้กดย้ำเด็ดขาด 
   - ต้องมี `AbortController` ตั้งเวลา Timeout (เช่น 30 วินาที) ถ้า Google ไม่ตอบกลับ ให้ตัดจบและแจ้งเตือนผู้ใช้แทนที่จะปล่อยแอปค้าง

## 🚀 3. แนวทางสำหรับการพัฒนาฟีเจอร์ต่อไป (Next Steps)

### ฟีเจอร์: การปรับปรุงระบบเส้นทาง (Master Route)
- **Concept:** หากจะมีการเพิ่ม/ลบ/แก้ไข Master Routes
- **Rule:** โค้ดฝั่ง Backend (GAS) ที่ทำหน้าที่ Write เส้นทางใหม่ลง Sheet จะต้องมีการใส่คำสั่ง `Repository_Cache.clearCache('MASTER_ROUTES_ACTIVE')` ทุกครั้งหลังจากการ Write สำเร็จ เพื่อให้หน้าบ้านดึงข้อมูลเส้นทางใหม่ไปแสดงได้ทันทีโดยไม่ต้องรอ 10 นาที

### ฟีเจอร์: การปรับปรุงระบบผู้อนุมัติ (Approver)
- **Concept:** การอัปเดตสถานะ (Approve/Reject) หรือการเปลี่ยนสายอนุมัติ
- **Rule:** 
  1. หากแก้ไขรายชื่อผู้อนุมัติ (Master Data) ต้อง clear cache `APPROVE_USERS_ACTIVE`
  2. หากผู้อนุมัติกด Approve ทริป (Transaction Data) ต้องอย่าลืมเรียก `Repository_Cache.clearCache('TRANSACTIONS_ALL')` เพื่อให้ฝั่งคนขอเบิกเห็นสถานะ "อนุมัติแล้ว" ทันที
  3. **Concurrency:** เวลาผู้อนุมัติกดอนุมัติ ต้องใช้ `LockService.getScriptLock()` เพื่อป้องกันกรณีคนขอเบิกกดแก้ไขเอกสารในเสี้ยววินาทีเดียวกันกับที่หัวหน้ากดอนุมัติ

---
*อัปเดตล่าสุด: สิงหาคม 2026*
