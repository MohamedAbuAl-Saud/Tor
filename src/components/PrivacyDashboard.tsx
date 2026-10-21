import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  Lock, 
  Cookie, 
  Trash2, 
  Key, 
  CheckCircle2, 
  RefreshCw, 
  AlertTriangle, 
  X, 
  Sliders,
  Database
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
  const [showJsWarning, setShowJsWarning] = useState(false);
  const [cookieSearch, setCookieSearch] = useState('');

  const loadData = async () => {
    const all = await getCookies(profile.profileId);
    setCookies(all);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, profile.profileId]);

  const handleToggleJsRequest = () => {
    if (currentSafeMode === 'safe') {
      // Opening JS mode requires explicit warning confirmation
      setShowJsWarning(true);
    } else {
      // Revert immediately to Safe Document Mode
      onUpdateSafeMode('safe');
    }
  };

  const confirmEnableJs = () => {
    setShowJsWarning(false);
    onUpdateSafeMode('javascript');
  };

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

  const togglePrivateMode = async () => {
    const updated = {
      ...profile,
      isPrivateMode: !profile.isPrivateMode,
    };
    await saveProfile(updated);
    onUpdateProfile(updated);
  };

  const toggleBlockThirdPartyCookies = async () => {
    const updated = {
      ...profile,
      blockThirdPartyCookies: !profile.blockThirdPartyCookies,
    };
    await saveProfile(updated);
    onUpdateProfile(updated);
  };

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
              <p className="text-xs text-slate-500">Security Sandbox, Profiles, and Cookies</p>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Section 1: Rendering & JavaScript Sandbox */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Website JavaScript Policy</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Safe Document Mode strips scripts & event handlers, rendering in an isolated sandbox.
                </p>
              </div>

              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                currentSafeMode === 'safe'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {currentSafeMode === 'safe' ? 'Safe (Default)' : 'JS Active'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
              <div className="text-xs text-slate-600">
                Current site: <span className="font-mono font-medium text-slate-900">{currentDomain}</span>
              </div>

              <button
                onClick={handleToggleJsRequest}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors shadow-2xs ${
                  currentSafeMode === 'safe'
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {currentSafeMode === 'safe' ? 'Enable JavaScript...' : 'Switch to Safe Document Mode'}
              </button>
            </div>
          </div>

          {/* Section 2: Anonymous Profile & Cryptographic Identity */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t.anonymousProfile}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generated via WebCrypto <span className="font-mono">crypto.getRandomValues</span>. No accounts or telemetry.
                </p>
              </div>

              <button
                onClick={handleRegenerateProfile}
                title={t.regenerateProfile}
                className="text-xs font-semibold px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 flex items-center gap-1 transition-colors shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Profile</span>
              </button>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-slate-200 font-mono text-xs text-slate-700 break-all select-all" dir="ltr">
              {profile.profileId}
            </div>

            {/* Secret / Private Mode Toggle */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">{t.privateMode}</span>
                <span className="text-[11px] text-slate-500">{t.privateModeDescription}</span>
              </div>
              <button
                onClick={togglePrivateMode}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  profile.isPrivateMode ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    profile.isPrivateMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 3: WebCrypto AES-256-GCM Real Test */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cryptographic Engine Audit</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live verification of client-side authenticated AES-256-GCM encryption with 96-bit IV.
                </p>
              </div>

              <button
                onClick={runCryptoTest}
                disabled={testingCrypto}
                className="text-xs font-semibold px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors shadow-2xs shrink-0"
              >
                {testingCrypto ? 'Verifying...' : 'Run AES Test'}
              </button>
            </div>

            {cryptoTestResult && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 font-mono">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Algorithm: {cryptoTestResult.algorithm} (Passed)</span>
                </div>
                <div className="text-[11px] text-slate-500 break-all">
                  <span className="font-semibold text-slate-700">IV (Nonce): </span>{cryptoTestResult.ivHex}
                </div>
                <div className="text-[11px] text-slate-500 break-all">
                  <span className="font-semibold text-slate-700">Ciphertext: </span>{cryptoTestResult.cipherHex?.slice(0, 32)}...
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Cookies & Site Data */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t.cookiesAndSiteData}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Isolated to this anonymous profile. Not shared across profiles or gateways.
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
              <span className="text-slate-700">Block Third-Party Cookies</span>
              <button
                onClick={toggleBlockThirdPartyCookies}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  profile.blockThirdPartyCookies ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    profile.blockThirdPartyCookies ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="mt-3">
              {cookies.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">
                  No stored cookies in this anonymous session.
                </p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {cookies.map((c) => (
                    <div key={c.id} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900">{c.domain}</span>
                        <div className="text-[11px] text-slate-400 font-mono truncate">{c.name}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteDomainCookie(c.domain)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Honest Disclosure Callout */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-1">
            <span className="font-bold block flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Honest Security & Trust Disclosure
            </span>
            <p className="text-amber-800 leading-relaxed font-sans">
              {t.securityNotice}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Profile: #{profile.profileId.slice(0, 8)}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Explicit JS Warning Modal */}
      {showJsWarning && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mb-2">
              Enable Website JavaScript?
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed font-sans">
              {t.enableJsWarning}
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowJsWarning(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmEnableJs}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors shadow-2xs"
              >
                {t.enableJsConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
