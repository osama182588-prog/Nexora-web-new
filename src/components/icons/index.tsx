import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const baseProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

function withSize({ size, ...rest }: IconProps) {
  return { ...baseProps, ...rest, ...(size ? { width: size, height: size } : {}) };
}

export const Icon = {
  Logo: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="M12 2 4 7v10l8 5 8-5V7l-8-5z" />
      <path d="M4 7l8 5 8-5" />
      <path d="M12 12v10" />
    </svg>
  ),
  Discord: (p: IconProps) => (
    <svg {...withSize(p)} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.077.077 0 0 0-.082.038c-.357.633-.755 1.46-1.033 2.107a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-1.044-2.107.08.08 0 0 0-.082-.038A19.74 19.74 0 0 0 5.07 4.369a.07.07 0 0 0-.032.027C2.533 8.046 1.85 11.62 2.187 15.144a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.027 14.2 14.2 0 0 0 1.226-1.994.076.076 0 0 0-.041-.105 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.075.075 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.062 0a.075.075 0 0 1 .079.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.04.106c.36.698.772 1.362 1.225 1.994a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-4.187-.838-7.719-3.548-10.748a.06.06 0 0 0-.031-.028zM8.02 12.86c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.955 2.418-2.157 2.418zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  ),
  Sparkles: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  ),
  Bolt: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  ),
  Shield: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
    </svg>
  ),
  Globe: (p: IconProps) => (
    <svg {...withSize(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
  Layers: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="M12 3 2 8l10 5 10-5-10-5z" />
      <path d="M2 16l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  Chart: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  Home: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  Settings: (p: IconProps) => (
    <svg {...withSize(p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
  Users: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
    </svg>
  ),
  Bell: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  ),
  Search: (p: IconProps) => (
    <svg {...withSize(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Menu: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Logout: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  ),
  Chevron: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  Check: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  Arrow: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  ),
  Inbox: (p: IconProps) => (
    <svg {...withSize(p)}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5 5h14l3 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l3-7z" />
    </svg>
  )
};

export type IconName = keyof typeof Icon;
