import React, { useState } from 'react';
import { 
  Sparkles, 
  FileText, 
  Languages, 
  HelpCircle, 
  X, 
  AlertTriangle, 
  CheckCircle2,
  Send,
  Loader2
} from 'lucide-react';
import { Tab, SupportedLanguage } from '../types/browser';
import { Translations } from '../utils/i18n';

interface AiAssistantProps {
  isOpen: boolean;
  tab: Tab;
  t: Translations;
  currentLanguage: SupportedLanguage;
  onClose: () => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  isOpen,
  tab,
  t,
  currentLanguage,
  onClose,
}) => {
  const [hasConsented, setHasConsented] = useState(false);
  const [action, setAction] = useState<'summarize' | 'explain' | 'translate'>('summarize');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Extract clean text from HTML content
  const getDocumentText = (): string => {
    if (!tab.content) return '';
    try {
      const doc = new DOMParser().parseFromString(tab.content, 'text/html');
      // Remove styles and scripts
      const scripts = doc.querySelectorAll('script, style');
      scripts.forEach(s => s.remove());
      return doc.body.textContent || '';
    } catch {
      return tab.content.replace(/<[^>]+>/g, ' ');
    }
  };

  const handleRunAnalysis = async (selectedAction: 'summarize' | 'explain' | 'translate') => {
    setAction(selectedAction);
    setIsLoading(true);
    setError(null);
    setResult(null);

    const text = getDocumentText();
    if (!text.trim()) {
      setError('The current page has no readable text content to analyze.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          text: text.slice(0, 10000),
          targetLanguage: currentLanguage,
          userConsent: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'AI analysis request failed');
      }

      setResult(data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-all">
      <div 
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">{t.aiAssistant}</h2>
              <p className="text-xs text-slate-500">Gemini 3.8 Flash Document Assistant</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Consent Screen or Assistant Actions */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!hasConsented ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed font-sans">
                    <strong className="block mb-1 text-amber-950 font-bold">Privacy Notice & Consent</strong>
                    {t.aiDisclaimer}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-600">
                <div className="font-semibold text-slate-800">What will be transmitted:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Sanitized page text (up to 10,000 characters)</li>
                  <li>No cookies, session tokens, or personal identifiers</li>
                  <li>Direct server-side API call to Google Gemini 3.8 Flash</li>
                </ul>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={() => {
                    setHasConsented(true);
                    handleRunAnalysis('summarize');
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-2xs"
                >
                  {t.aiSendConsent}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleRunAnalysis('summarize')}
                  disabled={isLoading}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                    action === 'summarize' && !error
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>{t.aiSummarize}</span>
                </button>

                <button
                  onClick={() => handleRunAnalysis('explain')}
                  disabled={isLoading}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                    action === 'explain' && !error
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>{t.aiExplain}</span>
                </button>

                <button
                  onClick={() => handleRunAnalysis('translate')}
                  disabled={isLoading}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                    action === 'translate' && !error
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Languages className="w-4 h-4" />
                  <span>{t.aiTranslate}</span>
                </button>
              </div>

              {/* Status and Results */}
              {isLoading && (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-800">Processing page content with Gemini 3.8 Flash...</p>
                  <p className="text-[11px] text-slate-400 mt-1">Analyzing sanitized document text</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1">
                  <strong className="block font-bold">Analysis Error</strong>
                  <p>{error}</p>
                </div>
              )}

              {result && !isLoading && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
                  {result}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Target Page: {tab.title?.slice(0, 30) || tab.url}</span>
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
