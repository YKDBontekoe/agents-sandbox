import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const message = searchParams.get('message') || 'DEBUG';
  const length = searchParams.get('length');
  
  const logData = {
    message,
    length: length ? parseInt(length) : undefined,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent')?.substring(0, 50)
  };
  
  console.log('🐛 [DEBUG-LOG]', logData);
  
  return NextResponse.json({ success: true, logged: logData });
}