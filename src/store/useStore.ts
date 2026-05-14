import { create } from 'zustand';
import { supabase } from '../utils/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// Track which tasks have been locally modified but not yet saved to the database
interface PendingChanges {
    updatedTasks: Map<string, any>;    // taskId -> full task object with local changes
    deletedTaskIds: Set<string>;       // taskIds that were locally deleted
}

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
    productionOrders: any[];
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;

    // Pending changes tracking
    pendingChanges: PendingChanges;
    hasPendingChanges: boolean;
    autoSaveTimer: any;

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
    
    // Production Orders
    addProductionOrder: (order: { opNumber: string; client: string; seller: string; price: number; description: string; address: string; category: string; status: string; files: string[] }) => Promise<void>;
    updateProductionOrder: (order: any) => Promise<void>;
    deleteProductionOrder: (id: string) => Promise<void>;
    
    // Files
    uploadFile: (file: File | Blob, fileName: string) => Promise<string>;

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
    subscribeToChanges: () => () => void;

    // Local-only operations for drag-and-drop and fragmentation (no DB call)
    updateTaskLocal: (task: any) => void;
    deleteTaskLocal: (id: string) => void;
    addTaskLocal: (task: any) => void;

    // Flush all pending local changes to the database
    saveAllChanges: () => Promise<void>;

    // Discard all pending local changes and reload from DB
    discardChanges: () => Promise<void>;
}

// Helper: categorize a task into the correct state bucket based on its type
function getTaskListKey(type: string): 'tasks' | 'herreriaTasks' | 'corporeasTasks' | 'lonasTasks' | 'pinturaTasks' {
    switch (type) {
        case 'herreria': return 'herreriaTasks';
        case 'corporeas': return 'corporeasTasks';
        case 'lonas': return 'lonasTasks';
        case 'pintura': return 'pinturaTasks';
        default: return 'tasks';
    }
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
    productionOrders: [],
    isLoading: false,
    isSaving: false,
    error: null,
    pendingChanges: { updatedTasks: new Map(), deletedTaskIds: new Set() },
    hasPendingChanges: false,
    autoSaveTimer: null as any,

    fetchData: async () => {
        set({ isLoading: true });
        try {
            const [
                { data: members },
                { data: vehicles },
                { data: teams },
                { data: allTasks },
                { data: reminders },
                { data: productionOrders }
            ] = await Promise.all([
                supabase.from('members').select('*').order('name'),
                supabase.from('vehicles').select('*').order('name'),
                supabase.from('teams').select('*').order('id'),
                supabase.from('tasks').select('*, task_members(memberId, hours), task_vehicles(vehicleId)').order('date'),
                supabase.from('reminders').select('*').order('opNumber'),
                supabase.from('production_orders').select('*').order('createdAt', { ascending: false }),
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
                productionOrders: (productionOrders || []).map(o => ({
                    ...o,
                    files: typeof o.files === 'string' ? JSON.parse(o.files) : (o.files || [])
                })),
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
        try {
            set({ error: null });
            const { id, ...data } = member;
            const { error } = await supabase.from('members').update(data).eq('id', id);
            if (error) throw error;
            await get().fetchData();
        } catch (err: any) {
            set({ error: err.message });
            throw err;
        }
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
        try {
            set({ error: null });
            const { id, ...data } = vehicle;
            const { error } = await supabase.from('vehicles').update(data).eq('id', id);
            if (error) throw error;
            await get().fetchData();
        } catch (err: any) {
            set({ error: err.message });
            throw err;
        }
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
        try {
            set({ error: null });
            const { id, ...data } = team;
            const { error } = await supabase.from('teams').update(data).eq('id', id);
            if (error) throw error;
            await get().fetchData();
        } catch (err: any) {
            set({ error: err.message });
            throw err;
        }
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
        try {
            set({ error: null });
            const { id, ...data } = reminder;
            const { error } = await supabase.from('reminders').update(data).eq('id', id);
            if (error) throw error;
            await get().fetchData();
        } catch (err: any) {
            set({ error: err.message });
            throw err;
        }
    },
    deleteReminder: async (id) => {
        const { error } = await supabase.from('reminders').delete().eq('id', id);
        if (error) throw error;
        await get().fetchData();
    },
    
    addProductionOrder: async (order) => {
        const { error } = await supabase.from('production_orders').insert([{ 
            id: uuidv4(), 
            ...order,
            files: JSON.stringify(order.files)
        }]);
        if (error) throw error;
        await get().fetchData();
    },
    updateProductionOrder: async (order) => {
        try {
            set({ error: null });
            const { id, ...data } = order;
            const { error } = await supabase.from('production_orders').update({
                ...data,
                files: JSON.stringify(data.files)
            }).eq('id', id);
            if (error) throw error;
            await get().fetchData();
        } catch (err: any) {
            set({ error: err.message });
            throw err;
        }
    },
    deleteProductionOrder: async (id) => {
        const { error } = await supabase.from('production_orders').delete().eq('id', id);
        if (error) throw error;
        await get().fetchData();
    },

    uploadFile: async (file, fileName) => {
        const fileExt = fileName.split('.').pop();
        const path = `orders/${uuidv4()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('production-orders')
            .upload(path, file, {
                contentType: file instanceof File ? file.type : 'image/webp',
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('production-orders')
            .getPublicUrl(path);

        return data.publicUrl;
    },

    addTask: async (task) => {
        try {
            set({ error: null });
            const taskId = uuidv4();
            const { vehicles = [], members = [], additionalJobs = [], task_members, task_vehicles, id, ...taskData } = task as any;

            // Sanitize teamId: empty string violates foreign key constraint in Supabase/Postgres
            if (taskData.teamId === '') {
                taskData.teamId = null;
            }

            const { error: taskError } = await supabase.from('tasks').insert([{
                id: taskId,
                ...taskData,
                additionalJobs: JSON.stringify(additionalJobs),
                groupId: taskData.date ? taskId : (taskData as any).groupId || taskId
            }]);

            if (taskError) throw taskError;

            if (members.length > 0) {
                const { error: mError } = await supabase.from('task_members').insert(
                    members.map((m: any) => ({ taskId, memberId: m.id, hours: m.hours }))
                );
                if (mError) throw mError;
            }

            if (vehicles.length > 0) {
                const { error: vError } = await supabase.from('task_vehicles').insert(
                    vehicles.map((vId: string) => ({ taskId, vehicleId: vId }))
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

            // Sanitize teamId: empty string violates foreign key constraint in Supabase/Postgres
            if (taskData.teamId === '') {
                taskData.teamId = null;
            }

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

    subscribeToChanges: () => {
        const channel = supabase
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => {
                // Only auto-refresh from DB if there are NO pending local changes.
                // Otherwise we'd overwrite the user's unsaved work.
                if (!get().hasPendingChanges) {
                    get().fetchData();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    // ============================================================
    // LOCAL-ONLY task operations (no DB calls, just state updates)
    // ============================================================

    updateTaskLocal: (task: any) => {
        const state = get();
        const taskType = task.type || 'instalacion';
        const listKey = getTaskListKey(taskType);

        // Update the task in the appropriate list
        const updatedList = state[listKey].map((t: any) =>
            t.id === task.id ? { ...t, ...task } : t
        );

        // Track in pending changes
        const newPending = { ...state.pendingChanges };
        const newUpdatedTasks = new Map(newPending.updatedTasks);
        newUpdatedTasks.set(task.id, { ...task });
        newPending.updatedTasks = newUpdatedTasks;

        set({
            [listKey]: updatedList,
            pendingChanges: newPending,
            hasPendingChanges: true,
        } as any);

        // Schedule auto-save after 30s of inactivity
        const stateAfter = get();
        if (stateAfter.autoSaveTimer) clearTimeout(stateAfter.autoSaveTimer);
        const timer = setTimeout(() => {
            get().saveAllChanges();
        }, 30000);
        set({ autoSaveTimer: timer });
    },

    deleteTaskLocal: (id: string) => {
        const state = get();

        // Remove from all task lists
        const updates: any = {};
        for (const key of ['tasks', 'herreriaTasks', 'corporeasTasks', 'lonasTasks', 'pinturaTasks'] as const) {
            const filtered = state[key].filter((t: any) => t.id !== id);
            if (filtered.length !== state[key].length) {
                updates[key] = filtered;
            }
        }

        // Track in pending changes
        const newPending = { ...state.pendingChanges };
        const newDeletedIds = new Set(newPending.deletedTaskIds);
        newDeletedIds.add(id);
        newPending.deletedTaskIds = newDeletedIds;

        // If this task was also in updatedTasks, remove it (no point updating a deleted task)
        const newUpdatedTasks = new Map(newPending.updatedTasks);
        newUpdatedTasks.delete(id);
        newPending.updatedTasks = newUpdatedTasks;

        set({
            ...updates,
            pendingChanges: newPending,
            hasPendingChanges: true,
        });

        // Schedule auto-save after 30s of inactivity
        const stateAfter = get();
        if (stateAfter.autoSaveTimer) clearTimeout(stateAfter.autoSaveTimer);
        const timer = setTimeout(() => {
            get().saveAllChanges();
        }, 30000);
        set({ autoSaveTimer: timer });
    },
    
    addTaskLocal: (task: any) => {
        const state = get();
        const taskType = task.type || 'instalacion';
        const listKey = getTaskListKey(taskType);
        
        // Ensure the task has an ID
        const newTask = { ...task, id: task.id || uuidv4() };

        // Add to the appropriate list
        const updatedList = [...state[listKey], newTask];

        // Track in pending changes (as an update/insert)
        const newPending = { ...state.pendingChanges };
        const newUpdatedTasks = new Map(newPending.updatedTasks);
        newUpdatedTasks.set(newTask.id, newTask);
        newPending.updatedTasks = newUpdatedTasks;

        set({
            [listKey]: updatedList,
            pendingChanges: newPending,
            hasPendingChanges: true,
        } as any);

        // Schedule auto-save after 30s of inactivity
        const stateAfter = get();
        if (stateAfter.autoSaveTimer) clearTimeout(stateAfter.autoSaveTimer);
        const timer = setTimeout(() => {
            get().saveAllChanges();
        }, 30000);
        set({ autoSaveTimer: timer });
    },

    // ============================================================
    // Flush all pending changes to Supabase
    // ============================================================

    saveAllChanges: async () => {
        const state = get();
        if (!state.hasPendingChanges || state.isSaving) return;

        // Clear any pending auto-save timer
        if (state.autoSaveTimer) {
            clearTimeout(state.autoSaveTimer);
        }

        set({ isSaving: true, error: null, autoSaveTimer: null });

        try {
            const { updatedTasks, deletedTaskIds } = state.pendingChanges;

            // 1. Process deletions first
            for (const id of deletedTaskIds) {
                const { error } = await supabase.from('tasks').delete().eq('id', id);
                if (error) throw error;
            }

            // 2. Process updates
            for (const [, task] of updatedTasks) {
                const { vehicles = [], members = [], additionalJobs = [], task_members, task_vehicles, ...taskData } = task;

                // Sanitize teamId
                if (taskData.teamId === '') {
                    taskData.teamId = null;
                }

                const { error: taskError } = await supabase.from('tasks').update({
                    ...taskData,
                    additionalJobs: JSON.stringify(additionalJobs)
                }).eq('id', task.id);

                if (taskError) throw taskError;

                // Update members
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
            }

            // 3. Clear pending changes and re-fetch from DB to ensure consistency
            set({
                pendingChanges: {
                    updatedTasks: new Map(),
                    deletedTaskIds: new Set(),
                },
                hasPendingChanges: false,
                isSaving: false,
            });

            await get().fetchData();
        } catch (err: any) {
            set({ error: err.message, isSaving: false });
            throw err;
        }
    },

    discardChanges: async () => {
        set({
            pendingChanges: {
                updatedTasks: new Map(),
                deletedTaskIds: new Set(),
            },
            hasPendingChanges: false,
        });
        await get().fetchData();
    },
}));
