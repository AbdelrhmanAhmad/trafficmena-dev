import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type { MasterclassModule } from '@/app/api/masterclasses';
import type { MasterclassLesson } from '@/app/api/masterclasses';
import { MasterclassLessonFilesCrud } from '@/features/masterclasses/components/MasterclassLessonFilesCrud';
import { MasterclassLessonVideosCrud } from '@/features/masterclasses/components/MasterclassLessonVideosCrud';
import { useMasterclassCurriculumMutations } from '@/features/masterclasses/hooks/useMasterclasses';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

type MasterclassCurriculumEditorProps = {
  masterclassId: string;
  modules: MasterclassModule[];
  canDelete?: boolean;
};

type SelectedLesson = {
  moduleId: string;
  lesson: MasterclassLesson;
};

function moveItem<T extends { id: string }>(items: T[], id: string, direction: 'up' | 'down'): T[] {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return items;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function LessonMediaEditor({
  masterclassId,
  moduleId,
  lesson,
  canDelete = false,
}: {
  masterclassId: string;
  moduleId: string;
  lesson: MasterclassLesson;
  canDelete?: boolean;
}) {
  const videos = lesson.videos ?? [];
  const files = lesson.files ?? [];

  return (
    <div className="mt-4 space-y-4 rounded-lg border bg-neutral-50 p-4">
      <MasterclassLessonVideosCrud
        masterclassId={masterclassId}
        moduleId={moduleId}
        lessonId={lesson.id}
        videos={videos}
        canDelete={canDelete}
      />

      <MasterclassLessonFilesCrud
        masterclassId={masterclassId}
        moduleId={moduleId}
        lessonId={lesson.id}
        files={files}
        canDelete={canDelete}
      />
    </div>
  );
}

export function MasterclassCurriculumEditor({
  masterclassId,
  modules,
  canDelete = false,
}: MasterclassCurriculumEditorProps) {
  const mutations = useMasterclassCurriculumMutations(masterclassId);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [selectedLesson, setSelectedLesson] = useState<SelectedLesson | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newLessonTitles, setNewLessonTitles] = useState<Record<string, string>>({});

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;
    await mutations.createModule.mutateAsync({ title: newModuleTitle.trim() });
    setNewModuleTitle('');
  };

  const handleAddLesson = async (moduleId: string) => {
    const title = newLessonTitles[moduleId]?.trim();
    if (!title) return;
    await mutations.createLesson.mutateAsync({ moduleId, payload: { title } });
    setNewLessonTitles((prev) => ({ ...prev, [moduleId]: '' }));
    setExpandedModules((prev) => new Set(prev).add(moduleId));
  };

  const handleReorderModules = async (moduleId: string, direction: 'up' | 'down') => {
    const reordered = moveItem(modules, moduleId, direction);
    if (reordered === modules) return;
    await mutations.reorderModules.mutateAsync(reordered.map((m) => m.id));
  };

  const handleReorderLessons = async (
    moduleId: string,
    lessons: MasterclassLesson[],
    lessonId: string,
    direction: 'up' | 'down',
  ) => {
    const reordered = moveItem(lessons, lessonId, direction);
    if (reordered === lessons) return;
    await mutations.reorderLessons.mutateAsync({
      moduleId,
      orderedIds: reordered.map((l) => l.id),
    });
  };

  const busy = mutations.createModule.isPending || mutations.createLesson.isPending;

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Curriculum</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {modules.length === 0 ? (
          <p className="text-sm text-neutral-500">No modules yet. Add your first module below.</p>
        ) : (
          modules.map((module, moduleIndex) => {
            const lessons = module.lessons ?? [];
            const isExpanded = expandedModules.has(module.id);

            return (
              <div key={module.id} className="rounded-xl border bg-white">
                <div className="flex items-center gap-2 border-b px-4 py-3">
                  <button type="button" onClick={() => toggleModule(module.id)}>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <span className="flex-1 font-semibold">
                    Module {moduleIndex + 1}: {module.title}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={moduleIndex === 0 || mutations.reorderModules.isPending}
                      onClick={() => void handleReorderModules(module.id, 'up')}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={moduleIndex === modules.length - 1 || mutations.reorderModules.isPending}
                      onClick={() => void handleReorderModules(module.id, 'down')}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!canDelete}
                      onClick={() => {
                        if (!window.confirm('Delete this module and all its lessons?')) return;
                        void mutations.deleteModule.mutateAsync(module.id);
                        if (selectedLesson?.moduleId === module.id) setSelectedLesson(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-3 px-4 py-3">
                    {lessons.map((lesson, lessonIndex) => {
                      const isSelected =
                        selectedLesson?.lesson.id === lesson.id &&
                        selectedLesson.moduleId === module.id;

                      return (
                        <div key={lesson.id}>
                          <div
                            className={`flex items-center gap-2 rounded-lg px-2 py-2 ${
                              isSelected ? 'bg-emerald-50' : 'hover:bg-neutral-50'
                            }`}
                          >
                            <button
                              type="button"
                              className="flex-1 text-left text-sm"
                              onClick={() =>
                                setSelectedLesson(
                                  isSelected ? null : { moduleId: module.id, lesson },
                                )
                              }
                            >
                              Lesson {lessonIndex + 1}: {lesson.title}
                              <span className="ml-2 text-xs text-neutral-400">
                                {(lesson.videos?.length ?? 0)} videos · {(lesson.files?.length ?? 0)} files
                              </span>
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={lessonIndex === 0}
                              onClick={() =>
                                void handleReorderLessons(module.id, lessons, lesson.id, 'up')
                              }
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={lessonIndex === lessons.length - 1}
                              onClick={() =>
                                void handleReorderLessons(module.id, lessons, lesson.id, 'down')
                              }
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!canDelete}
                              onClick={() => {
                                if (!window.confirm('Delete this lesson?')) return;
                                void mutations.deleteLesson.mutateAsync({
                                  moduleId: module.id,
                                  lessonId: lesson.id,
                                });
                                if (selectedLesson?.lesson.id === lesson.id) setSelectedLesson(null);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                          {isSelected && (
                            <LessonMediaEditor
                              masterclassId={masterclassId}
                              moduleId={module.id}
                              lesson={lesson}
                              canDelete={canDelete}
                            />
                          )}
                        </div>
                      );
                    })}

                    <div className="flex gap-2">
                      <Input
                        placeholder="New lesson title"
                        value={newLessonTitles[module.id] ?? ''}
                        onChange={(e) =>
                          setNewLessonTitles((prev) => ({
                            ...prev,
                            [module.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleAddLesson(module.id)}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add lesson
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        <div className="flex gap-2 pt-2">
          <Input
            placeholder="New module title"
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
          />
          <Button type="button" disabled={busy} onClick={() => void handleAddModule()}>
            <Plus className="mr-2 h-4 w-4" />
            Add module
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
