import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { CacheStrategy, CacheEntry, CacheContext } from '@dbbs/next-cache-handler-common'

export class FileSystemCache implements CacheStrategy {
  async get(pageKey: string, cacheKey: string, ctx: CacheContext): Promise<CacheEntry | null> {
    const pathToCacheFile = path.join(ctx.serverCacheDirPath, pageKey, `${cacheKey}.json`)

    if (!existsSync(pathToCacheFile)) {
      throw `no cache file ${pathToCacheFile} yet`
    }

    const data = await fs.readFile(pathToCacheFile, 'utf-8')

    if (!data) return null

    return JSON.parse(data)
  }

  async set(pageKey: string, cacheKey: string, data: CacheEntry, ctx: CacheContext): Promise<void> {
    const pathToCacheFolder = path.join(ctx.serverCacheDirPath, pageKey)
    const pathToCacheFile = path.join(pathToCacheFolder, `${cacheKey}.json`)

    if (!existsSync(pathToCacheFolder)) await fs.mkdir(pathToCacheFolder, { recursive: true })

    await fs.writeFile(pathToCacheFile, JSON.stringify(data))
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
