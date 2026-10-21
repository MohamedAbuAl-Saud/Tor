import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Settings, 
  Globe, 
  Shield, 
  Camera, 
  Mic, 
  MapPin, 
  Cookie, 
  Code2, 
  RefreshCw, 
  Server, 
  Check, 
  AlertTriangle, 
  ExternalLink,
  Layers,
  HardDrive,
  Trash2,
  Lock,
  Eye,
  Sliders,
  BellOff,
  Radio,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';
import { ProfileSettings, SupportedLanguage, SearchEngine, TorStatusResponse } from '../types/browser';
import { SearchEngineLogos, SEARCH_ENGINES_LIST } from './SearchLogos';
import { saveProfile, resetProfileId, clearAllCookies, clearAllHistory } from '../utils/storage';
import { Translations } from '../utils/i18n';
import { ToggleSwitch } from './ToggleSwitch';

interface FullPageSettingsProps {
  profile: ProfileSettings;
  torStatus: TorStatusResponse | null;
  t: Translations;
  isRtl: boolean;
  onUpdateProfile: (updated: ProfileSettings) => void;
  onTestTorCircuit: () => void;
  onBackToBrowser: () => void;
}

const LANGUAGES: { code: SupportedLanguage; label: string; nativeName: string }[] = [
  { code: 'ar', label: 'Arabic', nativeName: 'العربية (RTL)' },
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'ru', label: 'Russian', nativeName: 'Русский' },
  { code: 'fr', label: 'French', nativeName: 'Français' },
  { code: 'de', label: 'German', nativeName: 'Deutsch' },
  { code: 'ja', label: 'Japanese', nativeName: '日本語' },
  { code: 'ko', label: 'Korean', nativeName: '한국어' },
  { code: 'zh', label: 'Simplified Chinese', nativeName: '简体中文' },
];

export const FullPageSettings: React.FC<FullPageSettingsProps> = ({
  profile,
  torStatus,
  t,
  isRtl,
  onUpdateProfile,
  onTestTorCircuit,
  onBackToBrowser,
}) => {
  const [activeSection, setActiveSection] = useState<'websites' | 'search' | 'tor' | 'privacy' | 'language'>('websites');
  const [cameraTestActive, setCameraTestActive] = useState(false);
  const [cameraTestMessage, setCameraTestMessage] = useState<string | null>(null);

  const updateSetting = async <K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]) => {
    const updated = { ...profile, [key]: value };
    await saveProfile(updated);
    onUpdateProfile(updated);
  };

  const handleRegenerateProfile = async () => {
    const newProfile = await resetProfileId();
    onUpdateProfile(newProfile);
  };

  const testCameraAccess = async () => {
    if (profile.cameraBlocked) {
      setCameraTestMessage('الكاميرا مقفلة ومحظورة تماماً بواسطة سياسة الخصوصية للمتصفح.');
      return;
    }
    try {
      setCameraTestActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraTestMessage('الكاميرا متاحة ومسموح بالوصول إليها حالياً.');
    } catch (err: any) {
      setCameraTestMessage('تم حظر الوصول إلى الكاميرا: ' + err.message);
    } finally {
      setCameraTestActive(false);
    }
  };

  const duckDef = SEARCH_ENGINES_LIST[0];
  const DuckLogo = SearchEngineLogos.duckduckgo;

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
                <Settings className="w-5 h-5" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {t.fullPageSettings}
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
        {/* Navigation Tabs (Full Page Sections) */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/80 rounded-2xl overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveSection('websites')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeSection === 'websites' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            إعدادات المواقع والعتاد
          </button>
          <button
            onClick={() => setActiveSection('search')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeSection === 'search' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            محرك البحث (DuckDuckGo)
          </button>
          <button
            onClick={() => setActiveSection('tor')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeSection === 'tor' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.torGateway}
          </button>
          <button
            onClick={() => setActiveSection('privacy')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeSection === 'privacy' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.privacyDashboard}
          </button>
          <button
            onClick={() => setActiveSection('language')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeSection === 'language' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.language}
          </button>
        </div>

        {/* Section 1: Comprehensive Website Settings */}
        {activeSection === 'websites' && (
          <div className="space-y-6">
            {/* JavaScript Always Active Banner */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl shrink-0 mt-0.5">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      تشغيل جافاسكريبت دائم وتلقائي (JavaScript Permanently Active)
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      الجافاسكريبت مفعلة دائماً وثابتة لضمان عرض كامل محتويات المواقع التفاعلية، محرك DuckDuckGo، ومقالات ويكيبيديا بأعلى سرعة وكفاءة.
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold shrink-0">
                  مفعلة دائماً
                </span>
              </div>
            </div>

            {/* Hardware & Sensor Permissions */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-rose-600" />
                <span>أذونات العتاد والحساسات (Hardware Privacy Sandbox)</span>
              </h2>
              <p className="text-xs text-slate-500">
                حماية خصوصية الكاميرا والميكروفون والموقع الجغرافي. مقفلة افتراضياً لمنع أي محاولة تجسس.
              </p>

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
                      <p className="text-[11px] text-slate-500 mt-0.5">حظر استعلام إحداثيات GPS من قبل المواقع لضمان سرية موقعك الجغرافي.</p>
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={profile.geoBlocked}
                    onChange={() => updateSetting('geoBlocked', !profile.geoBlocked)}
                    label="حظر الموقع الجغرافي"
                    isRtl={isRtl}
                  />
                </div>

                {/* Camera Test Live Verification */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={testCameraAccess}
                    disabled={cameraTestActive}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
                  >
                    {cameraTestActive ? 'جاري اختبار العتاد...' : 'اختبار حالة الكاميرا الحية'}
                  </button>
                  {cameraTestMessage && (
                    <span className="text-xs font-mono text-slate-600 bg-white px-3 py-1 rounded-xl border border-slate-200">
                      {cameraTestMessage}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tracking, Popups & Network Defenses */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>حماية التتبع والنوافذ المنبثقة (Tracking Defense)</span>
              </h2>

              <div className="space-y-3">
                {/* Popups Block */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 block">حظر النوافذ المنبثقة والإعلانات العشوائية</span>
                    <span className="text-[11px] text-slate-500">منع المواقع من فتح نوافذ جديدة غير مرغوبة تلقائياً.</span>
                  </div>
                  <ToggleSwitch
                    enabled={profile.popupsBlocked}
                    onChange={() => updateSetting('popupsBlocked', !profile.popupsBlocked)}
                    label="حظر النوافذ المنبثقة"
                    isRtl={isRtl}
                  />
                </div>

                {/* Third-Party Cookies Block */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 block">حظر كوكيز الطرف الثالث (Third-Party Cookies)</span>
                    <span className="text-[11px] text-slate-500">منع شبكات الإعلانات من تعقب تصفحك عبر المواقع المختلفة.</span>
                  </div>
                  <ToggleSwitch
                    enabled={profile.blockThirdPartyCookies}
                    onChange={() => updateSetting('blockThirdPartyCookies', !profile.blockThirdPartyCookies)}
                    label="حظر كوكيز الطرف الثالث"
                    isRtl={isRtl}
                  />
                </div>

                {/* Clear on exit */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 block">مسح البيانات فور إغلاق الجلسة</span>
                    <span className="text-[11px] text-slate-500">حذف الكوكيز والتخزين المؤقت عند إغلاق التبويبات.</span>
                  </div>
                  <ToggleSwitch
                    enabled={profile.clearOnExit}
                    onChange={() => updateSetting('clearOnExit', !profile.clearOnExit)}
                    label="مسح عند الإغلاق"
                    isRtl={isRtl}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Dedicated Search Engine (DuckDuckGo ONLY) */}
        {activeSection === 'search' && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl shrink-0">
                <DuckLogo className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  محرك البحث الرئيسي والوحيد: DuckDuckGo
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  تم ضبط المتصفح ليعتمد حصرياً على محرك البحث الخالي من التتبع DuckDuckGo. جميع عمليات البحث من شريط العناوين والصفحة الرئيسية تُوجّه بأمان إلى DuckDuckGo بدون أي سجلات أو تعقب أو تتبع لملف تعريفك.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">المحرك المعتمد:</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>DuckDuckGo (Active & Exclusive)</span>
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 truncate" dir="ltr">
                https://html.duckduckgo.com/html/?q=&#123;query&#125;
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Tor SOCKS5 & Gateway Configuration */}
        {activeSection === 'tor' && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-600" />
                <span>إعدادات بروكسي تور (Tor SOCKS5 Daemon)</span>
              </h2>
              <button
                onClick={onTestTorCircuit}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
              >
                {t.testTorCircuit}
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              تتصل البوابة الخلفية بخدمة تور عبر منفذ SOCKS5 المحلي لإجراء التوجيه المشفر وحل نطاقات البصلة (.onion).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 block text-[11px] font-bold mb-1">مضيف البروكسي (SOCKS Host)</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{profile.torSocksHost}</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 block text-[11px] font-bold mb-1">منفذ البروكسي (SOCKS Port)</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{profile.torSocksPort}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-800 block mb-1">حالة الاتصال المباشرة:</span>
              <p className="text-slate-600 font-mono text-[11px]">
                {torStatus?.connected
                  ? `خادم تور نشط ومتصل (${torStatus.host}:${torStatus.port}) · زمن الاستجابة: ${torStatus.latencyMs}ms`
                  : 'خادم تور غير متصل على 127.0.0.1:9050. يمكنك تشغيل الأمر `tor` لتفعيل مسار البصلة وتشفير التصفح.'}
              </p>
            </div>
          </div>
        )}

        {/* Section 4: Privacy & Profile Management */}
        {activeSection === 'privacy' && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-600" />
                  <span>{t.anonymousProfile}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">معرف الجلسة المشفر والمولّد محلياً</p>
              </div>

              <button
                onClick={handleRegenerateProfile}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.regenerateProfile}</span>
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 break-all select-all" dir="ltr">
              {profile.profileId}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={async () => {
                  if (confirm('مسح جميع ملفات تعريف الارتباط؟')) {
                    await clearAllCookies(profile.profileId);
                    alert('تم مسح الكوكيز بنجاح');
                  }
                }}
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح كل الكوكيز</span>
              </button>

              <button
                onClick={async () => {
                  if (confirm('مسح سجل التصفح والبحث بالكامل؟')) {
                    await clearAllHistory(profile.profileId);
                    alert('تم مسح السجل بنجاح');
                  }
                }}
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح سجل التصفح</span>
              </button>
            </div>
          </div>
        )}

        {/* Section 5: Language Selection */}
        {activeSection === 'language' && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              <span>{t.language}</span>
            </h2>
            <p className="text-xs text-slate-500">
              اختر لغة واجهة المتصفح، مع دعم كامل للاتجاه من اليمين إلى اليسار (RTL) باللغة العربية.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LANGUAGES.map((lang) => {
                const isSelected = profile.language === lang.code;

                return (
                  <button
                    key={lang.code}
                    onClick={() => updateSetting('language', lang.code)}
                    className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-200' 
                        : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{lang.nativeName}</span>
                      <span className="text-[11px] text-slate-400">{lang.label}</span>
                    </div>
                    {isSelected && (
                      <div className="p-1 rounded-full bg-indigo-600 text-white">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
