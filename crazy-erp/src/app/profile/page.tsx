'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Shield, Monitor, Key, MessageCircle, Clock, Trash2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, token, updateUser, selectedCompany } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<Array<{
    id: string; ipAddress: string; device: string; createdAt: string;
  }>>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setPhone('');
      setTelegramChatId('');
    }
  }, [user]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/profile/sessions', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setSessions(data.sessions || []))
      .catch(() => {});
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName, lastName, phone, telegramChatId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
        return;
      }
      const data = await res.json();
      updateUser(data.user);
      toast.success('Perfil actualizado');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success('Contraseña cambiada');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Error al cambiar contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  const closeSession = async (sessionId: string) => {
    try {
      await fetch('/api/profile/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId }),
      });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Sesión cerrada');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <User size={20} /> Mi Perfil
      </h1>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-white">Datos personales</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-slate-400">{user?.email}</p>
              <Badge variant="info" className="mt-1">{selectedCompany?.role?.replace('_', ' ')}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input label="Apellidos" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Telegram Chat ID" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} loading={saving}>Guardar cambios</Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Key size={14} /> Cambiar contraseña
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowChangePassword(!showChangePassword)}>
              {showChangePassword ? 'Cancelar' : 'Cambiar'}
            </Button>
          </div>
        </CardHeader>
        {showChangePassword && (
          <CardContent className="space-y-3">
            <Input label="Contraseña actual" type="password" value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)} />
            <Input label="Nueva contraseña" type="password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} />
            <Input label="Confirmar nueva" type="password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} />
            <p className="text-xs text-slate-400">Mínimo 8 caracteres, mayúscula, minúscula y número.</p>
            <div className="flex justify-end">
              <Button onClick={handleChangePassword} loading={changingPassword}>Cambiar contraseña</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Monitor size={14} /> Sesiones activas
          </h2>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-slate-500 text-sm">No hay sesiones activas</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-2 bg-slate-750 rounded-lg">
                  <div>
                    <p className="text-sm text-white">{session.device || 'Desconocido'}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(session.createdAt).toLocaleString('es-ES')}
                      {session.ipAddress && ` · ${session.ipAddress}`}
                    </p>
                  </div>
                  <button
                    onClick={() => closeSession(session.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
