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
    const url = new URL(request.url);
    let pathname = url.pathname.toLowerCase();

    // Canonicalize /.../index(.html) -> /.../
    if (pathname === '/index' || pathname === '/index.html') {
      url.pathname = '/';
      return Response.redirect(url.toString(), 301);
    }
    if (pathname.endsWith('/index') || pathname.endsWith('/index.html')) {
      const basePath = pathname.endsWith('/index.html')
        ? pathname.slice(0, -'/index.html'.length)
        : pathname.slice(0, -'/index'.length);
      url.pathname = `${basePath || '/'}${basePath === '' ? '' : '/'}`;
      return Response.redirect(url.toString(), 301);
    }

    // Canonicalize /page.html -> /page
    if (pathname.endsWith('.html')) {
      pathname = pathname.slice(0, -5) || '/';
      url.pathname = pathname;
      return Response.redirect(url.toString(), 301);
    }

    // Collapse duplicate slashes first (e.g. /terms//ui -> /terms/ui)
    const collapsedPathname = pathname.replace(/\/{2,}/g, '/');
    if (collapsedPathname !== pathname) {
      url.pathname = collapsedPathname;
      return Response.redirect(url.toString(), 301);
    }

    // Normalize trailing slash (except root) and redirect to canonical path.
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
      url.pathname = pathname;
      return Response.redirect(url.toString(), 301);
    }
    if (pathname === '') pathname = '/';

    // Canonicalize malformed child paths for single-page routes.
    // e.g. /sub/ui, /countdown/ui, /404/ui -> base route
    const singlePageRoutes = new Set(['/sub', '/countdown', '/404']);
    const firstSegment = `/${pathname.split('/').filter(Boolean)[0] || ''}`;
    if (singlePageRoutes.has(firstSegment) && pathname !== firstSegment) {
      url.pathname = firstSegment;
      return Response.redirect(url.toString(), 301);
    }

    // Analytics Engine へのログ送信
    // バインディング名にハイフンが含まれるため env["..."] でアクセスします
    if (env["Data-hamusata-1"]) {
      ctx.waitUntil(
        (async () => {
          env["Data-hamusata-1"].writeDataPoint({
            blobs: [
              request.method,                        // Blob 1: Method
              pathname,                              // Blob 2: Path
              request.cf?.country || "XX",           // Blob 3: Country
              request.headers.get("user-agent") || "" // Blob 4: UA
            ],
            doubles: [1], // カウント用などに数値を入れる (例: 1リクエスト=1)
            indexes: ["hamusata-1"] // フィルタリング用のインデックス
          });
        })()
      );
    }

    // 1. Middleware
    const middlewareResponse = handleMiddleware(request);
    if (middlewareResponse) return middlewareResponse;

    // 2. Redirects
    const redirectResponse = handleRedirects(request, pathname);
    if (redirectResponse) return redirectResponse;

    // 3. Feature Routes & Static HTML Replacement
    if (pathname === '/') {
      return handleHome(request);
    }
    if (pathname === '/sub') {
      return handleSub(request);
    }
    if (pathname === '/terms') {
      return handleTerms(request);
    }
    if (pathname === '/countdown') {
      return handleCountdown(request);
    }
    if (pathname === '/yt') {
      return handleYt(request);
    }
    if (pathname === '/404') {
      const newHeaders = new Headers(request.headers);
      newHeaders.delete('If-None-Match'); // 強制的に本文を取得するためETagを削除
      const newReq = new Request(request, { headers: newHeaders });
      const res = await handleError404(newReq);
      return new Response(res.body, {
        status: 200, // キャッシュ用に200で返す
        headers: res.headers
      });
    }
    if (pathname.startsWith('/r/')) {
      return handleRickRoll(request);
    }

    // 4. Static Assets
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    return handleError404(request);
  },
};
