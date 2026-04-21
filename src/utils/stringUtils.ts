/**
 * Extracts the initials from a full name, or returns the explicitly provided code.
 * Example: "Juan Perez" -> "JP"
 * Example: "Maria Rosa Garcia" -> "MG" (Takes first and last word)
 * @param name The full name of the member
 * @param code The custom code assigned to the member
 * @returns The initials or custom code in uppercase
 */
export const getInitials = (name: string, code?: string): string => {
    if (code?.trim()) return code.trim().toUpperCase();
    if (!name) return '';

    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';

    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }

    const firstInitial = parts[0][0];
    const lastInitial = parts[parts.length - 1][0];

    return (firstInitial + lastInitial).toUpperCase();
};

/**
 * Formats a name based on zoom level.
 * !isZoomed: Returns code or initials (e.g. "JP")
 * isZoomed: Returns Code/Initial + full Lastnames (e.g. "J. Pérez García")
 */
export const getCompactName = (name: string, isZoomed: boolean, code?: string): string => {
    if (!name) return '';
    if (!isZoomed) return getInitials(name, code);

    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];

    // Format: FirstInitial. Rest of Name (assuming rest is surnames)
    const firstInitial = (code?.trim() ? code.trim().toUpperCase() : parts[0][0].toUpperCase());
    const surnames = parts.slice(1).join(' ');

    return `${firstInitial}. ${surnames}`;
};
