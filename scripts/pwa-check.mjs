import { access, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
const root = process.cwd();
const read = file => readFile(path.join(root, file), "utf8");
const exists = async file => { try { await access(path.join(root, file)); return true; } catch { return false; } };
const checks = [];
function check(name, fn) { fn(); checks.push(name); }
for (const file of ["public/manifest.webmanifest", "public/sw.js", "public/offline.html", "public/axis-mark.svg", "public/axis-logo.svg", "public/axis-logo-dark.svg", "public/icons/axis-app-icon.svg", "public/icons/icon-192.png", "public/icons/icon-512.png", "public/icons/icon-maskable-512.png", "public/icons/apple-touch-icon.png", "src/components/PWAProvider.tsx", "src/components/PWAInstallButton.tsx"]) {
  assert.equal(await exists(file), true, `${file} is missing`);
}
const manifest = JSON.parse(await read("public/manifest.webmanifest"));
const sw = await read("public/sw.js");
const provider = await read("src/components/PWAProvider.tsx");
const layout = await read("src/app/layout.tsx");
const homepage = await read("src/app/page.tsx");
const login = await read("src/app/api/auth/login/route.ts");
const appIcon = await read("public/icons/axis-app-icon.svg");
check("manifest declares standalone RTL app", () => { assert.equal(manifest.display, "standalone"); assert.equal(manifest.dir, "rtl"); assert.equal(manifest.icons.length >= 3, true); });
check("PWA theme and background match the AXIS palette", () => { assert.equal(manifest.theme_color, "#007BFF"); assert.equal(manifest.background_color, "#F8FCFF"); });
check("service worker never caches API responses", () => assert.match(sw, /url\.pathname\.startsWith\("\/api\/"\)/));
check("service worker excludes private route caches", () => assert.match(sw, /url\.pathname\.startsWith\("\/admin"\)/));
check("service worker caches only static asset routes", () => { assert.match(sw, /url\.pathname\.startsWith\("\/_next\/static\/"\)/); assert.match(sw, /url\.pathname\.startsWith\("\/icons\/"\)/); });
check("PWA provider registers secure service worker", () => assert.match(provider, /serviceWorker\.register\("\/sw\.js"/));
check("manifest is linked from app metadata", () => assert.match(layout, /manifest: "\/manifest\.webmanifest"/));
check("app icons use the supplied blue/cyan AXIS mark", () => { assert.match(appIcon, /#007BFF/); assert.match(appIcon, /#00C4CC/); });
check("service worker cache version changed for new brand assets", () => { assert.match(sw, /CACHE_NAME = `\$\{CACHE_PREFIX\}v3`/); assert.match(sw, /axis-logo\.svg/); });
check("responsive glossary uses mobile-safe grid class", () => assert.match(homepage, /features glossary-grid/));
check("regular login routes staff users to the platform feed", () => assert.match(login, /\? "\/feed" : "\/verification"/));
console.log(`AXIS PWA checks: ${checks.length} passed`);
for (const name of checks) console.log(`✓ ${name}`);
console.log("✓ required manifest, icon, service-worker and install files exist");
