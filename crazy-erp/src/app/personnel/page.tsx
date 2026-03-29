'use client';
import { Card, CardContent } from '@/components/ui/card';
import { UserCog } from 'lucide-react';
export default function PersonnelPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <UserCog size={20} /> Personal
      </h1>
      <Card>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <UserCog size={40} className="mx-auto mb-3 opacity-50" />
            <p>Módulo de Personal</p>
            <p className="text-sm mt-1">Disponible en la siguiente fase de desarrollo</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
