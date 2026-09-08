import { format } from 'date-fns';

export type SectorTaskStatus = 'Para realizar' | 'Detenida' | 'Agendada' | 'En proceso' | 'Terminada';
export const SECTOR_TASK_STATUSES: SectorTaskStatus[] = ['Para realizar', 'Detenida', 'Agendada', 'En proceso', 'Terminada'];

export const getTaskStatus = (task: any): SectorTaskStatus => {
    if (task.completed || task.status === 'Terminada') return 'Terminada';
    if (task.status && SECTOR_TASK_STATUSES.includes(task.status as SectorTaskStatus)) {
        return task.status as SectorTaskStatus;
    }
    if (task.blockedBy) return 'Detenida';
    if (!task.date || task.date === '') return 'Para realizar';
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (task.date === todayStr) return 'En proceso';
    return 'Agendada';
};

export const getStatusBadgeStyle = (status: SectorTaskStatus) => {
    switch (status) {
        case 'Para realizar':
            return {
                badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:border-sky-500/40',
                dot: 'bg-sky-400',
                pulse: false
            };
        case 'Detenida':
            return {
                badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:border-rose-500/40',
                dot: 'bg-rose-400',
                pulse: false
            };
        case 'Agendada':
            return {
                badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:border-blue-500/40',
                dot: 'bg-blue-400',
                pulse: false
            };
        case 'En proceso':
            return {
                badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40',
                dot: 'bg-emerald-400',
                pulse: true
            };
        case 'Terminada':
            return {
                badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50',
                dot: 'bg-emerald-400',
                pulse: false
            };
    }
};
