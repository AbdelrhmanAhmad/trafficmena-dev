import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  createSkill,
  deleteSkill,
  fetchSkills,
  updateSkill,
  type SkillRecord,
} from '@/app/api/skills';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { BilingualTextField } from '@/shared/components/admin/BilingualTextField';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';

type SkillFormState = {
  nameEn: string;
  nameAr: string;
  category: string;
  description: string;
};

const emptyForm = (): SkillFormState => ({
  nameEn: '',
  nameAr: '',
  category: '',
  description: '',
});

function skillLabel(skill: SkillRecord): string {
  return skill.nameEn ?? skill.name ?? skill.nameAr ?? skill.id;
}

export default function AdminSkillsPage() {
  const { toast } = useToast();
  const { isAdmin, isManager } = useRolePermissions();
  const canManage = isManager || isAdmin;
  const canDelete = isAdmin;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SkillRecord | null>(null);
  const [form, setForm] = useState<SkillFormState>(emptyForm);

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['admin', 'skills'],
    queryFn: fetchSkills,
    enabled: canManage,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nameEn: form.nameEn.trim(),
        nameAr: form.nameAr.trim(),
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
      };
      if (editing) {
        return updateSkill(editing.id, payload);
      }
      return createSkill(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      toast({ title: editing ? 'Skill updated' : 'Skill created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSkill(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
      toast({ title: 'Skill deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (skill: SkillRecord) => {
    setEditing(skill);
    setForm({
      nameEn: skill.nameEn ?? skill.name ?? '',
      nameAr: skill.nameAr ?? skill.name ?? '',
      category: skill.category ?? '',
      description: skill.description ?? '',
    });
    setDialogOpen(true);
  };

  return (
    <AdminProtectedRoute requiredRole="manager">
      <AppLayout variant="admin">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Skills</h1>
              <p className="text-sm text-neutral-600">Manage bilingual skill labels for profiles.</p>
            </div>
            <Button type="button" onClick={openCreate}>
              <Plus className="me-2 h-4 w-4" />
              Add skill
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All skills</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-neutral-500">Loading skills…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name (EN)</TableHead>
                      <TableHead>Name (AR)</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-end">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skills.map((skill) => (
                      <TableRow key={skill.id}>
                        <TableCell>{skill.nameEn ?? skill.name}</TableCell>
                        <TableCell dir="rtl">{skill.nameAr ?? skill.name}</TableCell>
                        <TableCell>{skill.category ?? '—'}</TableCell>
                        <TableCell className="text-end">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(skill)}>
                            Edit
                          </Button>
                          {canDelete && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ms-2 text-destructive"
                              onClick={() => deleteMutation.mutate(skill.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit skill' : 'Create skill'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <BilingualTextField
                label="Skill name"
                englishLabel="Name (English)"
                arabicLabel="Name (Arabic)"
                valueEn={form.nameEn}
                valueAr={form.nameAr}
                onChangeEn={(value) => setForm((prev) => ({ ...prev, nameEn: value }))}
                onChangeAr={(value) => setForm((prev) => ({ ...prev, nameAr: value }))}
                required
              />
              <div className="space-y-2">
                <Label htmlFor="skill-category">Category (optional)</Label>
                <Input
                  id="skill-category"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-description">Description (optional)</Label>
                <Input
                  id="skill-description"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!form.nameEn.trim() || !form.nameAr.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppLayout>
    </AdminProtectedRoute>
  );
}
