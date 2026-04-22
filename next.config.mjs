/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" }
    ]
  },
  /**
   * Baseline security headers. We avoid setting a strict CSP here because
   * Next.js inlines runtime scripts (RSC payloads, font preloads); a full
   * CSP would require integrating per-request nonces. The headers below
   * still meaningfully reduce common attack surface.
   */
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload"
      }
    ];
    return [{ source: "/:path*", headers: securityHeaders }];
  }
};

export default nextConfig;
