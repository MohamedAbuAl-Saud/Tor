import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Search, 
  Trash2, 
  Pause, 
  Play, 
  ExternalLink, 
  ShieldCheck, 
  ArrowLeft, 
  ArrowRight,
  Calendar,
  Globe
} from 'lucide-react';
import { HistoryItem, SearchHistoryItem, ProfileSettings } from '../types/browser';
import { 
  getHistoryEntries, 
  deleteHistoryEntry, 
  clearAllHistory, 
  getSearchHistory, 
  clearSearchHistory, 
  saveProfile 
} from '../utils/storage';
import { Translations } from '../utils/i18n';
import { ToggleSwitch } from './ToggleSwitch';

interface FullPageHistoryProps {
  profile: ProfileSettings;
  t: Translations;
  isRtl: boolean;
  onNavigate: (url: string) => void;
  onUpdateProfile: (updated: ProfileSettings) => void;
  onBackToBrowser: () => void;
}

export const FullPageHistory: React.FC<FullPageHistoryProps> = ({
  profile,
  t,
  isRtl,
  onNavigate,
  onUpdateProfile,
  onBackToBrowser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'browsing' | 'search'>('browsing');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [searchItems, setSearchItems] = useState<SearchHistoryItem[]>([]);
  const [query, setQuery] = useState('');

  const loadData = async () => {
    const hist = await getHistoryEntries(profile.profileId);
    setHistoryItems(hist);
    const searches = await getSearchHistory(profile.profileId);
    setSearchItems(searches);
  };

  useEffect(() => {
    loadData();
  }, [profile.profileId]);

  const handleDeleteHistory = async (id: string) => {
    await deleteHistoryEntry(id);
    await loadData();
  };

  const handleClearAllBrowsing = async () => {
    if (confirm(t.clearHistory + '؟')) {
      await clearAllHistory(profile.profileId);
      await loadData();
    }
  };

  const handleClearAllSearch = async () => {
    if (confirm(t.clearSearchHistory + '؟')) {
      await clearSearchHistory(profile.profileId);
      await loadData();
    }
  };

  const handleToggleHistoryRecording = async () => {
    const updated = { ...profile, recordHistory: !profile.recordHistory };
    await saveProfile(updated);
    onUpdateProfile(updated);
  };

  const handleToggleSearchRecording = async () => {
    const updated = { ...profile, recordSearchHistory: !profile.recordSearchHistory };
    await saveProfile(updated);
    onUpdateProfile(updated);
  };

  const filteredHistory = historyItems.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) || 
    item.url.toLowerCase().includes(query.toLowerCase())
  );

  const filteredSearch = searchItems.filter(item => 
    item.query.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 min-h-screen pb-24">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToBrowser}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              title={t.back}
            >
              {isRtl ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-slate-900 text-white">
                <Clock className="w-5 h-5" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {t.history}
              </h1>
            </div>
          </div>

          <button
            onClick={onBackToBrowser}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
          >
            {t.home}
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Sub-tab navigation */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl">
            <button
              onClick={() => setActiveSubTab('browsing')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSubTab === 'browsing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              سجل التصفح ({historyItems.length})
            </button>
            <button
              onClick={() => setActiveSubTab('search')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSubTab === 'search' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              سجل البحث ({searchItems.length})
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {activeSubTab === 'browsing' ? (
              <>
                <button
                  onClick={handleToggleHistoryRecording}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                    profile.recordHistory 
                      ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100' 
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  {profile.recordHistory ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{profile.recordHistory ? t.pauseHistory : t.resumeHistory}</span>
                </button>
                {historyItems.length > 0 && (
                  <button
                    onClick={handleClearAllBrowsing}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.clearHistory}</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleToggleSearchRecording}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                    profile.recordSearchHistory 
                      ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100' 
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  {profile.recordSearchHistory ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{profile.recordSearchHistory ? t.pauseHistory : t.resumeHistory}</span>
                </button>
                {searchItems.length > 0 && (
                  <button
                    onClick={handleClearAllSearch}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.clearSearchHistory}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute top-3.5 start-3.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={activeSubTab === 'browsing' ? 'البحث في سجل التصفح بالاسم أو العنوان...' : 'البحث في استعلامات البحث...'}
            className="w-full bg-white rounded-2xl border border-slate-200 py-2.5 ps-10 pe-4 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 shadow-2xs"
          />
        </div>

        {/* Content list */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          {activeSubTab === 'browsing' ? (
            filteredHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs sm:text-sm">
                <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p>لا توجد سجلات تصفح مسجلة حالياً</p>
                <p className="text-[11px] text-slate-400 mt-1">يتم تخزين السجلات محلياً في جهازك داخل قاعدة بيانات IndexedDB المشفرة.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredHistory.map((item) => (
                  <div 
                    key={item.id}
                    className="p-4 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div 
                      onClick={() => {
                        onNavigate(item.url);
                        onBackToBrowser();
                      }}
                      className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="p-2 bg-slate-100 rounded-xl text-slate-600 shrink-0 mt-0.5">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate hover:text-indigo-600 transition-colors">
                          {item.title || item.url}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 block truncate" dir="ltr">
                          {item.url}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {new Date(item.visitedAt).toLocaleDateString()} - {new Date(item.visitedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          onNavigate(item.url);
                          onBackToBrowser();
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        title={t.openInNewTab}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteHistory(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title={t.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            filteredSearch.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs sm:text-sm">
                <Search className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p>لا توجد سجلات بحث مسجلة</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredSearch.map((item) => (
                  <div 
                    key={item.id}
                    className="p-4 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div 
                      onClick={() => {
                        onNavigate(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(item.query)}`);
                        onBackToBrowser();
                      }}
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="p-2 bg-slate-100 rounded-xl text-slate-600 shrink-0">
                        <Search className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate hover:text-indigo-600 transition-colors">
                          {item.query}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          محرك DuckDuckGo · {new Date(item.searchedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(item.query)}`);
                        onBackToBrowser();
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors shrink-0"
                    >
                      بحث مجدداً
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
