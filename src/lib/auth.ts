import { SignJWT, jwtVerify } from 'jose';

export interface AuthUser {
  username: string;
  role: 'user' | 'admin';
}

const users: Record<string, { password: string; role: 'user' | 'admin' }> = {
  admin: { password: 'admin', role: 'admin' },
  user: { password: 'user', role: 'user' },
};

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');

export async function authenticate(username: string, password: string): Promise<AuthUser | null> {
  const record = users[username];
  if (!record || record.password !== password) return null;
  return { username, role: record.role };
}

export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ username: user.username, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { username: payload.username as string, role: payload.role as 'user' | 'admin' };
  } catch {
    return null;
  }
}

export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  return verifyToken(token);
}

export async function requireUser(request: Request): Promise<AuthUser | null> {
  return getUserFromRequest(request);
}

export async function requireAdmin(request: Request): Promise<AuthUser | null> {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== 'admin') return null;
  return user;
}
