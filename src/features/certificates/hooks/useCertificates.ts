import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchGlobalCertificateSettings,
  fetchLearnerCertificateStatus,
  fetchMasterclassCertificateSettings,
  fetchMasterclassCertificatesAdmin,
  fetchPublicCertificate,
  manualIssueCertificate,
  updateGlobalCertificateSettings,
  updateMasterclassCertificateSettings,
} from '@/app/api/certificates';
import { useToast } from '@/shared/hooks/custom/use-toast';

export function useGlobalCertificateSettings() {
  return useQuery({
    queryKey: ['certificate-settings', 'global'],
    queryFn: fetchGlobalCertificateSettings,
  });
}

export function useUpdateGlobalCertificateSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: updateGlobalCertificateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-settings'] });
      toast({ title: 'Certificate design saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useMasterclassCertificateSettings(masterclassId: string) {
  return useQuery({
    queryKey: ['certificate-settings', 'masterclass', masterclassId],
    queryFn: () => fetchMasterclassCertificateSettings(masterclassId),
    enabled: !!masterclassId,
  });
}

export function useUpdateMasterclassCertificateSettings(masterclassId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: Parameters<typeof updateMasterclassCertificateSettings>[1]) =>
      updateMasterclassCertificateSettings(masterclassId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-settings', 'masterclass', masterclassId] });
      queryClient.invalidateQueries({ queryKey: ['certificates', 'admin', masterclassId] });
      toast({ title: 'Certificate settings saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useMasterclassCertificatesAdmin(masterclassId: string) {
  return useQuery({
    queryKey: ['certificates', 'admin', masterclassId],
    queryFn: () => fetchMasterclassCertificatesAdmin(masterclassId),
    enabled: !!masterclassId,
  });
}

export function useManualIssueCertificate(masterclassId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: Parameters<typeof manualIssueCertificate>[1]) =>
      manualIssueCertificate(masterclassId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates', 'admin', masterclassId] });
      toast({ title: 'Certificate issued' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useLearnerCertificateStatus(masterclassId: string) {
  return useQuery({
    queryKey: ['certificates', 'learner', masterclassId],
    queryFn: () => fetchLearnerCertificateStatus(masterclassId),
    enabled: !!masterclassId,
  });
}

export function usePublicCertificate(certificateCode: string) {
  return useQuery({
    queryKey: ['certificates', 'public', certificateCode],
    queryFn: () => fetchPublicCertificate(certificateCode),
    enabled: !!certificateCode,
    retry: false,
  });
}
