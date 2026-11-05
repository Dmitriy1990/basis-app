import type { StorageDriver } from './storageDriver';

export class MemoryStorageDriver implements StorageDriver {
  private readonly data = new Map<string, string>();

  async read(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async write(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}
