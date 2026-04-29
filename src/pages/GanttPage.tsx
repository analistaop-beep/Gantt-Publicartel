import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { sileo } from 'sileo';
import { Plus, Minus, Calendar, ChevronLeft, ChevronRight, Trash2, LayoutGrid, Users, Truck, Bell, ArrowDownToLine, Copy, Search, Save, Loader2 } from 'lucide-react';
import {
    format,
    addDays,
    subDays,
    startOfWeek,
    eachDayOfInterval,
    isToday,
    isWeekend
} from 'date-fns';
import { es } from 'date-fns/locale';
import { getCompactName } from '../utils/stringUtils';
import { exportToExcel } from '../utils/reportUtils';
import { FileDown } from 'lucide-react';

export const GanttPage: React.FC = () => {
    const {
        teams, tasks, herreriaTasks, members, vehicles, reminders,
        addTask, addMember, addVehicle, updateTask, deleteTask,
        updateTaskLocal, deleteTaskLocal, addTaskLocal,
        saveAllChanges, hasPendingChanges, isSaving,
        clearTasksRange, error, clearError,
        addReminder, updateReminder, deleteReminder
    } = useStore();
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday

    // Modals state
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [quickAddType, setQuickAddType] = useState<'member' | 'vehicle' | 'reminder' | null>(null);
    const [isRemindersListOpen, setIsRemindersListOpen] = useState(false);

    // Selected context for task addition/editing
    const [selectedContext, setSelectedContext] = useState<{ teamId: string; date: Date } | null>(null);
    const [editingTask, setEditingTask] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        opNumber: '',
        name: '',
        client: '',
        address: '',
        totalHours: 1,
        duration: 1,
        vehicles: [] as string[],
        members: [] as Array<{ id: string, hours: number }>,
        additionalJobs: [] as Array<{ description: string; client: string }>,
        date: format(new Date(), 'yyyy-MM-dd'),
        teamId: null as string | null,
        section: 'Instalaciones'
    });

    const [quickMemberData, setQuickMemberData] = useState({ name: '', role: '', sector: 'Instalaciones' });
    const [quickVehicleData, setQuickVehicleData] = useState({ name: '', plate: '' });
    const [reminderFormData, setReminderFormData] = useState({
        opNumber: '',
        name: '',
        client: '',
        address: '',
        totalHours: 1
    });
    const [editingReminder, setEditingReminder] = useState<any | null>(null);

    // Drag and Drop state
    const [isDragging, setIsDragging] = useState(false);

    // Zoom state
    const [isZoomed, setIsZoomed] = useState(false);
    const [zoomOffset, setZoomOffset] = useState(0); // 0 for Mon-Wed, 3 for Thu-Sat

    // Fragmentation state
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; task: any } | null>(null);
    const [isFragmentModalOpen, setIsFragmentModalOpen] = useState(false);
    const [fragmentDays, setFragmentDays] = useState(1);
    const [fragmentTargetTask, setFragmentTargetTask] = useState<any | null>(null);


    // Pending Tasks state
    const [isPendingTasksOpen, setIsPendingTasksOpen] = useState(false);
    const [isCapacityOpen, setIsCapacityOpen] = useState(true);
    const [memberSearch, setMemberSearch] = useState('');

    // Filter pending tasks (tasks with no date)
    const pendingTasks = useMemo(() => {
        return tasks.filter(t => !t.date || t.date === '');
    }, [tasks]);

    // Vehicle availability logic
    const busyVehiclesOnDate = useMemo(() => {
        const dateStr = selectedContext
            ? format(selectedContext.date, 'yyyy-MM-dd')
            : (editingTask?.date || '');
        if (!dateStr) return new Set<string>();

        const used = new Set<string>();
        tasks.forEach(t => {
            // Check collisions on same date, excluding own group/task when editing
            if (t.date === dateStr && t.id !== editingTask?.id && t.groupId !== editingTask?.groupId) {
                (t.vehicles || []).forEach((vId: string) => used.add(vId));
            }
        });
        return used;
    }, [tasks, selectedContext, editingTask]);

    // Watch for store errors
    useEffect(() => {
        if (error) {
            setIsErrorModalOpen(true);
        }
    }, [error]);

    // Navigation logic
    const allDaysInWeek = useMemo(() => {
        const start = currentWeekStart;
        return eachDayOfInterval({ start, end: addDays(start, 5) });
    }, [currentWeekStart]);

    // Calculate members available per day
    const membersByDay = useMemo(() => {
        return allDaysInWeek.reduce((acc, day) => {
            const dayStr = format(day, 'yyyy-MM-dd');

            // Map hours assigned to each member on this specific day
            const memberHoursMap: Record<string, number> = {};

            const dayTasks = [...tasks, ...herreriaTasks].filter(t => t.date === dayStr);
            dayTasks.forEach(t => {
                (t.members || []).forEach((m: any) => {
                    const id = typeof m === 'string' ? m : m.id;
                    const hours = typeof m === 'object' ? (m.hours || 0) : 8;
                    memberHoursMap[id] = (memberHoursMap[id] || 0) + hours;
                });
            });

            // A member is available if they have less than 8 hours assigned
            acc[dayStr] = members
                .map(m => ({ ...m, assignedHours: memberHoursMap[m.id] || 0 }))
                .filter(m => m.assignedHours < 8);

            return acc;
        }, {} as Record<string, any[]>);
    }, [allDaysInWeek, tasks, herreriaTasks, members]);


    // Calculate total hours per member per day to detect overloads
    const dailyMemberHours = useMemo(() => {
        const dateMap: Record<string, Record<string, number>> = {};

        const allRelevantTasks = [...tasks, ...herreriaTasks];
        allRelevantTasks.forEach(task => {
            if (!task.date) return;
            if (!dateMap[task.date]) dateMap[task.date] = {};

            (task.members || []).forEach((m: any) => {
                const mId = typeof m === 'string' ? m : m.id;
                const hours = typeof m === 'object' ? (m.hours || 0) : 8;
                dateMap[task.date][mId] = (dateMap[task.date][mId] || 0) + hours;
            });
        });

        return dateMap;
    }, [tasks, herreriaTasks]);


    const weekLabel = `S ${format(currentWeekStart, 'dd/MM')}`;
    const isTodayInWeek = useMemo(() => {
        return allDaysInWeek.some(d => isToday(d));
    }, [allDaysInWeek]);

    const handleTaskSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            const dateToUse = selectedContext ? format(selectedContext.date, 'yyyy-MM-dd') : formData.date;
            const teamIdToUse = selectedContext ? selectedContext.teamId : formData.teamId;


            if (editingTask) {
                await updateTask({
                    ...editingTask,
                    ...formData,
                    date: dateToUse,
                    teamId: teamIdToUse,
                    section: formData.section || 'Instalaciones'
                });
                sileo.success({ title: 'Tarea actualizada con éxito' });
            } else {
                await addTask({
                    ...formData,
                    date: dateToUse,
                    teamId: teamIdToUse,
                    type: 'instalacion',
                    section: formData.section || 'Instalaciones'
                });
                sileo.success({ title: 'Tarea creada con éxito' });
            }
            setIsTaskModalOpen(false);
            setEditingTask(null);
            setSelectedContext(null);
            setFormData({
                opNumber: '',
                name: '',
                client: '',
                address: '',
                totalHours: 1,
                duration: 1,
                vehicles: [],
                members: [],
                additionalJobs: [],
                date: format(new Date(), 'yyyy-MM-dd'),
                teamId: teams[0]?.id || null,
                section: 'Instalaciones'
            });
            setMemberSearch('');
        } catch (err) {
            // Error handling in store
        }
    };


    const handleEditTask = (task: any) => {
        setEditingTask(task);
        setFormData({
            opNumber: task.opNumber || '',
            name: task.name || '',
            client: task.client || '',
            address: task.address || '',
            totalHours: task.totalHours || 0,
            duration: task.duration || 0,
            vehicles: task.vehicles || [],
            members: Array.isArray(task.members) && typeof task.members[0] === 'object'
                ? task.members
                : (task.members || []).map((mId: any) => ({ id: mId, hours: 8 })),
            additionalJobs: task.additionalJobs || [],
            date: task.date || '',
            teamId: task.teamId || null,
            section: task.section || 'Instalaciones'
        });
        setIsTaskModalOpen(true);
    };

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };
    
    const handleDrop = (e: React.DragEvent, teamId: string | null, date: Date) => {
        e.preventDefault();
        setIsDragging(false);
        const taskId = e.dataTransfer.getData('taskId');
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const newDate = format(date, 'yyyy-MM-dd');
        if (task.teamId === teamId && task.date === newDate) return;

        updateTaskLocal({
            ...task,
            teamId,
            date: newDate
        });
        sileo.success({ title: `Tarea RE-PROGRAMADA: OP ${task.opNumber}` });
    };
    
    const handleTaskDropOnTask = async (e: React.DragEvent, targetTask: any) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        const sourceTaskId = e.dataTransfer.getData('taskId');
        if (!sourceTaskId || sourceTaskId === targetTask.id) return;
        
        const sourceTask = tasks.find(t => t.id === sourceTaskId);
        if (!sourceTask) return;
        
        // Verify matching criteria for unification
        const matches = 
            sourceTask.opNumber === targetTask.opNumber &&
            sourceTask.name === targetTask.name &&
            sourceTask.client === targetTask.client &&
            sourceTask.totalHours === targetTask.totalHours;
            
        if (!matches) {
            // If it doesn't match, perform a normal reschedule to the target task's date/team
            await handleDrop(e, targetTask.teamId || null, new Date((targetTask.date || '') + 'T12:00:00'));
            return;
        }
        
        // Unify members (sum hours if same member)
        const combinedMembers = [...(targetTask.members || [])];
        (sourceTask.members || []).forEach((sm: any) => {
            const existingIdx = combinedMembers.findIndex(tm => tm.id === sm.id);
            if (existingIdx !== -1) {
                combinedMembers[existingIdx] = {
                    ...combinedMembers[existingIdx],
                    hours: (combinedMembers[existingIdx].hours || 0) + (sm.hours || 0)
                };
            } else {
                combinedMembers.push(sm);
            }
        });
        
        // Unify additional jobs
        const combinedJobs = [
            ...(targetTask.additionalJobs || []),
            ...(sourceTask.additionalJobs || [])
        ];
        
        updateTaskLocal({
            ...targetTask,
            totalHours: (targetTask.totalHours || 0) + (sourceTask.totalHours || 0),
            members: combinedMembers,
            additionalJobs: combinedJobs
        });
        
        deleteTaskLocal(sourceTaskId);
        sileo.success({ title: `Tareas UNIFICADAS: OP ${targetTask.opNumber}` });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        const isMemberDrag = Array.from(e.dataTransfer.types).some(t => t.toLowerCase() === 'memberid');
        const isTaskDrag = Array.from(e.dataTransfer.types).some(t => t.toLowerCase() === 'taskid');

        if (isMemberDrag) {
            e.dataTransfer.dropEffect = 'copy';
        } else if (isTaskDrag) {
            e.dataTransfer.dropEffect = 'move';
        }
    };

    const handleContextMenu = (e: React.MouseEvent, task: any) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            task
        });
    };

    const getNextWorkingDay = (dateStr: string) => {
        let date = new Date(dateStr + 'T12:00:00');
        do {
            date = addDays(date, 1);
        } while (isWeekend(date));
        return format(date, 'yyyy-MM-dd');
    };

    const handleDuplicateTask = async () => {
        if (!contextMenu) return;
        try {
            const task = contextMenu.task;
            const nextDay = getNextWorkingDay(task.date);
            addTaskLocal({
                ...task,
                id: undefined,
                date: nextDay
            });
            sileo.success({ title: `Tarea duplicada para el ${format(new Date(nextDay + 'T12:00:00'), 'dd/MM')}` });
        } catch (err) {
            sileo.error({ title: "Error al duplicar la tarea" });
        }
        setContextMenu(null);
    };

    const handleFragmentClick = () => {
        if (!contextMenu) return;
        setFragmentTargetTask(contextMenu.task);
        setIsFragmentModalOpen(true);
        setContextMenu(null);
    };

    const confirmFragment = async () => {
        if (!fragmentTargetTask || fragmentDays <= 0) return;

        try {
            const dividedHours = fragmentTargetTask.totalHours / fragmentDays;
            const dividedMembers = (fragmentTargetTask.members || []).map((m: any) => ({
                ...m,
                hours: parseFloat((m.hours / fragmentDays).toFixed(2))
            }));

            // Actualizar la tarea original con las horas divididas
            updateTaskLocal({
                ...fragmentTargetTask,
                totalHours: dividedHours,
                duration: dividedHours,
                members: dividedMembers
            });

            const startDate = new Date(fragmentTargetTask.date + 'T00:00:00');

            // Crear tareas adicionales para los días siguientes (fragmentDays ya incluye el día actual)
            for (let i = 1; i < fragmentDays; i++) {
                const nextDay = addDays(startDate, i);
                const nextDayStr = format(nextDay, 'yyyy-MM-dd');

                addTaskLocal({
                    ...fragmentTargetTask,
                    id: undefined, // Nueva ID para la copia
                    date: nextDayStr,
                    totalHours: dividedHours,
                    duration: dividedHours,
                    type: 'instalacion',
                    members: dividedMembers,
                    groupId: fragmentTargetTask.groupId || fragmentTargetTask.id, // Mantener vínculo de grupo
                    section: fragmentTargetTask.section || 'Instalaciones'
                });
            }

            sileo.success({ title: `Tarea fragmentada en ${fragmentDays} días` });
            setIsFragmentModalOpen(false);
            setFragmentTargetTask(null);
            setFragmentDays(1);
        } catch (err) {
            sileo.error({ title: "No se pudo fragmentar la tarea" });
        }
    };

    // Close context menu on click
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const handleQuickAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        await addMember(quickMemberData);
        setQuickAddType(null);
        setQuickMemberData({ name: '', role: '', sector: 'Instalaciones' });
    };

    const handleQuickAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        await addVehicle(quickVehicleData);
        setQuickAddType(null);
        setQuickVehicleData({ name: '', plate: '' });
    };

    const handleReminderSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingReminder) {
            await updateReminder({ ...editingReminder, ...reminderFormData });
            setEditingReminder(null);
        } else {
            await addReminder(reminderFormData);
        }
        setQuickAddType(null);
        setReminderFormData({ opNumber: '', name: '', client: '', address: '', totalHours: 1 });
    };

    const handleScheduleFromReminder = (reminder: any) => {
        setFormData({
            ...formData,
            opNumber: reminder.opNumber,
            name: reminder.name,
            client: reminder.client,
            address: reminder.address,
            totalHours: reminder.totalHours,
            duration: reminder.totalHours,
            vehicles: [],
            members: [],
            additionalJobs: [],
            date: format(new Date(), 'yyyy-MM-dd'),
            teamId: teams[0]?.id || null,
            section: 'Instalaciones'
        });
        setIsTaskModalOpen(true);
        setIsRemindersListOpen(false);
        setEditingTask(null);
        setSelectedContext(null);
        setIsTaskModalOpen(true);
    };

    const handleClearWeek = async () => {
        if (!confirm('¿Estás seguro de que deseas eliminar TODAS las tareas de esta semana? Esta acción no se puede deshacer.')) return;
        const startDate = format(allDaysInWeek[0], 'yyyy-MM-dd');
        const endDate = format(allDaysInWeek[5], 'yyyy-MM-dd');
        try {
            await clearTasksRange(startDate, endDate, 'instalacion');
        } catch (err) {
            // Error handled by store
        }
    };

    const handleGenerateReport = () => {
        const startDate = format(allDaysInWeek[0], 'dd/MM/yyyy');
        const endDate = format(allDaysInWeek[5], 'dd/MM/yyyy');
        const headers = ['Fecha', 'Integrante', 'OP', 'Cliente', 'Tarea', 'Horas Asignadas'];
        const rows: any[] = [];

        const weekDays = allDaysInWeek.map(d => format(d, 'yyyy-MM-dd'));

        // Filter members by sector Instalaciones
        const sectorMembers = members.filter(m => m.sector === 'Instalaciones');

        weekDays.forEach(dayStr => {
            const dayTasks = tasks.filter(t => t.date === dayStr && t.type === 'instalacion');

            sectorMembers.forEach(member => {
                const memberTasks = dayTasks.filter(t => t.members?.some((m: any) => (typeof m === 'string' ? m : m.id) === member.id));

                memberTasks.forEach(task => {
                    const memberHours = task.members?.find((m: any) => (typeof m === 'string' ? m : m.id) === member.id)?.hours || 0;
                    rows.push([
                        format(new Date(dayStr + 'T00:00:00'), 'dd/MM/yyyy'),
                        member.name,
                        task.opNumber,
                        task.client,
                        task.name,
                        memberHours
                    ]);
                });
            });
        });

        exportToExcel(headers, rows, `Reporte_Instalaciones_${startDate}_al_${endDate}`);
        sileo.success({ title: 'Reporte generado con éxito' });
    };

    // Scroll current day into view
    const timelineRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const today = allDaysInWeek.findIndex(d => isToday(d));
        if (today !== -1 && timelineRef.current) {
            const dayWidth = 176; // Aproximado para w-44
            timelineRef.current.scrollLeft = today * dayWidth - 100;
        }
    }, [allDaysInWeek]);

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500 border-none">
            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-center gap-6 p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-bold flex items-center gap-3">
                            <Calendar className="text-blue-500" />
                            <span className="capitalize">{weekLabel}</span>
                        </h2>
                        <p className="text-slate-400 mt-1">Gantt semanal por equipos</p>
                    </div>

                    <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        <button
                            onClick={handleClearWeek}
                            className="bg-red-600/10 hover:bg-red-600/20 text-red-400 px-4 py-2 rounded-xl border border-red-500/30 text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <Trash2 size={16} /> Limpiar Semana
                        </button>
                        <button
                            onClick={() => setIsRemindersListOpen(true)}
                            className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 px-4 py-2 rounded-xl border border-purple-500/30 text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <Bell size={16} /> Recordatorios
                        </button>
                        <button
                            onClick={handleGenerateReport}
                            className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/30 text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <FileDown size={16} /> Reporte
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    await saveAllChanges();
                                    sileo.success({ title: 'Cambios guardados con éxito' });
                                } catch (err) {
                                    sileo.error({ title: 'Error al guardar los cambios' });
                                }
                            }}
                            disabled={isSaving}
                            className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                hasPendingChanges 
                                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20 animate-pulse' 
                                    : 'bg-slate-700/50 text-slate-400 border-white/5 cursor-not-allowed opacity-50'
                            }`}
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Inner Week Navigation (Only when Zoomed) */}
                    {isZoomed && (
                        <div className="flex items-center gap-1 glass p-1.5 rounded-2xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <button
                                onClick={() => setZoomOffset(0)}
                                disabled={zoomOffset === 0}
                                className={`p-1.5 rounded-xl transition-all flex items-center justify-center ${zoomOffset === 0 ? 'opacity-30 cursor-not-allowed text-slate-500' : 'text-blue-400 hover:bg-blue-500/20'}`}
                                title="Primeros 3 días (Lun-Mié)"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={() => setZoomOffset(3)}
                                disabled={zoomOffset === 3}
                                className={`p-1.5 rounded-xl transition-all flex items-center justify-center ${zoomOffset === 3 ? 'opacity-30 cursor-not-allowed text-slate-500' : 'text-blue-400 hover:bg-blue-500/20'}`}
                                title="Siguientes 3 días (Jue-Sáb)"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 glass p-1.5 rounded-2xl">
                        <button
                            onClick={() => {
                                if (isZoomed) {
                                    setIsZoomed(false);
                                    setZoomOffset(0);
                                }
                            }}
                            disabled={!isZoomed}
                            className={`p-1.5 rounded-xl transition-all flex items-center justify-center ${!isZoomed ? 'opacity-50 cursor-not-allowed text-slate-500' : 'text-red-400 hover:bg-red-500/20'}`}
                            title="Zoom Out (-)"
                        >
                            <Minus size={20} strokeWidth={3} />
                        </button>

                        <button
                            onClick={() => {
                                if (!isZoomed) {
                                    setIsZoomed(true);
                                    setZoomOffset(0);
                                }
                            }}
                            disabled={isZoomed}
                            className={`p-1.5 rounded-xl transition-all flex items-center justify-center ${isZoomed ? 'opacity-50 cursor-not-allowed text-slate-500' : 'text-blue-400 hover:bg-blue-500/20'}`}
                            title="Zoom In (+)"
                        >
                            <Plus size={20} strokeWidth={3} />
                        </button>
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex items-center gap-4 glass p-2 rounded-2xl">
                        <button
                            onClick={() => setCurrentWeekStart(subDays(currentWeekStart, 7))}
                            className="p-2 hover:bg-white/10 rounded-xl transition-all"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                            className={`px-4 py-1.5 bg-blue-600/20 text-blue-400 font-bold rounded-xl hover:bg-blue-600/30 transition-all border border-blue-500/20 ${isTodayInWeek ? 'opacity-30 blur-[0.5px]' : ''}`}
                        >
                            Hoy
                        </button>
                        <button
                            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                            className="p-2 hover:bg-white/10 rounded-xl transition-all"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Gantt Timeline */}
            <div className="flex-1 min-h-0 bg-[#0f172a] flex flex-col overflow-hidden border border-white/5 mx-10 mb-2 rounded-[2rem] relative shadow-2xl">
                <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar flex flex-col" ref={timelineRef}>
                    <div className="w-full flex-1 flex flex-col">
                        {/* Timeline Days Header */}
                        <div className="sticky top-0 z-40 bg-[#1e293b] border-b border-white/10 w-full">
                            <div
                                className="grid grid-cols-6 transition-all duration-700 ease-in-out"
                                style={{
                                    width: isZoomed ? '200%' : '100%',
                                    transform: isZoomed ? `translateX(-${(zoomOffset / 6) * 100}%)` : 'translateX(0)'
                                }}
                            >
                                {allDaysInWeek.map((day) => (
                                    <div
                                        key={day.toString()}
                                        className={`p-3 text-center border-r border-white/5 flex flex-col items-center gap-1 transition-all duration-700 ${isWeekend(day) ? 'bg-white/5' : ''
                                            } ${isToday(day) ? 'bg-blue-500/[0.05]' : ''}`}
                                    >
                                        <span className={`uppercase font-bold text-slate-400 transition-all ${isZoomed ? 'text-xs' : 'text-[10px]'}`}>
                                            {format(day, 'EEE', { locale: es })}
                                        </span>
                                        <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold ${isToday(day) ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-200'
                                            }`}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Timeline Body */}
                        <div 
                            className="grid grid-cols-6 flex-1 transition-all duration-700 ease-in-out"
                            style={{
                                width: isZoomed ? '200%' : '100%',
                                transform: isZoomed ? `translateX(-${(zoomOffset / 6) * 100}%)` : 'translateX(0)'
                            }}
                        >
                            {allDaysInWeek.map((day) => {
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const dayTasks = tasks.filter(t => t.date === dayStr && t.date !== '');

                                return (
                                    <div
                                        key={day.toString()}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, null, day)}
                                        className={`p-4 border-r border-white/5 min-h-[500px] flex flex-col gap-3 transition-colors ${isWeekend(day) ? 'bg-white/[0.02]' : ''} ${isToday(day) ? 'bg-blue-500/[0.03]' : ''} ${isDragging ? 'bg-blue-500/[0.03]' : ''}`}
                                    >
                                        {/* Task List */}
                                        <div className="space-y-3 flex-1">
                                            {dayTasks.map(task => {
                                                            const taskVehicles = (task.vehicles || []).map((vId: string) => vehicles.find(v => v.id === vId)).filter(Boolean);
                                                            const totalAssignedHours = task.members?.reduce((acc: number, m: any) => acc + (m.hours || 0), 0) || 0;

                                                            return (
                                                                <div
                                                                    key={task.id}
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                                                    onDragEnd={handleDragEnd}
                                                                    onDragOver={(e) => {
                                                                        const isMemberDrag = Array.from(e.dataTransfer.types).some(t => t.toLowerCase() === 'memberid');
                                                                        const isTaskDrag = Array.from(e.dataTransfer.types).some(t => t.toLowerCase() === 'taskid');
                                                                        if (isMemberDrag) {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            e.dataTransfer.dropEffect = 'copy';
                                                                        } else if (isTaskDrag) {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            e.dataTransfer.dropEffect = 'move';
                                                                        }
                                                                    }}
                                                                    onDrop={async (e) => {
                                                                        const memberId = e.dataTransfer.getData('memberId') || e.dataTransfer.getData('memberid');
                                                                        const sourceTaskId = e.dataTransfer.getData('sourceTaskId') || e.dataTransfer.getData('sourcetaskid');
                                                                        const draggedTaskId = e.dataTransfer.getData('taskId') || e.dataTransfer.getData('taskid');

                                                                        if (memberId) {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setIsDragging(false);

                                                                            if (sourceTaskId === task.id) return;

                                                                            const currentMembers = task.members || [];
                                                                            const isAssigned = currentMembers.some((m: any) => (typeof m === 'string' ? m : m.id) === memberId);
                                                                            if (isAssigned) {
                                                                                sileo.error({ title: "Ese usuario ya está asignado a esta tarea" });
                                                                                return;
                                                                            }

                                                                            // If it comes from another task, remove it from there first
                                                                            if (sourceTaskId) {
                                                                                const sourceTask = tasks.find(t => t.id === sourceTaskId);
                                                                                if (sourceTask) {
                                                                                    updateTaskLocal({
                                                                                        ...sourceTask,
                                                                                        members: sourceTask.members.filter((m: any) => (typeof m === 'string' ? m : m.id) !== memberId)
                                                                                    });
                                                                                }
                                                                            }

                                                                            const newMembers = [...currentMembers, { id: memberId, hours: 8 }];
                                                                            updateTaskLocal({
                                                                                ...task,
                                                                                members: newMembers,
                                                                                totalHours: task.totalHours || 8
                                                                            });
                                                                            sileo.success({ title: `Integrante re-asignado a OP: ${task.opNumber}` });
                                                                        } else if (draggedTaskId) {
                                                                            handleTaskDropOnTask(e, task);
                                                                        }
                                                                    }}
                                                                    onContextMenu={(e) => handleContextMenu(e, task)}
                                                                    onClick={() => handleEditTask(task)}
                                                                    className="bg-slate-800/40 hover:bg-slate-800/60 border border-white/10 rounded-xl p-3 text-[10px] relative group/task cursor-move transition-all hover:scale-[1.02] hover:z-30 shadow-lg overflow-hidden"
                                                                >
                                                                    {/* Hero Hours Background Watermark */}
                                                                    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none transition-all duration-700 opacity-20 ${
                                                                        totalAssignedHours >= task.totalHours 
                                                                            ? 'text-emerald-500' 
                                                                            : totalAssignedHours > 0 
                                                                                ? 'text-amber-500' 
                                                                                : 'text-red-500'
                                                                    }`}>
                                                                        <span className={`font-black whitespace-nowrap transition-all duration-700 ${isZoomed ? 'text-6xl' : 'text-4xl'}`}>
                                                                            {totalAssignedHours.toFixed(0)}/{task.totalHours.toFixed(0)}
                                                                        </span>
                                                                    </div>

                                                                    <div className="relative z-10">
                                                                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                                                                        <div className="font-black text-blue-400 text-xs tracking-tight">OP: {task.opNumber}</div>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {taskVehicles.map((v: any, i: number) => (
                                                                                <span key={i} className="px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30 uppercase text-[8px]">
                                                                                    {v.name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div className={`font-bold text-white mt-1 truncate transition-all ${isZoomed ? 'text-sm' : 'text-xs'}`}>{task.client}</div>
                                                                    <div className={`text-slate-500 truncate mt-0.5 mb-2 transition-all ${isZoomed ? 'text-[10px]' : 'text-[9px]'}`}>{task.name}</div>

                                                                    {/* Task Progress Bar */}
                                                                    <div className="space-y-1 mb-2">
                                                                        <div className={`flex justify-between items-center px-0.5 transition-all ${isZoomed ? 'text-[10px]' : 'text-[8px]'}`}>
                                                                            <span className="text-slate-500 font-bold uppercase tracking-wider">Asignación</span>
                                                                            <span className="text-blue-400 font-mono font-bold">
                                                                                {totalAssignedHours.toFixed(1)} / {task.totalHours.toFixed(1)}h
                                                                            </span>
                                                                        </div>
                                                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full transition-all duration-500 ${totalAssignedHours >= task.totalHours ? 'bg-emerald-500' : 'bg-blue-500'
                                                                                    }`}
                                                                                style={{ width: `${Math.min((totalAssignedHours / (task.totalHours || 1)) * 100, 100)}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {task.members && task.members.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/5">
                                                                            {task.members.map((m: any, i: number) => {
                                                                                const memberInfo = members.find((mem: any) => mem.id === m.id);
                                                                                if (!memberInfo) return null;
                                                                                const isMemberOverloaded = (dailyMemberHours[task.date]?.[m.id] || 0) > 8.01;
                                                                                return (
                                                                                    <span
                                                                                        key={i}
                                                                                        draggable
                                                                                        onDragStart={(e) => {
                                                                                            e.stopPropagation();
                                                                                            e.dataTransfer.setData('memberId', m.id);
                                                                                            e.dataTransfer.setData('sourceTaskId', task.id);
                                                                                            e.dataTransfer.effectAllowed = 'move';
                                                                                        }}
                                                                                        className={`font-bold rounded-md cursor-grab active:cursor-grabbing transition-all ${isZoomed ? 'text-sm px-2.5 py-1 shadow-sm' : 'text-[9px] px-1.5 py-0.5'} ${isMemberOverloaded
                                                                                            ? 'bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.4)] hover:bg-red-400'
                                                                                            : 'text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white'
                                                                                            }`}
                                                                                        title={`${memberInfo.name} (${m.hours}h)${isMemberOverloaded ? ' - SOBRECARGA' : ''}`}
                                                                                    >
                                                                                        {getCompactName(memberInfo.name, isZoomed, memberInfo.code)}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}

                                                                    {task.additionalJobs && task.additionalJobs.length > 0 && (
                                                                        <div className="mt-2 space-y-1 pt-2 border-t border-white/5">
                                                                            {task.additionalJobs.map((job: any, i: number) => (
                                                                                <div key={i} className={`flex items-center gap-1 text-slate-300 truncate transition-all ${isZoomed ? 'text-xs' : 'text-[9px]'}`}>
                                                                                    <Plus size={8} className="text-blue-500/70" />
                                                                                    <span className="font-bold">{job.description || 'S/D'}</span>
                                                                                    {job.client && <span className="opacity-60 font-normal">· {job.client}</span>}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const existingPending = pendingTasks.find(pt => 
                                                                                pt.opNumber === task.opNumber && 
                                                                                pt.client === task.client && 
                                                                                pt.name === task.name && 
                                                                                pt.address === task.address &&
                                                                                pt.id !== task.id
                                                                            );

                                                                            if (existingPending) {
                                                                                updateTaskLocal({
                                                                                    ...existingPending,
                                                                                    totalHours: (existingPending.totalHours || 0) + (task.totalHours || 0),
                                                                                    duration: (existingPending.duration || 0) + (task.duration || 0)
                                                                                });
                                                                                deleteTaskLocal(task.id);
                                                                                sileo.success({ title: "Tarea agrupada en pendientes" });
                                                                            } else {
                                                                                updateTaskLocal({
                                                                                    ...task,
                                                                                    date: '',
                                                                                    teamId: null,
                                                                                    members: [],
                                                                                    vehicles: []
                                                                                });
                                                                                sileo.success({ title: "Tarea movida a pendientes" });
                                                                            }
                                                                        }}
                                                                        title="Mover a pendientes"
                                                                        className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/task:opacity-100 transition-opacity shadow-xl z-20 border-2 border-[#0f172a]"
                                                                    >
                                                                        <ArrowDownToLine size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                        })}

                                            <button
                                                onClick={() => {
                                                    setSelectedContext({ teamId: null as any, date: day });
                                                    setIsTaskModalOpen(true);
                                                }}
                                                className="w-full h-10 rounded-xl border-2 border-dashed border-white/10 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all flex items-center justify-center text-slate-500 hover:text-blue-400 mt-2 font-bold text-xs group"
                                            >
                                                <Plus size={16} className="mr-2 group-hover:rotate-90 transition-transform" />
                                                Añadir Tarea
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                            {/* Available Members Footer Row */}
                            <div className="sticky bottom-0 z-[30] mt-auto w-full">
                                {/* Toggle Tab */}
                                <div 
                                    className="absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-1 bg-[#0f172a] border border-white/10 border-b-0 rounded-t-xl cursor-pointer flex items-center gap-2 group hover:bg-[#1e293b] transition-all z-40"
                                    onClick={() => setIsCapacityOpen(!isCapacityOpen)}
                                >
                                    <Users size={12} className="text-emerald-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capacidad</span>
                                    <ChevronRight size={14} className={`text-slate-500 transition-transform duration-300 ${isCapacityOpen ? 'rotate-90' : '-rotate-90'}`} />
                                </div>

                                <div
                                    className={`border-t border-white/10 bg-[#0f172a] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-all duration-500 ease-in-out ${isCapacityOpen ? 'min-h-[140px]' : 'h-10'}`}
                                    style={{
                                        width: isZoomed ? '200%' : '100%',
                                        transform: isZoomed ? `translateX(-${(zoomOffset / 6) * 100}%)` : 'translateX(0)'
                                    }}
                                >
                                    <div className={`transition-all duration-500 ${isCapacityOpen ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
                                    <div className="grid grid-cols-6 w-full">
                                    {allDaysInWeek.map((day) => {
                                        const dayStr = format(day, 'yyyy-MM-dd');
                                        const availableOnDay = (membersByDay[dayStr] || []).filter(m => m.sector === 'Instalaciones');

                                        return (
                                            <div
                                                key={day.toString()}
                                                className={`p-3 border-r border-white/5 min-h-[140px] flex flex-col gap-2 transition-all duration-700 ${isWeekend(day) ? 'bg-white/[0.03]' : ''} ${isToday(day) ? 'bg-blue-500/[0.05]' : ''} ${isDragging ? 'bg-emerald-500/5' : ''}`}
                                                onDragOver={(e) => {
                                                    const isMemberDrag = Array.from(e.dataTransfer.types).some(t => t.toLowerCase() === 'memberid');
                                                    if (isMemberDrag) {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                    }
                                                }}
                                                onDrop={async (e) => {
                                                    const memberId = e.dataTransfer.getData('memberId') || e.dataTransfer.getData('memberid');
                                                    const sourceTaskId = e.dataTransfer.getData('sourceTaskId') || e.dataTransfer.getData('sourcetaskid');

                                                    if (memberId && sourceTaskId) {
                                                        e.preventDefault();
                                                        const sourceTask = tasks.find(t => t.id === sourceTaskId);
                                                        if (sourceTask) {
                                                            updateTaskLocal({
                                                                ...sourceTask,
                                                                members: sourceTask.members.filter((m: any) => (typeof m === 'string' ? m : m.id) !== memberId)
                                                            });
                                                            sileo.success({ title: "Integrante desasignado" });
                                                        }
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center justify-between px-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70">Capacidad</span>
                                                    <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded text-[8px] font-black border border-emerald-500/20">
                                                        {availableOnDay.length} Libres
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-1.5 content-start">
                                                    {availableOnDay.length === 0 ? (
                                                        <div className="w-full text-center py-4 border border-dashed border-white/5 rounded-xl">
                                                            <p className="text-[9px] text-slate-600 font-bold uppercase italic">Sin disponibilidad</p>
                                                        </div>
                                                    ) : (
                                                        availableOnDay.map(member => {
                                                            const isPartial = member.assignedHours > 0;
                                                            return (
                                                                <div
                                                                    key={member.id}
                                                                    draggable
                                                                    onDragStart={(e) => {
                                                                        e.dataTransfer.setData('memberId', member.id);
                                                                        e.dataTransfer.effectAllowed = 'copy';
                                                                    }}
                                                                    className={`rounded-lg bg-white/5 border border-white/10 ${isPartial
                                                                        ? 'hover:border-yellow-500/30 hover:bg-yellow-500/5 hover:text-yellow-400'
                                                                        : 'hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400'
                                                                        } transition-all ${isZoomed ? 'text-sm px-2.5 py-1' : 'text-[9px] px-1.5 py-0.5'} font-semibold text-slate-400 cursor-grab active:cursor-grabbing group flex items-center gap-1.5`}
                                                                    title={member.name + (isPartial ? ` (${member.assignedHours}h asignadas)` : ' (Libre)')}
                                                                >
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${isPartial ? 'bg-yellow-500/50 group-hover:bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.3)]' : 'bg-emerald-500/50 group-hover:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'} transition-colors`}></div>
                                                                    {getCompactName(member.name, isZoomed, member.code)}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {
                isTaskModalOpen && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                        <div className="glass p-6 rounded-[2.5rem] w-full max-w-[1000px] max-h-[95vh] flex flex-col shadow-2xl border-white/20 animate-in fade-in zoom-in-95 duration-300">
                            <div className="mb-4 flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-bold">{editingTask ? 'Editar Tarea' : 'Asignar Tarea'}</h3>
                                    <p className="text-slate-400 text-sm mt-1">
                                        {editingTask
                                            ? `Editando tarea existente`
                                            : (selectedContext
                                                ? `Asignando a ${teams.find(t => t.id === selectedContext.teamId)?.name} el ${format(selectedContext.date, 'dd/MM/yyyy')}`
                                                : `Configura los detalles de la asignación`)
                                        }
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsTaskModalOpen(false);
                                        setSelectedContext(null);
                                        setEditingTask(null);
                                        setMemberSearch('');
                                    }}
                                    className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-all"
                                >
                                    <Plus className="rotate-45" size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleTaskSubmit} className="flex flex-col gap-4 overflow-hidden">
                                <div className="flex-1 pr-2 overflow-y-auto custom-scrollbar pb-1 space-y-4">
                                    {/* Top Section: Conditional Columns */}
                                    <div className={`grid grid-cols-1 ${formData.date !== '' ? 'lg:grid-cols-2' : ''} gap-4`}>
                                        <div className="space-y-4">
                                            {/* Column 1: Core Data */}
                                            <div className="p-4 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-1">Datos de Obra</h4>

                                                {formData.date !== '' && !selectedContext && !editingTask && (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Fecha</label>
                                                            <input
                                                                type="date"
                                                                className="input-sm w-full"
                                                                value={formData.date}
                                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Equipo</label>
                                                            <select
                                                                className="input-sm w-full"
                                                                value={formData.teamId || ''}
                                                                onChange={(e) => setFormData({ ...formData, teamId: e.target.value || null })}
                                                                required
                                                            >
                                                                <option value="" disabled>Equipo...</option>
                                                                {teams.map(t => (
                                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-1">
                                                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Sección</label>
                                                    <select
                                                        className="input-sm w-full"
                                                        value={formData.section}
                                                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                                        required
                                                    >
                                                        <option value="Instalaciones">Instalaciones</option>
                                                        <option value="Herrería">Herrería</option>
                                                        <option value="Vinilos">Vinilos</option>
                                                        <option value="Pintura">Pintura</option>
                                                        <option value="Impresión">Impresión</option>
                                                        <option value="Lonas">Lonas</option>
                                                        <option value="Carpintería">Carpintería</option>
                                                        <option value="Corpóreas">Corpóreas</option>
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="col-span-1 space-y-1">
                                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">OP</label>
                                                        <input
                                                            className="input-sm w-full font-bold text-blue-400"
                                                            placeholder="0000"
                                                            value={formData.opNumber}
                                                            onChange={(e) => setFormData({ ...formData, opNumber: e.target.value })}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="col-span-2 space-y-1">
                                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Descripción</label>
                                                        <input
                                                            className="input-sm w-full"
                                                            placeholder="Instalación..."
                                                            value={formData.name}
                                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Cliente</label>
                                                        <input
                                                            className="input-sm w-full"
                                                            placeholder="Nombre del cliente"
                                                            value={formData.client}
                                                            onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                                                            required
                                                        />
                                                    </div>
                                                    {formData.date !== '' && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Ubicación</label>
                                                            <input
                                                                className="input-sm w-full"
                                                                placeholder="Calle, Ciudad..."
                                                                value={formData.address}
                                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                                required
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Hours Selection (Moved here) */}
                                            <div className="p-4 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 mb-1">Carga de Horas</h4>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Horas Previstas</label>
                                                        <input
                                                            type="number" step="0.1" className="input w-full font-mono font-bold text-blue-400 text-xl"
                                                            value={formData.totalHours}
                                                            onChange={(e) => {
                                                                const total = parseFloat(e.target.value) || 0;
                                                                setFormData({ ...formData, totalHours: total });
                                                            }}
                                                            required
                                                        />
                                                    </div>
                                                    {formData.date !== '' && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Horas Reloj</label>
                                                            <input
                                                                type="number" step="0.1" className="input w-full font-mono font-bold text-slate-400 text-xl"
                                                                value={formData.duration}
                                                                onChange={(e) => {
                                                                    const clock = parseFloat(e.target.value) || 0;
                                                                    setFormData({ ...formData, duration: clock });
                                                                }}
                                                                required
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Assignments */}
                                        {formData.date !== '' && (
                                            <div className="p-4 bg-white/5 rounded-[2rem] border border-white/5 space-y-4 flex flex-col h-full">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-orange-400 mb-1">Asignaciones</h4>

                                                <div className="space-y-2 flex-1">
                                                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Vehículos</label>
                                                    <div className="glass rounded-xl p-3 h-28 overflow-y-auto custom-scrollbar space-y-1">
                                                        {vehicles.map(v => {
                                                            const isBusy = busyVehiclesOnDate.has(v.id);
                                                            return (
                                                                <label key={v.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isBusy ? 'opacity-40 cursor-not-allowed bg-red-500/5' : 'hover:bg-white/10 cursor-pointer'}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500"
                                                                        checked={formData.vehicles.includes(v.id)}
                                                                        disabled={isBusy}
                                                                        onChange={(e) => {
                                                                            const newVehicles = e.target.checked
                                                                                ? [...formData.vehicles, v.id]
                                                                                : formData.vehicles.filter(id => id !== v.id);
                                                                            setFormData({ ...formData, vehicles: newVehicles });
                                                                        }}
                                                                    />
                                                                    <span className="text-xs text-slate-300 font-medium truncate">{v.name}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="space-y-2 flex-1 pt-1">
                                                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Personal</label>
                                                    
                                                    <div className="relative mb-2">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                                                        <input 
                                                            type="text"
                                                            placeholder="Buscar empleado..."
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-[10px] focus:border-blue-500/50 outline-none transition-colors"
                                                            value={memberSearch}
                                                            onChange={(e) => setMemberSearch(e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="glass rounded-xl p-3 h-32 overflow-y-auto custom-scrollbar space-y-1">
                                                        {members
                                                            .filter(m => m.sector === formData.section && m.name.toLowerCase().includes(memberSearch.toLowerCase()))
                                                            .filter(m => {
                                                                const isAlreadyInTask = formData.members.some(am => am.id === m.id);
                                                                const originalTaskMember = editingTask?.members?.find((am: any) => am.id === m.id);
                                                                const originalHoursInThisTask = originalTaskMember ? (originalTaskMember.hours || 8) : 0;
                                                                const otherHours = (dailyMemberHours[formData.date]?.[m.id] || 0) - originalHoursInThisTask;
                                                                
                                                                return isAlreadyInTask || otherHours < 8;
                                                            })
                                                            .sort((a, b) => {
                                                                const aChecked = formData.members.some(am => am.id === a.id);
                                                                const bChecked = formData.members.some(am => am.id === b.id);
                                                                if (aChecked && !bChecked) return -1;
                                                                if (!aChecked && bChecked) return 1;
                                                                return a.name.localeCompare(b.name);
                                                            })
                                                            .map(m => {
                                                            const assignedMember = formData.members.find(am => am.id === m.id);
                                                            const isChecked = !!assignedMember;
                                                            return (
                                                                <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors group/member">
                                                                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500"
                                                                            checked={isChecked}
                                                                            onChange={(e) => {
                                                                                const newMembers = e.target.checked
                                                                                    ? [...formData.members, { id: m.id, hours: 8 }]
                                                                                    : formData.members.filter(am => am.id !== m.id);
                                                                                setFormData({
                                                                                    ...formData,
                                                                                    members: newMembers
                                                                                });
                                                                            }}
                                                                        />
                                                                        <span className="text-xs text-slate-300 font-medium truncate">{m.name}</span>
                                                                    </label>
                                                                    {isChecked && (
                                                                        <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-200">
                                                                            <input
                                                                                type="number"
                                                                                step="0.5"
                                                                                min="0"
                                                                                className="w-12 h-6 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] text-center font-bold text-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                                                value={assignedMember.hours}
                                                                                onChange={(e) => {
                                                                                    const hours = parseFloat(e.target.value) || 0;
                                                                                    const newMembers = formData.members.map(am =>
                                                                                        am.id === m.id ? { ...am, hours } : am
                                                                                    );
                                                                                    setFormData({ ...formData, members: newMembers });
                                                                                }}
                                                                            />
                                                                            <span className="text-[8px] font-bold text-slate-500 uppercase">h</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom Section: Full Width Sub-tasks */}
                                    {formData.date !== '' && (
                                        <div className="p-4 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                                                        <Plus size={16} className="text-emerald-400" />
                                                    </div>
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">Trabajos Adicionales / Sub-tareas</h4>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, additionalJobs: [...formData.additionalJobs, { description: '', client: '' }] })}
                                                    className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-xl hover:bg-emerald-600/30 transition-all border border-emerald-500/30 font-bold text-xs flex items-center gap-2"
                                                >
                                                    <Plus size={14} /> Añadir Sub-tarea
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                                {formData.additionalJobs.map((job, index) => (
                                                    <div key={index} className="glass p-3 rounded-2xl relative border-white/5 animate-in zoom-in-95 duration-200">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newJobs = [...formData.additionalJobs];
                                                                newJobs.splice(index, 1);
                                                                setFormData({ ...formData, additionalJobs: newJobs });
                                                            }}
                                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <div className="space-y-3">
                                                            <input
                                                                className="input-sm w-full bg-white/5 border-white/5"
                                                                placeholder="Descripción del trabajo..."
                                                                value={job.description}
                                                                onChange={(e) => {
                                                                    const newJobs = [...formData.additionalJobs];
                                                                    newJobs[index].description = e.target.value;
                                                                    setFormData({ ...formData, additionalJobs: newJobs });
                                                                }}
                                                            />
                                                            <input
                                                                className="input-sm w-full bg-white/5 border-white/5"
                                                                placeholder="Cliente de la sub-tarea..."
                                                                value={job.client}
                                                                onChange={(e) => {
                                                                    const newJobs = [...formData.additionalJobs];
                                                                    newJobs[index].client = e.target.value;
                                                                    setFormData({ ...formData, additionalJobs: newJobs });
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                                {formData.additionalJobs.length === 0 && (
                                                    <div className="col-span-full py-4 text-center text-slate-500 italic text-sm">
                                                        No hay trabajos adicionales agregados a esta tarea.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsTaskModalOpen(false);
                                            setSelectedContext(null);
                                            setEditingTask(null);
                                        }}
                                        className="btn btn-secondary flex-1 rounded-2xl"
                                    >
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary flex-[2] rounded-2xl shadow-blue-500/30 text-lg py-2">
                                        {editingTask ? 'Guardar Cambios' : 'Asignar Tarea'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                quickAddType === 'member' && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                        <div className="glass p-8 rounded-[2.5rem] w-full max-w-sm space-y-6 shadow-2xl border-white/20">
                            <h3 className="text-2xl font-bold flex items-center gap-2">
                                <Users size={24} className="text-blue-500" /> Nuevo Integrante
                            </h3>
                            <form onSubmit={handleQuickAddMember} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400 ml-1">Nombre</label>
                                    <input
                                        className="input w-full"
                                        value={quickMemberData.name}
                                        onChange={(e) => setQuickMemberData({ ...quickMemberData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400 ml-1">Sector</label>
                                    <select
                                        className="input w-full"
                                        value={quickMemberData.sector}
                                        onChange={(e) => setQuickMemberData({ ...quickMemberData, sector: e.target.value })}
                                        required
                                    >
                                        <option value="Instalaciones">Instalaciones</option>
                                        <option value="Herrería">Herrería</option>
                                        <option value="Vinilos">Vinilos</option>
                                        <option value="Pintura">Pintura</option>
                                        <option value="Lonas">Lonas</option>
                                        <option value="Impresión">Impresión</option>
                                        <option value="Carpintería">Carpintería</option>
                                        <option value="Corpóreas">Corpóreas</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400 ml-1">Rol</label>
                                    <input
                                        className="input w-full"
                                        value={quickMemberData.role}
                                        onChange={(e) => setQuickMemberData({ ...quickMemberData, role: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setQuickAddType(null)} className="btn btn-secondary flex-1">Cancelar</button>
                                    <button type="submit" className="btn btn-primary flex-1">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                quickAddType === 'vehicle' && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                        <div className="glass p-8 rounded-[2.5rem] w-full max-w-sm space-y-6 shadow-2xl border-white/20">
                            <h3 className="text-2xl font-bold flex items-center gap-2">
                                <Truck size={24} className="text-orange-500" /> Nuevo Vehículo
                            </h3>
                            <form onSubmit={handleQuickAddVehicle} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400 ml-1">Modelo / Nombre</label>
                                    <input
                                        className="input w-full"
                                        value={quickVehicleData.name}
                                        onChange={(e) => setQuickVehicleData({ ...quickVehicleData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400 ml-1">Patente</label>
                                    <input
                                        className="input w-full"
                                        value={quickVehicleData.plate}
                                        onChange={(e) => setQuickVehicleData({ ...quickVehicleData, plate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setQuickAddType(null)} className="btn btn-secondary flex-1">Cancelar</button>
                                    <button type="submit" className="btn btn-primary flex-1">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {
                isErrorModalOpen && error && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-300">
                        <div className="glass p-10 rounded-[3rem] w-full max-w-md space-y-8 shadow-2xl border-white/20 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]"></div>

                            <div className="mx-auto w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                                <Plus size={48} className="text-red-500 rotate-45" />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-3xl font-black tracking-tight text-white uppercase italic">
                                    Límite de horas <span className="text-red-500">Excedido</span>
                                </h3>
                                <p className="text-slate-300 text-lg leading-relaxed px-4">
                                    {error}
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    setIsErrorModalOpen(false);
                                    clearError();
                                }}
                                className="w-full btn bg-red-500 hover:bg-red-600 text-white rounded-[1.5rem] py-5 text-xl font-bold shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                )
            }


            {/* Bottom Drawer: Tareas Pendientes */}
            <div
                className={`relative mx-10 mb-6 z-[60] glass rounded-[2.5rem] border border-white/20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-all duration-500 ease-in-out ${isPendingTasksOpen ? 'h-[20vh] max-h-[20vh]' : 'h-16'
                    }`}
                onDragOver={(e) => {
                    const isTaskDrag = Array.from(e.dataTransfer.types).some(t => t.toLowerCase() === 'taskid');
                    if (isTaskDrag) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                    }
                }}
                onDrop={(e) => {
                    const draggedTaskId = e.dataTransfer.getData('taskId') || e.dataTransfer.getData('taskid');
                    if (draggedTaskId) {
                        e.preventDefault();
                        const task = tasks.find(t => t.id === draggedTaskId);
                        if (task && task.date !== '') {
                            const existingPending = pendingTasks.find(pt => 
                                pt.opNumber === task.opNumber && 
                                pt.client === task.client && 
                                pt.name === task.name && 
                                pt.address === task.address &&
                                pt.id !== task.id
                            );

                            if (existingPending) {
                                updateTaskLocal({
                                    ...existingPending,
                                    totalHours: (existingPending.totalHours || 0) + (task.totalHours || 0),
                                    duration: (existingPending.duration || 0) + (task.duration || 0)
                                });
                                deleteTaskLocal(task.id);
                                sileo.success({ title: "Tarea agrupada en pendientes" });
                            } else {
                                updateTaskLocal({
                                    ...task,
                                    date: '',
                                    teamId: null,
                                    members: [],
                                    vehicles: []
                                });
                                sileo.success({ title: "Tarea movida a pendientes" });
                            }
                        }
                    }
                }}
            >
                {/* Header / Toggle Button */}
                <div
                    className="flex justify-between items-center px-10 h-16 cursor-pointer group"
                    onClick={() => setIsPendingTasksOpen(!isPendingTasksOpen)}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-all">
                            <LayoutGrid size={20} className="text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            Tareas Pendientes
                            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                                {pendingTasks.length}
                            </span>
                        </h3>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingTask(null);
                                setSelectedContext(null);
                                setFormData({
                                    opNumber: '',
                                    name: '',
                                    client: '',
                                    address: '',
                                    totalHours: 1,
                                    duration: 8,
                                    vehicles: [],
                                    members: [],
                                    additionalJobs: [],
                                    date: '',
                                    teamId: teams[0]?.id || null,
                                    section: 'Instalaciones'
                                });
                                setIsTaskModalOpen(true);
                            }}
                            className="bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/30 text-sm font-bold hover:bg-blue-600/30 transition-all flex items-center gap-2"
                        >
                            <Plus size={16} /> Nuevo Pendiente
                        </button>
                        <div className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400">
                            {isPendingTasksOpen ? <Plus className="rotate-45" size={24} /> : <Plus className="rotate-180" size={24} />}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className={`px-10 pb-10 overflow-hidden transition-opacity duration-300 ${isPendingTasksOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[calc(20vh-80px)] overflow-y-auto custom-scrollbar pr-2 pt-2">
                        {pendingTasks.length === 0 ? (
                            <div className="col-span-full py-10 text-center text-slate-500 italic">
                                No hay tareas pendientes para instalaciones.
                            </div>
                        ) : (
                            pendingTasks.map(task => {
                                const taskVehicles = (task.vehicles || []).map((vId: string) => vehicles.find(v => v.id === vId)).filter(Boolean);
                                
                                return (
                                <div
                                    key={task.id}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => handleEditTask(task)}
                                    className="bg-slate-800/40 hover:bg-slate-800/60 border border-white/10 rounded-2xl p-4 transition-all hover:scale-[1.02] cursor-pointer group/item relative shadow-lg"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">OP: {task.opNumber}</span>
                                        <span className="text-[10px] font-bold text-slate-500">{(task.totalHours || 0).toFixed(1)}h</span>
                                    </div>
                                    <h4 className="text-white font-bold text-sm truncate">{task.client}</h4>
                                    <p className="text-slate-400 text-xs truncate mt-1">{task.name}</p>

                                    {taskVehicles.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {taskVehicles.map((v: any, i: number) => (
                                                <span key={i} className="px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30 uppercase text-[8px]">
                                                    {v.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente esta tarea pendiente?')) {
                                                deleteTask(task.id);
                                            }
                                        }}
                                        title="Eliminar permanentemente"
                                        className="absolute top-2 right-2 w-6 h-6 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>



            {/* Reminders List Modal */}
            {
                isRemindersListOpen && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                        <div className="glass p-8 rounded-[2.5rem] w-full max-w-2xl space-y-6 shadow-2xl border-white/20">
                            <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-bold flex items-center gap-2">
                                    <Bell size={24} className="text-purple-500" /> Recordatorios / Plantillas
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingReminder(null);
                                            setReminderFormData({ opNumber: '', name: '', client: '', address: '', totalHours: 1 });
                                            setQuickAddType('reminder');
                                        }}
                                        className="bg-purple-600/20 text-purple-400 px-4 py-2 rounded-xl border border-purple-500/30 text-sm font-medium hover:bg-purple-600/30 transition-all flex items-center gap-2"
                                    >
                                        <Plus size={16} /> Nuevo
                                    </button>
                                    <button onClick={() => setIsRemindersListOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                        <ChevronRight size={20} className="rotate-45" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1 custom-scrollbar">
                                {reminders.length === 0 && (
                                    <div className="col-span-full p-10 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
                                        No hay recordatorios guardados. Crea uno para empezar.
                                    </div>
                                )}
                                {reminders.map((r: any) => (
                                    <div key={r.id} className="glass p-5 rounded-2xl border-white/5 hover:border-purple-500/30 group transition-all relative">
                                        <div className="font-black text-purple-400 text-xs mb-1">OP: {r.opNumber}</div>
                                        <div className="font-bold text-white text-sm truncate">{r.client}</div>
                                        <div className="text-slate-400 text-xs truncate mb-3">{r.name}</div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-xs font-mono text-slate-500">{r.totalHours}h totales</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingReminder(r);
                                                        setReminderFormData({
                                                            opNumber: r.opNumber,
                                                            name: r.name,
                                                            client: r.client,
                                                            address: r.address,
                                                            totalHours: r.totalHours
                                                        });
                                                        setQuickAddType('reminder');
                                                    }}
                                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                                                >
                                                    <LayoutGrid size={14} />
                                                </button>
                                                <button
                                                    onClick={() => deleteReminder(r.id)}
                                                    className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleScheduleFromReminder(r)}
                                                    className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold transition-all shadow-lg shadow-purple-500/20"
                                                >
                                                    AGENDAR
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add/Edit Reminder Modal */}
            {
                quickAddType === 'reminder' && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[80] p-4">
                        <div className="glass p-8 rounded-[2.5rem] w-full max-w-md space-y-6 shadow-2xl border-white/20">
                            <h3 className="text-2xl font-bold flex items-center gap-2">
                                <Bell size={24} className="text-purple-500" /> {editingReminder ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
                            </h3>
                            <form onSubmit={handleReminderSubmit} className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-1 space-y-2">
                                        <label className="text-sm font-medium text-slate-400 ml-1">N° OP</label>
                                        <input
                                            className="input w-full font-bold text-purple-400"
                                            value={reminderFormData.opNumber}
                                            onChange={(e) => setReminderFormData({ ...reminderFormData, opNumber: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-sm font-medium text-slate-400 ml-1">Descripción</label>
                                        <input
                                            className="input w-full"
                                            value={reminderFormData.name}
                                            onChange={(e) => setReminderFormData({ ...reminderFormData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400 ml-1">Cliente</label>
                                    <input
                                        className="input w-full"
                                        value={reminderFormData.client}
                                        onChange={(e) => setReminderFormData({ ...reminderFormData, client: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400 ml-1">Horas Totales</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="input w-full font-mono font-bold"
                                            value={reminderFormData.totalHours}
                                            onChange={(e) => setReminderFormData({ ...reminderFormData, totalHours: parseFloat(e.target.value) || 0 })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400 ml-1">Dirección (Opcional)</label>
                                        <input
                                            className="input w-full text-xs"
                                            value={reminderFormData.address}
                                            onChange={(e) => setReminderFormData({ ...reminderFormData, address: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setQuickAddType(null)} className="btn btn-secondary flex-1">Cancelar</button>
                                    <button type="submit" className="btn bg-purple-600 hover:bg-purple-700 text-white flex-1">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-[200] bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1 w-48 animate-in fade-in zoom-in duration-200"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={handleFragmentClick}
                        className="w-full text-left px-4 py-2 hover:bg-white/5 text-slate-300 font-bold text-xs flex items-center gap-2 transition-colors"
                    >
                        <LayoutGrid size={14} className="text-blue-400" /> Fragmentar
                    </button>
                    <button
                        onClick={handleDuplicateTask}
                        className="w-full text-left px-4 py-2 hover:bg-white/5 text-slate-300 font-bold text-xs flex items-center gap-2 transition-colors"
                    >
                        <Copy size={14} className="text-emerald-400" /> Duplicar
                    </button>
                    <button
                        onClick={() => {
                            setEditingTask(contextMenu.task);
                            setFormData({
                                opNumber: contextMenu.task.opNumber || '',
                                name: contextMenu.task.name || '',
                                client: contextMenu.task.client || '',
                                address: contextMenu.task.address || '',
                                totalHours: contextMenu.task.totalHours || 0,
                                duration: contextMenu.task.duration || 0,
                                vehicles: contextMenu.task.vehicles || [],
                                members: contextMenu.task.members || [],
                                additionalJobs: contextMenu.task.additionalJobs || [],
                                date: contextMenu.task.date || '',
                                teamId: contextMenu.task.teamId || '',
                                section: contextMenu.task.section || 'Instalaciones'
                            });
                            setIsTaskModalOpen(true);
                            setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-white/5 text-slate-300 font-bold text-xs flex items-center gap-2 transition-colors"
                    >
                        <Calendar size={14} /> Editar
                    </button>
                </div>
            )}

            {/* Fragment Modal */}
            {isFragmentModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[150] p-4">
                    <div className="glass p-8 rounded-[2.5rem] w-full max-w-md space-y-6 shadow-2xl border-white/20 animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold flex items-center gap-2">
                                <LayoutGrid size={24} className="text-blue-500" /> Fragmentar Tarea
                            </h3>
                        </div>

                        <div className="space-y-4">
                            <p className="text-slate-400 text-sm">
                                Indica cuántos días adicionales quieres duplicar esta tarea. La tarea se copiará con los mismos integrantes y detalles.
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cantidad de días a dividir</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={fragmentDays}
                                    onChange={(e) => setFragmentDays(parseInt(e.target.value) || 1)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => {
                                    setIsFragmentModalOpen(false);
                                    setFragmentTargetTask(null);
                                }}
                                className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-400 hover:bg-white/5 transition-all text-sm border border-white/10"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmFragment}
                                className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-sm flex items-center justify-center gap-2"
                            >
                                Confirmar Fragmentación
                            </button>
                        </div>
                    </div>
                </div>
            )}



        </div >
    );
};
