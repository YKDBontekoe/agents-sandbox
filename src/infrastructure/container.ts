const registry = new Map<string, unknown>();

export function register<T>(key: string, value: T): void {
  if (registry.has(key)) {
    throw new Error(`Dependency '${key}' already registered`);
  }
  registry.set(key, value);
}

export function resolve<T>(key: string): T {
  if (!registry.has(key)) {
    throw new Error(`Dependency '${key}' not registered`);
  }
  return registry.get(key) as T;
}
