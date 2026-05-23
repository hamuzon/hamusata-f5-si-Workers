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

export async function handleMiddleware(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    // 0. Global Kill Switch
    if (ENABLED === 0) {
        return null;
    }

    const acceptHeader = request.headers.get("accept") || "";

    // =================================================================
    // 1. Basic Exclusions (Early Return for Performance)
    // =================================================================
    if (pathname === "/favicon.ico") return null;
    
    const lastDotIndex = pathname.lastIndexOf('.');
    if (lastDotIndex !== -1) {
        if (EXCLUDED_EXTENSIONS.has(pathname.slice(lastDotIndex))) return null;
    }

    // =================================================================
    // 2. Domain Unification
    // =================================================================
    if (ENABLED === 2 && hostname !== TARGET_DOMAIN) {
        url.hostname = TARGET_DOMAIN;
        return Response.redirect(url.toString(), 302);
    }

    // =================================================================
    // 3. .well-known Endpoints
    // =================================================================
    if (pathname.startsWith("/.well-known/")) {
        const jsonResponse = (data, contentType = "application/json") => 
            new Response(JSON.stringify(data, null, 2), { 
                headers: { "Content-Type": `${contentType}; charset=utf-8` } 
            });

        switch (pathname) {
            case "/.well-known/api-catalog":
                return jsonResponse({
                    "linkset": [{
                        "anchor": `https://${hostname}/`,
                        "service-desc": [
                            { "href": `https://${hostname}/lang/lang.json`, "type": "application/json" },
                            { "href": `https://${hostname}/.well-known/openid-configuration`, "type": "application/json" },
                            { "href": `https://${hostname}/.well-known/oauth-authorization-server`, "type": "application/json" },
                            { "href": `https://${hostname}/.well-known/oauth-protected-resource`, "type": "application/json" }
                        ],
                        "service-doc": [{ "href": "https://github.com/hamuzon/hamusata-f5-si-Workers#readme", "type": "text/html" }],
                        "agent-skills": [{ "href": `https://${hostname}/.well-known/agent-skills/index.json`, "type": "application/json" }],
                        "mcp-server-card": [{ "href": `https://${hostname}/.well-known/mcp/server-card.json`, "type": "application/json" }]
                    }]
                }, "application/linkset+json");

            case "/.well-known/agent-skills/index.json":
                return jsonResponse({
                    "skills": [
                        { "name": "Markdown Negotiation", "type": "negotiation", "description": "Supports Accept: text/markdown", "url": `https://${hostname}/`, "methods": ["GET"] },
                        { "name": "Countdown Utility", "type": "utility", "description": "Provides a countdown timer", "url": `https://${hostname}/countdown`, "methods": ["GET"] },
                        { "name": "OAuth Discovery", "type": "discovery", "description": "Exposes metadata", "url": `https://${hostname}/.well-known/openid-configuration`, "methods": ["GET"] }
                    ]
                });

            case "/.well-known/mcp/server-card.json":
                return jsonResponse({
                    "serverInfo": { "name": "HAMUSATA Workers MCP Server", "version": "1.0.0" },
                    "capabilities": { "tools": { "listChanged": true } },
                    "transport": { "type": "webmcp", "url": `https://${hostname}/` }
                });

            case "/.well-known/openid-configuration":
            case "/.well-known/oauth-authorization-server":
                return jsonResponse({
                    "issuer": `https://${hostname}`,
                    "authorization_endpoint": `https://${hostname}/auth/authorize`,
                    "token_endpoint": `https://${hostname}/auth/token`,
                    "jwks_uri": `https://${hostname}/.well-known/jwks.json`,
                    "response_types_supported": ["code", "token", "id_token"],
                    "grant_types_supported": ["authorization_code", "client_credentials"]
                });

            case "/.well-known/oauth-protected-resource":
                return jsonResponse({
                    "resource": `https://${hostname}/`,
                    "authorization_servers": [`https://${hostname}`],
                    "scopes_supported": ["read", "write"]
                });
        }
    }

    // =================================================================
    // 4. Markdown Negotiation
    // =================================================================
    if (acceptHeader.includes("text/markdown")) {
        const getMarkdownContent = (path) => {
            if (path === "/" || path === "/index") return `# hamusata-f5-si-workers (Agent Mode)\n\nCloudflare Workers上で動作する、HAMUSATAプロジェクトのバックエンドエンジンです。`;
            if (path === "/countdown") return `# Countdown Utility\n翌年の元旦までの残り時間をリアルタイムで表示するカウントダウンタイマーです。`;
            if (path === "/terms") return `# 利用規約・プライバシーポリシー\n当サイトの利用規約およびプライバシーポリシーです。`;
            return `# HAMUSATA Workers (Agent Mode)\nRequested Path: ${path}\n\nサイトの主要な機能については ホームページ をご覧ください。`;
        };

        const md = getMarkdownContent(pathname);
        return new Response(md, {
            headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                "X-Markdown-Tokens": Math.ceil(md.length / 4).toString(),
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

    return null;
}
