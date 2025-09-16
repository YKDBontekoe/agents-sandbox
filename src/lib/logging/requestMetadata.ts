import { NextRequest } from 'next/server'

const MAX_STRING_LENGTH = 120
const MAX_ARRAY_LENGTH = 10

function truncate(value: string, limit = MAX_STRING_LENGTH) {
  if (value.length <= limit) return value
  return `${value.slice(0, limit)}…`
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value === 'string') return truncate(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) {
    if (depth > 1) return undefined
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map(item => sanitizeValue(item, depth + 1))
      .filter(item => item !== undefined)
  }
  if (typeof value === 'object') {
    if (depth > 1) return undefined
    const entries = Object.entries(value as Record<string, unknown>)
    return entries.reduce<Record<string, unknown>>((acc, [key, entryValue]) => {
      const sanitized = sanitizeValue(entryValue, depth + 1)
      if (sanitized !== undefined) acc[key] = sanitized
      return acc
    }, {})
  }
  return undefined
}

function sanitizeRecord(record?: Record<string, unknown>) {
  if (!record) return undefined
  const sanitized = Object.entries(record).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const cleaned = sanitizeValue(value)
    if (cleaned !== undefined) acc[key] = cleaned
    return acc
  }, {})
  return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

export interface RequestMetadataOptions {
  /**
   * Provide an allowlisted set of query params or other values that have
   * already been sanitized for logging. Keys with `undefined` values are
   * automatically omitted.
   */
  query?: Record<string, unknown>
  /**
   * Optional structured data derived from the request (e.g., parsed numbers).
   */
  resolved?: Record<string, unknown>
  /**
   * Additional metadata to merge into the request context.
   */
  extras?: Record<string, unknown>
  /**
   * Override which headers should be inspected for a request identifier.
   */
  requestIdHeaders?: string[]
}

const DEFAULT_REQUEST_ID_HEADERS = ['x-request-id', 'x-vercel-id', 'x-amzn-trace-id']

export function createRequestMetadata(req: NextRequest, options?: RequestMetadataOptions) {
  const headersToCheck = options?.requestIdHeaders ?? DEFAULT_REQUEST_ID_HEADERS
  const requestId = headersToCheck
    .map(header => req.headers.get(header))
    .find(value => value && value.trim().length > 0)

  const userAgent = req.headers.get('user-agent') ?? undefined

  const metadata: Record<string, unknown> = {
    method: req.method,
    pathname: req.nextUrl.pathname,
    timestamp: new Date().toISOString(),
  }

  const query = sanitizeRecord(options?.query)
  if (query) metadata.query = query

  const resolved = sanitizeRecord(options?.resolved)
  if (resolved) metadata.resolved = resolved

  if (userAgent) metadata.userAgent = truncate(userAgent, 80)
  if (requestId) metadata.requestId = requestId

  const extras = sanitizeRecord(options?.extras)
  if (extras) {
    Object.assign(metadata, extras)
  }

  return metadata
}
