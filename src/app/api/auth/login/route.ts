import { NextResponse } from 'next/server';
import { authenticate, signToken } from '@/lib/auth';

export async function POST(request: Request) {
  const { username, password } = await request.json();
  const user = await authenticate(username, password);
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const token = await signToken(user);
  return NextResponse.json({ token, user });
}
