import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

export type CachedResult<T> =
  | { state: 'fresh'; value: T; fetchedAt: number }
  | { state: 'stale'; value: T; fetchedAt: number }
  | { state: 'unavailable' };

export interface CacheOptions<T> {
  key: string;
  ttlMs: number;
  retryAfterFailureMs: number;
  dataDir: string;
  schema: z.ZodType<T>;
  load: () => Promise<T>;
  now?: () => number;
  onError?: (error: unknown) => void;
}

interface Entry<T> {
  value: T;
  fetchedAt: number;
}

export interface CachedSource<T> {
  get: () => Promise<CachedResult<T>>;
}

const SAFE_KEY = /^[a-z0-9][a-z0-9._-]*$/;

export const createCachedSource = <T>(options: CacheOptions<T>): CachedSource<T> => {
  if (!SAFE_KEY.test(options.key)) {
    throw new Error(`Invalid cache key: ${options.key}`);
  }
  const now = options.now ?? Date.now;
  const filePath = join(options.dataDir, `${options.key}.json`);
  const fileSchema = z.object({ fetchedAt: z.number(), value: options.schema });

  let memory: Entry<T> | undefined;
  let lastFailureAt: number | undefined;
  let pending: Promise<CachedResult<T>> | undefined;

  const readCopy = async (): Promise<Entry<T> | undefined> => {
    try {
      const parsed = fileSchema.safeParse(JSON.parse(await readFile(filePath, 'utf8')));
      return parsed.success ? { value: parsed.data.value, fetchedAt: parsed.data.fetchedAt } : undefined;
    } catch {
      return undefined;
    }
  };

  const writeCopy = async (entry: Entry<T>): Promise<void> => {
    await mkdir(options.dataDir, { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(entry));
    await rename(temporaryPath, filePath);
  };

  const fallback = async (): Promise<CachedResult<T>> => {
    memory ??= await readCopy();
    return memory === undefined ? { state: 'unavailable' } : { state: 'stale', ...memory };
  };

  const refresh = async (): Promise<CachedResult<T>> => {
    try {
      const entry = { value: await options.load(), fetchedAt: now() };
      memory = entry;
      lastFailureAt = undefined;
      await writeCopy(entry).catch(options.onError);
      return { state: 'fresh', ...entry };
    } catch (error) {
      lastFailureAt = now();
      options.onError?.(error);
      return fallback();
    }
  };

  const get = async (): Promise<CachedResult<T>> => {
    if (memory !== undefined && now() - memory.fetchedAt < options.ttlMs) {
      return { state: 'fresh', ...memory };
    }
    if (lastFailureAt !== undefined && now() - lastFailureAt < options.retryAfterFailureMs) {
      return fallback();
    }
    pending ??= refresh().finally(() => {
      pending = undefined;
    });
    return pending;
  };

  return { get };
};
