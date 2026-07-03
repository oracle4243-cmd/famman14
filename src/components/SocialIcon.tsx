import {
  Apple,
  Cloud,
  ExternalLink,
  Instagram,
  Music2,
  Radio,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { SocialLink, SocialPlatform } from "../lib/types";

const platformIcons: Record<SocialPlatform, LucideIcon> = {
  youtube: Youtube,
  instagram: Instagram,
  apple_music: Apple,
  melon: Music2,
  soundcloud: Cloud,
  spotify: Radio,
  custom: ExternalLink,
};

export const platformLabels: Record<SocialPlatform, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  apple_music: "Apple Music",
  melon: "Melon",
  soundcloud: "SoundCloud",
  spotify: "Spotify",
  custom: "기타 링크",
};

export function SocialIcon({ link }: { link: SocialLink }) {
  const Icon = platformIcons[link.platform] ?? ExternalLink;
  const label = link.label || platformLabels[link.platform] || "외부 링크";

  return (
    <a
      className="social-icon"
      href={link.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${label} 새 탭에서 열기`}
      title={label}
    >
      <Icon size={19} aria-hidden="true" />
    </a>
  );
}
