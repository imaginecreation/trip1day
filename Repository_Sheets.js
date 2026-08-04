/**
 * Repository_Sheets.js — Data Access Layer for Google Sheets
 * Mileage Reimbursement System (v10.1)
 * 
 * Strict Enforcement: All read/write operations use bulk 2D array methods.
 * No cell-by-cell getValue/setValue loops allowed.
 */

const Repository_Sheets = {
  /**
   * Retrieves Spreadsheet instance.
   */
  getSpreadsheet: function() {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  },

  /**
   * Retrieves specific Sheet instance by name.
   */
  getSheet: function(sheetName) {
    const ss = this.getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error('Sheet not found: ' + sheetName);
    }
    return sheet;
  },

  /**
   * Bulk reads all data from a sheet as a 2D Array.
   */
  bulkRead: function(sheetName) {
    const sheet = this.getSheet(sheetName);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow === 0 || lastCol === 0) return [];
    return sheet.getRange(1, 1, lastRow, lastCol).getValues();
  },

  /**
   * Bulk reads all rows from a sheet and maps them to an Array of JavaScript objects based on header names.
   */
  bulkReadAsObjects: function(sheetName) {
    const values = this.bulkRead(sheetName);
    if (values.length <= 1) return [];
    
    const headers = values[0].map(h => String(h).trim());
    const objects = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const obj = {};
      let empty = true;
      
      for (let j = 0; j < headers.length; j++) {
        const val = row[j];
        obj[headers[j]] = val;
        if (val !== '' && val !== null && val !== undefined) empty = false;
      }
      
      if (!empty) {
        obj._rowIndex = i + 1; // 1-indexed sheet row position
        objects.push(obj);
      }
    }
    
    return objects;
  },

  /**
   * Helper to check if a row is active (defaults to true if column is missing/blank).
   */
  isActiveRow: function(row) {
    if (!row) return false;
    if (row.Active === undefined || row.Active === null || String(row.Active).trim() === '') return true;
    const val = String(row.Active).trim().toUpperCase();
    return val === 'TRUE' || val === '1' || val === 'YES' || val === 'Y';
  },

  /**
   * Sanitizes values to prevent Formula Injection in Google Sheets.
   */
  sanitizeFormulaValues: function(rowValues) {
    return rowValues.map(function(val) {
      if (typeof val === 'string' && (val.startsWith('=') || val.startsWith('+') || val.startsWith('-') || val.startsWith('@'))) {
        return "'" + val;
      }
      return val;
    });
  },

  /**
   * Appends a new row to the specified sheet.
   */
  appendRow: function(sheetName, rowValues) {
    const sheet = this.getSheet(sheetName);
    const sanitized = this.sanitizeFormulaValues(rowValues);
    sheet.appendRow(sanitized);
    SpreadsheetApp.flush();
  },

  /**
   * Updates an existing row identified by transactionId in the Transactions sheet.
   */
  updateRowByTransactionId: function(transactionId, newRowValues) {
    const sheet = this.getSheet(CONFIG.SHEETS.TRANSACTIONS);
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      throw new Error('Transactions sheet is empty.');
    }
    
    const headers = values[0];
    const txIdColIdx = headers.indexOf('Transaction_ID');
    if (txIdColIdx === -1) {
      throw new Error('Transaction_ID header column not found.');
    }
    
    let targetRowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][txIdColIdx]) === String(transactionId)) {
        targetRowIndex = i + 1; // 1-indexed row
        break;
      }
    }
    
    if (targetRowIndex === -1) {
      return false; // Not found
    }
    
    sheet.getRange(targetRowIndex, 1, 1, newRowValues.length).setValues([newRowValues]);
    SpreadsheetApp.flush();
    return true;
  },

  /**
   * Deletes an entire row identified by transactionId in the Transactions sheet.
   */
  deleteRowByTransactionId: function(transactionId) {
    const sheet = this.getSheet(CONFIG.SHEETS.TRANSACTIONS);
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return false;
    }
    
    const headers = values[0];
    const txIdColIdx = headers.indexOf('Transaction_ID');
    if (txIdColIdx === -1) {
      throw new Error('Transaction_ID header column not found.');
    }
    
    let targetRowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][txIdColIdx]) === String(transactionId)) {
        targetRowIndex = i + 1; // 1-indexed row
        break;
      }
    }
    
    if (targetRowIndex === -1) {
      return false; // Not found
    }
    
    sheet.deleteRow(targetRowIndex);
    SpreadsheetApp.flush();
    return true;
  },

  /**
   * Overwrites an entire sheet with headers and data rows in a single bulk operation.
   */
  rewriteSheetData: function(sheetName, headers, dataRows) {
    const sheet = this.getSheet(sheetName);
    sheet.clearContents();
    
    const payload = [headers].concat(dataRows);
    if (payload.length > 0 && payload[0].length > 0) {
      sheet.getRange(1, 1, payload.length, payload[0].length).setValues(payload);
    }
    SpreadsheetApp.flush();
  }
};
