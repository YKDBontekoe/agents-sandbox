export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(input, init);
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`${res.status} ${res.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
    return undefined as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(message);
  }
}
