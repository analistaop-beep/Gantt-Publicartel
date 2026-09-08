import React, { useState, useMemo } from 'react';
import { Search, Plus, ChevronUp, ChevronDown, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { type SectorTaskStatus, SECTOR_TASK_STATUSES, getTaskStatus, getStatusBadgeStyle } from '../utils/taskStatusUtils';

interface PendingTasksTableViewProps {
    tasks: any[];
    sectorName: string;
    onSelectTask: (task: any) => void;
    onStatusChange: (task: any, newStatus: SectorTaskStatus) => void;
    onNewPendingClick: () => void;
}

export const PendingTasksTableView: React.FC<PendingTasksTableViewProps> = ({
    tasks,
    sectorName,
    onSelectTask,
    onStatusChange,
    onNewPendingClick
}) => {
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'date', dir: 'asc' });

    const filteredTasks = useMemo(() => {
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        let list = tasks.filter(t => !t.completed && t.status !== 'Terminada');
        if (search.trim()) {
            const q = normalize(search);
            list = list.filter(t =>
                normalize(t.client || '').includes(q) ||
                normalize(t.opNumber?.toString() || '').includes(q) ||
                normalize(t.name || '').includes(q) ||
                normalize(getTaskStatus(t)).includes(q)
            );
        }
        list.sort((a, b) => {
            let valA: any, valB: any;
            if (sort.col === 'date') {
                valA = a.date || 'zzzzz';
                valB = b.date || 'zzzzz';
            } else if (sort.col === 'opNumber') {
                valA = a.opNumber || '';
                valB = b.opNumber || '';
            } else if (sort.col === 'client') {
                valA = (a.client || '').toLowerCase();
                valB = (b.client || '').toLowerCase();
            } else if (sort.col === 'name') {
                valA = (a.name || '').toLowerCase();
                valB = (b.name || '').toLowerCase();
            } else if (sort.col === 'status') {
                valA = getTaskStatus(a);
                valB = getTaskStatus(b);
            } else {
                valA = '';
                valB = '';
            }
            if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });
        return list;
    }, [tasks, search, sort]);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0b1120] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Top Toolbar */}
            <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <ClipboardList className="text-blue-400" size={18} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                            Tareas Pendientes — {sectorName}
                            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                                {filteredTasks.length} tarea{filteredTasks.length !== 1 ? 's' : ''}
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400">Listado interactivo de todas las tareas del sector</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar por OP, cliente, tarea o estado..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-slate-800/80 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-72 transition-all"
                        />
                    </div>
                    <button
                        onClick={onNewPendingClick}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={15} />
                        Nueva Tarea
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500 space-y-2">
                        <ClipboardList size={36} className="opacity-30 text-slate-400" />
                        <p className="text-sm italic">
                            {search.trim() ? 'No se encontraron tareas con esa búsqueda.' : `No hay tareas pendientes para ${sectorName}.`}
                        </p>
                    </div>
                ) : (
                    <table className="table-fixed w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-900/90 sticky top-0 z-10 border-b border-white/10 backdrop-blur-sm">
                            <tr>
                                {[
                                    { label: 'N° OP', col: 'opNumber', width: 'w-28' },
                                    { label: 'Cliente', col: 'client', width: 'w-56' },
                                    { label: 'Descripción de tarea', col: 'name', width: 'w-auto' },
                                    { label: 'Estado', col: 'status', width: 'w-44' },
                                    { label: 'Fecha de ejecución', col: 'date', width: 'w-52' }
                                ].map(({ label, col, width }) => (
                                    <th
                                        key={col}
                                        onClick={() => setSort(prev => ({
                                            col,
                                            dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc'
                                        }))}
                                        className={`${width} px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 cursor-pointer select-none hover:text-blue-400 transition-colors group`}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            {label}
                                            <span className="opacity-40 group-hover:opacity-100 transition-opacity">
                                                {sort.col === col
                                                    ? sort.dir === 'asc'
                                                        ? <ChevronUp size={12} />
                                                        : <ChevronDown size={12} />
                                                    : <ChevronUp size={12} className="opacity-30" />}
                                            </span>
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredTasks.map((task, idx) => {
                                const hasPendingDate = !task.date || task.date === '';
                                const currentStatus = getTaskStatus(task);
                                const style = getStatusBadgeStyle(currentStatus);
                                return (
                                    <tr
                                        key={task.id}
                                        onClick={() => onSelectTask(task)}
                                        className={`cursor-pointer transition-colors duration-150 hover:bg-slate-800/80 ${idx % 2 === 0 ? 'bg-white/[0.01]' : ''}`}
                                    >
                                        <td className="px-3 py-1.5 align-middle">
                                            <span className="font-mono font-bold text-blue-400 text-[11px] bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 inline-block">
                                                #{task.opNumber || '—'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 align-middle">
                                            <span className="font-semibold text-white/90 truncate block text-xs" title={task.client}>
                                                {task.client || <span className="text-slate-600 italic">Sin cliente</span>}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 align-middle">
                                            <span className="text-slate-300 truncate block text-xs" title={task.name}>
                                                {task.name || <span className="text-slate-600 italic">Sin descripción</span>}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 align-middle" onClick={(e) => e.stopPropagation()}>
                                            <div className="relative inline-flex items-center">
                                                <select
                                                    value={currentStatus}
                                                    onChange={(e) => onStatusChange(task, e.target.value as SectorTaskStatus)}
                                                    className={`text-[11px] font-bold pl-2.5 pr-6 py-0.5 rounded-full border cursor-pointer appearance-none focus:outline-none transition-all ${style.badge} bg-[#0f172a] hover:brightness-125`}
                                                >
                                                    {SECTOR_TASK_STATUSES.map(st => (
                                                        <option key={st} value={st} className="bg-slate-900 text-white font-semibold">
                                                            {st}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${style.pulse ? 'animate-pulse' : ''}`} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-1.5 align-middle">
                                            {hasPendingDate ? (
                                                <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                                    Pendiente de fecha
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 font-medium text-xs whitespace-nowrap">
                                                    {format(new Date(task.date + 'T00:00:00'), "dd 'de' MMMM yyyy", { locale: es })}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
