import React, { useState } from 'react';
import { Bell, Check, LogOut, MessageSquare, Activity, ClipboardList } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { sileo } from 'sileo';
import type { Notification } from '../types';

interface NotificationsSidebarProps {
    onNotificationClick?: (notification: Notification) => void;
}

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
    if (type === 'comment') return <MessageSquare size={13} className="text-purple-400 flex-shrink-0 mt-0.5" />;
    if (type === 'status_change') return <Activity size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />;
    return <ClipboardList size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />;
};

const notificationTypeLabel: Record<Notification['type'], string> = {
    new_op: 'Nueva OP',
    status_change: 'Estado',
    comment: 'Comentario',
};

const notificationTypeBadgeClass: Record<Notification['type'], string> = {
    new_op: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    status_change: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    comment: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export const NotificationsSidebar: React.FC<NotificationsSidebarProps> = ({ onNotificationClick }) => {
    const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');

    const allNotifications = useStore(state => state.notifications);
    const readNotifications = useStore(state => state.readNotifications);
    const markNotificationAsRead = useStore(state => state.markNotificationAsRead);
    const markAllNotificationsAsRead = useStore(state => state.markAllNotificationsAsRead);
    const prefs = useStore(state => state.notificationPreferences);
    const updatePrefs = useStore(state => state.updateNotificationPreferences);
    const viewPrefs = useStore(state => state.viewPreferences);
    const updateViewPrefs = useStore(state => state.updateViewPreferences);
    const user = useStore(state => state.user);
    const signOut = useStore(state => state.signOut);

    // Solo mostrar notificaciones globales (targetUsers null/vacío) o las dirigidas al usuario actual
    const userEmail = user?.email;
    const notifications = allNotifications.filter(n => 
        !n.targetUsers || n.targetUsers.length === 0 || (userEmail && n.targetUsers.includes(userEmail))
    );

    const unreadCount = notifications.filter(n => !readNotifications.includes(n.id)).length;

    const prevCountRef = React.useRef(notifications.length);

    React.useEffect(() => {
        if (notifications.length > prevCountRef.current) {
            const newest = notifications[0];
            if (newest && newest.type === 'new_op' && !readNotifications.includes(newest.id)) {
                if (prefs.notifyNewOP) {
                    sileo.success({
                        title: newest.title,
                        description: newest.message
                    });
                }
                if (prefs.pushEnabled && "Notification" in window && Notification.permission === "granted") {
                    new Notification(newest.title, { 
                        body: newest.message,
                        icon: '/logo-publicartel.png'
                    });
                }
            }
        }
        prevCountRef.current = notifications.length;
    }, [notifications, prefs, readNotifications]);

    const handlePushToggle = async (checked: boolean) => {
        if (checked) {
            if (!("Notification" in window)) {
                sileo.error({ title: "Tu navegador no soporta Push" });
                return;
            }
            if (Notification.permission === "granted") {
                updatePrefs({ ...prefs, pushEnabled: true });
            } else if (Notification.permission !== "denied") {
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                    updatePrefs({ ...prefs, pushEnabled: true });
                } else {
                    sileo.warning({ title: "Permiso denegado", description: "Debes permitir las notificaciones en tu navegador." });
                }
            } else {
                sileo.error({ title: "Bloqueadas", description: "Habilita las notificaciones en los ajustes de tu navegador." });
            }
        } else {
            updatePrefs({ ...prefs, pushEnabled: false });
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!readNotifications.includes(notification.id)) {
            markNotificationAsRead(notification.id);
        }
        if (notification.opId && onNotificationClick) {
            onNotificationClick(notification);
        }
    };

    return (
        <aside className="w-64 glass flex flex-col h-full border-l border-white/10 relative z-50 shadow-2xl shadow-black/50">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/[0.02] flex flex-col gap-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-200 flex items-center gap-2">
                        <Bell size={16} className={unreadCount > 0 ? "text-blue-400" : "text-slate-400"} />
                        Notificaciones
                    </h2>
                </div>
                
                <div className="flex bg-white/5 rounded-lg p-1 relative">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all z-10 ${
                            activeTab === 'list' ? 'text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        Lista
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all z-10 ${
                            activeTab === 'settings' ? 'text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        Ajustes
                    </button>
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-blue-600/80 border border-blue-500/50 rounded-md transition-all duration-300 shadow-lg ${activeTab === 'list' ? 'left-1' : 'left-[calc(50%+2px)]'}`} />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0f172a]/60">
                {activeTab === 'list' ? (
                    <div className="flex flex-col">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center gap-3 opacity-50 mt-10">
                                <Bell size={32} className="text-slate-500" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay notificaciones</p>
                            </div>
                        ) : (
                            <>
                                {unreadCount > 0 && (
                                    <div className="p-2 border-b border-white/5 flex justify-end bg-white/[0.01]">
                                        <button
                                            onClick={markAllNotificationsAsRead}
                                            className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider px-3 py-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 transition-colors flex items-center gap-1.5 w-full justify-center"
                                        >
                                            <Check size={12} /> Marcar todas leídas
                                        </button>
                                    </div>
                                )}
                                {notifications.map(notification => {
                                    const isRead = readNotifications.includes(notification.id);
                                    const isClickable = !!notification.opId || /OP #\S+/.test(notification.title);
                                    return (
                                        <div 
                                            key={notification.id} 
                                            className={`p-4 border-b border-white/5 transition-all relative group ${
                                                isRead ? 'opacity-60 hover:opacity-100 bg-transparent' : 'bg-blue-500/[0.03] hover:bg-blue-500/[0.06]'
                                            } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            {!isRead && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                            )}

                                            <div className="flex items-start gap-2 mb-1">
                                                <NotificationIcon type={notification.type} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                        <h4 className="text-xs font-bold text-slate-200 leading-tight flex-1 min-w-0 truncate">
                                                            {notification.title}
                                                        </h4>
                                                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border flex-shrink-0 ${notificationTypeBadgeClass[notification.type]}`}>
                                                            {notificationTypeLabel[notification.type]}
                                                        </span>
                                                    </div>
                                                    
                                                    <p className="text-xs text-slate-400 leading-relaxed mb-1.5">
                                                        {notification.message}
                                                    </p>

                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[9px] font-bold text-slate-500 whitespace-nowrap uppercase">
                                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es })}
                                                        </span>
                                                        {isClickable && (
                                                            <span className="text-[9px] font-bold text-blue-400/70 uppercase tracking-wider group-hover:text-blue-400 transition-colors">
                                                                Ver OP →
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="p-5 space-y-6">
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Alertas de Sistema</h4>
                            
                            <div className="space-y-3">
                                <label className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-200">Nuevas OPs</span>
                                        <div className="relative inline-flex items-center">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={prefs.notifyNewOP}
                                                onChange={(e) => updatePrefs({ ...prefs, notifyNewOP: e.target.checked })}
                                            />
                                            <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 leading-tight">Recibir Toasts cuando se registre una nueva OP.</span>
                                </label>

                                <label className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-200">Notificaciones Push</span>
                                        <div className="relative inline-flex items-center">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={prefs.pushEnabled}
                                                onChange={(e) => handlePushToggle(e.target.checked)}
                                            />
                                            <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 leading-tight">Alertas nativas de Windows/Mac aunque la app esté en segundo plano.</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 mt-6">Preferencias de Vista</h4>
                            
                            <div className="space-y-3">
                                <label className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-200">Gantt Simplificado (Instalaciones)</span>
                                        <div className="relative inline-flex items-center">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={viewPrefs?.instalacionesViewMode === 'gantt'}
                                                onChange={(e) => updateViewPrefs({ ...viewPrefs, instalacionesViewMode: e.target.checked ? 'gantt' : 'default' })}
                                            />
                                            <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 leading-tight">Mostrar gráfico Gantt simplificado por defecto en Instalaciones.</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* User & Logout section */}
            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex flex-col gap-3 flex-shrink-0">
                {user && (
                    <div className="text-center px-4 py-2 bg-white/5 rounded-md border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-0.5">Usuario actual</span>
                        <span className="text-sm font-bold text-white truncate block">{user.user_metadata?.name || user.email}</span>
                    </div>
                )}
                
                <button
                    onClick={() => signOut()}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 rounded-md transition-all text-xs font-bold uppercase tracking-wider group"
                >
                    <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
};
