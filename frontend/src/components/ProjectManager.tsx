import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { STYLES } from '../types';

interface ProjectItem {
  id: string;
  projectId: string;
  type: string;
  prompt: string;
  url: string;
  thumbnailUrl?: string;
  style: string;
  notes?: string;
  createdAt: string;
  parentItemId?: string;
  iterationNumber: number;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  category: string;
  coverUrl?: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  items?: ProjectItem[];
}

interface IterationGroup {
  parentId: string;
  parent: ProjectItem;
  variations: ProjectItem[];
}

export default function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Recrear modal state
  const [recreatingItem, setRecreatingItem] = useState<ProjectItem | null>(null);
  const [recreatePrompt, setRecreatePrompt] = useState('');
  const [recreateStyle, setRecreateStyle] = useState('photorealistic');
  const [isRecreating, setIsRecreating] = useState(false);
  const [recreateError, setRecreateError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.get<Project[]>('/project');
      setProjects(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const loadProject = async (id: string) => {
    try {
      const project = await api.get<Project>(`/project/${id}`);
      setSelectedProject(project);
    } catch {
      // silently fail
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const project = await api.post<Project>('/project', {
        name: newName.trim(),
        description: newDescription.trim() || null,
        category: newCategory,
      });
      setProjects((prev) => [project, ...prev]);
      setNewName('');
      setNewDescription('');
      setShowCreateForm(false);
      setSelectedProject(project);
    } catch {
      // silently fail
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('¿Eliminar este proyecto y todo su contenido?')) return;
    try {
      await api.post(`/project/${id}`, null); // will use DELETE
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (selectedProject?.id === id) setSelectedProject(null);
    } catch {
      try {
        await fetch(`/api/project/${id}`, { method: 'DELETE' });
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (selectedProject?.id === id) setSelectedProject(null);
      } catch { /* silently */ }
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await fetch(`/api/project/items/${itemId}`, { method: 'DELETE' });
      if (selectedProject) {
        setSelectedProject({
          ...selectedProject,
          items: selectedProject.items?.filter((i) => i.id !== itemId),
          itemCount: selectedProject.itemCount - 1,
        });
      }
    } catch { /* silently */ }
  };

  const uploadReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProject || !e.target.files?.length) return;
    const file = e.target.files[0];

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('notes', 'Imagen de referencia');

      const response = await fetch(`/api/project/${selectedProject.id}/reference`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await loadProject(selectedProject.id);
      }
    } catch { /* silently */ }
    finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Recrear functionality
  const openRecreateModal = (item: ProjectItem) => {
    setRecreatingItem(item);
    setRecreatePrompt(item.prompt);
    setRecreateStyle(item.style || 'photorealistic');
    setRecreateError(null);
  };

  const closeRecreateModal = () => {
    setRecreatingItem(null);
    setRecreatePrompt('');
    setRecreateStyle('photorealistic');
    setRecreateError(null);
  };

  const handleRecreate = async () => {
    if (!recreatingItem || !selectedProject || !recreatePrompt.trim()) return;

    setIsRecreating(true);
    setRecreateError(null);

    try {
      // Generate with the original item's URL as reference
      const result = await api.post<{
        id: string; prompt: string; type: string; style: string; url: string; createdAt: string;
      }>('/generation/create', {
        prompt: recreatePrompt.trim(),
        type: recreatingItem.type === 'voice' ? 'image' : recreatingItem.type,
        style: recreateStyle,
        referenceImages: [recreatingItem.url],
      });

      // Find the parent — either the item itself (if original) or the item's parent
      const parentId = recreatingItem.parentItemId || recreatingItem.id;

      // Count existing iterations for this parent
      const siblings = selectedProject.items?.filter(
        (i) => i.parentItemId === parentId || i.id === parentId
      ) || [];
      const nextIteration = siblings.length + 1;

      // Save to project
      const newItem = await api.post<ProjectItem>(`/project/${selectedProject.id}/items`, {
        projectId: selectedProject.id,
        type: recreatingItem.type,
        prompt: recreatePrompt.trim(),
        url: result.url,
        style: recreateStyle,
        parentItemId: parentId,
        iterationNumber: nextIteration,
        notes: `Variación de "${recreatingItem.prompt.slice(0, 50)}..."`,
      });

      // Update local state
      setSelectedProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: [...(prev.items || []), newItem],
          itemCount: prev.itemCount + 1,
        };
      });

      closeRecreateModal();
    } catch (err) {
      setRecreateError(
        err instanceof Error ? err.message : 'Error al generar variación. Intenta de nuevo.'
      );
    } finally {
      setIsRecreating(false);
    }
  };

  // Group items by parent for iteration display
  const groupItemsByIteration = (items: ProjectItem[]): { ungrouped: ProjectItem[]; groups: IterationGroup[] } => {
    const creations = items.filter((i) => i.type !== 'reference');

    // Find items that are parents (have children) or are children
    const parentIds = new Set(creations.filter((i) => i.parentItemId).map((i) => i.parentItemId!));
    const childItems = new Set(creations.filter((i) => i.parentItemId).map((i) => i.id));

    const groups: IterationGroup[] = [];
    const ungrouped: ProjectItem[] = [];

    // Build groups
    for (const item of creations) {
      if (parentIds.has(item.id)) {
        // This item is a parent
        const variations = creations
          .filter((i) => i.parentItemId === item.id)
          .sort((a, b) => (a.iterationNumber || 0) - (b.iterationNumber || 0));
        groups.push({ parentId: item.id, parent: item, variations });
      } else if (!childItems.has(item.id) && !item.parentItemId) {
        // Standalone item (no parent, no children)
        ungrouped.push(item);
      }
      // Skip items that are children — they're shown in their parent's group
    }

    return { ungrouped, groups };
  };

  // Project list view
  if (!selectedProject) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-xl">📁 Mis Proyectos</h2>
            <p className="text-gray-400 text-sm mt-1">Organiza tus imágenes y videos en proyectos</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 accent-bg text-white rounded-xl text-sm font-medium hover:accent-bg transition-colors"
          >
            ➕ Nuevo Proyecto
          </button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <form onSubmit={createProject} className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-5 space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del proyecto..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 accent-ring-focus"
              autoFocus
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Descripción (opcional)..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 accent-ring-focus"
            />
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'general', label: '📁 General', },
                { value: 'images', label: '🖼️ Imágenes', },
                { value: 'videos', label: '🎬 Videos', },
                { value: 'mixed', label: '🎨 Mixto', },
              ].map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setNewCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    newCategory === cat.value
                      ? 'accent-bg text-white'
                      : 'bg-gray-900 text-gray-400 border border-gray-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!newName.trim()}
                className="px-6 py-2 accent-bg text-white rounded-xl text-sm font-medium hover:accent-bg disabled:opacity-50"
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-600"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Project list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-700 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-700 rounded w-1/3" />
                    <div className="h-4 bg-gray-700 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 p-12 text-center">
            <p className="text-5xl mb-4">📂</p>
            <p className="text-white font-medium mb-2">No tienes proyectos todavía</p>
            <p className="text-gray-400 text-sm">Crea uno para organizar tus imágenes, videos y referencias</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Sort: "Mis Creaciones" always first */}
            {[...projects].sort((a, b) => {
              if (a.id === 'mis-creaciones') return -1;
              if (b.id === 'mis-creaciones') return 1;
              return 0;
            }).map((project) => {
              const isAutoSave = project.id === 'mis-creaciones';
              return (
              <button
                key={project.id}
                onClick={() => loadProject(project.id)}
                className={`bg-gray-800/50 rounded-2xl border overflow-hidden accent-border-hover/50 transition-all text-left group ${
                  isAutoSave ? 'accent-border/40 ring-1 ring-violet-500/20' : 'border-gray-700/50'
                }`}
              >
                {/* Cover */}
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                  {project.coverUrl ? (
                    <img src={project.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl opacity-30">
                        {isAutoSave ? '✨' : project.category === 'images' ? '🖼️' : project.category === 'videos' ? '🎬' : '📁'}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded-lg">
                    <span className="text-white text-xs">{project.itemCount} items</span>
                  </div>
                  {isAutoSave && (
                    <div className="absolute top-2 left-2 accent-bg/90 px-2 py-0.5 rounded-lg">
                      <span className="text-white text-xs font-medium">✨ Auto-guardado</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-4">
                  <h3 className="text-white font-medium truncate">{project.name}</h3>
                  {project.description && (
                    <p className="text-gray-400 text-sm truncate mt-1">{project.description}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    {new Date(project.updatedAt).toLocaleDateString('es')}
                  </p>
                </div>
              </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Project detail view
  const references = selectedProject.items?.filter((i) => i.type === 'reference') || [];
  const creations = selectedProject.items?.filter((i) => i.type !== 'reference') || [];
  const { ungrouped, groups } = groupItemsByIteration(creations);

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSelectedProject(null)}
          className="px-3 py-2 bg-gray-800 text-gray-400 rounded-xl text-sm hover:text-white hover:bg-gray-700 transition-colors"
        >
          ← Volver
        </button>
        <div className="flex-1">
          <h2 className="text-white font-bold text-xl">{selectedProject.name}</h2>
          {selectedProject.description && (
            <p className="text-gray-400 text-sm">{selectedProject.description}</p>
          )}
        </div>
        <button
          onClick={() => deleteProject(selectedProject.id)}
          className="px-3 py-2 bg-red-900/20 text-red-400 rounded-xl text-sm hover:bg-red-900/40 transition-colors"
        >
          🗑️ Eliminar
        </button>
      </div>

      {/* Reference images section */}
      <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">🖼️ Imágenes de Referencia</h3>
          <label className={`px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
            uploading
              ? 'bg-gray-700 text-gray-400'
              : 'accent-bg text-white hover:accent-bg'
          }`}>
            {uploading ? 'Subiendo...' : '📤 Subir Referencia'}
            <input
              type="file"
              accept="image/*"
              onChange={uploadReference}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
        {references.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">
            Sube imágenes de referencia para tener inspiración visual
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {references.map((ref) => (
              <div key={ref.id} className="relative group rounded-xl overflow-hidden">
                <img src={ref.url} alt={ref.notes || ''} className="w-full aspect-square object-cover" />
                <button
                  onClick={() => removeItem(ref.id)}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Creations */}
      <div>
        <h3 className="text-white font-medium mb-4">✨ Creaciones ({creations.length})</h3>
        {creations.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            Genera imágenes o videos y guárdalos aquí desde la galería
          </p>
        ) : (
          <div className="space-y-6">
            {/* Iteration groups */}
            {groups.map((group) => (
              <div key={group.parentId} className="bg-gray-800/30 rounded-2xl border border-gray-700/30 p-4">
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="accent-text text-sm font-medium">🔄 Iteraciones</span>
                  <span className="text-gray-500 text-xs">
                    Versión 1 {group.variations.map((_, i) => `→ ${i + 2}`).join(' ')}
                  </span>
                </div>

                {/* Horizontal timeline */}
                <div className="flex items-start gap-3 overflow-x-auto pb-3">
                  {/* Original (parent) */}
                  <div className="flex-shrink-0 w-48">
                    <CreationCard
                      item={group.parent}
                      iterationBadge={1}
                      isParent
                      onRemove={removeItem}
                      onRecreate={openRecreateModal}
                    />
                  </div>

                  {/* Arrow */}
                  {group.variations.length > 0 && (
                    <div className="flex-shrink-0 flex items-center self-center text-gray-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  )}

                  {/* Variations */}
                  {group.variations.map((variation, idx) => (
                    <div key={variation.id} className="flex-shrink-0 flex items-start gap-3">
                      <div className="w-48">
                        <CreationCard
                          item={variation}
                          iterationBadge={idx + 2}
                          onRemove={removeItem}
                          onRecreate={openRecreateModal}
                        />
                      </div>
                      {idx < group.variations.length - 1 && (
                        <div className="flex-shrink-0 flex items-center self-center text-gray-600">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Ungrouped (standalone) items */}
            {ungrouped.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ungrouped.map((item) => (
                  <CreationCard
                    key={item.id}
                    item={item}
                    onRemove={removeItem}
                    onRecreate={openRecreateModal}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recrear modal */}
      {recreatingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">🔄 Recrear Variación</h3>
              <button
                onClick={closeRecreateModal}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {/* Original preview */}
            <div className="flex gap-3 bg-gray-800/50 rounded-xl p-3">
              {recreatingItem.type === 'video' ? (
                <video src={recreatingItem.url} className="w-16 h-16 object-cover rounded-lg" muted />
              ) : (
                <img src={recreatingItem.url} alt="" className="w-16 h-16 object-cover rounded-lg" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-xs">Original</p>
                <p className="text-gray-300 text-sm truncate">{recreatingItem.prompt}</p>
              </div>
            </div>

            {/* Editable prompt */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Prompt (editable)</label>
              <textarea
                value={recreatePrompt}
                onChange={(e) => setRecreatePrompt(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 accent-ring-focus resize-none text-sm"
              />
            </div>

            {/* Style selection */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Estilo</label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setRecreateStyle(s.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      recreateStyle === s.value
                        ? 'accent-bg text-white shadow-lg'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 accent-border-hover'
                    }`}
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {recreateError && (
              <div className="bg-red-900/20 border border-red-900/30 rounded-xl p-3">
                <p className="text-red-400 text-sm">❌ {recreateError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleRecreate}
                disabled={!recreatePrompt.trim() || isRecreating}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  isRecreating
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r accent-gradient text-white hover:from-violet-500 hover:to-fuchsia-500 shadow-lg accent-shadow'
                }`}
              >
                {isRecreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generando variación...
                  </span>
                ) : (
                  '✨ Generar variación'
                )}
              </button>
              <button
                onClick={closeRecreateModal}
                disabled={isRecreating}
                className="px-6 py-3 bg-gray-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-600 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Creation card
function CreationCard({
  item,
  iterationBadge,
  isParent,
  onRemove,
  onRecreate,
}: {
  item: ProjectItem;
  iterationBadge?: number;
  isParent?: boolean;
  onRemove: (id: string) => void;
  onRecreate: (item: ProjectItem) => void;
}) {
  return (
    <div className={`bg-gray-800 rounded-2xl border overflow-hidden group ${
      isParent ? 'border-violet-700/50' : 'border-gray-700'
    }`}>
      <div className="aspect-square relative overflow-hidden">
        {item.type === 'video' ? (
          <video src={item.url} controls className="w-full h-full object-cover" />
        ) : item.type === 'voice' ? (
          <div className="w-full h-full bg-gradient-to-br from-emerald-900/30 to-teal-900/30 flex items-center justify-center">
            <div className="text-center p-4">
              <span className="text-4xl">🎙️</span>
              <audio controls className="w-full mt-3" style={{ height: '32px' }}>
                <source src={item.url} type="audio/mpeg" />
              </audio>
            </div>
          </div>
        ) : (
          <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
        )}

        {/* Remove button */}
        <button
          onClick={() => onRemove(item.id)}
          className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          ✕
        </button>

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
            item.type === 'image' ? 'accent-bg/80 text-white'
              : item.type === 'video' ? 'accent-bg/80 text-white'
              : 'bg-emerald-600/80 text-white'
          }`}>
            {item.type === 'image' ? '🖼️' : item.type === 'video' ? '🎬' : '🎙️'}
          </span>
        </div>

        {/* Iteration badge */}
        {iterationBadge !== undefined && (
          <div className="absolute bottom-2 left-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
              isParent
                ? 'accent-bg text-white'
                : 'accent-bg/90 text-white'
            }`}>
              V{iterationBadge}
            </span>
          </div>
        )}

        {/* Recrear button */}
        {item.type !== 'voice' && (
          <button
            onClick={(e) => { e.stopPropagation(); onRecreate(item); }}
            className="absolute bottom-2 right-2 px-2.5 py-1.5 accent-bg/90 text-white rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:accent-bg shadow-lg"
          >
            🔄 Recrear
          </button>
        )}
      </div>
      <div className="p-3">
        <p className="text-gray-300 text-sm truncate">{item.prompt}</p>
        <p className="text-gray-500 text-xs mt-1">
          {new Date(item.createdAt).toLocaleDateString('es')}
        </p>
      </div>
    </div>
  );
}
