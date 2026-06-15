/**
 * Library Feature Types
 * Complete TypeScript definitions for the Library vertical slice
 */

import type { LibraryAssetRecord } from '@/app/api/library';

// Define the specific file types we support
export type LibraryFileType =
  | Exclude<LibraryAssetRecord['file_type'], undefined>
  | 'image'
  | 'audio'
  | 'other';

// Simplified LibraryAsset that matches actual database schema
export type LibraryAsset = LibraryAssetRecord;

// Simplified list item that matches database schema
export type LibraryAssetListItem = LibraryAssetRecord;

// Simplified form data that matches database schema
export interface LibraryAssetFormData {
  title: string;
  description: string | null;
  file_type: string;
  file_url?: string | null;
  video_url?: string | null;
  document_url?: string | null;
  embed_url?: string | null;
  embed_type?: string | null;
  event_id?: string | null;
}

// Simplified filters matching database schema
export interface LibraryFilters {
  file_type?: string;
  event_id?: string;
  search_query?: string;
}

// Simplified statistics based on actual fields
export interface LibraryStatistics {
  totalAssets: number;
  assetsByType: Record<string, number>;
  assetsWithDocuments: number;
  assetsWithVideos: number;
  assetsWithEmbeds: number;
}

export interface AssetView {
  id: string;
  asset_id: string;
  user_id: string | null;
  viewed_at: string;
  duration_watched: number | null; // for videos
  ip_address: string | null;
}

export interface AssetDownload {
  id: string;
  asset_id: string;
  user_id: string | null;
  downloaded_at: string;
  ip_address: string | null;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

// Simplified access - everyone can view public assets for now
export interface AssetAccess {
  canView: boolean;
  canDownload: boolean;
}

export type LibraryCategory =
  | 'marketing'
  | 'design'
  | 'analytics'
  | 'social-media'
  | 'content'
  | 'strategy'
  | 'tools'
  | 'case-study'
  | 'template'
  | 'other';

export const LIBRARY_CATEGORIES: { value: LibraryCategory; label: string }[] = [
  { value: 'marketing', label: 'Digital Marketing' },
  { value: 'design', label: 'Design Resources' },
  { value: 'analytics', label: 'Analytics & Data' },
  { value: 'social-media', label: 'Social Media' },
  { value: 'content', label: 'Content Marketing' },
  { value: 'strategy', label: 'Strategy & Planning' },
  { value: 'tools', label: 'Tools & Software' },
  { value: 'case-study', label: 'Case Studies' },
  { value: 'template', label: 'Templates' },
  { value: 'other', label: 'Other' },
];

export const FILE_TYPES: {
  value: LibraryFileType;
  label: string;
  icon: string;
}[] = [
  { value: 'Video', label: 'Video', icon: '🎥' },
  { value: 'Document', label: 'PDF/Document', icon: '📄' },
  { value: 'Presentation', label: 'Presentation', icon: '📊' },
  { value: 'image', label: 'Image', icon: '🖼️' },
  { value: 'audio', label: 'Audio', icon: '🎵' },
  { value: 'other', label: 'Other', icon: '📎' },
];

export const ACCESS_LEVELS: {
  value: string;
  label: string;
  color: string;
}[] = [
  { value: 'public', label: 'Public', color: 'bg-green-100 text-green-800' },
  {
    value: 'user',
    label: 'Members Only',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    value: 'premium',
    label: 'Premium',
    color: 'bg-purple-100 text-purple-800',
  },
];

export const SECURITY_STATUSES: {
  value: string;
  label: string;
  color: string;
}[] = [
  { value: 'pending', label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  { value: 'scanning', label: 'Scanning', color: 'bg-blue-100 text-blue-800' },
];
