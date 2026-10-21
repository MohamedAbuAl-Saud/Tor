import express, { Request, Response } from 'express';
import net from 'net';
import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sanitizeHtml from 'sanitize-html';
import { SocksProxyAgent } from 'socks-proxy-agent';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Tor configuration
const TOR_HOST = process.env.TOR_SOCKS_HOST || '127.0.0.1';
const TOR_PORT = Number(process.env.TOR_SOCKS_PORT) || 9050;
const TOR_PROXY_URL = `socks5h://${TOR_HOST}:${TOR_PORT}`;

// Wireshark-Style Detailed Packet Log with Port Analysis
interface WiresharkPacketLog {
  id: string;
  frameNumber: number;
  timestamp: number;
  method: string;
  url: string;
  sanitizedUrl?: string;
  source: string;
  destination: string;
  sourceIp: string;
  sourcePort: number;
  destIp: string;
  destPort: number;
  protocol: 'HTTP' | 'HTTPS' | 'SOCKS5' | 'TOR' | 'DNS' | 'TCP';
  status: number;
  statusText: string;
  durationMs: number;
  contentType: string;
  contentLength: number;
  isTorRouted: boolean;
  safeMode: boolean;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  hexDump?: string;
  blockedReason?: string;
}

let packetCounter = 1;
const networkLogs: WiresharkPacketLog[] = [];

// Generate authentic Hex Dump like Wireshark
function generateHexDump(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input.slice(0, 512), 'utf8') : input.slice(0, 512);
  const lines: string[] = [];
  for (let i = 0; i < buf.length; i += 16) {
    const slice = buf.slice(i, i + 16);
    const hexParts: string[] = [];
    let asciiPart = '';
    for (let j = 0; j < 16; j++) {
      if (j < slice.length) {
        hexParts.push(slice[j].toString(16).padStart(2, '0'));
        asciiPart += slice[j] >= 32 && slice[j] <= 126 ? String.fromCharCode(slice[j]) : '.';
      } else {
        hexParts.push('  ');
      }
    }
    const offset = i.toString(16).padStart(4, '0');
    lines.push(`${offset}  ${hexParts.slice(0, 8).join(' ')}  ${hexParts.slice(8).join(' ')}  |${asciiPart}|`);
  }
  return lines.join('\n');
}

function logNetworkEvent(entry: Omit<WiresharkPacketLog, 'frameNumber'>) {
  const fullPacket: WiresharkPacketLog = {
    ...entry,
    frameNumber: packetCounter++,
  };
  networkLogs.unshift(fullPacket);
  if (networkLogs.length > 300) {
    networkLogs.pop();
  }
}

// SSRF IP Validation
function isIpPrivateOrReserved(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === 'localhost' || ip === '0.0.0.0' || ip === '::1') {
    return true;
  }
  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && !parts.some(isNaN)) {
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 0) return true;
  }
  if (ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }
  return false;
}

function validateDestinationUrl(targetUrl: string): { valid: boolean; reason?: string; parsed?: URL; isOnion: boolean } {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, reason: `Protocol '${parsed.protocol}' is forbidden. Only HTTP/HTTPS are supported.`, isOnion: false };
    }

    const hostname = parsed.hostname.toLowerCase();
    const isOnion = hostname.endsWith('.onion');

    if (!isOnion) {
      if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.arpa')) {
        return { valid: false, reason: `Internal and reserved hostnames ('${hostname}') are blocked to prevent SSRF.`, isOnion: false };
      }
      if (isIpPrivateOrReserved(hostname)) {
        return { valid: false, reason: `Private/reserved IP address ('${hostname}') is blocked by SSRF gateway defense.`, isOnion: false };
      }
    }

    return { valid: true, parsed, isOnion };
  } catch (err: any) {
    return { valid: false, reason: `Invalid URL format: ${err.message}`, isOnion: false };
  }
}

// Real Tor SOCKS5 socket prober
async function probeTorDaemon(host: string, port: number, timeoutMs = 2500): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
  details: string;
}> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      const handshake = Buffer.from([0x05, 0x01, 0x00]);
      socket.write(handshake);
    });

    socket.on('data', (data) => {
      if (isResolved) return;
      isResolved = true;
      const latencyMs = Date.now() - start;
      if (data.length >= 2 && data[0] === 0x05 && data[1] === 0x00) {
        socket.destroy();
        resolve({
          connected: true,
          latencyMs,
          details: `Tor SOCKS5 daemon responded actively at ${host}:${port}`,
        });
      } else {
        socket.destroy();
        resolve({
          connected: false,
          latencyMs,
          error: 'Unexpected SOCKS handshake response',
          details: `Connected to ${host}:${port} but received non-standard response: ${data.toString('hex')}`,
        });
      }
    });

    socket.on('timeout', () => {
      if (isResolved) return;
      isResolved = true;
      socket.destroy();
      resolve({
        connected: false,
        error: 'Connection timed out',
        details: `Timed out trying to reach Tor daemon at ${host}:${port}`,
      });
    });

    socket.on('error', (err: any) => {
      if (isResolved) return;
      isResolved = true;
      socket.destroy();
      resolve({
        connected: false,
        error: err.code || err.message,
        details: `Could not connect to Tor SOCKS5 daemon at ${host}:${port}: ${err.message}`,
      });
    });
  });
}

// API Routes
app.get('/api/tor/status', async (_req: Request, res: Response) => {
  const probe = await probeTorDaemon(TOR_HOST, TOR_PORT);
  res.json({
    configured: true,
    connected: probe.connected,
    host: TOR_HOST,
    port: TOR_PORT,
    latencyMs: probe.latencyMs,
    details: probe.details,
    error: probe.error,
    isDaemonAvailable: probe.connected,
    onionSupported: probe.connected,
    instructions: probe.connected
      ? 'Tor daemon is connected and active on SOCKS5 9050. .onion routes and Tor anonymization are active.'
      : 'Tor daemon is not running on 127.0.0.1:9050. Run `tor` in your terminal to enable Tor routing and .onion resolution.',
  });
});

app.post('/api/tor/test-circuit', async (_req: Request, res: Response) => {
  const probe = await probeTorDaemon(TOR_HOST, TOR_PORT, 3000);
  if (!probe.connected) {
    return res.status(503).json({
      connected: false,
      error: probe.error || 'Tor daemon unreachable',
      details: probe.details,
      troubleshooting: 'Please ensure the Tor background daemon is running on port ' + TOR_PORT,
    });
  }

  try {
    const agent = new SocksProxyAgent(TOR_PROXY_URL);
    const testUrl = 'https://check.torproject.org/api/ip';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const start = Date.now();
    const response = await fetch(testUrl, {
      // @ts-ignore
      agent,
      signal: controller.signal,
      headers: { 'User-Agent': 'SM-Browser-Tor/2.0' },
    });
    clearTimeout(timeout);
    const duration = Date.now() - start;
    const data = await response.json();

    res.json({
      connected: true,
      circuitVerified: true,
      durationMs: duration,
      torCheckResult: data,
      message: 'Tor circuit active and verified through SOCKS5 proxy',
    });
  } catch (err: any) {
    res.json({
      connected: true,
      circuitVerified: false,
      warning: 'SOCKS5 port responds, but external circuit test had an issue: ' + err.message,
      troubleshooting: 'Tor may still be establishing its initial consensus (bootstrap). Check Tor daemon logs.',
    });
  }
});

// Asset Gateway Proxy (Rewrites CSS, Fonts, Images to load through gateway)
app.get('/api/gateway/asset', async (req: Request, res: Response) => {
  const assetUrl = req.query.url as string;
  if (!assetUrl) {
    return res.status(400).send('Missing asset URL');
  }

  const validation = validateDestinationUrl(assetUrl);
  if (!validation.valid) {
    return res.status(403).send('Asset destination blocked by SSRF policy');
  }

  try {
    const torProbe = await probeTorDaemon(TOR_HOST, TOR_PORT, 1000);
    const fetchOptions: any = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
      },
    };

    if (torProbe.connected) {
      fetchOptions.agent = new SocksProxyAgent(TOR_PROXY_URL);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    fetchOptions.signal = controller.signal;

    const resp = await fetch(assetUrl, fetchOptions);
    clearTimeout(timeout);

    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = Buffer.from(await resp.arrayBuffer());
    res.send(buffer);
  } catch (err: any) {
    res.status(502).send('Asset proxy error: ' + err.message);
  }
});

// Gateway Fetch Endpoint
app.post('/api/gateway/fetch', async (req: Request, res: Response) => {
  const startTime = Date.now();
  let { url, safeMode = false, profileId = 'anonymous', method = 'GET', body: reqBody, contentType: reqContentType } = req.body;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Missing destination URL' });
  }

  url = url.trim();

  // Automatic unwrapping of tracking redirect wrappers (DuckDuckGo uddg, Google url?q=)
  try {
    const parsedTarget = new URL(url);
    if (parsedTarget.searchParams.has('uddg')) {
      const decodedTarget = decodeURIComponent(parsedTarget.searchParams.get('uddg')!);
      if (decodedTarget.startsWith('http://') || decodedTarget.startsWith('https://')) {
        url = decodedTarget;
      }
    } else if (parsedTarget.searchParams.has('q') && (parsedTarget.hostname.includes('google.') || parsedTarget.hostname.includes('bing.'))) {
      const qVal = parsedTarget.searchParams.get('q')!;
      if (qVal.startsWith('http://') || qVal.startsWith('https://')) {
        url = decodeURIComponent(qVal);
      }
    }
  } catch {}

  // Normalize DuckDuckGo URLs
  if (url.includes('html.duckduckgo.com')) {
    url = url.replace('html.duckduckgo.com', 'duckduckgo.com');
  }
  if (url.includes('lite.duckduckgo.com')) {
    url = url.replace('lite.duckduckgo.com', 'duckduckgo.com');
  }

  const validation = validateDestinationUrl(url);
  const hostname = validation.parsed?.hostname || 'unknown';
  const destination = `${hostname}:${validation.parsed?.port || (validation.parsed?.protocol === 'https:' ? '443' : '80')}`;

  if (!validation.valid) {
    logNetworkEvent({
      id: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      url,
      sanitizedUrl: url,
      method,
      source: '127.0.0.1:client',
      destination,
      protocol: url.startsWith('https:') ? 'HTTPS' : 'HTTP',
      status: 403,
      statusText: 'Forbidden (SSRF Block)',
      durationMs: Date.now() - startTime,
      isTorRouted: false,
      contentType: 'application/json',
      contentLength: 0,
      blockedReason: validation.reason,
      safeMode: Boolean(safeMode),
      requestHeaders: { 'Host': hostname },
      responseHeaders: { 'Content-Type': 'application/json' },
      hexDump: generateHexDump(`403 FORBIDDEN: ${validation.reason}`),
    });
    return res.status(403).json({
      error: 'Destination blocked by gateway security policy',
      reason: validation.reason,
    });
  }

  const isOnion = validation.isOnion;
  const torProbe = await probeTorDaemon(TOR_HOST, TOR_PORT, 1500);

  if (isOnion && !torProbe.connected) {
    const reason = `Address '${url}' is an Onion service (.onion). It cannot be reached without an active Tor daemon running on ${TOR_HOST}:${TOR_PORT}.`;
    logNetworkEvent({
      id: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      url,
      sanitizedUrl: url,
      method,
      source: '127.0.0.1:client',
      destination,
      protocol: 'TOR',
      status: 502,
      statusText: 'Bad Gateway (Tor Daemon Down)',
      durationMs: Date.now() - startTime,
      isTorRouted: false,
      contentType: 'application/json',
      contentLength: 0,
      blockedReason: reason,
      safeMode: Boolean(safeMode),
      requestHeaders: { 'Host': hostname },
      responseHeaders: { 'Content-Type': 'application/json' },
      hexDump: generateHexDump(`502 BAD GATEWAY: ${reason}`),
    });
    return res.status(502).json({
      error: 'Tor daemon unavailable for .onion destination',
      reason,
      troubleshooting: 'Start your local Tor daemon (`tor` command) to resolve and browse .onion services.',
    });
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    };

    if (url.includes('duckduckgo.com')) {
      headers['Referer'] = 'https://duckduckgo.com/';
    }

    if (reqContentType) {
      headers['Content-Type'] = reqContentType;
    }

    const fetchOptions: any = {
      method,
      headers,
      redirect: 'manual',
    };

    if (reqBody && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = typeof reqBody === 'string' ? reqBody : new URLSearchParams(reqBody).toString();
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }

    let isTorRouted = false;
    let protocol: 'HTTP' | 'HTTPS' | 'SOCKS5' | 'TOR' = url.startsWith('https:') ? 'HTTPS' : 'HTTP';

    if (torProbe.connected) {
      fetchOptions.agent = new SocksProxyAgent(TOR_PROXY_URL);
      isTorRouted = true;
      protocol = isOnion ? 'TOR' : 'SOCKS5';
    }

    let currentUrl = url;
    let redirectCount = 0;
    const maxRedirects = 5;
    let finalResponse: any = null;

    while (redirectCount <= maxRedirects) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      fetchOptions.signal = controller.signal;

      const resp = await fetch(currentUrl, fetchOptions);
      clearTimeout(timeout);

      if (resp.status >= 300 && resp.status < 400 && resp.headers.get('location')) {
        redirectCount++;
        let nextUrl = new URL(resp.headers.get('location')!, currentUrl).toString();

        // Unwrap redirect link if it wraps destination in uddg
        try {
          const parsedNext = new URL(nextUrl);
          if (parsedNext.searchParams.has('uddg')) {
            const dec = decodeURIComponent(parsedNext.searchParams.get('uddg')!);
            if (dec.startsWith('http://') || dec.startsWith('https://')) {
              nextUrl = dec;
            }
          }
        } catch {}

        const nextValidation = validateDestinationUrl(nextUrl);
        if (!nextValidation.valid) {
          throw new Error(`Redirect to '${nextUrl}' was blocked by SSRF policy: ${nextValidation.reason}`);
        }

        currentUrl = nextUrl;

        // On 301/302/303 redirect, switch to GET and drop payload
        if (resp.status === 301 || resp.status === 302 || resp.status === 303) {
          fetchOptions.method = 'GET';
          delete fetchOptions.body;
          delete fetchOptions.headers['Content-Type'];
        }
        continue;
      }

      finalResponse = resp;
      break;
    }

    if (!finalResponse) {
      throw new Error('Too many redirects');
    }

    const contentType = finalResponse.headers.get('content-type') || 'text/html';
    const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml+xml');
    const durationMs = Date.now() - startTime;

    // Check downloads
    const contentDisposition = finalResponse.headers.get('content-disposition') || '';
    const isAttachment = contentDisposition.includes('attachment');
    const isBinary =
      !isHtml &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/json') &&
      !contentType.includes('text/css');

    if (isAttachment || isBinary) {
      const arrayBuffer = await finalResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
      let filename = filenameMatch ? filenameMatch[1] : path.basename(new URL(currentUrl).pathname) || 'download.bin';

      logNetworkEvent({
        id: Math.random().toString(36).substring(2),
        timestamp: Date.now(),
        url: currentUrl,
        sanitizedUrl: currentUrl,
        method,
        source: '127.0.0.1:client',
        destination,
        protocol,
        status: finalResponse.status,
        statusText: finalResponse.statusText || 'OK',
        durationMs,
        isTorRouted,
        contentType,
        contentLength: buffer.length,
        safeMode: Boolean(safeMode),
        requestHeaders: headers,
        responseHeaders: Object.fromEntries(finalResponse.headers.entries()),
        hexDump: generateHexDump(buffer),
      });

      return res.json({
        isDownload: true,
        filename,
        mimeType: contentType,
        size: buffer.length,
        url: currentUrl,
        dataBase64: buffer.toString('base64'),
        status: finalResponse.status,
        isTorRouted,
        durationMs,
      });
    }

    const rawText = await finalResponse.text();
    let processedHtml = rawText;
    const sanitizationEvents: string[] = [];

    // Universal Bridge Script with Storage polyfill for opaque origin srcDoc
    const bridgeScript = `
      <script>
        (function() {
          // Neutralize frame-busters
          try {
            window.top = window.self;
          } catch(e) {}

          // Polyfill Web Storage in opaque origin iframe so scripts never crash with SecurityError
          try {
            var memStore = {};
            if (!window.localStorage) {
              window.localStorage = {
                getItem: function(k) { return memStore[k] || null; },
                setItem: function(k, v) { memStore[k] = String(v); },
                removeItem: function(k) { delete memStore[k]; },
                clear: function() { memStore = {}; },
                key: function(i) { return Object.keys(memStore)[i] || null; },
                get length() { return Object.keys(memStore).length; }
              };
            }
          } catch(e) {}

          try {
            var memSess = {};
            if (!window.sessionStorage) {
              window.sessionStorage = {
                getItem: function(k) { return memSess[k] || null; },
                setItem: function(k, v) { memSess[k] = String(v); },
                removeItem: function(k) { delete memSess[k]; },
                clear: function() { memSess = {}; },
                key: function(i) { return Object.keys(memSess)[i] || null; },
                get length() { return Object.keys(memSess).length; }
              };
            }
          } catch(e) {}

          // Intercept all link clicks and unwrap redirect URLs
          document.addEventListener('click', function(e) {
            var target = e.target.closest('a');
            if (target && target.href && !target.href.startsWith('javascript:')) {
              e.preventDefault();
              var dest = target.getAttribute('data-gateway-target') || target.href;
              try {
                var p = new URL(dest, window.location.href);
                if (p.searchParams.has('uddg')) {
                  var raw = decodeURIComponent(p.searchParams.get('uddg'));
                  if (raw.indexOf('http') === 0) dest = raw;
                }
              } catch(err) {}
              window.parent.postMessage({ type: 'SM_BROWSER_NAVIGATE', url: dest }, '*');
            }
          }, true);

          // Intercept search and form submissions
          document.addEventListener('submit', function(e) {
            var form = e.target;
            if (form) {
              e.preventDefault();
              var action = form.action || window.location.href;
              var method = (form.method || 'GET').toUpperCase();
              var formData = new FormData(form);

              // Direct search interceptor
              var qInput = form.querySelector('input[name="q"]');
              if (qInput && qInput.value) {
                var sUrl = 'https://duckduckgo.com/html/?q=' + encodeURIComponent(qInput.value);
                window.parent.postMessage({ type: 'SM_BROWSER_NAVIGATE', url: sUrl }, '*');
                return;
              }

              if (method === 'GET') {
                var params = new URLSearchParams(formData).toString();
                var fullUrl = action + (action.indexOf('?') >= 0 ? '&' : '?') + params;
                window.parent.postMessage({ type: 'SM_BROWSER_NAVIGATE', url: fullUrl }, '*');
              } else {
                var params = new URLSearchParams(formData).toString();
                window.parent.postMessage({ 
                  type: 'SM_BROWSER_FORM_POST', 
                  url: action, 
                  body: params, 
                  contentType: 'application/x-www-form-urlencoded' 
                }, '*');
              }
            }
          }, true);
        })();
      </script>
    `;

    if (isHtml) {
      // Strip frame-busting meta headers
      processedHtml = processedHtml
        .replace(/<meta[^>]+http-equiv=["']X-Frame-Options["'][^>]*>/gi, '')
        .replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+frame-ancestors[^>]*>/gi, '');

      // In search results, rewrite any DuckDuckGo redirect wrappers to direct destination links
      processedHtml = processedHtml.replace(/href=["'](?:\/\/|https?:\/\/)(?:[a-z0-9-]+\.)?duckduckgo\.com\/l\/\?uddg=([^"']+)["']/gi, (_match, uddg) => {
        try {
          return `href="${decodeURIComponent(uddg)}"`;
        } catch {
          return _match;
        }
      });

      if (safeMode) {
        // Safe Document Mode: Sanitize strictly
        sanitizationEvents.push('Scripts and event handlers removed');
        sanitizationEvents.push('Strict CSP injected (default-src none)');

        const sanitized = sanitizeHtml(processedHtml, {
          allowedTags: [
            'html', 'head', 'body', 'meta', 'title', 'link',
            'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'article', 'section',
            'nav', 'header', 'footer', 'main', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
            'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'b', 'i', 'strong', 'em', 'a',
            'img', 'picture', 'source', 'figure', 'figcaption', 'hr', 'br', 'dl', 'dt', 'dd',
            'sub', 'sup', 'mark', 'small', 'details', 'summary', 'form', 'input', 'button'
          ],
          allowedAttributes: {
            '*': ['style', 'class', 'id', 'dir', 'lang', 'title', 'aria-*', 'role', 'type', 'name', 'value', 'placeholder'],
            'a': ['href', 'target', 'rel', 'title', 'data-gateway-target'],
            'img': ['src', 'alt', 'width', 'height', 'loading'],
            'form': ['action', 'method'],
            'meta': ['charset', 'name', 'content'],
          },
          allowedSchemes: ['http', 'https', 'data', 'mailto'],
          transformTags: {
            'a': (_tagName, attribs) => {
              if (attribs.href) {
                try {
                  const absoluteHref = new URL(attribs.href, currentUrl).toString();
                  return {
                    tagName: 'a',
                    attribs: {
                      ...attribs,
                      'href': absoluteHref,
                      'data-gateway-target': absoluteHref,
                      'target': '_self',
                    },
                  };
                } catch {
                  return { tagName: 'a', attribs };
                }
              }
              return { tagName: 'a', attribs };
            },
            'img': (_tagName, attribs) => {
              if (attribs.src) {
                try {
                  const absoluteSrc = new URL(attribs.src, currentUrl).toString();
                  return {
                    tagName: 'img',
                    attribs: {
                      ...attribs,
                      'src': `/api/gateway/asset?url=${encodeURIComponent(absoluteSrc)}`,
                      'loading': 'lazy',
                    },
                  };
                } catch {
                  return { tagName: 'img', attribs };
                }
              }
              return { tagName: 'img', attribs };
            },
          },
        });

        const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https: http: /api/gateway/asset; font-src data: https: http:; style-src 'unsafe-inline' https: http:; media-src data: https: http:;">`;
        const baseTag = `<base href="${currentUrl}">`;

        processedHtml = `<!DOCTYPE html><html><head>${cspMeta}${baseTag}<style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 1.25rem; color: #1e293b; background: #ffffff; max-width: 900px; margin: 0 auto; word-break: break-word; } img { max-width: 100%; height: auto; border-radius: 8px; } a { color: #2563eb; text-decoration: underline; } pre, code { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; font-family: monospace; overflow-x: auto; } input[type="text"], input[type="search"] { border: 1px solid #cbd5e1; padding: 0.4rem 0.75rem; border-radius: 8px; font-size: 0.9em; width: 100%; max-width: 400px; margin-bottom: 0.5rem; } button, input[type="submit"] { background: #0f172a; color: white; border: none; padding: 0.4rem 0.9rem; border-radius: 8px; font-size: 0.9em; cursor: pointer; }</style></head><body>${sanitized}${bridgeScript}</body></html>`;
      } else {
        // Active JavaScript Mode (Default)
        const baseTag = `<base href="${currentUrl}">`;
        if (/<head[^>]*>/i.test(processedHtml)) {
          processedHtml = processedHtml.replace(/<head[^>]*>/i, `$&${baseTag}${bridgeScript}`);
        } else {
          processedHtml = `${baseTag}${bridgeScript}${processedHtml}`;
        }
      }
    }

    const responseHeadersObj = Object.fromEntries(finalResponse.headers.entries());

    const clientPort = 50000 + (packetCounter % 15000);
    const serverPort = isTorRouted ? 9050 : (currentUrl.startsWith('https:') ? 443 : 80);
    const serverIp = isTorRouted ? '127.0.0.1' : (hostname || 'remote');

    logNetworkEvent({
      id: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      url: currentUrl,
      sanitizedUrl: currentUrl,
      method,
      source: `127.0.0.1:${clientPort}`,
      destination: `${serverIp}:${serverPort}`,
      sourceIp: '127.0.0.1',
      sourcePort: clientPort,
      destIp: serverIp,
      destPort: serverPort,
      protocol: isTorRouted ? 'SOCKS5' : (currentUrl.startsWith('https:') ? 'HTTPS' : 'HTTP'),
      status: finalResponse.status,
      statusText: finalResponse.statusText || 'OK',
      durationMs,
      isTorRouted,
      contentType,
      contentLength: Buffer.byteLength(processedHtml, 'utf8'),
      safeMode: false,
      requestHeaders: headers,
      responseHeaders: responseHeadersObj,
      hexDump: generateHexDump(processedHtml),
    });

    res.json({
      url: currentUrl,
      title: extractTitle(processedHtml) || currentUrl,
      favicon: extractFavicon(processedHtml, currentUrl),
      status: finalResponse.status,
      contentType,
      content: processedHtml,
      isTorRouted,
      durationMs,
      safeMode: false,
      sanitizationEvents,
      headers: responseHeadersObj,
    });
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const clientPort = 50000 + (packetCounter % 15000);
    const serverPort = url.startsWith('https:') ? 443 : 80;

    logNetworkEvent({
      id: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      url,
      sanitizedUrl: url,
      method,
      source: `127.0.0.1:${clientPort}`,
      destination: `${hostname}:${serverPort}`,
      sourceIp: '127.0.0.1',
      sourcePort: clientPort,
      destIp: hostname,
      destPort: serverPort,
      protocol: url.startsWith('https:') ? 'HTTPS' : 'HTTP',
      status: 500,
      statusText: 'Internal Gateway Error',
      durationMs,
      isTorRouted: false,
      contentType: 'application/json',
      contentLength: 0,
      blockedReason: err.message,
      safeMode: false,
      requestHeaders: {},
      responseHeaders: {},
      hexDump: generateHexDump(`500 ERROR: ${err.message}`),
    });

    const fallbackHtml = generateFallbackHtml(url, err.message);
    res.json({
      url,
      title: 'تعذر التحميل المباشر',
      favicon: '',
      status: 200,
      contentType: 'text/html',
      content: fallbackHtml,
      isTorRouted: false,
      durationMs,
      safeMode: false,
      sanitizationEvents: [],
      headers: {},
    });
  }
});

function generateFallbackHtml(targetUrl: string, errorReason: string): string {
  let query = '';
  try {
    const parsed = new URL(targetUrl);
    if (parsed.searchParams.has('q')) {
      query = parsed.searchParams.get('q') || '';
    }
  } catch {}

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>تعذر التحميل المباشر - SM Browser Tor</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #1e293b; padding: 2rem; max-width: 700px; margin: 0 auto; line-height: 1.6; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h1 { font-size: 1.25rem; color: #0f172a; margin-top: 0; }
    p { color: #64748b; font-size: 0.9rem; }
    .url { font-family: monospace; background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; word-break: break-all; color: #334155; margin: 1rem 0; }
    .btn { display: inline-block; background: #0f172a; color: white; padding: 0.6rem 1.2rem; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.85rem; margin-top: 1rem; }
    .btn:hover { background: #1e293b; }
  </style>
</head>
<body>
  <div class="card">
    <h1>حماية الموقع أو جدار الحماية (Anti-Bot / Cloudflare)</h1>
    <p>قام هذا الموقع بحظر الاتصالات التلقائية عبر البوابة أو تعذر الوصول المباشر إليه. يمكنك فتحه في نافذة متصفح خارجية مباشرة أو البحث عبر محرك DuckDuckGo.</p>
    <div class="url">${targetUrl}</div>
    <p><strong>السبب التقني:</strong> ${errorReason}</p>
    
    ${query ? `
      <div style="margin-top: 1.5rem; border-top: 1px solid #e2e8f0; padding-top: 1.5rem;">
        <h3>نتائج البحث لـ: "${query}"</h3>
        <a href="https://duckduckgo.com/html/?q=${encodeURIComponent(query)}" class="btn" style="background: #e35a1d;">بحث عبر DuckDuckGo HTML</a>
      </div>
    ` : ''}

    <div style="margin-top: 1.5rem;">
      <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn">فتح في نافذة متصفح جديدة ↗</a>
    </div>
  </div>
</body>
</html>`;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

function extractFavicon(html: string, pageUrl: string): string {
  try {
    const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i) ||
                      html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);
    if (iconMatch && iconMatch[1]) {
      return new URL(iconMatch[1], pageUrl).toString();
    }
    const p = new URL(pageUrl);
    if (p.hostname.includes('duckduckgo.com')) {
      return 'https://duckduckgo.com/favicon.ico';
    }
    return `https://www.google.com/s2/favicons?domain=${p.hostname}&sz=64`;
  } catch {
    return '';
  }
}

// Burp Suite Interceptor State & Endpoints
interface InterceptItem {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  status: 'paused' | 'forwarded' | 'dropped';
}

let interceptEnabled = false;
const interceptQueue: InterceptItem[] = [];

app.get('/api/devtools/intercept/status', (_req: Request, res: Response) => {
  res.json({
    enabled: interceptEnabled,
    queue: interceptQueue.filter(q => q.status === 'paused'),
  });
});

app.post('/api/devtools/intercept/toggle', (req: Request, res: Response) => {
  interceptEnabled = Boolean(req.body.enabled);
  res.json({ enabled: interceptEnabled });
});

app.post('/api/devtools/intercept/action', (req: Request, res: Response) => {
  const { id, action, modifiedUrl, modifiedMethod, modifiedHeaders, modifiedBody } = req.body;
  const item = interceptQueue.find(q => q.id === id);
  if (item) {
    item.status = action === 'forward' ? 'forwarded' : 'dropped';
    if (modifiedUrl) item.url = modifiedUrl;
    if (modifiedMethod) item.method = modifiedMethod;
    if (modifiedHeaders) item.headers = modifiedHeaders;
    if (modifiedBody !== undefined) item.body = modifiedBody;
  }
  res.json({ success: true, item });
});

// Request Tamperer & Replayer ("تعديل على الطلبات")
app.post('/api/devtools/tamper-send', async (req: Request, res: Response) => {
  const { url, method = 'GET', headers = {}, body: customBody, useTor = false } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing destination URL' });
  }

  const validation = validateDestinationUrl(url);
  if (!validation.valid) {
    return res.status(403).json({ error: 'Blocked by SSRF defense', reason: validation.reason });
  }

  const startTime = Date.now();
  try {
    const fetchOptions: any = {
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        ...headers,
      },
    };

    if (customBody && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = customBody;
    }

    if (useTor) {
      fetchOptions.agent = new SocksProxyAgent(TOR_PROXY_URL);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    fetchOptions.signal = controller.signal;

    const resp = await fetch(url, fetchOptions);
    clearTimeout(timeout);
    const durationMs = Date.now() - startTime;

    const rawResp = await resp.text();
    const respHeaders = Object.fromEntries(resp.headers.entries());

    const clientPort = 50000 + (packetCounter % 15000);
    const destPort = useTor ? 9050 : (url.startsWith('https:') ? 443 : 80);

    logNetworkEvent({
      id: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      url,
      method,
      source: `127.0.0.1:${clientPort}`,
      destination: `${validation.parsed?.hostname || 'unknown'}:${destPort}`,
      sourceIp: '127.0.0.1',
      sourcePort: clientPort,
      destIp: validation.parsed?.hostname || 'unknown',
      destPort,
      protocol: useTor ? 'TOR' : 'HTTP',
      status: resp.status,
      statusText: resp.statusText || 'OK',
      durationMs,
      isTorRouted: Boolean(useTor),
      contentType: resp.headers.get('content-type') || 'text/plain',
      contentLength: Buffer.byteLength(rawResp, 'utf8'),
      safeMode: false,
      requestHeaders: headers,
      responseHeaders: respHeaders,
      requestBody: customBody,
      hexDump: generateHexDump(rawResp),
    });

    res.json({
      success: true,
      status: resp.status,
      statusText: resp.statusText,
      durationMs,
      headers: respHeaders,
      body: rawResp.slice(0, 50000),
      hexDump: generateHexDump(rawResp),
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'Tampered Request Failed',
      message: err.message,
    });
  }
});

// Devtools Network Logs Endpoint
app.get('/api/devtools/logs', (_req: Request, res: Response) => {
  res.json({ logs: networkLogs });
});

app.post('/api/devtools/clear', (_req: Request, res: Response) => {
  networkLogs.length = 0;
  res.json({ success: true });
});

// Diagnostics System Info
app.get('/api/diagnostics/system', async (_req: Request, res: Response) => {
  const torStatus = await probeTorDaemon(TOR_HOST, TOR_PORT);
  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memoryUsage: process.memoryUsage(),
    torStatus,
    timestamp: Date.now(),
    uptime: process.uptime(),
    environment: {
      appUrl: process.env.APP_URL || 'Local Dev Server',
    },
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SM BROWSER TOR Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
