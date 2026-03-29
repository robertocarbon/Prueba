'use client';

import { useAuth } from '@/context/auth-context';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FolderKanban, CheckSquare, AlertTriangle, TrendingUp,
  Receipt, Clock, Warehouse, Activity
} from 'lucide-react';

export default function DashboardPage() {
  const { user, selectedCompany } = useAuth();

  const widgets = [
    {
      title: 'Proyectos activos',
      value: '0',
      icon: FolderKanban,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
    },
    {
      title: 'Tareas pendientes hoy',
      value: '0',
      icon: CheckSquare,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
    },
    {
      title: 'Proyectos en riesgo',
      value: '0',
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
    },
    {
      title: 'Facturas pendientes',
      value: '0',
      icon: Receipt,
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-white">
          Hola, {user?.firstName}
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Resumen de {selectedCompany?.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {widgets.map((w) => (
          <Card key={w.title} className="hover:border-slate-600 transition-colors">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">{w.title}</p>
                  <p className="text-2xl font-bold text-white mt-1">{w.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${w.bgColor} flex items-center justify-center`}>
                  <w.icon size={20} className={w.color} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Projects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FolderKanban size={16} className="text-blue-400" />
                Proyectos activos
              </h2>
              <Badge variant="info">0</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-slate-500 text-sm">
              No hay proyectos activos
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <CheckSquare size={16} className="text-green-400" />
                Tareas pendientes
              </h2>
              <Badge variant="info">0</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-slate-500 text-sm">
              No tienes tareas pendientes
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-400" />
                Alertas y vencimientos
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-slate-500 text-sm">
              Sin alertas pendientes
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity size={16} className="text-purple-400" />
                Actividad reciente
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-slate-500 text-sm">
              Sin actividad reciente
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
