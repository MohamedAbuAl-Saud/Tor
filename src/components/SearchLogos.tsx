import React from 'react';
import { SearchEngine } from '../types/browser';

export const SearchEngineLogos: Record<SearchEngine, React.FC<{ className?: string }>> = {
  duckduckgo: ({ className = 'w-6 h-6' }) => (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="23" fill="#DE5833" />
      <path d="M37 24C37 16.8203 31.1797 11 24 11C16.8203 11 11 16.8203 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24Z" fill="#DE5833"/>
      <circle cx="24" cy="20" r="9" fill="white" />
      <path d="M19 23C19 21 21 19 23 19H33C35 19 35 23 31 24L23 25C20.5 25.3 19 24.5 19 23Z" fill="#F49E17" />
      <circle cx="23" cy="18" r="1.5" fill="#2E2E2E" />
      <path d="M22 28C20 28 17 31 24 33C31 31 28 28 26 28L24 29L22 28Z" fill="#58B24C" />
    </svg>
  ),
};

export const SEARCH_ENGINES_LIST: { id: SearchEngine; name: string; queryUrl: (q: string) => string; homeUrl: string; desc: string }[] = [
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    homeUrl: 'https://duckduckgo.com',
    queryUrl: (q) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
    desc: 'محرك البحث الرئيسي والوحيد في المتصفح، يحمي خصوصيتك بدون أي تتبع أو إعلانات موجهة.',
  },
];
