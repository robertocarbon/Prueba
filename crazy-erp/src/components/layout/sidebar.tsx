'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/auth-context';
import { MENU_GROUPS } from '@/lib/permissions';
import { canAccess } from '@/lib/permissions';
import {
  LayoutDashboard, FolderKanban, Calendar, Users, Truck, FileText,
  UserCog, FileSignature, Receipt, Landmark, TrendingUp, Coins,
  Warehouse, Wrench, Settings, Shield, ScrollText, HardDrive,
  BarChart3, ChevronLeft, ChevronRight, LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, FolderKanban, Calendar, Users, Truck, FileText,
  UserCog, FileSignature, Receipt, Landmark, TrendingUp, Coins,
  Warehouse, TruckIcon: Truck, Wrench, Settings, Shield, ScrollText,
  HardDrive, BarChart3,
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { selectedCompany } = useAuth();

  const role = selectedCompany?.role || 'user';

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity',
          collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100',
        )}
        onClick={() => setCollapsed(true)}
      />

      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-slate-900 border-r border-slate-700 z-50',
          'transition-all duration-300 flex flex-col',
          collapsed ? 'w-16' : 'w-60',
          // Mobile: hidden when collapsed
          'lg:translate-x-0',
          collapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0',
        )}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-slate-700 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="text-white font-bold text-sm">CRAZY ERP</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-sm">C</span>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {MENU_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) => role === 'superadmin' || role === 'admin' || canAccess(role, item.module, 'canView')
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="mb-3">
                {!collapsed && (
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {group.label}
                  </div>
                )}
                {visibleItems.map((item) => {
                  const Icon = iconMap[item.icon] || LayoutDashboard;
                  const isActive = pathname === item.path || pathname.startsWith(item.path + '/');

                  return (
                    <Link
                      key={item.module}
                      href={item.path}
                      className={cn(
                        'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors mb-0.5',
                        isActive
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                        collapsed && 'justify-center px-0',
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Collapse button */}
        <div className="p-2 border-t border-slate-700 shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-lg
              text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && <span>Colapsar</span>}
          </button>
        </div>
      </aside>

      {/* Mobile toggle button (visible when collapsed) */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed top-3 left-3 z-40 lg:hidden w-10 h-10 bg-slate-800 border border-slate-700
            rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </>
  );
}
