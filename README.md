# Introduction
next-cache-handler boosts Next.js app performance by allowing to customize caching based on cookies, query parameters, and device type. This allows to deliver optimized content specific to user contexts, significantly improving site performance and user experience.

# Features

- <b>Cache Segmentation</b>: Dynamically segment cache storage based on cookies, query parameters, and device types.
- <b>Multiple Storage Options</b>: Supports various caching mechanisms including file system cache, in-memory cache, and Redis.
- <b>Customizable</b>: Flexible configuration options to tailor caching strategies to your specific needs.

# Quick start
### Installation
```
npm i -s next-cache-handler
```
or
```
yarn add next-cache-handler
```

### Configuration
Create a `cacheHandler.js` (or `.ts`) file in your project.
```
import { CacheHandler, FileSystemCache } from 'next-cache-handler'

CacheHandler
    .addCacheStrategy(new FileSystemCache())
    .addCookie('my-cookie-1')
    .addCookie('my-cookie-2')
    .addQuery('my-query-1')
    .addQuery('my-query-2')
    .addDeviceSplit()

export default CacheHandler    
```

Update your `next.config.js` file to import cache handler
```
const nextConfig = {
    cacheHandler: require.resolve('./cacheHandler.js')
}

export default nextConfig
```

# Cache Strategies
### MemoryCache
Uses in-app memory to handle page data cache.
```
import { CacheHandler, MemoryCache } from 'next-cache-handler'

CacheHandler.addStrategy(new MemoryCache())
```

### FileSystemCache
Uses file based caching, stores all data inside `json` files.
```
import { CacheHandler, FileSystemCache } from 'next-cache-handler'

CacheHandler.addStrategy(new FileSystemCache())
```

### Redis
Uses `redis` database to cache page data.
```
import { CacheHandler, RedisCache } from 'next-cache-handler'

// list of all accepted redis connection options.
const redisConnectionOpts = {
    url: 'redis://localhost:5843',
    ...
}

CacheHandler.addStrategy(new RedisCache(redisConnectionOpts))
```


# API reference

### `addCookie`
Cookie name what is going to be used to fragmentate cache based on browser cookies session.
```
CacheHandler.addCookie('my-cookie-to-split')
```

### `addQuery`
Query name to fragmentate cache based on url query parameters.
```
CacheHandler.addQuery('my-query-to-split')
```

### `addDeviceSplit`
Enables to fragmentate experience based on current `User-Agent` of the request.
```
CacheHandler.addDeviceSplit()
```

### `addCacheStrategy`
Applies given strategy to cache page data.
```
CacheHandler.addCacheStrategy(new MemoryCache())
```

# Logging
`next-cache-handler` uses standard `console` logging by default, but there is way to customize and provide your custom logger.

```
import { BaseLogger, CacheHandler, FileSystemCache } from 'next-cache-handler'

class MyCustomLogger implements BaseLogger {
    constructor() {}

    info(data) {
        console.log(data)
    }

    error(data) {
        console.error(data)
    }
}

CacheHandler.addCacheStrategy(new FileSystemCache(new MyCustomLogger()))
```
