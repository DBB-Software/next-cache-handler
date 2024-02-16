# next-cache-handler
Support to control cache behaviour for NextJS applications. 
# Usage

```
import { CacheHandler, MemoryCache } from 'next-cache-handler'

CacheHandler
    .addCacheStrategy(new MemoryCache())
    .addCookie(<your-custom-cookie>)
    .addQuery(<you-custom-query-key>)
    .addDeviceSplit() // adds cache split based on device type (desktop and mobile)
```