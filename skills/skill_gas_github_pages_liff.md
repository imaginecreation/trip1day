# 🚀 Blueprint: Scalable Web App (GitHub Pages + GAS + Google Sheets + LINE LIFF)

เอกสารนี้รวบรวม **"เคล็ดวิชา (Best Practices & Architecture)"** สำหรับการสร้าง Web Application ที่แยกส่วน Frontend ไว้บน GitHub Pages และใช้ Google Apps Script (GAS) เป็น Backend API เชื่อมกับตาราง Google Sheets โดยรองรับผู้ใช้งานพร้อมกันจำนวนมากได้อย่างรวดเร็วและไม่พัง

สามารถนำเนื้อหาด้านล่างนี้ไปเป็น **Prompt** สั่งงาน AI ในโปรเจกต์ใหม่ได้เลยครับ

---

## 📌 Prompt สำหรับสั่งงาน AI ในโปรเจกต์ใหม่

> **[Copy ข้อความด้านล่างนี้ไปสั่ง AI เพื่อเริ่มโปรเจกต์ใหม่ได้เลย]**
> 
> "ฉันต้องการสร้าง Web Application ใหม่ โดยใช้ Architecture ดังต่อไปนี้:
> 
> **1. โครงสร้างสถาปัตยกรรม (Architecture):**
> - **Frontend:** พัฒนาด้วย HTML, CSS (Vanilla/Glassmorphism) และ JavaScript แยกไฟล์ให้เป็นระเบียบ (Component-based) และนำไปโฮสต์ไว้บน **GitHub Pages**
> - **Backend (API):** ใช้ **Google Apps Script (GAS)** สร้างเป็น RESTful API (`doGet` / `doPost`)
> - **Database:** ใช้ **Google Sheets** ในการเก็บข้อมูลทั้งหมด
> - **Authentication:** เชื่อมต่อกับ **LINE LIFF SDK** เพื่อดึงโปรไฟล์ผู้ใช้และ UID อัตโนมัติ (ไม่ต้องมีระบบ Login เอง)
> - **CORS Bypass:** ฝั่ง Frontend ต้องยิง API ด้วย `fetch` แบบ `POST` และตั้งค่า Headers `Content-Type: text/plain;charset=utf-8` เพื่อหลีกเลี่ยงปัญหา CORS Preflight กับ GAS
> 
> **2. กฎการเขียนโค้ดเพื่อประสิทธิภาพ (Performance & Scalability Rules):**
> - 🚫 **ห้ามอ่าน/เขียนข้อมูลทีละเซลล์ (No Cell-by-Cell Loops):** การทำงานกับ Google Sheets ฝั่ง GAS จะต้องใช้ท่า **Bulk Read/Write** เท่านั้น เช่น `sheet.getRange(...).getValues()` หรือ `setValues()` ห้ามใช้ลูป `getValue()` เด็ดขาดเพื่อหลีกเลี่ยงคอขวด
> - ⚡ **ต้องใช้ CacheService (Script Cache):** ข้อมูล Master Data ที่ไม่ค่อยเปลี่ยน (เช่น รายชื่อสาขา, การตั้งค่า) หรือข้อมูล Transaction ที่มีการดึงบ่อยๆ **ต้องถูกเก็บลง RAM (CacheService)** เป็นเวลา 5-10 นาที เพื่อให้รองรับคนเข้าใช้งานพร้อมกัน 50-100 คนได้โดยไม่ติด Rate Limit ของ Google (Error 429 Too Many Requests)
> - 🧹 **Auto-Clear Cache เมื่อมีการ Write (Cache Invalidation):** เมื่อมีการสั่งบันทึกข้อมูล (Submit) ลง Sheet สำเร็จ Backend จะต้องสั่ง `CacheService.getScriptCache().remove(key)` เพื่อล้าง Cache ทันที เพื่อให้ผู้ใช้เห็นข้อมูลที่เพิ่งอัปเดตแบบ Real-time
> - ⏱️ **การจัดการ Timeout และ Retry ฝั่ง Frontend:** เนื่องจาก GAS อาจมีความหน่วง ต้องใช้ `AbortController` จำกัดเวลา Request ไม่เกิน 30 วินาที และเมื่อเจอปัญหา Network Error ให้มีระบบ Auto-Retry อย่างน้อย 1 ครั้ง
> - 🔒 **UI Blocking:** ทุกครั้งที่กดปุ่ม 'บันทึก' ต้องมีการแสดง Loading Overlay ทับเต็มหน้าจอ (Full-screen Overlay) และ Disable ปุ่มทันที เพื่อป้องกันผู้ใช้กดเบิ้ล ซึ่งจะทำให้เกิดการบันทึกซ้ำซ้อน (Duplicate Entry) และทำให้ LockService ของ GAS ทำงานหนัก
> 
> **3. การจัดการไฟล์ (File Structure):**
> - สร้างไฟล์ `config_api.js` แยกต่างหากสำหรับเก็บค่า `GAS_API_URL`
> - แยกไฟล์ Component ต่างๆ เพื่อให้ง่ายต่อการซ่อมแซมและขยายระบบในอนาคต"

---

## 🧠 อธิบายเทคนิคเชิงลึก (Skill Breakdown)

หากต้องการทำความเข้าใจว่าทำไมเราถึงต้องบังคับกฎเหล่านี้ นี่คือเหตุผลเบื้องหลังครับ:

### 1. ทำไมต้อง `text/plain` ในการส่ง Fetch API?
Google Apps Script (GAS) Web App มีข้อจำกัดเรื่อง CORS (Cross-Origin Resource Sharing) หากเรายิง Request แบบ `application/json` เบราว์เซอร์จะส่งคำสั่ง OPTIONS (Preflight) ไปถามเซิร์ฟเวอร์ก่อน ซึ่ง GAS **ไม่รองรับ** OPTIONS และจะตอบกลับมาเป็น Error เสมอ 
**วิธีแก้:** เราจึงต้องปลอมตัวส่งเป็น `text/plain` (ซึ่งเป็น Simple Request จะไม่เกิด Preflight) และเมื่อถึง GAS ค่อยจับแปลงข้อความเป็น JSON ด้วย `JSON.parse(e.postData.contents)`

### 2. ยาแก้ปวดหัว Error 429 (Too Many Requests)
GAS อนุญาตให้รันโค้ดและเข้าถึง Google Sheets ได้ในจำนวนครั้งที่จำกัดต่อนาที หากมีพนักงาน 50 คนเปิดแอปพร้อมกันตอนเช้าเพื่อลงชื่อ ระบบจะพังทันที (เซิร์ฟเวอร์ส่งหน้าเว็บ HTML Error กลับมาจนหน้าบ้านพัง)
**วิธีแก้:** `CacheService.getScriptCache()` คือฮีโร่ มันจะช่วยรับแรงกระแทกแทน Sheet แค่คนแรกยอมช้า 2 วินาที คนที่เหลืออีก 49 คนจะได้ข้อมูลจาก RAM (0.05 วินาที) และไม่นับเป็นโควต้าการอ่าน Sheet

### 3. เทคนิค Cache Invalidation (ระเบิด Cache ทิ้งเมื่อมีของใหม่)
ปัญหาของการทำ Cache คือ ข้อมูลอาจจะไม่สดใหม่ (Stale Data)
**วิธีแก้:** เราแยกประเภทของ Cache
- **Master Data:** (เช่น ชื่อไซต์งาน) เปลี่ยนแปลงน้อยมาก ปล่อยให้มันหมดอายุเองทุกๆ 10 นาที (ไม่ต้องรีบล้าง)
- **Transaction Data:** (ประวัติการบันทึก) เราสั่งล้าง Cache ก้อนนี้ทิ้ง **"ทันที"** หลังบรรทัดคำสั่ง `sheet.appendRow()` ทำงานเสร็จ ทำให้ทันทีที่ผู้ใช้เด้งกลับมาหน้าแรก ระบบจะพบว่า Cache ก้อนนี้ว่างเปล่า และไปดึงข้อมูลใหม่มาโชว์ทันที

### 4. การรับมือกับ Network กระตุก (Frontend Resilience)
ระบบผ่านมือถือ โดยเฉพาะไซต์งานต่างจังหวัด อินเทอร์เน็ตอาจจะหายไปดื้อๆ
**วิธีแก้:** 
- `AbortController`: กันไม่ให้แอปค้างเติ่งเกิน 30 วินาที
- `Auto-Retry`: ถ้าเกิด Timeout หรือ Network Error ให้ลองยิงซ้ำใหม่อีก 1 ครั้งเบื้องหลังเงียบๆ 
- `Global Overlay`: ป้องกันยูสเซอร์มือบอนกดปุ่มซ้ำรัวๆ ตอนเน็ตช้า

นำคู่มือนี้ไปอ้างอิงหรือส่งให้ AI เวลาจะเริ่มโปรเจกต์ใหม่ได้เลยครับ รับรองว่าสถาปัตยกรรมจะออกมาแน่นปึ้กตั้งแต่ Day 1 เลย! 🚀
