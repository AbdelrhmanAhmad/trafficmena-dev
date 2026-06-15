import { API_BASE, fetchJson } from './client';

export type MasterclassFileType = 'excel' | 'markdown' | 'html' | 'text' | 'powerpoint';

export const MASTERCLASS_FILE_TYPE_LABELS: Record<MasterclassFileType, string> = {
  excel: 'Excel',
  markdown: 'Markdown',
  html: 'HTML',
  text: 'Text',
  powerpoint: 'PowerPoint',
};

export const MASTERCLASS_FILE_EXTENSIONS: Record<MasterclassFileType, string[]> = {
  excel: ['.xlsx', '.xls', '.csv'],
  markdown: ['.md', '.markdown'],
  html: ['.html', '.htm'],
  text: ['.txt'],
  powerpoint: ['.ppt', '.pptx'],
};

export type MasterclassAdmin = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceInCents: number | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  lessonCount?: number;
};

export type MasterclassLessonVideo = {
  id: string;
  lessonId: string;
  title: string;
  videoAssetId: string | null;
  sortOrder: number;
  createdAt: string;
  assetTitle?: string | null;
  embedUrl?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
};

export type MasterclassLessonFile = {
  id: string;
  lessonId: string;
  fileType: MasterclassFileType;
  displayName: string;
  fileUrl: string;
  sortOrder: number;
  createdAt: string;
};

export type MasterclassLesson = {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  videos?: MasterclassLessonVideo[];
  files?: MasterclassLessonFile[];
};

export type MasterclassModule = {
  id: string;
  masterclassId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  lessons?: MasterclassLesson[];
};

export type MasterclassPreview = {
  masterclass: MasterclassAdmin;
  modules: MasterclassModule[];
};

export type MasterclassEnrollment = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  source: 'paid' | 'manual';
  enrolledAt: string;
  enrollmentNote: string | null;
  enrolledBy: string | null;
  paymentId: string | null;
};

export type MasterclassStoreItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price_in_cents: number | null;
  is_enrolled: boolean;
  is_sellable: boolean;
  lesson_count: number;
};

export type MasterclassLearnView = {
  masterclass: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    total_lessons: number;
    completed_lessons: number;
  };
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    sort_order: number;
    lessons: Array<{
      id: string;
      title: string;
      description: string | null;
      sort_order: number;
      is_completed: boolean;
    }>;
  }>;
};

export type MasterclassLessonContent = {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    module_id: string;
    masterclass_id: string;
    is_completed: boolean;
  };
  videos: Array<{
    id: string;
    title: string;
    sort_order: number;
    video_asset: {
      id: string;
      title: string;
      embed_url: string | null;
      video_url: string | null;
      embed_type: string | null;
      thumbnail_url: string | null;
    } | null;
  }>;
  files: Array<{
    id: string;
    file_type: MasterclassFileType;
    display_name: string;
    file_url: string;
    sort_order: number;
  }>;
};

// --- Admin -------------------------------------------------------------------

export async function fetchAdminMasterclasses(): Promise<MasterclassAdmin[]> {
  const data = await fetchJson<{ data: { items: MasterclassAdmin[] } }>(`${API_BASE}/masterclasses`);
  return data.data.items;
}

export async function fetchAdminMasterclass(id: string): Promise<MasterclassAdmin> {
  const data = await fetchJson<{ data: { masterclass: MasterclassAdmin; lessonCount: number } }>(
    `${API_BASE}/masterclasses/${id}`,
  );
  return data.data.masterclass;
}

export async function fetchMasterclassPreview(id: string): Promise<MasterclassPreview> {
  const data = await fetchJson<{ data: MasterclassPreview }>(
    `${API_BASE}/masterclasses/${id}/preview`,
  );
  return data.data;
}

export async function fetchMasterclassEnrollments(id: string): Promise<MasterclassEnrollment[]> {
  const data = await fetchJson<{ data: { items: MasterclassEnrollment[] } }>(
    `${API_BASE}/masterclasses/${id}/enrollments`,
  );
  return data.data.items;
}

export async function createMasterclass(payload: {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  priceInCents?: number | null;
  isPublished?: boolean;
  sortOrder?: number;
}): Promise<MasterclassAdmin> {
  const data = await fetchJson<{ data: MasterclassAdmin }>(`${API_BASE}/masterclasses`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.data;
}

export async function updateMasterclass(
  id: string,
  payload: Partial<{
    title: string;
    description: string | null;
    imageUrl: string | null;
    priceInCents: number | null;
    isPublished: boolean;
    sortOrder: number;
  }>,
): Promise<MasterclassAdmin> {
  const data = await fetchJson<{ data: MasterclassAdmin }>(`${API_BASE}/masterclasses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.data;
}

export async function deleteMasterclass(id: string): Promise<void> {
  await fetchJson(`${API_BASE}/masterclasses/${id}`, { method: 'DELETE' });
}

export async function createMasterclassModule(
  masterclassId: string,
  payload: { title: string; description?: string | null; sortOrder?: number },
): Promise<MasterclassModule> {
  const data = await fetchJson<{ data: MasterclassModule }>(
    `${API_BASE}/masterclasses/${masterclassId}/modules`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return data.data;
}

export async function updateMasterclassModule(
  masterclassId: string,
  moduleId: string,
  payload: Partial<{ title: string; description: string | null; sortOrder: number }>,
): Promise<MasterclassModule> {
  const data = await fetchJson<{ data: MasterclassModule }>(
    `${API_BASE}/masterclasses/${masterclassId}/modules/${moduleId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
  return data.data;
}

export async function deleteMasterclassModule(
  masterclassId: string,
  moduleId: string,
): Promise<void> {
  await fetchJson(`${API_BASE}/masterclasses/${masterclassId}/modules/${moduleId}`, {
    method: 'DELETE',
  });
}

export async function reorderMasterclassModules(
  masterclassId: string,
  orderedIds: string[],
): Promise<void> {
  await fetchJson(`${API_BASE}/masterclasses/${masterclassId}/modules/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ orderedIds }),
  });
}

export async function createMasterclassLesson(
  masterclassId: string,
  moduleId: string,
  payload: { title: string; description?: string | null; sortOrder?: number },
): Promise<MasterclassLesson> {
  const data = await fetchJson<{ data: MasterclassLesson }>(
    `${API_BASE}/masterclasses/${masterclassId}/modules/${moduleId}/lessons`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return data.data;
}

export async function updateMasterclassLesson(
  masterclassId: string,
  moduleId: string,
  lessonId: string,
  payload: Partial<{ title: string; description: string | null; sortOrder: number }>,
): Promise<MasterclassLesson> {
  const data = await fetchJson<{ data: MasterclassLesson }>(
    `${API_BASE}/masterclasses/${masterclassId}/modules/${moduleId}/lessons/${lessonId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
  return data.data;
}

export async function deleteMasterclassLesson(
  masterclassId: string,
  moduleId: string,
  lessonId: string,
): Promise<void> {
  await fetchJson(
    `${API_BASE}/masterclasses/${masterclassId}/modules/${moduleId}/lessons/${lessonId}`,
    { method: 'DELETE' },
  );
}

export async function reorderMasterclassLessons(
  masterclassId: string,
  moduleId: string,
  orderedIds: string[],
): Promise<void> {
  await fetchJson(
    `${API_BASE}/masterclasses/${masterclassId}/modules/${moduleId}/lessons/reorder`,
    { method: 'PUT', body: JSON.stringify({ orderedIds }) },
  );
}

export async function addMasterclassLessonVideo(
  masterclassId: string,
  moduleId: string,
  lessonId: string,
  payload: { title: string; videoAssetId?: string | null; sortOrder?: number },
): Promise<MasterclassLessonVideo> {
  const data = await fetchJson<{ data: MasterclassLessonVideo }>(
    `${API_BASE}/masterclasses/${masterclassId}/modules/${moduleId}/lessons/${lessonId}/videos`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return data.data;
}

export async function updateMasterclassLessonVideo(
  masterclassId: string,
  moduleId: string,
  lessonId: string,
  videoId: string,
  payload: Partial<{ title: string; videoAssetId: string | null; sortOrder: number }>,
): Promise<MasterclassLessonVideo> {
  const data = await fetchJson<{ data: MasterclassLessonVideo }>(
    `${API_BASE}/masterclasses/${masterclassId}/modules/${moduleId}/lessons/${lessonId}/videos/${videoId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
  return data.data;
}

export async function removeMasterclassLessonVideo(
  masterclassId: string,
  moduleId: string,
  lessonId: string,
  videoId: string,
): Promise<void> {
  await fetchJson(
    `${API_BASE}/masterclasses/${masterclassId}/modules/${moduleId}/lessons/${lessonId}/videos/${videoId}`,
    { method: 'DELETE' },
  );
}

export async function addMasterclassLessonFile(
  masterclassId: string,
  moduleId: string,
  lessonId: string,
  payload: {
    fileType: MasterclassFileType;
    displayName: string;
    fileUrl: string;
    sortOrder?: number;
  },
): Promise<MasterclassLessonFile> {
  const data = await fetchJson<{ data: MasterclassLessonFile }>(
    `${API_BASE}/masterclasses/${masterclassId}/modules/${moduleId}/lessons/${lessonId}/files`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return data.data;
}

export async function updateMasterclassLessonFile(
  masterclassId: string,
  moduleId: string,
  lessonId: string,
  fileId: string,
  payload: Partial<{
    fileType: MasterclassFileType;
    displayName: string;
    fileUrl: string;
    sortOrder: number;
  }>,
): Promise<MasterclassLessonFile> {
  const data = await fetchJson<{ data: MasterclassLessonFile }>(
    `${API_BASE}/masterclasses/${masterclassId}/modules/${moduleId}/lessons/${lessonId}/files/${fileId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
  return data.data;
}

export async function removeMasterclassLessonFile(
  masterclassId: string,
  moduleId: string,
  lessonId: string,
  fileId: string,
): Promise<void> {
  await fetchJson(
    `${API_BASE}/masterclasses/${masterclassId}/modules/${moduleId}/lessons/${lessonId}/files/${fileId}`,
    { method: 'DELETE' },
  );
}

export async function manualEnrollMasterclass(
  masterclassId: string,
  payload: { userId: string; note?: string | null },
): Promise<void> {
  await fetchJson(`${API_BASE}/masterclasses/${masterclassId}/enrollments/manual`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// --- Member store & learn ----------------------------------------------------

export async function fetchMasterclassStore(
  filter: 'all' | 'mine' = 'all',
): Promise<MasterclassStoreItem[]> {
  const data = await fetchJson<{ data: { items: MasterclassStoreItem[] } }>(
    `${API_BASE}/masterclasses/store?filter=${filter}`,
  );
  return data.data.items;
}

export async function fetchMasterclassStoreDetail(id: string): Promise<{
  masterclass: MasterclassStoreItem;
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    sort_order: number;
    lessons: Array<{
      id: string;
      title: string;
      description: string | null;
      sort_order: number;
      video_count: number;
      file_count: number;
    }>;
  }>;
}> {
  const data = await fetchJson<{
    data: {
      masterclass: MasterclassStoreItem;
      modules: Array<{
        id: string;
        title: string;
        description: string | null;
        sort_order: number;
        lessons: Array<{
          id: string;
          title: string;
          description: string | null;
          sort_order: number;
          video_count: number;
          file_count: number;
        }>;
      }>;
    };
  }>(`${API_BASE}/masterclasses/store/${id}`);
  return data.data;
}

export async function fetchMasterclassLearn(id: string): Promise<MasterclassLearnView> {
  const data = await fetchJson<{ data: MasterclassLearnView }>(
    `${API_BASE}/masterclasses/learn/${id}`,
  );
  return data.data;
}

export async function fetchMasterclassLessonContent(
  lessonId: string,
): Promise<MasterclassLessonContent> {
  const data = await fetchJson<{ data: MasterclassLessonContent }>(
    `${API_BASE}/masterclasses/learn/lessons/${lessonId}`,
  );
  return data.data;
}

export async function markMasterclassLessonComplete(lessonId: string): Promise<void> {
  await fetchJson(`${API_BASE}/masterclasses/learn/lessons/${lessonId}/complete`, {
    method: 'POST',
  });
}

export async function unmarkMasterclassLessonComplete(lessonId: string): Promise<void> {
  await fetchJson(`${API_BASE}/masterclasses/learn/lessons/${lessonId}/complete`, {
    method: 'DELETE',
  });
}
