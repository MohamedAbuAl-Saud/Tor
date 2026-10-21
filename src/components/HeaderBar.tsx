import React, { useState } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  RotateCw, 
  X, 
  Star, 
  MoreVertical, 
  Lock, 
  Globe, 
  Layers,
  ArrowLeft,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Tab, SafeModeType } from '../types/browser';
import { Translations } from '../utils/i18n';

interface HeaderBarProps {
  activeTab: Tab;
  tabCount: number;
  t: Translations;
  isRtl: boolean;
  isBookmarked: boolean;
  onNavigate: (url: string) => void;
  onReload: () => void;
  onStop: () => void;
  onToggleBookmark: () => void;
  onOpenTabs: () => void;
  onOpenMenu: () => void;
  onOpenPrivacyDashboard: () => void;
  onGoBack: () => void;
  onGoForward: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeTab,
  tabCount,
  t,
  isRtl,
  isBookmarked,
  onNavigate,
  onReload,
  onStop,
  onToggleBookmark,
  onOpenTabs,
  onOpenMenu,
  onOpenPrivacyDashboard,
  onGoBack,
  onGoForward,
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

  const isSafeMode = activeTab.safeMode === 'safe';
  const isOnion = activeTab.isOnion;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-2 sm:px-4 py-2 transition-all">
      <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-3">
        {/* Circular SM Logo and Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => onNavigate('sm://home')}
            className="flex items-center gap-2 text-left hover:opacity-90 transition-opacity focus:outline-none"
            title={t.home}
          >
            <img 
              src="/SM.jpg" 
              alt="SM Logo" 
              className="w-8 h-8 rounded-full border border-slate-200 shadow-xs object-cover"
              onError={(e) => {
                // Fallback SVG if image not yet loaded
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="hidden md:inline font-bold tracking-tight text-slate-900 text-sm whitespace-nowrap">
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

        {/* Omnibox / Address Bar (Samsung Internet style rounded bar) */}
        <form onSubmit={handleSubmit} className="flex-1 min-w-0">
          <div className={`relative flex items-center h-10 px-3 bg-slate-100/90 hover:bg-slate-100 rounded-full border transition-all ${
            isFocused ? 'bg-white border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200/60'
          }`}>
            {/* Security / Tor / Safe Mode Badge */}
            <button
              type="button"
              onClick={onOpenPrivacyDashboard}
              title={isSafeMode ? t.safeDocumentMode : t.javascriptEnabled}
              className="flex items-center gap-1 me-2 text-xs font-medium focus:outline-none group shrink-0"
            >
              {isOnion ? (
                <span className="flex items-center gap-1 text-purple-700 font-mono text-[11px] bg-purple-100/80 px-1.5 py-0.5 rounded-full">
                  <Globe className="w-3 h-3 text-purple-600" />
                  <span>ONION</span>
                </span>
              ) : isSafeMode ? (
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-full text-[11px]">
                  <Shield className="w-3 h-3 text-emerald-600" />
                  <span className="hidden sm:inline">Safe</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-full text-[11px]">
                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                  <span className="hidden sm:inline">JS</span>
                </span>
              )}
            </button>

            {/* Address Input */}
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t.searchOrEnterAddress}
              className="flex-1 bg-transparent border-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none min-w-0 font-sans"
              dir="ltr"
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
                className={`p-1 rounded-full transition-colors focus:outline-none ${
                  isBookmarked ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Star className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
              </button>
            )}

            {/* Reload or Stop Button */}
            <button
              type="button"
              onClick={activeTab.isLoading ? onStop : onReload}
              title={activeTab.isLoading ? t.stopLoading : t.reload}
              className="p-1 ms-1 text-slate-500 hover:text-slate-800 transition-colors focus:outline-none"
            >
              {activeTab.isLoading ? (
                <X className="w-4 h-4 text-rose-500" />
              ) : (
                <RotateCw className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </form>

        {/* Tab Count Pill (Samsung Internet style rounded square pill) */}
        <button
          onClick={onOpenTabs}
          title={t.tabs}
          className="relative flex items-center justify-center w-8 h-8 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs shadow-2xs transition-colors shrink-0"
        >
          <span>{tabCount}</span>
        </button>

        {/* Menu 3-Dots */}
        <button
          onClick={onOpenMenu}
          title={t.settings}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors shrink-0"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
