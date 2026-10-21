import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Search, 
  Trash2, 
  Pause, 
  Play, 
  ExternalLink, 
  X, 
  ShieldCheck, 
  Filter,
  Calendar
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

interface HistoryManagerProps {
  isOpen: boolean;
  profile: ProfileSettings;
  t: Translations;
  onNavigate: (url: string) => void;
  onUpdateProfile: (updated: ProfileSettings) => void;
  onClose: () => void;
}

export const HistoryManager: React.FC<HistoryManagerProps> = ({
  isOpen,
  profile,
  t,
  onNavigate,
  onUpdateProfile,
  onClose,
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
    if (isOpen) {
      loadData();
    }
  }, [isOpen, profile.profileId]);

  const handleDeleteHistory = async (id: string) => {
    await deleteHistoryEntry(id);
    await loadData();
  };

  const handleClearBrowsing = async () => {
    await clearAllHistory(profile.profileId);
    await loadData();
  };

  const handleClearSearches = async () => {
    await clearSearchHistory(profile.profileId);
    await loadData();
  };

  const toggleRecordHistory = async () => {
    const updated: ProfileSettings = {
      ...profile,
      recordHistory: !profile.recordHistory,
    };
    await saveProfile(updated);
    onUpdateProfile(updated);
  };

  const toggleRecordSearchHistory = async () => {
    const updated: ProfileSettings = {
      ...profile,
      recordSearchHistory: !profile.recordSearchHistory,
    };
    await saveProfile(updated);
    onUpdateProfile(updated);
  };

  if (!isOpen) return null;

  const filteredHistory = historyItems.filter(h => 
    h.title.toLowerCase().includes(query.toLowerCase()) || 
    h.url.toLowerCase().includes(query.toLowerCase())
  );

  const filteredSearches = searchItems.filter(s =>
    s.query.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-all">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">{t.history}</h2>
              <p className="text-xs text-slate-500">Local Browsing & Search Records</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtabs & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
            <button
              onClick={() => setActiveSubTab('browsing')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeSubTab === 'browsing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.browsingHistory} ({historyItems.length})
            </button>
            <button
              onClick={() => setActiveSubTab('search')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeSubTab === 'search' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.searchHistory} ({searchItems.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeSubTab === 'browsing' ? (
              <>
                <button
                  onClick={toggleRecordHistory}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                    profile.recordHistory
                      ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
                      : 'border-amber-300 bg-amber-50 text-amber-700'
                  }`}
                >
                  {profile.recordHistory ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{profile.recordHistory ? 'Pause' : 'Paused'}</span>
                </button>
                <button
                  onClick={handleClearBrowsing}
                  disabled={historyItems.length === 0}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.clearHistory}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleRecordSearchHistory}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                    profile.recordSearchHistory
                      ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
                      : 'border-amber-300 bg-amber-50 text-amber-700'
                  }`}
                >
                  {profile.recordSearchHistory ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{profile.recordSearchHistory ? 'Pause' : 'Paused'}</span>
                </button>
                <button
                  onClick={handleClearSearches}
                  disabled={searchItems.length === 0}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Searches</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search filter */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative flex items-center bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200/60">
            <Search className="w-4 h-4 text-slate-400 me-2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search history records..."
              className="bg-transparent border-none text-xs text-slate-800 focus:outline-none flex-1"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {activeSubTab === 'browsing' ? (
            filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No browsing history recorded yet.
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50/50 rounded-xl px-2 transition-colors"
                >
                  <div
                    onClick={() => {
                      onNavigate(item.url);
                      onClose();
                    }}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <span className="font-semibold text-slate-900 text-xs sm:text-sm block truncate group-hover:text-indigo-600 transition-colors">
                      {item.title || item.url}
                    </span>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                      <span className="font-mono truncate max-w-[240px] sm:max-w-md" dir="ltr">
                        {item.url}
                      </span>
                      <span>·</span>
                      <span>{new Date(item.visitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        onNavigate(item.url);
                        onClose();
                      }}
                      title="Open"
                      className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteHistory(item.id)}
                      title="Delete"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            filteredSearches.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No search history recorded yet.
              </div>
            ) : (
              filteredSearches.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50/50 rounded-xl px-2 transition-colors"
                >
                  <div
                    onClick={() => {
                      onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(item.query)}`);
                      onClose();
                    }}
                    className="flex-1 min-w-0 cursor-pointer flex items-center gap-2"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900 text-xs sm:text-sm block truncate group-hover:text-indigo-600 transition-colors">
                        {item.query}
                      </span>
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                        <span className="capitalize">{item.engine}</span>
                        <span>·</span>
                        <span>{new Date(item.searchedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(item.query)}`);
                      onClose();
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Stored on device only. No analytics sent.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
