export interface Profile {
    id: string;
    email: string;
    name: string;
    created_at: string;
    email_notifications?: boolean;
}

export interface Member {
    id: string;
    name: string;
    role: string;
    sector?: string;
    code?: string;
    ci?: string;
    files?: string[];
}

export interface Vehicle {
    id: string;
    name: string;
    plate: string;
}

export const SOPORTE_TIPOS = ['CA', 'PP', 'TM', 'PG', 'EP', 'MP'] as const;
export type SoporteTipo = typeof SOPORTE_TIPOS[number];

export interface Soporte {
    id: string;
    tipo: SoporteTipo | string;
    numero: string;
    ubicacion?: string;
    ruta?: string;
    localidad?: string;
    ficha?: string;
    created_at?: string;
}

export interface Team {
    id: string;
    name: string;
}

export interface Task {
    id: string;
    opNumber: string;
    name: string;
    client: string;
    address: string;
    date: string; // YYYY-MM-DD
    totalHours: number; // The absolute duration of the job
    duration: number; // The calculated clock hours (totalHours / members)
    estimatedHours?: number; // The fixed planned hours for the task
    teamId: string;
    vehicleId?: string;
    members?: string[];
    blockedBy?: string | null;
    completed?: boolean;
    realHours?: number;
}

export interface OrderAttachment {
    url: string;
    name: string;
}

export interface ProductionOrder {
    id: string;
    opNumber: string;
    client: string;
    seller: string;
    subject?: string;
    price: number;
    description: string;
    address: string;
    category: string;
    status: string;
    currency: 'UYU' | 'USD';
    files: (string | OrderAttachment)[]; // JSON string in DB, parsed to array in store
    comments?: Array<{ text: string, date: string, author?: string }>;
    createdAt?: string;
    updatedAt?: string;
    soporte?: string;
    followers?: string[]; // Array of emails of the followers
}

export interface DailyStats {
    teamId: string;
    date: string;
    totalHours: number;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'new_op' | 'status_change' | 'comment';
    createdAt: string;
    targetUsers?: string[] | null; // null if broadcast, array of emails if targeted
    opId?: string | null;          // ID de la OP relacionada (para navegar al hacer click)
    opNumber?: string | null;      // Número de OP legible
}
