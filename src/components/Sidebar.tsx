import React, { useState } from 'react';
import { Users, Truck, CalendarDays, Lock, X, Hammer, Sun, Moon, Layers, Image, Palette } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
    const [isPassModalOpen, setIsPassModalOpen] = useState(false);
    const [password, setPassword] = useState('');
    const resetDatabase = useStore(state => state.resetDatabase);
    const { theme, toggleTheme } = useTheme();

    const mainMenuItems = [
        { id: 'gantt', label: 'Instalaciones', icon: CalendarDays },
        { id: 'herreria', label: 'Herrería', icon: Hammer },
        { id: 'corporeas', label: 'Corpóreas', icon: Layers },
        { id: 'lonas', label: 'Lonas + Vinilos', icon: Image },
        { id: 'pintura', label: 'Pintura', icon: Palette },
    ];

    const configMenuItems = [
        { id: 'members', label: 'Integrantes', icon: Users },
        { id: 'vehicles', label: 'Vehículos', icon: Truck },
    ];

    return (
        <aside className="w-64 glass flex flex-col h-full">
            <div className="p-6 border-b border-white/10 flex justify-center">
                <img src="/logo-publicartel.png" alt="Publicartel" className="h-10 object-contain" />
            </div>
            <nav className="flex-1 p-4 flex flex-col gap-2">
                {mainMenuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            : 'hover:bg-white/5 text-slate-400'
                            }`}
                    >
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}

                <div className="flex-1" />

                {configMenuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            : 'hover:bg-white/5 text-slate-400'
                            }`}
                    >
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}

                <div className={`grid transition-all duration-500 ease-in-out ${isPassModalOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                    <div className="overflow-hidden">
                        <div className="glass p-3 rounded-2xl shadow-2xl border-red-500/30 z-50">
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] uppercase font-bold text-red-400">Confirmar Reseteo</span>
                                    <button onClick={() => { setIsPassModalOpen(false); setPassword(''); }} className="text-slate-500 hover:text-white transition-colors">
                                        <X size={12} />
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 outline-none focus:border-red-500/50 transition-all text-white text-xs flex-1"
                                        placeholder="Contraseña"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                if (password === '2218') {
                                                    if (confirm('¿Resetear base de datos?')) {
                                                        resetDatabase();
                                                        setIsPassModalOpen(false);
                                                        setPassword('');
                                                    }
                                                } else {
                                                    alert('Incorrecto');
                                                }
                                            }
                                        }}
                                        autoFocus={isPassModalOpen}
                                    />
                                    <button
                                        onClick={() => {
                                            if (password === '2218') {
                                                if (confirm('¿Resetear base de datos?')) {
                                                    resetDatabase();
                                                    setIsPassModalOpen(false);
                                                    setPassword('');
                                                }
                                            } else {
                                                alert('Incorrecto');
                                            }
                                        }}
                                        className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all shadow-lg shadow-red-600/20"
                                    >
                                        <Lock size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
            <div className="p-4 border-t border-white/10 flex flex-col gap-4 relative">
                <button
                    onClick={toggleTheme}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider group border ${theme === 'dark'
                            ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-amber-400/10 hover:bg-amber-400/20 text-amber-500 border-amber-400/30'
                        }`}
                >
                    {theme === 'dark' ? (
                        <><Sun size={14} className="group-hover:rotate-45 transition-transform duration-300" /> Modo Claro</>
                    ) : (
                        <><Moon size={14} className="group-hover:-rotate-12 transition-transform duration-300" /> Modo Oscuro</>
                    )}
                </button>
                <button
                    onClick={() => setIsPassModalOpen(!isPassModalOpen)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 rounded-xl transition-all text-xs font-bold uppercase tracking-wider group"
                >
                    <Lock size={14} className="group-hover:animate-bounce" />
                    Resetear Base de Datos
                </button>
                <div className="text-slate-500 text-center uppercase tracking-widest font-bold text-[10px]">
                    MVP v1.0
                </div>
            </div>
        </aside>
    );
};
