'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Globe,
  Trash2,
  Edit3,
  X,
  Building2,
  FileText,
  User,
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  cif: string;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  contactRole: string | null;
  web: string | null;
  paymentTerms: string;
  iban: string | null;
  notes: string | null;
  tags: string | null;
  status: string;
  projectStats?: { total: number; active: number; completed: number };
  recentProjects?: Array<{ id: string; code: string; name: string; status: string }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TAG_OPTIONS = [
  { value: 'VIP', color: 'bg-amber-900/50 text-amber-400 border-amber-700' },
  { value: 'moroso', color: 'bg-red-900/50 text-red-400 border-red-700' },
  { value: 'nuevo', color: 'bg-blue-900/50 text-blue-400 border-blue-700' },
  { value: 'recurrente', color: 'bg-green-900/50 text-green-400 border-green-700' },
  { value: 'internacional', color: 'bg-purple-900/50 text-purple-400 border-purple-700' },
  { value: 'gran_cuenta', color: 'bg-cyan-900/50 text-cyan-400 border-cyan-700' },
];

function getTagColor(tag: string) {
  return TAG_OPTIONS.find(t => t.value === tag)?.color || 'bg-slate-600 text-slate-200';
}

const emptyForm = {
  name: '',
  cif: '',
  address: '',
  postalCode: '',
  city: '',
  province: '',
  country: 'España',
  phone: '',
  email: '',
  contactPerson: '',
  contactRole: '',
  web: '',
  paymentTerms: '30',
  iban: '',
  notes: '',
  tags: [] as string[],
  status: 'active',
};

export default function ClientsPage() {
  const { token, selectedCompany } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchDebounce, setSearchDebounce] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'x-company-id': selectedCompany?.id || '',
    'Content-Type': 'application/json',
  }), [token, selectedCompany]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchClients = useCallback(async (page = 1) => {
    if (!token || !selectedCompany) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (searchDebounce) params.set('search', searchDebounce);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/clients?${params}`, { headers: headers() });
      if (!res.ok) throw new Error('Error fetching');
      const data = await res.json();
      setClients(data.clients);
      setPagination(data.pagination);
    } catch {
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  }, [token, selectedCompany, searchDebounce, statusFilter, headers]);

  useEffect(() => {
    fetchClients(1);
  }, [fetchClients]);

  const fetchClientDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { headers: headers() });
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setSelectedClient(data);
      setForm({
        name: data.name || '',
        cif: data.cif || '',
        address: data.address || '',
        postalCode: data.postalCode || '',
        city: data.city || '',
        province: data.province || '',
        country: data.country || 'España',
        phone: data.phone || '',
        email: data.email || '',
        contactPerson: data.contactPerson || '',
        contactRole: data.contactRole || '',
        web: data.web || '',
        paymentTerms: data.paymentTerms || '30',
        iban: data.iban || '',
        notes: data.notes || '',
        tags: data.tags ? JSON.parse(data.tags) : [],
        status: data.status || 'active',
      });
      setDetailModalOpen(true);
      setEditMode(false);
    } catch {
      toast.error('Error al cargar el cliente');
    }
  };

  const handleCreate = () => {
    setForm(emptyForm);
    setSelectedClient(null);
    setEditMode(true);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.cif.trim()) {
      toast.error('Nombre y CIF son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, tags: form.tags.length > 0 ? form.tags : [] };
      const isEdit = !!selectedClient;
      const url = isEdit ? `/api/clients/${selectedClient.id}` : '/api/clients';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: headers(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error al guardar');
        return;
      }

      toast.success(isEdit ? 'Cliente actualizado' : 'Cliente creado');
      setModalOpen(false);
      setDetailModalOpen(false);
      fetchClients(pagination.page);
    } catch {
      toast.error('Error al guardar el cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (!res.ok) throw new Error('Error');
      toast.success('Cliente eliminado');
      setDetailModalOpen(false);
      fetchClients(pagination.page);
    } catch {
      toast.error('Error al eliminar el cliente');
    } finally {
      setDeleting(false);
    }
  };

  const toggleTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }));
  };

  const parseTags = (tagsStr: string | null): string[] => {
    if (!tagsStr) return [];
    try { return JSON.parse(tagsStr); } catch { return []; }
  };

  const renderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Nombre *" id="name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del cliente" />
        <Input label="CIF *" id="cif" value={form.cif} onChange={e => setForm(p => ({ ...p, cif: e.target.value }))} placeholder="B12345678" />
      </div>
      <Input label="Dirección" id="address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Input label="Código Postal" id="postalCode" value={form.postalCode} onChange={e => setForm(p => ({ ...p, postalCode: e.target.value }))} />
        <Input label="Ciudad" id="city" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
        <Input label="Provincia" id="province" value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value }))} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Teléfono" id="phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
        <Input label="Email" id="email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Persona de contacto" id="contactPerson" value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} />
        <Input label="Cargo" id="contactRole" value={form.contactRole} onChange={e => setForm(p => ({ ...p, contactRole: e.target.value }))} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Web" id="web" value={form.web} onChange={e => setForm(p => ({ ...p, web: e.target.value }))} />
        <Input label="IBAN" id="iban" value={form.iban} onChange={e => setForm(p => ({ ...p, iban: e.target.value }))} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Plazo de pago (días)" id="paymentTerms" value={form.paymentTerms} onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))} />
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Estado</label>
          <select
            value={form.status}
            onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Etiquetas</label>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map(tag => (
            <button
              key={tag.value}
              type="button"
              onClick={() => toggleTag(tag.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                form.tags.includes(tag.value) ? tag.color + ' ring-1 ring-white/30' : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
              }`}
            >
              {tag.value}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-1.5">Notas</label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={() => { setModalOpen(false); setEditMode(false); }}>
          Cancelar
        </Button>
        <Button onClick={handleSave} loading={saving}>
          {selectedClient ? 'Guardar Cambios' : 'Crear Cliente'}
        </Button>
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedClient) return null;
    const tags = parseTags(selectedClient.tags);

    if (editMode) return renderForm();

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{selectedClient.name}</h3>
            <p className="text-sm text-slate-400">{selectedClient.cif}</p>
          </div>
          <Badge variant={selectedClient.status === 'active' ? 'success' : 'default'}>
            {selectedClient.status === 'active' ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getTagColor(tag)}`}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {selectedClient.address && (
            <div className="flex items-start gap-2 text-slate-300">
              <MapPin size={16} className="mt-0.5 text-slate-500 shrink-0" />
              <span>{selectedClient.address}{selectedClient.city ? `, ${selectedClient.city}` : ''}{selectedClient.province ? ` (${selectedClient.province})` : ''}</span>
            </div>
          )}
          {selectedClient.phone && (
            <div className="flex items-center gap-2 text-slate-300">
              <Phone size={16} className="text-slate-500 shrink-0" />
              <span>{selectedClient.phone}</span>
            </div>
          )}
          {selectedClient.email && (
            <div className="flex items-center gap-2 text-slate-300">
              <Mail size={16} className="text-slate-500 shrink-0" />
              <span>{selectedClient.email}</span>
            </div>
          )}
          {selectedClient.web && (
            <div className="flex items-center gap-2 text-slate-300">
              <Globe size={16} className="text-slate-500 shrink-0" />
              <span>{selectedClient.web}</span>
            </div>
          )}
          {selectedClient.contactPerson && (
            <div className="flex items-center gap-2 text-slate-300">
              <User size={16} className="text-slate-500 shrink-0" />
              <span>{selectedClient.contactPerson}{selectedClient.contactRole ? ` (${selectedClient.contactRole})` : ''}</span>
            </div>
          )}
          {selectedClient.iban && (
            <div className="flex items-center gap-2 text-slate-300">
              <Building2 size={16} className="text-slate-500 shrink-0" />
              <span>{selectedClient.iban}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-400">
          <FileText size={14} />
          <span>Plazo de pago: {selectedClient.paymentTerms} días</span>
        </div>

        {selectedClient.projectStats && (
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-xs font-medium text-slate-400 mb-2">Proyectos</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-white">{selectedClient.projectStats.total}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-400">{selectedClient.projectStats.active}</p>
                <p className="text-xs text-slate-500">Activos</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-400">{selectedClient.projectStats.completed}</p>
                <p className="text-xs text-slate-500">Completados</p>
              </div>
            </div>
          </div>
        )}

        {selectedClient.notes && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Notas</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedClient.notes}</p>
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-slate-700">
          <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
            <Trash2 size={14} /> Eliminar
          </Button>
          <Button size="sm" onClick={() => setEditMode(true)}>
            <Edit3 size={14} /> Editar
          </Button>
        </div>
      </div>
    );
  };

  const renderSkeleton = () => (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-28 hidden sm:block" />
          <Skeleton className="h-5 w-24 hidden md:block" />
          <Skeleton className="h-5 w-36 hidden lg:block" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Users size={20} /> Clientes
          {!loading && (
            <span className="text-sm font-normal text-slate-400">({pagination.total})</span>
          )}
        </h1>
        <Button onClick={handleCreate} size="sm">
          <Plus size={16} /> Nuevo Cliente
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o CIF..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <CardContent>{renderSkeleton()}</CardContent>
        ) : clients.length === 0 ? (
          <CardContent>
            <div className="text-center py-12 text-slate-500">
              <Users size={40} className="mx-auto mb-3 opacity-50" />
              <p>No se encontraron clientes</p>
              <p className="text-sm mt-1">
                {search || statusFilter !== 'all' ? 'Prueba con otros filtros' : 'Crea tu primer cliente'}
              </p>
            </div>
          </CardContent>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left">
                    <th className="px-4 py-3 text-slate-400 font-medium">Nombre</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">CIF</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">Ciudad</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">Teléfono</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">Email</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(client => {
                    const tags = parseTags(client.tags);
                    return (
                      <tr
                        key={client.id}
                        onClick={() => fetchClientDetail(client.id)}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{client.name}</div>
                          {tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {tags.map(tag => (
                                <span key={tag} className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getTagColor(tag)}`}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs">{client.cif}</td>
                        <td className="px-4 py-3 text-slate-300">{client.city || '-'}</td>
                        <td className="px-4 py-3 text-slate-300">{client.phone || '-'}</td>
                        <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate">{client.email || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={client.status === 'active' ? 'success' : 'default'}>
                            {client.status === 'active' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-700/50">
              {clients.map(client => {
                const tags = parseTags(client.tags);
                return (
                  <div
                    key={client.id}
                    onClick={() => fetchClientDetail(client.id)}
                    className="p-4 hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-white font-medium">{client.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{client.cif}</p>
                      </div>
                      <Badge variant={client.status === 'active' ? 'success' : 'default'}>
                        {client.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {tags.map(tag => (
                          <span key={tag} className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getTagColor(tag)}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      {client.city && <span className="flex items-center gap-1"><MapPin size={12} />{client.city}</span>}
                      {client.phone && <span className="flex items-center gap-1"><Phone size={12} />{client.phone}</span>}
                      {client.email && <span className="flex items-center gap-1"><Mail size={12} />{client.email}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
            <p className="text-xs text-slate-400">
              {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchClients(pagination.page - 1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm text-slate-300 px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchClients(pagination.page + 1)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo Cliente"
        className="max-w-lg"
      >
        {renderForm()}
      </Modal>

      {/* Detail / Edit Modal */}
      <Modal
        open={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); setEditMode(false); }}
        title={editMode ? 'Editar Cliente' : 'Detalle del Cliente'}
        className="max-w-lg"
      >
        {renderDetail()}
      </Modal>
    </div>
  );
}
