'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Bell, Search, User, LogOut, Settings, Building2, Sun, Moon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Topbar() {
  const { user, selectedCompany, logout, switchCompany, token, updateUser } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>>([]);
  const [isDark, setIsDark] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const notiRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (!token || !selectedCompany) return;
    fetch('/api/notifications?unread=true&limit=5', {
      headers: { Authorization: `Bearer ${token}`, 'X-Company-Id': selectedCompany.id },
    })
      .then(res => res.json())
      .then(data => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
  }, [token, selectedCompany]);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark', !isDark);
    updateUser({ theme: newTheme });
    if (token) {
      fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme: newTheme }),
      }).catch(() => {});
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ markAll: true }),
    });
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <>
      <header className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
        {/* Left: Company info */}
        <div className="flex items-center gap-3">
          <button
            onClick={switchCompany}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Building2 size={16} className="text-blue-400" />
            <span className="text-sm font-medium text-white max-w-[150px] truncate">
              {selectedCompany?.name || 'Sin empresa'}
            </span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
        </div>

        {/* Center: Search */}
        <button
          onClick={() => setShowSearch(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700
            rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors text-sm"
        >
          <Search size={14} />
          <span>Buscar...</span>
          <kbd className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded">Ctrl+K</kbd>
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Search mobile */}
          <button
            onClick={() => setShowSearch(true)}
            className="sm:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Search size={18} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications */}
          <div ref={notiRef} className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full
                  text-[10px] text-white flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-slate-800 border border-slate-700
                rounded-xl shadow-xl overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700">
                  <span className="text-sm font-medium text-white">Notificaciones</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300">
                      Marcar todas leídas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-slate-500 text-sm">
                      Sin notificaciones
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className={cn(
                        'px-4 py-3 border-b border-slate-700/50 hover:bg-slate-750 cursor-pointer',
                        !n.read && 'bg-blue-900/10',
                      )}>
                        <p className="text-sm text-white">{n.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {new Date(n.createdAt).toLocaleString('es-ES')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <span className="hidden sm:block text-sm text-slate-300 max-w-[100px] truncate">
                {user?.firstName}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-slate-800 border border-slate-700
                rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-700">
                  <p className="text-sm font-medium text-white">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                  <p className="text-xs text-blue-400 capitalize mt-0.5">{selectedCompany?.role?.replace('_', ' ')}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { router.push('/profile'); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300
                      hover:bg-slate-700 transition-colors"
                  >
                    <User size={16} /> Mi perfil
                  </button>
                  <button
                    onClick={() => { router.push('/config'); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300
                      hover:bg-slate-700 transition-colors"
                  >
                    <Settings size={16} /> Configuración
                  </button>
                  <button
                    onClick={() => { switchCompany(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300
                      hover:bg-slate-700 transition-colors"
                  >
                    <Building2 size={16} /> Cambiar empresa
                  </button>
                  <div className="border-t border-slate-700 my-1" />
                  <button
                    onClick={() => { logout(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400
                      hover:bg-slate-700 transition-colors"
                  >
                    <LogOut size={16} /> Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSearch(false)} />
          <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700 rounded-xl shadow-2xl">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                autoFocus
                placeholder="Buscar proyectos, clientes, facturas..."
                className="flex-1 bg-transparent text-white placeholder-slate-400 text-sm outline-none"
              />
              <kbd className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">ESC</kbd>
            </div>
            <div className="px-4 py-8 text-center text-slate-500 text-sm">
              Escribe para buscar en todos los módulos
            </div>
          </div>
        </div>
      )}
    </>
  );
}
