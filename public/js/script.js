// js/script.js

// ===== 年自動更新 =====
const baseYear = 2025;
const now = new Date().getFullYear();
const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = now > baseYear ? `${baseYear}~${now}` : `${baseYear}`;
}


// ===== テーマ監視 (適用自体はHEAD内のインラインスクリプトで行い、ここではシステム設定変更のみを追従) =====
if (!new URLSearchParams(window.location.search).has('theme')) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    document.documentElement.className = e.matches ? 'dark' : 'light';
  });
}


// ===== ハンバーガーメニュー開閉 =====
const menuToggle = document.getElementById('menu-toggle');
const menuOverlay = document.getElementById('menu-overlay');

if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    document.body.classList.toggle('menu-open');
  });
}

if (menuOverlay) {
  menuOverlay.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
  });
}


// ===== #home スクロール処理 =====
function menuScrollToHome(event) {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.replaceState(null, '', ' ');
  document.body.classList.remove('menu-open');
}

document.querySelectorAll('.nav-home')
        .forEach(el => el.addEventListener('click', menuScrollToHome));


// ===== 内部リンクURLパラメータ維持 =====
(function() {
  const currentParams = window.location.search;
  if (!currentParams) return;

  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    // SNSセクション内のリンクは除外
    if (link.closest('#sns')) return;

    const url = new URL(link.href, window.location.origin);

    // 外部リンクを除外
    if (url.origin !== window.location.origin) return;

    // すでにクエリがある場合は追加せず
    if (url.search) return;

    url.search = currentParams;
    link.href = url.pathname + url.search + url.hash;
  });
})();


// ===== WebMCP Implementation =====
(function() {
  if (typeof navigator !== 'undefined' && navigator.modelContext && navigator.modelContext.provideContext) {
    try {
      navigator.modelContext.provideContext({
        tools: [
          {
            name: "navigate_to",
            description: "Navigate to a specific page on the site (home, sub, terms, countdown).",
            inputSchema: {
              type: "object",
              properties: {
                page: {
                  type: "string",
                  enum: ["home", "sub", "terms", "countdown"],
                  description: "The page identifier to navigate to."
                }
              },
              required: ["page"]
            },
            execute: async ({ page }) => {
              const routes = {
                home: "/",
                sub: "/sub",
                terms: "/terms",
                countdown: "/countdown"
              };
              const target = routes[page] || "/";
              window.location.href = target;
              return { success: true, message: `Navigating to ${page}...` };
            }
          },
          {
            name: "get_site_info",
            description: "Returns general information about this site, including available features and links.",
            inputSchema: {
              type: "object",
              properties: {}
            },
            execute: async () => {
              return {
                site_name: "Hamusata Personal Site",
                owner: "@hamusata",
                features: [
                  "Personal profile and links",
                  "Subscription/Service pages",
                  "New Year Countdown timer",
                  "Agent-Ready discovery endpoints (.well-known)"
                ],
                available_pages: ["/", "/sub", "/terms", "/countdown"]
              };
            }
          }
        ]
      });
      console.log('WebMCP tools provided successfully.');
    } catch (err) {
      console.error('Failed to provide WebMCP context:', err);
    }
  }
})();
