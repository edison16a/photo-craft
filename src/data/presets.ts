/**
 * Canvas size presets for the new project dialog.
 *
 * Every entry is a real world size in pixels. Print sizes assume 300 dpi.
 * The list is plain data so the UI can render it straight away and tests
 * can check it without any setup.
 */

/** Group a preset belongs to. Used to build the tabs in the size picker. */
export type PresetCategory =
  | "social"
  | "video"
  | "screen"
  | "print"
  | "logo"
  | "document";

/** One canvas size the user can pick when starting a project. */
export interface SizePreset {
  /** Stable identifier, safe to store in settings or URLs. */
  id: string;
  /** Short label shown in the picker, for example "Instagram post". */
  name: string;
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
  category: PresetCategory;
  /** Optional hint such as the paper size or the dpi assumed. */
  note?: string;
}

/**
 * Smallest and largest side a project may have, in pixels.
 * Anything below 16 is useless and anything above 10000 gets too heavy for
 * the browser to export.
 */
export const PROJECT_SIZE_LIMITS: { min: number; max: number } = {
  min: 16,
  max: 10000,
};

/**
 * Categories in the order the picker shows them, with a readable label for
 * each one.
 */
export const PRESET_CATEGORIES: { id: PresetCategory; label: string }[] = [
  { id: "social", label: "Social media" },
  { id: "video", label: "Video" },
  { id: "screen", label: "Screen" },
  { id: "print", label: "Print" },
  { id: "logo", label: "Logo and icon" },
  { id: "document", label: "Document" },
];

/** Small helper so each preset below stays on one line. */
function preset(
  id: string,
  name: string,
  width: number,
  height: number,
  category: PresetCategory,
  note?: string,
): SizePreset {
  return note === undefined
    ? { id, name, width, height, category }
    : { id, name, width, height, category, note };
}

/**
 * All built in sizes, grouped by category. Ids are unique and every size
 * sits inside PROJECT_SIZE_LIMITS.
 */
export const SIZE_PRESETS: SizePreset[] = [
  preset("instagram-post", "Instagram post", 1080, 1080, "social", "Square"),
  preset("instagram-story", "Instagram story", 1080, 1920, "social", "9:16"),
  preset("facebook-post", "Facebook post", 1200, 630, "social"),
  preset("facebook-cover", "Facebook cover", 820, 312, "social"),
  preset("x-post", "X post", 1600, 900, "social", "16:9"),
  preset("x-header", "X header", 1500, 500, "social"),
  preset("linkedin-banner", "LinkedIn banner", 1584, 396, "social"),
  preset("pinterest-pin", "Pinterest pin", 1000, 1500, "social", "2:3"),
  preset("youtube-thumbnail", "YouTube thumbnail", 1280, 720, "video", "16:9"),
  preset("youtube-banner", "YouTube banner", 2560, 1440, "video"),
  preset("tiktok-video", "TikTok video", 1080, 1920, "video", "9:16"),
  preset("full-hd", "Full HD", 1920, 1080, "screen", "1080p"),
  preset("4k", "4K", 3840, 2160, "screen", "2160p"),
  preset("desktop-wallpaper", "Desktop wallpaper", 2560, 1440, "screen"),
  preset("phone-wallpaper", "Phone wallpaper", 1170, 2532, "screen"),
  preset("a4", "A4", 2480, 3508, "print", "210 x 297 mm at 300 dpi"),
  preset("us-letter", "US Letter", 2550, 3300, "print", "8.5 x 11 in at 300 dpi"),
  preset("business-card", "Business card", 1050, 600, "print", "3.5 x 2 in at 300 dpi"),
  preset("poster-18x24", "Poster 18x24 in", 5400, 7200, "print", "300 dpi"),
  preset("flyer-a5", "Flyer A5", 1748, 2480, "print", "148 x 210 mm at 300 dpi"),
  preset("logo", "Logo", 500, 500, "logo", "Square"),
  preset("logo-large", "Logo large", 1000, 1000, "logo", "Square"),
  preset("favicon", "Favicon", 512, 512, "logo", "Square"),
  preset("app-icon", "App icon", 1024, 1024, "logo", "Square"),
  preset("presentation-16-9", "Presentation 16:9", 1920, 1080, "document"),
];

/**
 * Looks up a preset by id. Returns undefined when the id is unknown so
 * callers can fall back to a custom size instead of crashing.
 */
export function findPreset(id: string): SizePreset | undefined {
  return SIZE_PRESETS.find((entry) => entry.id === id);
}
