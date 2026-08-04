/**
 * Job_DailyMaintenance.js — Daily Cleanup & Retention Maintenance Job
 * Mileage Reimbursement System (v10.1)
 */

function dailyMaintenance() {
  const lock = LockService.getScriptLock();
  try {
    const successLock = lock.tryLock(CONFIG.LOCK_TIMEOUT_MS);
    if (!successLock) {
      Logger.log('dailyMaintenance: Lock contention, terminating execution.');
      return Util_Response.buildError('CONCURRENT_WRITE_CONFLICT', 'ไม่สามารถขอ Lock ได้ในเวลาที่กำหนด');
    }

    const retentionDays = CONFIG.RETENTION_DAYS || 10;
    const cutoffDateStr = Util_Date.getCutoffDateBangkok(retentionDays);

    const allValues = Repository_Sheets.bulkRead(CONFIG.SHEETS.TRANSACTIONS);
    if (allValues.length <= 1) {
      Logger.log('dailyMaintenance: Transactions sheet has no data to cleanup.');
      return Util_Response.buildSuccess({ message: 'No rows to clean up.' });
    }

    const headers = allValues[0];
    const reqDateIdx = headers.indexOf('Req_Date');

    if (reqDateIdx === -1) {
      throw new Error('Req_Date column not found in Transactions sheet.');
    }

    const rowsToKeep = [];
    const rowsToDelete = [];

    for (let i = 1; i < allValues.length; i++) {
      const row = allValues[i];
      const rowDateStr = Util_Date.formatDateBangkok(row[reqDateIdx]);

      if (rowDateStr && rowDateStr < cutoffDateStr) {
        rowsToDelete.push(row);
      } else {
        rowsToKeep.push(row);
      }
    }

    if (rowsToDelete.length === 0) {
      Logger.log('dailyMaintenance: No rows older than cutoff date ' + cutoffDateStr + '. Skipping backup and deletion.');
      return Util_Response.buildSuccess({ deletedCount: 0, message: 'No rows older than retention threshold.' });
    }

    Logger.log('dailyMaintenance: Found ' + rowsToDelete.length + ' rows older than ' + cutoffDateStr + '. Executing full backup first...');

    // Execute sendData() full backup BEFORE deletion
    const backupResult = Service_Email.sendData();
    if (!backupResult || !backupResult.success) {
      Logger.log('CRITICAL: sendData() backup failed! Aborting deletion to protect data.');
      return Util_Response.buildError('BACKUP_FAILED', 'การสำรองข้อมูลก่อนลบล้มเหลว: ' + (backupResult ? backupResult.message : 'Unknown error'));
    }

    // Backup succeeded -> Safely rewrite Transactions sheet with rowsToKeep
    Repository_Sheets.rewriteSheetData(CONFIG.SHEETS.TRANSACTIONS, headers, rowsToKeep);

    Logger.log('dailyMaintenance: Successfully deleted ' + rowsToDelete.length + ' old rows. ' + rowsToKeep.length + ' rows remaining.');
    return Util_Response.buildSuccess({
      deletedCount: rowsToDelete.length,
      retainedCount: rowsToKeep.length,
      cutoffDate: cutoffDateStr
    });

  } catch (error) {
    Logger.log('dailyMaintenance Error: ' + error.toString());
    return Util_Response.buildError('SERVER_ERROR', 'เกิดข้อผิดพลาดในการทำ Maintenance: ' + error.message);
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {
      // Ignored if lock was not held
    }
  }
}
