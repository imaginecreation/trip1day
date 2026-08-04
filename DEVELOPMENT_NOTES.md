# 📝 Development Notes & Core Patterns (Trip1Day)
*เอกสารนี้คือ "ความทรงจำและไกด์ไลน์" ของโปรเจกต์ เพื่อใช้สรุปบริบทให้ AI ตัวใหม่ในการเปิด New Chat ห้ามลบ!*

## 🏗️ 1. สถาปัตยกรรมระบบ (Architecture)
- **Frontend (UI):** วางอยู่บน **GitHub Pages** เป็น Static HTML/CSS/JS (ไม่มี Node.js/Webpack) การสลับหน้าจอ (Router) ใช้การซ่อน/แสดง `div` ผ่าน `window.App.navigateTo()`
- **Backend (API):** **Google Apps Script (GAS)** ทำตัวเป็น REST API ผ่านฟังก์ชัน `doPost()` 
- **Database:** **Google Sheets** ทุกตารางถูก map ไว้ใน `CONFIG.SHEETS`

## 🚀 2. การเชื่อมต่อและการ Deploy (Deployment Rules)
- ฝั่ง Frontend: ยิง API ไปที่ GAS ด้วย `fetch` (`POST` แบบ `text/plain` เพื่อหลบเลี่ยง CORS Preflight) โดย URL ของ GAS จะเก็บอยู่ในตัวแปร `window.GAS_API_URL` ภายในไฟล์ `config_api.js`
- **🔥 [สำคัญมาก] การ Deploy ฝั่ง Backend:** 
  - บนเครื่องนี้ การรัน `clasp push` มักเจอบั๊ก `Premature close` จากเครือข่าย/Node.js ทำให้ดันไฟล์ไม่ขึ้น
  - **วิธีแก้ที่ใช้:** ให้รันสคริปต์ `python gas_sync.py push` เพื่อดันโค้ดขึ้น GAS แทน! (สคริปต์นี้ใช้ urllib ดันไฟล์ตรงๆ ไม่ผ่าน clasp)
  - หลังจาก push ด้วย python เสร็จ **ผู้ใช้ต้องเข้าไปที่เว็บ Apps Script กดยืนยัน Deploy > New Deployment ด้วยตัวเองทุกครั้ง** ห้ามพยายามใช้คำสั่ง `clasp deploy` เด็ดขาด เพราะมันอาจไปสร้าง Web App URL ใหม่ (ซึ่งจะทำให้ Frontend พังเพราะหา API ไม่เจอ)

## ⚡ 3. การจัดการฐานข้อมูลและ Cache (Database & Cache Rules)
เนื่องจาก Google Sheets มี **Rate Limit** ห้ามดึง/เขียนข้อมูลถี่เกินไป ระบบจึงถูกดีไซน์มาอย่างเคร่งครัดดังนี้:
1. **Bulk Read/Write:** ห้ามใช้ `sheet.getRange(row, col).getValue()` วนลูปทีละแถว ให้ดึงทั้งก้อนด้วย `getValues()` เสมอ
2. **ระบบ Cache (CacheService):** ข้อมูลทุกอย่างที่อ่านจาก Sheet จะต้องถูกเก็บเข้า Cache ผ่าน `Repository_Cache.getCached(key, loaderFn)` โดยมีอายุ 10 นาที
3. **Chunking Cache:** CacheService ของ GAS จำกัดขนาดที่ 100KB ต่อ Key โค้ดของเรามีระบบ Chunking อัตโนมัติ (ซอยข้อมูลเป็นส่วนๆ) ให้ใช้อย่างสบายใจ
4. **🔥 Cache Invalidation (เคลียร์ความจำผีหลอก):** 
   - เมื่อมีการ **"บันทึก (Create/Update)"** หรือ **"ลบ (Delete)"** รายการเบิก (Transactions) 
   - Backend **บังคับต้องเรียกคำสั่ง** `Repository_Cache.clearCache('TRANSACTIONS_ALL')` ทันที! เพื่อให้ระบบดึงข้อมูลสดใหม่ ไม่เช่นนั้น UI จะแสดงข้อมูลที่ถูกลบไปแล้ว (Ghost Data) ทำให้เกิดบั๊กลบซ้ำแล้วแจ้งเตือนว่า "ไม่พบรายการ"

## 🛡️ 4. Concurrency Control (การป้องกันผู้ใช้กดพร้อมกัน)
- ฝั่ง Backend (การ Write Data): **ต้องครอบด้วย LockService เสมอ**
  ```javascript
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.LOCK_TIMEOUT_MS)) { return Error('ระบบกำลังประมวลผล...'); }
  try { /* Write Sheet */ } finally { lock.releaseLock(); }
  ```
- ฝั่ง Frontend: **ห้ามให้ผู้ใช้กดย้ำ** เมื่อกดลบ/บันทึก ต้องแสดง Loading Spinner (เช่น ไปยัด HTML ลบหน้าต่างเดิม) แต่ **ระวัง!** อย่าไปลบ Container หลักทิ้ง (เช่น `app-screen-container`) ให้ใช้วิธีสั่ง `window.App.navigateTo('summary_list')` เพื่อให้ระบบวาด UI ใหม่ทั้งหมดแทนการพยายามแก้ไข UI ทีละชิ้น

## 💡 5. สถานะระบบปัจจุบัน (v2.0)
- **เริ่มนับ Version Control ที่ ver.2.0** (ปรับปรุงใหญ่ รองรับ Multi-Trip + Multi-Site per Day):
  - 1. **UX Loading Indicator บน Date Change:** เมื่อกดเลือกวันที่ใหม่ในหน้าแรก (`summary_list`) ระบบจะแสดง Loading Spinner ทันที เพื่อป้องกันผู้เข้าใจผิดคิดว่าข้อมูลเดิมเป็นข้อมูลของวันใหม่
  - 2. **ปรับ Label วันที่:** เปลี่ยนคำว่า "วันที่เบิก" ใน Header สรุปประจำวัน เป็น "วันที่เดินทาง" เพื่อให้ตรงกันทั้งระบบ
  - 3. **ปรับ คำแสดงผล ค่ารถ:** ในตารางสรุปยอดเบิก (Transaction Summary Box) เปลี่ยนจาก "ค่ารถเหมา:" เป็น "ค่ารถ:"
  - 4. **App Title ver.2.0:** แสดง Title "ระบบบันทึกเบิกค่าเดินทาง ver.2.0" บนสุดและในส่วน HTML Title / GAS Page Title
- ฟีเจอร์ "บันทึกข้อมูลแบบแยก Site" และ "ลบข้อมูล (Delete Transaction)" ทำงานได้อย่างสมบูรณ์ผ่าน UAT Load Testing
- บั๊กซ่อนปุ่มลบ (เมื่อสถานะ APPROVED) ใช้งานได้จริง
- พร้อมสำหรับการพัฒนาต่อยอดเวอร์ชันถัดไป (v2.1, v2.2, ...)
