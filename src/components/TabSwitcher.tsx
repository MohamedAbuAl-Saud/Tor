import React from 'react';
import { Plus, X, Globe, Trash2 } from 'lucide-react';
import { Tab } from '../types/browser';
import { Translations } from '../utils/i18n';
import { SearchEngineLogos } from './SearchLogos';

interface TabSwitcherProps {
  isOpen: boolean;
  tabs: Tab[];
  activeTabId: string;
  t: Translations;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onCloseAll: () => void;
  onClose: () => void;
}

export const TabSwitcher: React.FC<TabSwitcherProps> = ({
  isOpen,
  tabs,
  activeTabId,
  t,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onCloseAll,
  onClose,
}) => {
  if (!isOpen) return null;

  const DuckLogo = SearchEngineLogos.duckduckgo;

  const getTabIcon = (tab: Tab) => {
    if (tab.favicon) {
      return (
        <img 
          src={tab.favicon} 
          alt="" 
          className="w-4 h-4 rounded-md object-contain shrink-0" 
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }

    if (tab.url.includes('duckduckgo.com') || tab.url.includes('?q=')) {
      return <DuckLogo className="w-4 h-4 shrink-0" />;
    }

    if (tab.url.startsWith('http')) {
      try {
        const domain = new URL(tab.url).hostname;
        return (
          <img 
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
            alt=""
            className="w-4 h-4 rounded-md object-contain shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        );
      } catch {}
    }

    return (
      <img 
        src="/SM.jpg" 
        alt="" 
        className="w-4 h-4 rounded-full object-cover shrink-0" 
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-2 sm:p-6 transition-all animate-in fade-in duration-150">
      <div 
        className="bg-slate-50 w-full max-w-2xl mx-auto rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-lg">{t.tabs}</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {tabs.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {tabs.length > 1 && (
              <button
                onClick={onCloseAll}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.closeAllTabs}</span>
              </button>
            )}
            <button
              onClick={onNewTab}
              className="flex items-center gap-1 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.newTab}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;

            return (
              <div
                key={tab.id}
                onClick={() => {
                  onSelectTab(tab.id);
                  onClose();
                }}
                className={`group relative flex flex-col justify-between h-44 rounded-2xl p-4 bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                  isActive 
                    ? 'border-indigo-600 ring-2 ring-indigo-100' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Top card bar with site logo */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="p-1 rounded-lg bg-slate-100 shrink-0">
                      {getTabIcon(tab)}
                    </div>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                      {tab.title || t.newTab}
                    </span>
                  </div>

                  {/* Close tab button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors"
                    title={t.closeTab}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Card Preview / Snippet */}
                <div className="flex-1 my-2 py-2 px-3 bg-slate-50/70 rounded-xl border border-slate-100 flex flex-col justify-center text-xs text-slate-500 overflow-hidden">
                  <p className="font-mono text-[11px] text-slate-600 truncate" dir="ltr">
                    {tab.url || 'sm://home'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {tab.content ? 'تم تحميل المستند والمحتوى بنجاح' : 'صفحة البداية وبوابة الخصوصية'}
                  </p>
                </div>

                {/* Bottom card badges */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {tab.isOnion ? (
                      <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
                        <Globe className="w-3 h-3 text-purple-600" />
                        <span>Tor .onion</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
                        <span>JavaScript Active</span>
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      التبويب النشط
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>انقر على أي بطاقة للتبديل إليها</span>
          <button
            onClick={onClose}
            className="text-slate-700 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
