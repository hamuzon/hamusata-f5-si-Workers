// =================================================================
// Configuration & Constants
// =================================================================
const ENABLED = 1; // 0 = OFF, 1 = ON, 2 = Domain Unification (Force Target Domain)
const TARGET_DOMAIN = "my.hamusata.f5.si";

const EXCLUDED_EXTENSIONS = new Set([
    '.webp', '.png', '.ico', '.svg', '.jpg', '.jpeg', '.gif', '.avif',
    '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv',
    '.mp3', '.wav', '.aac',
    '.woff', '.woff2', '.ttf', '.eot',
    '.css', '.js', '.json',
    '.zip', '.rar', '.7z', '.tar', '.gz'
]);

const BOT_REGEX = /bot|googlebot|bingbot|yandex|baidu|duckduckbot|slurp|ia_archiver/i;

export async function handleMiddleware(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    // =================================================================
    // 0. Agent Discovery & .well-known Endpoints (Actual Data)
    // =================================================================
    if (pathname.startsWith("/.well-known/")) {
        if (pathname === "/.well-known/api-catalog") {
            return new Response(JSON.stringify({
                "linkset": [
                    {
                        "anchor": `https://${hostname}/`,
                        "service-desc": [
                            { "href": `https://${hostname}/lang/lang.json`, "type": "application/json" },
                            { "href": `https://${hostname}/.well-known/openid-configuration`, "type": "application/json" },
                            { "href": `https://${hostname}/.well-known/oauth-authorization-server`, "type": "application/json" },
                            { "href": `https://${hostname}/.well-known/oauth-protected-resource`, "type": "application/json" }
                        ],
                        "service-doc": [
                            { "href": "https://github.com/hamuzon/hamusata-f5-si-Workers#readme", "type": "text/html" }
                        ],
                        "agent-skills": [
                            { "href": `https://${hostname}/.well-known/agent-skills/index.json`, "type": "application/json" }
                        ],
                        "mcp-server-card": [
                            { "href": `https://${hostname}/.well-known/mcp/server-card.json`, "type": "application/json" }
                        ]
                    }
                ]
            }, null, 2), { headers: { "Content-Type": "application/linkset+json; charset=utf-8" } });
        }

        if (pathname === "/.well-known/agent-skills/index.json") {
            return new Response(JSON.stringify({
                "skills": [
                    {
                        "name": "Markdown Negotiation",
                        "type": "negotiation",
                        "description": "Supports Accept: text/markdown to provide structured content for agents.",
                        "url": `https://${hostname}/`,
                        "methods": ["GET"]
                    },
                    {
                        "name": "Countdown Utility",
                        "type": "utility",
                        "description": "Provides a countdown timer and event tracking interface.",
                        "url": `https://${hostname}/countdown`,
                        "methods": ["GET"]
                    },
                    {
                        "name": "OAuth Discovery",
                        "type": "discovery",
                        "description": "Exposes OAuth/OIDC metadata for server discovery.",
                        "url": `https://${hostname}/.well-known/openid-configuration`,
                        "methods": ["GET"]
                    },
                    {
                        "name": "OAuth Protected Resource",
                        "type": "discovery",
                        "description": "Exposes metadata for protected resources and their auth servers.",
                        "url": `https://${hostname}/.well-known/oauth-protected-resource`,
                        "methods": ["GET"]
                    }
                ]
            }, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
        }

        if (pathname === "/.well-known/mcp/server-card.json") {
            return new Response(JSON.stringify({
                "serverInfo": {
                    "name": "HAMUSATA Workers MCP Server",
                    "version": "1.0.0",
                    "description": "Exposes worker-based tools and routing metadata."
                },
                "capabilities": { "tools": { "listChanged": true } },
                "transport": { "type": "webmcp", "url": `https://${hostname}/` }
            }, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
        }

        // --- OAuth/OIDC Discovery ---
        if (pathname === "/.well-known/openid-configuration" || pathname === "/.well-known/oauth-authorization-server") {
            return new Response(JSON.stringify({
                "issuer": `https://${hostname}`,
                "authorization_endpoint": `https://${hostname}/auth/authorize`,
                "token_endpoint": `https://${hostname}/auth/token`,
                "jwks_uri": `https://${hostname}/.well-known/jwks.json`,
                "response_types_supported": ["code", "token", "id_token"],
                "subject_types_supported": ["public"],
                "id_token_signing_alg_values_supported": ["RS256"],
                "grant_types_supported": ["authorization_code", "client_credentials"],
                "scopes_supported": ["openid", "profile", "email", "read", "write"]
            }, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
        }

        if (pathname === "/.well-known/oauth-protected-resource") {
            return new Response(JSON.stringify({
                "resource": `https://${hostname}/`,
                "authorization_servers": [`https://${hostname}`],
                "scopes_supported": ["read", "write"]
            }, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
        }
    }

    // =================================================================
    // 1. Markdown Negotiation (Accept: text/markdown)
    // =================================================================
    const acceptHeader = request.headers.get("accept") || "";
    if (acceptHeader.includes("text/markdown")) {
        let md = "";
        if (pathname === "/" || pathname === "/index") {
            md = `# hamusata-f5-si-workers (Agent Mode)
            
Cloudflare Workers上で動作する、HAMUSATAプロジェクトのバックエンドエンジンです。

## 利用可能なツールとページ
- [ホームページ](/) - メインポータル
- [カウントダウン](/countdown) - 指定した日時までのカウントダウン表示
- [利用規約](/terms) - サービス利用規約・プライバシーポリシー

## 技術仕様
- **Runtime**: Cloudflare Workers
- **Security**: CSP, HSTS, X-Content-Type-Options 等を自動付与
- **Features**: URL正規化、静的アセット配信、ダイナミックルーティング`;
        } else if (pathname === "/countdown") {
            md = `# Countdown Utility
翌年の元旦までの残り時間をリアルタイムで表示するカウントダウンタイマーです。
元旦までの残り日数、時間、分、秒をリアルタイムに計算し、 Orbitronフォントを使用したサイバーパンクなデザインで表示します。`;
        } else if (pathname === "/terms") {
            md = `# 利用規約・プライバシーポリシー
当サイト（my.hamusata.f5.si）の利用規約およびプライバシーポリシーです。
基本的には HAMUSATA プロジェクトの全体規約に準拠し、ユーザーのプライバシー保護と透明性の確保に努めています。`;
        } else {
            md = `# HAMUSATA Workers (Agent Mode)
Requested Path: ${pathname}

申し訳ありませんが、このページ専用のMarkdownコンテンツはまだ詳細に構成されていません。
サイトの主要な機能については [ホームページ](/) をご覧ください。`;
        }

        const tokenCount = Math.ceil(md.length / 4);
        return new Response(md, {
            headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                "X-Markdown-Tokens": tokenCount.toString(),
                "Vary": "Accept",
                "Content-Signal": "ai-train=yes, search=yes, ai-input=yes",
                "Link": [
                    '</.well-known/api-catalog>; rel="api-catalog"',
                    '</.well-known/agent-skills/index.json>; rel="agent-skills"',
                    '</.well-known/mcp/server-card.json>; rel="mcp-server-card"'
                ].join(", ")
            }
        });
    }

    // 2. Basic Exclusions (Favicon & Static Assets)
    if (pathname === "/favicon.ico") {
        return null;
    }

    const lastDotIndex = pathname.lastIndexOf('.');
    if (lastDotIndex !== -1) {
        const ext = pathname.slice(lastDotIndex);
        if (EXCLUDED_EXTENSIONS.has(ext)) {
            return null;
        }
    }


    // =================================================================
    // Mode 2: Domain Unification (High Priority)
    // =================================================================
    if (ENABLED === 2) {
        if (hostname !== TARGET_DOMAIN) {
            url.hostname = TARGET_DOMAIN;
            return Response.redirect(url.toString(), 302);
        }
        return null; // Already on target domain, skip further middleware
    }


    // =================================================================
    // Mode 1: Mobile/PC Redirect Logic
    // =================================================================

    // 3. Domain Scope Check
    if (!hostname.endsWith(TARGET_DOMAIN)) {
        return null;
    }

    // 4. Bot Detection (Skip redirects for bots)
    const userAgent = request.headers.get("user-agent") || "";
    if (BOT_REGEX.test(userAgent)) {
        return null;
    }

    if (ENABLED === 1) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Opera Mini/i.test(userAgent);
        const baseWithoutWWW = hostname.replace(/^www\./, "");
        const hasM = baseWithoutWWW.startsWith("m.");
        const pureBase = baseWithoutWWW.replace(/^m\./, "");

        if (isMobile && !hasM) {
            url.hostname = `www.m.${pureBase}`;
            return Response.redirect(url.toString(), 302);
        }

        if (!isMobile && hasM) {
            url.hostname = `www.${pureBase}`;
            return Response.redirect(url.toString(), 302);
        }
    }

    return null;
}
