import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, ChevronUp, ChevronDown, ClipboardList, Filter, Check, X, Calendar } from 'lucide-react';
import { format, addDays, isWeekend } from 'date-fns';
import { es } from 'date-fns/locale';
import { sileo } from 'sileo';
import { type SectorTaskStatus, SECTOR_TASK_STATUSES, getTaskStatus, getStatusBadgeStyle } from '../utils/taskStatusUtils';
import { SubtasksPanel, getSubtasksCount } from './SubtasksPanel';
import { MiniCalendar } from './OrderTasksPanel';

import { useStore } from '../store/useStore';

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
    const { productionOrders, subtasks = [], updateTaskLocal } = useStore();
    const [search, setSearch] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState<SectorTaskStatus[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const [sort, setSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'date', dir: 'asc' });
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

    // Calendar modal state
    const [activeCalendarTaskId, setActiveCalendarTaskId] = useState<string | null>(null);
    const calendarAnchorRef = useRef<HTMLElement | null>(null);

    const handleDateChange = (task: any, newDate: string) => {
        if (task._isMultiDayGroup && task._groupTasks && task._groupTasks.length > 0) {
            if (!newDate) {
                task._groupTasks.forEach((gt: any) => {
                    updateTaskLocal({ ...gt, date: '' });
                });
            } else {
                const sortedTasks = [...task._groupTasks].sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
                let currDate = new Date(newDate + 'T12:00:00');
                sortedTasks.forEach((gt: any) => {
                    updateTaskLocal({ ...gt, date: format(currDate, 'yyyy-MM-dd') });
                    do {
                        currDate = addDays(currDate, 1);
                    } while (isWeekend(currDate));
                });
            }
        } else {
            updateTaskLocal({ ...task, date: newDate });
        }

        if (newDate) {
            const formatted = format(new Date(newDate + 'T00:00:00'), "dd 'de' MMMM yyyy", { locale: es });
            sileo.success({ title: `Fecha de ejecución asignada: ${formatted}` });
        } else {
            sileo.success({ title: 'Fecha de ejecución removida' });
        }
        setActiveCalendarTaskId(null);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleExpand = (taskId: string) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    const toggleStatus = (status: SectorTaskStatus) => {
        setSelectedStatuses(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    };

    const statusCounts = useMemo(() => {
        const counts: Record<SectorTaskStatus, number> = {
            'Para realizar': 0,
            'Detenida': 0,
            'Agendada': 0,
            'En proceso': 0,
            'Terminada': 0,
        };
        (tasks || []).forEach(t => {
            const st = getTaskStatus(t);
            if (counts[st] !== undefined) {
                counts[st]++;
            }
        });
        return counts;
    }, [tasks]);

    const opAddressMap = useMemo(() => {
        const map = new Map<string, string>();
        (productionOrders || []).forEach(o => {
            if (o.opNumber && o.address) {
                map.set(String(o.opNumber).trim().toLowerCase(), o.address);
            }
        });
        return map;
    }, [productionOrders]);

    const getTaskAddress = (task: any): string => {
        if (task.opNumber) {
            const opAddr = opAddressMap.get(String(task.opNumber).trim().toLowerCase());
            if (opAddr) return opAddr;
        }
        return task.address || '';
    };

    const filteredTasks = useMemo(() => {
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        
        let list = selectedStatuses.includes('Terminada')
            ? tasks
            : tasks.filter(t => !t.completed && t.status !== 'Terminada');

        if (selectedStatuses.length > 0) {
            list = list.filter(t => selectedStatuses.includes(getTaskStatus(t)));
        }

        if (search.trim()) {
            const q = normalize(search);
            list = list.filter(t =>
                normalize(t.client || '').includes(q) ||
                normalize(t.opNumber?.toString() || '').includes(q) ||
                normalize(t.name || '').includes(q) ||
                normalize(getTaskAddress(t)).includes(q) ||
                normalize(getTaskStatus(t)).includes(q)
            );
        }

        // Group task fragments by groupId (or task id) so multi-day tasks are represented by 1 single row
        const groupedMap = new Map<string, { mainTask: any; groupTasks: any[] }>();
        list.forEach(t => {
            const key = t.groupId || t.id;
            if (!groupedMap.has(key)) {
                groupedMap.set(key, { mainTask: t, groupTasks: [t] });
            } else {
                groupedMap.get(key)!.groupTasks.push(t);
            }
        });

        const groupedList = Array.from(groupedMap.values()).map(({ mainTask, groupTasks }) => {
            if (groupTasks.length === 1) return mainTask;
            
            const datesWithValues = groupTasks.map(gt => gt.date).filter(Boolean).sort();
            const minDate = datesWithValues[0] || '';
            const maxDate = datesWithValues[datesWithValues.length - 1] || '';

            return {
                ...mainTask,
                date: minDate,
                _isMultiDayGroup: true,
                _groupTasks: groupTasks,
                _minDate: minDate,
                _maxDate: maxDate,
                _daysCount: groupTasks.length,
            };
        });

        groupedList.sort((a, b) => {
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
            } else if (sort.col === 'address') {
                valA = (getTaskAddress(a) || '').toLowerCase();
                valB = (getTaskAddress(b) || '').toLowerCase();
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

        return groupedList;
    }, [tasks, search, sort, selectedStatuses, opAddressMap]);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0b1120] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl dark:shadow-2xl">
            {/* Top Toolbar */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4 bg-slate-50/90 dark:bg-slate-900/60 backdrop-blur-sm relative z-30">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
                        <ClipboardList className="text-blue-600 dark:text-blue-400" size={18} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            Tareas Pendientes — {sectorName}
                            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm">
                                {filteredTasks.length} tarea{filteredTasks.length !== 1 ? 's' : ''}
                            </span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Listado interactivo de todas las tareas del sector</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar por OP, cliente, tarea o estado..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-64 sm:w-72 transition-all shadow-sm dark:shadow-none"
                        />
                    </div>

                    {/* Status Multi-select Filter */}
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border shadow-sm ${
                                selectedStatuses.length > 0
                                    ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40'
                                    : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Filter size={14} className={selectedStatuses.length > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'} />
                            <span>Estado</span>
                            {selectedStatuses.length > 0 && (
                                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                                    {selectedStatuses.length}
                                </span>
                            )}
                            {selectedStatuses.length > 0 && (
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedStatuses([]);
                                    }}
                                    className="hover:bg-blue-200 dark:hover:bg-blue-500/40 p-0.5 rounded-full text-blue-700 dark:text-blue-300 transition-colors ml-0.5"
                                    title="Limpiar filtro de estado"
                                >
                                    <X size={12} />
                                </span>
                            )}
                        </button>

                        {isFilterOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                        <Filter size={13} className="text-blue-500" />
                                        Filtrar por estado
                                    </span>
                                    {selectedStatuses.length > 0 ? (
                                        <button
                                            onClick={() => setSelectedStatuses([])}
                                            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            Limpiar ({selectedStatuses.length})
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setSelectedStatuses([...SECTOR_TASK_STATUSES])}
                                            className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                                        >
                                            Todos
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                    {SECTOR_TASK_STATUSES.map(st => {
                                        const isChecked = selectedStatuses.includes(st);
                                        const style = getStatusBadgeStyle(st);
                                        const count = statusCounts[st] || 0;
                                        return (
                                            <div
                                                key={st}
                                                onClick={() => toggleStatus(st)}
                                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer select-none transition-colors ${
                                                    isChecked
                                                        ? 'bg-blue-50/70 dark:bg-blue-500/10'
                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                                        isChecked
                                                            ? 'bg-blue-600 border-blue-600 text-white'
                                                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                                    }`}>
                                                        {isChecked && <Check size={11} strokeWidth={3} />}
                                                    </div>
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
                                                        {st}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500">
                                                    {count}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onNewPendingClick}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={15} />
                        Nueva Tarea
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 dark:text-slate-500 space-y-2">
                        <ClipboardList size={36} className="opacity-30 text-slate-400 dark:text-slate-500" />
                        <p className="text-sm italic">
                            {search.trim() || selectedStatuses.length > 0
                                ? 'No se encontraron tareas con los filtros aplicados.'
                                : `No hay tareas pendientes para ${sectorName}.`}
                        </p>
                        {(search.trim() || selectedStatuses.length > 0) && (
                            <button
                                onClick={() => {
                                    setSearch('');
                                    setSelectedStatuses([]);
                                }}
                                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline pt-1"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="table-fixed w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100/90 dark:bg-slate-900/90 sticky top-0 z-10 border-b border-slate-200 dark:border-white/10 backdrop-blur-sm">
                            <tr>
                                {[
                                    { label: 'N° OP', col: 'opNumber', width: 'w-24' },
                                    { label: 'Cliente', col: 'client', width: 'w-48' },
                                    { label: 'Dirección', col: 'address', width: 'w-56' },
                                    { label: 'Descripción de tarea', col: 'name', width: 'w-auto' },
                                    { label: 'Estado', col: 'status', width: 'w-40' },
                                    { label: 'Fecha de ejecución', col: 'date', width: 'w-48' }
                                ].map(({ label, col, width }) => (
                                    <th
                                        key={col}
                                        onClick={() => setSort(prev => ({
                                            col,
                                            dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc'
                                        }))}
                                        className={`${width} px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors group`}
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
                                {/* Sub-tareas column header */}
                                <th className="w-14 px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
                            {filteredTasks.map((task, idx) => {
                                const hasPendingDate = !task.date || task.date === '';
                                const currentStatus = getTaskStatus(task);
                                const style = getStatusBadgeStyle(currentStatus);
                                const taskAddress = getTaskAddress(task);
                                const isExpanded = expandedTasks.has(task.id);
                                const storeCount = subtasks.filter((s: any) => (s.task_id === task.id || s.taskId === task.id)).length;
                                const subtaskCount = storeCount > 0 ? storeCount : getSubtasksCount(task.id);
                                return (
                                    <React.Fragment key={task.id}>
                                        <tr
                                            onClick={() => onSelectTask(task)}
                                            className={`cursor-pointer transition-colors duration-150 hover:bg-slate-100/70 dark:hover:bg-slate-800/80 ${idx % 2 === 0 ? 'bg-slate-50/40 dark:bg-white/[0.01]' : 'bg-white dark:bg-transparent'} ${isExpanded ? 'bg-blue-50/50 dark:bg-slate-800/50' : ''}`}
                                        >
                                            <td className="px-3 py-2 align-middle">
                                                <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-[11px] bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-500/20 inline-block">
                                                    #{task.opNumber || '—'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 align-middle">
                                                <span className="font-semibold text-slate-900 dark:text-white/90 truncate block text-xs" title={task.client}>
                                                    {task.client || <span className="text-slate-400 dark:text-slate-600 italic">Sin cliente</span>}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 align-middle">
                                                <span className="text-slate-600 dark:text-slate-300 truncate block text-xs" title={taskAddress}>
                                                    {taskAddress || <span className="text-slate-400 dark:text-slate-600 italic">—</span>}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 align-middle">
                                                <span className="text-slate-800 dark:text-slate-300 truncate block text-xs font-medium" title={task.name}>
                                                    {task.name || <span className="text-slate-400 dark:text-slate-600 italic">Sin descripción</span>}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                                                <div className="relative inline-flex items-center">
                                                    <select
                                                        value={currentStatus}
                                                        onChange={(e) => {
                                                            const newSt = e.target.value as SectorTaskStatus;
                                                            if (task._isMultiDayGroup && task._groupTasks) {
                                                                task._groupTasks.forEach((gt: any) => onStatusChange(gt, newSt));
                                                            } else {
                                                                onStatusChange(task, newSt);
                                                            }
                                                        }}
                                                        className={`text-[11px] font-bold pl-2.5 pr-6 py-0.5 rounded-full border cursor-pointer appearance-none focus:outline-none transition-all ${style.badge} bg-white dark:bg-[#0f172a] shadow-sm dark:shadow-none hover:brightness-105 dark:hover:brightness-125`}
                                                    >
                                                        {SECTOR_TASK_STATUSES.map(st => (
                                                            <option key={st} value={st} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white font-semibold">
                                                                {st}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${style.pulse ? 'animate-pulse' : ''}`} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td
                                                className="px-3 py-2 align-middle cursor-pointer group/date"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    calendarAnchorRef.current = e.currentTarget;
                                                    setActiveCalendarTaskId(prev => prev === task.id ? null : task.id);
                                                }}
                                                title="Hacé clic para asignar o cambiar la fecha de ejecución"
                                            >
                                                {hasPendingDate ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-300/80 dark:border-amber-500/20 group-hover/date:border-amber-400 group-hover/date:bg-amber-100/80 dark:group-hover/date:bg-amber-500/20 transition-all shadow-sm">
                                                        <Calendar size={11} className="text-amber-600 dark:text-amber-400" />
                                                        Pendiente de fecha
                                                    </span>
                                                ) : task._isMultiDayGroup && task._minDate && task._maxDate && task._minDate !== task._maxDate ? (
                                                    <span className="text-slate-700 dark:text-slate-300 font-medium text-xs whitespace-nowrap flex items-center gap-1.5 group-hover/date:text-blue-600 dark:group-hover/date:text-blue-400 transition-colors">
                                                        <Calendar size={13} className="text-blue-500 flex-shrink-0" />
                                                        {format(new Date(task._minDate + 'T00:00:00'), "dd/MM", { locale: es })} — {format(new Date(task._maxDate + 'T00:00:00'), "dd/MM/yyyy", { locale: es })}
                                                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-blue-300 dark:border-blue-500/30">
                                                            {task._daysCount} días
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-700 dark:text-slate-300 font-medium text-xs whitespace-nowrap flex items-center gap-1.5 group-hover/date:text-blue-600 dark:group-hover/date:text-blue-400 transition-colors">
                                                        <Calendar size={13} className="text-blue-500 flex-shrink-0" />
                                                        {format(new Date(task.date + 'T00:00:00'), "dd 'de' MMMM yyyy", { locale: es })}
                                                    </span>
                                                )}

                                                {activeCalendarTaskId === task.id && (
                                                    <MiniCalendar
                                                        value={task.date || ''}
                                                        onSelect={(newDate) => handleDateChange(task, newDate)}
                                                        onClose={() => setActiveCalendarTaskId(null)}
                                                        anchorRef={calendarAnchorRef}
                                                    />
                                                )}
                                            </td>
                                            {/* Expand/collapse subtasks button */}
                                            <td className="px-2 py-2 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => toggleExpand(task.id)}
                                                    className={`
                                                        relative inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200
                                                        ${isExpanded
                                                            ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30 shadow-sm'
                                                            : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-slate-700/60 hover:text-slate-800 dark:hover:text-slate-300'
                                                        }
                                                    `}
                                                    title={isExpanded ? 'Ocultar sub-tareas' : 'Ver sub-tareas'}
                                                >
                                                    <ChevronDown
                                                        size={14}
                                                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                    />
                                                    {subtaskCount > 0 && !isExpanded && (
                                                        <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                                                            {subtaskCount}
                                                        </span>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                        {/* Subtasks expansion row */}
                                        {isExpanded && (
                                            <tr className="bg-slate-50/70 dark:bg-slate-950/40">
                                                <td colSpan={7} className="p-0 border-b border-slate-200 dark:border-white/10">
                                                    <SubtasksPanel taskId={task.id} />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
