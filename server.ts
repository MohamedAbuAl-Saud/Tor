import express, { Request, Response } from 'express';
import net from 'net';
import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sanitizeHtml from 'sanitize-html';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Tor configuration
const TOR_HOST = process.env.TOR_SOCKS_HOST || '127.0.0.1';
const TOR_PORT = Number(process.env.TOR_SOCKS_PORT) || 9050;
const TOR_PROXY_URL = `socks5h://${TOR_HOST}:${TOR_PORT}`;

// In-memory diagnostics network log
interface ServerNetworkLog {
  id: string;
  timestamp: number;
  url: string;
  sanitizedUrl?: string;
  method: string;
  status: number;
  durationMs: number;
  isTorRouted: boolean;
  contentType: string;
  contentLength: number;
  blockedReason?: string;
  safeMode: boolean;
}

const networkLogs: ServerNetworkLog[] = [];

function logNetworkEvent(entry: ServerNetworkLog) {
  networkLogs.unshift(entry);
  if (networkLogs.length > 100) {
    networkLogs.pop();
  }
}

// SSRF IP Validation
function isIpPrivateOrReserved(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === 'localhost' || ip === '0.0.0.0' || ip === '::1') {
    return true;
  }
  // IPv4 Private & Link Local ranges
  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && !parts.some(isNaN)) {
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 127.0.0.0/8
    if (parts[0] === 127) return true;
    // 172.16.0.0/12 (172.16.0.0 to 172.31.255.255)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link Local / Cloud Metadata 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
  }
  // IPv6 checks
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

    // Check .onion
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
      // Send SOCKS5 handshake: version 5, 1 auth method, no-auth (0x00)
      const handshake = Buffer.from([0x05, 0x01, 0x00]);
      socket.write(handshake);
    });

    socket.on('data', (data) => {
      if (isResolved) return;
      isResolved = true;
      const latencyMs = Date.now() - start;
      // SOCKS5 response: [0x05, 0x00] indicates server accepted NO_AUTH
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
          details: `Connected to ${host}:${port} but received non-standard SOCKS5 response: ${data.toString('hex')}`,
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
      ? 'Tor daemon is connected and active on SOCKS5 9050. .onion routes and Tor anonymization are enabled.'
      : 'Tor daemon is not running on 127.0.0.1:9050. In Linux/macOS, run `tor` in your terminal. For Docker, run `docker run -d -p 9050:9050 osminogin/tor-simple`.',
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

  // Attempt real SOCKS5 fetch to Tor Project check endpoint
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
      headers: { 'User-Agent': 'SM-Browser-Tor/1.0' },
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

// Gateway Fetch Endpoint
app.post('/api/gateway/fetch', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { url, safeMode = true, profileId = 'anonymous', method = 'GET' } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing destination URL' });
  }

  const validation = validateDestinationUrl(url);
  if (!validation.valid) {
    logNetworkEvent({
      id: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      url,
      sanitizedUrl: url,
      method,
      status: 403,
      durationMs: Date.now() - startTime,
      isTorRouted: false,
      contentType: 'application/json',
      contentLength: 0,
      blockedReason: validation.reason,
      safeMode: Boolean(safeMode),
    });
    return res.status(403).json({
      error: 'Destination blocked by gateway security policy',
      reason: validation.reason,
    });
  }

  const isOnion = validation.isOnion;
  const torProbe = await probeTorDaemon(TOR_HOST, TOR_PORT, 1500);

  // If destination is .onion, Tor is strictly required
  if (isOnion && !torProbe.connected) {
    const reason = `Address '${url}' is an Onion service (.onion). It cannot be reached without an active Tor daemon running on ${TOR_HOST}:${TOR_PORT}.`;
    logNetworkEvent({
      id: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      url,
      sanitizedUrl: url,
      method,
      status: 502,
      durationMs: Date.now() - startTime,
      isTorRouted: false,
      contentType: 'application/json',
      contentLength: 0,
      blockedReason: reason,
      safeMode: Boolean(safeMode),
    });
    return res.status(502).json({
      error: 'Tor daemon unavailable for .onion destination',
      reason,
      troubleshooting: 'Start your local Tor daemon (`tor` command) to resolve and browse .onion services.',
    });
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36 SM-Browser-Tor/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1',
    };

    const fetchOptions: any = {
      method,
      headers,
      redirect: 'manual', // Manual redirect follow to enforce SSRF validation at every hop
    };

    let isTorRouted = false;
    if (torProbe.connected) {
      fetchOptions.agent = new SocksProxyAgent(TOR_PROXY_URL);
      isTorRouted = true;
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

      // Handle redirect
      if (resp.status >= 300 && resp.status < 400 && resp.headers.get('location')) {
        redirectCount++;
        const location = resp.headers.get('location')!;
        const nextUrl = new URL(location, currentUrl).toString();

        // SSRF check on redirect destination
        const nextValidation = validateDestinationUrl(nextUrl);
        if (!nextValidation.valid) {
          throw new Error(`Redirect to '${nextUrl}' was blocked by SSRF policy: ${nextValidation.reason}`);
        }

        currentUrl = nextUrl;
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

    // Check if this is a download (binary or attachment)
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
        status: finalResponse.status,
        durationMs,
        isTorRouted,
        contentType,
        contentLength: buffer.length,
        safeMode: Boolean(safeMode),
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

    if (isHtml) {
      if (safeMode) {
        // Safe Document Mode: Sanitize strictly
        sanitizationEvents.push('Scripts, event handlers, and active embeds removed');
        sanitizationEvents.push('Strict CSP injected (default-src none)');

        const sanitized = sanitizeHtml(rawText, {
          allowedTags: [
            'html', 'head', 'body', 'meta', 'title', 'link',
            'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'article', 'section',
            'nav', 'header', 'footer', 'main', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
            'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'b', 'i', 'strong', 'em', 'a',
            'img', 'picture', 'source', 'figure', 'figcaption', 'hr', 'br', 'dl', 'dt', 'dd',
            'sub', 'sup', 'mark', 'small', 'details', 'summary'
          ],
          allowedAttributes: {
            '*': ['style', 'class', 'id', 'dir', 'lang', 'title', 'aria-*', 'role'],
            'a': ['href', 'target', 'rel', 'title', 'data-original-href'],
            'img': ['src', 'alt', 'width', 'height', 'loading'],
            'meta': ['charset', 'name', 'content'],
          },
          allowedSchemes: ['http', 'https', 'data', 'mailto'],
          transformTags: {
            'a': (tagName, attribs) => {
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
            'img': (tagName, attribs) => {
              if (attribs.src) {
                try {
                  const absoluteSrc = new URL(attribs.src, currentUrl).toString();
                  return {
                    tagName: 'img',
                    attribs: {
                      ...attribs,
                      'src': absoluteSrc,
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

        // Add Base URL and strict Content Security Policy meta
        const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https: http:; font-src data: https: http:; style-src 'unsafe-inline' https: http:; media-src data: https: http:;">`;
        const baseTag = `<base href="${currentUrl}">`;

        // Safe communication script: handles link clicks inside iframe and notifies parent gateway
        const bridgeScript = `
          <script>
            (function() {
              document.addEventListener('click', function(e) {
                var target = e.target.closest('a');
                if (target && target.href) {
                  e.preventDefault();
                  window.parent.postMessage({ type: 'SM_BROWSER_NAVIGATE', url: target.href }, '*');
                }
              }, true);
            })();
          </script>
        `;

        processedHtml = `<!DOCTYPE html><html><head>${cspMeta}${baseTag}<style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 1.25rem; color: #1e293b; background: #ffffff; max-width: 900px; margin: 0 auto; word-break: break-word; } img { max-width: 100%; height: auto; border-radius: 8px; } a { color: #2563eb; text-decoration: underline; } pre, code { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; font-family: monospace; overflow-x: auto; } blockquote { border-left: 3px solid #cbd5e1; margin-left: 0; padding-left: 1rem; color: #64748b; }</style></head><body>${sanitized}${bridgeScript}</body></html>`;
      } else {
        // JavaScript Enabled Mode: Origin isolated iframe with base tag
        const baseTag = `<base href="${currentUrl}">`;
        const bridgeScript = `
          <script>
            document.addEventListener('click', function(e) {
              var target = e.target.closest('a');
              if (target && target.href && !target.href.startsWith('javascript:')) {
                e.preventDefault();
                window.parent.postMessage({ type: 'SM_BROWSER_NAVIGATE', url: target.href }, '*');
              }
            }, true);
          </script>
        `;
        processedHtml = rawText.replace(/<head[^>]*>/i, `$&${baseTag}`).replace(/<\/body>/i, `${bridgeScript}</body>`);
      }
    }

    logNetworkEvent({
      id: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      url: currentUrl,
      sanitizedUrl: currentUrl,
      method,
      status: finalResponse.status,
      durationMs,
      isTorRouted,
      contentType,
      contentLength: Buffer.byteLength(processedHtml, 'utf8'),
      safeMode: Boolean(safeMode),
    });

    res.json({
      url: currentUrl,
      title: extractTitle(processedHtml) || currentUrl,
      status: finalResponse.status,
      contentType,
      content: processedHtml,
      isTorRouted,
      durationMs,
      safeMode: Boolean(safeMode),
      sanitizationEvents,
      headers: {
        'content-type': contentType,
        'server': finalResponse.headers.get('server') || 'Protected Gateway',
      },
    });
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    logNetworkEvent({
      id: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      url,
      sanitizedUrl: url,
      method,
      status: 500,
      durationMs,
      isTorRouted: false,
      contentType: 'application/json',
      contentLength: 0,
      blockedReason: err.message,
      safeMode: Boolean(safeMode),
    });

    res.status(500).json({
      error: 'Gateway Request Failed',
      message: err.message,
      url,
    });
  }
});

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

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
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
      appUrl: process.env.APP_URL || 'Local Dev Server',
    },
  });
});

// AI Assistant endpoint (Server-side Gemini using @google/genai)
app.post('/api/ai/analyze', async (req: Request, res: Response) => {
  const { action = 'summarize', text, targetLanguage = 'en', userConsent = false } = req.body;

  if (!userConsent) {
    return res.status(403).json({
      error: 'User consent required',
      message: 'Explicit user consent is required before sending sanitized page content to the Gemini API.',
    });
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'No text content provided for analysis' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'Gemini API Key Not Configured',
      message: 'GEMINI_API_KEY is not set in the environment secrets. Configure it in Settings > Secrets.',
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Truncate text to avoid token limits on long documents
    const safeContent = text.slice(0, 12000);

    let systemInstruction = 'You are the privacy-respecting SM BROWSER TOR assistant. Analyze only the user-provided webpage text cleanly, concisely, and objectively.';
    let prompt = '';

    if (action === 'summarize') {
      prompt = `Provide a concise, 3-to-5 bullet point executive summary of the following webpage content, followed by the main takeaway:\n\n${safeContent}`;
    } else if (action === 'explain') {
      prompt = `Identify the key technical concepts, cybersecurity/privacy terms, or complex ideas in this page text and explain each in 1-2 plain-language sentences:\n\n${safeContent}`;
    } else if (action === 'translate') {
      prompt = `Translate the core informative text of this document accurately and naturally into language '${targetLanguage}':\n\n${safeContent}`;
    } else {
      prompt = `Provide helpful analysis of this webpage content:\n\n${safeContent}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    res.json({
      success: true,
      action,
      result: response.text,
      modelUsed: 'gemini-3.8-flash',
      timestamp: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'AI Analysis Error',
      message: err.message,
    });
  }
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
