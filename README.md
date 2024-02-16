# next-cache-handler
Support to control cache behaviour for NextJS applications.

# Strategies
### MemoryCache
```
import { MemoryCache } from 'next-cache-handler'

CacheHandler.addStrategy(new MemoryCache())
```

### FileSystemCache
```
import { FileSystemCache } from 'next-cache-handler'

CacheHandler.addStrategy(new FileSystemCache())
```

# Usage

### 1 - Create separate file to configure cache strategy
```
// cache-handler.ts
import { CacheHandler, MemoryCache } from 'next-cache-handler'

CacheHandler
    .addCacheStrategy(new MemoryCache())
    .addCookie(<your-custom-cookie>)
    .addQuery(<you-custom-query-key>)
    .addDeviceSplit() // adds cache split based on device type (desktop and mobile)
```

### 2 - update your next config file with created cache handler
```
const nextConfig = {
    cacheHandler: resolve.require('./cache-handler')
}
```