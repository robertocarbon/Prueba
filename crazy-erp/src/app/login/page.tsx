'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email y contraseña son obligatorios');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error || 'Error al iniciar sesión');
      return;
    }

    if (result.mustChangePassword) {
      toast.info('Debes cambiar tu contraseña en el primer acceso');
      router.push('/change-password');
      return;
    }

    toast.success('Sesión iniciada');
    router.push('/select-company');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <h1 className="text-2xl font-bold text-white">CRAZY ERP</h1>
          </div>
          <p className="text-slate-400 text-sm">Sistema de gestión para producción audiovisual</p>
        </div>

        {/* Form */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
            <Input
              id="password"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" loading={loading}>
              Iniciar sesión
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              He olvidado mi contraseña
            </button>
          </div>
        </div>

        {/* Legal notice */}
        <p className="mt-4 text-xs text-slate-500 text-center leading-relaxed">
          Al iniciar sesión, aceptas el tratamiento de tus datos personales conforme al RGPD.
          Tus datos se procesan exclusivamente para la gestión empresarial.
        </p>
      </div>
    </div>
  );
}
