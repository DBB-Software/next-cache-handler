import { CacheHandler, FileSystemCache } from 'next-cache-handler'

CacheHandler.addCookie('abtest').addQuery('abtest').addCacheStrategy(new FileSystemCache()).addDeviceSplit()

export default CacheHandler
