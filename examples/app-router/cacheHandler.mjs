import { CacheHandler, FileSystemCache } from 'next-cache-handler'

CacheHandler.addCookie('abtest').addQuery('abtest').setCacheStrategy(new FileSystemCache()).addDeviceSplit()

export default CacheHandler
