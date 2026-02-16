// --- Constants ---
const ENABLED = 0; // 0 = OFF, 1 = ON, 2 = Domain Unification
const TARGET_DOMAIN = "hamusata.f5.si";

const EXCLUDED_EXTENSIONS = new Set([
    '.webp', '.png', '.ico', '.svg', '.jpg', '.jpeg', '.gif', '.avif',
    '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv',
    '.mp3', '.wav', '.aac',
    '.woff', '.woff2', '.ttf', '.eot',
    '.css', '.js', '.json',
    '.zip', '.rar', '.7z', '.tar', '.gz'
]);

const BOT_REGEX = /bot|googlebot|bingbot|yandex|baidu|duckduckbot|slurp|ia_archiver/i;

export function handleMiddleware(request) {
    if (ENABLED === 0) return null;

    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    // --- Basic Exclusions ---
    if (pathname === "/favicon.ico") return null;

    // Static Assets Check
    const lastDotIndex = pathname.lastIndexOf('.');
    if (lastDotIndex !== -1) {
        const ext = pathname.slice(lastDotIndex);
        if (EXCLUDED_EXTENSIONS.has(ext)) return null;
    }

    // --- Mode 2: Domain Unification (High Priority) ---
    if (ENABLED === 2) {
        if (hostname !== TARGET_DOMAIN) {
            url.hostname = TARGET_DOMAIN;
            return Response.redirect(url.toString(), 302);
        }
        return null; // Already on target domain, skip further middleware
    }

    // --- Domain Target Check (for Mode 1) ---
    if (!hostname.endsWith(TARGET_DOMAIN)) return null;

    // Bot Detection (Expensive)
    const userAgent = request.headers.get("user-agent") || "";
    if (BOT_REGEX.test(userAgent)) return null;

    // --- Mode 1: Mobile/PC Redirect ---
    if (ENABLED === 1) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
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
