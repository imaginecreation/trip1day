/**
 * Api_Write.js — Transaction Submission & Write API Endpoint
 * Mileage Reimbursement System (v10.1)
 * 
 * Strict Enforcement: All validations & calculations completed BEFORE acquiring LockService.
 * Lock window is kept as short as possible.
 */

function submitTransaction(payload) {
  // Step 1: Pre-Lock Validation
  const validationError = Service_Validation.validateSubmitPayload(payload);
  if (validationError) {
    return validationError;
  }

  try {
    const lineUserId = String(payload.line_user_id || '').trim();
    const reqName = String(payload.req_name || '').trim();
    const reqDateStr = Util_Date.formatDateBangkok(payload.req_date || Util_Date.getTodayBangkok());
    const siteId = String(payload.site_id).trim();

    // Lookup Site_Name
    const activeSites = Repository_Cache.getCached('MASTER_SITE_ACTIVE', function() {
      const all = Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.MASTER_SITE);
      return all.filter(s => String(s.Active).toUpperCase() === 'TRUE');
    });
    const matchSite = activeSites.find(s => String(s.Site_ID) === siteId);
    const siteName = matchSite ? matchSite.Site_Name : '';

    // Lookup user profile group_car (default 1)
    let groupCar = 1;
    if (lineUserId) {
      const profiles = Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.USERS_PROFILE);
      const matchProf = profiles.find(p => String(p.Line_uid) === lineUserId);
      if (matchProf && matchProf.group_car) {
        groupCar = Number(matchProf.group_car);
      }
    }

    // Recalculate Totals on Backend (Never trust client figures)
    const calcResult = Service_RateCalc.calculateTotals(
      reqDateStr,
      groupCar,
      payload.trip_details,
      payload.toll_fee,
      payload.park_fee,
      payload.flat_rate_fee
    );

    const nowIso = Util_Date.getNowIsoBangkok();
    const tripDetailsJson = JSON.stringify(payload.trip_details);

    // Step 2: Critical Section — Acquire LockService
    const lock = LockService.getScriptLock();
    const successLock = lock.tryLock(CONFIG.LOCK_TIMEOUT_MS);
    if (!successLock) {
      return Util_Response.buildError('CONCURRENT_WRITE_CONFLICT', 'ระบบกำลังประมวลผลข้อมูล โปรดลองใหม่อีกครั้งในอีก 15 วินาที');
    }

    try {
      const allTx = Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.TRANSACTIONS);
      const isCreateNew = !payload.transaction_id || !String(payload.transaction_id).trim();

      if (isCreateNew) {
        // Check for duplicate composite key (Date + LineUser + Site)
        const duplicate = allTx.find(tx => {
          const dStr = Util_Date.formatDateBangkok(tx.Req_Date);
          return dStr === reqDateStr && 
                 String(tx.Req_LINE_UserId) === lineUserId && 
                 String(tx.Site_ID) === siteId;
        });

        if (duplicate) {
          return Util_Response.buildError(
            'DUPLICATE_SITE_RECORD', 
            'มีการบันทึกข้อมูลของ SITE (' + siteName + ') ในวันที่ ' + reqDateStr + ' อยู่แล้ว'
          );
        }

        const newTxId = 'TX-' + Utilities.getUuid();
        const newRow = [
          newTxId,
          reqName,
          lineUserId,
          reqDateStr,
          payload.plate_no || '',
          siteId,
          siteName,
          payload.travel_purpose || '',
          payload.image_url || '',
          calcResult.totalKm,
          Number(payload.toll_fee || 0),
          Number(payload.park_fee || 0),
          Number(payload.flat_rate_fee || 0),
          calcResult.netTotal,
          payload.approver || '',
          'PENDING',
          '', // Approve_Datetime (Blank on submit)
          tripDetailsJson,
          nowIso, // Created_At
          nowIso  // Updated_At
        ];

        Repository_Sheets.appendRow(CONFIG.SHEETS.TRANSACTIONS, newRow);

        return Util_Response.buildSuccess({
          transaction_id: newTxId,
          status: 'PENDING',
          total_km: calcResult.totalKm,
          net_total: calcResult.netTotal,
          message: 'บันทึกข้อมูลและส่งขออนุมัติเรียบร้อยแล้ว'
        });

      } else {
        // Edit Mode: Update existing row by transaction_id
        const targetTxId = String(payload.transaction_id).trim();
        const existingTx = allTx.find(t => String(t.Transaction_ID) === targetTxId);

        if (!existingTx) {
          return Util_Response.buildError('NOT_FOUND', 'ไม่พบข้อมูลรายการที่ต้องการแก้ไข');
        }

        // Edit-Lock Enforcement: Reject if APPROVED
        if (String(existingTx.Status).toUpperCase() === 'APPROVED') {
          return Util_Response.buildError('LOCKED_TRANSACTION', 'รายการนี้ได้รับการอนุมัติแล้ว ไม่สามารถแก้ไขได้');
        }

        const updatedRow = [
          targetTxId,
          reqName,
          lineUserId,
          reqDateStr,
          payload.plate_no || '',
          siteId,
          siteName,
          payload.travel_purpose || '',
          payload.image_url || '',
          calcResult.totalKm,
          Number(payload.toll_fee || 0),
          Number(payload.park_fee || 0),
          Number(payload.flat_rate_fee || 0),
          calcResult.netTotal,
          payload.approver || '',
          'PENDING', // Reset status to PENDING on resubmission
          existingTx.Approve_Datetime || '',
          tripDetailsJson,
          existingTx.Created_At || nowIso,
          nowIso // Updated_At
        ];

        const updated = Repository_Sheets.updateRowByTransactionId(targetTxId, updatedRow);
        if (!updated) {
          return Util_Response.buildError('SERVER_ERROR', 'ไม่สามารถบันทึกแก้ไขข้อมูลในตารางได้');
        }

        return Util_Response.buildSuccess({
          transaction_id: targetTxId,
          status: 'PENDING',
          total_km: calcResult.totalKm,
          net_total: calcResult.netTotal,
          message: 'แก้ไขและส่งขออนุมัติเรียบร้อยแล้ว'
        });
      }

    } finally {
      try {
        lock.releaseLock();
      } catch (e) {
        // Ignore if lock expired or not held
      }
    }

  } catch (error) {
    Logger.log('submitTransaction Error: ' + error.toString());
    return Util_Response.buildError('SERVER_ERROR', 'เกิดข้อผิดพลาดขณะบันทึกข้อมูล: ' + error.message);
  }
}
