import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { createRequestMetadata } from '@/lib/logging/requestMetadata'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const message = searchParams.get('message') ?? 'DEBUG'
  const rawLength = searchParams.get('length')
  const parsedLength = rawLength ? Number.parseInt(rawLength, 10) : undefined
  const length = typeof parsedLength === 'number' && !Number.isNaN(parsedLength) ? parsedLength : undefined

  const requestMetadata = createRequestMetadata(request, {
    query: {
      message,
      length: rawLength ?? undefined,
    },
    resolved: {
      length,
    },
  })

  logger.debug('🐛 [API] Debug log event', {
    request: requestMetadata,
  })

  return NextResponse.json({
    success: true,
    logged: {
      message,
      length,
      timestamp: requestMetadata.timestamp,
      userAgent: requestMetadata.userAgent,
    },
  })
}
