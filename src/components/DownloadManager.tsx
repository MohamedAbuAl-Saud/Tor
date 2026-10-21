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
  AlertTriangle, 
  HardDrive, 
  X, 
  CheckCircle2, 
  Edit2,
  Share2
} from 'lucide-react';
import { DownloadItem } from '../types/browser';
import { 
  getDownloads, 
  getDownloadBlob, 
  deleteDownload, 
  exportToDevice, 
  getStorageEstimate 
} from '../utils/storage';
import { Translations } from '../utils/i18n';

interface DownloadManagerProps {
  isOpen: boolean;
  t: Translations;
  onClose: () => void;
}

export const DownloadManager: React.FC<DownloadManagerProps> = ({
  isOpen,
  t,
  onClose,
}) => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ quota: number; usage: number }>({ quota: 0, usage: 0 });
  const [previewItem, setPreviewItem] = useState<{ item: DownloadItem; blob: Blob; textContent?: string; objectUrl?: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const items = await getDownloads();
    setDownloads(items);
    const estimate = await getStorageEstimate();
    setStorageInfo(estimate);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleDelete = async (item: DownloadItem) => {
    await deleteDownload(item.id, item.blobKey);
    await loadData();
    if (previewItem?.item.id === item.id) {
      setPreviewItem(null);
    }
  };

  const handleExport = async (item: DownloadItem) => {
    const blob = await getDownloadBlob(item.blobKey);
    if (blob) {
      await exportToDevice(item.filename, blob);
    }
  };

  const handlePreview = async (item: DownloadItem) => {
    const blob = await getDownloadBlob(item.blobKey);
    if (!blob) return;

    if (item.mimeType.startsWith('text/') || item.mimeType.includes('json') || item.mimeType.includes('javascript')) {
      const text = await blob.text();
      setPreviewItem({ item, blob, textContent: text });
    } else {
      const objectUrl = URL.createObjectURL(blob);
      setPreviewItem({ item, blob, objectUrl });
    }
  };

  const closePreview = () => {
    if (previewItem?.objectUrl) {
      URL.revokeObjectURL(previewItem.objectUrl);
    }
    setPreviewItem(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isExecutableOrDangerous = (filename: string, mime: string) => {
    const dangerousExts = ['.exe', '.sh', '.bat', '.cmd', '.apk', '.msi', '.vbs', '.scr'];
    return dangerousExts.some(ext => filename.toLowerCase().endsWith(ext)) || mime.includes('x-msdownload') || mime.includes('x-executable');
  };

  if (!isOpen) return null;

  const usedMb = (storageInfo.usage / (1024 * 1024)).toFixed(1);
  const quotaMb = (storageInfo.quota / (1024 * 1024)).toFixed(0);
  const percentUsed = storageInfo.quota > 0 ? Math.min(100, Math.round((storageInfo.usage / storageInfo.quota) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-all">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">{t.downloads}</h2>
              <p className="text-xs text-slate-500">Internal IndexedDB Storage & Export Gateway</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Storage Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 font-medium">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              {t.storageUsed}: {usedMb} MB {storageInfo.quota > 0 && `of ${quotaMb} MB`}
            </span>
            <span>{percentUsed}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                percentUsed > 85 ? 'bg-rose-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.max(2, percentUsed)}%` }}
            />
          </div>
        </div>

        {/* Download Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100">
          {downloads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Download className="w-12 h-12 stroke-[1.2] mb-3 opacity-40" />
              <p className="text-sm font-medium text-slate-600">{t.noDownloads}</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Files downloaded while browsing are securely saved here as Blobs inside the browser first.
              </p>
            </div>
          ) : (
            downloads.map((item) => {
              const isDangerous = isExecutableOrDangerous(item.filename, item.mimeType);

              return (
                <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      isDangerous 
                        ? 'bg-amber-100 text-amber-700' 
                        : item.mimeType.startsWith('image/')
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {isDangerous ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : item.mimeType.startsWith('image/') ? (
                        <ImageIcon className="w-5 h-5" />
                      ) : item.mimeType.includes('pdf') || item.mimeType.includes('text') ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <FileCode className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                          {item.filename}
                        </span>
                        {isDangerous && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Executable / Untrusted
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                        <span className="font-mono">{formatBytes(item.size)}</span>
                        <span>·</span>
                        <span className="truncate max-w-[150px]">{item.mimeType}</span>
                        <span>·</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handlePreview(item)}
                      title={t.openPreview}
                      className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Preview</span>
                    </button>

                    <button
                      onClick={() => handleExport(item)}
                      title={t.downloadToDevice}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Export to Device</span>
                    </button>

                    <button
                      onClick={() => handleDelete(item)}
                      title={t.deleteDownload}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Files stored isolated in IndexedDB</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Safe Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-3xl p-5 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h3 className="font-bold text-sm text-slate-800 truncate">
                Safe Preview: {previewItem.item.filename}
              </h3>
              <button onClick={closePreview} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 rounded-xl p-4">
              {isExecutableOrDangerous(previewItem.item.filename, previewItem.item.mimeType) ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                  <h4 className="font-bold text-slate-900 text-sm">Execution Blocked by Policy</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    SM BROWSER TOR does not execute downloaded binaries or active scripts. You can export this file to your device to inspect it with external tools.
                  </p>
                </div>
              ) : previewItem.item.mimeType.startsWith('image/') && previewItem.objectUrl ? (
                <img 
                  src={previewItem.objectUrl} 
                  alt={previewItem.item.filename}
                  className="max-h-96 mx-auto rounded-lg object-contain" 
                />
              ) : previewItem.textContent !== undefined ? (
                <pre className="font-mono text-xs text-slate-700 whitespace-pre-wrap break-all">
                  {previewItem.textContent.slice(0, 50000)}
                </pre>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Binary file preview not available. Use 'Export to Device' below.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 mt-3">
              <button
                onClick={() => handleExport(previewItem.item)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Download to Device
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
