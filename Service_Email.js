/**
 * Service_Email.js — Data Backup Exporter & Email Sender
 * Mileage Reimbursement System (v10.1)
 */

const Service_Email = {
  /**
   * Standalone/Middleware function to backup full Transactions sheet to Excel (.xlsx) and send via email.
   * Takes NO parameters.
   */
  sendData: function() {
    try {
      // 1. Read all rows from Transactions sheet
      const allRows = Repository_Sheets.bulkRead(CONFIG.SHEETS.TRANSACTIONS);
      if (allRows.length === 0) {
        return Util_Response.buildSuccess({ message: 'No data to send.' });
      }

      // 2. Create temporary Google Spreadsheet
      const timeStampStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd_HHmm');
      const tempFileName = 'เบิกค่าเดินทาง_backup_' + timeStampStr;
      const tempSs = SpreadsheetApp.create(tempFileName);
      const tempId = tempSs.getId();
      const tempSheet = tempSs.getActiveSheet();

      // Write 2D array in bulk
      tempSheet.getRange(1, 1, allRows.length, allRows[0].length).setValues(allRows);
      SpreadsheetApp.flush();

      // 3. Convert temporary sheet to .xlsx Blob via Export URL
      const exportUrl = 'https://docs.google.com/spreadsheets/d/' + tempId + '/export?format=xlsx';
      const response = UrlFetchApp.fetch(exportUrl, {
        headers: {
          'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
        },
        muteHttpExceptions: true
      });

      if (response.getResponseCode() !== 200) {
        throw new Error('Failed to export XLSX blob from temporary sheet. HTTP Status: ' + response.getResponseCode());
      }

      const excelBlob = response.getBlob().setName(tempFileName + '.xlsx');

      // 4. Trash temporary Google Sheet immediately
      try {
        DriveApp.getFileById(tempId).setTrashed(true);
      } catch (e) {
        Logger.log('Warning: Failed to trash temp file ' + tempId + ': ' + e.message);
      }

      // 5. Send Email via GmailApp
      const recipients = CONFIG.MAINTENANCE_EMAIL_RECIPIENTS;
      const subject = 'สำรองข้อมูลค่าเดินทาง - ' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm');
      const body = 'เรียน ผู้รับผิดชอบ,\n\nระบบได้ทำการสำรองข้อมูลทั้งหมดในตาราง Transactions จำนวน ' + (allRows.length - 1) + ' รายการ เรียบร้อยแล้ว\nรายละเอียดแนบในไฟล์ Excel (.xlsx)';

      GmailApp.sendEmail(recipients, subject, body, {
        attachments: [excelBlob]
      });

      return Util_Response.buildSuccess({
        exportedRows: allRows.length - 1,
        recipients: recipients
      });

    } catch (error) {
      Logger.log('Service_Email.sendData Error: ' + error.toString());
      return Util_Response.buildError('EMAIL_SEND_FAILED', 'ล้มเหลวในการส่งอีเมลสำรองข้อมูล: ' + error.message);
    }
  }
};
