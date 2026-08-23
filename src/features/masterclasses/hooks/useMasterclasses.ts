import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addMasterclassLessonFile,
  addMasterclassLessonVideo,
  createMasterclass,
  createMasterclassLesson,
  createMasterclassModule,
  deleteMasterclass,
  deleteMasterclassLesson,
  deleteMasterclassModule,
  fetchAdminMasterclass,
  fetchAdminMasterclasses,
  fetchMasterclassEnrollments,
  fetchMasterclassLearn,
  fetchMasterclassLessonContent,
  fetchMasterclassPreview,
  fetchMasterclassStore,
  fetchMasterclassStoreDetail,
  manualEnrollMasterclass,
  markMasterclassLessonComplete,
  removeMasterclassLessonFile,
  removeMasterclassLessonVideo,
  reorderMasterclassLessons,
  reorderMasterclassModules,
  unmarkMasterclassLessonComplete,
  updateMasterclass,
  updateMasterclassLesson,
  updateMasterclassLessonFile,
  updateMasterclassLessonVideo,
  updateMasterclassModule,
} from '@/app/api/masterclasses';
import { useToast } from '@/shared/hooks/custom/use-toast';

export function useAdminMasterclasses() {
  return useQuery({
    queryKey: ['masterclasses', 'admin'],
    queryFn: fetchAdminMasterclasses,
    staleTime: 60_000,
  });
}

export function useAdminMasterclassDetail(id: string) {
  return useQuery({
    queryKey: ['masterclasses', 'admin', id],
    queryFn: () => fetchAdminMasterclass(id),
    enabled: !!id,
  });
}

export function useMasterclassPreview(id: string) {
  return useQuery({
    queryKey: ['masterclasses', 'preview', id],
    queryFn: () => fetchMasterclassPreview(id),
    enabled: !!id,
  });
}

export function useMasterclassEnrollments(id: string) {
  return useQuery({
    queryKey: ['masterclasses', 'enrollments', id],
    queryFn: () => fetchMasterclassEnrollments(id),
    enabled: !!id,
  });
}

export function useMasterclassStore(filter: 'all' | 'mine' = 'all') {
  return useQuery({
    queryKey: ['masterclasses', 'store', filter],
    queryFn: () => fetchMasterclassStore(filter),
    staleTime: 60_000,
  });
}

export function useMasterclassStoreDetail(id: string) {
  return useQuery({
    queryKey: ['masterclasses', 'store', id],
    queryFn: () => fetchMasterclassStoreDetail(id),
    enabled: !!id,
  });
}

export function useMasterclassLearn(id: string) {
  return useQuery({
    queryKey: ['masterclasses', 'learn', id],
    queryFn: () => fetchMasterclassLearn(id),
    enabled: !!id,
  });
}

export function useMasterclassLessonContent(lessonId: string) {
  return useQuery({
    queryKey: ['masterclasses', 'lesson', lessonId],
    queryFn: () => fetchMasterclassLessonContent(lessonId),
    enabled: !!lessonId,
  });
}

export function useCreateMasterclass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createMasterclass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterclasses'] });
      toast({ title: 'Masterclass created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateMasterclass(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: Parameters<typeof updateMasterclass>[1]) =>
      updateMasterclass(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterclasses'] });
      toast({ title: 'Saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteMasterclass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteMasterclass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterclasses'] });
      toast({ title: 'Deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useMasterclassCurriculumMutations(masterclassId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['masterclasses', 'preview', masterclassId] });
    queryClient.invalidateQueries({ queryKey: ['masterclasses'] });
  };

  const onError = (error: Error) => {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  };

  return {
    createModule: useMutation({
      mutationFn: (payload: Parameters<typeof createMasterclassModule>[1]) =>
        createMasterclassModule(masterclassId, payload),
      onSuccess: invalidate,
      onError,
    }),
    updateModule: useMutation({
      mutationFn: ({
        moduleId,
        payload,
      }: {
        moduleId: string;
        payload: Parameters<typeof updateMasterclassModule>[2];
      }) => updateMasterclassModule(masterclassId, moduleId, payload),
      onSuccess: invalidate,
      onError,
    }),
    deleteModule: useMutation({
      mutationFn: (moduleId: string) => deleteMasterclassModule(masterclassId, moduleId),
      onSuccess: invalidate,
      onError,
    }),
    reorderModules: useMutation({
      mutationFn: (orderedIds: string[]) => reorderMasterclassModules(masterclassId, orderedIds),
      onSuccess: invalidate,
      onError,
    }),
    createLesson: useMutation({
      mutationFn: ({
        moduleId,
        payload,
      }: {
        moduleId: string;
        payload: Parameters<typeof createMasterclassLesson>[2];
      }) => createMasterclassLesson(masterclassId, moduleId, payload),
      onSuccess: invalidate,
      onError,
    }),
    updateLesson: useMutation({
      mutationFn: ({
        moduleId,
        lessonId,
        payload,
      }: {
        moduleId: string;
        lessonId: string;
        payload: Parameters<typeof updateMasterclassLesson>[3];
      }) => updateMasterclassLesson(masterclassId, moduleId, lessonId, payload),
      onSuccess: invalidate,
      onError,
    }),
    deleteLesson: useMutation({
      mutationFn: ({ moduleId, lessonId }: { moduleId: string; lessonId: string }) =>
        deleteMasterclassLesson(masterclassId, moduleId, lessonId),
      onSuccess: invalidate,
      onError,
    }),
    reorderLessons: useMutation({
      mutationFn: ({ moduleId, orderedIds }: { moduleId: string; orderedIds: string[] }) =>
        reorderMasterclassLessons(masterclassId, moduleId, orderedIds),
      onSuccess: invalidate,
      onError,
    }),
    addVideo: useMutation({
      mutationFn: ({
        moduleId,
        lessonId,
        payload,
      }: {
        moduleId: string;
        lessonId: string;
        payload: Parameters<typeof addMasterclassLessonVideo>[3];
      }) => addMasterclassLessonVideo(masterclassId, moduleId, lessonId, payload),
      onSuccess: invalidate,
      onError,
    }),
    updateVideo: useMutation({
      mutationFn: ({
        moduleId,
        lessonId,
        videoId,
        payload,
      }: {
        moduleId: string;
        lessonId: string;
        videoId: string;
        payload: Parameters<typeof updateMasterclassLessonVideo>[4];
      }) => updateMasterclassLessonVideo(masterclassId, moduleId, lessonId, videoId, payload),
      onSuccess: invalidate,
      onError,
    }),
    removeVideo: useMutation({
      mutationFn: ({
        moduleId,
        lessonId,
        videoId,
      }: {
        moduleId: string;
        lessonId: string;
        videoId: string;
      }) => removeMasterclassLessonVideo(masterclassId, moduleId, lessonId, videoId),
      onSuccess: invalidate,
      onError,
    }),
    addFile: useMutation({
      mutationFn: ({
        moduleId,
        lessonId,
        payload,
      }: {
        moduleId: string;
        lessonId: string;
        payload: Parameters<typeof addMasterclassLessonFile>[3];
      }) => addMasterclassLessonFile(masterclassId, moduleId, lessonId, payload),
      onSuccess: invalidate,
      onError,
    }),
    updateFile: useMutation({
      mutationFn: ({
        moduleId,
        lessonId,
        fileId,
        payload,
      }: {
        moduleId: string;
        lessonId: string;
        fileId: string;
        payload: Parameters<typeof updateMasterclassLessonFile>[4];
      }) => updateMasterclassLessonFile(masterclassId, moduleId, lessonId, fileId, payload),
      onSuccess: invalidate,
      onError,
    }),
    removeFile: useMutation({
      mutationFn: ({
        moduleId,
        lessonId,
        fileId,
      }: {
        moduleId: string;
        lessonId: string;
        fileId: string;
      }) => removeMasterclassLessonFile(masterclassId, moduleId, lessonId, fileId),
      onSuccess: invalidate,
      onError,
    }),
  };
}

export function useManualMasterclassEnrollment(masterclassId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: Parameters<typeof manualEnrollMasterclass>[1]) =>
      manualEnrollMasterclass(masterclassId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterclasses', 'enrollments', masterclassId] });
      toast({ title: 'User enrolled manually' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useMasterclassLessonProgress(masterclassId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['masterclasses', 'learn', masterclassId] });
    queryClient.invalidateQueries({ queryKey: ['masterclasses', 'lesson'] });
    queryClient.invalidateQueries({ queryKey: ['masterclasses', 'store'] });
    queryClient.invalidateQueries({ queryKey: ['certificates', 'learner', masterclassId] });
  };

  return {
    complete: useMutation({
      mutationFn: markMasterclassLessonComplete,
      onSuccess: invalidate,
      onError: (error: Error) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    }),
    uncomplete: useMutation({
      mutationFn: unmarkMasterclassLessonComplete,
      onSuccess: invalidate,
      onError: (error: Error) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    }),
  };
}
