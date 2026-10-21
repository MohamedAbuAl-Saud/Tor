import React, { useState, useEffect, useCallback } from 'react';
import { HeaderBar } from './components/HeaderBar';
import { BottomBar } from './components/BottomBar';
import { BrowserView } from './components/BrowserView';
import { TabSwitcher } from './components/TabSwitcher';
import { BookmarksManager } from './components/BookmarksManager';
import { HistoryManager } from './components/HistoryManager';
import { DownloadManager } from './components/DownloadManager';
import { PrivacyDashboard } from './components/PrivacyDashboard';
import { DeveloperTools } from './components/DeveloperTools';
import { AiAssistant } from './components/AiAssistant';
import { SettingsModal } from './components/SettingsModal';
import { SelfTestModal } from './components/SelfTestModal';
import { QuickMenu } from './components/QuickMenu';
import { Tab, ProfileSettings, TorStatusResponse, SafeModeType } from './types/browser';
import { translations } from './utils/i18n';
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

  // Tabs
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
      safeMode: 'safe',
      isOnion: false,
      isTorRouted: false,
      timestamp: Date.now(),
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-initial');

  // Bookmarks cache for active tab star indicator
  const [bookmarkedUrls, setBookmarkedUrls] = useState<Set<string>>(new Set());

  // Modals state
  const [showTabs, setShowTabs] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showPrivacyDashboard, setShowPrivacyDashboard] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSelfTest, setShowSelfTest] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  // Initialize profile and Tor status
  useEffect(() => {
    async function init() {
      const activeProfile = await getActiveProfile();
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

  // Sync RTL and Language
  const currentLang = profile?.language || 'en';
  const t = translations[currentLang] || translations.en;
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

  // Navigate function
  const handleNavigate = useCallback(async (targetUrl: string) => {
    if (!targetUrl || !targetUrl.trim()) return;
    let url = targetUrl.trim();

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

    // Scheme formatting
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        // Fallback to search query
        const engine = profile?.searchEngine || 'duckduckgo';
        if (engine === 'duckduckgo') {
          url = `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
        } else if (engine === 'searxng') {
          url = `https://searx.be/search?q=${encodeURIComponent(url)}`;
        } else if (engine === 'brave') {
          url = `https://search.brave.com/search?q=${encodeURIComponent(url)}`;
        } else {
          url = `https://www.startpage.com/do/search?query=${encodeURIComponent(url)}`;
        }
      }
    }

    const isOnion = url.toLowerCase().includes('.onion');

    // Update tab state to loading
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

    // Record search or browsing history if enabled
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
        }),
      });

      const data = await res.json();

      // Check if download detected
      if (data.isDownload && data.dataBase64) {
        // Decode base64 to Blob
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

        // Open Downloads manager to let user inspect or download to device
        setShowDownloads(true);
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

      updateActiveTab({
        url: data.url || url,
        displayUrl: data.url || url,
        title: data.title || url,
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
  }, [activeTabId, activeTab.safeMode, profile, updateActiveTab]);

  // Back and Forward controls
  const handleGoBack = useCallback(() => {
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
  }, [activeTab, activeTabId, handleNavigate]);

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
      safeMode: profile?.defaultSafeMode || 'safe',
      isOnion: false,
      isTorRouted: false,
      timestamp: Date.now(),
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (id: string) => {
    if (tabs.length === 1) {
      // Don't close last tab, reset to home
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
        safeMode: 'safe',
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
      safeMode: 'safe',
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

  // Toggle Safe Mode vs JS Mode for active tab
  const handleUpdateSafeMode = (mode: SafeModeType) => {
    updateActiveTab({ safeMode: mode });
    // Reload page with new mode if on website
    if (activeTab.url && activeTab.url !== 'sm://home') {
      setTimeout(() => handleNavigate(activeTab.url), 50);
    }
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
      {/* Top Header Bar (Omnibox, SM Logo, Tab Count, Reload) */}
      <HeaderBar
        activeTab={activeTab}
        tabCount={tabs.length}
        t={t}
        isRtl={isRtl}
        isBookmarked={isCurrentBookmarked}
        onNavigate={handleNavigate}
        onReload={handleReload}
        onStop={handleStop}
        onToggleBookmark={handleToggleBookmark}
        onOpenTabs={() => setShowTabs(true)}
        onOpenMenu={() => setShowQuickMenu(true)}
        onOpenPrivacyDashboard={() => setShowPrivacyDashboard(true)}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <BrowserView
          tab={activeTab}
          profile={profile}
          torStatus={torStatus}
          t={t}
          isRtl={isRtl}
          onNavigate={handleNavigate}
          onReload={handleReload}
          onOpenPrivacyDashboard={() => setShowPrivacyDashboard(true)}
          onOpenAiAssistant={() => setShowAiAssistant(true)}
          onOpenSelfTest={() => setShowSelfTest(true)}
          onTestTorCircuit={handleTestTorCircuit}
          testingCircuit={testingCircuit}
        />
      </main>

      {/* Bottom Bar (Samsung Internet iconic mobile navigation bar) */}
      <BottomBar
        canGoBack={activeTab.canGoBack}
        canGoForward={activeTab.canGoForward}
        tabCount={tabs.length}
        t={t}
        isRtl={isRtl}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onGoHome={() => handleNavigate('sm://home')}
        onOpenBookmarks={() => setShowBookmarks(true)}
        onOpenDownloads={() => setShowDownloads(true)}
        onOpenTabs={() => setShowTabs(true)}
        onOpenMenu={() => setShowQuickMenu(true)}
        onOpenPrivacyDashboard={() => setShowPrivacyDashboard(true)}
      />

      {/* Modals & Drawers */}
      <TabSwitcher
        isOpen={showTabs}
        tabs={tabs}
        activeTabId={activeTabId}
        t={t}
        onSelectTab={(id) => setActiveTabId(id)}
        onCloseTab={handleCloseTab}
        onNewTab={() => {
          handleNewTab();
          setShowTabs(false);
        }}
        onCloseAll={handleCloseAllTabs}
        onClose={() => setShowTabs(false)}
      />

      <BookmarksManager
        isOpen={showBookmarks}
        currentUrl={activeTab.url}
        currentTitle={activeTab.title}
        t={t}
        onNavigate={handleNavigate}
        onClose={() => setShowBookmarks(false)}
      />

      <HistoryManager
        isOpen={showHistory}
        profile={profile}
        t={t}
        onNavigate={handleNavigate}
        onUpdateProfile={setProfile}
        onClose={() => setShowHistory(false)}
      />

      <DownloadManager
        isOpen={showDownloads}
        t={t}
        onClose={() => setShowDownloads(false)}
      />

      <PrivacyDashboard
        isOpen={showPrivacyDashboard}
        profile={profile}
        currentDomain={currentDomain}
        currentSafeMode={activeTab.safeMode}
        t={t}
        onUpdateSafeMode={handleUpdateSafeMode}
        onUpdateProfile={setProfile}
        onClose={() => setShowPrivacyDashboard(false)}
      />

      <DeveloperTools
        isOpen={showDevTools}
        t={t}
        onClose={() => setShowDevTools(false)}
      />

      <AiAssistant
        isOpen={showAiAssistant}
        tab={activeTab}
        t={t}
        currentLanguage={profile.language}
        onClose={() => setShowAiAssistant(false)}
      />

      <SettingsModal
        isOpen={showSettings}
        profile={profile}
        torStatus={torStatus}
        t={t}
        onUpdateProfile={setProfile}
        onTestTorCircuit={handleTestTorCircuit}
        onClose={() => setShowSettings(false)}
      />

      <SelfTestModal
        isOpen={showSelfTest}
        t={t}
        onClose={() => setShowSelfTest(false)}
      />

      <QuickMenu
        isOpen={showQuickMenu}
        profile={profile}
        t={t}
        onNewTab={() => {
          handleNewTab();
          setShowQuickMenu(false);
        }}
        onOpenBookmarks={() => {
          setShowBookmarks(true);
          setShowQuickMenu(false);
        }}
        onOpenHistory={() => {
          setShowHistory(true);
          setShowQuickMenu(false);
        }}
        onOpenDownloads={() => {
          setShowDownloads(true);
          setShowQuickMenu(false);
        }}
        onOpenPrivacyDashboard={() => {
          setShowPrivacyDashboard(true);
          setShowQuickMenu(false);
        }}
        onOpenDevTools={() => {
          setShowDevTools(true);
          setShowQuickMenu(false);
        }}
        onOpenAiAssistant={() => {
          setShowAiAssistant(true);
          setShowQuickMenu(false);
        }}
        onOpenSettings={() => {
          setShowSettings(true);
          setShowQuickMenu(false);
        }}
        onOpenSelfTest={() => {
          setShowSelfTest(true);
          setShowQuickMenu(false);
        }}
        onTogglePrivateMode={async () => {
          const updated = { ...profile, isPrivateMode: !profile.isPrivateMode };
          await saveProfile(updated);
          setProfile(updated);
        }}
        onClose={() => setShowQuickMenu(false)}
      />
    </div>
  );
}
