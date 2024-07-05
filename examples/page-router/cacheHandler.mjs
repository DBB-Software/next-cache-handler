import { Cache, FileSystemCache } from '@dbbs/next-cache-handler-core'

Cache.addCookie('abtest').addQuery('abtest').setCacheStrategy(new FileSystemCache()).addDeviceSplit()

export default Cache
