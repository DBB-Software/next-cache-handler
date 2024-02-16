import fs from 'fs/promises'
import path from 'path'
import { CacheStrategy } from './base'

export class FileSystemCache implements CacheStrategy {
    constructor() {}

    async get(...params: Parameters<CacheStrategy['get']>) {
        const [cacheKey, ctx] = params
        try {
            const data = await fs.readFile(path.join(ctx.serverAppPath, `${cacheKey}.json`), { encoding: 'utf-8'})
            return JSON.parse(data)
        } catch(err) {
            console.warn(`Failed to read cache for ${cacheKey}`, err)
            return null
        }
    }

    async set(...params: Parameters<CacheStrategy['set']>) {
        const [cacheKey, data, ctx] = params
        try {
            if (!data) return
            await fs.writeFile(path.join(ctx.serverAppPath, `${cacheKey}.json`), JSON.stringify(data))
        } catch(err) {
            console.warn(`Failed to set cache for ${cacheKey}`, err)
        }
    }
}
