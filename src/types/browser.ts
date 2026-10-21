export type SafeModeType = 'safe' | 'javascript';

export type SearchEngine = 'duckduckgo' | 'searxng' | 'brave' | 'startpage';

export type SupportedLanguage = 'en' | 'ar' | 'ru' | 'fr' | 'de' | 'ja' | 'ko' | 'zh';

export interface Tab {
  id: string;
  url: string;
  displayUrl: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  historyStack: string[];
  historyIndex: number;
  safeMode: SafeModeType;
  isOnion: boolean;
  isTorRouted: boolean;
  error?: string;
  statusCode?: number;
  content?: string;
  contentType?: string;
  timestamp: number;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  createdAt: number;
  category?: string;
}

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
  profileId: string;
  isPrivate: boolean;
  statusCode?: number;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  engine: SearchEngine;
  searchedAt: number;
  profileId: string;
}

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: number;
  status: 'completed' | 'failed' | 'downloading';
  error?: string;
  blobKey: string; // key in IndexedDB files store
}

export interface BrowserCookie {
  id: string;
  domain: string;
  name: string;
  value: string;
  path: string;
  expires?: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  size: number;
  profileId: string;
}

export interface SitePermission {
  domain: string;
  javascriptAllowed: boolean;
  cookiesAllowed: boolean;
  updatedAt: number;
}

export interface ProfileSettings {
  profileId: string;
  profileName: string;
  createdAt: number;
  defaultSafeMode: SafeModeType;
  recordHistory: boolean;
  recordSearchHistory: boolean;
  isPrivateMode: boolean;
  searchEngine: SearchEngine;
  language: SupportedLanguage;
  autoSaveDownloadsToBrowser: boolean;
  blockThirdPartyCookies: boolean;
  clearOnExit: boolean;
  torSocksHost: string;
  torSocksPort: number;
}

export interface TorStatusResponse {
  configured: boolean;
  connected: boolean;
  host: string;
  port: number;
  latencyMs?: number;
  details: string;
  version?: string;
  isDaemonAvailable: boolean;
  onionSupported: boolean;
  error?: string;
}

export interface NetworkLogEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  sanitizedUrl: string;
  status: number;
  statusText: string;
  durationMs: number;
  contentType: string;
  contentLength: number;
  isTorRouted: boolean;
  safeMode: SafeModeType;
  redirects: string[];
  sanitizationEvents: string[];
  tlsStatus: string;
  headers: Record<string, string>;
  blockedReason?: string;
}

export interface DiagnosticsReport {
  timestamp: number;
  osInfo: string;
  nodeVersion: string;
  torStatus: TorStatusResponse;
  networkLogsCount: number;
  activeProfileId: string;
  storageEstimate?: {
    quota: number;
    usage: number;
  };
}
