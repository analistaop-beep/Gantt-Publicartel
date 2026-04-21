import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Search, User, Filter } from 'lucide-react';

export const MembersSidebar: React.FC = () => {
    const members = useStore(state => state.members);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSector, setSelectedSector] = useState('all');

    const sectors = Array.from(new Set(members.map(m => m.sector).filter(Boolean))) as string[];

    const filteredMembers = members.filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (member.code || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSector = selectedSector === 'all' || member.sector === selectedSector;
        return matchesSearch && matchesSector;
    });

    return (
        <aside
            onDragOver={(e) => {
                const isMemberDrag = Array.from(e.dataTransfer.types).some(t => t.toLowerCase() === 'memberid');
                const sourceTaskId = Array.from(e.dataTransfer.types).some(t => t.toLowerCase() === 'sourcetaskid');
                if (isMemberDrag && sourceTaskId) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                }
            }}
            onDrop={async (e) => {
                const memberId = e.dataTransfer.getData('memberId') || e.dataTransfer.getData('memberid');
                const sourceTaskId = e.dataTransfer.getData('sourceTaskId') || e.dataTransfer.getData('sourcetaskid');

                if (memberId && sourceTaskId) {
                    e.preventDefault();
                    const state = useStore.getState();
                    const tasks = state.tasks || [];
                    const herreriaTasks = state.herreriaTasks || [];
                    const updateTask = state.updateTask;

                    const task = tasks.find((t: any) => t.id === sourceTaskId) ||
                        herreriaTasks.find((t: any) => t.id === sourceTaskId);

                    if (task) {
                        try {
                            await updateTask({
                                ...task,
                                members: task.members.filter((id: string) => id !== memberId)
                            });
                            const { sileo } = (window as any);
                            if (sileo) sileo.success({ title: "Integrante quitado de la tarea" });
                        } catch (err) {
                            console.error("Error removing member from task:", err);
                        }
                    }
                }
            }}
            className="w-64 glass flex flex-col h-full border-l border-white/10"
        >
            <div className="p-6 border-b border-white/10">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <User className="text-blue-500" size={20} />
                    Integrantes
                </h3>
                <p className="text-slate-400 text-xs mt-1">Lista completa de personal</p>
            </div>

            <div className="p-4 border-b border-white/10 space-y-3">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar integrante..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500/50 transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                    <select
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer font-bold text-slate-400"
                        value={selectedSector}
                        onChange={(e) => setSelectedSector(e.target.value)}
                    >
                        <option value="all">Todos los Sectores</option>
                        {sectors.map(sector => (
                            <option key={sector} value={sector}>{sector}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {filteredMembers.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-slate-500 text-sm">No se encontraron integrantes</p>
                    </div>
                ) : (
                    filteredMembers.map(member => (
                        <div
                            key={member.id}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('memberId', member.id);
                                e.dataTransfer.effectAllowed = 'copy';
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all flex items-center gap-2 group cursor-grab active:cursor-grabbing"
                        >
                            <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shrink-0">
                                <User size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-[11px] font-semibold text-white truncate leading-tight">{member.name}</h4>
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[8px] text-slate-500 uppercase tracking-tighter font-bold truncate">{member.role}</p>
                                    {member.sector && (
                                        <span className="text-[7px] bg-white/5 text-slate-400 px-1 rounded-sm border border-white/5 shrink-0 uppercase font-black">
                                            {member.sector}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Total</span>
                    <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-md text-[10px] font-bold border border-blue-500/20">
                        {members.length}
                    </span>
                </div>
            </div>
        </aside>
    );
};
