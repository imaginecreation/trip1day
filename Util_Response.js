/**
 * Util_Response.js — API Response Contract Standardizer
 * Mileage Reimbursement System (v10.1)
 */

const Util_Response = {
  /**
   * Returns a standardized success response object.
   */
  buildSuccess: function(data) {
    return {
      success: true,
      data: data || null
    };
  },

  /**
   * Returns a standardized error response object.
   */
  buildError: function(errorCode, message) {
    return {
      success: false,
      error_code: errorCode || 'SERVER_ERROR',
      message: message || 'An unexpected error occurred.'
    };
  }
};
