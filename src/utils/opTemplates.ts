import type { OpTemplate } from '../types';

/**
 * Modelo de OP Outdoor:
 * Tareas automáticas asociadas:
 * - Lonas + Vinilos - Muestra de impresión.
 * - Lonas + Vinilos - Impresión de lona.
 * - Lonas + Vinilos - Soldado de lona.
 * - Instalaciones - Instalación de lona.
 */
export const OP_TEMPLATE_OUTDOOR: OpTemplate = {
    id: 'outdoor_standard',
    name: 'Modelo de OP Outdoor',
    category: 'Outdoor',
    description: 'Generación automática de tareas de preparación, impresión, soldado e instalación para órdenes de categoría Outdoor.',
    defaultTasks: [
        {
            section: 'Lonas',
            type: 'lonas',
            name: 'Muestra de impresión',
            totalHours: 1,
            estimatedHours: 1
        },
        {
            section: 'Lonas',
            type: 'lonas',
            name: 'Impresión de lona',
            totalHours: 1,
            estimatedHours: 1
        },
        {
            section: 'Lonas',
            type: 'lonas',
            name: 'Soldado de lona',
            totalHours: 1,
            estimatedHours: 1
        },
        {
            section: 'Instalaciones',
            type: 'instalacion',
            name: 'Instalación de lona',
            totalHours: 1,
            estimatedHours: 1
        }
    ]
};

export const OP_TEMPLATES: Record<string, OpTemplate> = {
    Outdoor: OP_TEMPLATE_OUTDOOR
};

/**
 * Obtiene la plantilla asociada a una categoría dada, si existe.
 */
export const getOpTemplateByCategory = (category?: string | null): OpTemplate | null => {
    if (!category) return null;
    return OP_TEMPLATES[category] || null;
};
