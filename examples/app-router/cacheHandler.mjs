import { Cache, FileSystemCache } from '@dbbs/next-cache-handler-core'

Cache.setConfig({
  enableDeviceSplit: true,
  cacheCookies: ['abtest'],
  cacheQueries: ['abtest'],
  cache: new FileSystemCache()
})

export default Cache
