/** Extract YouTube video id from common share/embed URL formats. */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url?.trim()) return null;

  const match = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/,
  );
  const videoId = match?.[1];
  if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return videoId;
  }
  return null;
}

/** YouTube thumbnail URL, or null if not a YouTube link. */
export function getVideoThumbnailUrl(videoUrl?: string | null): string | null {
  if (!videoUrl) return null;
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}
