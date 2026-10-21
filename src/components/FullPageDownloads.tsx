import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Trash2, 
  ExternalLink, 
  Eye, 
  FileText, 
  FileCode, 
  Image as ImageIcon, 
  Music, 
  Video, 
  HardDrive, 
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { DownloadItem } from '../types/browser';
import { getDownloads, deleteDownload, getDownloadBlob } from '../utils/storage';
import { Translations } from '../utils/i18n';

interface FullPageDownloadsProps {
  t: Translations;
  isRtl: boolean;
  onBackToBrowser: () => void;
}

export const FullPageDownloads: React.FC<FullPageDownloadsProps> = ({
  t,
  isRtl,
  onBackToBrowser,
}) => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<DownloadItem | null>(null);

  const loadData = async () => {
    const all = await getDownloads();
    setDownloads(all);
  };

  useEffect(() => {
    loadData();
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, []);

  const handleDelete = async (id: string, blobKey: string) => {
    await deleteDownload(id, blobKey);
    await loadData();
    if (previewItem?.id === id) {
      setPreviewItem(null);
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
  };

  const handlePreview = async (item: DownloadItem) => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }

    const blob = await getDownloadBlob(item.blobKey);
    if (blob) {
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
      setPreviewItem(item);
    } else {
      alert('File payload not found in local IndexedDB storage.');
    }
  };

  const handleExportToDevice = async (item: DownloadItem) => {
    const blob = await getDownloadBlob(item.blobKey);
    if (!blob) {
      alert('Could not export: file payload missing.');
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-indigo-600" />;
    if (mime.startsWith('audio/')) return <Music className="w-5 h-5 text-amber-600" />;
    if (mime.startsWith('video/')) return <Video className="w-5 h-5 text-rose-600" />;
    if (mime.includes('html') || mime.includes('javascript') || mime.includes('json')) return <FileCode className="w-5 h-5 text-emerald-600" />;
    return <FileText className="w-5 h-5 text-slate-600" />;
  };

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
                <Download className="w-5 h-5" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {t.downloads}
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
        {/* Info card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-2xl">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">تخزين التنزيلات المعزول (IndexedDB Blobs)</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">الملفات محفوطة بأمان داخل مساحة التخزين المعزولة للمتصفح دون وصول للملفات المحلية.</p>
            </div>
          </div>
          <span className="text-xs font-bold font-mono text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
            {downloads.length} ملفات
          </span>
        </div>

        {/* Safe Preview Box */}
        {previewItem && previewBlobUrl && (
          <div className="bg-white rounded-3xl p-5 border border-indigo-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 truncate max-w-sm">
                  معاينة آمنة: {previewItem.filename}
                </h3>
              </div>
              <button
                onClick={() => {
                  setPreviewItem(null);
                  if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
                  setPreviewBlobUrl(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100"
              >
                إغلاق المعاينة
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-center max-h-80 overflow-auto">
              {previewItem.mimeType.startsWith('image/') ? (
                <img src={previewBlobUrl} alt={previewItem.filename} className="max-h-72 rounded-lg object-contain" />
              ) : previewItem.mimeType.startsWith('audio/') ? (
                <audio controls src={previewBlobUrl} className="w-full" />
              ) : previewItem.mimeType.startsWith('video/') ? (
                <video controls src={previewBlobUrl} className="max-h-72 rounded-lg" />
              ) : (
                <div className="text-xs text-slate-500 text-center font-mono">
                  الملف من نوع {previewItem.mimeType}. لا تتوفر معاينة مرئية مباشرة داخل الحاوية.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Downloads List */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          {downloads.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs sm:text-sm">
              <Download className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p>{t.noDownloads}</p>
              <p className="text-[11px] text-slate-400 mt-1">أي ملف تقوم بتنزيله عبر البوابة يتم حفظه هنا تلقائياً في قاعدة البيانات الآمنة.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {downloads.map((item) => (
                <div 
                  key={item.id}
                  className="p-4 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2.5 bg-slate-100 rounded-2xl shrink-0">
                      {getFileIcon(item.mimeType)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                        {item.filename}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span>{formatBytes(item.size)}</span>
                        <span>·</span>
                        <span>{item.mimeType}</span>
                        <span>·</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 block truncate" dir="ltr">
                        المصدر: {item.url}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handlePreview(item)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      title={t.safePreview}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExportToDevice(item)}
                      className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                      title={t.exportToDevice}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.blobKey)}
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
