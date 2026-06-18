import React, { useState, useEffect, useRef } from 'react';
import { Bell, Settings, Check, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { sileo } from 'sileo';

export const NotificationsPanel: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
    const panelRef = useRef<HTMLDivElement>(null);

    const notifications = useStore(state => state.notifications);
    const readNotifications = useStore(state => state.readNotifications);
    const markNotificationAsRead = useStore(state => state.markNotificationAsRead);
    const markAllNotificationsAsRead = useStore(state => state.markAllNotificationsAsRead);
    const prefs = useStore(state => state.notificationPreferences);
    const updatePrefs = useStore(state => state.updateNotificationPreferences);

    // Prev state for detecting new notifications
    const prevCountRef = useRef(notifications.length);

    useEffect(() => {
        if (notifications.length > prevCountRef.current) {
            // Check the newest notification
            const newest = notifications[0];
            if (newest && prefs.notifyNewOP && newest.type === 'new_op' && !readNotifications.includes(newest.id)) {
                sileo.success({
                    title: newest.title,
                    description: newest.message
                });
            }
        }
        prevCountRef.current = notifications.length;
    }, [notifications, prefs.notifyNewOP, readNotifications]);

    const unreadCount = notifications.filter(n => !readNotifications.includes(n.id)).length;

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-full transition-all duration-300 ${
                    isOpen || unreadCount > 0 
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                        : 'bg-white/5 text-slate-400 hover:text-white border border-white/10 hover:bg-white/10'
                }`}
            >
                <Bell size={20} className={unreadCount > 0 && !isOpen ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''} />
                
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-[#0f172a] shadow-lg">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-4 duration-200">
                    
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between flex-shrink-0">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">
                            Notificaciones
                        </h3>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setActiveTab('list')}
                                className={`p-1.5 rounded-lg transition-colors ${activeTab === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                title="Lista"
                            >
                                <Bell size={16} />
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`p-1.5 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                title="Configuración"
                            >
                                <Settings size={16} />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg transition-colors text-slate-500 hover:text-red-400 hover:bg-red-500/10 ml-2"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/50">
                        {activeTab === 'list' ? (
                            <div className="flex flex-col">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center flex flex-col items-center gap-3 opacity-50">
                                        <Bell size={32} className="text-slate-500" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay notificaciones</p>
                                    </div>
                                ) : (
                                    <>
                                        {unreadCount > 0 && (
                                            <div className="p-2 border-b border-white/5 flex justify-end bg-white/[0.01]">
                                                <button
                                                    onClick={markAllNotificationsAsRead}
                                                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider px-3 py-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 transition-colors flex items-center gap-1.5"
                                                >
                                                    <Check size={12} /> Marcar todas leídas
                                                </button>
                                            </div>
                                        )}
                                        {notifications.map(notification => {
                                            const isRead = readNotifications.includes(notification.id);
                                            return (
                                                <div 
                                                    key={notification.id} 
                                                    className={`p-4 border-b border-white/5 transition-all relative group cursor-pointer ${
                                                        isRead ? 'opacity-60 hover:opacity-100 bg-transparent' : 'bg-blue-500/[0.03] hover:bg-blue-500/[0.06]'
                                                    }`}
                                                    onClick={() => !isRead && markNotificationAsRead(notification.id)}
                                                >
                                                    {!isRead && (
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                                    )}
                                                    
                                                    <div className="flex justify-between items-start gap-4 mb-1">
                                                        <h4 className="text-sm font-bold text-slate-200">
                                                            {notification.title}
                                                        </h4>
                                                        <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es })}
                                                        </span>
                                                    </div>
                                                    
                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                        {notification.message}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="p-5 space-y-6">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Preferencias de Alertas</h4>
                                    
                                    <div className="space-y-3">
                                        <label className="flex items-start justify-between gap-4 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                                            <div className="flex-1">
                                                <span className="text-sm font-bold text-slate-200 block mb-1">Nuevas Órdenes de Producción</span>
                                                <span className="text-[10px] text-slate-400 leading-tight block">Recibir notificaciones cuando se registre una nueva OP en el sistema.</span>
                                            </div>
                                            <div className="relative inline-flex items-center mt-1">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={prefs.notifyNewOP}
                                                    onChange={(e) => updatePrefs({ ...prefs, notifyNewOP: e.target.checked })}
                                                />
                                                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                            </div>
                                        </label>
                                        
                                        {/* Futuras preferencias se pueden añadir aquí */}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
