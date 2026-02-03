import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

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

export default function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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
      // Try with a workaround
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
            className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-500 transition-colors"
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
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoFocus
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Descripción (opcional)..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                      ? 'bg-violet-600 text-white'
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
                className="px-6 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
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
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => loadProject(project.id)}
                className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden hover:border-violet-500/50 transition-all text-left group"
              >
                {/* Cover */}
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                  {project.coverUrl ? (
                    <img src={project.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl opacity-30">
                        {project.category === 'images' ? '🖼️' : project.category === 'videos' ? '🎬' : '📁'}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded-lg">
                    <span className="text-white text-xs">{project.itemCount} items</span>
                  </div>
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
            ))}
          </div>
        )}
      </div>
    );
  }

  // Project detail view
  const references = selectedProject.items?.filter((i) => i.type === 'reference') || [];
  const creations = selectedProject.items?.filter((i) => i.type !== 'reference') || [];

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
              : 'bg-violet-600 text-white hover:bg-violet-500'
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creations.map((item) => (
              <div key={item.id} className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden group">
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
                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    ✕
                  </button>
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      item.type === 'image' ? 'bg-violet-600/80 text-white'
                        : item.type === 'video' ? 'bg-fuchsia-600/80 text-white'
                        : 'bg-emerald-600/80 text-white'
                    }`}>
                      {item.type === 'image' ? '🖼️' : item.type === 'video' ? '🎬' : '🎙️'}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-gray-300 text-sm truncate">{item.prompt}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(item.createdAt).toLocaleDateString('es')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
