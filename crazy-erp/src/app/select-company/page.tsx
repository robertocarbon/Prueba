'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { toast } from 'sonner';
import { Building2, Clock } from 'lucide-react';

export default function SelectCompanyPage() {
  const { user, companies, selectCompany, isLoading, selectedCompany } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!isLoading && companies.length === 1 && !selectedCompany) {
      handleSelect(companies[0].id);
    }
  }, [isLoading, companies]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = async (companyId: string) => {
    const success = await selectCompany(companyId);
    if (success) {
      router.push('/dashboard');
    } else {
      toast.error('Error al seleccionar empresa');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <h1 className="text-2xl font-bold text-white">CRAZY ERP</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Hola, {user?.firstName}. Selecciona una empresa:
          </p>
        </div>

        <div className="space-y-3">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => handleSelect(company.id)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-left
                hover:bg-slate-750 hover:border-blue-600 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center
                  group-hover:bg-blue-600/20 transition-colors">
                  <Building2 className="text-slate-400 group-hover:text-blue-400" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{company.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400 capitalize">{company.role.replace('_', ' ')}</span>
                    {company.lastAccessAt && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(company.lastAccessAt).toLocaleDateString('es-ES')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-500 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
