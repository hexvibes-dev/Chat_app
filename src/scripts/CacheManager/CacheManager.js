let db = null;
const DB_NAME = 'CacheManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'storageData';

export async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    if (db && db.name === DB_NAME) {
      resolve(db);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

export async function loadAllKeys(storageType) {
  await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('storageType');
    const range = IDBKeyRange.only(storageType);
    const request = index.getAll(range);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadItem(key) {
  await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveItem(key, value) {
  await initIndexedDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.put({ key, value });
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteItem(key) {
  await initIndexedDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.delete(key);
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export function getAllStorageKeys(storageType) {
  return new Promise((resolve, reject) => {
    const keys = [];
    if (storageType === 'local') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      resolve(keys.sort((a, b) => a.localeCompare(b)));
    } else if (storageType === 'session') {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) keys.push(key);
      }
      resolve(keys.sort((a, b) => a.localeCompare(b)));
    } else if (storageType === 'cache') {
      (async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            for (const request of requests) {
              keys.push({
                key: `[Cache: ${cacheName}] ${request.url}`,
                url: request.url,
                cacheName: cacheName
              });
            }
          }
          resolve(keys.sort((a, b) => a.key.localeCompare(b.key)));
        } else {
          resolve([]);
        }
      })().catch(reject);
    } else {
      resolve([]);
    }
  });
}