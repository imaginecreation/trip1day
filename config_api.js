/**
 * config_api.js — Configuration for GitHub Pages Deployment
 * 
 * นำ URL ที่ได้จากการ Deploy Google Apps Script (Web App Exec URL) มาวางในนี้
 * ตัวอย่าง: "https://script.google.com/macros/s/AKfycb.../exec"
 */

if (typeof window !== 'undefined') {
  window.GAS_API_URL = "https://script.google.com/macros/s/AKfycbzoNxwgdAc_bPs0_iGRdJZcxAF00GRGTnn5KSV3tyeUnUeSVulbTWrzh7JpSYc2wlYykQ/exec";
}
