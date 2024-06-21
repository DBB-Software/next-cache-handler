import path from 'path'
import { fileURLToPath } from 'url'

/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheMaxMemorySize: 0,
  cacheHandler: path.join(path.dirname(fileURLToPath(import.meta.url)), 'cacheHandler.mjs')
}

export default nextConfig
