import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Download, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Globe, 
  Filter,
  RefreshCw
} from 'lucide-react';
import { NetworkLogEntry } from '../types/browser';
import { Translations } from '../utils/i18n';

interface DeveloperToolsProps {
  isOpen: boolean;
  t: Translations;
  onClose: () => void;
}

export const DeveloperTools: React.FC<DeveloperToolsProps> = ({
  isOpen,
  t,
  onClose,
}) => {
  const [logs, setLogs] = useState<NetworkLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<NetworkLogEntry | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/devtools/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load devtools logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const handleClearLogs = async () => {
    await fetch('/api/devtools/clear', { method: 'POST' });
    setLogs([]);
    setSelectedLog(null);
  };

  const handleExportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      browser: 'SM BROWSER TOR',
      totalRequests: logs.length,
      logs: logs.map(l => ({
        ...l,
        // Ensure sensitive headers are redacted
        headers: Object.fromEntries(
          Object.entries(l.headers || {}).map(([k, v]) => [
            k,
            k.toLowerCase().includes('auth') || k.toLowerCase().includes('cookie') ? '[REDACTED]' : v
          ])
        ),
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sm-tor-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const filteredLogs = logs.filter(l => 
    l.url.toLowerCase().includes(filterQuery.toLowerCase()) ||
    l.method.toLowerCase().includes(filterQuery.toLowerCase()) ||
    String(l.status).includes(filterQuery)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-all">
      <div 
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">{t.networkInspector}</h2>
              <p className="text-xs text-slate-500">Live Gateway Request Diagnostics & Security Events</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportReport}
              disabled={logs.length === 0}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportReport}</span>
            </button>
            <button
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="text-xs font-semibold px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter requests by URL, method, status..."
            className="flex-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none"
          />
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:bg-slate-200 rounded-xl"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Split pane: Table on left, Details on right */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Table */}
          <div className="flex-1 overflow-y-auto font-mono text-xs divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-sans">
                No network requests recorded in this session.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isSuccess = log.status >= 200 && log.status < 400;
                const isBlocked = log.status === 403 || log.blockedReason;

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-3 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      selectedLog?.id === log.id ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isBlocked
                          ? 'bg-rose-100 text-rose-700'
                          : isSuccess
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {log.status || 'ERR'}
                      </span>

                      <span className="font-bold text-slate-700 uppercase text-[11px] shrink-0">
                        {log.method}
                      </span>

                      <span className="text-slate-800 truncate text-xs" dir="ltr">
                        {log.url}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
                      {log.isTorRouted && (
                        <span className="text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">
                          Tor
                        </span>
                      )}
                      <span>{log.durationMs}ms</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Details pane */}
          <div className="w-full md:w-80 lg:w-96 p-4 overflow-y-auto bg-slate-50/50 text-xs">
            {selectedLog ? (
              <div className="space-y-4 font-sans">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">Request Summary</h3>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                    <div className="break-all"><strong className="text-slate-600">URL:</strong> {selectedLog.url}</div>
                    <div><strong className="text-slate-600">Method:</strong> {selectedLog.method}</div>
                    <div><strong className="text-slate-600">Status:</strong> {selectedLog.status}</div>
                    <div><strong className="text-slate-600">Latency:</strong> {selectedLog.durationMs}ms</div>
                    <div><strong className="text-slate-600">Content-Type:</strong> {selectedLog.contentType}</div>
                    <div><strong className="text-slate-600">Size:</strong> {selectedLog.contentLength} bytes</div>
                    <div><strong className="text-slate-600">Tor Routed:</strong> {selectedLog.isTorRouted ? 'Yes' : 'No'}</div>
                  </div>
                </div>

                {selectedLog.blockedReason && (
                  <div>
                    <h4 className="font-bold text-rose-700 text-xs mb-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Security Reason / Error
                    </h4>
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl text-xs leading-relaxed font-sans">
                      {selectedLog.blockedReason}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">Sanitization & CSP</h4>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs leading-relaxed">
                    {selectedLog.safeMode ? (
                      <span className="text-emerald-700 font-medium">
                        Safe Document Mode: Scripts, inline on* handlers, and unsafe objects stripped. Strict CSP injected.
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">
                        JavaScript Mode: Rendered in sandboxed iframe with origin isolation.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 font-sans">
                Select a network event to inspect headers and gateway routing.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>{logs.length} logged events in memory</span>
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
