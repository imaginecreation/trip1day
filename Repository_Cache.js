/**
 * Repository_Cache.js — CacheService Wrapper for Master Data
 * Mileage Reimbursement System (v10.1)
 */

const Repository_Cache = {
  /**
   * Retrieves data from CacheService or executes loaderFn and stores result.
   */
  getCached: function(key, loaderFn, ttlSeconds) {
    const cache = CacheService.getScriptCache();
    const cachedStr = cache.get(key);
    
    if (cachedStr) {
      try {
        return JSON.parse(cachedStr);
      } catch (e) {
        Logger.log('Cache parse error for key ' + key + ': ' + e.message);
      }
    }
    
    const freshData = loaderFn();
    if (freshData !== undefined && freshData !== null) {
      const ttl = ttlSeconds || CONFIG.CACHE_TTL_SECONDS;
      try {
        cache.put(key, JSON.stringify(freshData), ttl);
      } catch (e) {
        Logger.log('Cache put error for key ' + key + ': ' + e.message);
      }
    }
    
    return freshData;
  },

  /**
   * Clears specific cache key.
   */
  clearCache: function(key) {
    try {
      CacheService.getScriptCache().remove(key);
    } catch (e) {
      Logger.log('Cache remove error for key ' + key + ': ' + e.message);
    }
  }
};
