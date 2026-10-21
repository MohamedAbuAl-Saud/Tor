import React, { useRef } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  Globe, 
  Search, 
  RotateCw, 
  AlertTriangle, 
  Lock, 
  Terminal, 
  CheckCircle2, 
  Server, 
  Camera,
  ExternalLink
} from 'lucide-react';
import { Tab, TorStatusResponse, ProfileSettings, SearchEngine } from '../types/browser';
import { Translations } from '../utils/i18n';
import { SearchEngineLogos, SEARCH_ENGINES_LIST } from './SearchLogos';

interface BrowserViewProps {
  tab: Tab;
  profile: ProfileSettings;
  torStatus: TorStatusResponse | null;
  t: Translations;
  isRtl: boolean;
  onNavigate: (url: string) => void;
  onReload: () => void;
  onOpenPrivacyDashboard: () => void;
  onOpenSelfTest: () => void;
  onOpenInspector: () => void;
  onOpenSettings: () => void;
  onTestTorCircuit: () => void;
  testingCircuit: boolean;
  onSelectSearchEngine: (engine: SearchEngine) => void;
  onToggleTabSafeMode: () => void;
}

const QUICK_ACCESS_SITES = [
  {
    title: 'DuckDuckGo Search',
    url: 'https://duckduckgo.com/html/?q=tor+privacy',
    category: 'Search Engine',
    desc: 'Pure HTML privacy search results',
    isDuck: true,
  },
];

export const BrowserView: React.FC<BrowserViewProps> = ({
  tab,
  profile,
  torStatus,
  t,
  isRtl,
  onNavigate,
  onReload,
  onOpenPrivacyDashboard,
  onOpenSelfTest,
  onOpenInspector,
  onOpenSettings,
  onTestTorCircuit,
  testingCircuit,
  onToggleTabSafeMode,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [homeSearchQuery, setHomeSearchQuery] = React.useState('');

  const isHome = !tab.url || tab.url === 'sm://home' || tab.url === 'about:blank';
  const DuckLogo = SearchEngineLogos.duckduckgo;

  const handleHomeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeSearchQuery.trim()) return;

    const query = homeSearchQuery.trim();
    if (query.startsWith('http://') || query.startsWith('https://') || query.endsWith('.onion')) {
      onNavigate(query);
    } else {
      onNavigate(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
    }
  };

  if (isHome) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 sm:py-10 max-w-4xl mx-auto w-full pb-24">
        {/* Brand Hero */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <img 
              src="/SM.jpg" 
              alt="SM BROWSER TOR" 
              className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 border-slate-200/90 shadow-md object-cover" 
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            SM BROWSER TOR
          </h1>
          {/* Onion text with authentic Tor purple onion logo next to it */}
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-purple-50 text-purple-900 border border-purple-200 rounded-full text-xs font-bold font-mono shadow-2xs">
            <svg viewBox="0 0 32 32" className="w-4 h-4 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 3C11 3 5 8 5 16C5 24 11 29 16 29C21 29 27 24 27 16C27 8 21 3 16 3Z" fill="#7D4698"/>
              <path d="M16 6C12.5 6 8 10 8 16C8 22 12.5 26 16 26C19.5 26 24 22 24 16C24 10 19.5 6 16 6Z" fill="#9357B2"/>
              <path d="M16 9C14 9 11 12 11 16C11 20 14 23 16 23C18 23 21 20 21 16C21 12 18 9 16 9Z" fill="#A86BC7"/>
              <path d="M16 12C15 12 13.5 13.5 13.5 16C13.5 18.5 15 20 16 20C17 20 18.5 18.5 18.5 16C18.5 13.5 17 12 16 12Z" fill="#C593DF"/>
            </svg>
            <span className="tracking-wide">onion</span>
          </div>
        </div>

        {/* Central Search Box - Exclusive DuckDuckGo */}
        <div className="max-w-2xl mx-auto mb-8 space-y-2">
          <form onSubmit={handleHomeSearch} className="w-full">
            <div className="relative flex items-center bg-white rounded-2xl shadow-sm border border-slate-200/90 hover:border-indigo-400 p-2 sm:p-2.5 transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-500">
              <div className="p-1.5 rounded-xl bg-slate-50 me-2 shrink-0">
                <DuckLogo className="w-6 h-6" />
              </div>
              <input
                type="text"
                value={homeSearchQuery}
                onChange={(e) => setHomeSearchQuery(e.target.value)}
                placeholder="ابحث عبر DuckDuckGo بدون تتبع أو أدخل عنوان موقع..."
                className="flex-1 bg-transparent border-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none min-w-0"
                dir="auto"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shrink-0 shadow-2xs"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Tor Daemon Status Banner (Real live status) */}
        <div className="max-w-2xl mx-auto mb-8 bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-2xl shrink-0 ${
                torStatus?.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {torStatus?.connected ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Server className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {torStatus?.connected ? t.torConnected : t.torDisconnected}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-sans">
                  {torStatus?.connected
                    ? `SOCKS5 proxy ready on ${torStatus.host}:${torStatus.port} (Latency: ${torStatus.latencyMs}ms)`
                    : t.torNotDetectedNotice}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onTestTorCircuit}
                disabled={testingCircuit}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition-colors"
              >
                {testingCircuit ? 'جاري الفحص...' : t.testTorCircuit}
              </button>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                SOCKS5 9050
              </span>
              <button
                onClick={onOpenInspector}
                className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>سجلات اتصال &rarr;</span>
              </button>
            </div>

            <button 
              onClick={onOpenSelfTest}
              className="text-slate-600 hover:text-slate-900 font-semibold"
            >
              {t.runSelfTest} &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (tab.isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <div className="w-full bg-slate-100 h-1 overflow-hidden">
          <div className="bg-indigo-600 h-full w-2/3 animate-pulse transition-all"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin mb-4"></div>
          <h2 className="text-sm font-semibold text-slate-800">
            جاري جلب الصفحة عبر البوابة...
          </h2>
          <p className="font-mono text-xs text-slate-400 mt-1 max-w-md truncate" dir="ltr">
            {tab.url}
          </p>
          {tab.isOnion && (
            <span className="mt-3 text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full font-medium">
              Routing via Tor Network
            </span>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (tab.error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">
            تعذر تحميل الصفحة
          </h2>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed font-sans">
            {tab.error}
          </p>

          <div className="bg-slate-50 rounded-xl p-3 text-left font-mono text-[11px] text-slate-600 mb-6 break-all border border-slate-100" dir="ltr">
            {tab.url}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('sm://home')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              الرئيسية
            </button>
            <button
              onClick={onReload}
              className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loaded content view
  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Tab info strip */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 text-xs text-slate-700 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          {tab.favicon ? (
            <img 
              src={tab.favicon} 
              alt="" 
              className="w-4 h-4 rounded-md object-contain shrink-0" 
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Globe className="w-4 h-4 text-slate-500 shrink-0" />
          )}
          <span className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">
            {tab.title || tab.url}
          </span>
          <span className="text-slate-300">·</span>
          <span className="truncate max-w-[150px] sm:max-w-sm font-mono text-[11px] text-slate-400" dir="ltr">
            {tab.url}
          </span>
        </div>

        <button
          onClick={onOpenInspector}
          title="فحص في واير شارك وبورب سويت"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors font-mono"
        >
          <Terminal className="w-3.5 h-3.5 text-indigo-600" />
          <span>Wireshark & Burp</span>
        </button>
      </div>

      {/* Full Capability Iframe Display */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-white">
        <iframe
          ref={iframeRef}
          srcDoc={tab.content}
          title={tab.title || 'Web Content'}
          className="w-full h-full border-none bg-white absolute top-0 left-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
          onLoad={() => console.log('Iframe loaded content')}
          onError={(e) => console.error('Iframe error:', e)}
        />

      </div>
    </div>
  );
};
