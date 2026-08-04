/**
 * Util_Date.js — Date Utility Functions (Asia/Bangkok Timezone Enforced)
 * Mileage Reimbursement System (v10.1)
 */

const Util_Date = {
  /**
   * Returns today's date formatted as 'YYYY-MM-DD' in Asia/Bangkok timezone.
   */
  getTodayBangkok: function() {
    return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  },

  /**
   * Returns current ISO Timestamp formatted in Asia/Bangkok timezone.
   */
  getNowIsoBangkok: function() {
    return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
  },

  /**
   * Formats a Given Date Object or String into 'YYYY-MM-DD' in Asia/Bangkok timezone.
   */
  formatDateBangkok: function(dateObjOrString) {
    if (!dateObjOrString) return '';
    if (typeof dateObjOrString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateObjOrString)) {
      return dateObjOrString;
    }
    const d = new Date(dateObjOrString);
    if (isNaN(d.getTime())) return String(dateObjOrString);
    return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  },

  /**
   * Calculates cutoff date string 'YYYY-MM-DD' for retention cleanup.
   */
  getCutoffDateBangkok: function(retentionDays) {
    const d = new Date();
    d.setDate(d.getDate() - retentionDays);
    return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  }
};
