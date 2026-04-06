'use client';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
export default function FinancesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <TrendingUp size={20} /> Finanzas
      </h1>
      <Card>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <TrendingUp size={40} className="mx-auto mb-3 opacity-50" />
            <p>Módulo de Finanzas</p>
            <p className="text-sm mt-1">Disponible en la siguiente fase de desarrollo</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
