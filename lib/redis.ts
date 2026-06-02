import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const isMock = !url || url.startsWith('mock') || !token || token.startsWith('mock');

// In-Memory cache emulator to mock Upstash Redis when credentials are not supplied
class InMemoryRedisMock {
  private store = new Map<string, { value: string; expiry: number | null }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return entry.value as unknown as T;
    }
  }

  async set(key: string, value: any, options?: { ex?: number }) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const expiry = options?.ex ? Date.now() + options.ex * 1000 : null;
    this.store.set(key, { value: stringValue, expiry });
    return 'OK';
  }

  async del(key: string) {
    this.store.delete(key);
    return 1;
  }
}

export const redis = isMock
  ? (new InMemoryRedisMock() as any)
  : new Redis({ url: url!, token: token! });

export default redis;
