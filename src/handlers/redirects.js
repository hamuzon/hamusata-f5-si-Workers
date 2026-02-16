const REDIRECTS = new Map([
    ["/x", "https://x.com/hamu_sata"],
    ["/x-1", "https://x.com/hamu_sata"],
    ["/twt", "https://x.com/i/user/1797783565670952960"],
    ["/twitter", "https://x.com/hamu_sata"],
    ["/twitter-1", "https://x.com/hamu_sata"],
    ["/s", "https://scratch.mit.edu/users/hamusata"],
    ["/s-1", "https://scratch.mit.edu/users/hamusata"],
    ["/s-2", "https://scratch.mit.edu/users/hamuzon"],
    ["/scratch", "https://scratch.mit.edu/users/hamusata"],
    ["/scratch-1", "https://scratch.mit.edu/users/hamusata"],
    ["/scratch-2", "https://scratch.mit.edu/users/hamuzon"],
    ["/g", "https://github.com/hamuzon"],
    ["/g-1", "https://github.com/hamuzon"],
    ["/github", "https://github.com/hamuzon"],
    ["/github-1", "https://github.com/hamuzon"],
    ["/b", "https://bsky.app/profile/hamusata.f5.si"],
    ["/b-1", "https://bsky.app/profile/hamuzon-jp.f5.si"],
    ["/bs", "https://bsky.app/profile/hamusata.f5.si"],
    ["/bs-1", "https://bsky.app/profile/hamuzon-jp.f5.si"],
    ["/bluesky", "https://bsky.app/profile/hamusata.f5.si"],
    ["/bluesky-1", "https://bsky.app/profile/hamuzon-jp.f5.si"],
    ["/d", "https://device-info.hamusata.f5.si/"],
    ["/d-1", "https://device-info.hamusata.f5.si/"],
    ["/device", "https://device-info.hamusata.f5.si/"],
    ["/device-info", "https://device-info.hamusata.f5.si/"],
    ["/license", "/"],
    ["/readme.md", "/"],
     ["/index", "/"],
    ["/go", "/links"],
    ["/link", "/links"],
    ["/mutual_links", "/links"],
    ["/terms/ui", "/terms"],
]);

export function handleRedirects(request, normalizedPath) {
    const target = REDIRECTS.get(normalizedPath);
    if (target) {
        return Response.redirect(new URL(target, request.url).toString(), 301);
    }
    return null;
}
