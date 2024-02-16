import type { IncrementalCacheKindHint, IncrementalCacheEntry, IncrementalCacheValue } from 'next/dist/server/response-cache'

export interface CacheStrategy {
    get(cacheKey: string, ctx?: {
        kindHint?: IncrementalCacheKindHint;
        revalidate?: number | false;
        fetchUrl?: string;
        fetchIdx?: number;
        tags?: string[];
        softTags?: string[];
    }): Promise<IncrementalCacheEntry | null>;
    set(pathname: string, data: IncrementalCacheValue | null, ctx: {
        revalidate?: number | false;
        fetchCache?: boolean;
        fetchUrl?: string;
        fetchIdx?: number;
        tags?: string[];
    }): Promise<any>;
}
