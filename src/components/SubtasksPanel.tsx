import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Calendar, ChevronLeft, ChevronRight, CornerDownRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday as isTodayFn } from 'date-fns';
import { es } from 'date-fns/locale';
import { type SectorTaskStatus, SECTOR_TASK_STATUSES, getStatusBadgeStyle } from '../utils/taskStatusUtils';
import { useStore } from '../store/useStore';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Subtask {
    id: string;
    name: string;
    status: SectorTaskStatus;
    date: string; // YYYY-MM-DD or ''
}

// ─── localStorage helpers ────────────────────────────────────────────────────
const STORAGE_KEY = 'subtasks_data';

function loadAllSubtasks(): Record<string, Subtask[]> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveAllSubtasks(data: Record<string, Subtask[]>) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving subtasks to localStorage', e);
    }
}

export function getSubtasksForTask(taskId: string): Subtask[] {
    return loadAllSubtasks()[taskId] || [];
}

export function getSubtasksCount(taskId: string): number {
    return getSubtasksForTask(taskId).length;
}

export function setSubtasksForTask(taskId: string, subtasks: Subtask[]) {
    const all = loadAllSubtasks();
    if (subtasks.length === 0) {
        delete all[taskId];
    } else {
        all[taskId] = subtasks;
    }
    saveAllSubtasks(all);
}

// ─── Mini Calendar Modal ─────────────────────────────────────────────────────
interface MiniCalendarProps {
    value: string; // YYYY-MM-DD or ''
    onSelect: (date: string) => void;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ value, onSelect, onClose, anchorRef }) => {
    const [viewMonth, setViewMonth] = useState(() => {
        if (value) return startOfMonth(new Date(value + 'T12:00:00'));
        return startOfMonth(new Date());
    });
    const calRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    // Position relative to anchor
    useEffect(() => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            const calWidth = 256;
            const calHeight = 300;
            let top = rect.bottom + 4;
            let left = rect.left;

            // Ensure it doesn't overflow the viewport
            if (left + calWidth > window.innerWidth) {
                left = window.innerWidth - calWidth - 8;
            }
            if (top + calHeight > window.innerHeight) {
                top = rect.top - calHeight - 4;
            }
            setPosition({ top, left });
        }
    }, [anchorRef]);

    // Close on outside click
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
    const startDayOfWeek = getDay(monthStart); // 0=Sun, adjust for Mon start
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

// ─── SubtasksPanel ───────────────────────────────────────────────────────────
interface SubtasksPanelProps {
    taskId: string;
}

export const SubtasksPanel: React.FC<SubtasksPanelProps> = ({ taskId }) => {
    const storeSubtasks = useStore(state => state.subtasks);
    const addSubtaskStore = useStore(state => state.addSubtask);
    const updateSubtaskStore = useStore(state => state.updateSubtask);
    const deleteSubtaskStore = useStore(state => state.deleteSubtask);

    const taskSubtasks = (storeSubtasks || []).filter((s: any) => (s.task_id === taskId || s.taskId === taskId));
    const localFallback = getSubtasksForTask(taskId);
    const subtasks: Subtask[] = taskSubtasks.length > 0 ? taskSubtasks : localFallback;

    const [newName, setNewName] = useState('');
    const [calendarSubtaskId, setCalendarSubtaskId] = useState<string | null>(null);
    const calendarAnchorRef = useRef<HTMLElement | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const addSubtask = async () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        setNewName('');
        await addSubtaskStore({
            taskId,
            name: trimmed,
            status: 'Para realizar',
            date: ''
        });
        inputRef.current?.focus();
    };

    const deleteSubtask = async (id: string) => {
        await deleteSubtaskStore(id);
    };

    const updateSubtaskStatus = async (id: string, status: SectorTaskStatus) => {
        await updateSubtaskStore({ id, status });
    };

    const updateSubtaskDate = async (id: string, date: string) => {
        await updateSubtaskStore({ id, date });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSubtask();
        }
    };

    return (
        <div
            className="py-2.5 px-4 sm:pl-20 sm:pr-8 bg-slate-50/60 dark:bg-slate-950/40 border-t border-slate-200/70 dark:border-white/5 animate-in slide-in-from-top-1 duration-150"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Stepped / Escalonado container with restricted max-width */}
            <div className="max-w-xl sm:max-w-2xl ml-2 sm:ml-4 pl-3.5 border-l-2 border-blue-400/50 dark:border-blue-500/40 space-y-2">
                {/* Section Header */}
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-0.5">
                    <span>Sub-tareas</span>
                    <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded-full text-[9px] font-black">
                        {subtasks.length}
                    </span>
                </div>

                {/* Subtask list */}
                {subtasks.length > 0 && (
                    <div className="space-y-1.5">
                        {subtasks.map((sub) => {
                            const style = getStatusBadgeStyle(sub.status);
                            return (
                                <div
                                    key={sub.id}
                                    className="flex items-center gap-2 group/sub bg-white dark:bg-slate-800/80 rounded-lg px-2.5 py-1.5 border border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 shadow-sm dark:shadow-none transition-all"
                                >
                                    {/* Stepped tree branch indicator */}
                                    <CornerDownRight size={13} className="text-blue-500/70 dark:text-blue-400/70 shrink-0" />

                                    {/* Name */}
                                    <span className="flex-1 text-xs text-slate-800 dark:text-slate-200 font-medium truncate min-w-0" title={sub.name}>
                                        {sub.name}
                                    </span>

                                    {/* Status dropdown */}
                                    <div className="relative inline-flex items-center shrink-0">
                                        <select
                                            value={sub.status}
                                            onChange={(e) => updateSubtaskStatus(sub.id, e.target.value as SectorTaskStatus)}
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
                                            if (calendarSubtaskId === sub.id) {
                                                calendarAnchorRef.current = el;
                                            }
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            calendarAnchorRef.current = e.currentTarget;
                                            setCalendarSubtaskId(prev => prev === sub.id ? null : sub.id);
                                        }}
                                        className={`
                                            inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all shrink-0
                                            ${sub.date
                                                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 hover:border-blue-300 dark:hover:border-blue-500/40'
                                                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-800 dark:hover:text-slate-200'
                                            }
                                        `}
                                    >
                                        <Calendar size={10} />
                                        {sub.date
                                            ? format(new Date(sub.date + 'T12:00:00'), "dd MMM", { locale: es })
                                            : 'Fecha'
                                        }
                                    </button>

                                    {/* Calendar modal */}
                                    {calendarSubtaskId === sub.id && (
                                        <MiniCalendar
                                            value={sub.date}
                                            anchorRef={calendarAnchorRef}
                                            onSelect={(date) => updateSubtaskDate(sub.id, date)}
                                            onClose={() => setCalendarSubtaskId(null)}
                                        />
                                    )}

                                    {/* Delete */}
                                    <button
                                        onClick={() => deleteSubtask(sub.id)}
                                        className="opacity-0 group-hover/sub:opacity-100 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-500/15 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 transition-all shrink-0"
                                        title="Eliminar sub-tarea"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Add new subtask form */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Agregar sub-tarea..."
                            className="w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 shadow-sm dark:shadow-none transition-all"
                        />
                    </div>
                    <button
                        onClick={addSubtask}
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
                {subtasks.length === 0 && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 italic py-0.5">
                        No hay sub-tareas. Escribí un nombre arriba y hacé click en "Agregar".
                    </p>
                )}
            </div>
        </div>
    );
};
