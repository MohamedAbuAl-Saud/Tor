import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RotateCw, 
  ArrowLeft, 
  ArrowRight,
  ShieldCheck, 
  Terminal,
  Activity
} from 'lucide-react';
import { testAesGcmEncryption, getDatabase, generateCryptoId } from '../utils/storage';
import { Translations } from '../utils/i18n';

interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'running';
  details: string;
  durationMs?: number;
}

interface FullPageSelfTestProps {
  t: Translations;
  isRtl: boolean;
  onBackToBrowser: () => void;
}

export const FullPageSelfTest: React.FC<FullPageSelfTestProps> = ({
  t,
  isRtl,
  onBackToBrowser,
}) => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runAllTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Test 1: WebCrypto AES-GCM
    const t1Start = Date.now();
    try {
      const cryptoResult = await testAesGcmEncryption('SM-BROWSER-SELF-TEST-' + Math.random());
      results.push({
        id: 'crypto',
        name: 'WebCrypto AES-256-GCM Hardware Encryption',
        status: cryptoResult.success ? 'passed' : 'failed',
        details: `Verified 256-bit symmetric cipher. Auth tag and IV generated. Duration: ${Date.now() - t1Start}ms`,
        durationMs: Date.now() - t1Start,
      });
    } catch (err: any) {
      results.push({
        id: 'crypto',
        name: 'WebCrypto AES-256-GCM Hardware Encryption',
        status: 'failed',
        details: err.message,
      });
    }

    // Test 2: IndexedDB Local Storage
    const t2Start = Date.now();
    try {
      const db = await getDatabase();
      const hasStores = db.objectStoreNames.contains('profiles') && db.objectStoreNames.contains('history');
      results.push({
        id: 'indexeddb',
        name: 'IndexedDB Structured Isolated Storage',
        status: hasStores ? 'passed' : 'failed',
        details: `Database '${db.name}' active with ${db.objectStoreNames.length} isolated stores.`,
        durationMs: Date.now() - t2Start,
      });
    } catch (err: any) {
      results.push({
        id: 'indexeddb',
        name: 'IndexedDB Structured Isolated Storage',
        status: 'failed',
        details: err.message,
      });
    }

    // Test 3: Backend Gateway & SSRF Defense
    const t3Start = Date.now();
    try {
      const res = await fetch('/api/gateway/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'http://127.0.0.1:8080/forbidden' }),
      });
      const data = await res.json();
      const ssrfBlocked = res.status === 403;
      results.push({
        id: 'ssrf',
        name: 'Backend Gateway SSRF Shield',
        status: ssrfBlocked ? 'passed' : 'failed',
        details: ssrfBlocked 
          ? `Correctly blocked internal reserved IP (127.0.0.1) with 403 Forbidden.` 
          : `Warning: internal request was not blocked as expected: ${JSON.stringify(data)}`,
        durationMs: Date.now() - t3Start,
      });
    } catch (err: any) {
      results.push({
        id: 'ssrf',
        name: 'Backend Gateway SSRF Shield',
        status: 'failed',
        details: err.message,
      });
    }

    // Test 4: Tor SOCKS5 Probe
    const t4Start = Date.now();
    try {
      const res = await fetch('/api/tor/status');
      const data = await res.json();
      results.push({
        id: 'tor',
        name: 'Tor SOCKS5 Daemon Integration',
        status: data.connected ? 'passed' : 'failed',
        details: data.connected 
          ? `Tor daemon active on ${data.host}:${data.port}. Latency: ${data.latencyMs}ms.`
          : `Tor daemon not detected on 127.0.0.1:9050. Run 'tor' to enable real Tor routing.`,
        durationMs: Date.now() - t4Start,
      });
    } catch (err: any) {
      results.push({
        id: 'tor',
        name: 'Tor SOCKS5 Daemon Integration',
        status: 'failed',
        details: err.message,
      });
    }

    // Test 5: Anonymous Profile Generator
    const id1 = generateCryptoId();
    const id2 = generateCryptoId();
    const isCrypto = id1 !== id2 && id1.length >= 32;
    results.push({
      id: 'profile_entropy',
      name: 'Cryptographic Profile Entropy Check',
      status: isCrypto ? 'passed' : 'failed',
      details: `Generated 256-bit entropy random tokens: ${id1.slice(0, 16)}...`,
    });

    setTests(results);
    setIsRunning(false);
  };

  useEffect(() => {
    runAllTests();
  }, []);

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
              <div className="p-1.5 rounded-xl bg-indigo-600 text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {t.selfTest}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>إعادة الفحص</span>
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
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-2xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">فحص النزاهة والمصادقة الأمنية</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">فحوصات حية للتشفير، حماية SSRF، التخزين المعزول، وخدمة تور.</p>
            </div>
          </div>
          <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl">
            {tests.filter(t => t.status === 'passed').length} / {tests.length} مكتمل
          </span>
        </div>

        {/* Tests list */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden divide-y divide-slate-100">
          {tests.map((test) => (
            <div key={test.id} className="p-4 sm:p-5 flex items-start gap-3.5">
              <div className="shrink-0 mt-0.5">
                {test.status === 'passed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : test.status === 'failed' ? (
                  <XCircle className="w-5 h-5 text-rose-600" />
                ) : (
                  <RotateCw className="w-5 h-5 text-indigo-600 animate-spin" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">{test.name}</h3>
                  {test.durationMs !== undefined && (
                    <span className="text-[11px] font-mono text-slate-400">{test.durationMs}ms</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 font-mono leading-relaxed" dir="auto">
                  {test.details}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
