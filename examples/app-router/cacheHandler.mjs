import { Cache } from '@dbbs/next-cache-handler-core'
import { S3Cache } from '@dbbs/next-cache-handler-s3'

Cache.addCookie('abtest').addQuery('abtest').setCacheStrategy(new S3Cache('test-next-caching')).addDeviceSplit()

export default Cache
