import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Terminal, 
  Send, 
  Trash2, 
  Download, 
  RefreshCw, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  Sliders, 
  Layers, 
  Code2, 
  ChevronRight, 
  ChevronDown,
  Play,
  Pause,
  Shield,
  FileJson,
  FileSpreadsheet,
  Activity,
  Server
} from 'lucide-react';
import { NetworkLogEntry } from '../types/browser';
import { Translations } from '../utils/i18n';

interface FullPageInspectorProps {
  t: Translations;
  isRtl: boolean;
  onBackToBrowser: () => void;
}

export const FullPageInspector: React.FC<FullPageInspectorProps> = ({
  t,
  isRtl,
  onBackToBrowser,
}) => {
  const [logs, setLogs] = useState<NetworkLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<NetworkLogEntry | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [filterProtocol, setFilterProtocol] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'wireshark' | 'burp'>('wireshark');

  // Burp Suite Interceptor State
  const [interceptActive, setInterceptActive] = useState(false);
  const [tamperUrl, setTamperUrl] = useState('https://html.duckduckgo.com/html/?q=tor+security');
  const [tamperMethod, setTamperMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD'>('GET');
  const [tamperHeaders, setTamperHeaders] = useState('{\n  "Accept": "text/html,application/xhtml+xml",\n  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"\n}');
  const [tamperBody, setTamperBody] = useState('{\n  "query": "tor",\n  "safe": true\n}');
  const [tamperUseTor, setTamperUseTor] = useState(false);
  const [tamperResponse, setTamperResponse] = useState<any>(null);
  const [isTampering, setIsTampering] = useState(false);

  // Tree expansion state in packet dissection
  const [expandedNodes, setExpandedNodes] = useState<{ frame: boolean; ip: boolean; tcp: boolean; http: boolean; hex: boolean }>({
    frame: true,
    ip: true,
    tcp: true,
    http: true,
    hex: true,
  });

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/devtools/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (!selectedLog && data.logs?.length > 0) {
          setSelectedLog(data.logs[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load Wireshark logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleClearLogs = async () => {
    if (confirm('هل أنت متأكد من حذف جميع سجلات الاتصالات؟')) {
      await fetch('/api/devtools/clear', { method: 'POST' });
      setLogs([]);
      setSelectedLog(null);
    }
  };

  const handleSendTampered = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTampering(true);
    setTamperResponse(null);

    let parsedHeaders = {};
    try {
      parsedHeaders = JSON.parse(tamperHeaders);
    } catch {
      alert('خطأ في صيغة JSON للترويسات (Headers)');
      setIsTampering(false);
      return;
    }

    try {
      const res = await fetch('/api/devtools/tamper-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: tamperUrl,
          method: tamperMethod,
          headers: parsedHeaders,
          body: tamperBody,
          useTor: tamperUseTor,
        }),
      });

      const data = await res.json();
      setTamperResponse(data);
      await fetchLogs();
    } catch (err: any) {
      setTamperResponse({ error: err.message });
    } finally {
      setIsTampering(false);
    }
  };

  const handleFormatJsonBody = () => {
    try {
      const parsed = JSON.parse(tamperBody);
      setTamperBody(JSON.stringify(parsed, null, 2));
    } catch {
      alert('النص المدخل ليس بصيغة JSON صحيحة');
    }
  };

  // Export functions (تنزيل السجلات)
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sm-wireshark-capture-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = ['No', 'Time_ms', 'Source', 'Destination', 'Protocol', 'Status', 'Method', 'URL', 'Size_bytes'];
    const rows = logs.map(l => [
      l.frameNumber,
      l.timestamp,
      `"${l.sourceIp || '127.0.0.1'}:${l.sourcePort || 50000}"`,
      `"${l.destIp || 'remote'}:${l.destPort || (l.url.startsWith('https') ? 443 : 80)}"`,
      l.protocol,
      l.status,
      l.method,
      `"${l.url}"`,
      l.contentLength
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sm-wireshark-capture-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(l => {
    const matchesQuery = 
      l.url.toLowerCase().includes(filterQuery.toLowerCase()) ||
      l.destination.toLowerCase().includes(filterQuery.toLowerCase()) ||
      l.method.toLowerCase().includes(filterQuery.toLowerCase()) ||
      String(l.status).includes(filterQuery) ||
      String(l.destPort || '').includes(filterQuery);

    const matchesProtocol = filterProtocol === 'all' || l.protocol.toLowerCase() === filterProtocol.toLowerCase();
    return matchesQuery && matchesProtocol;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-white text-slate-900 min-h-screen pb-24 font-mono text-xs select-text">
      {/* Top Clean White Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToBrowser}
              className="p-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title={t.back}
            >
              {isRtl ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-slate-900 text-white">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm tracking-tight block">
                  Wireshark & Burp Suite Gateway Inspector
                </span>
                <span className="text-[10px] text-slate-500 font-sans">
                  تحليل الحزم المباشر، المنافذ (Ports)، وتعديل الطلبات قبل إرسالها
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher: Wireshark vs Burp Interceptor */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 font-sans font-semibold text-xs">
              <button
                onClick={() => setActiveTab('wireshark')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'wireshark' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>واير شارك الحزم ({logs.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('burp')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'burp' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-orange-600" />
                <span>بورب سويت (Burp Intercept)</span>
              </button>
            </div>

            {/* Back to Browser */}
            <button
              onClick={onBackToBrowser}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl font-sans transition-colors shadow-2xs"
            >
              {t.home}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* TAB 1: WIRESHARK PACKET STREAM */}
        {activeTab === 'wireshark' && (
          <div className="space-y-4">
            {/* Action Bar: Filters, Clear, and Download */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[180px]">
                  <Filter className="w-3.5 h-3.5 text-slate-400 absolute top-2.5 start-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="فلترة: IP، المنفذ (Port 443, 9050)، العنوان، الحالة..."
                    className="w-full bg-white border border-slate-300 rounded-xl py-1.5 ps-8 pe-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-2xs"
                  />
                </div>

                <select
                  value={filterProtocol}
                  onChange={(e) => setFilterProtocol(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none shadow-2xs"
                >
                  <option value="all">كل البروتوكولات (ALL)</option>
                  <option value="https">HTTPS (TLS 443)</option>
                  <option value="http">HTTP (TCP 80)</option>
                  <option value="socks5">SOCKS5 (Tor 9050)</option>
                  <option value="tor">TOR Circuit</option>
                  <option value="dns">DNS Queries</option>
                </select>

                <button
                  onClick={fetchLogs}
                  disabled={isLoading}
                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl transition-colors shadow-2xs"
                  title="تحديث السجلات"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Delete and Download Logs Controls ("وخيار حذف سجلات وتنزيلها") */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearLogs}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-sans font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="حذف جميع سجلات الاتصالات"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف السجلات</span>
                </button>

                <button
                  onClick={handleExportJson}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl font-sans font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="تنزيل السجلات بصيغة JSON"
                >
                  <FileJson className="w-3.5 h-3.5 text-indigo-600" />
                  <span>تنزيل JSON</span>
                </button>

                <button
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl font-sans font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="تنزيل السجلات بصيغة CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تنزيل CSV</span>
                </button>
              </div>
            </div>

            {/* Split View: Top Packets Table + Bottom Dissection / Hex View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Packet List (Wireshark Table) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-[520px]">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 text-[11px] font-bold text-slate-700 grid grid-cols-12 gap-1 items-center">
                  <span className="col-span-1">No.</span>
                  <span className="col-span-2">المصدر (Port)</span>
                  <span className="col-span-3">الوجهة (Port)</span>
                  <span className="col-span-2">البروتوكول</span>
                  <span className="col-span-1">الحالة</span>
                  <span className="col-span-3">معلومات الطلب (Info)</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                  {filteredLogs.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      لا توجد حزم ملتقطة تطابق البحث. قم بتصفح أي موقع للبدء بتسجيل حركة المرور.
                    </div>
                  ) : (
                    filteredLogs.map((p) => {
                      const isSelected = selectedLog?.id === p.id;
                      const sourcePort = p.sourcePort || 51200;
                      const destPort = p.destPort || (p.isTorRouted ? 9050 : (p.url.startsWith('https') ? 443 : 80));

                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedLog(p)}
                          className={`px-3 py-1.5 grid grid-cols-12 gap-1 items-center cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-indigo-100/80 text-indigo-950 font-bold border-s-4 border-indigo-600' 
                              : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <span className="col-span-1 font-mono text-slate-500">{p.frameNumber}</span>
                          <span className="col-span-2 font-mono truncate text-slate-600" title={`127.0.0.1:${sourcePort}`}>
                            :{sourcePort}
                          </span>
                          <span className="col-span-3 font-mono truncate" title={`${p.destination || p.destIp}:${destPort}`}>
                            {p.destination || p.destIp}
                          </span>
                          <span className="col-span-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.protocol.includes('TOR') || p.protocol.includes('SOCKS5') 
                                ? 'bg-purple-100 text-purple-800' 
                                : p.protocol === 'HTTPS' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {p.protocol}
                            </span>
                          </span>
                          <span className="col-span-1 font-bold">
                            <span className={p.status >= 400 ? 'text-rose-600' : 'text-emerald-700'}>
                              {p.status}
                            </span>
                          </span>
                          <span className="col-span-3 font-mono truncate text-slate-600" title={p.url}>
                            {p.method} {p.url}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Packet Details Dissection Pane */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-[520px]">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>تفاصيل الحزمة (Dissection & Hex Dump)</span>
                  {selectedLog && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Frame #{selectedLog.frameNumber} ({selectedLog.durationMs}ms)
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
                  {selectedLog ? (
                    <>
                      {/* Frame Layer */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                        <button
                          onClick={() => setExpandedNodes(prev => ({ ...prev, frame: !prev.frame }))}
                          className="w-full px-3 py-1.5 bg-slate-100 flex items-center justify-between font-bold text-slate-800 text-[11px]"
                        >
                          <span className="flex items-center gap-1">
                            {expandedNodes.frame ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            Frame {selectedLog.frameNumber}: {selectedLog.contentLength || 0} bytes on wire
                          </span>
                        </button>
                        {expandedNodes.frame && (
                          <div className="p-2.5 text-[11px] space-y-1 text-slate-600 font-mono">
                            <div>Arrival Time: {new Date(selectedLog.timestamp).toISOString()}</div>
                            <div>Frame Length: {selectedLog.contentLength || 0} bytes</div>
                            <div>Gateway Interface: SM-TOR-GATEWAY / loopback</div>
                          </div>
                        )}
                      </div>

                      {/* IP & Port Layer */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                        <button
                          onClick={() => setExpandedNodes(prev => ({ ...prev, ip: !prev.ip }))}
                          className="w-full px-3 py-1.5 bg-slate-100 flex items-center justify-between font-bold text-slate-800 text-[11px]"
                        >
                          <span className="flex items-center gap-1">
                            {expandedNodes.ip ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            Internet Protocol (IPv4): 127.0.0.1 &rarr; {selectedLog.destIp || selectedLog.destination}
                          </span>
                        </button>
                        {expandedNodes.ip && (
                          <div className="p-2.5 text-[11px] space-y-1 text-slate-600 font-mono">
                            <div>Source IP: {selectedLog.sourceIp || '127.0.0.1'}</div>
                            <div>Source Port: {selectedLog.sourcePort || 51200}</div>
                            <div>Destination IP: {selectedLog.destIp || selectedLog.destination}</div>
                            <div>Destination Port: {selectedLog.destPort || (selectedLog.isTorRouted ? 9050 : 443)}</div>
                            <div>Tor Anonymization Circuit: {selectedLog.isTorRouted ? 'ACTIVE (SOCKS5)' : 'Clearnet Direct'}</div>
                          </div>
                        )}
                      </div>

                      {/* Application / HTTP Layer */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                        <button
                          onClick={() => setExpandedNodes(prev => ({ ...prev, http: !prev.http }))}
                          className="w-full px-3 py-1.5 bg-slate-100 flex items-center justify-between font-bold text-slate-800 text-[11px]"
                        >
                          <span className="flex items-center gap-1">
                            {expandedNodes.http ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            Hypertext Transfer Protocol ({selectedLog.method} / {selectedLog.status})
                          </span>
                        </button>
                        {expandedNodes.http && (
                          <div className="p-2.5 text-[11px] space-y-1 text-slate-700 font-mono">
                            <div className="font-bold text-slate-900">{selectedLog.method} {selectedLog.url}</div>
                            <div>Response Status: {selectedLog.status} {selectedLog.statusText}</div>
                            <div>Content-Type: {selectedLog.contentType}</div>
                            {selectedLog.responseHeaders && (
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                <span className="font-bold text-slate-800 block mb-1">Response Headers:</span>
                                {Object.entries(selectedLog.responseHeaders).slice(0, 10).map(([k, v]) => (
                                  <div key={k} className="truncate text-slate-600">
                                    <span className="text-indigo-600">{k}</span>: {v}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Hex Dump */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                        <button
                          onClick={() => setExpandedNodes(prev => ({ ...prev, hex: !prev.hex }))}
                          className="w-full px-3 py-1.5 bg-slate-100 flex items-center justify-between font-bold text-slate-800 text-[11px]"
                        >
                          <span className="flex items-center gap-1">
                            {expandedNodes.hex ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            Payload Hex & ASCII Dissection
                          </span>
                        </button>
                        {expandedNodes.hex && (
                          <div className="p-2 bg-slate-900 text-emerald-400 font-mono text-[10px] overflow-x-auto whitespace-pre leading-relaxed rounded-b-xl select-all">
                            {selectedLog.hexDump || 'No raw payload captured'}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      حدد حزمة من الجدول لعرض التشريح الدقيق ومنافذ الاتصال
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BURP SUITE INTERCEPTOR ("تعديل على الطلبات وتوقفها قبل إرسالها وتعديل على JSON") */}
        {activeTab === 'burp' && (
          <div className="space-y-4">
            {/* Burp Header Strip */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-100 text-orange-700">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900 font-sans">
                    أداة اعتراض وتعديل الطلبات (Burp Suite Interceptor & Tamperer)
                  </h2>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    تعديل الرابط، الترويسات (Headers)، وحمولة JSON قبل الإرسال، مع خيار التوجيه عبر تور.
                  </p>
                </div>
              </div>

              {/* Intercept Status Indicator */}
              <div className="flex items-center gap-2 font-sans text-xs">
                <button
                  onClick={() => setInterceptActive(!interceptActive)}
                  className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                    interceptActive
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-200'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {interceptActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{interceptActive ? 'الاعتراض مفعّل (Intercept is ON)' : 'الاعتراض متوقف (Intercept is OFF)'}</span>
                </button>
              </div>
            </div>

            {/* Request Form */}
            <form onSubmit={handleSendTampered} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Method */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1 font-sans">طريقة الطلب (Method)</label>
                  <select
                    value={tamperMethod}
                    onChange={(e: any) => setTamperMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="HEAD">HEAD</option>
                  </select>
                </div>

                {/* Target URL */}
                <div className="sm:col-span-7">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1 font-sans">الرابط المستهدف (Target URL)</label>
                  <input
                    type="text"
                    value={tamperUrl}
                    onChange={(e) => setTamperUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    dir="ltr"
                  />
                </div>

                {/* Route via Tor */}
                <div className="sm:col-span-3 flex items-end">
                  <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-300 cursor-pointer w-full text-xs font-sans font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={tamperUseTor}
                      onChange={(e) => setTamperUseTor(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-300"
                    />
                    <span>توجيه عبر شبكة تور (SOCKS5 9050)</span>
                  </label>
                </div>
              </div>

              {/* Headers Editor (JSON) */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1 font-sans">
                  الترويسات المخصصة (Headers in JSON)
                </label>
                <textarea
                  value={tamperHeaders}
                  onChange={(e) => setTamperHeaders(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  dir="ltr"
                />
              </div>

              {/* Body Editor (JSON / Form Data) */}
              {tamperMethod !== 'GET' && tamperMethod !== 'HEAD' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600 font-sans">
                      محتوى الحمولة والطلب (Request Body / JSON)
                    </label>
                    <button
                      type="button"
                      onClick={handleFormatJsonBody}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-sans font-semibold"
                    >
                      تنسيق JSON تلقائياً &rarr;
                    </button>
                  </div>
                  <textarea
                    value={tamperBody}
                    onChange={(e) => setTamperBody(e.target.value)}
                    rows={5}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    dir="ltr"
                  />
                </div>
              )}

              {/* Action Buttons: Forward / Drop / Send */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 font-sans">
                <button
                  type="button"
                  onClick={() => setTamperResponse(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  إسقاط الطلب (Drop)
                </button>
                <button
                  type="submit"
                  disabled={isTampering}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTampering ? 'جاري الإرسال...' : 'إرسال وتمرير الطلب (Forward Request)'}</span>
                </button>
              </div>
            </form>

            {/* Tamper Response Output */}
            {tamperResponse && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-900 font-sans flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>نتيجة الاستجابة (HTTP Response)</span>
                  </h3>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="bg-slate-100 px-2 py-0.5 rounded font-bold">
                      Status: {tamperResponse.status} {tamperResponse.statusText}
                    </span>
                    <span className="text-slate-500">
                      Latency: {tamperResponse.durationMs}ms
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900 text-emerald-400 p-3 rounded-2xl text-[10px] font-mono max-h-64 overflow-y-auto whitespace-pre select-all">
                  {tamperResponse.body || JSON.stringify(tamperResponse, null, 2)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
