export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise
      .then(res => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  onError?: (err: unknown, attempt: number) => void;
}

export async function retryWithBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 500, onError } = options;
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= maxRetries) {
    try {
      return await operation(attempt);
    } catch (err) {
      lastError = err;
      onError?.(err, attempt);
      if (attempt === maxRetries) break;
      const delay = baseDelayMs * 2 ** attempt;
      await sleep(delay);
    }
    attempt++;
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Operation failed after ${maxRetries + 1} attempts: ${message}`);
}
