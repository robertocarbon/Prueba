'use client';
import { Card, CardContent } from '@/components/ui/card';
import { FolderKanban } from 'lucide-react';
export default function ProjectsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <FolderKanban size={20} /> Proyectos
      </h1>
      <Card>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <FolderKanban size={40} className="mx-auto mb-3 opacity-50" />
            <p>Módulo de Proyectos</p>
            <p className="text-sm mt-1">Disponible en la siguiente fase de desarrollo</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
