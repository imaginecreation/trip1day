/**
 * Api_Read.js — Read-Only API Endpoints for Frontend
 * Mileage Reimbursement System (v10.1)
 * 
 * Strict Enforcement: No LockService in read functions to prevent UI block.
 */

/**
 * Loads master data, user profile, and today's Bangkok date on web app initial load.
 */
function getDataOnLoad(lineUserId) {
  try {
    // 1. Master_Site (Active = TRUE, sorted by Site_Name A-Z / ก-ฮ)
    const masterSite = Repository_Cache.getCached('MASTER_SITE_ACTIVE', function() {
      const allSites = Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.MASTER_SITE);
      const activeSites = allSites.filter(s => Repository_Sheets.isActiveRow(s));
      // Sort alphabetically by Site_Name (Thai locale collator)
      activeSites.sort((a, b) => String(a.Site_Name || '').localeCompare(String(b.Site_Name || ''), 'th'));
      return activeSites;
    });

    // 2. Master_Routes (Active = TRUE)
    const masterRoutes = Repository_Cache.getCached('MASTER_ROUTES_ACTIVE', function() {
      const allRoutes = Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.MASTER_ROUTES);
      return allRoutes.filter(r => Repository_Sheets.isActiveRow(r));
    });

    // 3. Master_Config
    const masterConfig = Repository_Cache.getCached('MASTER_CONFIG_MAP', function() {
      const rows = Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.MASTER_CONFIG);
      const map = {};
      rows.forEach(r => {
        if (r.Key) map[r.Key] = r.Value;
      });
      return map;
    });

    // 4. Rate_Car
    const rateCar = Repository_Cache.getCached('RATE_CAR_DATA', function() {
      return Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.RATE_CAR);
    });

    // 5. Approve_users (Active = TRUE)
    const approveUsers = Repository_Cache.getCached('APPROVE_USERS_ACTIVE', function() {
      const allApp = Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.APPROVE_USERS);
      return allApp.filter(a => Repository_Sheets.isActiveRow(a));
    });

    // 6. User Profile lookup (Fresh query per user) -> Changed to use cache
    let userProfile = null;
    if (lineUserId && String(lineUserId).trim()) {
      const profiles = Repository_Cache.getCached('USERS_PROFILE_ALL', function() {
        return Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.USERS_PROFILE);
      });
      const match = profiles.find(p => String(p.Line_uid) === String(lineUserId).trim());
      if (match) {
        userProfile = {
          requester_name: match.requester_name || '',
          car_no: match.car_no || '',
          group_car: Number(match.group_car || 1)
        };
      }
    }

    const todayTh = Util_Date.getTodayBangkok();

    return Util_Response.buildSuccess({
      masterSite: masterSite,
      masterRoutes: masterRoutes,
      masterConfig: masterConfig,
      rateCar: rateCar,
      approveUsers: approveUsers,
      userProfile: userProfile,
      today_th: todayTh
    });

  } catch (error) {
    Logger.log('getDataOnLoad Error: ' + error.toString());
    return Util_Response.buildError('SERVER_ERROR', 'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
  }
}

/**
 * Returns lightweight list of transactions for a user on a given date.
 */
function listTransactionsByDate(dateStr, lineUserId) {
  try {
    if (!dateStr) {
      return Util_Response.buildError('VALIDATION_ERROR', 'กรุณาระบุวันที่');
    }

    const targetDate = Util_Date.formatDateBangkok(dateStr);
    const userId = lineUserId ? String(lineUserId).trim() : '';

    const allTx = Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.TRANSACTIONS);
    const matched = allTx.filter(tx => {
      const txDate = Util_Date.formatDateBangkok(tx.Req_Date);
      return txDate === targetDate && (userId === '' || String(tx.Req_LINE_UserId) === userId);
    });

    const summaries = matched.map(tx => {
      let tripCount = 0;
      try {
        const details = JSON.parse(tx.Trip_Details || '[]');
        tripCount = Array.isArray(details) ? details.length : 0;
      } catch (e) {
        tripCount = 0;
      }

      return {
        transaction_id: tx.Transaction_ID,
        site_id: tx.Site_ID,
        site_name: tx.Site_Name,
        trip_count: tripCount,
        total_km: Number(tx.Total_KM || 0),
        net_total: Number(tx.Net_Total || 0),
        status: tx.Status || 'DRAFT'
      };
    });

    return Util_Response.buildSuccess(summaries);

  } catch (error) {
    Logger.log('listTransactionsByDate Error: ' + error.toString());
    return Util_Response.buildError('SERVER_ERROR', 'เกิดข้อผิดพลาดในการเรียกดูรายการ: ' + error.message);
  }
}

/**
 * Returns detailed view of a single transaction record by transaction_id.
 */
function getTransactionDetail(transactionId) {
  try {
    if (!transactionId) {
      return Util_Response.buildError('VALIDATION_ERROR', 'กรุณาระบุ Transaction ID');
    }

    const allTx = Repository_Sheets.bulkReadAsObjects(CONFIG.SHEETS.TRANSACTIONS);
    const tx = allTx.find(t => String(t.Transaction_ID) === String(transactionId).trim());

    if (!tx) {
      return Util_Response.buildError('NOT_FOUND', 'ไม่พบข้อมูลรายการที่ระบุ');
    }

    let parsedTrips = [];
    try {
      parsedTrips = JSON.parse(tx.Trip_Details || '[]');
    } catch (e) {
      parsedTrips = [];
    }

    const detail = {
      transaction_id: tx.Transaction_ID,
      req_name: tx.Req_Name,
      req_line_user_id: tx.Req_LINE_UserId,
      req_date: Util_Date.formatDateBangkok(tx.Req_Date),
      plate_no: tx.Plate_No,
      site_id: tx.Site_ID,
      site_name: tx.Site_Name,
      travel_purpose: tx.Travel_Purpose,
      image_url: tx.Image_URL,
      total_km: Number(tx.Total_KM || 0),
      toll_fee: Number(tx.Toll_Fee || 0),
      park_fee: Number(tx.Park_Fee || 0),
      flat_rate_fee: Number(tx.Flat_Rate_Fee || 0),
      net_total: Number(tx.Net_Total || 0),
      approver: tx.Approver,
      status: tx.Status,
      approve_datetime: tx.Approve_Datetime || '',
      trip_details: parsedTrips,
      created_at: tx.Created_At,
      updated_at: tx.Updated_At
    };

    return Util_Response.buildSuccess(detail);

  } catch (error) {
    Logger.log('getTransactionDetail Error: ' + error.toString());
    return Util_Response.buildError('SERVER_ERROR', 'เกิดข้อผิดพลาดในการโหลดรายละเอียดรายการ: ' + error.message);
  }
}
