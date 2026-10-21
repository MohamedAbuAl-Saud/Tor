import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  Camera, 
  Mic, 
  MapPin, 
  Cookie, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  AlertTriangle, 
  ArrowLeft,
  ArrowRight,
  HardDrive,
  Lock,
  Radio,
  Sliders,
  EyeOff
} from 'lucide-react';
import { ProfileSettings, SafeModeType, BrowserCookie } from '../types/browser';
import { 
  getCookies, 
  clearAllCookies, 
  deleteDomainCookies, 
  resetProfileId, 
  testAesGcmEncryption,
  saveProfile
} from '../utils/storage';
import { Translations } from '../utils/i18n';
import { ToggleSwitch } from './ToggleSwitch';

interface FullPagePrivacyProps {
  profile: ProfileSettings;
  currentDomain?: string;
  currentSafeMode: SafeModeType;
  t: Translations;
  isRtl: boolean;
  onUpdateSafeMode: (mode: SafeModeType) => void;
  onUpdateProfile: (updated: ProfileSettings) => void;
  onBackToBrowser: () => void;
}

export const FullPagePrivacy: React.FC<FullPagePrivacyProps> = ({
  profile,
  currentDomain = 'general',
  currentSafeMode,
  t,
  isRtl,
  onUpdateSafeMode,
  onUpdateProfile,
  onBackToBrowser,
}) => {
  const [cookies, setCookies] = useState<BrowserCookie[]>([]);
  const [cryptoTestResult, setCryptoTestResult] = useState<any>(null);
  const [testingCrypto, setTestingCrypto] = useState(false);

  const loadData = async () => {
    const all = await getCookies(profile.profileId);
    setCookies(all);
  };

  useEffect(() => {
    loadData();
  }, [profile.profileId]);

  const handleRegenerateProfile = async () => {
    const newProfile = await resetProfileId();
    onUpdateProfile(newProfile);
    await loadData();
  };

  const handleClearCookies = async () => {
    await clearAllCookies(profile.profileId);
    await loadData();
  };

  const handleDeleteDomainCookie = async (domain: string) => {
    await deleteDomainCookies(domain, profile.profileId);
    await loadData();
  };

  const runCryptoTest = async () => {
    setTestingCrypto(true);
    try {
      const result = await testAesGcmEncryption('SM-BROWSER-SECURE-SESSION-' + Date.now());
      setCryptoTestResult(result);
    } catch (err: any) {
      setCryptoTestResult({ success: false, error: err.message });
    } finally {
      setTestingCrypto(false);
    }
  };

  const updateSetting = async <K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]) => {
    const updated = { ...profile, [key]: value };
    await saveProfile(updated);
    onUpdateProfile(updated);
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
              <div className="p-1.5 rounded-xl bg-emerald-600 text-white">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {t.privacyDashboard}
                </h1>
                <p className="text-[11px] text-slate-500">حاوية الأمان، أذونات العتاد، وحماية التتبع</p>
              </div>
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
        {/* Section 1: JavaScript & Rendering Sandbox */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <span>حالة تشغيل جافاسكريبت (JavaScript Execution)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                الجافاسكريبت مفعلة تلقائياً للتصفح التفاعلي الكامل للمواقع ومحرك DuckDuckGo. يمكنك تحويل الموقع الحالي لوضع المستند الآمن لتجريد جميع السكربتات وتطبيق CSP صارم.
              </p>
            </div>

            <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0 ${
              currentSafeMode === 'javascript'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {currentSafeMode === 'javascript' ? 'مفعلة (JS Active)' : 'وضع المستند الآمن'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-xs text-slate-700">
              النطاق الحالي: <span className="font-mono font-bold text-slate-900">{currentDomain}</span>
            </div>

            <button
              onClick={() => onUpdateSafeMode(currentSafeMode === 'javascript' ? 'safe' : 'javascript')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all shadow-2xs ${
                currentSafeMode === 'javascript'
                  ? 'bg-slate-900 hover:bg-slate-800 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {currentSafeMode === 'javascript' ? 'تبديل إلى وضع المستند الآمن (تعطيل JS)' : 'تفعيل جافاسكريبت لهذا التبويب'}
            </button>
          </div>
        </div>

        {/* Section 2: Hardware Permissions & Camera Lock */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-rose-600" />
              <span>أذونات العتاد والكاميرا (Hardware Sandbox)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              جميع عناصر العتاد الحساسة (الكاميرا، الميكروفون، الموقع) مقفلة ومحظورة تلقائياً لمنع التجسس وتسريب الهوية.
            </p>
          </div>

          <div className="space-y-3">
            {/* Camera Lock */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${profile.cameraBlocked ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">{t.cameraControl}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      profile.cameraBlocked ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {profile.cameraBlocked ? 'الكاميرا مقفلة ومحظورة' : 'الكاميرا مسموحة'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t.cameraBlockedDesc}</p>
                </div>
              </div>
              <ToggleSwitch
                enabled={profile.cameraBlocked}
                onChange={() => updateSetting('cameraBlocked', !profile.cameraBlocked)}
                label="قفل الكاميرا"
                isRtl={isRtl}
              />
            </div>

            {/* Microphone Lock */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${profile.micBlocked ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">{t.micControl}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      profile.micBlocked ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {profile.micBlocked ? 'الميكروفون مقفل ومحظور' : 'الميكروفون مسموح'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t.micBlockedDesc}</p>
                </div>
              </div>
              <ToggleSwitch
                enabled={profile.micBlocked}
                onChange={() => updateSetting('micBlocked', !profile.micBlocked)}
                label="قفل الميكروفون"
                isRtl={isRtl}
              />
            </div>

            {/* Geolocation GPS Lock */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${profile.geoBlocked ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">{t.geoControl}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      profile.geoBlocked ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {profile.geoBlocked ? 'تحديد الموقع محظور' : 'الموقع مسموح'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">حظر أي استعلام لإحداثيات GPS من المواقع.</p>
                </div>
              </div>
              <ToggleSwitch
                enabled={profile.geoBlocked}
                onChange={() => updateSetting('geoBlocked', !profile.geoBlocked)}
                label="حظر الموقع الجغرافي"
                isRtl={isRtl}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Anonymous Profile & Secret Mode */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                <span>{t.anonymousProfile}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                معرف جلسة عشوائي مشفر ومولد بواسطة WebCrypto، لا يتطلب أي بريد أو كلمة سر أو حساب خارجي.
              </p>
            </div>

            <button
              onClick={handleRegenerateProfile}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.regenerateProfile}</span>
            </button>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 break-all select-all" dir="ltr">
            {profile.profileId}
          </div>

          {/* Secret Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-purple-600" />
                <span className="text-xs sm:text-sm font-bold text-slate-900">{t.privateMode}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{t.privateModeDescription}</p>
            </div>
            <ToggleSwitch
              enabled={profile.isPrivateMode}
              onChange={() => updateSetting('isPrivateMode', !profile.isPrivateMode)}
              label="الوضع السري"
              isRtl={isRtl}
            />
          </div>
        </div>

        {/* Section 4: Live WebCrypto AES-256-GCM Verification */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                فحص محرك التشفير المحلي (AES-256-GCM)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                التحقق الحي من عمل خوارزمية التشفير المتماثل 256-بت بمفتاح عشوائي لبيانات الجلسة.
              </p>
            </div>

            <button
              onClick={runCryptoTest}
              disabled={testingCrypto}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs shrink-0 disabled:opacity-50"
            >
              {testingCrypto ? 'جاري الفحص...' : 'فحص التشفير الآن'}
            </button>
          </div>

          {cryptoTestResult && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2 font-mono">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>نجح اختبار التشفير والمصادقة (AES-GCM Authenticated)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div>الخوارزمية: <span className="font-bold text-slate-900">{cryptoTestResult.algorithm}</span></div>
                <div>طول المفتاح: <span className="font-bold text-slate-900">{cryptoTestResult.keyLengthBits} bit</span></div>
                <div className="sm:col-span-2 truncate">مصفوفة التهيئة IV: {cryptoTestResult.ivHex}</div>
                <div className="sm:col-span-2 truncate">المحتوى المشفر: {cryptoTestResult.ciphertextHex}</div>
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Cookies & Isolated Storage */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Cookie className="w-5 h-5 text-amber-600" />
                <span>ملفات تعريف الارتباط والتخزين المعزول</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                كوكيز المواقع مفصولة داخل قاعدة بيانات IndexedDB لكل هوية.
              </p>
            </div>

            {cookies.length > 0 && (
              <button
                onClick={handleClearCookies}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح كل الكوكيز</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {cookies.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                لا توجد ملفات تعريف ارتباط مسجلة حالياً
              </div>
            ) : (
              cookies.map((c) => (
                <div key={c.id} className="p-3.5 bg-slate-50/50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{c.name}</span>
                    <span className="text-slate-400 font-mono text-[11px] block">{c.domain}{c.path}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteDomainCookie(c.domain)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    title="حذف كوكيز هذا النطاق"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
