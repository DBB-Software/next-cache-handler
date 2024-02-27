
# Next-Cache-Handler

## Introduction
`next-cache-handler` is designed to elevate the performance of Next.js applications by providing a robust caching solution that adapts to cookies, query parameters, and device types. This enables the delivery of content that is finely tuned to the context of each user, significantly improving load times and user experience.

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
npm i -s next-cache-handler
# or
yarn add next-cache-handler
```

### Configuration
Create a `cacheHandler.js` in your project and configure as follows:
```javascript
import { CacheHandler, FileSystemCache } from 'next-cache-handler'

CacheHandler
    .setCacheStrategy(new FileSystemCache())
    .addCookie('my-cookie-1')
    .addCookie('my-cookie-2')
    .addQuery('my-query-1')
    .addQuery('my-query-2')
    .addDeviceSplit()
    // Additional configuration...
export default CacheHandler    
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
- **MemoryCache**: Ideal for short-lived data in applications with limited cache size requirements.
```
import { CacheHandler, MemoryCache } from 'next-cache-handler'

CacheHandler.addStrategy(new MemoryCache())
```
- **FileSystemCache**: Suitable for persistent caching across application restarts.
```
import { CacheHandler, FileSystemCache } from 'next-cache-handler'

CacheHandler.addStrategy(new FileSystemCache())
```
- **Redis**: Perfect for distributed applications requiring shared cache access.
```
import { CacheHandler, RedisCache } from 'next-cache-handler'

// list of all accepted redis connection options.
const redisConnectionOpts = {
    url: 'redis://localhost:5843',
    ...
}

CacheHandler.addStrategy(new RedisCache(redisConnectionOpts))
```


## API Reference

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

### `setCacheStrategy`
Applies given strategy to cache page data.
```
CacheHandler.setCacheStrategy(new MemoryCache())
```

## Logging
Leverage the built-in logger for monitoring cache operations or integrate your custom logger for advanced logging capabilities.
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

CacheHandler.setCacheStrategy(new FileSystemCache(new MyCustomLogger()))
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