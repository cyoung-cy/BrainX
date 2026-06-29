const faviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="brainx-admin-favicon" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ea580c" />
      <stop offset="0.55" stop-color="#2563eb" />
      <stop offset="1" stop-color="#0f766e" />
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#brainx-admin-favicon)" />
  <path
    d="M22 20h15c5.523 0 10 4.477 10 10s-4.477 10-10 10h-6v8h-9V20Zm9 19h6a4 4 0 1 0 0-8h-6v8Z"
    fill="#fff"
  />
</svg>
`.trim();

export async function GET() {
  return new Response(faviconSvg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable"
    }
  });
}
