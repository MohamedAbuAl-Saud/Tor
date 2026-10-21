import React, { useEffect, useRef } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  Globe, 
  ExternalLink, 
  Search, 
  RotateCw, 
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
  Server,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { Tab, TorStatusResponse, ProfileSettings } from '../types/browser';
import { Translations } from '../utils/i18n';

interface BrowserViewProps {
  tab: Tab;
  profile: ProfileSettings;
  torStatus: TorStatusResponse | null;
  t: Translations;
  isRtl: boolean;
  onNavigate: (url: string) => void;
  onReload: () => void;
  onOpenPrivacyDashboard: () => void;
  onOpenAiAssistant: () => void;
  onOpenSelfTest: () => void;
  onTestTorCircuit: () => void;
  testingCircuit: boolean;
}

const QUICK_ACCESS_SITES = [
  {
    title: 'Tor Project Check',
    url: 'https://check.torproject.org',
    category: 'Privacy',
    iconColor: 'bg-purple-600',
    desc: 'Verify Tor network routing status',
  },
  {
    title: 'DuckDuckGo Onion',
    url: 'https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion',
    category: 'Search (.onion)',
    iconColor: 'bg-orange-500',
    desc: 'Private search engine onion hidden service',
  },
  {
    title: 'ProPublica Onion',
    url: 'https://p53lf57qovyuvwsc6xnrppyply3vtqm7l6pcobkmyqsiofyeznfu5uqd.onion',
    category: 'Journalism (.onion)',
    iconColor: 'bg-slate-800',
    desc: 'Independent journalism onion site',
  },
  {
    title: 'Wikipedia (Safe)',
    url: 'https://en.wikipedia.org/wiki/Tor_(network)',
    category: 'Reference',
    iconColor: 'bg-blue-600',
    desc: 'Free encyclopedia entry on Tor',
  },
  {
    title: 'Privacy Guides',
    url: 'https://www.privacyguides.org',
    category: 'Security',
    iconColor: 'bg-emerald-600',
    desc: 'Security recommendations & threat modeling',
  },
  {
    title: 'Archive.today',
    url: 'https://archive.today',
    category: 'Archives',
    iconColor: 'bg-cyan-700',
    desc: 'Web page snapshots and permanent records',
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
  onOpenAiAssistant,
  onOpenSelfTest,
  onTestTorCircuit,
  testingCircuit,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [homeSearchQuery, setHomeSearchQuery] = React.useState('');

  const isHome = !tab.url || tab.url === 'sm://home' || tab.url === 'about:blank';

  // Listen to navigation messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SM_BROWSER_NAVIGATE' && event.data.url) {
        onNavigate(event.data.url);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onNavigate]);

  const handleHomeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeSearchQuery.trim()) return;

    let target = homeSearchQuery.trim();
    if (target.startsWith('http://') || target.startsWith('https://') || target.endsWith('.onion')) {
      onNavigate(target);
    } else {
      // Use configured search provider
      if (profile.searchEngine === 'duckduckgo') {
        onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(target)}`);
      } else if (profile.searchEngine === 'searxng') {
        onNavigate(`https://searx.be/search?q=${encodeURIComponent(target)}`);
      } else if (profile.searchEngine === 'brave') {
        onNavigate(`https://search.brave.com/search?q=${encodeURIComponent(target)}`);
      } else {
        onNavigate(`https://www.startpage.com/do/search?query=${encodeURIComponent(target)}`);
      }
    }
  };

  if (isHome) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 sm:py-12 max-w-4xl mx-auto w-full pb-24">
        {/* Brand Hero */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-3">
            <img 
              src="/SM.jpg" 
              alt="SM BROWSER TOR" 
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-slate-200/80 shadow-md object-cover" 
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {t.appName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1 font-sans">
            {t.tagline}
          </p>
        </div>

        {/* Central Home Search Box */}
        <form onSubmit={handleHomeSearch} className="max-w-xl mx-auto mb-8">
          <div className="relative flex items-center bg-white rounded-2xl shadow-sm border border-slate-200/90 hover:border-indigo-400 p-2 sm:p-2.5 transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-500">
            <Search className="w-5 h-5 text-slate-400 ms-2 me-3 shrink-0" />
            <input
              type="text"
              value={homeSearchQuery}
              onChange={(e) => setHomeSearchQuery(e.target.value)}
              placeholder={t.searchOrEnterAddress}
              className="flex-1 bg-transparent border-none text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
              dir="auto"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shrink-0 shadow-2xs"
            >
              Search
            </button>
          </div>
        </form>

        {/* Tor Daemon Status Banner (Real live status) */}
        <div className="max-w-xl mx-auto mb-8 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                torStatus?.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {torStatus?.connected ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Server className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {torStatus?.connected ? t.torConnected : t.torDisconnected}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-sans leading-relaxed">
                  {torStatus?.connected
                    ? `SOCKS5 proxy ready on ${torStatus.host}:${torStatus.port} (Latency: ${torStatus.latencyMs}ms)`
                    : t.torNotDetectedNotice}
                </p>
              </div>
            </div>

            <button
              onClick={onTestTorCircuit}
              disabled={testingCircuit}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition-colors shrink-0"
            >
              {testingCircuit ? 'Probing...' : t.testTorCircuit}
            </button>
          </div>

          {!torStatus?.connected && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                127.0.0.1:9050
              </span>
              <button 
                onClick={onOpenSelfTest}
                className="text-indigo-600 hover:text-indigo-700 font-semibold text-xs"
              >
                {t.runSelfTest} &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Quick Access Tiles */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t.quickAccess}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {QUICK_ACCESS_SITES.map((site) => (
              <button
                key={site.url}
                onClick={() => onNavigate(site.url)}
                className="flex flex-col text-left p-3.5 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg ${site.iconColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}>
                    {site.title.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-800 block truncate group-hover:text-indigo-600 transition-colors">
                      {site.title}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {site.category}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-auto leading-snug">
                  {site.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Privacy & Architecture Snapshot */}
        <div className="bg-slate-100/70 rounded-2xl p-4 sm:p-5 border border-slate-200/60">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            {t.privacyDashboard}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200/60">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Rendering Mode</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                <Shield className="w-3.5 h-3.5" />
                Safe Document Mode
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Scripts neutralized & CSP locked
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/60">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Anonymous ID</span>
              <span className="font-mono text-[11px] font-semibold text-slate-800 truncate block mt-0.5" dir="ltr">
                {profile.profileId.slice(0, 16)}...
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Crypto-random, no account required
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/60">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Network Gateway</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                SSRF-Protected
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Localhost & private ranges blocked
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (tab.isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-white">
        {/* Loading progress bar */}
        <div className="w-full bg-slate-100 h-1 overflow-hidden">
          <div className="bg-indigo-600 h-full w-2/3 animate-pulse transition-all"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin mb-4"></div>
          <h2 className="text-sm font-semibold text-slate-800">
            Fetching through Gateway...
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
            Unable to Load Page
          </h2>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed font-sans">
            {tab.error}
          </p>

          <div className="bg-slate-50 rounded-xl p-3 text-left font-mono text-[11px] text-slate-600 mb-6 break-all border border-slate-100">
            {tab.url}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('sm://home')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Go to Home
            </button>
            <button
              onClick={onReload}
              className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loaded content view
  return (
    <div className="flex-1 flex flex-col h-full bg-white relative pb-14">
      {/* Tab info strip */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-2 min-w-0">
          {tab.safeMode === 'safe' ? (
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <Shield className="w-3.5 h-3.5" />
              Safe Document Mode
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-700 font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              JavaScript Active (Isolated)
            </span>
          )}
          <span className="text-slate-300">·</span>
          <span className="truncate max-w-[200px] sm:max-w-md font-mono text-[11px]" dir="ltr">
            {tab.url}
          </span>
        </div>

        {/* AI Page Assistant Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAiAssistant}
            title={t.aiAssistant}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.aiAssistant}</span>
          </button>
        </div>
      </div>

      {/* Sandboxed Iframe Display */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-white">
        <iframe
          ref={iframeRef}
          srcDoc={tab.content}
          title={tab.title || 'Web Content'}
          className="w-full h-full border-none"
          sandbox={
            tab.safeMode === 'safe'
              ? 'allow-same-origin' // Safe mode: allow rendering styled HTML document without active scripts
              : 'allow-scripts' // Optional JS mode: allow scripts with strictly NO allow-same-origin (origin isolation)
          }
        />
      </div>
    </div>
  );
};
