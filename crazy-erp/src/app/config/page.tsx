'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, Building2, FileText, Users, Database } from 'lucide-react';

export default function ConfigPage() {
  const { selectedCompany, token } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <Settings size={20} /> Configuración
      </h1>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Building2 size={14} /> Datos de la empresa
          </h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-400">Nombre</p>
              <p className="text-sm text-white">{selectedCompany?.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">CIF</p>
              <p className="text-sm text-white">{selectedCompany?.cif}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Moneda</p>
              <p className="text-sm text-white">{selectedCompany?.currency}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Rol actual</p>
              <Badge variant="info">{selectedCompany?.role?.replace('_', ' ')}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Numbering */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText size={14} /> Numeración automática
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-slate-700/50">
              <span className="text-slate-400">Proyectos</span>
              <span className="text-white font-mono">CRAZY-2026-001</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-700/50">
              <span className="text-slate-400">Presupuestos</span>
              <span className="text-white font-mono">PPTO-2026-001</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-700/50">
              <span className="text-slate-400">Facturas emitidas</span>
              <span className="text-white font-mono">FE-2026-001</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-700/50">
              <span className="text-slate-400">Facturas recibidas</span>
              <span className="text-white font-mono">FR-2026-001</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Órdenes de compra</span>
              <span className="text-white font-mono">OC-2026-001</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Database size={14} /> Sistema
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-slate-700/50">
              <span className="text-slate-400">Base de datos</span>
              <span className="text-white">SQLite</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-700/50">
              <span className="text-slate-400">Almacenamiento</span>
              <span className="text-white">Local</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-700/50">
              <span className="text-slate-400">Idioma</span>
              <span className="text-white">Español</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Versión</span>
              <span className="text-white">1.0.0</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
