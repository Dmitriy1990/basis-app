import type { StorageDriver } from './storageDriver';

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    return window.localStorage;
  } catch {
    return null;
  }
}

export class LocalStorageDriver implements StorageDriver {
  async read(key: string): Promise<string | null> {
    try {
      return safeStorage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  async write(key: string, value: string): Promise<void> {
    try {
      safeStorage()?.setItem(key, value);
    } catch (e) {
      console.log(e);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      safeStorage()?.removeItem(key);
    } catch (e) {
      console.log(e);
    }
  }
}
