/**
 * Code.js — Web App & REST API Entry Point
 * Mileage Reimbursement System (v10.1)
 * 
 * Supports both direct GAS Web App rendering and external API calls (e.g. GitHub Pages + LINE LIFF)
 */

/**
 * HTTP GET Handler: Serves Index HTML or returns API status
 */
function doGet(e) {
  // If API request via query parameter
  if (e && e.parameter && e.parameter.action) {
    return handleApiRequest(e.parameter.action, e.parameter);
  }

  // Default: Serve HTML Template
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('ระบบบันทึกเบิกค่าเดินทาง')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * HTTP POST Handler: RESTful Web API for GitHub Pages & External Clients
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    
    const action = payload.action || (e && e.parameter ? e.parameter.action : '');
    const data = payload.data || payload;

    const result = handleApiRequest(action, data);

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('doPost Error: ' + error.toString());
    const errRes = Util_Response.buildError('API_ERROR', 'API Request failed: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify(errRes))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * API Request Dispatcher Router
 */
function handleApiRequest(action, data) {
  switch (action) {
    case 'getDataOnLoad': {
      let uid = '';
      if (typeof data === 'string') {
        uid = data;
      } else if (Array.isArray(data)) {
        uid = data[0] || '';
      } else if (data && typeof data === 'object') {
        uid = data.lineUserId || data.line_user_id || '';
      }
      return getDataOnLoad(uid);
    }

    case 'listTransactionsByDate': {
      let dateVal = '';
      let userVal = '';
      if (Array.isArray(data)) {
        dateVal = data[0] || '';
        userVal = data[1] || '';
      } else if (data && typeof data === 'object') {
        dateVal = data.dateStr || data.date || '';
        userVal = data.lineUserId || data.line_user_id || '';
      }
      return listTransactionsByDate(dateVal, userVal);
    }

    case 'getTransactionDetail': {
      let txId = '';
      if (typeof data === 'string') {
        txId = data;
      } else if (Array.isArray(data)) {
        txId = data[0] || '';
      } else if (data && typeof data === 'object') {
        txId = data.transactionId || data.transaction_id || '';
      }
      return getTransactionDetail(txId);
    }

    case 'submitTransaction': {
      let payload = (data && data.payload) ? data.payload : data;
      if (Array.isArray(payload) && payload.length === 1) {
        payload = payload[0];
      }
      return submitTransaction(payload);
    }

    case 'deleteTransaction': {
      let txId = '';
      if (typeof data === 'string') {
        txId = data;
      } else if (Array.isArray(data)) {
        txId = data[0] || '';
      } else if (data && typeof data === 'object') {
        txId = data.transactionId || data.transaction_id || '';
      }
      return deleteTransaction(txId);
    }

    case 'initDatabase':
      return initDatabase();

    default:
      return Util_Response.buildError('INVALID_ACTION', 'Action ' + action + ' is not supported.');
  }
}

/**
 * Helper to include HTML files in templates.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
