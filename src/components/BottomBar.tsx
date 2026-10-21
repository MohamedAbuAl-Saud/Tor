import React from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Home, 
  Bookmark as BookmarkIcon, 
  Download, 
  Layers, 
  Menu as MenuIcon,
  ShieldCheck
} from 'lucide-react';
import { Translations } from '../utils/i18n';

interface BottomBarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  tabCount: number;
  t: Translations;
  isRtl: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoHome: () => void;
  onOpenBookmarks: () => void;
  onOpenDownloads: () => void;
  onOpenTabs: () => void;
  onOpenMenu: () => void;
  onOpenPrivacyDashboard: () => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  canGoBack,
  canGoForward,
  tabCount,
  t,
  isRtl,
  onGoBack,
  onGoForward,
  onGoHome,
  onOpenBookmarks,
  onOpenDownloads,
  onOpenTabs,
  onOpenMenu,
  onOpenPrivacyDashboard,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 sm:px-4 py-1.5 transition-all">
      <div className="max-w-md md:max-w-2xl mx-auto flex items-center justify-between">
        {/* Back */}
        <button
          onClick={onGoBack}
          disabled={!canGoBack}
          title={t.back}
          className="flex flex-col items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
        >
          {isRtl ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </button>

        {/* Forward */}
        <button
          onClick={onGoForward}
          disabled={!canGoForward}
          title={t.forward}
          className="flex flex-col items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
        >
          {isRtl ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
        </button>

        {/* Home */}
        <button
          onClick={onGoHome}
          title={t.home}
          className="flex flex-col items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <Home className="w-5 h-5" />
        </button>

        {/* Bookmarks */}
        <button
          onClick={onOpenBookmarks}
          title={t.bookmarks}
          className="flex flex-col items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <BookmarkIcon className="w-5 h-5" />
        </button>

        {/* Downloads */}
        <button
          onClick={onOpenDownloads}
          title={t.downloads}
          className="flex flex-col items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <Download className="w-5 h-5" />
        </button>

        {/* Tabs Manager */}
        <button
          onClick={onOpenTabs}
          title={t.tabs}
          className="relative flex flex-col items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center justify-center w-5 h-5 border-2 border-current rounded-md text-[11px] font-bold">
            {tabCount}
          </div>
        </button>

        {/* Privacy / Menu */}
        <button
          onClick={onOpenMenu}
          title={t.settings}
          className="flex flex-col items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
};
