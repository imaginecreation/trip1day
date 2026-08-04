/**
 * Service_Validation.js — Payload Validation & Sanitization
 * Mileage Reimbursement System (v10.1)
 */

const Service_Validation = {
  /**
   * Performs strict backend validation on transaction submission payload.
   */
  validateSubmitPayload: function(payload) {
    if (!payload || typeof payload !== 'object') {
      return Util_Response.buildError('VALIDATION_ERROR', 'ข้อมูล Payload ไม่ถูกต้อง');
    }

    if (!payload.site_id) {
      return Util_Response.buildError('VALIDATION_ERROR', 'กรุณาระบุ SITE งาน');
    }

    if (!payload.approver) {
      return Util_Response.buildError('VALIDATION_ERROR', 'กรุณาเลือกผู้อนุมัติ');
    }

    // Validate Site_ID exists in Active Master_Site
    const sites = Repository_Cache.getCached('MASTER_SITE_ACTIVE', function() {
      const allSites = Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.MASTER_SITE);
      return allSites.filter(s => Repository_Sheets.isActiveRow(s));
    });

    const validSite = sites.find(s => String(s.Site_ID).trim() === String(payload.site_id).trim());
    if (!validSite) {
      return Util_Response.buildError('VALIDATION_ERROR', 'SITE งานที่เลือกไม่ถูกต้อง หรือยกเลิกการใช้งานแล้ว');
    }

    // Validate Approver exists in Active Approve_users
    const approvers = Repository_Cache.getCached('APPROVE_USERS_ACTIVE', function() {
      const allApp = Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.APPROVE_USERS);
      return allApp.filter(a => Repository_Sheets.isActiveRow(a));
    });

    const validApprover = approvers.find(a => String(a.approve_request).trim() === String(payload.approver).trim());
    if (!validApprover) {
      return Util_Response.buildError('VALIDATION_ERROR', 'ผู้อนุมัติที่เลือกไม่ถูกต้อง หรือยกเลิกการใช้งานแล้ว');
    }

    // Validate Trips array length
    const trips = payload.trip_details;
    if (!Array.isArray(trips) || trips.length < CONFIG.MIN_TRIPS_PER_DAY || trips.length > CONFIG.MAX_TRIPS_PER_DAY) {
      return Util_Response.buildError(
        'VALIDATION_ERROR', 
        'จำนวนเส้นทางต้องอยู่ระหว่าง ' + CONFIG.MIN_TRIPS_PER_DAY + ' ถึง ' + CONFIG.MAX_TRIPS_PER_DAY + ' เส้นทางต่อวัน'
      );
    }

    // Load active routes for route verification
    const activeRoutes = Repository_Cache.getCached('MASTER_ROUTES_ACTIVE', function() {
      const allRoutes = Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.MASTER_ROUTES);
      return allRoutes.filter(r => Repository_Sheets.isActiveRow(r));
    });

    // Validate each trip card
    for (let i = 0; i < trips.length; i++) {
      const trip = trips[i];
      const tripNum = i + 1;

      if (!trip || typeof trip !== 'object') {
        return Util_Response.buildError('VALIDATION_ERROR', 'ข้อมูลเส้นทางที่ ' + tripNum + ' ไม่ถูกต้อง');
      }

      // Spec v10: trip_type must be SINGLE or ROUND_TRIP for both FIX and CUSTOM
      if (trip.trip_type !== 'SINGLE' && trip.trip_type !== 'ROUND_TRIP') {
        return Util_Response.buildError('VALIDATION_ERROR', 'กรุณาระบุประเภทการเดินทาง (เที่ยวเดียว/ไปกลับ) ในเส้นทางที่ ' + tripNum);
      }

      const km = Number(trip.km);
      if (isNaN(km) || km <= 0 || km > 500) {
        return Util_Response.buildError('VALIDATION_ERROR', 'ระยะทาง (กม.) ในเส้นทางที่ ' + tripNum + ' ต้องมากกว่า 0 และไม่เกิน 500 กม.');
      }

      if (trip.type === 'FIX') {
        if (!trip.route_id) {
          return Util_Response.buildError('VALIDATION_ERROR', 'กรุณาเลือกเส้นทางมาตรฐานในเส้นทางที่ ' + tripNum);
        }

        const matchRoute = activeRoutes.find(r => String(r.Route_ID) === String(trip.route_id) && String(r.Site_ID) === String(payload.site_id));
        if (!matchRoute) {
          return Util_Response.buildError('VALIDATION_ERROR', 'เส้นทางมาตรฐานในเส้นทางที่ ' + tripNum + ' ไม่ตรงกับ SITE งานที่เลือก');
        }
      } else if (trip.type === 'CUSTOM') {
        if (!trip.origin || !String(trip.origin).trim()) {
          return Util_Response.buildError('VALIDATION_ERROR', 'กรุณาระบุสถานที่ต้นทางในเส้นทางที่ ' + tripNum);
        }
        if (!trip.dest || !String(trip.dest).trim()) {
          return Util_Response.buildError('VALIDATION_ERROR', 'กรุณาระบุสถานที่ปลายทางในเส้นทางที่ ' + tripNum);
        }
      } else {
        return Util_Response.buildError('VALIDATION_ERROR', 'ประเภทเส้นทางที่ ' + tripNum + ' ต้องเป็น FIX หรือ CUSTOM');
      }
    }

    return null; // Null means valid
  }
};
