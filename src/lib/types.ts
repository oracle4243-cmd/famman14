export type SongStatus = "draft" | "published" | "private";

export type Profile = {
  id: string;
  musician_name: string;
  greeting: string;
  profile_image_url: string | null;
  profile_image_path: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialPlatform =
  | "youtube"
  | "instagram"
  | "apple_music"
  | "melon"
  | "soundcloud"
  | "spotify"
  | "custom";

export type SocialLink = {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
};

export type Song = {
  id: string;
  title: string;
  lyrics: string;
  image_url: string | null;
  image_path: string | null;
  status: SongStatus;
  created_at: string;
  updated_at: string;
};

export type VisitCounts = {
  today_count: number;
  total_count: number;
};

export type ImageUploadResult = {
  url: string;
  path: string;
};
