import { create } from 'zustand';
import { supabase } from '../utils/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import type { Team, ProductionOrder, Notification, Profile } from '../types';


// Track which tasks have been locally modified but not yet saved to the database
interface PendingChanges {
    updatedTasks: Map<string, any>;    // taskId -> full task object with local changes
    deletedTaskIds: Set<string>;       // taskIds that were locally deleted
}

interface AppState {
    // Auth
    user: any;
    session: any;
    isAuthLoading: boolean;
    initAuth: () => void;
    signOut: () => Promise<void>;

    members: any[];
    vehicles: any[];
    teams: Team[];
    tasks: any[];
    herreriaTasks: any[];
    corporeasTasks: any[];
    lonasTasks: any[];
    pinturaTasks: any[];
    reminders: any[];
    productionOrders: any[];
    profiles: Profile[];
    notifications: Notification[];
    readNotifications: string[];
    notificationPreferences: { notifyNewOP: boolean; pushEnabled: boolean };
    viewPreferences: { instalacionesViewMode: 'default' | 'gantt' };
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;

    // Pending changes tracking
    pendingChanges: PendingChanges;
    hasPendingChanges: boolean;
    autoSaveTimer: any;

    fetchData: () => Promise<void>;

    // Members
    addMember: (member: { name: string; role: string; sector?: string; ci?: string; files?: string[] }) => Promise<void>;
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
    addProductionOrder: (order: Omit<ProductionOrder, 'id'>) => Promise<void>;
    updateProductionOrder: (order: any) => Promise<void>;
    deleteProductionOrder: (id: string) => Promise<void>;
    
    // Files
    uploadFile: (file: File | Blob, fileName: string) => Promise<string>;
    uploadMemberFile: (file: File | Blob, fileName: string) => Promise<string>;

    // Notifications & Views
    markNotificationAsRead: (id: string) => void;
    markAllNotificationsAsRead: () => void;
    updateNotificationPreferences: (prefs: { notifyNewOP: boolean; pushEnabled: boolean }) => void;
    updateViewPreferences: (prefs: { instalacionesViewMode: 'default' | 'gantt' }) => void;
    sendEmailNotification: (notification: Notification) => Promise<void>;
    updateEmailPreference: (enabled: boolean) => Promise<void>;

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
        estimatedHours?: number;
        duration: number;
        teamId: string | null;
        vehicles?: string[];
        members?: Array<{ id: string, hours: number }>;
        additionalJobs?: Array<{ description: string; client: string }>;
        type?: 'instalacion' | 'herreria' | 'corporeas' | 'lonas' | 'pintura';
        section?: string;
        blockedBy?: string | null;
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
    user: null,
    session: null,
    isAuthLoading: true,

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
    profiles: [],
    notifications: [],
    readNotifications: JSON.parse(localStorage.getItem('readNotifications') || '[]'),
    notificationPreferences: JSON.parse(localStorage.getItem('notificationPreferences') || '{"notifyNewOP":true, "pushEnabled":false}'),
    viewPreferences: JSON.parse(localStorage.getItem('viewPreferences') || '{"instalacionesViewMode":"default"}'),
    isLoading: false,
    isSaving: false,
    error: null,
    pendingChanges: { updatedTasks: new Map(), deletedTaskIds: new Set() },
    hasPendingChanges: false,
    autoSaveTimer: null as any,

    initAuth: () => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            set({ session, user: session?.user ?? null, isAuthLoading: false });
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            set({ session, user: session?.user ?? null, isAuthLoading: false });
        });
    },

    signOut: async () => {
        await supabase.auth.signOut();
        // Option to clean state up entirely
        set({ user: null, session: null });
    },

    fetchData: async () => {
        set({ isLoading: true });
        try {
            const results = await Promise.all([
                supabase.from('members').select('*').order('name'),
                supabase.from('vehicles').select('*').order('name'),
                supabase.from('teams').select('*').order('id'),
                supabase.from('tasks').select('*, task_members(memberId, hours), task_vehicles(vehicleId)').order('date'),
                supabase.from('reminders').select('*').order('opNumber'),
                supabase.from('production_orders').select('*').order('createdAt', { ascending: false }),
                supabase.from('notifications').select('*').order('createdAt', { ascending: false }).limit(50),
                supabase.from('profiles').select('*')
            ]);

            const [membersRes, vehiclesRes, teamsRes, tasksRes, remindersRes, ordersRes, notificationsRes, profilesRes] = results;

            const mappedTasks = (tasksRes.data || []).map(task => ({
                ...task,
                members: task.task_members.map((tm: any) => ({ id: tm.memberId, hours: tm.hours })),
                vehicles: task.task_vehicles.map((tv: any) => tv.vehicleId),
                additionalJobs: typeof task.additionalJobs === 'string' ? JSON.parse(task.additionalJobs) : task.additionalJobs
            }));

            set({
                members: (membersRes.data || []).map((m: any) => ({
                    ...m,
                    files: typeof m.files === 'string' ? JSON.parse(m.files) : (m.files || [])
                })),
                vehicles: vehiclesRes.data || [],
                teams: teamsRes.data || [],
                tasks: mappedTasks.filter(t => t.type === 'instalacion'),
                herreriaTasks: mappedTasks.filter(t => t.type === 'herreria'),
                corporeasTasks: mappedTasks.filter(t => t.type === 'corporeas'),
                lonasTasks: mappedTasks.filter(t => t.type === 'lonas'),
                pinturaTasks: mappedTasks.filter(t => t.type === 'pintura'),
                reminders: remindersRes.data || [],
                productionOrders: (ordersRes.data || []).map(o => ({
                    ...o,
                    files: typeof o.files === 'string' ? JSON.parse(o.files) : (o.files || []),
                    comments: typeof o.comments === 'string' ? JSON.parse(o.comments) : (o.comments || []),
                    followers: typeof o.followers === 'string' ? JSON.parse(o.followers) : (o.followers || [])
                })),
                profiles: profilesRes.data || [],
                notifications: (notificationsRes.data || []).map(n => ({
                    ...n,
                    targetUsers: typeof n.targetUsers === 'string' ? JSON.parse(n.targetUsers) : (n.targetUsers || null)
                })),
                isLoading: false
            });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    addMember: async (member) => {
        const payload = {
            ...member,
            files: member.files ? JSON.stringify(member.files) : '[]'
        };
        const { error } = await supabase.from('members').insert([{ id: uuidv4(), ...payload }]);
        if (error) throw error;
        await get().fetchData();
    },
    updateMember: async (member) => {
        try {
            set({ error: null });
            const { id, ...data } = member;
            const payload = {
                ...data,
                files: data.files ? JSON.stringify(data.files) : '[]'
            };
            const { error } = await supabase.from('members').update(payload).eq('id', id);
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
        const newId = uuidv4();
        const { error } = await supabase.from('production_orders').insert([{ 
            id: newId, 
            ...order,
            files: order.files ? JSON.stringify(order.files) : '[]',
            comments: order.comments ? JSON.stringify(order.comments) : '[]',
            followers: order.followers ? JSON.stringify(order.followers) : '[]'
        }]);
        if (error) throw error;
        
        const notification = {
            id: uuidv4(),
            title: `Nueva OP #${order.opNumber} — ${order.client}`,
            message: `Se registró una nueva orden de producción.`,
            type: 'new_op' as const,
            targetUsers: null,
            opId: newId,
            opNumber: order.opNumber
        };
        await supabase.from('notifications').insert([notification]);
        
        await get().sendEmailNotification({
            ...notification,
            createdAt: new Date().toISOString()
        });

        await get().fetchData();
    },
    updateProductionOrder: async (order) => {
        try {
            set({ error: null });
            const { id, ...rest } = order;
            const payload = {
                ...rest,
                files: rest.files ? JSON.stringify(rest.files) : '[]',
                comments: rest.comments ? JSON.stringify(rest.comments) : '[]',
                followers: rest.followers ? JSON.stringify(rest.followers) : '[]'
            };
            
            const previousOrder = get().productionOrders.find(o => o.id === id);

            const { error } = await supabase.from('production_orders').update(payload).eq('id', id);
            if (error) throw error;

            if (previousOrder) {
                const statusChanged = previousOrder.status !== order.status;
                const newCommentAdded = order.comments && previousOrder.comments && order.comments.length > previousOrder.comments.length;

                if (statusChanged || newCommentAdded) {
                    const title = `OP #${order.opNumber} — ${order.client}`;
                    const lastComment = newCommentAdded ? order.comments[order.comments.length - 1] : null;
                    const message = statusChanged 
                        ? `Estado actualizado a: ${order.status}` 
                        : `Nuevo comentario de ${lastComment?.author || 'un usuario'}`;

                    // Extraer @menciones del nuevo comentario
                    let mentionedUsers: string[] = [];
                    if (newCommentAdded && lastComment?.text) {
                        const mentionRegex = /@([\w.+-]+@[\w-]+\.[\w.]+)/g;
                        mentionedUsers = [...lastComment.text.matchAll(mentionRegex)].map((m: RegExpMatchArray) => m[1]);
                    }

                    // Unir followers + mencionados (sin duplicados)
                    const followers = order.followers || [];
                    const allTargets = Array.from(new Set([...followers, ...mentionedUsers]));

                    if (allTargets.length > 0) {
                        const notification = {
                            id: uuidv4(),
                            title,
                            message,
                            type: (statusChanged ? 'status_change' : 'comment') as 'status_change' | 'comment',
                            targetUsers: JSON.stringify(allTargets),
                            opId: id,
                            opNumber: order.opNumber
                        };
                        await supabase.from('notifications').insert([notification]);
                        await get().sendEmailNotification({
                            ...notification,
                            targetUsers: allTargets,
                            createdAt: new Date().toISOString()
                        });
                    } else if (statusChanged) {
                        // Si cambia el estado pero no hay followers ni menciones, notificar igual (broadcast)
                        const notification = {
                            id: uuidv4(),
                            title,
                            message,
                            type: 'status_change' as const,
                            targetUsers: null,
                            opId: id,
                            opNumber: order.opNumber
                        };
                        await supabase.from('notifications').insert([notification]);
                        await get().sendEmailNotification({
                            ...notification,
                            createdAt: new Date().toISOString()
                        });
                    }
                }
            }

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

    uploadMemberFile: async (file, fileName) => {
        const fileExt = fileName.split('.').pop();
        const path = `files/${uuidv4()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('members')
            .upload(path, file, {
                contentType: file instanceof File ? file.type : 'application/octet-stream',
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('members')
            .getPublicUrl(path);

        return data.publicUrl;
    },

    markNotificationAsRead: (id) => {
        set((state) => {
            const updatedReads = [...state.readNotifications, id];
            localStorage.setItem('readNotifications', JSON.stringify(updatedReads));
            return { readNotifications: updatedReads };
        });
    },

    markAllNotificationsAsRead: () => {
        set((state) => {
            const allIds = state.notifications.map(n => n.id);
            const updatedReads = Array.from(new Set([...state.readNotifications, ...allIds]));
            localStorage.setItem('readNotifications', JSON.stringify(updatedReads));
            return { readNotifications: updatedReads };
        });
    },

    updateNotificationPreferences: (prefs) => {
        set(() => {
            localStorage.setItem('notificationPreferences', JSON.stringify(prefs));
            return { notificationPreferences: prefs };
        });
    },

    updateViewPreferences: (prefs) => {
        set(() => {
            localStorage.setItem('viewPreferences', JSON.stringify(prefs));
            return { viewPreferences: prefs };
        });
    },

    sendEmailNotification: async (notification) => {
        try {
            const token = get().session?.access_token;
            if (!token) {
                console.log('No active session, skipping email notification');
                return;
            }

            // Determinar destinatarios
            let recipients: string[] = [];

            // Perfiles que han desactivado las notificaciones por email
            const optedOutEmails = new Set(
                get().profiles
                    .filter(p => p.email_notifications === false)
                    .map(p => p.email)
            );

            if (notification.targetUsers && notification.targetUsers.length > 0) {
                // Notificación dirigida a usuarios específicos
                const targets = Array.isArray(notification.targetUsers) 
                    ? notification.targetUsers 
                    : JSON.parse(notification.targetUsers as any);
                // Filtrar usuarios que hayan desactivado las notificaciones
                recipients = targets.filter((email: string) => !optedOutEmails.has(email));
            } else {
                // Notificación broadcast (Nueva OP o cambio de estado sin followers)
                const envEmails = import.meta.env.VITE_BROADCAST_EMAILS;
                if (envEmails) {
                    recipients = envEmails.split(',').map((e: string) => e.trim()).filter(Boolean)
                        .filter((email: string) => !optedOutEmails.has(email));
                }

                if (recipients.length === 0) {
                    // Por defecto, enviar a todos los perfiles registrados en el sistema
                    recipients = get().profiles
                        .filter(p => p.email_notifications !== false)
                        .map(p => p.email).filter(Boolean);
                }
            }

            if (recipients.length === 0) {
                console.log('No recipients found for email notification');
                return;
            }

            // Obtener la URL base de la app para enlaces y llamadas a la API
            const baseAppUrl = import.meta.env.VITE_APP_URL || (window.location.origin.startsWith('http') ? window.location.origin : '');
            
            if (!baseAppUrl) {
                console.warn('VITE_APP_URL no configurado, omitiendo envío de correo.');
                return;
            }

            const htmlContent = generateNotificationHtml(notification, baseAppUrl);

            const response = await fetch(`${baseAppUrl}/api/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    to: recipients,
                    subject: `[Gantt Publicartel] ${notification.title}`,
                    html: htmlContent,
                    text: `${notification.title}\n\n${notification.message}`
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                console.error('Error al enviar email via API:', errData.error);
            } else {
                console.log('Notificación por email enviada con éxito.');
            }
        } catch (error) {
            console.error('Error en sendEmailNotification:', error);
        }
    },

    updateEmailPreference: async (enabled: boolean) => {
        const user = get().user;
        if (!user) return;

        // Actualización optimista: reflejar el cambio en la UI inmediatamente
        set(state => ({
            profiles: state.profiles.map(p =>
                p.email === user.email ? { ...p, email_notifications: enabled } : p
            )
        }));

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ email_notifications: enabled })
                .eq('id', user.id);
            if (error) throw error;

            // Sync solo los perfiles desde DB para confirmar el valor guardado
            const { data: profilesData } = await supabase.from('profiles').select('*');
            if (profilesData) set({ profiles: profilesData });
        } catch (err: any) {
            console.error('Error al actualizar preferencia de email:', err.message);
            // Revertir el cambio optimista en caso de error
            set(state => ({
                profiles: state.profiles.map(p =>
                    p.email === user.email ? { ...p, email_notifications: !enabled } : p
                )
            }));
        }
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
                estimatedHours: taskData.estimatedHours ?? taskData.totalHours,
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
            const { id, vehicles = [], members = [], additionalJobs = [], task_members, task_vehicles, ...taskData } = task;

            // Sanitize teamId: empty string violates foreign key constraint in Supabase/Postgres
            if (taskData.teamId === '') {
                taskData.teamId = null;
            }

            const { error: taskError } = await supabase.from('tasks').update({
                ...taskData,
                additionalJobs: JSON.stringify(additionalJobs)
            }).eq('id', id);

            if (taskError) throw taskError;

            // Update members (delete all and re-insert)
            await supabase.from('task_members').delete().eq('taskId', id);
            if (members.length > 0) {
                const { error: mError } = await supabase.from('task_members').insert(
                    members.map((m: any) => ({ taskId: id, memberId: m.id, hours: m.hours }))
                );
                if (mError) throw mError;
            }

            // Update vehicles
            await supabase.from('task_vehicles').delete().eq('taskId', id);
            if (vehicles.length > 0) {
                const { error: vError } = await supabase.from('task_vehicles').insert(
                    vehicles.map((vId: string) => ({ taskId: id, vehicleId: vId }))
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

            // 2. Process updates/inserts via upsert (handles both new local tasks and existing ones)
            for (const [, task] of updatedTasks) {
                const { id, vehicles = [], members = [], additionalJobs = [], task_members, task_vehicles, ...taskData } = task;

                // Sanitize teamId
                if (taskData.teamId === '') {
                    taskData.teamId = null;
                }

                // upsert: INSERT if the row doesn't exist yet, UPDATE if it does
                const { error: taskError } = await supabase.from('tasks').upsert({
                    id,
                    ...taskData,
                    additionalJobs: JSON.stringify(additionalJobs)
                }, { onConflict: 'id' });

                if (taskError) throw taskError;

                // Update members
                await supabase.from('task_members').delete().eq('taskId', id);
                if (members.length > 0) {
                    const { error: mError } = await supabase.from('task_members').insert(
                        members.map((m: any) => ({ taskId: id, memberId: m.id, hours: m.hours }))
                    );
                    if (mError) throw mError;
                }

                // Update vehicles
                await supabase.from('task_vehicles').delete().eq('taskId', id);
                if (vehicles.length > 0) {
                    const { error: vError } = await supabase.from('task_vehicles').insert(
                        vehicles.map((vId: string) => ({ taskId: id, vehicleId: vId }))
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

function generateNotificationHtml(notification: Notification, origin: string): string {
    const opLink = notification.opId ? `${origin}/orders?opId=${notification.opId}` : `${origin}/orders`;
    const capitalizedType = notification.type === 'new_op' 
        ? 'Nueva Orden de Producción' 
        : notification.type === 'status_change' 
        ? 'Cambio de Estado' 
        : 'Nuevo Comentario';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${notification.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
            padding: 30px 20px;
            text-align: center;
        }
        .logo-text {
            color: #ffffff;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            margin: 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .content {
            padding: 32px 24px;
        }
        .title {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 0;
            margin-bottom: 12px;
            line-height: 1.3;
        }
        .message {
            font-size: 15px;
            color: #475569;
            line-height: 1.6;
            margin-bottom: 28px;
        }
        .details-table {
            background-color: #f1f5f9;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 28px;
            border-collapse: collapse;
            width: 100%;
        }
        .details-label {
            padding: 12px 0 12px 12px;
            font-size: 11px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            border-bottom: 1px solid #e2e8f0;
        }
        .details-value {
            padding: 12px 12px 12px 0;
            font-size: 14px;
            color: #0f172a;
            font-weight: 700;
            text-align: right;
            border-bottom: 1px solid #e2e8f0;
        }
        .details-row-last .details-label,
        .details-row-last .details-value {
            border-bottom: none;
        }
        .btn-container {
            text-align: center;
            margin-top: 32px;
            margin-bottom: 8px;
        }
        .btn {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 30px;
            font-size: 14px;
            font-weight: 700;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
            transition: all 0.2s ease;
        }
        .footer {
            background-color: #f8fafc;
            padding: 24px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="logo-text">Publicartel</h1>
        </div>
        <div class="content">
            <h2 class="title">${notification.title}</h2>
            <p class="message">${notification.message}</p>
            
            <table class="details-table" width="100%" cellpadding="0" cellspacing="0">
                ${notification.opNumber ? `
                <tr>
                    <td class="details-label" style="padding: 12px 0 12px 12px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #e2e8f0;">Número de OP</td>
                    <td class="details-value" style="padding: 12px 12px 12px 0; font-size: 14px; color: #0f172a; font-weight: 700; text-align: right; border-bottom: 1px solid #e2e8f0;">#${notification.opNumber}</td>
                </tr>` : ''}
                <tr>
                    <td class="details-label" style="padding: 12px 0 12px 12px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #e2e8f0;">Evento</td>
                    <td class="details-value" style="padding: 12px 12px 12px 0; font-size: 14px; color: #0f172a; font-weight: 700; text-align: right; border-bottom: 1px solid #e2e8f0;">${capitalizedType}</td>
                </tr>
                <tr class="details-row-last">
                    <td class="details-label" style="padding: 12px 0 12px 12px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Fecha</td>
                    <td class="details-value" style="padding: 12px 12px 12px 0; font-size: 14px; color: #0f172a; font-weight: 700; text-align: right;">${new Date(notification.createdAt).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
            </table>

            <div class="btn-container">
                <a href="${opLink}" class="btn" target="_blank" style="color: #ffffff;">Ver en el Sistema</a>
            </div>
        </div>
        <div class="footer">
            Este es un correo automático generado por la plataforma de gestión Gantt Publicartel.<br>
            Por favor, no respondas a este mensaje.
        </div>
    </div>
</body>
</html>
    `;
}
