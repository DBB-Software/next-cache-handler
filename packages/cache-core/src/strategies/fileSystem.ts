import fs from 'node:fs/promises'
import path from 'node:path'
import type { CacheStrategy, CacheEntry, CacheContext } from '@dbbs/next-cache-handler-common'

export class FileSystemCache implements CacheStrategy {
  async get(pageKey: string, cacheKey: string, ctx: CacheContext): Promise<CacheEntry | null> {
    const data = await fs.readFile(path.join(ctx.serverCacheDirPath, pageKey, `${cacheKey}.json`), {
      encoding: 'utf-8'
    })

    if (!data) return null

    return JSON.parse(data)
  }

  async set(pageKey: string, cacheKey: string, data: CacheEntry, ctx: CacheContext): Promise<void> {
    const filePath = path.join(ctx.serverCacheDirPath, pageKey, `${cacheKey}.json`)
    await fs.writeFile(filePath, JSON.stringify(data))
  }

  async delete(pageKey: string, cacheKey: string, ctx: CacheContext) {
    await fs.rm(path.join(ctx.serverCacheDirPath, pageKey, `${cacheKey}.json`))
  }

  async deleteAllByKeyMatch(pageKey: string, ctx: CacheContext) {
    const cacheDir = await fs.readdir(path.join(ctx.serverCacheDirPath, 'dataCache'))
    const filesToDelete = cacheDir.filter((fileName: string) => fileName.startsWith(pageKey))

    await Promise.allSettled(filesToDelete.map((file) => fs.rm(path.join(ctx.serverCacheDirPath, file))))
  }
}
