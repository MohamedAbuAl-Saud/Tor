import React, { useState, useEffect } from 'react';
import { Bookmark as BookmarkIcon, Star, Trash2, ExternalLink, X, Plus, Search } from 'lucide-react';
import { Bookmark } from '../types/browser';
import { getBookmarks, removeBookmark, addBookmark } from '../utils/storage';
import { Translations } from '../utils/i18n';

interface BookmarksManagerProps {
  isOpen: boolean;
  currentUrl: string;
  currentTitle: string;
  t: Translations;
  onNavigate: (url: string) => void;
  onClose: () => void;
}

export const BookmarksManager: React.FC<BookmarksManagerProps> = ({
  isOpen,
  currentUrl,
  currentTitle,
  t,
  onNavigate,
  onClose,
}) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const loadData = async () => {
    const list = await getBookmarks();
    setBookmarks(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setNewTitle(currentTitle || '');
      setNewUrl(currentUrl || '');
    }
  }, [isOpen, currentUrl, currentTitle]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    await addBookmark({
      url: newUrl.trim(),
      title: newTitle.trim() || newUrl.trim(),
    });

    setIsAdding(false);
    setNewTitle('');
    setNewUrl('');
    await loadData();
  };

  const handleDelete = async (id: string) => {
    await removeBookmark(id);
    await loadData();
  };

  if (!isOpen) return null;

  const filteredBookmarks = bookmarks.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-all">
      <div 
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <BookmarkIcon className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">{t.bookmarks}</h2>
              <p className="text-xs text-slate-500">Fast Access Saved Web Pages</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Add form */}
        {isAdding && (
          <form onSubmit={handleAdd} className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-2.5">
            <input
              type="text"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="https://..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              dir="ltr"
            />
            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-2xs"
              >
                Save Bookmark
              </button>
            </div>
          </form>
        )}

        {/* Search */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative flex items-center bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200/60">
            <Search className="w-4 h-4 text-slate-400 me-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved bookmarks..."
              className="bg-transparent border-none text-xs text-slate-800 focus:outline-none flex-1"
            />
          </div>
        </div>

        {/* Bookmarks List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {filteredBookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Star className="w-10 h-10 stroke-[1.2] mb-2 opacity-40" />
              <p className="text-xs text-slate-500">{t.noBookmarks}</p>
            </div>
          ) : (
            filteredBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50/50 rounded-xl px-2 transition-colors"
              >
                <div 
                  onClick={() => {
                    onNavigate(bookmark.url);
                    onClose();
                  }}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {bookmark.title.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm block truncate group-hover:text-indigo-600 transition-colors">
                      {bookmark.title}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 block truncate" dir="ltr">
                      {bookmark.url}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      onNavigate(bookmark.url);
                      onClose();
                    }}
                    title="Open"
                    className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(bookmark.id)}
                    title={t.removeBookmark}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>{bookmarks.length} saved bookmarks</span>
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
