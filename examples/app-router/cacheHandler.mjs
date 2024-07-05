import { Cache, FileSystemCache } from '@dbbs/next-cache-handler-core'

Cache.addCookies('abtest').addQueries('abtest').setCacheStrategy(new FileSystemCache()).addDeviceSplit()

export default Cache
