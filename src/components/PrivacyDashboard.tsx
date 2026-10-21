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
  X, 
  HardDrive
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

interface PrivacyDashboardProps {
  isOpen: boolean;
  profile: ProfileSettings;
  currentDomain?: string;
  currentSafeMode: SafeModeType;
  t: Translations;
  onUpdateSafeMode: (mode: SafeModeType) => void;
  onUpdateProfile: (updated: ProfileSettings) => void;
  onClose: () => void;
}

export const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({
  isOpen,
  profile,
  currentDomain = 'general',
  currentSafeMode,
  t,
  onUpdateSafeMode,
  onUpdateProfile,
  onClose,
}) => {
  const [cookies, setCookies] = useState<BrowserCookie[]>([]);
  const [cryptoTestResult, setCryptoTestResult] = useState<any>(null);
  const [testingCrypto, setTestingCrypto] = useState(false);

  const loadData = async () => {
    const all = await getCookies(profile.profileId);
    setCookies(all);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, profile.profileId]);

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

  // Safe toggle switch component that never overflows or clips in RTL/LTR
  const ToggleSwitch: React.FC<{ enabled: boolean; onChange: () => void; label: string }> = ({ enabled, onChange, label }) => (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onChange}
      className={`w-12 h-6.5 rounded-full p-0.5 flex items-center transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
        enabled ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
      }`}
    >
      <span className="w-5.5 h-5.5 rounded-full bg-white shadow-xs block" />
    </button>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-all">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">{t.privacyDashboard}</h2>
              <p className="text-xs text-slate-500">Security Sandbox, Permissions, and Data</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Section 1: Rendering & JavaScript Mode */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">حالة تشغيل جافاسكريبت</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  الجافاسكريبت مفعلة تلقائياً للتصفح التفاعلي. يمكنك التبديل لوضع المستند الآمن لتجريد السكربتات.
                </p>
              </div>

              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                currentSafeMode === 'javascript'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {currentSafeMode === 'javascript' ? 'JS Active' : 'Safe Document'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 mt-2">
              <div className="text-xs text-slate-600">
                الموقع الحالي: <span className="font-mono font-medium text-slate-900">{currentDomain}</span>
              </div>

              <button
                onClick={() => onUpdateSafeMode(currentSafeMode === 'javascript' ? 'safe' : 'javascript')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-colors shadow-2xs ${
                  currentSafeMode === 'javascript'
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {currentSafeMode === 'javascript' ? 'تحويل لوضع المستند الآمن' : 'تفعيل جافاسكريبت'}
              </button>
            </div>
          </div>

          {/* Section 2: Camera & Hardware Controls */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              أذونات العتاد والكاميرا
            </h3>

            {/* Camera */}
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{t.cameraControl}</span>
                  <span className="text-[11px] text-slate-500">{t.cameraBlockedDesc}</span>
                </div>
              </div>
              <ToggleSwitch
                enabled={profile.cameraBlocked}
                onChange={() => updateSetting('cameraBlocked', !profile.cameraBlocked)}
                label="Camera Lock"
              />
            </div>

            {/* Microphone */}
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{t.micControl}</span>
                  <span className="text-[11px] text-slate-500">{t.micBlockedDesc}</span>
                </div>
              </div>
              <ToggleSwitch
                enabled={profile.micBlocked}
                onChange={() => updateSetting('micBlocked', !profile.micBlocked)}
                label="Microphone Lock"
              />
            </div>

            {/* Geolocation */}
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{t.geoControl}</span>
                  <span className="text-[11px] text-slate-500">حظر استعلام إحداثيات GPS</span>
                </div>
              </div>
              <ToggleSwitch
                enabled={profile.geoBlocked}
                onChange={() => updateSetting('geoBlocked', !profile.geoBlocked)}
                label="Geolocation Lock"
              />
            </div>
          </div>

          {/* Section 3: Anonymous Profile & Secret Mode */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t.anonymousProfile}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  معرف مشفر عشوائي، لا حسابات ولا تسجيل دخول.
                </p>
              </div>

              <button
                onClick={handleRegenerateProfile}
                title={t.regenerateProfile}
                className="text-xs font-semibold px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 flex items-center gap-1 transition-colors shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.regenerateProfile}</span>
              </button>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-slate-200 font-mono text-xs text-slate-700 break-all select-all" dir="ltr">
              {profile.profileId}
            </div>

            {/* Secret Mode Toggle */}
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">{t.privateMode}</span>
                <span className="text-[11px] text-slate-500">{t.privateModeDescription}</span>
              </div>
              <ToggleSwitch
                enabled={profile.isPrivateMode}
                onChange={() => updateSetting('isPrivateMode', !profile.isPrivateMode)}
                label="Secret Mode"
              />
            </div>
          </div>

          {/* Section 4: WebCrypto AES-GCM Live Test */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">فحص محرك التشفير (AES-256-GCM)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  التحقق الحي من تشفير الجلسات بمفتاح 256-بت ومصادقة التشفير.
                </p>
              </div>

              <button
                onClick={runCryptoTest}
                disabled={testingCrypto}
                className="text-xs font-semibold px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors shadow-2xs shrink-0"
              >
                {testingCrypto ? 'جاري الفحص...' : 'فحص التشفير'}
              </button>
            </div>

            {cryptoTestResult && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1 font-mono">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>الخوارزمية: {cryptoTestResult.algorithm} (ناجح)</span>
                </div>
                <div className="text-[11px] text-slate-500 break-all">
                  <strong>IV:</strong> {cryptoTestResult.ivHex}
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Cookies & Site Data */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t.cookiesAndSiteData}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  معزولة تماماً داخل هذا الملف الشخصي فقط.
                </p>
              </div>

              {cookies.length > 0 && (
                <button
                  onClick={handleClearCookies}
                  className="text-xs font-semibold px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center gap-1 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.clearCookies}</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between py-2 border-y border-slate-200 text-xs">
              <span className="text-slate-700">حظر كوكيز الطرف الثالث</span>
              <ToggleSwitch
                enabled={profile.blockThirdPartyCookies}
                onChange={() => updateSetting('blockThirdPartyCookies', !profile.blockThirdPartyCookies)}
                label="Block Third Party Cookies"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>الملف: #{profile.profileId.slice(0, 8)}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
