export const BASE_URL = import.meta.env.BASE_URL;

export const SOCIAL_MEDIA_LINKS = {
  facebook: "https://www.facebook.com/streetmeetingpoland/",
  instagram: "https://www.instagram.com/streetmeetingpoland/",
};

export const FORM_ACTION_URL =
  "https://streetmeetingbackend.azurewebsites.net/upload";

export const PRIVACY_POLICY_URL =
  "https://download.filekitcdn.com/d/uzeDKvVKHexiMfMTdLbQ4G/74vzptpgRGHpp6EDxgX22B";

export const buildAssetPath = (path) => {
  if (!path) return "";
  // If it's an absolute URL or protocol-relative URL, return as-is
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("//")
  ) {
    return path;
  }
  // If it's already includes BASE_URL, return as-is
  if (path.startsWith(BASE_URL)) {
    return path;
  }
  // Return path with BASE_URL prepended
  return BASE_URL + path.replace(/^\//, "");
};
