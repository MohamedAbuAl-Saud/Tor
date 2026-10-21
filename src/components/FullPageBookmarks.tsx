import React, { useState, useEffect } from 'react';
import { 
  Bookmark as BookmarkIcon, 
  Star, 
  Trash2, 
  ExternalLink, 
  Plus, 
  Search, 
  ArrowLeft, 
  ArrowRight,
  Globe
} from 'lucide-react';
import { Bookmark } from '../types/browser';
import { getBookmarks, removeBookmark, addBookmark } from '../utils/storage';
import { Translations } from '../utils/i18n';

interface FullPageBookmarksProps {
  currentUrl?: string;
  currentTitle?: string;
  t: Translations;
  isRtl: boolean;
  onNavigate: (url: string) => void;
  onBackToBrowser: () => void;
}

export const FullPageBookmarks: React.FC<FullPageBookmarksProps> = ({
  currentUrl,
  currentTitle,
  t,
  isRtl,
  onNavigate,
  onBackToBrowser,
}) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [query, setQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState(currentTitle || '');
  const [newUrl, setNewUrl] = useState(currentUrl || 'https://');

  const loadData = async () => {
    const all = await getBookmarks();
    setBookmarks(all);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    await addBookmark({
      url: newUrl.trim(),
      title: newTitle.trim() || newUrl.trim(),
    });

    setIsAdding(false);
    setNewTitle('');
    setNewUrl('https://');
    await loadData();
  };

  const handleDeleteBookmark = async (id: string) => {
    await removeBookmark(id);
    await loadData();
  };

  const filteredBookmarks = bookmarks.filter(b =>
    b.title.toLowerCase().includes(query.toLowerCase()) ||
    b.url.toLowerCase().includes(query.toLowerCase())
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
              <div className="p-1.5 rounded-xl bg-amber-500 text-white">
                <BookmarkIcon className="w-5 h-5" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {t.bookmarks}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addBookmark}</span>
            </button>
            <button
              onClick={onBackToBrowser}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
            >
              {t.home}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Add Bookmark Form */}
        {isAdding && (
          <form onSubmit={handleAddBookmark} className="bg-white p-5 rounded-3xl border border-indigo-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900">إضافة إشارة مرجعية جديدة</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">عنوان الموقع</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: ويكيبيديا الموسوعة الحرة"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">الرابط (URL)</label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                حفظ الإشارة
              </button>
            </div>
          </form>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute top-3.5 start-3.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="البحث في الإشارات المرجعية المحفوظة..."
            className="w-full bg-white rounded-2xl border border-slate-200 py-2.5 ps-10 pe-4 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 shadow-2xs"
          />
        </div>

        {/* Bookmarks List */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          {filteredBookmarks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs sm:text-sm">
              <BookmarkIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p>لا توجد إشارات مرجعية محفوظة</p>
              <p className="text-[11px] text-slate-400 mt-1">انقر على زر النجمة في شريط العناوين أو زر إضافة لحفظ مواقعك المفضلة.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredBookmarks.map((item) => (
                <div 
                  key={item.id}
                  className="p-4 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                >
                  <div 
                    onClick={() => {
                      onNavigate(item.url);
                      onBackToBrowser();
                    }}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="p-2.5 bg-amber-50 rounded-2xl text-amber-600 shrink-0">
                      <Star className="w-4 h-4 fill-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate hover:text-indigo-600 transition-colors">
                        {item.title}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 block truncate" dir="ltr">
                        {item.url}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        أُضيفت في: {new Date(item.createdAt).toLocaleDateString()}
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
                      onClick={() => handleDeleteBookmark(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
