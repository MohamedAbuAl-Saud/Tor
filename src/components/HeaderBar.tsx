import React, { useState } from 'react';
import { 
  RotateCw, 
  X, 
  Star, 
  MoreVertical, 
  Globe, 
  ArrowLeft, 
  ArrowRight,
  Lock,
  Zap
} from 'lucide-react';
import { Tab, ProfileSettings } from '../types/browser';
import { Translations } from '../utils/i18n';
import { SearchEngineLogos } from './SearchLogos';

interface HeaderBarProps {
  activeTab: Tab;
  tabCount: number;
  profile: ProfileSettings;
  t: Translations;
  isRtl: boolean;
  isBookmarked: boolean;
  interceptActive?: boolean;
  onToggleIntercept?: () => void;
  onNavigate: (url: string) => void;
  onReload: () => void;
  onStop: () => void;
  onToggleBookmark: () => void;
  onOpenTabs: () => void;
  onOpenMenu: () => void;
  onToggleSafeMode: () => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onOpenSettings: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeTab,
  tabCount,
  profile,
  t,
  isRtl,
  isBookmarked,
  interceptActive = false,
  onToggleIntercept,
  onNavigate,
  onReload,
  onStop,
  onToggleBookmark,
  onOpenTabs,
  onOpenMenu,
  onGoBack,
  onGoForward,
  onOpenSettings,
}) => {
  const [inputUrl, setInputUrl] = useState(activeTab.url || '');
  const [isFocused, setIsFocused] = useState(false);

  React.useEffect(() => {
    setInputUrl(activeTab.url || '');
  }, [activeTab.url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onNavigate(inputUrl.trim());
    }
  };

  const isOnion = activeTab.isOnion;
  const DuckLogo = SearchEngineLogos.duckduckgo;

  const renderOmniboxIcon = () => {
    if (activeTab.favicon) {
      return (
        <img 
          src={activeTab.favicon} 
          alt="" 
          className="w-4 h-4 rounded-md object-contain shrink-0 me-1.5" 
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
    if (activeTab.url.includes('duckduckgo.com') || activeTab.url.includes('?q=')) {
      return <DuckLogo className="w-4 h-4 shrink-0 me-1.5" />;
    }
    if (activeTab.url.startsWith('http')) {
      try {
        const domain = new URL(activeTab.url).hostname;
        return (
          <img 
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
            alt=""
            className="w-4 h-4 rounded-md object-contain shrink-0 me-1.5"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        );
      } catch {}
    }
    return <DuckLogo className="w-4 h-4 shrink-0 me-1.5" />;
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 px-2 sm:px-4 py-2 transition-all">
      <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-3">
        {/* Circular SM Logo and Brand (Always English) */}
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => onNavigate('sm://home')}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity focus:outline-none"
            title={t.home}
          >
            <img 
              src="/SM.jpg" 
              alt="SM Logo" 
              className="w-8 h-8 rounded-full border border-slate-200 shadow-2xs object-cover" 
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="hidden md:inline font-bold tracking-tight text-slate-900 text-sm whitespace-nowrap font-sans">
              SM TOR
            </span>
          </button>
        </div>

        {/* Back and Forward Desktop Buttons */}
        <div className="hidden sm:flex items-center gap-1 shrink-0 text-slate-600">
          <button
            onClick={onGoBack}
            disabled={!activeTab.canGoBack}
            title={t.back}
            className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={onGoForward}
            disabled={!activeTab.canGoForward}
            title={t.forward}
            className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Omnibox / Address Bar */}
        <form onSubmit={handleSubmit} className="flex-1 min-w-0">
          <div className={`relative flex items-center h-10 px-3 bg-slate-100/90 hover:bg-slate-100 rounded-full border transition-all ${
            isFocused ? 'bg-white border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200/70'
          }`}>
            {/* Site Favicon / DuckDuckGo Icon */}
            <div className="shrink-0 flex items-center">
              {renderOmniboxIcon()}
            </div>

            {/* Onion indicator if .onion */}
            {isOnion && (
              <span className="flex items-center gap-1 text-purple-700 font-mono text-[11px] bg-purple-100 px-2 py-0.5 rounded-full me-2 shrink-0">
                <Globe className="w-3 h-3 text-purple-600" />
                <span>.ONION</span>
              </span>
            )}

            {/* Address Input */}
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="🔍 ابحث أو أدخل عنوان موقع..."
              className="flex-1 bg-transparent border-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none min-w-0 font-sans px-0.5"
              dir="auto"
            />

            {/* Clear or Bookmark Button */}
            {isFocused && inputUrl ? (
              <button
                type="button"
                onClick={() => setInputUrl('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full focus:outline-none"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleBookmark}
                title={isBookmarked ? t.removeBookmark : t.bookmarkThisPage}
                className={`p-1 rounded-full hover:bg-slate-200/60 transition-colors ${
                  isBookmarked ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Star className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400 text-amber-500' : ''}`} />
              </button>
            )}

            {/* Reload or Stop */}
            <button
              type="button"
              onClick={activeTab.isLoading ? onStop : onReload}
              title={activeTab.isLoading ? t.stopLoading : t.reload}
              className="p-1 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-colors ms-1"
            >
              <RotateCw className={`w-3.5 h-3.5 ${activeTab.isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </form>

        {/* Burp Suite Proxy Intercept Toggle */}
        {onToggleIntercept && (
          <button
            type="button"
            onClick={onToggleIntercept}
            title={interceptActive ? 'Burp Intercept: شغال (ON) - يتم إيقاف الطلبات قبل إرسالها' : 'Burp Intercept: معطل (OFF) - انقر لتفعيل اعتراض وتعديل الطلبات'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0 border shadow-2xs ${
              interceptActive 
                ? 'bg-orange-50 border-orange-400 text-orange-700 animate-pulse ring-2 ring-orange-200' 
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${interceptActive ? 'text-orange-600 fill-orange-500' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Intercept:</span>
            <span>{interceptActive ? 'ON' : 'OFF'}</span>
          </button>
        )}

        {/* Tab Count Button */}
        <button
          onClick={onOpenTabs}
          title={t.tabs}
          className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all shrink-0"
        >
          {tabCount}
        </button>

        {/* Quick Menu Button */}
        <button
          onClick={onOpenMenu}
          title={t.settings}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shrink-0"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
