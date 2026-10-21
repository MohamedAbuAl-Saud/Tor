import { Bookmark, BrowserCookie, DownloadItem, HistoryItem, ProfileSettings, SearchHistoryItem, SitePermission } from '../types/browser';

const DB_NAME = 'sm_browser_tor_db';
const DB_VERSION = 1;

export function generateCryptoId(): string {
  const array = new Uint8Array(24);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'profileId' });
      }

      if (!db.objectStoreNames.contains('history')) {
        const store = db.createObjectStore('history', { keyPath: 'id' });
        store.createIndex('profileId', 'profileId', { unique: false });
        store.createIndex('visitedAt', 'visitedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('searchHistory')) {
        const store = db.createObjectStore('searchHistory', { keyPath: 'id' });
        store.createIndex('profileId', 'profileId', { unique: false });
        store.createIndex('searchedAt', 'searchedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('bookmarks')) {
        const store = db.createObjectStore('bookmarks', { keyPath: 'id' });
        store.createIndex('url', 'url', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('downloads')) {
        const store = db.createObjectStore('downloads', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('downloadBlobs')) {
        db.createObjectStore('downloadBlobs', { keyPath: 'blobKey' });
      }

      if (!db.objectStoreNames.contains('cookies')) {
        const store = db.createObjectStore('cookies', { keyPath: 'id' });
        store.createIndex('domain', 'domain', { unique: false });
        store.createIndex('profileId', 'profileId', { unique: false });
      }

      if (!db.objectStoreNames.contains('sitePermissions')) {
        db.createObjectStore('sitePermissions', { keyPath: 'domain' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// Profile management
const CURRENT_PROFILE_KEY = 'sm_browser_active_profile_id';

export async function getActiveProfile(): Promise<ProfileSettings> {
  const db = await getDatabase();
  let storedId = localStorage.getItem(CURRENT_PROFILE_KEY);

  if (storedId) {
    const profile = await new Promise<ProfileSettings | undefined>((resolve) => {
      const tx = db.transaction('profiles', 'readonly');
      const store = tx.objectStore('profiles');
      const req = store.get(storedId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });

    if (profile) return profile;
  }

  // Create new anonymous profile
  const newProfileId = generateCryptoId();
  localStorage.setItem(CURRENT_PROFILE_KEY, newProfileId);

  const initialProfile: ProfileSettings = {
    profileId: newProfileId,
    profileName: 'Anonymous Session #' + newProfileId.slice(0, 6),
    createdAt: Date.now(),
    defaultSafeMode: 'safe',
    recordHistory: true,
    recordSearchHistory: true,
    isPrivateMode: false,
    searchEngine: 'duckduckgo',
    language: 'en',
    autoSaveDownloadsToBrowser: true,
    blockThirdPartyCookies: true,
    clearOnExit: false,
    torSocksHost: '127.0.0.1',
    torSocksPort: 9050,
  };

  await saveProfile(initialProfile);
  return initialProfile;
}

export async function saveProfile(profile: ProfileSettings): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('profiles', 'readwrite');
    const store = tx.objectStore('profiles');
    store.put(profile);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function resetProfileId(): Promise<ProfileSettings> {
  const newProfileId = generateCryptoId();
  localStorage.setItem(CURRENT_PROFILE_KEY, newProfileId);

  const newProfile: ProfileSettings = {
    profileId: newProfileId,
    profileName: 'Anonymous Session #' + newProfileId.slice(0, 6),
    createdAt: Date.now(),
    defaultSafeMode: 'safe',
    recordHistory: true,
    recordSearchHistory: true,
    isPrivateMode: false,
    searchEngine: 'duckduckgo',
    language: 'en',
    autoSaveDownloadsToBrowser: true,
    blockThirdPartyCookies: true,
    clearOnExit: false,
    torSocksHost: '127.0.0.1',
    torSocksPort: 9050,
  };

  await saveProfile(newProfile);
  return newProfile;
}

// History
export async function addHistoryEntry(entry: Omit<HistoryItem, 'id' | 'visitedAt'>): Promise<void> {
  const db = await getDatabase();
  const item: HistoryItem = {
    ...entry,
    id: generateCryptoId(),
    visitedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getHistoryEntries(profileId: string): Promise<HistoryItem[]> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readonly');
    const store = tx.objectStore('history');
    const index = store.index('visitedAt');
    const request = index.openCursor(null, 'prev');
    const results: HistoryItem[] = [];

    request.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
      if (cursor) {
        if (cursor.value.profileId === profileId && !cursor.value.isPrivate) {
          results.push(cursor.value);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllHistory(profileId: string): Promise<void> {
  const db = await getDatabase();
  const entries = await getHistoryEntries(profileId);
  const tx = db.transaction('history', 'readwrite');
  const store = tx.objectStore('history');
  for (const entry of entries) {
    store.delete(entry.id);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Search History
export async function addSearchEntry(query: string, engine: ProfileSettings['searchEngine'], profileId: string): Promise<void> {
  const db = await getDatabase();
  const item: SearchHistoryItem = {
    id: generateCryptoId(),
    query,
    engine,
    searchedAt: Date.now(),
    profileId,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('searchHistory', 'readwrite');
    const store = tx.objectStore('searchHistory');
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSearchHistory(profileId: string): Promise<SearchHistoryItem[]> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('searchHistory', 'readonly');
    const store = tx.objectStore('searchHistory');
    const index = store.index('searchedAt');
    const request = index.openCursor(null, 'prev');
    const results: SearchHistoryItem[] = [];

    request.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
      if (cursor) {
        if (cursor.value.profileId === profileId) {
          results.push(cursor.value);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function clearSearchHistory(profileId: string): Promise<void> {
  const db = await getDatabase();
  const entries = await getSearchHistory(profileId);
  const tx = db.transaction('searchHistory', 'readwrite');
  const store = tx.objectStore('searchHistory');
  for (const entry of entries) {
    store.delete(entry.id);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Bookmarks
export async function getBookmarks(): Promise<Bookmark[]> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('bookmarks', 'readonly');
    const store = tx.objectStore('bookmarks');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Promise<Bookmark> {
  const db = await getDatabase();
  const newBookmark: Bookmark = {
    ...bookmark,
    id: generateCryptoId(),
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('bookmarks', 'readwrite');
    const store = tx.objectStore('bookmarks');
    store.put(newBookmark);
    tx.oncomplete = () => resolve(newBookmark);
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeBookmark(id: string): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('bookmarks', 'readwrite');
    const store = tx.objectStore('bookmarks');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Downloads with real IndexedDB Blobs
export async function saveDownload(
  filename: string,
  url: string,
  mimeType: string,
  blob: Blob
): Promise<DownloadItem> {
  const db = await getDatabase();
  const id = generateCryptoId();
  const blobKey = 'blob_' + id;

  const downloadItem: DownloadItem = {
    id,
    filename,
    url,
    mimeType,
    size: blob.size,
    createdAt: Date.now(),
    status: 'completed',
    blobKey,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['downloads', 'downloadBlobs'], 'readwrite');
    const dlStore = tx.objectStore('downloads');
    const blobStore = tx.objectStore('downloadBlobs');

    dlStore.put(downloadItem);
    blobStore.put({ blobKey, blob });

    tx.oncomplete = () => resolve(downloadItem);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDownloads(): Promise<DownloadItem[]> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('downloads', 'readonly');
    const store = tx.objectStore('downloads');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function getDownloadBlob(blobKey: string): Promise<Blob | null> {
  const db = await getDatabase();
  return new Promise((resolve) => {
    const tx = db.transaction('downloadBlobs', 'readonly');
    const store = tx.objectStore('downloadBlobs');
    const req = store.get(blobKey);
    req.onsuccess = () => {
      resolve(req.result?.blob || null);
    };
    req.onerror = () => resolve(null);
  });
}

export async function deleteDownload(id: string, blobKey: string): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['downloads', 'downloadBlobs'], 'readwrite');
    tx.objectStore('downloads').delete(id);
    tx.objectStore('downloadBlobs').delete(blobKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function exportToDevice(filename: string, blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Cookies & Site Data
export async function getCookies(profileId: string): Promise<BrowserCookie[]> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cookies', 'readonly');
    const store = tx.objectStore('cookies');
    const req = store.getAll();
    req.onsuccess = () => {
      const all: BrowserCookie[] = req.result;
      resolve(all.filter(c => c.profileId === profileId));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllCookies(profileId: string): Promise<void> {
  const db = await getDatabase();
  const cookies = await getCookies(profileId);
  const tx = db.transaction('cookies', 'readwrite');
  const store = tx.objectStore('cookies');
  for (const c of cookies) {
    store.delete(c.id);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteDomainCookies(domain: string, profileId: string): Promise<void> {
  const db = await getDatabase();
  const cookies = await getCookies(profileId);
  const target = cookies.filter(c => c.domain.includes(domain));
  const tx = db.transaction('cookies', 'readwrite');
  const store = tx.objectStore('cookies');
  for (const c of target) {
    store.delete(c.id);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Storage Quota
export async function getStorageEstimate(): Promise<{ quota: number; usage: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      quota: estimate.quota || 0,
      usage: estimate.usage || 0,
    };
  }
  return { quota: 0, usage: 0 };
}

// Real WebCrypto AES-GCM verification utility
export async function testAesGcmEncryption(testString: string): Promise<{
  success: boolean;
  algorithm: string;
  ivHex: string;
  cipherHex: string;
  decrypted: string;
}> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(testString)
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedBuffer
  );

  const decrypted = dec.decode(decryptedBuffer);
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const cipherHex = Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    success: decrypted === testString,
    algorithm: 'AES-256-GCM',
    ivHex,
    cipherHex,
    decrypted,
  };
}
