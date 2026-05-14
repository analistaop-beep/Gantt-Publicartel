export interface Member {
    id: string;
    name: string;
    role: string;
    sector?: string;
    code?: string;
}

export interface Vehicle {
    id: string;
    name: string;
    plate: string;
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
    teamId: string;
    vehicleId?: string;
    members?: string[];
}

export interface ProductionOrder {
    id: string;
    opNumber: string;
    client: string;
    seller: string;
    price: number;
    description: string;
    address: string;
    category: string;
    status: string;
    currency: 'UYU' | 'USD';
    files: string[]; // JSON string in DB, parsed to array in store
    createdAt?: string;
}

export interface DailyStats {
    teamId: string;
    date: string;
    totalHours: number;
}
