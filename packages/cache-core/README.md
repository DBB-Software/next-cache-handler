
# Next-Cache-Handler

## Introduction
`@dbbs/next-cache-handler-core` is designed to elevate the performance of Next.js applications by providing a robust caching solution that adapts to cookies, query parameters, and device types. This enables the delivery of content that is finely tuned to the context of each user, significantly improving load times and user experience.

## Table of Contents
- [Features](#features)
- [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Cache Strategies](#cache-strategies)
  - [MemoryCache](#memorycache)
  - [FileSystemCache](#filesystemcache)
  - [Redis](#redis)
- [API Reference](#api-reference)
- [Logging](#logging)
- [Contributing](#contributing)
- [License](#license)
- [Contact Information](#contact-information)

## Features
- **Cache Segmentation**: Dynamically segment cache storage based on cookies, query parameters, and device types.
- **Multiple Storage Options**: Supports various caching mechanisms including file system cache, in-memory cache, and Redis.
- **Customizable**: Flexible configuration options to tailor caching strategies to specific needs.

## Quick Start
### Installation
Ensure you have Node.js version 12 or higher installed.
```bash
npm i @dbbs/next-cache-handler-core
# or
yarn add @dbbs/next-cache-handler-core
```

### Configuration
Create a `cacheHandler.js` in your project and configure as follows:
```javascript
import { Cache, FileSystemCache } from '@dbbs/next-cache-handler-core'

Cache
    .setCacheStrategy(new FileSystemCache())
    .addCookie('my-cookie-1')
    .addCookie('my-cookie-2')
    .addQuery('my-query-1')
    .addQuery('my-query-2')
    .addDeviceSplit()
    // Additional configuration...
export default Cache    
```

Update your `next.config.js` to use the cache handler.

```
const nextConfig = {
    cacheHandler: require.resolve('./cacheHandler.js')
}

export default nextConfig
```

## Cache Strategies
Explore various caching strategies to find the best fit for your application's needs:
- **MemoryCache**: Ideal for short-lived data in applications with limited cache size requirements. By default limit of size is set to 512MB.
```
import { Cache, MemoryCache } from '@dbbs/next-cache-handler-core'

Cache.setCacheStrategy(new MemoryCache())
```
```
import { Cache, MemoryCache } from '@dbbs/next-cache-handler-core'

// extending size limitation to 1024MB.
Cache.addStrategy(new MemoryCache({ sizeLimit: 1024 }))
```
- **FileSystemCache**: Suitable for persistent caching across application restarts.
```
import { Cache, FileSystemCache } from '@dbbs/next-cache-handler-core'

Cache.setCacheStrategy(new FileSystemCache())
```
- **Redis**: Perfect for distributed applications requiring shared cache access.
```
import { Cache } from '@dbbs/next-cache-handler-core'
import { RedisCache } from '@dbbs/next-cache-handler-redis'

// list of all accepted redis connection options.
const redisConnectionOpts = {
    url: 'redis://localhost:5843',
    ...
}

Cache.setCacheStrategy(new RedisCache(redisConnectionOpts))
```
- **S3**: Suitable for high scalable applications.
```
import { Cache } from '@dbbs/next-cache-handler-core'
import { S3Cache } from '@dbbs/next-cache-handler-s3'

Cache.setCacheStrategy(new S3Cache('cache-bucket-name'))
```

## API Reference

### `addCookie`
Cookie name what is going to be used to fragmentate cache based on browser cookies session.
```
Cache.addCookie('my-cookie-to-split')
```

### `addQuery`
Query name to fragmentate cache based on url query parameters.
```
Cache.addQuery('my-query-to-split')
```

### `addDeviceSplit`
Enables to fragmentate experience based on current `User-Agent` of the request.
```
Cache.addDeviceSplit()
```

### `setCacheStrategy`
Applies given strategy to cache page data.
```
Cache.setCacheStrategy(new MemoryCache())
```

### `addNoCacheRoute`
Add route to ignore cache list. All routes added here would be excluded from caching and will always render again.
```
Cache.addNoCacheRoute('/home')
```

## Logging
Leverage the built-in logger for monitoring cache operations or integrate your custom logger for advanced logging capabilities.
```
import { BaseLogger, Cache, FileSystemCache } from '@dbbs/next-cache-handler-core'

class MyCustomLogger implements BaseLogger {
    constructor() {}

    info(data) {
        console.log(data)
    }

    error(data) {
        console.error(data)
    }
}

Cache.setCacheStrategy(new FileSystemCache).setLogger(new MyCustomLogger())
```

## Contributing
- **Code Contributions**: When contributing code, ensure it adheres to the project's coding standards and write tests where applicable.
- **Documentation**: If you are contributing to documentation, ensure your changes are clear, concise, and helpful for other users.
- **Bug Reports and Feature Requests**: Use the GitHub Issues section to report bugs or suggest new features. Please provide as much detail as possible to help us understand the issue or feature.

## License
The next-cache-handler is open-source software licensed under the [MIT License](LICENSE).

## Contact Information
We value your feedback and contributions to the next-cache-handler. If you have any questions or suggestions or need support, here are several ways to get in touch with us:

- **General Inquiries and Support**: For any general questions about the platform or if you need assistance, please visit our website [DBB Software](https://dbbsoftware.com/) and use the contact form provided.

- **GitHub Issues**: For specific issues, feature requests, or bugs related to the platform, please use the [GitHub Issues](https://github.com/DBB-Software/next-cache-handler/issues) page. This is the fastest way to directly communicate with our development team and track the resolution of your issue.

- **Community Discussion and Contributions**: Join our community discussions on [GitHub Discussions](https://github.com/DBB-Software/next-cache-handler/discussions) for broader topics, ideas exchange, and collaborative discussions.

- **Social Media**: Follow us on our social media channels for the latest news, updates, and insights:
    - [DBB Software on LinkedIn](https://www.linkedin.com/company/dbbsoftware)
    - [DBB Software on Twitter](https://twitter.com/dbb_software)

- **Email Contact**: For more formal or detailed inquiries, feel free to reach out to us via email at [in@dbbsoftware.com](mailto:in@dbbsoftware.com).

We're always here to help and are committed to ensuring you have the best experience with the next-cache-handler. Your input and participation drive the continuous improvement of our platform.