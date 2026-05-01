export class MemoryStore<T extends { id: string }> {
  private readonly records = new Map<string, T>();

  list(): T[] {
    return Array.from(this.records.values());
  }

  get(id: string): T | undefined {
    return this.records.get(id);
  }

  set(record: T): T {
    this.records.set(record.id, record);
    return record;
  }

  remove(id: string): boolean {
    return this.records.delete(id);
  }
}
