export async function handleError404(request) {
    // 1. Define HTML Content
    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 Not Found / ページが見つかりません</title>

  <link rel="icon" href="https://my.hamusata.f5.si/favicon.ico" sizes="any">
  <link rel="icon" href="https://my.hamusata.f5.si/icon.svg" type="image/svg+xml">
  <link rel="icon" href="https://my.hamusata.f5.si/icon.webp" type="image/webp">
  <link rel="apple-touch-icon" href="https://my.hamusata.f5.si/icon.png">

  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#2a9d8f">

  <link href="https://fonts.googleapis.com/css2?family=Potta+One&display=swap" rel="stylesheet">

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Potta One', 'Arial', 'Helvetica', sans-serif;
      overflow-wrap: break-word;
    }

    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      line-height: 2;
      font-size: clamp(1rem, 2vw, 1.2rem);
      font-weight: 500;
      padding: 3rem 2rem;
      transition: background-color 0.3s, color 0.3s;
    }

    body.light {
      background:
        radial-gradient(ellipse 80% 60% at 70% 20%, rgba(175,109,255,0.85), transparent 68%),
        radial-gradient(ellipse 70% 60% at 20% 80%, rgba(255,100,180,0.75), transparent 68%),
        radial-gradient(ellipse 60% 50% at 60% 65%, rgba(255,235,170,0.98), transparent 68%),
        radial-gradient(ellipse 65% 40% at 50% 60%, rgba(120,190,255,0.3), transparent 68%),
        linear-gradient(180deg, #f7eaff 0%, #fde2ea 100%);
      color: #000;
    }

    body.dark {
      background-color: #0a0a0a;
      background-image:
        radial-gradient(ellipse at 20% 30%, rgba(56,189,248,0.4) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.3) 0%, transparent 70%),
        radial-gradient(ellipse at 60% 20%, rgba(236,72,153,0.25) 0%, transparent 50%),
        radial-gradient(ellipse at 40% 80%, rgba(34,197,94,0.2) 0%, transparent 65%);
      color: #fff;
    }

    h1#page-title {
      font-size: clamp(2rem, 6vw, 4rem);
      margin-bottom: 3rem;
      line-height: 1.2;
      font-weight: 700;
    }

    p#page-desc {
      margin-bottom: 2rem;
    }

    p.subtext {
      margin-bottom: 3rem;
      color: inherit;
    }

    a.back {
      display: inline-block;
      padding: 1rem 2.5rem;
      border-radius: 28px;
      font-weight: 700;
      font-size: clamp(1rem, 1.5vw, 1.2rem);
      text-decoration: none;
      color: #fff;
      background-color: #00bcd4;
      box-shadow: 0 8px 25px rgba(0,0,0,0.35);
      margin-bottom: 3rem;
      transition: all 0.3s;
    }

    a.back:hover {
      background-color: #0097a7;
      transform: translateY(-4px);
    }

    footer {
      font-size: clamp(0.8rem, 1vw, 1rem);
      line-height: 1.6;
      margin-top: 2rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
    }

    footer a#footer-link {
      color: #ff77aa;
      font-weight: 700;
      text-decoration: none;
      transition: color 0.3s;
    }

    footer a#footer-link:hover {
      color: #ff3388;
    }

    #lang-switch {
      position: fixed;
      top: 16px;
      left: 16px;
      padding: 0.5rem 1rem;
      font-size: 0.95rem;
      border-radius: 14px;
      border: 1px solid rgba(0,0,0,0.2);
      background: rgba(255,255,255,0.15);
      -webkit-backdrop-filter: blur(16px);
      backdrop-filter: blur(16px);
      cursor: pointer;
      z-index: 1001;
      transition: all 0.2s ease;
    }

    #lang-switch:hover {
      transform: scale(1.05);
      background: rgba(0,188,212,0.18);
    }

    body.dark #lang-switch {
      background: rgba(0,0,0,0.35);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.12);
    }

    @media (max-width:600px) {
      h1#page-title {
        font-size: clamp(1.6rem, 10vw, 2.5rem);
      }
      a.back {
        padding: 0.8rem 2rem;
        font-size: 1rem;
      }
    }
  </style>
</head>

<body>
  <h1>404 - error</h1>
  <p>エラーが発生しました: 見つかりません / Not Found</p>
  <p class="subtext">Sorry, Not Found.</p>
  <a id="backLink" class="back" href="/">トップページへ戻る / Back to Home</a>

  <script>
    (() => {
      const backLink = document.getElementById("backLink");
      if (!backLink) return;

      const path = window.location.pathname;

      if (path.startsWith("/gos/yt/")) {
        backLink.href = "/gos/yt";
        return;
      }

      if (path.startsWith("/gos/")) {
        backLink.href = "/gos/";
      }
    })();
  </script>

  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js');
      });
    }
  </script>
</body>
</html>`;

    // 2. Generate ETag
    const encoder = new TextEncoder();
    const data = encoder.encode(html);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const etag = `"${hashArray.map(b => b.toString(16).padStart(2, '0')).join('')}"`;

    // 3. Check If-None-Match (304)
    if (request.headers.get('If-None-Match') === etag) {
        return new Response(null, {
            status: 304,
            headers: { "ETag": etag, "Cache-Control": "public, max-age=3600" }
        });
    }

    // 4. Return 404 Response
    return new Response(html, {
        status: 404,
        headers: {
            "Content-Type": "text/html; charset=UTF-8",
            "ETag": etag,
            "Cache-Control": "public, max-age=3600"
        },
    });
}
