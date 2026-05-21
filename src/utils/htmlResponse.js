const etagCache = new Map();

async function getEtag(html) {
  let etagPromise = etagCache.get(html);
  if (!etagPromise) {
    etagPromise = (async () => {
      const data = new TextEncoder().encode(html);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return `"${hashArray.map(b => b.toString(16).padStart(2, '0')).join('')}"`;
    })();
    etagCache.set(html, etagPromise);
  }
  return etagPromise;
}

export async function createHtmlResponse(request, html, options = {}) {
  const { status = 200, contentType = 'text/html; charset=UTF-8' } = options;
  const etag = await getEtag(html);

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': 'public, max-age=3600' }
    });
  }

  return new Response(html, {
    status,
    headers: {
      'Content-Type': contentType,
      ETag: etag,
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
