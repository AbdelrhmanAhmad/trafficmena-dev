import { Download, ExternalLink, Link2, Loader2, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { certificateDownloadUrl, certificatePublicShareUrl } from '@/app/api/certificates';
import { CertificateShareButton } from '@/features/certificates/components/CertificateShareButton';
import { MasterclassEnrolledLearnerDetails } from '@/features/masterclasses/components/MasterclassEnrolledLearnerDetails';
import {
  useDeleteCertificate,
  useManualIssueCertificate,
  useMasterclassCertificateSettings,
  useMasterclassCertificatesAdmin,
  useUpdateMasterclassCertificateSettings,
} from '@/features/certificates/hooks/useCertificates';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Textarea } from '@/shared/components/ui/textarea';

type MasterclassCertificatesAdminProps = {
  masterclassId: string;
  masterclassTitle: string;
};

export function MasterclassCertificatesAdmin({
  masterclassId,
  masterclassTitle,
}: MasterclassCertificatesAdminProps) {
  const { data: settings, isLoading: settingsLoading } =
    useMasterclassCertificateSettings(masterclassId);
  const { data: adminData, isLoading: listLoading } =
    useMasterclassCertificatesAdmin(masterclassId);
  const updateSettings = useUpdateMasterclassCertificateSettings(masterclassId);
  const issueMutation = useManualIssueCertificate(masterclassId);
  const deleteMutation = useDeleteCertificate(masterclassId);

  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateUrl, setTemplateUrl] = useState('');

  const [issueUserId, setIssueUserId] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState('');

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.certificateEnabled);
    setTitle(settings.certificateTitle ?? '');
    setDescription(settings.certificateDescription ?? '');
    setTemplateUrl(settings.certificateTemplateUrl ?? '');
  }, [settings]);

  const handleSaveSettings = async () => {
    await updateSettings.mutateAsync({
      certificateEnabled: enabled,
      certificateTitle: title.trim() || null,
      certificateDescription: description.trim() || null,
      certificateTemplateUrl: templateUrl.trim() || null,
    });
  };

  const handleManualIssue = async (userId: string) => {
    await issueMutation.mutateAsync({
      userId,
      externalCertificateUrl: externalUrl.trim() || null,
    });
    setIssueUserId(null);
    setExternalUrl('');
  };

  const handleRevokeCertificate = async (certificateId: string, studentLabel: string) => {
    const confirmed = window.confirm(
      `Remove certificate for ${studentLabel}? They can complete again or receive a new manual issue.`,
    );
    if (!confirmed) return;
    await deleteMutation.mutateAsync(certificateId);
  };

  if (settingsLoading || listLoading) return <LoadingSpinner />;

  const rows = adminData?.items ?? [];

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Certificate settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Enable certificate</Label>
              <p className="text-sm text-neutral-500">
                Learners receive a certificate after completing all lessons (or manual issue).
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="space-y-2">
            <Label>Certificate title</Label>
            <Input
              placeholder={masterclassTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description (shown to learners)</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {/* <div className="space-y-2">
            <Label>Optional template URL (reference)</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={templateUrl}
              onChange={(e) => setTemplateUrl(e.target.value)}
            />
          </div> */}
          <Button
            type="button"
            disabled={updateSettings.isPending}
            onClick={() => void handleSaveSettings()}
          >
            {updateSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save certificate settings
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Enrolled learners ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-neutral-500">No enrollments yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {rows.map((row) => {
                const displayName =
                  row.firstName || row.lastName
                    ? `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim()
                    : row.name || row.email;
                const isIssuing = issueUserId === row.userId && issueMutation.isPending;

                return (
                  <li key={row.userId} className="px-4 py-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <MasterclassEnrolledLearnerDetails
                        firstName={row.firstName}
                        lastName={row.lastName}
                        name={row.name}
                        email={row.email}
                        phoneNumber={row.phoneNumber}
                        source={row.source}
                        purchasedPriceInCents={row.purchasedPriceInCents}
                        subtitle={
                          <p className="text-xs text-neutral-400">
                            {row.completedLessons}/{row.totalLessons} lessons
                            {row.isComplete ? ' · Complete' : ''}
                          </p>
                        }
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        {row.certificate ? (
                          <>
                            <Badge className="bg-[#29cf9f]">{row.certificate.certificateCode}</Badge>
                            <Button type="button" size="sm" variant="outline" asChild>
                              <a
                                href={certificateDownloadUrl(row.certificate.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button type="button" size="sm" variant="outline" asChild>
                              <a
                                href={certificatePublicShareUrl(row.certificate.certificateCode)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Public verification page"
                              >
                                <Link2 className="h-4 w-4" />
                              </a>
                            </Button>
                            <CertificateShareButton
                              certificateCode={row.certificate.certificateCode}
                              variant="ghost"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={deleteMutation.isPending}
                              title="Remove certificate"
                              onClick={() =>
                                void handleRevokeCertificate(row.certificate!.id, displayName)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {row.certificate.externalCertificateUrl && (
                              <Button type="button" size="sm" variant="ghost" asChild>
                                <a
                                  href={row.certificate.externalCertificateUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!enabled || issueMutation.isPending}
                            onClick={() => setIssueUserId(row.userId)}
                          >
                            <UserPlus className="mr-1 h-4 w-4" />
                            Issue
                          </Button>
                        )}
                      </div>
                    </div>
                    {issueUserId === row.userId && !row.certificate && (
                      <div className="flex flex-wrap items-end gap-2 rounded-lg bg-neutral-50 p-3">
                        <div className="flex-1 min-w-[200px]">
                          <Label className="text-xs">External URL (optional)</Label>
                          <Input
                            value={externalUrl}
                            onChange={(e) => setExternalUrl(e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isIssuing}
                          onClick={() => void handleManualIssue(row.userId)}
                        >
                          {isIssuing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm issue'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setIssueUserId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
