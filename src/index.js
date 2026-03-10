import { handleMiddleware } from './middleware.js';
import { handleCountdown } from './handlers/countdown.js';
import { handleRickRoll } from './handlers/rickroll.js';
import { handleHome } from './handlers/home.js';
import { handleSub } from './handlers/sub.js';
import { handleTerms } from './handlers/terms.js';
import { handleError404 } from './handlers/error404.js';
import { handleRedirects } from './handlers/redirects.js';
import { handleYt } from './handlers/yt.js';

export default {
  async fetch(request, env, ctx) {
    const handleRequest = async (request, env, ctx) => {
      const url = new URL(request.url);
      let pathname = url.pathname.toLowerCase();

      // =================================================================
      // 1. URL Normalization & Canonicalization
      // =================================================================

      // --- /index, /index.html -> / ---
      if (pathname === '/index' || pathname === '/index.html') {
        url.pathname = '/';
        return Response.redirect(url.toString(), 301);
      }

      // --- /path/index, /path/index.html -> /path/ ---
      if (pathname.endsWith('/index') || pathname.endsWith('/index.html')) {
        const basePath = pathname.endsWith('/index.html')
          ? pathname.slice(0, -'/index.html'.length)
          : pathname.slice(0, -'/index'.length);

        url.pathname = `${basePath || '/'}${basePath === '' ? '' : '/'}`;
        return Response.redirect(url.toString(), 301);
      }

      // --- .html extension removal ---
      if (pathname.endsWith('.html')) {
        pathname = pathname.slice(0, -5) || '/';
        url.pathname = pathname;
        return Response.redirect(url.toString(), 301);
      }

      // --- Collapse duplicate slashes ---
      const collapsedPathname = pathname.replace(/\/{2,}/g, '/');
      if (collapsedPathname !== pathname) {
        url.pathname = collapsedPathname;
        return Response.redirect(url.toString(), 301);
      }

      // --- Remove trailing slash (except root) ---
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
        url.pathname = pathname;
        return Response.redirect(url.toString(), 301);
      }

      // --- Ensure root path is '/' ---
      if (pathname === '') {
        pathname = '/';
      }

      // --- Canonicalize specific single-page routes ---
      // e.g. /sub/ui, /countdown/ui, /404/ui -> base route
      const singlePageRoutes = new Set(['/sub', '/countdown', '/404']);
      const firstSegment = `/${pathname.split('/').filter(Boolean)[0] || ''}`;

      if (singlePageRoutes.has(firstSegment) && pathname !== firstSegment) {
        url.pathname = firstSegment;
        return Response.redirect(url.toString(), 301);
      }


      // =================================================================
      // 2. Middleware Processing
      // =================================================================
      const middlewareResponse = handleMiddleware(request);
      if (middlewareResponse) {
        return middlewareResponse;
      }


      // =================================================================
      // 3. Redirects
      // =================================================================
      const redirectResponse = handleRedirects(request, pathname);
      if (redirectResponse) {
        return redirectResponse;
      }


      // =================================================================
      // 4. Feature Routes
      // =================================================================
      switch (pathname) {
        case '/':
          return handleHome(request);

        case '/sub':
          return handleSub(request);

        case '/terms':
          return handleTerms(request);

        case '/countdown':
          return handleCountdown(request);

        case '/yt':
          return handleYt(request);

        case '/404':
          // Special handling: Return 404 page content with 200 OK status
          const newHeaders = new Headers(request.headers);
          newHeaders.delete('If-None-Match');

          const newReq = new Request(request, { headers: newHeaders });
          const res = await handleError404(newReq);

          return new Response(res.body, {
            status: 200,
            headers: res.headers
          });
      }

      // --- RickRoll Handler ---
      if (pathname.startsWith('/r/')) {
        return handleRickRoll(request);
      }


      // =================================================================
      // 5. Static Assets (Cloudflare Pages / Workers Sites)
      // =================================================================
      if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status !== 404) {
          // 効率的なキャッシュ期間を設定
          const newHeaders = new Headers(assetResponse.headers);
          const url = new URL(request.url);
          const fileExtension = url.pathname.split('.').pop().toLowerCase();

          // ファイルタイプに基づいてCache-Controlを設定
          // 画像やフォントは長期間キャッシュ
          if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'woff', 'woff2'].includes(fileExtension)) {
            newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
          }
          // CSS, JSはバージョン管理されていることを期待し、少し長めに設定
          else if (['css', 'js'].includes(fileExtension)) {
            newHeaders.set('Cache-Control', 'public, max-age=604800'); // 1 week
          }

          return new Response(assetResponse.body, {
            ...assetResponse,
            headers: newHeaders,
          });
        }
      }

      // =================================================================
      // 6. 404 Fallback
      // =================================================================
      return handleError404(request);
    };

    const response = await handleRequest(request, env, ctx);

    // セキュリティヘッダーをHTMLレスポンスに追加
    const contentType = response.headers.get('content-type') || '';
    if (response.status >= 200 && response.status < 400 && contentType.includes('text/html')) {
      const newHeaders = new Headers(response.headers);

      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://docs.google.com https://www.googletagmanager.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: *.googleusercontent.com i.imgur.com",
        "connect-src 'self' https://docs.google.com https://analytics.google.com https://stats.g.doubleclick.net https://www.google.com",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');

      newHeaders.set('Content-Security-Policy', csp);
      newHeaders.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
      newHeaders.set('X-Content-Type-Options', 'nosniff');
      newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
      newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    return response;
  },
};