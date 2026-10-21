export type SafeModeType = 'javascript' | 'safe'; // JavaScript active by default, with safe mode option

export type SearchEngine = 'duckduckgo'; // Exclusive sole search engine per user request

export type SupportedLanguage = 'en' | 'ar' | 'ru' | 'fr' | 'de' | 'ja' | 'ko' | 'zh';

export type FullPageView = 'browser' | 'settings' | 'history' | 'bookmarks' | 'downloads' | 'inspector' | 'privacy' | 'audit' | 'selftest';

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
  favicon?: string;
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
  blobKey: string;
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
  cameraAllowed: boolean;
  micAllowed: boolean;
  geoAllowed: boolean;
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
  // Hardware Privacy Controls & Extended Permissions
  cameraBlocked: boolean; // default true (locked)
  micBlocked: boolean;    // default true (locked)
  geoBlocked: boolean;    // default true (locked)
  popupsBlocked: boolean; // default true
  webrtcBlocked: boolean; // default true (prevents IP leaks)
  clipboardBlocked: boolean; // default true (prevents reading clipboard)
  notificationsBlocked: boolean; // default true
  autoplayBlocked: boolean; // default true
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
  frameNumber: number;
  timestamp: number;
  method: string;
  url: string;
  sanitizedUrl?: string;
  source: string;
  destination: string;
  sourceIp: string;
  sourcePort: number;
  destIp: string;
  destPort: number;
  protocol: 'HTTP' | 'HTTPS' | 'SOCKS5' | 'TOR' | 'DNS' | 'TCP';
  status: number;
  statusText: string;
  durationMs: number;
  contentType: string;
  contentLength: number;
  isTorRouted: boolean;
  safeMode: boolean;
  redirects?: string[];
  sanitizationEvents?: string[];
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  hexDump?: string;
  blockedReason?: string;
}

export interface InterceptedRequest {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  status: 'paused' | 'forwarded' | 'dropped';
}
