import React, { useMemo, useState, useRef, useEffect } from 'react';
import { format, addDays, startOfWeek, isWeekend, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { sileo } from 'sileo';
import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';

interface SimpleGanttViewProps {
    tasks: any[];
    currentWeekStart: Date;
    onDateChange: (date: Date) => void;
    onTaskClick?: (task: any) => void;
    isDragging?: boolean;
}

interface DragState {
    groupId: string;
    startDayIdx: number;
    currentDayIdx: number;
}

interface ContextMenu {
    x: number;
    y: number;
    group: any;
}

export const SimpleGanttView: React.FC<SimpleGanttViewProps> = ({ tasks, currentWeekStart, onDateChange, onTaskClick, isDragging }) => {
    const updateTaskLocal = useStore(state => state.updateTaskLocal);
    const addTaskLocal    = useStore(state => state.addTaskLocal);
    const members         = useStore(state => state.members);

    const DAYS_TO_SHOW = 28;
    const startDate = startOfWeek(currentWeekStart, { weekStartsOn: 1 });

    const gridBodyRef  = useRef<HTMLDivElement>(null);
    const [dragState, setDragState]         = useState<DragState | null>(null);
    const wasDraggingRef                    = useRef(false);

    // Context menu
    const [contextMenu, setContextMenu]     = useState<ContextMenu | null>(null);
    // Modal "Cambiar cantidad de días"
    const [extendModal, setExtendModal]     = useState<{ group: any } | null>(null);
    const [extendDays, setExtendDays]       = useState<number>(1);

    // State to track which cell is being hovered during an HTML5 drag
    const [html5DragOverCell, setHtml5DragOverCell] = useState<{ rowId: string; dayIdx: number } | null>(null);

    const days = useMemo(() => {
        return Array.from({ length: DAYS_TO_SHOW }).map((_, i) => addDays(startDate, i));
    }, [startDate]);

    const groupedTasks = useMemo(() => {
        const groups: Record<string, any> = {};
        tasks.forEach(t => {
            if (!t.date) return;
            const gid = t.groupId || t.id;
            if (!groups[gid]) {
                groups[gid] = { id: gid, opNumber: t.opNumber, client: t.client, name: t.name, parts: [], minDate: t.date, maxDate: t.date, originalTasks: [] };
            }
            groups[gid].parts.push(t.date);
            groups[gid].originalTasks.push(t);
            if (t.date < groups[gid].minDate) groups[gid].minDate = t.date;
            if (t.date > groups[gid].maxDate) groups[gid].maxDate = t.date;
        });

        const minVisible = format(days[0], 'yyyy-MM-dd');
        const maxVisible = format(days[DAYS_TO_SHOW - 1], 'yyyy-MM-dd');

        return Object.values(groups)
            .filter(g => g.maxDate >= minVisible && g.minDate <= maxVisible)
            .sort((a, b) => a.minDate.localeCompare(b.minDate));
    }, [tasks, days]);

    // Cierra el context menu al click fuera
    useEffect(() => {
        if (!contextMenu) return;
        const close = () => setContextMenu(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [contextMenu]);

    // Cierra el context menu con Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setContextMenu(null); setExtendModal(null); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // X del mouse → índice de día
    const xToDayIdx = (clientX: number): number => {
        const el = gridBodyRef.current;
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        const dayWidth = rect.width / DAYS_TO_SHOW;
        return Math.max(0, Math.min(DAYS_TO_SHOW - 1, Math.floor((clientX - rect.left) / dayWidth)));
    };

    // --- Drag (mouse events) ---
    const handleBarMouseDown = (e: React.MouseEvent, group: any) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        wasDraggingRef.current = false;
        const dayIdx = xToDayIdx(e.clientX);
        setDragState({ groupId: group.id, startDayIdx: dayIdx, currentDayIdx: dayIdx });
    };

    useEffect(() => {
        if (!dragState) return;
        const handleMouseMove = (e: MouseEvent) => {
            const idx = xToDayIdx(e.clientX);
            if (idx !== dragState.currentDayIdx) wasDraggingRef.current = true;
            setDragState(prev => prev ? { ...prev, currentDayIdx: idx } : null);
        };
        const handleMouseUp = () => {
            if (!dragState) { setDragState(null); return; }
            const group = groupedTasks.find(g => g.id === dragState.groupId);
            if (group) {
                const daysDiff = dragState.currentDayIdx - dragState.startDayIdx;
                if (daysDiff !== 0) {
                    group.originalTasks.forEach((task: any) => {
                        const newDate = addDays(new Date(task.date + 'T12:00:00'), daysDiff);
                        updateTaskLocal({ ...task, date: format(newDate, 'yyyy-MM-dd') });
                    });
                    const newStart = addDays(new Date(group.minDate + 'T12:00:00'), daysDiff);
                    sileo.success({ title: `Tarea reprogramada al ${format(newStart, 'dd/MM', { locale: es })}` });
                }
            }
            setDragState(null);
            setTimeout(() => { wasDraggingRef.current = false; }, 0);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, groupedTasks]);

    // --- Context menu ---
    const handleBarContextMenu = (e: React.MouseEvent, group: any) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, group });
    };

    // --- HTML5 Drag and Drop for Unscheduled Tasks (from the pending tasks drawer) ---
    const handleHtml5DragOver = (e: React.DragEvent) => {
        const isTaskDrag = Array.from(e.dataTransfer.types).some(t => t.toLowerCase() === 'taskid');
        if (isTaskDrag) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    };

    const handleHtml5Drop = (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const newDateStr = format(date, 'yyyy-MM-dd');
        updateTaskLocal({
            ...task,
            date: newDateStr,
            teamId: null // Gantt view is for general installations, no teamId mapping
        });
        sileo.success({ title: `Tarea asignada al ${format(date, 'dd/MM', { locale: es })}` });
    };

    // --- Extender barra ---
    const getNextWorkingDay = (dateStr: string): string => {
        let date = new Date(dateStr + 'T12:00:00');
        do { date = addDays(date, 1); } while (isWeekend(date));
        return format(date, 'yyyy-MM-dd');
    };

    const handleExtendConfirm = () => {
        if (!extendModal || extendDays === 0) return;
        const { group } = extendModal;

        if (extendDays > 0) {
            // Agregar días al final
            const template = group.originalTasks[0];
            let lastDate = group.maxDate;
            for (let i = 0; i < extendDays; i++) {
                lastDate = getNextWorkingDay(lastDate);
                addTaskLocal({
                    ...template,
                    id: undefined,
                    date: lastDate,
                    members: [],
                    groupId: group.id,
                });
            }
            sileo.success({ title: `Tarea extendida ${extendDays} día${extendDays > 1 ? 's' : ''} más` });
        } else {
            // Restar días: eliminar los últimos |n| fragmentos (dejando siempre al menos 1)
            const daysToRemove = Math.abs(extendDays);
            // Ordenar partes de más reciente a más antigua
            const sortedTasks = [...group.originalTasks].sort((a: any, b: any) => b.date.localeCompare(a.date));
            const removeCount = Math.min(daysToRemove, sortedTasks.length - 1); // nunca borrar el último
            if (removeCount === 0) {
                sileo.warning({ title: 'No se puede quitar más: la tarea tiene solo 1 día' });
                setExtendModal(null);
                setExtendDays(1);
                return;
            }
            for (let i = 0; i < removeCount; i++) {
                const taskToRemove = sortedTasks[i];
                // Actualizar fecha a '' para sacarlo del grid (misma lógica que "mover a pendientes")
                useStore.getState().deleteTaskLocal(taskToRemove.id);
            }
            sileo.success({ title: `Se ${removeCount === 1 ? 'quitó 1 día' : `quitaron ${removeCount} días`} de la tarea` });
        }

        setExtendModal(null);
        setExtendDays(1);
    };

    // Estilo de la barra con offset de arrastre
    const getBarStyle = (minDateStr: string, maxDateStr: string, dayOffset = 0) => {
        const rawStart = days.findIndex(d => format(d, 'yyyy-MM-dd') === minDateStr);
        const rawEnd   = days.findIndex(d => format(d, 'yyyy-MM-dd') === maxDateStr);
        const startIdx = (rawStart === -1 ? 0 : rawStart) + dayOffset;
        const endIdx   = (rawEnd   === -1 ? DAYS_TO_SHOW - 1 : rawEnd) + dayOffset;
        const cs = Math.max(0, Math.min(DAYS_TO_SHOW - 1, startIdx));
        const ce = Math.max(cs, Math.min(DAYS_TO_SHOW - 1, endIdx));
        return { gridColumn: `${cs + 1} / span ${ce - cs + 1}` };
    };

    const isDraggingAny = dragState !== null;

    return (
        <div
            className="flex-1 min-h-0 bg-[#0f172a] flex flex-col overflow-hidden border-t sm:border border-white/5 mx-0 sm:mx-2 lg:mx-10 mb-0 sm:mb-2 rounded-none sm:rounded-[1rem] relative shadow-2xl animate-in fade-in zoom-in-95 duration-300"
            style={{ userSelect: isDraggingAny ? 'none' : 'auto', cursor: isDraggingAny ? 'grabbing' : 'default' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#1e293b]">
                <div className="text-sm font-bold text-slate-300">Gantt Simplificado (4 Semanas)</div>
                <div className="flex items-center gap-2">
                    <button onClick={() => onDateChange(addDays(startDate, -7))} className="p-1 hover:bg-white/10 rounded text-slate-400">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => onDateChange(new Date())} className="text-xs font-bold px-2 py-1 bg-blue-600/20 text-blue-400 rounded">
                        Hoy
                    </button>
                    <button onClick={() => onDateChange(addDays(startDate, 7))} className="p-1 hover:bg-white/10 rounded text-slate-400">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar flex">
                {/* Left Column */}
                <div className="w-64 flex-shrink-0 border-r border-white/10 bg-[#1e293b] flex flex-col sticky left-0 z-20">
                    <div className="h-12 border-b border-white/10 flex items-center px-4 font-bold text-xs text-slate-400 uppercase tracking-widest sticky top-0 bg-[#1e293b] z-30">
                        Tareas
                    </div>
                    {groupedTasks.map(g => (
                        <div
                            key={g.id}
                            onClick={() => !isDraggingAny && onTaskClick?.(g.originalTasks[0])}
                            className="h-12 border-b border-white/5 flex flex-col justify-center px-4 hover:bg-white/[0.04] transition-colors cursor-pointer group/row"
                        >
                            <div className="text-xs font-bold text-slate-200 truncate group-hover/row:text-blue-300 transition-colors">{g.name}</div>
                            <div className="text-[10px] text-slate-500 truncate">OP {g.opNumber} · {g.client}</div>
                        </div>
                    ))}
                </div>

                {/* Timeline Grid */}
                <div className="flex-1 flex flex-col" style={{ minWidth: `${DAYS_TO_SHOW * 40}px` }}>
                    {/* Header de días */}
                    <div
                        className="h-12 border-b border-white/10 sticky top-0 z-10 bg-[#1e293b]"
                        style={{ display: 'grid', gridTemplateColumns: `repeat(${DAYS_TO_SHOW}, minmax(0, 1fr))` }}
                    >
                        {days.map((day, i) => (
                            <div key={i} className={`border-r border-white/5 flex flex-col items-center justify-center ${isWeekend(day) ? 'bg-white/5' : ''} ${isToday(day) ? 'bg-blue-500/10' : ''}`}>
                                <span className="text-[9px] uppercase font-bold text-slate-500">{format(day, 'EEE', { locale: es })}</span>
                                <span className={`text-xs font-bold ${isToday(day) ? 'text-blue-400' : 'text-slate-300'}`}>{format(day, 'dd')}</span>
                            </div>
                        ))}
                    </div>

                    {/* Filas de tareas */}
                    <div className="flex-1 flex flex-col" ref={gridBodyRef}>
                        {groupedTasks.map(g => {
                            const isThisBeingDragged = dragState?.groupId === g.id;
                            const dayOffset = isThisBeingDragged ? dragState!.currentDayIdx - dragState!.startDayIdx : 0;

                            // Integrantes únicos asignados en cualquier parte del grupo
                            const uniqueMemberIds = Array.from(new Set(
                                g.originalTasks.flatMap((t: any) =>
                                    (t.members || []).map((m: any) => typeof m === 'string' ? m : m.id)
                                )
                            )) as string[];

                            const getInitials = (name: string) => {
                                const parts = name.trim().split(/\s+/);
                                return parts.length >= 2
                                    ? (parts[0][0] + parts[1][0]).toUpperCase()
                                    : name.slice(0, 2).toUpperCase();
                            };

                            return (
                                <div
                                    key={g.id}
                                    className="h-12 border-b border-white/5 relative"
                                    style={{ display: 'grid', gridTemplateColumns: `repeat(${DAYS_TO_SHOW}, minmax(0, 1fr))` }}
                                >
                                    {/* Celdas de fondo */}
                                    {days.map((day, i) => {
                                        const isDropTarget = isThisBeingDragged && dragState!.currentDayIdx === i;
                                        const isHtml5Hovered = html5DragOverCell?.rowId === g.id && html5DragOverCell?.dayIdx === i;
                                        return (
                                            <div
                                                key={i}
                                                onDragOver={(e) => {
                                                    handleHtml5DragOver(e);
                                                    if (!html5DragOverCell || html5DragOverCell.rowId !== g.id || html5DragOverCell.dayIdx !== i) {
                                                        setHtml5DragOverCell({ rowId: g.id, dayIdx: i });
                                                    }
                                                }}
                                                onDragLeave={() => {
                                                    setHtml5DragOverCell(null);
                                                }}
                                                onDrop={(e) => {
                                                    handleHtml5Drop(e, day);
                                                    setHtml5DragOverCell(null);
                                                }}
                                                className={`h-full border-r border-white/5 transition-all duration-150
                                                    ${isWeekend(day) ? 'bg-white/[0.02]' : ''}
                                                    ${isToday(day) ? 'bg-blue-500/[0.03]' : ''}
                                                    ${isDropTarget ? 'bg-blue-500/20' : ''}
                                                    ${isHtml5Hovered ? 'bg-emerald-500/20 border-emerald-400/30' : ''}
                                                    ${isDragging && !isHtml5Hovered ? 'bg-emerald-500/[0.03] border-emerald-500/10 cursor-copy' : ''}
                                                `}
                                            />
                                        );
                                    })}

                                    {/* Barra draggable */}
                                    <div className="absolute inset-0 grid p-1.5 pointer-events-none" style={{ gridTemplateColumns: `repeat(${DAYS_TO_SHOW}, minmax(0, 1fr))` }}>
                                        <div
                                            className={`h-full rounded-md shadow-sm border transition-all duration-75 flex items-center px-2 overflow-hidden pointer-events-auto
                                                ${isThisBeingDragged
                                                    ? 'bg-blue-400 border-blue-300 shadow-lg shadow-blue-500/30 scale-y-110 cursor-grabbing'
                                                    : 'bg-blue-500/80 border-blue-400/50 hover:bg-blue-400 cursor-grab'
                                                }
                                            `}
                                            style={getBarStyle(g.minDate, g.maxDate, dayOffset)}
                                            onMouseDown={(e) => handleBarMouseDown(e, g)}
                                            onContextMenu={(e) => handleBarContextMenu(e, g)}
                                            onClick={(e) => {
                                                if (wasDraggingRef.current) return;
                                                e.stopPropagation();
                                                onTaskClick?.(g.originalTasks[0]);
                                            }}
                                            title={`${g.name} · OP ${g.opNumber} · Click derecho para opciones`}
                                        >
                                            <div className="flex flex-col justify-center h-full gap-0 overflow-hidden select-none">
                                                <span className="text-[10px] font-bold text-white truncate leading-tight">
                                                    {g.parts.length > 1 ? `${g.parts.length} días · ${g.client}` : g.client}
                                                </span>
                                                {uniqueMemberIds.length > 0 && (
                                                    <div className="flex gap-0.5 mt-0.5 overflow-hidden">
                                                        <span className="text-[8px] font-bold text-blue-200/60 leading-none tracking-wide truncate">
                                                            {uniqueMemberIds
                                                                .slice(0, 6)
                                                                .map((mid: string) => {
                                                                    const m = members.find((mem: any) => mem.id === mid);
                                                                    return m ? getInitials(m.name) : null;
                                                                })
                                                                .filter(Boolean)
                                                                .join(' - ')}
                                                            {uniqueMemberIds.length > 6 && ` +${uniqueMemberIds.length - 6}`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-[200] bg-[#1e293b] border border-white/10 rounded-lg shadow-2xl shadow-black/50 py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-150"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 transition-colors text-left"
                        onClick={() => {
                            setExtendModal({ group: contextMenu.group });
                            setExtendDays(1);
                            setContextMenu(null);
                        }}
                    >
                        <CalendarRange size={14} className="text-blue-400 flex-shrink-0" />
                        Cambiar cantidad de días
                    </button>
                </div>
            )}

            {/* Modal: Extender días */}
            {extendModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[300]" onClick={() => setExtendModal(null)}>
                    <div
                        className="bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl p-6 w-80 animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <CalendarRange size={18} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white">Cambiar cantidad de días</h3>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                    OP {extendModal.group.opNumber} · {extendModal.group.client}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-400 mb-4">
                            La tarea actualmente ocupa <span className="text-white font-bold">{extendModal.group.parts.length} día{extendModal.group.parts.length > 1 ? 's' : ''}</span>.
                            Usá valores <span className="text-emerald-400 font-bold">positivos</span> para agregar días
                            o <span className="text-red-400 font-bold">negativos</span> para quitar.
                        </p>

                        <div className="flex items-center gap-3 mb-6">
                            <button
                                onClick={() => setExtendDays(d => Math.max(-(extendModal.group.parts.length - 1), d - 1))}
                                className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-white font-bold text-lg transition-colors"
                            >−</button>
                            <div className="flex-1 text-center">
                                <span className={`text-2xl font-black ${extendDays < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {extendDays > 0 ? '+' : ''}{extendDays}
                                </span>
                                <span className="text-xs text-slate-500 ml-2">día{Math.abs(extendDays) !== 1 ? 's' : ''}</span>
                            </div>
                            <button
                                onClick={() => setExtendDays(d => d + 1)}
                                className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-white font-bold text-lg transition-colors"
                            >+</button>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setExtendModal(null)}
                                className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold transition-colors border border-white/10"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleExtendConfirm}
                                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-500/20"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
