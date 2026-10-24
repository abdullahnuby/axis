# Vercel build fix

The Vercel type-check error was caused by passing a Node.js `Buffer<ArrayBufferLike>` directly to `NextResponse`. Replace that response body with a fresh typed array backed by an `ArrayBuffer`.

```ts
const body = new Uint8Array(document.content.byteLength);
body.set(document.content);
return new NextResponse(body.buffer, { headers: {
  "Content-Type": document.content_type,
  "Content-Disposition": `inline; filename="${filename}"`,
  "Cache-Control": "no-store, private",
  "X-Content-Type-Options": "nosniff",
} });
```

File: `src/app/api/admin/documents/[documentId]/route.ts`

The fix is included in this ZIP. Run `npm run build` in Vercel after pushing the changed file to `main`. Local static smoke tests pass, but a local production build could not be confirmed because the package install timed out in the current environment.
