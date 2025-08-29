import { NextRequest, NextResponse } from 'next/server';
import LRU from 'lru-cache';

const rateLimit = new LRU<string, number>({ max: 5000, ttl: 60 * 1000 });
const LIMIT = 100;

export function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const hits = rateLimit.get(ip) ?? 0;
  if (hits >= LIMIT) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }
  rateLimit.set(ip, hits + 1);
  return NextResponse.next();
}
