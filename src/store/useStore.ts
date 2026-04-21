import { create } from 'zustand';
import { supabase } from '../utils/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
    members: any[];
    vehicles: any[];
    teams: any[];
    tasks: any[];
    herreriaTasks: any[];
    corporeasTasks: any[];
    lonasTasks: any[];
    pinturaTasks: any[];
    reminders: any[];
    isLoading: boolean;
    error: string | null;

    fetchData: () => Promise<void>;

    // Members
    addMember: (member: { name: string; role: string; sector?: string; ci?: string }) => Promise<void>;
    updateMember: (member: any) => Promise<void>;
    deleteMember: (id: string) => Promise<void>;

    // Vehicles
    addVehicle: (vehicle: { name: string; plate: string }) => Promise<void>;
    updateVehicle: (vehicle: any) => Promise<void>;
    deleteVehicle: (id: string) => Promise<void>;

    // Reminders
    addReminder: (reminder: { opNumber: string; name: string; client: string; address: string; totalHours: number }) => Promise<void>;
    updateReminder: (reminder: any) => Promise<void>;
    deleteReminder: (id: string) => Promise<void>;

    // Teams
    addTeam: (team: { name: string }) => Promise<void>;
    updateTeam: (team: any) => Promise<void>;
    deleteTeam: (id: string) => Promise<void>;

    // Tasks
    addTask: (task: {
        opNumber: string;
        name: string;
        client: string;
        address: string;
        date: string;
        totalHours: number;
        duration: number;
        teamId: string | null;
        vehicles?: string[];
        members?: Array<{ id: string, hours: number }>;
        additionalJobs?: Array<{ description: string; client: string }>;
        type?: 'instalacion' | 'herreria' | 'corporeas' | 'lonas' | 'pintura';
        section?: string;
    }) => Promise<void>;
    updateTask: (task: any) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    clearTasksRange: (startDate: string, endDate: string, type?: string) => Promise<void>;
    resetDatabase: () => Promise<void>;
    clearError: () => void;
}

export const useStore = create<AppState>((set, get) => ({
    members: [],
    vehicles: [],
    teams: [],
    tasks: [],
    herreriaTasks: [],
    corporeasTasks: [],
    lonasTasks: [],
    pinturaTasks: [],
    reminders: [],
    isLoading: false,
    error: null,

    fetchData: async () => {
        set({ isLoading: true });
        try {
            const [
                { data: members },
                { data: vehicles },
                { data: teams },
                { data: allTasks },
                { data: reminders }
            ] = await Promise.all([
                supabase.from('members').select('*').order('name'),
                supabase.from('vehicles').select('*').order('name'),
                supabase.from('teams').select('*').order('id'),
                supabase.from('tasks').select('*, task_members(memberId, hours), task_vehicles(vehicleId)').order('date'),
                supabase.from('reminders').select('*').order('opNumber'),
            ]);

            const mappedTasks = (allTasks || []).map(task => ({
                ...task,
                members: task.task_members.map((tm: any) => ({ id: tm.memberId, hours: tm.hours })),
                vehicles: task.task_vehicles.map((tv: any) => tv.vehicleId),
                additionalJobs: typeof task.additionalJobs === 'string' ? JSON.parse(task.additionalJobs) : task.additionalJobs
            }));

            set({
                members: members || [],
                vehicles: vehicles || [],
                teams: teams || [],
                tasks: mappedTasks.filter(t => t.type === 'instalacion'),
                herreriaTasks: mappedTasks.filter(t => t.type === 'herreria'),
                corporeasTasks: mappedTasks.filter(t => t.type === 'corporeas'),
                lonasTasks: mappedTasks.filter(t => t.type === 'lonas'),
                pinturaTasks: mappedTasks.filter(t => t.type === 'pintura'),
                reminders: reminders || [],
                isLoading: false
            });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    addMember: async (member) => {
        const { error } = await supabase.from('members').insert([{ id: uuidv4(), ...member }]);
        if (error) throw error;
        await get().fetchData();
    },
    updateMember: async (member) => {
        const { error } = await supabase.from('members').update(member).eq('id', member.id);
        if (error) throw error;
        await get().fetchData();
    },
    deleteMember: async (id) => {
        const { error } = await supabase.from('members').delete().eq('id', id);
        if (error) throw error;
        await get().fetchData();
    },

    addVehicle: async (vehicle) => {
        const { error } = await supabase.from('vehicles').insert([{ id: uuidv4(), ...vehicle }]);
        if (error) throw error;
        await get().fetchData();
    },
    updateVehicle: async (vehicle) => {
        const { error } = await supabase.from('vehicles').update(vehicle).eq('id', vehicle.id);
        if (error) throw error;
        await get().fetchData();
    },
    deleteVehicle: async (id) => {
        const { error } = await supabase.from('vehicles').delete().eq('id', id);
        if (error) throw error;
        await get().fetchData();
    },

    addTeam: async (team) => {
        const { error } = await supabase.from('teams').insert([{ id: uuidv4(), ...team }]);
        if (error) throw error;
        await get().fetchData();
    },
    updateTeam: async (team) => {
        const { error } = await supabase.from('teams').update(team).eq('id', team.id);
        if (error) throw error;
        await get().fetchData();
    },
    deleteTeam: async (id) => {
        const { error } = await supabase.from('teams').delete().eq('id', id);
        if (error) throw error;
        await get().fetchData();
    },

    addReminder: async (reminder) => {
        const { error } = await supabase.from('reminders').insert([{ id: uuidv4(), ...reminder }]);
        if (error) throw error;
        await get().fetchData();
    },
    updateReminder: async (reminder) => {
        const { error } = await supabase.from('reminders').update(reminder).eq('id', reminder.id);
        if (error) throw error;
        await get().fetchData();
    },
    deleteReminder: async (id) => {
        const { error } = await supabase.from('reminders').delete().eq('id', id);
        if (error) throw error;
        await get().fetchData();
    },

    addTask: async (task) => {
        try {
            set({ error: null });
            const taskId = uuidv4();
            const { vehicles = [], members = [], additionalJobs = [], ...taskData } = task;

            const { error: taskError } = await supabase.from('tasks').insert([{
                id: taskId,
                ...taskData,
                additionalJobs: JSON.stringify(additionalJobs),
                groupId: taskData.date ? taskId : (taskData as any).groupId || taskId
            }]);

            if (taskError) throw taskError;

            if (members.length > 0) {
                const { error: mError } = await supabase.from('task_members').insert(
                    members.map(m => ({ taskId, memberId: m.id, hours: m.hours }))
                );
                if (mError) throw mError;
            }

            if (vehicles.length > 0) {
                const { error: vError } = await supabase.from('task_vehicles').insert(
                    vehicles.map(vId => ({ taskId, vehicleId: vId }))
                );
                if (vError) throw vError;
            }

            await get().fetchData();
        } catch (err: any) {
            set({ error: err.message });
            throw err;
        }
    },

    updateTask: async (task) => {
        try {
            set({ error: null });
            const { vehicles = [], members = [], additionalJobs = [], task_members, task_vehicles, ...taskData } = task;

            const { error: taskError } = await supabase.from('tasks').update({
                ...taskData,
                additionalJobs: JSON.stringify(additionalJobs)
            }).eq('id', task.id);

            if (taskError) throw taskError;

            // Update members (delete all and re-insert for simplicity, matching original server logic)
            await supabase.from('task_members').delete().eq('taskId', task.id);
            if (members.length > 0) {
                const { error: mError } = await supabase.from('task_members').insert(
                    members.map((m: any) => ({ taskId: task.id, memberId: m.id, hours: m.hours }))
                );
                if (mError) throw mError;
            }

            // Update vehicles
            await supabase.from('task_vehicles').delete().eq('taskId', task.id);
            if (vehicles.length > 0) {
                const { error: vError } = await supabase.from('task_vehicles').insert(
                    vehicles.map((vId: string) => ({ taskId: task.id, vehicleId: vId }))
                );
                if (vError) throw vError;
            }

            await get().fetchData();
        } catch (err: any) {
            set({ error: err.message });
            throw err;
        }
    },

    deleteTask: async (id) => {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
        await get().fetchData();
    },

    clearTasksRange: async (startDate, endDate, type = 'instalacion') => {
        const { error } = await supabase.from('tasks')
            .delete()
            .gte('date', startDate)
            .lte('date', endDate)
            .eq('type', type);
        if (error) throw error;
        await get().fetchData();
    },

    resetDatabase: async () => {
        // Warning: This deletes everything
        await supabase.from('task_members').delete().neq('taskId', '');
        await supabase.from('task_vehicles').delete().neq('taskId', '');
        await supabase.from('tasks').delete().neq('id', '');
        await get().fetchData();
    },

    clearError: () => set({ error: null }),
}));
