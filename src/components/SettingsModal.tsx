import React, { useState } from 'react';
import { 
  Settings, 
  Globe, 
  Search, 
  Shield, 
  Server, 
  X, 
  RefreshCw, 
  HardDrive, 
  Check, 
  Sliders,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { ProfileSettings, SupportedLanguage, SearchEngine, TorStatusResponse } from '../types/browser';
import { saveProfile, resetProfileId } from '../utils/storage';
import { Translations } from '../utils/i18n';

interface SettingsModalProps {
  isOpen: boolean;
  profile: ProfileSettings;
  torStatus: TorStatusResponse | null;
  t: Translations;
  onUpdateProfile: (updated: ProfileSettings) => void;
  onTestTorCircuit: () => void;
  onClose: () => void;
}

const LANGUAGES: { code: SupportedLanguage; label: string; nativeName: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeName: 'العربية (RTL)', dir: 'rtl' },
  { code: 'ru', label: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  { code: 'fr', label: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'de', label: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'ja', label: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  { code: 'ko', label: 'Korean', nativeName: '한국어', dir: 'ltr' },
  { code: 'zh', label: 'Simplified Chinese', nativeName: '简体中文', dir: 'ltr' },
];

const SEARCH_PROVIDERS: { id: SearchEngine; name: string; url: string }[] = [
  { id: 'duckduckgo', name: 'DuckDuckGo (Default & Recommended)', url: 'https://duckduckgo.com' },
  { id: 'searxng', name: 'SearXNG (Decentralized Metasearch)', url: 'https://searx.be' },
  { id: 'brave', name: 'Brave Search', url: 'https://search.brave.com' },
  { id: 'startpage', name: 'Startpage (Google results without tracking)', url: 'https://startpage.com' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  profile,
  torStatus,
  t,
  onUpdateProfile,
  onTestTorCircuit,
  onClose,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'tor' | 'privacy'>('general');

  if (!isOpen) return null;

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    const updated = { ...profile, language: lang };
    await saveProfile(updated);
    onUpdateProfile(updated);
  };

  const handleEngineChange = async (engine: SearchEngine) => {
    const updated = { ...profile, searchEngine: engine };
    await saveProfile(updated);
    onUpdateProfile(updated);
  };

  const handleRegenerateProfile = async () => {
    const newProfile = await resetProfileId();
    onUpdateProfile(newProfile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-all">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">{t.settings}</h2>
              <p className="text-xs text-slate-500">Preferences, Languages, and Tor Networking</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 px-6">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'general' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            General & Language
          </button>
          <button
            onClick={() => setActiveTab('tor')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'tor' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tor Networking
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'privacy' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Storage & Profile
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'general' && (
            <>
              {/* Language Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {t.language}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {LANGUAGES.map((lang) => {
                    const isSelected = profile.language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-100'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900">{lang.nativeName}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                        </div>
                        <span className="text-[11px] text-slate-400 block">{lang.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Engine Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {t.searchEngine}
                </label>
                <div className="space-y-2">
                  {SEARCH_PROVIDERS.map((provider) => {
                    const isSelected = profile.searchEngine === provider.id;
                    return (
                      <button
                        key={provider.id}
                        onClick={() => handleEngineChange(provider.id)}
                        className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-100'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{provider.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{provider.url}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'tor' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-900">Tor Daemon Connection</h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    torStatus?.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {torStatus?.connected ? 'Connected' : 'Unavailable'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  {torStatus?.details || 'Probing local SOCKS5 port...'}
                </p>

                <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-xs text-slate-700 space-y-1">
                  <div><strong>Host:</strong> {torStatus?.host || '127.0.0.1'}</div>
                  <div><strong>Port:</strong> {torStatus?.port || 9050} (SOCKS5)</div>
                  {torStatus?.latencyMs && <div><strong>Latency:</strong> {torStatus.latencyMs}ms</div>}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={onTestTorCircuit}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-2xs"
                  >
                    Test Tor Circuit
                  </button>
                </div>
              </div>

              {/* Exact Setup Instructions */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">How to run Tor on your machine</h4>
                <p className="text-slate-600 leading-relaxed font-sans">
                  The gateway communicates with a real Tor SOCKS5 daemon over localhost port 9050. Run one of these commands on your host system:
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] space-y-1 overflow-x-auto">
                  <p># Linux (Debian/Ubuntu):</p>
                  <p className="text-emerald-400">sudo apt update && sudo apt install -y tor && tor</p>
                  <p className="mt-2"># macOS (Homebrew):</p>
                  <p className="text-emerald-400">brew install tor && tor</p>
                  <p className="mt-2"># Docker Container:</p>
                  <p className="text-emerald-400">docker run -d --name tor -p 9050:9050 osminogin/tor-simple</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-900">Cryptographic Profile</h3>
                  <button
                    onClick={handleRegenerateProfile}
                    className="text-xs font-semibold px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  Every profile is isolated and uses random cryptographic entropy.
                </p>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 font-mono text-xs text-slate-700 break-all select-all" dir="ltr">
                  {profile.profileId}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">Offline Storage Architecture</h4>
                <p>
                  Bookmarks, downloads, history, and cookies are kept inside your local IndexedDB database (<span className="font-mono">sm_browser_tor_db</span>).
                </p>
                <p>
                  Closing a tab or secret session disposes of active in-memory network handles and iframe contexts.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>SM BROWSER TOR v1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
