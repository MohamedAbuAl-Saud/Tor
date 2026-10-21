import React, { useState, useEffect, useCallback } from 'react';
import { HeaderBar } from './components/HeaderBar';
import { BottomBar } from './components/BottomBar';
import { BrowserView } from './components/BrowserView';
import { TabSwitcher } from './components/TabSwitcher';
import { FullPageBookmarks } from './components/FullPageBookmarks';
import { FullPageHistory } from './components/FullPageHistory';
import { FullPageDownloads } from './components/FullPageDownloads';
import { FullPagePrivacy } from './components/FullPagePrivacy';
import { FullPageSettings } from './components/FullPageSettings';
import { FullPageInspector } from './components/FullPageInspector';
import { FullPageSelfTest } from './components/FullPageSelfTest';
import { QuickMenu } from './components/QuickMenu';
import { BurpInterceptModal, InterceptedRequest } from './components/BurpInterceptModal';
import { Tab, ProfileSettings, TorStatusResponse, SafeModeType, FullPageView, SearchEngine } from './types/browser';
import { translations } from './utils/i18n';
import { SEARCH_ENGINES_LIST } from './components/SearchLogos';
import { 
  getActiveProfile, 
  saveProfile, 
  getBookmarks, 
  addBookmark, 
  removeBookmark, 
  addHistoryEntry, 
  addSearchEntry, 
  saveDownload, 
  generateCryptoId 
} from './utils/storage';

export default function App() {
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [torStatus, setTorStatus] = useState<TorStatusResponse | null>(null);
  const [testingCircuit, setTestingCircuit] = useState(false);

  // Burp Suite Request Interceptor state ("تعديل ع طلبات توقفها قبل ارسلها وتعديل ع جاسون وكل شئ زي بورب سويت")
  const [interceptActive, setInterceptActive] = useState<boolean>(false);
  const [interceptedReq, setInterceptedReq] = useState<InterceptedRequest | null>(null);

  // Full page view router ('browser' is normal web browsing; all major sections are full pages per user request)
  const [fullPageView, setFullPageView] = useState<FullPageView>('browser');

  // Tabs - JavaScript enabled by default
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'tab-initial',
      url: 'sm://home',
      displayUrl: 'sm://home',
      title: 'SM BROWSER TOR',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      historyStack: ['sm://home'],
      historyIndex: 0,
      safeMode: 'javascript', // JavaScript active by default per request
      isOnion: false,
      isTorRouted: false,
      timestamp: Date.now(),
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-initial');

  // Bookmarks cache
  const [bookmarkedUrls, setBookmarkedUrls] = useState<Set<string>>(new Set());

  // Tab switcher drawer and quick menu
  const [showTabs, setShowTabs] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  // Initialize
  useEffect(() => {
    async function init() {
      const activeProfile = await getActiveProfile();
      // Ensure search engine is strictly duckduckgo per instruction
      if (activeProfile.searchEngine !== 'duckduckgo') {
        activeProfile.searchEngine = 'duckduckgo';
        await saveProfile(activeProfile);
      }
      setProfile(activeProfile);

      const bookmarks = await getBookmarks();
      setBookmarkedUrls(new Set(bookmarks.map(b => b.url)));

      checkTorStatus();
    }
    init();
  }, []);

  const checkTorStatus = async () => {
    try {
      const res = await fetch('/api/tor/status');
      if (res.ok) {
        const data = await res.json();
        setTorStatus(data);
      }
    } catch {
      setTorStatus({
        configured: true,
        connected: false,
        host: '127.0.0.1',
        port: 9050,
        details: 'Failed to communicate with Tor backend API',
        isDaemonAvailable: false,
        onionSupported: false,
      });
    }
  };

  const handleTestTorCircuit = async () => {
    setTestingCircuit(true);
    try {
      const res = await fetch('/api/tor/test-circuit', { method: 'POST' });
      const data = await res.json();
      await checkTorStatus();
      if (!res.ok) {
        alert(data.troubleshooting || data.error || 'Tor test reported circuit unavailable.');
      } else {
        alert(data.message || 'Tor circuit active!');
      }
    } catch (err: any) {
      alert('Tor circuit test error: ' + err.message);
    } finally {
      setTestingCircuit(false);
    }
  };

  const currentLang = profile?.language || 'ar';
  const t = translations[currentLang] || translations.ar;
  const isRtl = currentLang === 'ar';

  useEffect(() => {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    if (isRtl) {
      document.body.classList.add('font-arabic');
    } else {
      document.body.classList.remove('font-arabic');
    }
  }, [currentLang, isRtl]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateActiveTab = useCallback((updater: Partial<Tab>) => {
    setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, ...updater } : tab));
  }, [activeTabId]);

  // Main Navigate Function (Supports Burp Suite Proxy Interception)
  const handleNavigate = useCallback(async (
    targetUrl: string, 
    postBody?: any, 
    isForwarded?: boolean,
    customHeaders?: Record<string, string>,
    customMethod?: string
  ) => {
    if (!targetUrl || !targetUrl.trim()) return;
    let url = targetUrl.trim();

    // Check custom internal schemes (Rendered as full pages)
    if (url === 'sm://settings') {
      setFullPageView('settings');
      return;
    }
    if (url === 'sm://inspector') {
      setFullPageView('inspector');
      return;
    }
    if (url === 'sm://history') {
      setFullPageView('history');
      return;
    }
    if (url === 'sm://bookmarks') {
      setFullPageView('bookmarks');
      return;
    }
    if (url === 'sm://downloads') {
      setFullPageView('downloads');
      return;
    }
    if (url === 'sm://privacy') {
      setFullPageView('privacy');
      return;
    }
    if (url === 'sm://selftest') {
      setFullPageView('selftest');
      return;
    }

    if (fullPageView !== 'browser') {
      setFullPageView('browser');
    }

    if (url === 'sm://home' || url === 'about:blank') {
      updateActiveTab({
        url: 'sm://home',
        displayUrl: 'sm://home',
        title: 'SM BROWSER TOR',
        content: undefined,
        error: undefined,
        isLoading: false,
        isOnion: false,
      });
      return;
    }

    // Unpack DuckDuckGo or tracking redirect parameters if present
    try {
      const parsedCheck = new URL(url);
      if (parsedCheck.searchParams.has('uddg')) {
        const decoded = decodeURIComponent(parsedCheck.searchParams.get('uddg')!);
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          url = decoded;
        }
      }
    } catch {}

    // URL / Search Scheme Formatting
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        // Query DuckDuckGo as exclusive search engine
        const queryTerm = url;
        url = `https://duckduckgo.com/html/?q=${encodeURIComponent(queryTerm)}`;

        if (profile && profile.recordSearchHistory && !profile.isPrivateMode) {
          addSearchEntry(targetUrl.trim(), 'duckduckgo', profile.profileId);
        }
      }
    }

    // Normalize any legacy html.duckduckgo.com or lite.duckduckgo.com to duckduckgo.com/html/
    if (url.includes('html.duckduckgo.com')) {
      url = url.replace('html.duckduckgo.com', 'duckduckgo.com');
    }
    if (url.includes('lite.duckduckgo.com')) {
      url = url.replace('lite.duckduckgo.com', 'duckduckgo.com');
    }

    // BURP SUITE INTERCEPT CHECK:
    // If intercept mode is enabled and user hasn't forwarded yet, pause the request!
    if (interceptActive && !isForwarded) {
      setInterceptedReq({
        id: generateCryptoId(),
        url,
        method: customMethod || (postBody ? 'POST' : 'GET'),
        headers: customHeaders || {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        },
        body: postBody,
        timestamp: Date.now(),
      });
      return;
    }

    const isOnion = url.toLowerCase().includes('.onion');

    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      const newStack = tab.historyStack.slice(0, tab.historyIndex + 1);
      newStack.push(url);
      return {
        ...tab,
        url,
        displayUrl: url,
        isLoading: true,
        error: undefined,
        isOnion,
        historyStack: newStack,
        historyIndex: newStack.length - 1,
        canGoBack: newStack.length > 1,
        canGoForward: false,
      };
    }));

    if (profile && profile.recordHistory && !profile.isPrivateMode) {
      addHistoryEntry({
        url,
        title: url,
        profileId: profile.profileId,
        isPrivate: false,
      });
    }

    try {
      const res = await fetch('/api/gateway/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          safeMode: activeTab.safeMode === 'safe',
          profileId: profile?.profileId || 'anonymous',
          method: customMethod || (postBody ? 'POST' : 'GET'),
          body: postBody,
          headers: customHeaders,
        }),
      });

      const data = await res.json();

      // Download handling
      if (data.isDownload && data.dataBase64) {
        const byteCharacters = atob(data.dataBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const fileBlob = new Blob([byteArray], { type: data.mimeType || 'application/octet-stream' });

        await saveDownload(data.filename, url, data.mimeType, fileBlob);

        updateActiveTab({
          isLoading: false,
          error: undefined,
        });

        setFullPageView('downloads');
        return;
      }

      if (!res.ok) {
        updateActiveTab({
          isLoading: false,
          error: data.reason || data.message || data.error || `HTTP ${res.status} Error`,
          statusCode: res.status,
        });
        return;
      }

      // Compute solid favicon
      let computedFavicon = data.favicon;
      if (!computedFavicon) {
        if (url.includes('duckduckgo.com')) {
          computedFavicon = 'https://duckduckgo.com/favicon.ico';
        } else {
          try {
            const h = new URL(url).hostname;
            computedFavicon = `https://icons.duckduckgo.com/ip3/${h}.ico`;
          } catch {}
        }
      }

      updateActiveTab({
        url: data.url || url,
        displayUrl: data.url || url,
        title: data.title || url,
        favicon: computedFavicon,
        content: data.content,
        contentType: data.contentType,
        statusCode: data.status,
        isTorRouted: data.isTorRouted,
        isLoading: false,
        error: undefined,
      });
    } catch (err: any) {
      updateActiveTab({
        isLoading: false,
        error: err.message || 'Failed to connect to gateway',
      });
    }
  }, [activeTabId, activeTab.safeMode, fullPageView, interceptActive, profile, updateActiveTab]);

  // Handle postMessages from Iframe (link clicks & form submissions)
  useEffect(() => {
    const handleIframeMessage = (e: MessageEvent) => {
      if (e.data) {
        if (e.data.type === 'SM_BROWSER_NAVIGATE' && e.data.url) {
          handleNavigate(e.data.url);
        } else if (e.data.type === 'SM_BROWSER_FORM_POST' && e.data.url) {
          handleNavigate(e.data.url, e.data.body);
        }
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [handleNavigate]);

  // Back and Forward controls
  const handleGoBack = useCallback(() => {
    if (fullPageView !== 'browser') {
      setFullPageView('browser');
      return;
    }
    if (!activeTab.canGoBack || activeTab.historyIndex <= 0) return;
    const prevIndex = activeTab.historyIndex - 1;
    const prevUrl = activeTab.historyStack[prevIndex];
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      return {
        ...tab,
        historyIndex: prevIndex,
        canGoBack: prevIndex > 0,
        canGoForward: true,
      };
    }));
    handleNavigate(prevUrl);
  }, [activeTab, activeTabId, fullPageView, handleNavigate]);

  const handleGoForward = useCallback(() => {
    if (!activeTab.canGoForward || activeTab.historyIndex >= activeTab.historyStack.length - 1) return;
    const nextIndex = activeTab.historyIndex + 1;
    const nextUrl = activeTab.historyStack[nextIndex];
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      return {
        ...tab,
        historyIndex: nextIndex,
        canGoBack: true,
        canGoForward: nextIndex < tab.historyStack.length - 1,
      };
    }));
    handleNavigate(nextUrl);
  }, [activeTab, activeTabId, handleNavigate]);

  const handleReload = () => {
    if (activeTab.url && activeTab.url !== 'sm://home') {
      handleNavigate(activeTab.url);
    }
  };

  const handleStop = () => {
    updateActiveTab({ isLoading: false });
  };

  // Tab management
  const handleNewTab = () => {
    const newId = 'tab-' + generateCryptoId().slice(0, 8);
    const newTab: Tab = {
      id: newId,
      url: 'sm://home',
      displayUrl: 'sm://home',
      title: 'SM BROWSER TOR',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      historyStack: ['sm://home'],
      historyIndex: 0,
      safeMode: profile?.defaultSafeMode || 'javascript',
      isOnion: false,
      isTorRouted: false,
      timestamp: Date.now(),
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    setFullPageView('browser');
  };

  const handleCloseTab = (id: string) => {
    if (tabs.length === 1) {
      setTabs([{
        id: 'tab-' + generateCryptoId().slice(0, 8),
        url: 'sm://home',
        displayUrl: 'sm://home',
        title: 'SM BROWSER TOR',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        historyStack: ['sm://home'],
        historyIndex: 0,
        safeMode: 'javascript',
        isOnion: false,
        isTorRouted: false,
        timestamp: Date.now(),
      }]);
      return;
    }
    const remaining = tabs.filter(t => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  const handleCloseAllTabs = () => {
    const singleTab: Tab = {
      id: 'tab-' + generateCryptoId().slice(0, 8),
      url: 'sm://home',
      displayUrl: 'sm://home',
      title: 'SM BROWSER TOR',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      historyStack: ['sm://home'],
      historyIndex: 0,
      safeMode: 'javascript',
      isOnion: false,
      isTorRouted: false,
      timestamp: Date.now(),
    };
    setTabs([singleTab]);
    setActiveTabId(singleTab.id);
  };

  // Bookmark Toggle
  const isCurrentBookmarked = bookmarkedUrls.has(activeTab.url);

  const handleToggleBookmark = async () => {
    if (!activeTab.url || activeTab.url === 'sm://home') return;

    if (isCurrentBookmarked) {
      const all = await getBookmarks();
      const target = all.find(b => b.url === activeTab.url);
      if (target) {
        await removeBookmark(target.id);
        setBookmarkedUrls(prev => {
          const next = new Set(prev);
          next.delete(activeTab.url);
          return next;
        });
      }
    } else {
      await addBookmark({
        url: activeTab.url,
        title: activeTab.title || activeTab.url,
      });
      setBookmarkedUrls(prev => new Set(prev).add(activeTab.url));
    }
  };

  // Toggle Tab Safe Mode vs JS Mode
  const handleToggleTabSafeMode = () => {
    const newMode: SafeModeType = activeTab.safeMode === 'javascript' ? 'safe' : 'javascript';
    updateActiveTab({ safeMode: newMode });
    if (activeTab.url && activeTab.url !== 'sm://home') {
      setTimeout(() => handleNavigate(activeTab.url), 50);
    }
  };

  // Change Search Engine (DuckDuckGo exclusive)
  const handleSelectSearchEngine = async (engine: SearchEngine) => {
    if (!profile) return;
    const updated = { ...profile, searchEngine: engine };
    await saveProfile(updated);
    setProfile(updated);
  };

  const handleToggleCameraBlock = async () => {
    if (!profile) return;
    const updated = { ...profile, cameraBlocked: !profile.cameraBlocked };
    await saveProfile(updated);
    setProfile(updated);
  };

  const currentDomain = (() => {
    try {
      if (activeTab.url && activeTab.url.startsWith('http')) {
        return new URL(activeTab.url).hostname;
      }
    } catch {}
    return 'general';
  })();

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 ${isRtl ? 'dir-rtl' : 'dir-ltr'}`}>
      {/* Top Header Bar */}
      <HeaderBar
        activeTab={activeTab}
        tabCount={tabs.length}
        profile={profile}
        t={t}
        isRtl={isRtl}
        isBookmarked={isCurrentBookmarked}
        interceptActive={interceptActive}
        onToggleIntercept={() => setInterceptActive(prev => !prev)}
        onNavigate={handleNavigate}
        onReload={handleReload}
        onStop={handleStop}
        onToggleBookmark={handleToggleBookmark}
        onOpenTabs={() => setShowTabs(true)}
        onOpenMenu={() => setShowQuickMenu(true)}
        onToggleSafeMode={handleToggleTabSafeMode}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onOpenSettings={() => setFullPageView('settings')}
      />

      {/* Main Viewport Router (Full pages for all major browser sections) */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {fullPageView === 'settings' ? (
          <FullPageSettings
            profile={profile}
            torStatus={torStatus}
            t={t}
            isRtl={isRtl}
            onUpdateProfile={setProfile}
            onTestTorCircuit={handleTestTorCircuit}
            onBackToBrowser={() => setFullPageView('browser')}
          />
        ) : fullPageView === 'inspector' ? (
          <FullPageInspector
            t={t}
            isRtl={isRtl}
            onBackToBrowser={() => setFullPageView('browser')}
          />
        ) : fullPageView === 'history' ? (
          <FullPageHistory
            profile={profile}
            t={t}
            isRtl={isRtl}
            onNavigate={handleNavigate}
            onUpdateProfile={setProfile}
            onBackToBrowser={() => setFullPageView('browser')}
          />
        ) : fullPageView === 'bookmarks' ? (
          <FullPageBookmarks
            currentUrl={activeTab.url}
            currentTitle={activeTab.title}
            t={t}
            isRtl={isRtl}
            onNavigate={handleNavigate}
            onBackToBrowser={() => setFullPageView('browser')}
          />
        ) : fullPageView === 'downloads' ? (
          <FullPageDownloads
            t={t}
            isRtl={isRtl}
            onBackToBrowser={() => setFullPageView('browser')}
          />
        ) : fullPageView === 'privacy' ? (
          <FullPagePrivacy
            profile={profile}
            currentDomain={currentDomain}
            currentSafeMode={activeTab.safeMode}
            t={t}
            isRtl={isRtl}
            onUpdateSafeMode={(mode) => updateActiveTab({ safeMode: mode })}
            onUpdateProfile={setProfile}
            onBackToBrowser={() => setFullPageView('browser')}
          />
        ) : fullPageView === 'selftest' ? (
          <FullPageSelfTest
            t={t}
            isRtl={isRtl}
            onBackToBrowser={() => setFullPageView('browser')}
          />
        ) : (
          <BrowserView
            tab={activeTab}
            profile={profile}
            torStatus={torStatus}
            t={t}
            isRtl={isRtl}
            onNavigate={handleNavigate}
            onReload={handleReload}
            onOpenPrivacyDashboard={() => setFullPageView('privacy')}
            onOpenSelfTest={() => setFullPageView('selftest')}
            onOpenInspector={() => setFullPageView('inspector')}
            onOpenSettings={() => setFullPageView('settings')}
            onTestTorCircuit={handleTestTorCircuit}
            testingCircuit={testingCircuit}
            onSelectSearchEngine={handleSelectSearchEngine}
            onToggleTabSafeMode={handleToggleTabSafeMode}
          />
        )}
      </main>

      {/* Bottom Bar */}
      {fullPageView === 'browser' && (
        <BottomBar
          canGoBack={activeTab.canGoBack}
          canGoForward={activeTab.canGoForward}
          tabCount={tabs.length}
          t={t}
          isRtl={isRtl}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          onGoHome={() => handleNavigate('sm://home')}
          onOpenBookmarks={() => setFullPageView('bookmarks')}
          onOpenDownloads={() => setFullPageView('downloads')}
          onOpenTabs={() => setShowTabs(true)}
          onOpenMenu={() => setShowQuickMenu(true)}
          onOpenPrivacyDashboard={() => setFullPageView('privacy')}
        />
      )}

      {/* Tab Switcher Drawer */}
      <TabSwitcher
        isOpen={showTabs}
        tabs={tabs}
        activeTabId={activeTabId}
        t={t}
        onSelectTab={(id) => {
          setActiveTabId(id);
          setFullPageView('browser');
        }}
        onCloseTab={handleCloseTab}
        onNewTab={() => {
          handleNewTab();
          setShowTabs(false);
        }}
        onCloseAll={handleCloseAllTabs}
        onClose={() => setShowTabs(false)}
      />

      {/* Quick Menu */}
      <QuickMenu
        isOpen={showQuickMenu}
        profile={profile}
        t={t}
        interceptActive={interceptActive}
        onToggleIntercept={() => setInterceptActive(prev => !prev)}
        onNewTab={() => {
          handleNewTab();
          setShowQuickMenu(false);
        }}
        onOpenBookmarks={() => {
          setFullPageView('bookmarks');
          setShowQuickMenu(false);
        }}
        onOpenHistory={() => {
          setFullPageView('history');
          setShowQuickMenu(false);
        }}
        onOpenDownloads={() => {
          setFullPageView('downloads');
          setShowQuickMenu(false);
        }}
        onOpenPrivacyDashboard={() => {
          setFullPageView('privacy');
          setShowQuickMenu(false);
        }}
        onOpenDevTools={() => {
          setFullPageView('inspector');
          setShowQuickMenu(false);
        }}
        onOpenSettings={() => {
          setFullPageView('settings');
          setShowQuickMenu(false);
        }}
        onOpenSelfTest={() => {
          setFullPageView('selftest');
          setShowQuickMenu(false);
        }}
        onTogglePrivateMode={async () => {
          const updated = { ...profile, isPrivateMode: !profile.isPrivateMode };
          await saveProfile(updated);
          setProfile(updated);
        }}
        onToggleCameraBlock={handleToggleCameraBlock}
        onClose={() => setShowQuickMenu(false)}
      />

      {/* Burp Suite Proxy Request Interceptor Modal */}
      <BurpInterceptModal
        request={interceptedReq}
        isOpen={Boolean(interceptedReq)}
        isRtl={isRtl}
        onForward={(modified) => {
          setInterceptedReq(null);
          handleNavigate(modified.url, modified.body, true, modified.headers, modified.method);
        }}
        onDrop={() => {
          setInterceptedReq(null);
        }}
        onDisableIntercept={() => {
          setInterceptActive(false);
          setInterceptedReq(null);
        }}
      />
    </div>
  );
}
