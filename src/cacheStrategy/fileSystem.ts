import fs from 'fs/promises'
import path from 'path'
import { CacheStrategy, IncrementalCacheEntry } from './base'

export class FileSystemCache implements CacheStrategy {
  constructor() {}

  async get(...params: Parameters<CacheStrategy['get']>): Promise<IncrementalCacheEntry | null> {
    const [cacheKey, ctx] = params
    try {
      const data = await fs.readFile(path.join(ctx.serverAppPath, `${cacheKey}.json`), { encoding: 'utf-8' })
      return JSON.parse(data)
    } catch (err) {
      console.warn(`Failed to read cache for ${cacheKey}`, err)
      return null
    }
  }

  async set(...params: Parameters<CacheStrategy['set']>) {
    const [cacheKey, data, ctx] = params
    const filePath = path.join(ctx.serverAppPath, `${cacheKey}.json`)
    try {
      if (data) {
        await fs.writeFile(
          filePath,
          JSON.stringify({
            value: data,
            lastModified: new Date(),
            tags: ctx.tags
          })
        )
      } else {
        try {
          await fs.unlink(filePath)
        } catch (err) {
          console.warn(`Failed to delete cache for ${cacheKey}`, err)
        }
      }
    } catch (err) {
      console.warn(`Failed to set cache for ${cacheKey}`, err)
    }
  }
}
