'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  FolderKanban, Plus, Search, LayoutGrid, List, ChevronLeft, ChevronRight,
  MapPin, Calendar, Users,
} from 'lucide-react';

interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  location: string | null;
  client: { id: string; name: string } | null;
  progress: number;
  taskCount: number;
  completedTaskCount: number;
  teamCount: number;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  borrador: { label: 'Borrador', color: 'bg-slate-600', variant: 'default' },
  en_curso: { label: 'En Curso', color: 'bg-yellow-600', variant: 'warning' },
  en_pausa: { label: 'En Pausa', color: 'bg-blue-600', variant: 'info' },
  completado: { label: 'Completado', color: 'bg-green-600', variant: 'success' },
  cancelado: { label: 'Cancelado', color: 'bg-red-600', variant: 'danger' },
};

const PRIORITY_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  baja: { label: 'Baja', variant: 'default' },
  media: { label: 'Media', variant: 'info' },
  alta: { label: 'Alta', variant: 'warning' },
  urgente: { label: 'Urgente', variant: 'danger' },
};

const KANBAN_COLUMNS = ['borrador', 'en_curso', 'en_pausa', 'completado', 'cancelado'];

export default function ProjectsPage() {
  const { token, selectedCompany } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterClient, setFilterClient] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', clientId: '', priority: 'media', location: '' });

  const headers = useCallback(() => ({
    'Authorization': `Bearer ${token}`,
    'X-Company-Id': selectedCompany?.id || '',
    'Content-Type': 'application/json',
  }), [token, selectedCompany]);

  const fetchProjects = useCallback(async () => {
    if (!token || !selectedCompany) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50', search });
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterPriority !== 'all') params.set('priority', filterPriority);
      if (filterClient) params.set('clientId', filterClient);

      const res = await fetch(`/api/projects?${params}`, { headers: headers() });
      const data = await res.json();
      if (res.ok) {
        setProjects(data.projects);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      toast.error('Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  }, [token, selectedCompany, page, search, filterStatus, filterPriority, filterClient, headers]);

  const fetchClients = useCallback(async () => {
    if (!token || !selectedCompany) return;
    try {
      const res = await fetch('/api/clients?limit=100', { headers: headers() });
      const data = await res.json();
      if (res.ok) setClients(data.clients || []);
    } catch { /* ignore */ }
  }, [token, selectedCompany, headers]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Proyecto creado correctamente');
        setShowCreateModal(false);
        setForm({ name: '', description: '', clientId: '', priority: 'media', location: '' });
        fetchProjects();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al crear proyecto');
      }
    } catch {
      toast.error('Error al crear proyecto');
    } finally {
      setCreating(false);
    }
  };

  const ProjectCard = ({ project }: { project: Project }) => {
    const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.borrador;
    const priorityCfg = PRIORITY_CONFIG[project.priority] || PRIORITY_CONFIG.media;

    return (
      <Card
        className="cursor-pointer hover:border-slate-500 transition-colors"
        onClick={() => router.push(`/projects/${project.id}`)}
      >
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400 font-mono">{project.code}</p>
              <h3 className="text-sm font-semibold text-white truncate">{project.name}</h3>
            </div>
            <Badge variant={priorityCfg.variant}>{priorityCfg.label}</Badge>
          </div>

          {project.client && (
            <p className="text-xs text-slate-400 truncate">{project.client.name}</p>
          )}

          <div className="flex items-center gap-2">
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progreso</span>
              <span>{project.progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            {project.location && (
              <span className="flex items-center gap-1"><MapPin size={12} />{project.location}</span>
            )}
            <span className="flex items-center gap-1"><Users size={12} />{project.teamCount}</span>
            <span className="flex items-center gap-1"><Calendar size={12} />{new Date(project.createdAt).toLocaleDateString('es-ES')}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FolderKanban size={20} /> Proyectos
        </h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Nuevo Proyecto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar proyectos..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-600 text-white"
        >
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-600 text-white"
        >
          <option value="all">Todas las prioridades</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterClient}
          onChange={(e) => { setFilterClient(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-600 text-white"
        >
          <option value="">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="flex border border-slate-600 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-2 ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12 text-slate-500">
              <FolderKanban size={40} className="mx-auto mb-3 opacity-50" />
              <p>No se encontraron proyectos</p>
              <p className="text-sm mt-1">Crea tu primer proyecto para empezar</p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const statusCfg = STATUS_CONFIG[col];
            const colProjects = projects.filter((p) => p.status === col);
            return (
              <div key={col} className="min-w-[280px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-3 h-3 rounded-full ${statusCfg.color}`} />
                  <h3 className="text-sm font-semibold text-white">{statusCfg.label}</h3>
                  <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">
                    {colProjects.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {colProjects.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                  {colProjects.length === 0 && (
                    <div className="text-center py-8 text-slate-600 text-xs border border-dashed border-slate-700 rounded-xl">
                      Sin proyectos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Prioridad</th>
                    <th className="px-4 py-3">Progreso</th>
                    <th className="px-4 py-3">Equipo</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => {
                    const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.borrador;
                    const priorityCfg = PRIORITY_CONFIG[p.priority] || PRIORITY_CONFIG.media;
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                        onClick={() => router.push(`/projects/${p.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.code}</td>
                        <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-slate-300">{p.client?.name || '-'}</td>
                        <td className="px-4 py-3"><Badge variant={statusCfg.variant}>{statusCfg.label}</Badge></td>
                        <td className="px-4 py-3"><Badge variant={priorityCfg.variant}>{priorityCfg.label}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-xs text-slate-400">{p.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{p.teamCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm text-slate-400">Página {page} de {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo Proyecto" className="max-w-lg">
        <div className="space-y-4">
          <Input
            label="Nombre del proyecto *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej: Stand Feria Barcelona 2026"
          />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Descripción del proyecto..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Cliente</label>
            <select
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-600 text-white"
            >
              <option value="">Sin cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Prioridad</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-600 text-white"
            >
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Ubicación"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Ej: Barcelona, España"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={creating}>Crear Proyecto</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
