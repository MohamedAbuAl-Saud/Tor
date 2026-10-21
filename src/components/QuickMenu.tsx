import React from 'react';
import { 
  Plus, 
  Bookmark, 
  Clock, 
  Download, 
  Shield, 
  Terminal, 
  Settings, 
  X, 
  CheckCircle2, 
  EyeOff, 
  Camera,
  Play,
  Zap
} from 'lucide-react';
import { Translations } from '../utils/i18n';
import { ProfileSettings } from '../types/browser';

interface QuickMenuProps {
  isOpen: boolean;
  profile: ProfileSettings;
  t: Translations;
  interceptActive?: boolean;
  onToggleIntercept?: () => void;
  onNewTab: () => void;
  onOpenBookmarks: () => void;
  onOpenHistory: () => void;
  onOpenDownloads: () => void;
  onOpenPrivacyDashboard: () => void;
  onOpenDevTools: () => void;
  onOpenSettings: () => void;
  onOpenSelfTest: () => void;
  onTogglePrivateMode: () => void;
  onToggleCameraBlock: () => void;
  onClose: () => void;
}

export const QuickMenu: React.FC<QuickMenuProps> = ({
  isOpen,
  profile,
  t,
  interceptActive = false,
  onToggleIntercept,
  onNewTab,
  onOpenBookmarks,
  onOpenHistory,
  onOpenDownloads,
  onOpenPrivacyDashboard,
  onOpenDevTools,
  onOpenSettings,
  onOpenSelfTest,
  onTogglePrivateMode,
  onToggleCameraBlock,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end sm:items-center sm:justify-center p-0 sm:p-4 transition-all"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-sm sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col h-full sm:h-auto max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <img 
              src="/SM.jpg" 
              alt="" 
              className="w-6 h-6 rounded-full object-cover" 
            />
            <span className="font-bold text-slate-900 text-sm">SM BROWSER TOR</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Tiles */}
        <div className="p-4 grid grid-cols-3 gap-2.5 overflow-y-auto">
          <button
            onClick={() => { onNewTab(); onClose(); }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors group"
          >
            <div className="p-2 rounded-xl bg-white text-slate-700 shadow-2xs mb-1.5 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700">{t.newTab}</span>
          </button>

          <button
            onClick={() => { onOpenBookmarks(); onClose(); }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors group"
          >
            <div className="p-2 rounded-xl bg-white text-slate-700 shadow-2xs mb-1.5 group-hover:scale-105 transition-transform">
              <Bookmark className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700">{t.bookmarks}</span>
          </button>

          <button
            onClick={() => { onOpenHistory(); onClose(); }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors group"
          >
            <div className="p-2 rounded-xl bg-white text-slate-700 shadow-2xs mb-1.5 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700">{t.history}</span>
          </button>

          <button
            onClick={() => { onOpenDownloads(); onClose(); }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors group"
          >
            <div className="p-2 rounded-xl bg-white text-slate-700 shadow-2xs mb-1.5 group-hover:scale-105 transition-transform">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700">{t.downloads}</span>
          </button>

          <button
            onClick={() => { onOpenPrivacyDashboard(); onClose(); }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors group"
          >
            <div className="p-2 rounded-xl bg-white text-emerald-600 shadow-2xs mb-1.5 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700">الخصوصية</span>
          </button>

          <button
            onClick={() => { onToggleCameraBlock(); onClose(); }}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-colors group ${
              profile.cameraBlocked ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200/60 text-slate-700'
            }`}
          >
            <div className="p-2 rounded-xl bg-white text-rose-600 shadow-2xs mb-1.5 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">{profile.cameraBlocked ? 'الكاميرا مقفلة' : 'الكاميرا متاحة'}</span>
          </button>

          <button
            onClick={() => { onOpenDevTools(); onClose(); }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors group"
          >
            <div className="p-2 rounded-xl bg-white text-indigo-600 shadow-2xs mb-1.5 group-hover:scale-105 transition-transform">
              <Terminal className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700">واير شارك</span>
          </button>

          {onToggleIntercept && (
            <button
              onClick={() => { onToggleIntercept(); }}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-colors group ${
                interceptActive
                  ? 'bg-orange-50 border-orange-300 text-orange-700 ring-2 ring-orange-200'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200/60 text-slate-700'
              }`}
            >
              <div className="p-2 rounded-xl bg-white text-orange-600 shadow-2xs mb-1.5 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">{interceptActive ? 'الاعتراض شغال' : 'اعتراض بورب'}</span>
            </button>
          )}

          <button
            onClick={() => { onTogglePrivateMode(); onClose(); }}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-colors group ${
              profile.isPrivateMode
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200/60 text-slate-700'
            }`}
          >
            <div className="p-2 rounded-xl bg-white text-slate-700 shadow-2xs mb-1.5 group-hover:scale-105 transition-transform">
              <EyeOff className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">{t.privateMode}</span>
          </button>

          <button
            onClick={() => { onOpenSelfTest(); onClose(); }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors group"
          >
            <div className="p-2 rounded-xl bg-white text-slate-700 shadow-2xs mb-1.5 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700">فحص أمني</span>
          </button>
        </div>

        {/* Bottom Full-Page Settings Link */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
          <button
            onClick={() => { onOpenSettings(); onClose(); }}
            className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors text-xs font-bold text-slate-900 shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-slate-700" />
              <span>{t.fullPageSettings}</span>
            </div>
            <span className="text-indigo-600 font-semibold">فتح الصفحة &rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
};
