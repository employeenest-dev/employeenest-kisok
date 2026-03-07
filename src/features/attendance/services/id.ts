export function createId(prefix = 'id'): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const randomUuid = cryptoApi?.randomUUID?.();

  if (randomUuid) {
    return `${prefix}-${randomUuid}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}
