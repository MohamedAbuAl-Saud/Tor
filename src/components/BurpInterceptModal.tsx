import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Trash2, 
  Code2, 
  Check, 
  AlertCircle, 
  Plus, 
  X, 
  ShieldAlert, 
  Eye, 
  Sparkles,
  ArrowRight,
  Zap,
  Globe
} from 'lucide-react';

export interface InterceptedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  contentType?: string;
  timestamp: number;
}

interface BurpInterceptModalProps {
  request: InterceptedRequest | null;
  isOpen: boolean;
  onForward: (modifiedReq: InterceptedRequest) => void;
  onDrop: () => void;
  onDisableIntercept: () => void;
  isRtl: boolean;
}

export const BurpInterceptModal: React.FC<BurpInterceptModalProps> = ({
  request,
  isOpen,
  onForward,
  onDrop,
  onDisableIntercept,
  isRtl,
}) => {
  if (!isOpen || !request) return null;

  const [currentUrl, setCurrentUrl] = useState(request.url);
  const [currentMethod, setCurrentMethod] = useState(request.method || 'GET');
  const [headerRows, setHeaderRows] = useState<Array<{ key: string; value: string }>>([]);
  const [rawBody, setRawBody] = useState('');
  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'hex'>('headers');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderVal, setNewHeaderVal] = useState('');

  useEffect(() => {
    if (request) {
      setCurrentUrl(request.url);
      setCurrentMethod(request.method || 'GET');
      
      const rows = Object.entries(request.headers || {}).map(([key, value]) => ({ key, value }));
      if (rows.length === 0) {
        rows.push(
          { key: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          { key: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
          { key: 'Accept-Language', value: 'en-US,en;q=0.9,ar;q=0.8' }
        );
      }
      setHeaderRows(rows);

      if (typeof request.body === 'string') {
        setRawBody(request.body);
      } else if (request.body && typeof request.body === 'object') {
        try {
          setRawBody(JSON.stringify(request.body, null, 2));
        } catch {
          setRawBody(String(request.body));
        }
      } else {
        setRawBody('');
      }
      setJsonError(null);
    }
  }, [request]);

  const handleAddHeader = () => {
    if (!newHeaderKey.trim()) return;
    setHeaderRows(prev => [...prev, { key: newHeaderKey.trim(), value: newHeaderVal.trim() }]);
    setNewHeaderKey('');
    setNewHeaderVal('');
  };

  const handleRemoveHeader = (index: number) => {
    setHeaderRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleHeaderChange = (index: number, field: 'key' | 'value', val: string) => {
    setHeaderRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: val } : row));
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(rawBody);
      setRawBody(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err: any) {
      setJsonError('خطأ: النص ليس JSON صالح: ' + err.message);
    }
  };

  const handleForwardClick = () => {
    const finalHeaders: Record<string, string> = {};
    for (const row of headerRows) {
      if (row.key.trim()) {
        finalHeaders[row.key.trim()] = row.value;
      }
    }

    let finalBody: any = rawBody;
    if (rawBody && (rawBody.trim().startsWith('{') || rawBody.trim().startsWith('['))) {
      try {
        finalBody = JSON.parse(rawBody);
      } catch {
        finalBody = rawBody;
      }
    }

    onForward({
      ...request,
      url: currentUrl.trim(),
      method: currentMethod,
      headers: finalHeaders,
      body: finalBody,
    });
  };

  const renderHexView = () => {
    const textToDump = `${currentMethod} ${currentUrl}\n` +
      headerRows.map(r => `${r.key}: ${r.value}`).join('\n') +
      (rawBody ? `\n\n${rawBody}` : '');

    const lines: string[] = [];
    const encoder = new TextEncoder();
    const bytes = encoder.encode(textToDump);
    for (let i = 0; i < Math.min(bytes.length, 512); i += 16) {
      const chunk = bytes.slice(i, i + 16);
      const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const ascii = Array.from(chunk).map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
      lines.push(`${i.toString(16).padStart(4, '0')}:  ${hex.padEnd(48, ' ')}  |${ascii}|`);
    }
    return lines.join('\n');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Burp Suite Top Banner */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide font-mono text-white">
                  BURP SUITE PROXY
                </span>
                <span className="bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase animate-pulse">
                  ⚡ Intercept is ON
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                تم إيقاف الطلب مؤقتاً قبل إرساله. يمكنك تعديل الروابط والترويسات ومحتوى JSON.
              </p>
            </div>
          </div>

          {/* Action buttons: Forward, Drop */}
          <div className="flex items-center gap-2">
            <button
              onClick={onDrop}
              className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
              title="إسقاط الطلب وإلغاء الإرسال"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>إسقاط</span>
            </button>
            <button
              onClick={handleForwardClick}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
              title="إرسال الطلب بعد التعديل"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>تمرير</span>
            </button>
            <button
              onClick={onDisableIntercept}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-colors"
              title="تعطيل اعتراض الطلبات"
            >
              إلغاء الاعتراض
            </button>
          </div>
        </div>

        {/* Request Line (Method + URL) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <select
              value={currentMethod}
              onChange={(e) => setCurrentMethod(e.target.value)}
              className="bg-white border border-slate-300 font-mono font-bold text-xs text-indigo-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-2xs"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
              <option value="HEAD">HEAD</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>

            <div className="relative flex-1">
              <Globe className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
              <input
                type="text"
                value={currentUrl}
                onChange={(e) => setCurrentUrl(e.target.value)}
                placeholder="https://example.com/api"
                className="w-full bg-white border border-slate-300 font-mono text-xs text-slate-900 ps-9 pe-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-2xs"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Tab switcher: Headers vs Body vs Hex */}
        <div className="flex items-center px-4 pt-3 bg-white border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('headers')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'headers'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Headers ({headerRows.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('body')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'body'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON / Body Payload</span>
          </button>
          <button
            onClick={() => setActiveTab('hex')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'hex'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Hex View</span>
          </button>
        </div>

        {/* Main Tab Panels */}
        <div className="flex-1 overflow-y-auto p-4 bg-white space-y-4">
          {activeTab === 'headers' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs font-mono text-start">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-start w-1/3">Header Name</th>
                      <th className="py-2 px-3 text-start">Value</th>
                      <th className="py-2 px-3 w-10 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {headerRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.key}
                            onChange={(e) => handleHeaderChange(idx, 'key', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded-md text-slate-900 text-xs focus:bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.value}
                            onChange={(e) => handleHeaderChange(idx, 'value', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded-md text-slate-900 text-xs focus:bg-white"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleRemoveHeader(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="حذف الترويسة"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add New Header */}
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="text"
                  placeholder="Header Name (e.g. X-Custom-Header)"
                  value={newHeaderKey}
                  onChange={(e) => setNewHeaderKey(e.target.value)}
                  className="w-1/3 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-mono"
                />
                <input
                  type="text"
                  placeholder="Header Value"
                  value={newHeaderVal}
                  onChange={(e) => setNewHeaderVal(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddHeader}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'body' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  حمولة الطلب (Request Body / JSON / Payload - يدعم GET, POST والتعديل والتنفيذ):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFormatJson}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>تنسيق JSON تلقائياً</span>
                  </button>
                </div>
              </div>

              {jsonError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}

              <textarea
                value={rawBody}
                onChange={(e) => {
                  setRawBody(e.target.value);
                  setJsonError(null);
                }}
                placeholder="أدخل محتوى الطلب (JSON / Form Data / Raw Text)..."
                rows={10}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-mono text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                dir="ltr"
              />
            </div>
          )}

          {activeTab === 'hex' && (
            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-500 mb-1">
                Raw Packet Payload & Hex Inspection:
              </div>
              <pre 
                className="bg-slate-950 text-emerald-400 p-3 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed selection:bg-emerald-800"
                dir="ltr"
              >
                {renderHexView()}
              </pre>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Burp Suite Proxy جاهز لتمرير الطلب بعد التعديل الكامل.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDrop}
              className="px-3 py-1.5 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl font-semibold transition-colors"
            >
              إلغاء وإسقاط (Drop)
            </button>
            <button
              onClick={handleForwardClick}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>تمرير الطلب (Forward)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
