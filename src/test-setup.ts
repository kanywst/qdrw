import '@testing-library/jest-dom'

// Node.js v25 introduces a built-in `localStorage` global (Web Storage API)
// that shadows jsdom's implementation when no --localstorage-file is provided.
// Replace it with a proper in-memory implementation so tests work correctly.
const localStorageMap = new Map<string, string>();
const localStorageMock: Storage = {
  get length() { return localStorageMap.size; },
  key(index: number) { return Array.from(localStorageMap.keys())[index] ?? null; },
  getItem(key: string) { return localStorageMap.get(key) ?? null; },
  setItem(key: string, value: string) { localStorageMap.set(key, value); },
  removeItem(key: string) { localStorageMap.delete(key); },
  clear() { localStorageMap.clear(); },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});
