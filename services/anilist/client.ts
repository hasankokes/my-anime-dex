/**
 * AniList GraphQL API Client
 * 
 * Handles HTTP requests to https://graphql.anilist.co
 * with rate limit management, automatic retries, and in-memory caching.
 */

const ANILIST_URL = 'https://graphql.anilist.co';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const DEFAULT_CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

interface FetchOptions {
  /** Cache key — if provided, result is cached and reused until expiry */
  cacheKey?: string;
  /** Cache duration in milliseconds (default: 5 minutes) */
  cacheDuration?: number;
  /** Number of retry attempts on transient errors (default: 5) */
  retries?: number;
}

/**
 * Execute a GraphQL query against the AniList API.
 * Handles 429 rate-limit responses with exponential back-off.
 */
// Throttling: Ensure minimum spacing between network requests to avoid AniList rate limits
// Slots are reserved synchronously so concurrent callers queue up instead of all firing together.
let nextRequestSlot = 0;
const MIN_REQUEST_INTERVAL = 350; // ms between requests
const REQUEST_TIMEOUT = 15000; // ms before a request is aborted

function reserveRequestSlot(): number {
  const now = Date.now();
  const slot = Math.max(now, nextRequestSlot);
  nextRequestSlot = slot + MIN_REQUEST_INTERVAL;
  return slot - now;
}

export async function fetchGraphQL<T = any>(
  query: string,
  variables?: Record<string, any>,
  options?: FetchOptions
): Promise<T> {
  const retries = options?.retries ?? 5;
  const cacheDuration = options?.cacheDuration ?? DEFAULT_CACHE_DURATION;

  // Check cache
  const fullCacheKey = options?.cacheKey ? `v3_${options.cacheKey}` : undefined;
  if (fullCacheKey) {
    const cached = cache.get(fullCacheKey);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return cached.data as T;
    }
  }

  let retriesLeft = retries;

  while (true) {
    // Throttle network requests
    const delay = reserveRequestSlot();
    if (delay > 0) {
      await wait(delay);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(ANILIST_URL, {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'MyAnimeDexApp/1.0',
        },
        body: JSON.stringify({ query, variables }),
      });

      // HTTP Level Rate limit
      if (response.status === 429) {
        if (retriesLeft > 0) {
          const retryAfter = response.headers.get('Retry-After');
          const retryAfterSec = retryAfter ? parseInt(retryAfter, 10) : NaN;
          const waitMs = Number.isFinite(retryAfterSec) ? retryAfterSec * 1000 : 3500;
          console.warn(`[AniList] HTTP 429 Rate limited. Waiting ${waitMs}ms… (${retriesLeft} retries left)`);
          await wait(waitMs);
          retriesLeft--;
          continue;
        }
        throw new Error('AniList rate limit exceeded. Please try again in a few moments.');
      }

      if (!response.ok) {
        throw new Error(`AniList API returned HTTP ${response.status}`);
      }

      const json = await response.json();

      // GraphQL Level Errors
      if (json.errors?.length) {
        const isRateLimited = json.errors.some(
          (e: any) => e.status === 429 || e.message?.toLowerCase().includes('too many requests')
        );

        if (isRateLimited && retriesLeft > 0) {
          console.warn(`[AniList] GraphQL 429 Rate limited. Waiting 3500ms… (${retriesLeft} retries left)`);
          await wait(3500);
          retriesLeft--;
          continue;
        }

        const msg = json.errors.map((e: any) => e.message).join('; ');
        const err: any = new Error(`GraphQL Error: ${msg}`);
        err.gqlErrors = json.errors;
        throw err;
      }

      const data = json.data as T;

      // Store in cache
      if (fullCacheKey) {
        cache.set(fullCacheKey, { data, timestamp: Date.now() });
      }

      return data;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message.toLowerCase() : '';
      const isRateLimit = errMsg.includes('rate limit') || errMsg.includes('too many requests') || errMsg.includes('429');

      if (retriesLeft > 0 && isRateLimit) {
        retriesLeft--;
        console.warn(`[AniList] Retrying after error (${retriesLeft} retries left): ${errMsg}`);
        await wait(3000 * (retries - retriesLeft + 1));
        continue;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('AniList request timed out. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/** Clear the entire in-memory query cache */
export function clearAniListCache(): void {
  cache.clear();
}
