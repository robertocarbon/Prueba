'use client';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
export default function BudgetsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <FileText size={20} /> Presupuestos
      </h1>
      <Card>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <FileText size={40} className="mx-auto mb-3 opacity-50" />
            <p>Módulo de Presupuestos</p>
            <p className="text-sm mt-1">Disponible en la siguiente fase de desarrollo</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
