import { Cache } from '@dbbs/next-cache-handler-core'

import { FileSystemCache } from '@dbbs/next-cache-handler-core'
Cache.addCookie('abtest').addQuery('abtest').setCacheStrategy(new FileSystemCache()).addDeviceSplit()

// import { MemoryCache } from '@dbbs/next-cache-handler-core'
// Cache.addCookie('abtest').addQuery('abtest').setCacheStrategy(new MemoryCache()).addDeviceSplit()

export default Cache
