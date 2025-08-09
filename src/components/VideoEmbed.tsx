
import React from 'react';

interface VideoEmbedProps {
  url: string;
  className?: string;
}

const VideoEmbed: React.FC<VideoEmbedProps> = ({ url, className = "" }) => {
  // Bug #10 Fix: Add error boundaries and validation for YouTube video ID extraction
  const getYouTubeVideoId = (url: string): string | null => {
    try {
      // Validate URL format first
      if (!url || typeof url !== 'string') {
        console.warn('Invalid URL provided to getYouTubeVideoId:', url);
        return null;
      }

      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/
      ];
      
      for (const pattern of patterns) {
        try {
          const match = url.match(pattern);
          if (match && match[1]) {
            // Validate video ID format (should be 11 characters for YouTube)
            const videoId = match[1];
            if (videoId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(videoId)) {
              return videoId;
            }
          }
        } catch (matchError) {
          console.warn('Error matching pattern:', matchError);
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting YouTube video ID:', error);
      return null;
    }
  };

  // Function to check if URL is a Bunny CDN video
  const isBunnyCDN = (url: string): boolean => {
    try {
      if (!url || typeof url !== 'string') return false;
      return url.includes('bunnycdn.com') || url.includes('b-cdn.net') || url.includes('.b-cdn.net');
    } catch (error) {
      console.error('Error checking Bunny CDN URL:', error);
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
      if (videoIdMatch && videoIdMatch[1]) {
        const baseUrl = url.substring(0, url.lastIndexOf('/'));
        return `${baseUrl}/embed/${videoIdMatch[1]}`;
      }
      
      return url; // Return original URL if we can't parse it
    } catch (error) {
      console.error('Error processing Bunny CDN URL:', error);
      return url; // Fallback to original URL
    }
  };

  // Function to render YouTube embed
  const renderYouTubeEmbed = (videoId: string) => (
    <div className={`relative w-full aspect-video ${className}`}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video"
        className="absolute inset-0 w-full h-full rounded-lg"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );

  // Function to render Bunny CDN embed
  const renderBunnyCDNEmbed = (url: string) => {
    const embedUrl = getBunnyCDNEmbedUrl(url);
    
    return (
      <div className={`relative w-full aspect-video ${className}`}>
        <iframe
          src={embedUrl}
          title="Bunny CDN video"
          className="absolute inset-0 w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  };

  // Function to render generic video embed
  const renderGenericEmbed = (url: string) => (
    <div className={`relative w-full aspect-video ${className}`}>
      <iframe
        src={url}
        title="Video"
        className="absolute inset-0 w-full h-full rounded-lg"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );

  // Main render logic with error handling
  if (!url || typeof url !== 'string') {
    return (
      <div className={`w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-gray-500">No video URL provided</p>
      </div>
    );
  }

  try {
    // Check if it's a YouTube URL
    const youtubeVideoId = getYouTubeVideoId(url);
    if (youtubeVideoId) {
      return renderYouTubeEmbed(youtubeVideoId);
    }

    // Check if it's a Bunny CDN URL
    if (isBunnyCDN(url)) {
      return renderBunnyCDNEmbed(url);
    }

    // For any other video URL, try to embed it directly
    return renderGenericEmbed(url);
  } catch (error) {
    console.error('Error rendering video embed:', error);
    return (
      <div className={`w-full aspect-video bg-red-50 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <p className="text-red-600 font-medium">Error loading video</p>
          <p className="text-red-500 text-sm mt-1">Please check the video URL</p>
        </div>
      </div>
    );
  }
};

export default VideoEmbed;
