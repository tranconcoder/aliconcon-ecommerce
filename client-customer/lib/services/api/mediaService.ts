import { BACKEND_API_URL } from '../../configs/server.config'; // Import the new config

// Get the base URL for the backend. Prefers environment variable, falls back to localhost.
// const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Constructs the full URL for a media file given its ID.
 * Assumes the backend serves media files directly via a route like /media/:mediaId.
 * 
 * @param mediaId The ID of the media file.
 * @returns The full URL to access the media file.
 */
export const getMediaUrl = (mediaId: string): string => {
  if (!mediaId) {
    console.warn("getMediaUrl called with empty mediaId");
    return "/placeholder.svg";
  }

  // If mediaId is already a full URL (like Google avatar URL), return it as is
  if (mediaId.startsWith('http://') || mediaId.startsWith('https://')) {
    return mediaId;
  }

  return `${BACKEND_API_URL}/media/${mediaId}`;
};

export const mediaService = {
  getMediaUrl,
};