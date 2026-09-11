import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Trash2, Calendar, ChevronLeft, ChevronRight, CornerDownRight, GripVertical } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday as isTodayFn } from 'date-fns';
import { es } from 'date-fns/locale';
import { type SectorTaskStatus, SECTOR_TASK_STATUSES, getStatusBadgeStyle } from '../utils/taskStatusUtils';

// ─── Types ───────────────────────────────────────────────────────────────────
export type SectorType = 'Instalaciones' | 'Herrería' | 'Corpóreas' | 'Lonas + Vinilos' | 'Pintura';

export const SECTORS: SectorType[] = [
    'Instalaciones',
    'Herrería',
    'Corpóreas',
    'Lonas + Vinilos',
    'Pintura',
];

/** Normalizes any sector or task type string from the database to one of the 5 canonical SectorTypes */
export function normalizeSector(sector?: string | null, type?: string | null): SectorType {
    const s = (sector || '').trim().toLowerCase();
    const t = (type || '').trim().toLowerCase();
    if (s.includes('herr') || t === 'herreria') return 'Herrería';
    if (s.includes('corp') || t === 'corporeas') return 'Corpóreas';
    if (s.includes('lona') || s.includes('vinil') || t === 'lonas') return 'Lonas + Vinilos';
    if (s.includes('pint') || t === 'pintura') return 'Pintura';
    return 'Instalaciones';
}

/** Maps display sector to the task `type` key used in useStore */
export function sectorToTaskType(sector: string): 'instalacion' | 'herreria' | 'corporeas' | 'lonas' | 'pintura' {
    const normalized = normalizeSector(sector);
    switch (normalized) {
        case 'Herrería': return 'herreria';
        case 'Corpóreas': return 'corporeas';
        case 'Lonas + Vinilos': return 'lonas';
        case 'Pintura': return 'pintura';
        default: return 'instalacion';
    }
}

/** Maps display sector to the task `section` string used in task objects */
export function sectorToSection(sector: string): string {
    const normalized = normalizeSector(sector);
    if (normalized === 'Lonas + Vinilos') return 'Lonas';
    return normalized;
}

function getSectorColor(sector: string) {
    const normalized = normalizeSector(sector);
    switch (normalized) {
        case 'Instalaciones':
            return {
                bg: 'bg-emerald-100 dark:bg-emerald-500/15',
                text: 'text-emerald-700 dark:text-emerald-400',
                border: 'border-emerald-300 dark:border-emerald-500/30',
                dot: 'bg-emerald-500',
            };
        case 'Herrería':
            return {
                bg: 'bg-orange-100 dark:bg-orange-500/15',
                text: 'text-orange-700 dark:text-orange-400',
                border: 'border-orange-300 dark:border-orange-500/30',
                dot: 'bg-orange-500',
            };
        case 'Corpóreas':
            return {
                bg: 'bg-indigo-100 dark:bg-indigo-500/15',
                text: 'text-indigo-700 dark:text-indigo-400',
                border: 'border-indigo-300 dark:border-indigo-500/30',
                dot: 'bg-indigo-500',
            };
        case 'Lonas + Vinilos':
            return {
                bg: 'bg-cyan-100 dark:bg-cyan-500/15',
                text: 'text-cyan-700 dark:text-cyan-400',
                border: 'border-cyan-300 dark:border-cyan-500/30',
                dot: 'bg-cyan-500',
            };
        case 'Pintura':
            return {
                bg: 'bg-pink-100 dark:bg-pink-500/15',
                text: 'text-pink-700 dark:text-pink-400',
                border: 'border-pink-300 dark:border-pink-500/30',
                dot: 'bg-pink-500',
            };
        default:
            return {
                bg: 'bg-slate-100 dark:bg-slate-500/15',
                text: 'text-slate-700 dark:text-slate-400',
                border: 'border-slate-300 dark:border-slate-500/30',
                dot: 'bg-slate-500',
            };
    }
}

// ─── Mini Calendar Modal ─────────────────────────────────────────────────────
export interface MiniCalendarProps {
    value: string; // YYYY-MM-DD or ''
    onSelect: (date: string) => void;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ value, onSelect, onClose, anchorRef }) => {
    const [viewMonth, setViewMonth] = useState(() => {
        if (value) return startOfMonth(new Date(value + 'T12:00:00'));
        return startOfMonth(new Date());
    });
    const calRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    useEffect(() => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            const calWidth = 256;
            const calHeight = 300;
            let top = rect.bottom + 4;
            let left = rect.left;

            if (left + calWidth > window.innerWidth) {
                left = window.innerWidth - calWidth - 8;
            }
            if (top + calHeight > window.innerHeight) {
                top = rect.top - calHeight - 4;
            }
            setPosition({ top, left });
        }
    }, [anchorRef]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (calRef.current && !calRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOfWeek = getDay(monthStart);
    const paddingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    const selectedStr = value || '';

    return (
        <div
            ref={calRef}
            className="fixed z-[9999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-xl shadow-2xl shadow-slate-500/20 dark:shadow-black/50 p-3 select-none"
            style={{ top: position.top, left: position.left, width: 256 }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <button
                    onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                    <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                    {format(viewMonth, 'MMMM yyyy', { locale: es })}
                </span>
                <button
                    onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
                {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(d => (
                    <div key={d} className="text-center text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase py-0.5">
                        {d}
                    </div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: paddingDays }).map((_, i) => (
                    <div key={`pad-${i}`} className="h-7" />
                ))}
                {days.map(day => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const isSelected = dayStr === selectedStr;
                    const isToday = isTodayFn(day);
                    const isWeekend = getDay(day) === 0 || getDay(day) === 6;

                    return (
                        <button
                            key={dayStr}
                            onClick={() => {
                                onSelect(dayStr);
                                onClose();
                            }}
                            className={`
                                h-7 rounded-lg text-[11px] font-medium transition-all duration-150
                                flex items-center justify-center
                                ${isSelected
                                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30'
                                    : isToday
                                        ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold ring-1 ring-blue-300 dark:ring-blue-500/30'
                                        : isWeekend
                                            ? 'text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-400'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                                }
                            `}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>

            {/* Clear date button */}
            {value && (
                <button
                    onClick={() => {
                        onSelect('');
                        onClose();
                    }}
                    className="mt-2 w-full text-center text-[10px] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-semibold py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                >
                    Quitar fecha
                </button>
            )}
        </div>
    );
};

// ─── OrderTasksPanel ─────────────────────────────────────────────────────────
export interface OrderTask {
    id: string;
    name: string;
    section: SectorType;
    date: string; // YYYY-MM-DD or ''
    status: SectorTaskStatus;
}

// ─── OP Tasks Ordering Helpers ───────────────────────────────────────────────
const OP_TASKS_ORDER_KEY = 'op_tasks_order';

export function getOpTasksOrder(opNumber: string): string[] {
    try {
        const raw = localStorage.getItem(OP_TASKS_ORDER_KEY);
        const map = raw ? JSON.parse(raw) : {};
        return map[opNumber] || [];
    } catch {
        return [];
    }
}

export function saveOpTasksOrder(opNumber: string, order: string[]) {
    try {
        const raw = localStorage.getItem(OP_TASKS_ORDER_KEY);
        const map = raw ? JSON.parse(raw) : {};
        map[opNumber] = order;
        localStorage.setItem(OP_TASKS_ORDER_KEY, JSON.stringify(map));
    } catch (e) {
        console.error('Error saving OP tasks order:', e);
    }
}

interface OrderTasksPanelProps {
    order: {
        id: string;
        opNumber: string;
        client: string;
        address?: string;
    };
    /** All tasks from the store matching this OP */
    linkedTasks: any[];
    /** Add a new task to the store */
    onAddTask: (task: {
        name: string;
        sector: SectorType;
        date: string;
    }) => void;
    /** Update an existing task */
    onUpdateTask: (task: any) => void;
    /** Delete a task */
    onDeleteTask: (taskId: string) => void;
    /** Callback when tasks are manually reordered */
    onReorderTasks?: (taskIds: string[]) => void;
}

export const OrderTasksPanel: React.FC<OrderTasksPanelProps> = ({
    order,
    linkedTasks,
    onAddTask,
    onUpdateTask,
    onDeleteTask,
    onReorderTasks,
}) => {
    const [newName, setNewName] = useState('');
    const [newSector, setNewSector] = useState<SectorType>('Instalaciones');
    const [newDate, setNewDate] = useState('');
    const [calendarTaskId, setCalendarTaskId] = useState<string | null>(null); // 'new' or taskId
    const calendarAnchorRef = useRef<HTMLElement | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Drag and Drop state
    const [customOrder, setCustomOrder] = useState<string[]>(() => getOpTasksOrder(order.opNumber));
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

    // Keep ordered tasks based on stored custom order
    const orderedTasks = useMemo(() => {
        const savedOrder = customOrder.length > 0 ? customOrder : getOpTasksOrder(order.opNumber);
        if (!savedOrder || savedOrder.length === 0) return linkedTasks;
        const taskMap = new Map(linkedTasks.map(t => [t.id, t]));
        const result: any[] = [];
        for (const id of savedOrder) {
            if (taskMap.has(id)) {
                result.push(taskMap.get(id)!);
                taskMap.delete(id);
            }
        }
        for (const remaining of taskMap.values()) {
            result.push(remaining);
        }
        return result;
    }, [linkedTasks, order.opNumber, customOrder]);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        const target = e.target as HTMLElement;
        if (target.closest('select, button, input')) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        setDraggedIdx(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dropTargetIdx !== index) {
            setDropTargetIdx(index);
        }
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === targetIndex) {
            setDraggedIdx(null);
            setDropTargetIdx(null);
            return;
        }
        const updated = [...orderedTasks];
        const [moved] = updated.splice(draggedIdx, 1);
        updated.splice(targetIndex, 0, moved);
        const newOrderIds = updated.map(t => t.id);
        saveOpTasksOrder(order.opNumber, newOrderIds);
        setCustomOrder(newOrderIds);
        setDraggedIdx(null);
        setDropTargetIdx(null);
        if (onReorderTasks) {
            onReorderTasks(newOrderIds);
        }
    };

    const handleDragEnd = () => {
        setDraggedIdx(null);
        setDropTargetIdx(null);
    };

    // Calendar for the "add new" date button
    const [showNewCalendar, setShowNewCalendar] = useState(false);
    const newDateBtnRef = useRef<HTMLButtonElement>(null);

    const handleAdd = () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        onAddTask({
            name: trimmed,
            sector: newSector,
            date: newDate,
        });
        setNewName('');
        setNewDate('');
        setNewSector('Instalaciones');
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div
            className="py-2.5 px-4 sm:pl-20 sm:pr-8 bg-slate-50/60 dark:bg-slate-950/40 border-t border-slate-200/70 dark:border-white/5"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Stepped container */}
            <div className="max-w-xl sm:max-w-3xl ml-2 sm:ml-4 pl-3.5 border-l-2 border-blue-400/50 dark:border-blue-500/40 space-y-2">
                {/* Section Header */}
                <div className="flex items-center justify-between gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-0.5">
                    <div className="flex items-center gap-1.5">
                        <span>Tareas de OP {order.opNumber}</span>
                        <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full text-[9px] font-black">
                            {orderedTasks.length}
                        </span>
                    </div>
                    {orderedTasks.length > 1 && (
                        <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 lowercase">
                            arrastrá para reordenar
                        </span>
                    )}
                </div>

                {/* Task list */}
                {orderedTasks.length > 0 && (
                    <div className="space-y-1.5">
                        {orderedTasks.map((task, index) => {
                            const isDragging = draggedIdx === index;
                            const isDropTarget = dropTargetIdx === index;
                            const currentSector = normalizeSector(task.section, task.type);
                            const sc = getSectorColor(currentSector);
                            const style = getStatusBadgeStyle(task.status || 'Para realizar');
                            return (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDrop={(e) => handleDrop(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center gap-2 group/sub bg-white dark:bg-slate-800/80 rounded-lg px-2.5 py-1.5 border transition-all flex-wrap sm:flex-nowrap cursor-grab active:cursor-grabbing select-none ${
                                        isDragging
                                            ? 'opacity-30 scale-[0.99] border-dashed border-blue-500 bg-blue-50/20 dark:bg-blue-500/10'
                                            : isDropTarget
                                                ? 'border-t-2 border-t-blue-500 dark:border-t-blue-400 bg-blue-50/10 dark:bg-blue-500/5'
                                                : 'border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 shadow-sm dark:shadow-none'
                                    }`}
                                >
                                    {/* Drag handle */}
                                    <div
                                        className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"
                                        title="Arrastrar para reordenar"
                                    >
                                        <GripVertical size={13} />
                                    </div>

                                    {/* Tree branch indicator */}
                                    <CornerDownRight size={13} className="text-blue-500/70 dark:text-blue-400/70 shrink-0" />

                                    {/* Task Name */}
                                    <span className="flex-1 text-xs text-slate-800 dark:text-slate-200 font-medium truncate min-w-0" title={task.name}>
                                        {task.name}
                                    </span>

                                    {/* Sector dropdown */}
                                    <div className="relative inline-flex items-center shrink-0">
                                        <select
                                            value={currentSector}
                                            onChange={(e) => {
                                                const newSector = e.target.value as SectorType;
                                                onUpdateTask({
                                                    ...task,
                                                    section: sectorToSection(newSector),
                                                    type: sectorToTaskType(newSector),
                                                });
                                            }}
                                            className={`text-[9px] font-black uppercase tracking-wider pl-2 pr-5 py-0.5 rounded-full border cursor-pointer appearance-none focus:outline-none transition-all ${sc.bg} ${sc.text} ${sc.border} bg-white dark:bg-[#0f172a] shadow-sm dark:shadow-none hover:brightness-105 dark:hover:brightness-125`}
                                        >
                                            {SECTORS.map(s => (
                                                <option key={s} value={s} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white font-semibold">
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
                                            <span className={`w-1.5 h-1.5 rounded-full block ${sc.dot}`} />
                                        </div>
                                    </div>

                                    {/* Status dropdown */}
                                    <div className="relative inline-flex items-center shrink-0">
                                        <select
                                            value={task.status || 'Para realizar'}
                                            onChange={(e) => onUpdateTask({ ...task, status: e.target.value })}
                                            className={`text-[10px] font-bold pl-2 pr-5 py-0.5 rounded-full border cursor-pointer appearance-none focus:outline-none transition-all ${style.badge} bg-white dark:bg-[#0f172a] shadow-sm dark:shadow-none hover:brightness-105 dark:hover:brightness-125`}
                                        >
                                            {SECTOR_TASK_STATUSES.map(st => (
                                                <option key={st} value={st} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white font-semibold">
                                                    {st}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
                                            <span className={`w-1 h-1 rounded-full block ${style.dot} ${style.pulse ? 'animate-pulse' : ''}`} />
                                        </div>
                                    </div>

                                    {/* Date button */}
                                    <button
                                        ref={(el) => {
                                            if (calendarTaskId === task.id) {
                                                calendarAnchorRef.current = el;
                                            }
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            calendarAnchorRef.current = e.currentTarget;
                                            setCalendarTaskId(prev => prev === task.id ? null : task.id);
                                            setShowNewCalendar(false);
                                        }}
                                        className={`
                                            inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all shrink-0
                                            ${task.date
                                                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 hover:border-blue-300 dark:hover:border-blue-500/40'
                                                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-800 dark:hover:text-slate-200'
                                            }
                                        `}
                                    >
                                        <Calendar size={10} />
                                        {task.date
                                            ? format(new Date(task.date + 'T12:00:00'), "dd MMM", { locale: es })
                                            : 'Fecha'
                                        }
                                    </button>

                                    {/* Calendar modal for existing task */}
                                    {calendarTaskId === task.id && (
                                        <MiniCalendar
                                            value={task.date || ''}
                                            anchorRef={calendarAnchorRef}
                                            onSelect={(date) => onUpdateTask({ ...task, date })}
                                            onClose={() => setCalendarTaskId(null)}
                                        />
                                    )}

                                    {/* Delete */}
                                    <button
                                        onClick={() => {
                                            if (confirm(`¿Eliminar la tarea "${task.name}"?`)) {
                                                onDeleteTask(task.id);
                                            }
                                        }}
                                        className="opacity-0 group-hover/sub:opacity-100 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-500/15 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 transition-all shrink-0"
                                        title="Eliminar tarea"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Add new task form */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Name input */}
                    <div className="flex-1 min-w-[140px] relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nueva tarea..."
                            className="w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 shadow-sm dark:shadow-none transition-all"
                        />
                    </div>

                    {/* Sector selector */}
                    <select
                        value={newSector}
                        onChange={(e) => setNewSector(e.target.value as SectorType)}
                        className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 shadow-sm dark:shadow-none transition-all min-w-[90px]"
                    >
                        {SECTORS.map(s => (
                            <option key={s} value={s} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                                {s}
                            </option>
                        ))}
                    </select>

                    {/* Date picker button */}
                    <button
                        ref={newDateBtnRef}
                        onClick={(e) => {
                            e.stopPropagation();
                            calendarAnchorRef.current = e.currentTarget;
                            setShowNewCalendar(prev => !prev);
                            setCalendarTaskId(null);
                        }}
                        className={`
                            inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1.5 rounded-lg border transition-all shrink-0
                            ${newDate
                                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 hover:border-blue-300 dark:hover:border-blue-500/40'
                                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                            }
                        `}
                    >
                        <Calendar size={10} />
                        {newDate
                            ? format(new Date(newDate + 'T12:00:00'), "dd MMM", { locale: es })
                            : 'Fecha'
                        }
                    </button>

                    {/* New date calendar modal */}
                    {showNewCalendar && (
                        <MiniCalendar
                            value={newDate}
                            anchorRef={calendarAnchorRef}
                            onSelect={(date) => setNewDate(date)}
                            onClose={() => setShowNewCalendar(false)}
                        />
                    )}

                    {/* Add button */}
                    <button
                        onClick={handleAdd}
                        disabled={!newName.trim()}
                        className={`
                            flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all
                            ${newName.trim()
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                            }
                        `}
                    >
                        <Plus size={12} />
                        Agregar
                    </button>
                </div>

                {/* Empty state */}
                {linkedTasks.length === 0 && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 italic py-0.5">
                        No hay tareas asignadas a esta OP. Escribí un nombre, elegí el sector y hacé click en "Agregar".
                    </p>
                )}
            </div>
        </div>
    );
};
