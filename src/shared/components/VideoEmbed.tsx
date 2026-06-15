import type React from 'react';
import { getSecureIframeAttributes, validateEmbedUrl } from '@/shared/utils/embedUrlValidation';

interface VideoEmbedProps {
  url: string;
  className?: string;
}

const VideoEmbed: React.FC<VideoEmbedProps> = ({ url, className = '' }) => {
  // Bug #10 Fix: Add error boundaries and validation for YouTube video ID extraction
  const getYouTubeVideoId = (url: string): string | null => {
    try {
      // Validate URL format first
      if (!url || typeof url !== 'string') {
        return null;
      }

      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/,
      ];

      for (const pattern of patterns) {
        try {
          const match = url.match(pattern);
          if (match?.[1]) {
            // Validate video ID format (should be 11 characters for YouTube)
            const videoId = match[1];
            if (videoId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(videoId)) {
              return videoId;
            }
          }
        } catch {
          return null;
        }
      }

      return null;
    } catch {
      return null;
    }
  };

  // Function to check if URL is a Bunny CDN video
  const isBunnyCDN = (url: string): boolean => {
    try {
      if (!url || typeof url !== 'string') return false;
      return (
        url.includes('bunnycdn.com') || url.includes('b-cdn.net') || url.includes('.b-cdn.net')
      );
    } catch {
      return false;
    }
  };

  // Function to check if URL is from mediadelivery.net or similar platforms
  const isMediaDeliveryPlatform = (url: string): boolean => {
    try {
      if (!url || typeof url !== 'string') return false;
      return (
        url.includes('mediadelivery.net') ||
        url.includes('vimeo.com') ||
        url.includes('wistia.com') ||
        url.includes('jwplayer.com') ||
        url.includes('vidyard.com')
      );
    } catch {
      return false;
    }
  };

  // Function to get embed URL for Bunny CDN
  const getBunnyCDNEmbedUrl = (url: string): string => {
    try {
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided');
      }

      // If it's already an embed URL, return as is
      if (url.includes('/embed/')) {
        return url;
      }

      // Try to convert direct video URL to embed URL
      // This is a basic implementation - Bunny CDN URLs can vary
      if (url.includes('iframe')) {
        return url;
      }

      // If it contains video ID, try to construct embed URL
      const videoIdMatch = url.match(/\/([a-zA-Z0-9-_]+)\.mp4/);
      if (videoIdMatch?.[1]) {
        const baseUrl = url.substring(0, url.lastIndexOf('/'));
        return `${baseUrl}/embed/${videoIdMatch[1]}`;
      }

      return url; // Return original URL if we can't parse it
    } catch {
      return url; // Fallback to original URL
    }
  };

  // Function to render YouTube embed
  const renderYouTubeEmbed = (videoId: string) => (
    <div className={`relative aspect-video w-full ${className}`}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1&rel=0`}
        title="YouTube video"
        className="absolute inset-0 h-full w-full rounded-lg"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={true}
      />
    </div>
  );

  const isDirectVideoFile = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname.toLowerCase();
      return path.endsWith('.mp4') || path.endsWith('.webm') || path.endsWith('.ogg');
    } catch {
      return false;
    }
  };

  const renderDirectVideo = (url: string) => (
    <div className={`relative aspect-video w-full ${className}`}>
      <video
        src={url}
        className="absolute inset-0 h-full w-full rounded-lg bg-black"
        controls
        playsInline
        preload="metadata"
      >
        <track
          kind="captions"
          src="data:text/vtt;charset=utf-8,WEBVTT"
          srcLang="en"
          label="English"
          default
        />
      </video>
    </div>
  );

  // Function to render Bunny CDN embed
  const renderBunnyCDNEmbed = (url: string) => {
    const embedUrl = getBunnyCDNEmbedUrl(url);

    return (
      <div className={`relative aspect-video w-full ${className}`}>
        <iframe
          src={embedUrl}
          title="Bunny CDN video"
          className="absolute inset-0 h-full w-full rounded-lg"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={true}
        />
      </div>
    );
  };

  // Function to render media delivery platform embeds with enhanced sizing
  const renderMediaDeliveryEmbed = (url: string) => {
    // Add autoplay=false parameter to URL if it doesn't exist
    let embedUrl = url;
    try {
      const urlObj = new URL(url);

      // Add autoplay=false if not present
      if (!urlObj.searchParams.has('autoplay')) {
        urlObj.searchParams.set('autoplay', 'false');
        embedUrl = urlObj.toString();
      }

      // Ensure autoplay is set to false if it exists
      if (urlObj.searchParams.get('autoplay') === 'true') {
        urlObj.searchParams.set('autoplay', 'false');
        embedUrl = urlObj.toString();
      }

      // Add responsive parameters for better sizing
      if (url.includes('mediadelivery.net')) {
        if (!urlObj.searchParams.has('responsive')) {
          urlObj.searchParams.set('responsive', 'true');
        }
        if (!urlObj.searchParams.has('fit')) {
          urlObj.searchParams.set('fit', 'contain');
        }
        embedUrl = urlObj.toString();
      }
    } catch (error) {
      // If URL parsing fails, append autoplay=false as query parameter
      const separator = url.includes('?') ? '&' : '?';
      embedUrl = `${url}${separator}autoplay=false`;

      if (url.includes('mediadelivery.net')) {
        embedUrl += '&responsive=true&fit=contain';
      }
    }

    return (
      <div className={`relative aspect-video w-full ${className}`}>
        <iframe
          src={embedUrl}
          title="Video"
          className="absolute inset-0 h-full w-full rounded-lg border-0"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={true}
          style={{
            border: 'none',
            minHeight: '100%',
            minWidth: '100%',
          }}
          loading="lazy"
        />
      </div>
    );
  };

  // Function to render generic video embed
  const renderGenericEmbed = (url: string) => {
    // Add autoplay=false parameter to URL if it doesn't exist
    let embedUrl = url;
    try {
      const urlObj = new URL(url);

      // For mediadelivery.net and other platforms, add autoplay=false if not present
      if (!urlObj.searchParams.has('autoplay')) {
        urlObj.searchParams.set('autoplay', 'false');
        embedUrl = urlObj.toString();
      }

      // Ensure autoplay is set to false if it exists
      if (urlObj.searchParams.get('autoplay') === 'true') {
        urlObj.searchParams.set('autoplay', 'false');
        embedUrl = urlObj.toString();
      }
    } catch (error) {
      // If URL parsing fails, append autoplay=false as query parameter
      const separator = url.includes('?') ? '&' : '?';
      embedUrl = `${url}${separator}autoplay=false`;
    }

    return (
      <div className={`relative aspect-video w-full ${className}`}>
        <iframe
          src={embedUrl}
          title="Video"
          className="absolute inset-0 h-full w-full rounded-lg object-cover"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={true}
          style={{ border: 'none' }}
        />
      </div>
    );
  };

  // Main render logic with SECURITY validation
  if (!url || typeof url !== 'string') {
    return (
      <div
        className={`flex aspect-video w-full items-center justify-center rounded-lg bg-gray-100 ${className}`}
      >
        <p className="text-gray-500">No video URL provided</p>
      </div>
    );
  }

  try {
    // SECURITY: Validate embed URL before rendering
    const validation = validateEmbedUrl(url);

    if (!validation.isValid || validation.errors.length > 0) {
      return (
        <div
          className={`flex aspect-video w-full items-center justify-center rounded-lg bg-red-50 border-2 border-red-200 ${className}`}
        >
          <div className="text-center p-4">
            <p className="font-medium text-red-600">🚨 Security Error</p>
            <p className="mt-1 text-sm text-red-500">This video URL failed security validation</p>
            <p className="mt-1 text-xs text-red-400">Please contact administrator</p>
          </div>
        </div>
      );
    }

    // Use sanitized URL if provided
    const safeUrl = validation.sanitizedUrl || url;
    const embedType = validation.embedType;

    if (isDirectVideoFile(safeUrl)) {
      return renderDirectVideo(safeUrl);
    }

    // SECURITY: Get secure iframe attributes based on embed type
    if (embedType) {
      const secureAttributes = getSecureIframeAttributes(safeUrl, embedType);

      return (
        <div className={`relative aspect-video w-full ${className}`}>
          <iframe
            {...secureAttributes}
            title={`${embedType} video embed`}
            className="absolute inset-0 h-full w-full rounded-lg"
          />
        </div>
      );
    }

    // Fallback to legacy rendering for backward compatibility
    // Check if it's a YouTube URL
    const youtubeVideoId = getYouTubeVideoId(safeUrl);
    if (youtubeVideoId) {
      return renderYouTubeEmbed(youtubeVideoId);
    }

    // Check if it's a Bunny CDN URL
    if (isBunnyCDN(safeUrl)) {
      return renderBunnyCDNEmbed(safeUrl);
    }

    // Check if it's a media delivery platform that needs special handling
    if (isMediaDeliveryPlatform(safeUrl)) {
      return renderMediaDeliveryEmbed(safeUrl);
    }

    // For any other video URL, try to embed it directly (with security warnings)
    return renderGenericEmbed(safeUrl);
  } catch {
    return (
      <div
        className={`flex aspect-video w-full items-center justify-center rounded-lg bg-red-50 ${className}`}
      >
        <div className="text-center">
          <p className="font-medium text-red-600">Error loading video</p>
          <p className="mt-1 text-sm text-red-500">Please check the video URL</p>
        </div>
      </div>
    );
  }
};

export default VideoEmbed;
