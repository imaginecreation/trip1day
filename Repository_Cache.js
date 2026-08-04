/**
 * Repository_Cache.js — CacheService Wrapper for Master Data
 * Mileage Reimbursement System (v10.1)
 */

const Repository_Cache = {
  CHUNK_SIZE: 50000, // Safe limit for CacheService 100KB limit

  /**
   * Retrieves data from CacheService or executes loaderFn and stores result.
   */
  getCached: function(key, loaderFn, ttlSeconds) {
    const cache = CacheService.getScriptCache();
    
    // First try to read as chunked data
    const metaStr = cache.get(key + '_meta');
    if (metaStr) {
      try {
        const meta = JSON.parse(metaStr);
        let fullString = '';
        for (let i = 0; i < meta.chunks; i++) {
          const chunk = cache.get(key + '_' + i);
          if (!chunk) throw new Error('Missing chunk ' + i);
          fullString += chunk;
        }
        return JSON.parse(fullString);
      } catch (e) {
        Logger.log('Cache parse chunk error for key ' + key + ': ' + e.message);
      }
    }
    
    // Fallback: Check standard single-key cache
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
        const jsonStr = JSON.stringify(freshData);
        if (jsonStr.length > Repository_Cache.CHUNK_SIZE) {
          const numChunks = Math.ceil(jsonStr.length / Repository_Cache.CHUNK_SIZE);
          const chunksToPut = {};
          chunksToPut[key + '_meta'] = JSON.stringify({ chunks: numChunks });
          for (let i = 0; i < numChunks; i++) {
            const start = i * Repository_Cache.CHUNK_SIZE;
            chunksToPut[key + '_' + i] = jsonStr.substring(start, start + Repository_Cache.CHUNK_SIZE);
          }
          cache.putAll(chunksToPut, ttl);
        } else {
          cache.put(key, jsonStr, ttl);
        }
      } catch (e) {
        Logger.log('Cache put error for key ' + key + ': ' + e.message);
      }
    }
    
    return freshData;
  },

  /**
   * Clears specific cache key (including chunks).
   */
  clearCache: function(key) {
    try {
      const cache = CacheService.getScriptCache();
      const metaStr = cache.get(key + '_meta');
      if (metaStr) {
        try {
          const meta = JSON.parse(metaStr);
          for (let i = 0; i < meta.chunks; i++) {
            cache.remove(key + '_' + i);
          }
          cache.remove(key + '_meta');
        } catch (e) {}
      }
      cache.remove(key);
    } catch (e) {
      Logger.log('Cache remove error for key ' + key + ': ' + e.message);
    }
  }
};
