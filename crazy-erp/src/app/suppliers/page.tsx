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
  Truck,
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
  Star,
  Building2,
  FileText,
  User,
  Percent,
} from 'lucide-react';

interface Supplier {
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
  web: string | null;
  category: string | null;
  paymentTerms: string;
  iban: string | null;
  irpfRetention: number;
  notes: string | null;
  rating: number | null;
  ratingComment: string | null;
  status: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORY_OPTIONS = [
  { value: 'material', label: 'Material', color: 'bg-blue-900/50 text-blue-400 border-blue-700' },
  { value: 'transporte', label: 'Transporte', color: 'bg-amber-900/50 text-amber-400 border-amber-700' },
  { value: 'alquiler', label: 'Alquiler', color: 'bg-purple-900/50 text-purple-400 border-purple-700' },
  { value: 'maquinaria', label: 'Maquinaria', color: 'bg-cyan-900/50 text-cyan-400 border-cyan-700' },
  { value: 'servicios', label: 'Servicios', color: 'bg-green-900/50 text-green-400 border-green-700' },
  { value: 'subcontrata', label: 'Subcontrata', color: 'bg-red-900/50 text-red-400 border-red-700' },
  { value: 'suministros', label: 'Suministros', color: 'bg-indigo-900/50 text-indigo-400 border-indigo-700' },
  { value: 'otro', label: 'Otro', color: 'bg-slate-600 text-slate-200 border-slate-500' },
];

function getCategoryInfo(cat: string | null) {
  return CATEGORY_OPTIONS.find(c => c.value === cat) || { value: cat, label: cat || '-', color: 'bg-slate-600 text-slate-200 border-slate-500' };
}

function RatingStars({ rating, interactive, onChange }: { rating: number | null; interactive?: boolean; onChange?: (r: number) => void }) {
  const stars = rating || 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange && onChange(i === stars ? 0 : i)}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <Star
            size={16}
            className={i <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
          />
        </button>
      ))}
    </div>
  );
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
  web: '',
  category: '',
  paymentTerms: '30',
  iban: '',
  irpfRetention: '0',
  notes: '',
  rating: 0,
  ratingComment: '',
  status: 'active',
};

export default function SuppliersPage() {
  const { token, selectedCompany } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchDebounce, setSearchDebounce] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'x-company-id': selectedCompany?.id || '',
    'Content-Type': 'application/json',
  }), [token, selectedCompany]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSuppliers = useCallback(async (page = 1) => {
    if (!token || !selectedCompany) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (searchDebounce) params.set('search', searchDebounce);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);

      const res = await fetch(`/api/suppliers?${params}`, { headers: headers() });
      if (!res.ok) throw new Error('Error fetching');
      const data = await res.json();
      setSuppliers(data.suppliers);
      setPagination(data.pagination);
    } catch {
      toast.error('Error al cargar los proveedores');
    } finally {
      setLoading(false);
    }
  }, [token, selectedCompany, searchDebounce, statusFilter, categoryFilter, headers]);

  useEffect(() => {
    fetchSuppliers(1);
  }, [fetchSuppliers]);

  const fetchSupplierDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/suppliers/${id}`, { headers: headers() });
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setSelectedSupplier(data);
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
        web: data.web || '',
        category: data.category || '',
        paymentTerms: data.paymentTerms || '30',
        iban: data.iban || '',
        irpfRetention: String(data.irpfRetention || 0),
        notes: data.notes || '',
        rating: data.rating || 0,
        ratingComment: data.ratingComment || '',
        status: data.status || 'active',
      });
      setDetailModalOpen(true);
      setEditMode(false);
    } catch {
      toast.error('Error al cargar el proveedor');
    }
  };

  const handleCreate = () => {
    setForm(emptyForm);
    setSelectedSupplier(null);
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
      const payload = {
        ...form,
        irpfRetention: form.irpfRetention,
        rating: form.rating || null,
        category: form.category || null,
      };
      const isEdit = !!selectedSupplier;
      const url = isEdit ? `/api/suppliers/${selectedSupplier.id}` : '/api/suppliers';
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

      toast.success(isEdit ? 'Proveedor actualizado' : 'Proveedor creado');
      setModalOpen(false);
      setDetailModalOpen(false);
      fetchSuppliers(pagination.page);
    } catch {
      toast.error('Error al guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este proveedor?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplier.id}`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (!res.ok) throw new Error('Error');
      toast.success('Proveedor eliminado');
      setDetailModalOpen(false);
      fetchSuppliers(pagination.page);
    } catch {
      toast.error('Error al eliminar el proveedor');
    } finally {
      setDeleting(false);
    }
  };

  const renderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Nombre *" id="s-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del proveedor" />
        <Input label="CIF *" id="s-cif" value={form.cif} onChange={e => setForm(p => ({ ...p, cif: e.target.value }))} placeholder="B12345678" />
      </div>
      <Input label="Dirección" id="s-address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Input label="Código Postal" id="s-postalCode" value={form.postalCode} onChange={e => setForm(p => ({ ...p, postalCode: e.target.value }))} />
        <Input label="Ciudad" id="s-city" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
        <Input label="Provincia" id="s-province" value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value }))} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Teléfono" id="s-phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
        <Input label="Email" id="s-email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Persona de contacto" id="s-contact" value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} />
        <Input label="Web" id="s-web" value={form.web} onChange={e => setForm(p => ({ ...p, web: e.target.value }))} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Categoría</label>
          <select
            value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sin categoría</option>
            {CATEGORY_OPTIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input label="Plazo de pago (días)" id="s-payment" value={form.paymentTerms} onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))} />
        <Input label="IBAN" id="s-iban" value={form.iban} onChange={e => setForm(p => ({ ...p, iban: e.target.value }))} />
        <Input label="Retención IRPF (%)" id="s-irpf" type="number" min="0" max="100" step="0.5" value={form.irpfRetention} onChange={e => setForm(p => ({ ...p, irpfRetention: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Valoración</label>
        <div className="flex items-center gap-3">
          <RatingStars rating={form.rating} interactive onChange={r => setForm(p => ({ ...p, rating: r }))} />
          <span className="text-sm text-slate-400">{form.rating ? `${form.rating}/5` : 'Sin valorar'}</span>
        </div>
      </div>
      <Input label="Comentario valoración" id="s-ratingComment" value={form.ratingComment} onChange={e => setForm(p => ({ ...p, ratingComment: e.target.value }))} />
      <div>
        <label htmlFor="s-notes" className="block text-sm font-medium text-slate-300 mb-1.5">Notas</label>
        <textarea
          id="s-notes"
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
          {selectedSupplier ? 'Guardar Cambios' : 'Crear Proveedor'}
        </Button>
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedSupplier) return null;
    const catInfo = getCategoryInfo(selectedSupplier.category);

    if (editMode) return renderForm();

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{selectedSupplier.name}</h3>
            <p className="text-sm text-slate-400">{selectedSupplier.cif}</p>
          </div>
          <Badge variant={selectedSupplier.status === 'active' ? 'success' : 'default'}>
            {selectedSupplier.status === 'active' ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {selectedSupplier.category && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${catInfo.color}`}>
              {catInfo.label}
            </span>
          )}
          {selectedSupplier.rating && <RatingStars rating={selectedSupplier.rating} />}
          {selectedSupplier.irpfRetention > 0 && (
            <span className="flex items-center gap-1 text-xs text-orange-400">
              <Percent size={12} /> {selectedSupplier.irpfRetention}% IRPF
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {selectedSupplier.address && (
            <div className="flex items-start gap-2 text-slate-300">
              <MapPin size={16} className="mt-0.5 text-slate-500 shrink-0" />
              <span>{selectedSupplier.address}{selectedSupplier.city ? `, ${selectedSupplier.city}` : ''}{selectedSupplier.province ? ` (${selectedSupplier.province})` : ''}</span>
            </div>
          )}
          {selectedSupplier.phone && (
            <div className="flex items-center gap-2 text-slate-300">
              <Phone size={16} className="text-slate-500 shrink-0" />
              <span>{selectedSupplier.phone}</span>
            </div>
          )}
          {selectedSupplier.email && (
            <div className="flex items-center gap-2 text-slate-300">
              <Mail size={16} className="text-slate-500 shrink-0" />
              <span>{selectedSupplier.email}</span>
            </div>
          )}
          {selectedSupplier.web && (
            <div className="flex items-center gap-2 text-slate-300">
              <Globe size={16} className="text-slate-500 shrink-0" />
              <span>{selectedSupplier.web}</span>
            </div>
          )}
          {selectedSupplier.contactPerson && (
            <div className="flex items-center gap-2 text-slate-300">
              <User size={16} className="text-slate-500 shrink-0" />
              <span>{selectedSupplier.contactPerson}</span>
            </div>
          )}
          {selectedSupplier.iban && (
            <div className="flex items-center gap-2 text-slate-300">
              <Building2 size={16} className="text-slate-500 shrink-0" />
              <span>{selectedSupplier.iban}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span className="flex items-center gap-1">
            <FileText size={14} />
            Plazo de pago: {selectedSupplier.paymentTerms} días
          </span>
        </div>

        {selectedSupplier.ratingComment && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Comentario valoración</p>
            <p className="text-sm text-slate-300">{selectedSupplier.ratingComment}</p>
          </div>
        )}

        {selectedSupplier.notes && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Notas</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedSupplier.notes}</p>
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
          <Skeleton className="h-5 w-20 hidden sm:block" />
          <Skeleton className="h-5 w-24 hidden md:block" />
          <Skeleton className="h-5 w-20 hidden lg:block" />
          <Skeleton className="h-5 w-16 hidden lg:block" />
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
          <Truck size={20} /> Proveedores
          {!loading && (
            <span className="text-sm font-normal text-slate-400">({pagination.total})</span>
          )}
        </h1>
        <Button onClick={handleCreate} size="sm">
          <Plus size={16} /> Nuevo Proveedor
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
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las categorías</option>
              {CATEGORY_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
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
        ) : suppliers.length === 0 ? (
          <CardContent>
            <div className="text-center py-12 text-slate-500">
              <Truck size={40} className="mx-auto mb-3 opacity-50" />
              <p>No se encontraron proveedores</p>
              <p className="text-sm mt-1">
                {search || statusFilter !== 'all' || categoryFilter !== 'all' ? 'Prueba con otros filtros' : 'Crea tu primer proveedor'}
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
                    <th className="px-4 py-3 text-slate-400 font-medium">Categoría</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">Ciudad</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">Valoración</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">IRPF</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map(supplier => {
                    const catInfo = getCategoryInfo(supplier.category);
                    return (
                      <tr
                        key={supplier.id}
                        onClick={() => fetchSupplierDetail(supplier.id)}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{supplier.name}</div>
                          {supplier.phone && (
                            <div className="text-xs text-slate-500 mt-0.5">{supplier.phone}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs">{supplier.cif}</td>
                        <td className="px-4 py-3">
                          {supplier.category ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${catInfo.color}`}>
                              {catInfo.label}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{supplier.city || '-'}</td>
                        <td className="px-4 py-3">
                          <RatingStars rating={supplier.rating} />
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {supplier.irpfRetention > 0 ? `${supplier.irpfRetention}%` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={supplier.status === 'active' ? 'success' : 'default'}>
                            {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
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
              {suppliers.map(supplier => {
                const catInfo = getCategoryInfo(supplier.category);
                return (
                  <div
                    key={supplier.id}
                    onClick={() => fetchSupplierDetail(supplier.id)}
                    className="p-4 hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-white font-medium">{supplier.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{supplier.cif}</p>
                      </div>
                      <Badge variant={supplier.status === 'active' ? 'success' : 'default'}>
                        {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {supplier.category && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                      )}
                      <RatingStars rating={supplier.rating} />
                      {supplier.irpfRetention > 0 && (
                        <span className="text-[10px] text-orange-400">{supplier.irpfRetention}% IRPF</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      {supplier.city && <span className="flex items-center gap-1"><MapPin size={12} />{supplier.city}</span>}
                      {supplier.phone && <span className="flex items-center gap-1"><Phone size={12} />{supplier.phone}</span>}
                      {supplier.email && <span className="flex items-center gap-1"><Mail size={12} />{supplier.email}</span>}
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
                onClick={() => fetchSuppliers(pagination.page - 1)}
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
                onClick={() => fetchSuppliers(pagination.page + 1)}
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
        title="Nuevo Proveedor"
        className="max-w-lg"
      >
        {renderForm()}
      </Modal>

      {/* Detail / Edit Modal */}
      <Modal
        open={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); setEditMode(false); }}
        title={editMode ? 'Editar Proveedor' : 'Detalle del Proveedor'}
        className="max-w-lg"
      >
        {renderDetail()}
      </Modal>
    </div>
  );
}
