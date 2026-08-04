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
    
    // Helper function to read from cache (handles chunking & normal)
    const readCache = function() {
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
      
      const cachedStr = cache.get(key);
      if (cachedStr) {
        try {
          return JSON.parse(cachedStr);
        } catch (e) {
          Logger.log('Cache parse error for key ' + key + ': ' + e.message);
        }
      }
      return null;
    };

    // 1. Initial Quick Check (No Lock)
    let cachedData = readCache();
    if (cachedData !== null) {
      return cachedData;
    }
    
    // 2. Cache Miss: Acquire Lock to prevent Thundering Herd / Cache Stampede
    const lock = LockService.getScriptLock();
    try {
      // Wait up to 10 seconds. If someone else is loading this key, they should finish in < 5s.
      if (lock.tryLock(10000)) {
        // Lock acquired! Double-check cache in case the previous lock holder just populated it
        cachedData = readCache();
        if (cachedData !== null) {
          return cachedData;
        }
        
        // Still missing. We are the chosen instance to load data from Sheets.
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
      } else {
        // Failed to get lock within 10s (Extreme Load). Fallback to direct read.
        Logger.log('Could not acquire lock for Cache Key: ' + key);
        return loaderFn();
      }
    } catch (e) {
      Logger.log('Cache Lock error: ' + e.message);
      return loaderFn();
    } finally {
      // Release lock so others can proceed
      try { lock.releaseLock(); } catch(e) {}
    }
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
