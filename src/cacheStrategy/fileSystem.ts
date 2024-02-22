import fs from 'fs/promises'
import path from 'path'
import type { CacheStrategy, CacheEntry, CacheContext } from '../types'

export class FileSystemCache implements CacheStrategy {
  async get(key: string, ctx: CacheContext): Promise<CacheEntry | null> {
    const data = await fs.readFile(path.join(ctx.serverCacheDirPath, `${key}.json`), {
      encoding: 'utf-8'
    })

    if (!data) return null

    return JSON.parse(data)
  }

  async set(key: string, data: CacheEntry, ctx: CacheContext): Promise<void> {
    const filePath = path.join(ctx.serverCacheDirPath, `${key}.json`)
    return fs.writeFile(filePath, JSON.stringify(data))
  }

  async delete(key: string, ctx: CacheContext) {
    return fs.rm(path.join(ctx.serverCacheDirPath, `${key}.json`))
  }

  async deleteAllByKeyMatch(key: string, ctx: CacheContext) {
    const cacheDir = await fs.readdir(path.join(ctx.serverCacheDirPath, 'dataCache'))
    const filesToDelete = cacheDir.filter((fileName: string) => fileName.startsWith(key))
    await Promise.allSettled(filesToDelete.map((file) => fs.rm(file)))
  }
}
