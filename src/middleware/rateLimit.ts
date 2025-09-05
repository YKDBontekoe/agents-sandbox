const buckets = new Map<string, number[]>()

interface Options {
  limit: number
  windowMs?: number
}

/**
 * Simple sliding window rate limiter.
 * Returns true when under the limit, false if the caller should be blocked.
 */
export function rateLimit(id: string, { limit, windowMs = 60_000 }: Options): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  const timestamps = buckets.get(id)?.filter(ts => ts > windowStart) ?? []
  if (timestamps.length >= limit) {
    buckets.set(id, timestamps)
    return false
  }
  timestamps.push(now)
  buckets.set(id, timestamps)
  return true
}
