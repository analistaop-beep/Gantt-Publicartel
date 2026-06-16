import { useState, useCallback } from 'react';

export const SECTIONS = ['Instalaciones', 'Herrería', 'Corpóreas', 'Lonas', 'Pintura'] as const;
export type Section = typeof SECTIONS[number];

export type SectionRates = Partial<Record<Section, number>>;

const STORAGE_KEY = 'sectionHourlyRates';

function loadRates(): SectionRates {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch {}
    return {};
}

function saveRates(rates: SectionRates) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
}

export function useSectionRates() {
    const [rates, setRates] = useState<SectionRates>(() => loadRates());

    const setRate = useCallback((section: string, value: number | null) => {
        setRates(prev => {
            const next = { ...prev };
            if (value === null || isNaN(value) || value <= 0) {
                delete (next as any)[section];
            } else {
                (next as any)[section] = value;
            }
            saveRates(next);
            return next;
        });
    }, []);

    return { rates, setRate };
}

/** Read-only helper to get rates from localStorage (for use outside React components, e.g. PDF generator) */
export function getSectionRates(): SectionRates {
    return loadRates();
}
