/**
 * Site-wide configuration. Centralized so future phases can extend
 * branding, navigation, and pricing without touching components.
 */
export const siteConfig = {
  name: "Nexora",
  tagline: "The Operating System for Modern Communities",
  description:
    "Nexora is a futuristic SaaS platform that helps you launch, manage, and scale your Discord-powered community with elegance.",
  url: "https://nexora.app",
  github: "https://github.com/osama182588-prog/Nexora-web-new",
  nav: [
    { label: "Features", href: "#features" },
    { label: "Showcase", href: "#showcase" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" }
  ]
} as const;

export type SiteConfig = typeof siteConfig;
