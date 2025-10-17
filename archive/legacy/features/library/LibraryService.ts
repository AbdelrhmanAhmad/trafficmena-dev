import { supabase } from '@/shared/integrations/supabase/client';
import { AppErrorHandler } from '@/shared/utils/errorHandling';
import { SafeCast } from '@/utils/typeValidation';
import type {
  AssetAccess,
  LibraryAsset,
  LibraryAssetFormData,
  LibraryAssetListItem,
  LibraryFilters,
  LibraryStatistics,
  PagedResult,
} from '../types';

/**
 * Library Service
 * Simplified for the MVP: all members can read every library asset.
 */
export class LibraryService {
  private static instance: LibraryService;

  static getInstance(): LibraryService {
    if (!LibraryService.instance) {
      LibraryService.instance = new LibraryService();
    }
    return LibraryService.instance;
  }

  async getLibraryAssets(
    page: number,
    itemsPerPage: number,
    filters?: LibraryFilters,
  ): Promise<PagedResult<LibraryAssetListItem>> {
    try {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('library_assets')
        .select(
          'id, title, description, file_type, file_url, video_url, document_url, embed_url, embed_type, event_id, created_at, view_count, download_count',
        );

      if (filters?.file_type) {
        query = query.eq('file_type', filters.file_type);
      }

      if (filters?.event_id) {
        query = query.eq('event_id', filters.event_id);
      }

      if (filters?.search_query) {
        query = query.or(
          `title.ilike.%${filters.search_query}%,description.ilike.%${filters.search_query}%`,
        );
      }

      const [{ count }, { data, error }] = await Promise.all([
        supabase.from('library_assets').select('*', { count: 'exact', head: true }),
        query.order('created_at', { ascending: false }).range(from, to),
      ]);

      if (error) throw error;

      return {
        items: SafeCast.toArray(data, []).map(this.transformListItem),
        total: count ?? 0,
      };
    } catch (error) {
      throw AppErrorHandler.handleSupabaseError(error);
    }
  }

  async getLibraryAssetById(
    id: string,
  ): Promise<{ asset: LibraryAsset | null; access: AssetAccess }> {
    try {
      const { data, error } = await supabase
        .from('library_assets')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return {
          asset: null,
          access: {
            canView: false,
            canDownload: false,
          },
        };
      }

      let eventDetails: { title: string; date: string; event_type: string } | null = null;
      if (data.event_id) {
        const { data: eventData } = await supabase
          .from('events')
          .select('title, date, event_type')
          .eq('id', data.event_id)
          .single();

        if (eventData) {
          eventDetails = eventData;
        }
      }

      const asset = this.transformAsset({ ...(data as LibraryAsset), events: eventDetails });

      return {
        asset,
        access: {
          canView: true,
          canDownload: true,
        },
      };
    } catch (error) {
      AppErrorHandler.handleSupabaseError(error);
      return {
        asset: null,
        access: {
          canView: false,
          canDownload: false,
        },
      };
    }
  }

  async createLibraryAsset(assetData: LibraryAssetFormData): Promise<LibraryAsset | null> {
    try {
      const insertPayload = {
        title: assetData.title,
        description: assetData.description,
        file_type: assetData.file_type,
        file_url: assetData.file_url || null,
        video_url: assetData.video_url || null,
        document_url: assetData.document_url || null,
        embed_url: assetData.embed_url || null,
        embed_type: assetData.embed_type || null,
        event_id: assetData.event_id || null,
        view_count: 0,
        download_count: 0,
      };

      const { data, error } = await supabase
        .from('library_assets')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        throw AppErrorHandler.handleSupabaseError(error);
      }

      return this.transformAsset(data as LibraryAsset);
    } catch (error) {
      throw AppErrorHandler.handleSupabaseError(error);
    }
  }

  async updateLibraryAsset(
    id: string,
    assetData: Partial<LibraryAssetFormData>,
  ): Promise<LibraryAsset | null> {
    try {
      const updateData: Record<string, unknown> = {};

      if (assetData.title !== undefined) updateData.title = assetData.title;
      if (assetData.description !== undefined) updateData.description = assetData.description;
      if (assetData.file_type !== undefined) updateData.file_type = assetData.file_type;
      if (assetData.event_id !== undefined) updateData.event_id = assetData.event_id;
      if (assetData.file_url !== undefined) updateData.file_url = assetData.file_url;
      if (assetData.video_url !== undefined) updateData.video_url = assetData.video_url;
      if (assetData.document_url !== undefined) updateData.document_url = assetData.document_url;
      if (assetData.embed_url !== undefined) updateData.embed_url = assetData.embed_url;
      if (assetData.embed_type !== undefined) updateData.embed_type = assetData.embed_type;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('library_assets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw AppErrorHandler.handleSupabaseError(error);
      }

      return this.transformAsset(data as LibraryAsset);
    } catch (error) {
      throw AppErrorHandler.handleSupabaseError(error);
    }
  }

  async deleteLibraryAsset(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('library_assets').delete().eq('id', id);

      if (error) {
        throw AppErrorHandler.handleSupabaseError(error);
      }

      return true;
    } catch (error) {
      throw AppErrorHandler.handleSupabaseError(error);
    }
  }

  async getAllAssetsForAdmin(): Promise<LibraryAsset[]> {
    try {
      const { data, error } = await supabase
        .from('library_assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return SafeCast.toArray(data, []).map((item) => this.transformAsset(item));
    } catch (error) {
      throw AppErrorHandler.handleSupabaseError(error);
    }
  }

  async getLibraryStatistics(): Promise<LibraryStatistics> {
    try {
      const { data: assets, error } = await supabase
        .from('library_assets')
        .select('file_type, document_url, video_url, embed_url');

      if (error) throw error;

      const assetList = assets || [];

      const stats: LibraryStatistics = {
        totalAssets: assetList.length,
        assetsByType: {},
        assetsWithDocuments: assetList.filter((a) => a.document_url).length,
        assetsWithVideos: assetList.filter((a) => a.video_url).length,
        assetsWithEmbeds: assetList.filter((a) => a.embed_url).length,
      };

      assetList.forEach((asset) => {
        const type = asset.file_type || 'other';
        stats.assetsByType[type] = (stats.assetsByType[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      AppErrorHandler.handleSupabaseError(error);
      return {
        totalAssets: 0,
        assetsByType: {},
        assetsWithDocuments: 0,
        assetsWithVideos: 0,
        assetsWithEmbeds: 0,
      };
    }
  }

  async getAssetsByEventId(eventId: string): Promise<LibraryAssetListItem[]> {
    try {
      const { data, error } = await supabase
        .from('library_assets')
        .select(
          'id, title, description, file_type, file_url, video_url, document_url, embed_url, embed_type, event_id, created_at, view_count, download_count',
        )
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return SafeCast.toArray(data, []).map(this.transformListItem);
    } catch (error) {
      AppErrorHandler.handleSupabaseError(error);
      return [];
    }
  }

  private transformAsset(asset: LibraryAsset & { events?: any }): LibraryAsset {
    return {
      ...asset,
      view_count: Number.isFinite(Number(asset.view_count)) ? Number(asset.view_count) : 0,
      download_count: Number.isFinite(Number(asset.download_count))
        ? Number(asset.download_count)
        : 0,
      events: asset.events || null,
    };
  }

  private transformListItem(item: LibraryAssetListItem): LibraryAssetListItem {
    return {
      ...item,
      view_count: Number.isFinite(Number(item.view_count)) ? Number(item.view_count) : 0,
      download_count: Number.isFinite(Number(item.download_count))
        ? Number(item.download_count)
        : 0,
    };
  }
}
