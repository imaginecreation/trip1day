/**
 * Service_RateCalc.js — Rate & Reimbursement Calculation Engine
 * Mileage Reimbursement System (v10.1)
 */

const Service_RateCalc = {
  /**
   * Calculates rate for a given request date and car group number.
   * Finds row with maximum dt_date where dt_date <= reqDate.
   */
  getRateForDate: function(reqDate, groupCarNumber) {
    const rateRows = Repository_Cache.getCached('RATE_CAR_DATA', function() {
      return Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.RATE_CAR);
    });

    const targetDateStr = Util_Date.formatDateBangkok(reqDate);
    const validGroupNum = (groupCarNumber && !isNaN(groupCarNumber)) ? Number(groupCarNumber) : 1;
    const colName = 'group_car' + validGroupNum;

    // Filter rows where dt_date <= targetDateStr
    const matchingRows = rateRows.filter(row => {
      const dtStr = Util_Date.formatDateBangkok(row.dt_date);
      return dtStr && dtStr <= targetDateStr;
    });

    if (matchingRows.length === 0) {
      throw new Error('NO_RATE_AVAILABLE: ไม่พบอัตราเบิกค่าเดินทางที่มีผลย้อนหลังสำหรับวันที่ ' + targetDateStr);
    }

    // Sort descending by dt_date to get the maximum effective date
    matchingRows.sort((a, b) => {
      const dtA = Util_Date.formatDateBangkok(a.dt_date);
      const dtB = Util_Date.formatDateBangkok(b.dt_date);
      return dtB.localeCompare(dtA);
    });

    const selectedRow = matchingRows[0];
    const rateVal = Number(selectedRow[colName] || selectedRow['group_car1'] || 0);

    if (isNaN(rateVal) || rateVal <= 0) {
      throw new Error('INVALID_RATE: อัตราเบิกค่าเดินทางเป็น 0 หรือไม่ถูกต้อง');
    }

    return rateVal;
  },

  /**
   * Calculates effective KM for a single trip.
   * Spec v10: Fix + ROUND_TRIP multiplies km by 2.
   * Custom (ROUND_TRIP or SINGLE) uses the user-entered km as-is without multiplying by 2.
   */
  calculateEffectiveKm: function(trip) {
    const km = Number(trip.km || 0);
    if (isNaN(km) || km <= 0) return 0;

    if (trip.type === 'FIX' && trip.trip_type === 'ROUND_TRIP') {
      return km * 2;
    }
    return km;
  },

  /**
   * Calculates total KM, rate, and Net Total reimbursement amount.
   */
  calculateTotals: function(reqDate, groupCarNumber, tripDetailsArray, tollFee, parkFee, flatRateFee) {
    if (!Array.isArray(tripDetailsArray) || tripDetailsArray.length === 0) {
      throw new Error('TRIP_DETAILS_REQUIRED: ต้องมีอย่างน้อย 1 เส้นทางการเดินทาง');
    }

    let totalKm = 0;
    for (let i = 0; i < tripDetailsArray.length; i++) {
      totalKm += this.calculateEffectiveKm(tripDetailsArray[i]);
    }

    totalKm = Math.round(totalKm * 10) / 10; // Round to 1 decimal place

    const rate = this.getRateForDate(reqDate, groupCarNumber);
    const toll = Number(tollFee || 0);
    const park = Number(parkFee || 0);
    const flat = Number(flatRateFee || 0);

    const netTotal = Math.round(((totalKm * rate) + toll + park + flat) * 100) / 100;

    return {
      totalKm: totalKm,
      rate: rate,
      netTotal: netTotal
    };
  }
};
