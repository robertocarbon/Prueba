export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  CONTABLE: 'contable',
  JEFE_PROYECTO: 'jefe_proyecto',
  RRHH: 'rrhh',
  ALMACEN: 'almacen',
  USER: 'user',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const MODULES = [
  'dashboard',
  'projects',
  'calendar',
  'clients',
  'suppliers',
  'budgets',
  'personnel',
  'contracts',
  'invoices',
  'bank',
  'finances',
  'pettycash',
  'warehouse',
  'transport',
  'workshops',
  'config',
  'users',
  'audit',
  'backup',
  'reports',
] as const;

export type Module = typeof MODULES[number];

// Sidebar menu groups
export const MENU_GROUPS = [
  {
    label: 'OPERACIONES',
    items: [
      { module: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
      { module: 'projects', label: 'Proyectos', icon: 'FolderKanban', path: '/projects' },
      { module: 'calendar', label: 'Calendario', icon: 'Calendar', path: '/calendar' },
    ],
  },
  {
    label: 'COMERCIAL',
    items: [
      { module: 'clients', label: 'Clientes', icon: 'Users', path: '/clients' },
      { module: 'suppliers', label: 'Proveedores', icon: 'Truck', path: '/suppliers' },
      { module: 'budgets', label: 'Presupuestos', icon: 'FileText', path: '/budgets' },
    ],
  },
  {
    label: 'RRHH',
    items: [
      { module: 'personnel', label: 'Personal', icon: 'UserCog', path: '/personnel' },
      { module: 'contracts', label: 'Contratos', icon: 'FileSignature', path: '/contracts' },
    ],
  },
  {
    label: 'FINANZAS',
    items: [
      { module: 'invoices', label: 'Facturación', icon: 'Receipt', path: '/invoices' },
      { module: 'bank', label: 'Banco', icon: 'Landmark', path: '/bank' },
      { module: 'finances', label: 'Finanzas', icon: 'TrendingUp', path: '/finances' },
      { module: 'pettycash', label: 'Caja Chica', icon: 'Coins', path: '/pettycash' },
    ],
  },
  {
    label: 'LOGÍSTICA',
    items: [
      { module: 'warehouse', label: 'Almacén', icon: 'Warehouse', path: '/warehouse' },
      { module: 'transport', label: 'Transporte', icon: 'TruckIcon', path: '/transport' },
      { module: 'workshops', label: 'Talleres', icon: 'Wrench', path: '/workshops' },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { module: 'config', label: 'Configuración', icon: 'Settings', path: '/config' },
      { module: 'users', label: 'Usuarios', icon: 'Shield', path: '/users' },
      { module: 'audit', label: 'Auditoría', icon: 'ScrollText', path: '/audit' },
      { module: 'backup', label: 'Backup', icon: 'HardDrive', path: '/backup' },
      { module: 'reports', label: 'Reportes', icon: 'BarChart3', path: '/reports' },
    ],
  },
] as const;

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<Role, Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; canExport: boolean }>> = {
  superadmin: Object.fromEntries(MODULES.map(m => [m, { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true }])),
  admin: Object.fromEntries(MODULES.map(m => [m, { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true }])),
  contable: Object.fromEntries(MODULES.map(m => [m, {
    canView: ['dashboard', 'invoices', 'bank', 'finances', 'pettycash', 'budgets', 'reports', 'clients', 'suppliers'].includes(m),
    canCreate: ['invoices', 'bank', 'finances', 'pettycash', 'budgets'].includes(m),
    canEdit: ['invoices', 'bank', 'finances', 'pettycash', 'budgets'].includes(m),
    canDelete: ['invoices', 'pettycash'].includes(m),
    canExport: ['invoices', 'bank', 'finances', 'pettycash', 'budgets', 'reports'].includes(m),
  }])),
  jefe_proyecto: Object.fromEntries(MODULES.map(m => [m, {
    canView: ['dashboard', 'projects', 'calendar', 'clients', 'suppliers', 'budgets', 'personnel', 'warehouse', 'transport', 'workshops'].includes(m),
    canCreate: ['projects', 'budgets'].includes(m),
    canEdit: ['projects', 'budgets'].includes(m),
    canDelete: false,
    canExport: ['projects', 'budgets', 'reports'].includes(m),
  }])),
  rrhh: Object.fromEntries(MODULES.map(m => [m, {
    canView: ['dashboard', 'personnel', 'contracts', 'calendar'].includes(m),
    canCreate: ['personnel', 'contracts'].includes(m),
    canEdit: ['personnel', 'contracts'].includes(m),
    canDelete: ['personnel', 'contracts'].includes(m),
    canExport: ['personnel', 'contracts', 'reports'].includes(m),
  }])),
  almacen: Object.fromEntries(MODULES.map(m => [m, {
    canView: ['dashboard', 'warehouse', 'transport', 'suppliers'].includes(m),
    canCreate: ['warehouse'].includes(m),
    canEdit: ['warehouse'].includes(m),
    canDelete: false,
    canExport: ['warehouse'].includes(m),
  }])),
  user: Object.fromEntries(MODULES.map(m => [m, {
    canView: ['dashboard', 'projects', 'calendar'].includes(m),
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
  }])),
};

export function canAccess(role: string, module: string, action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canExport'): boolean {
  const perms = DEFAULT_PERMISSIONS[role as Role];
  if (!perms) return false;
  const modPerms = perms[module];
  if (!modPerms) return false;
  return !!modPerms[action];
}
