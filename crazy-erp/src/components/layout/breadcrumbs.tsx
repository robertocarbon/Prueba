'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const pathLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Proyectos',
  calendar: 'Calendario',
  clients: 'Clientes',
  suppliers: 'Proveedores',
  budgets: 'Presupuestos',
  personnel: 'Personal',
  contracts: 'Contratos',
  invoices: 'Facturación',
  bank: 'Banco',
  finances: 'Finanzas',
  pettycash: 'Caja Chica',
  warehouse: 'Almacén',
  transport: 'Transporte',
  workshops: 'Talleres',
  config: 'Configuración',
  users: 'Usuarios',
  audit: 'Auditoría',
  backup: 'Backup',
  reports: 'Reportes',
  profile: 'Mi Perfil',
  new: 'Nuevo',
  edit: 'Editar',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/');
    const label = pathLabels[segment] || segment;
    const isLast = index === segments.length - 1;

    return { path, label, isLast };
  });

  return (
    <div className="flex items-center gap-1.5 px-4 py-2 text-xs text-slate-400 bg-slate-900/50 border-b border-slate-800">
      <Link href="/dashboard" className="hover:text-white transition-colors">
        <Home size={12} />
      </Link>
      {crumbs.map((crumb, i) => (
        <div key={crumb.path} className="flex items-center gap-1.5">
          <ChevronRight size={10} className="text-slate-600" />
          {crumb.isLast ? (
            <span className="text-slate-300 font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.path} className="hover:text-white transition-colors">
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
