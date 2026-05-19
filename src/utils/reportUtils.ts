import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { sileo } from 'sileo';

/**
 * Exports data to an Excel-compatible XLS file using an HTML table.
 */
export const exportToExcel = (headers: string[], rows: any[][], filename: string) => {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    rows.forEach(rowData => {
        const tr = document.createElement('tr');
        rowData.forEach(cellData => {
            const td = document.createElement('td');
            td.textContent = cellData?.toString() || '';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8" /></head>
        <body>${table.outerHTML}</body>
        </html>
    `;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Generates an elegant PDF report for a single task.
 */
export const exportTaskToPDF = async (task: any, members: any[], vehicles: any[], isPrintOrder: boolean = false) => {
    task = normalizeToNFC(task);
    members = normalizeToNFC(members);
    vehicles = normalizeToNFC(vehicles);
    try {
        const doc = new jsPDF();
        let logoData: any = null;
        const isElectron = window && (window as any).electronAPI;
        
        if (isElectron) {
            try {
                logoData = await (window as any).electronAPI.invoke('get-logo');
            } catch (e) {
                console.error('Error fetching logo via Electron:', e);
            }
        } else {
            try {
                const response = await fetch('/logo-publicartel.png');
                const blob = await response.blob();
                logoData = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.error('Error fetching logo via Fetch:', e);
            }
        }
        
        const primaryColor: [number, number, number] = [15, 23, 42];
        const accentColor: [number, number, number] = [37, 99, 235];
        
        if (logoData) {
            try {
                doc.addImage(logoData, 'PNG', 15, 10, 40, 15);
            } catch (e) {
                console.error('Error adding logo to PDF:', e);
            }
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(isPrintOrder ? 'ORDEN DE TRABAJO' : 'REPORTE DE TAREA', 195, 20, { align: 'right' });
        
        doc.setFontSize(14);
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text(`OP: ${task.opNumber}`, 195, 28, { align: 'right' });
        
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setLineWidth(0.5);
        doc.line(15, 35, 195, 35);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'normal');
        
        const detailsY = 45;
        doc.setFontSize(9);
        
        // Left Column
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100);
        doc.text('CLIENTE:', 15, detailsY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        doc.text(task.client || 'N/A', 40, detailsY);
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100);
        doc.text('TRABAJO:', 15, detailsY + 8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        doc.text(task.name || 'N/A', 40, detailsY + 8);
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100);
        doc.text('DIRECCIÓN:', 15, detailsY + 16);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        doc.text(task.address || 'S/D', 40, detailsY + 16);
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100);
        doc.text('FECHA:', 15, detailsY + 24);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        const taskDate = task.date ? format(new Date(task.date + 'T12:00:00'), 'eeee d \'de\' MMMM, yyyy', { locale: es }) : 'Pendiente';
        doc.text(taskDate, 40, detailsY + 24);

        // Right Column
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100);
        doc.text('SECCIÓN:', 130, detailsY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        doc.text(task.section || 'Instalaciones', 158, detailsY);

        if (!isPrintOrder) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100);
            doc.text('HORAS PREVISTAS:', 130, detailsY + 8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0);
            doc.text(`${task.totalHours}h`, 158, detailsY + 8);

            const totalAssignedHours = (task.members || []).reduce((acc: number, m: any) => acc + (typeof m === 'object' ? (m.hours || 0) : 8), 0);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100);
            doc.text('HORAS TOTALES:', 130, detailsY + 16);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0);
            doc.text(`${totalAssignedHours}h`, 158, detailsY + 16);
        }
        
        const taskMembers = (task.members || []).map((m: any) => {
            const memberInfo = members.find(mem => mem.id === (typeof m === 'string' ? m : m.id));
            return [
                memberInfo?.name || 'Desconocido',
                memberInfo?.role || 'Operario',
                isPrintOrder ? '' : `${typeof m === 'object' ? m.hours : 8}h`
            ];
        });
        
        autoTable(doc, {
            startY: detailsY + 35,
            head: [['Personal Asignado', 'Rol', 'Horas']],
            body: taskMembers.length > 0 ? taskMembers : [['No hay personal asignado', '', '']],
            theme: 'striped',
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 15, right: 15 }
        });
        
        const taskVehicles = (task.vehicles || []).map((vId: string) => {
            const v = vehicles.find(veh => veh.id === vId);
            return [v?.name || 'N/A', v?.plate || 'N/A'];
        });
        
        if (taskVehicles.length > 0) {
            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [['Vehículo', 'Patente']],
                body: taskVehicles,
                theme: 'grid',
                headStyles: { fillColor: [100, 116, 139] as [number, number, number], textColor: 255 },
                styles: { fontSize: 9, cellPadding: 3 },
                margin: { left: 15, right: 15 }
            });
        }
        
        const additionalJobs = (task.additionalJobs || []).map((j: any) => [j.description || '', j.client || '']);
        if (additionalJobs.length > 0) {
            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [['Tareas Adicionales', 'Referencia']],
                body: additionalJobs,
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129] as [number, number, number], textColor: 255 },
                styles: { fontSize: 9, cellPadding: 3 },
                margin: { left: 15, right: 15 }
            });
        }

        // Space for comments if it's a Print Order
        if (isPrintOrder) {
            const lastY = (doc as any).lastAutoTable?.finalY || detailsY + 35;
            const commentsY = lastY + 10;
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text('COMENTARIOS / OBSERVACIONES:', 15, commentsY);
            
            doc.setDrawColor(200);
            doc.setLineWidth(0.2);
            
            const boxTop = commentsY + 5;
            const boxBottom = 270;
            const boxHeight = boxBottom - boxTop;
            
            // Draw the outer box
            doc.rect(15, boxTop, 180, boxHeight);
            
            // Draw ruled lines inside the box
            doc.setDrawColor(230);
            for (let lineY = boxTop + 10; lineY < boxBottom; lineY += 8) {
                doc.line(15, lineY, 195, lineY);
            }
        }
        
        const finalY = isPrintOrder ? 275 : ((doc as any).lastAutoTable?.finalY || 150) + 30;
        doc.setDrawColor(200);
        doc.line(15, finalY, 80, finalY);
        doc.line(115, finalY, 180, finalY);
        
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Firma Responsable', 47.5, finalY + 5, { align: 'center' });
        doc.text('Firma Cliente / Recepción', 147.5, finalY + 5, { align: 'center' });
        
        doc.setFontSize(7);
        doc.text(`${isPrintOrder ? 'Orden' : 'Reporte'} generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 285, { align: 'center' });

        const pdfOutput = doc.output('arraybuffer');
        const sanitizedClient = (task.client || 'Sin_Cliente').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
        const taskDateStr = task.date ? format(new Date(task.date + 'T12:00:00'), 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy');
        const fileName = `${isPrintOrder ? 'Orden' : 'Reporte'}_OP_${task.opNumber || 'S-OP'}_${taskDateStr}_${sanitizedClient}.pdf`;
        
        if (isElectron) {
            await (window as any).electronAPI.invoke('save-file', {
                content: pdfOutput,
                fileName: fileName,
                extension: 'pdf'
            });
        } else {
            const blob = new Blob([pdfOutput], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            sileo.success({ title: `${isPrintOrder ? 'Orden' : 'Reporte'} descargado` });
        }
    } catch (error) {
        console.error('Error in exportTaskToPDF:', error);
        throw error;
    }
};

/**
 * Fetches a remote URL and converts it to a base64 data URI.
 */
const fetchAsDataURL = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Returns true if the URL is likely an image based on extension or mime-like pattern.
 */
const isImageUrl = (url: string): boolean => {
    const clean = url.split('?')[0].toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(clean);
};

/**
 * Recursively normalizes string values in an object or array to Unicode NFC form.
 * This fixes spacing/rendering issues in PDFs for text inputted on macOS/iOS (which uses NFD).
 */
const normalizeToNFC = <T>(val: T): T => {
    if (typeof val === 'string') {
        return val.normalize('NFC') as unknown as T;
    }
    if (Array.isArray(val)) {
        return val.map(item => normalizeToNFC(item)) as unknown as T;
    }
    if (val && typeof val === 'object') {
        const obj = {} as any;
        for (const key in val) {
            if (Object.prototype.hasOwnProperty.call(val, key)) {
                obj[key] = normalizeToNFC(val[key]);
            }
        }
        return obj as T;
    }
    return val;
};

interface TextSegment {
    text: string;
    bold: boolean;
    italic: boolean;
}

interface CharStyle {
    bold: boolean;
    italic: boolean;
}

const normalizeUnicodeFormatting = (text: string): string => {
    if (!text) return '';
    const nfcText = text.normalize('NFC');
    let result = '';
    for (let i = 0; i < nfcText.length; i++) {
        const code = nfcText.codePointAt(i);
        if (code === undefined) continue;
        
        if (code > 0xFFFF) {
            i++; // Skip surrogate pair
            
            // Mathematical Bold Capital (A-Z)
            if (code >= 0x1D400 && code <= 0x1D419) {
                result += String.fromCodePoint(code - 0x1D400 + 0x41);
            }
            // Mathematical Bold Lowercase (a-z)
            else if (code >= 0x1D41A && code <= 0x1D433) {
                result += String.fromCodePoint(code - 0x1D41A + 0x61);
            }
            // Mathematical Italic Capital (A-Z)
            else if (code >= 0x1D434 && code <= 0x1D44D) {
                result += String.fromCodePoint(code - 0x1D434 + 0x41);
            }
            // Mathematical Italic Lowercase (a-z)
            else if (code >= 0x1D44E && code <= 0x1D467) {
                result += String.fromCodePoint(code - 0x1D44E + 0x61);
            }
            // Mathematical Bold Italic Capital (A-Z)
            else if (code >= 0x1D468 && code <= 0x1D481) {
                result += String.fromCodePoint(code - 0x1D468 + 0x41);
            }
            // Mathematical Bold Italic Lowercase (a-z)
            else if (code >= 0x1D482 && code <= 0x1D49B) {
                result += String.fromCodePoint(code - 0x1D482 + 0x61);
            }
            // Sans-serif Bold Capital (A-Z)
            else if (code >= 0x1D5D4 && code <= 0x1D5ED) {
                result += String.fromCodePoint(code - 0x1D5D4 + 0x41);
            }
            // Sans-serif Bold Lowercase (a-z)
            else if (code >= 0x1D5EE && code <= 0x1D607) {
                result += String.fromCodePoint(code - 0x1D5EE + 0x61);
            }
            // Sans-serif Italic Capital (A-Z)
            else if (code >= 0x1D608 && code <= 0x1D621) {
                result += String.fromCodePoint(code - 0x1D608 + 0x41);
            }
            // Sans-serif Italic Lowercase (a-z)
            else if (code >= 0x1D622 && code <= 0x1D63B) {
                result += String.fromCodePoint(code - 0x1D622 + 0x61);
            }
            // Sans-serif Bold Italic Capital (A-Z)
            else if (code >= 0x1D63C && code <= 0x1D655) {
                result += String.fromCodePoint(code - 0x1D63C + 0x41);
            }
            // Sans-serif Bold Italic Lowercase (a-z)
            else if (code >= 0x1D656 && code <= 0x1D66F) {
                result += String.fromCodePoint(code - 0x1D656 + 0x61);
            }
            // Monospace Capital (A-Z)
            else if (code >= 0x1D670 && code <= 0x1D689) {
                result += String.fromCodePoint(code - 0x1D670 + 0x41);
            }
            // Monospace Lowercase (a-z)
            else if (code >= 0x1D68A && code <= 0x1D6A3) {
                result += String.fromCodePoint(code - 0x1D68A + 0x61);
            }
            else {
                result += String.fromCodePoint(code);
            }
        } else {
            result += String.fromCharCode(code);
        }
    }
    return result;
};

const parseRichText = (text: string): TextSegment[] => {
    const segments: TextSegment[] = [];
    let i = 0;
    
    while (i < text.length) {
        if (text.startsWith('**', i)) {
            const closeIdx = text.indexOf('**', i + 2);
            if (closeIdx !== -1) {
                segments.push({
                    text: text.substring(i + 2, closeIdx),
                    bold: true,
                    italic: false
                });
                i = closeIdx + 2;
                continue;
            }
        } else if (text.startsWith('*', i)) {
            const closeIdx = text.indexOf('*', i + 1);
            if (closeIdx !== -1) {
                segments.push({
                    text: text.substring(i + 1, closeIdx),
                    bold: false,
                    italic: true
                });
                i = closeIdx + 1;
                continue;
            }
        }
        
        let nextMarker = text.length;
        const nextBold = text.indexOf('**', i + 1);
        const nextItalic = text.indexOf('*', i + 1);
        
        if (nextBold !== -1 && nextBold < nextMarker) nextMarker = nextBold;
        if (nextItalic !== -1 && nextItalic < nextMarker) nextMarker = nextItalic;
        
        segments.push({
            text: text.substring(i, nextMarker),
            bold: false,
            italic: false
        });
        i = nextMarker;
    }
    
    return segments.filter(s => s.text.length > 0);
};

const wrapRichText = (doc: any, text: string, maxWidth: number, fontSize: number): TextSegment[][] => {
    const normalizedText = normalizeUnicodeFormatting(text);
    const paragraphs = normalizedText.split('\n');
    const wrappedLines: TextSegment[][] = [];
    
    doc.setFontSize(fontSize);
    
    for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') {
            wrappedLines.push([{ text: '', bold: false, italic: false }]);
            continue;
        }
        
        const segments = parseRichText(paragraph);
        let plainText = '';
        const charStyles: CharStyle[] = [];
        
        for (const seg of segments) {
            plainText += seg.text;
            for (let j = 0; j < seg.text.length; j++) {
                charStyles.push({ bold: seg.bold, italic: seg.italic });
            }
        }
        
        doc.setFont('helvetica', 'normal');
        const wrappedLinesText: string[] = doc.splitTextToSize(plainText, maxWidth);
        
        let charIdx = 0;
        for (let i = 0; i < wrappedLinesText.length; i++) {
            const lineText = wrappedLinesText[i];
            const lineSegments: TextSegment[] = [];
            let currentSegText = '';
            let currentSegBold = false;
            let currentSegItalic = false;
            
            for (let j = 0; j < lineText.length; j++) {
                const style = charStyles[charIdx] || { bold: false, italic: false };
                
                if (j === 0) {
                    currentSegText = lineText[j];
                    currentSegBold = style.bold;
                    currentSegItalic = style.italic;
                } else if (style.bold === currentSegBold && style.italic === currentSegItalic) {
                    currentSegText += lineText[j];
                } else {
                    lineSegments.push({
                        text: currentSegText,
                        bold: currentSegBold,
                        italic: currentSegItalic
                    });
                    currentSegText = lineText[j];
                    currentSegBold = style.bold;
                    currentSegItalic = style.italic;
                }
                
                charIdx++;
            }
            
            if (currentSegText.length > 0) {
                lineSegments.push({
                    text: currentSegText,
                    bold: currentSegBold,
                    italic: currentSegItalic
                });
            }
            
            wrappedLines.push(lineSegments);
            
            const nextLine = wrappedLinesText[i + 1];
            if (nextLine && nextLine.length > 0) {
                const firstCharOfNextLine = nextLine[0];
                while (charIdx < plainText.length && plainText[charIdx] !== firstCharOfNextLine) {
                    charIdx++;
                }
            }
        }
    }
    
    return wrappedLines;
};

const drawRichText = (
    doc: any,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number,
    lineHeight: number,
    color: [number, number, number]
): number => {
    const lines = wrapRichText(doc, text, maxWidth, fontSize);
    let currentY = y;
    
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    
    for (const line of lines) {
        let currentX = x;
        for (const seg of line) {
            const style = seg.bold ? 'bold' : (seg.italic ? 'italic' : 'normal');
            doc.setFont('helvetica', style);
            doc.text(seg.text, currentX, currentY);
            currentX += doc.getTextWidth(seg.text);
        }
        currentY += lineHeight;
    }
    
    return lines.length * lineHeight;
};

/**
 * Generates and downloads a complete PDF summary of a Production Order,
 * including all fields and embedded image attachments.
 */
export const printOrderSummaryPDF = async (order: any): Promise<void> => {
    order = normalizeToNFC(order);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentW = pageW - margin * 2;

    // ─── Color Palette ───────────────────────────────────────────────
    const navy = [10, 22, 45] as [number, number, number];
    const blue = [37, 99, 235] as [number, number, number];
    const light = [241, 245, 249] as [number, number, number];
    const muted = [100, 116, 139] as [number, number, number];
    const white: [number, number, number] = [255, 255, 255];

    let y = 0;

    const checkPage = (needed: number) => {
        if (y + needed > pageH - margin) {
            doc.addPage();
            y = margin;
        }
    };

    // ─── Header Banner ────────────────────────────────────────────────
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageW, 38, 'F');

    doc.setFillColor(...blue);
    doc.rect(0, 38, pageW, 2, 'F');

    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('PUBLICARTEL', margin, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...light);
    doc.text('RESUMEN DE ORDEN DE PRODUCCIÓN', margin, 24);

    // OP number top-right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...blue);
    const opText = `OP #${order.opNumber}`;
    const opWidth = doc.getTextWidth(opText);
    doc.text(opText, pageW - margin - opWidth, 22);

    // Date top-right small
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...light);
    const dateText = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageW - margin - dateWidth, 30);

    y = 50;

    // ─── Status Badge ─────────────────────────────────────────────────
    const s = order.status || 'Gestión de Acopio';
    let statusColor: [number, number, number] = muted;
    if (s === 'Gestión de Acopio') statusColor = [245, 158, 11];
    if (s === 'En Proceso') statusColor = [59, 130, 246];
    if (s === 'Para Facturar') statusColor = [16, 185, 129];

    doc.setFillColor(...statusColor);
    doc.roundedRect(margin, y - 4, 42, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...white);
    doc.text(s.toUpperCase(), margin + 3, y + 1.2);

    // Category badge
    doc.setFillColor(...light);
    doc.roundedRect(margin + 46, y - 4, 32, 8, 2, 2, 'F');
    doc.setTextColor(...muted);
    doc.text((order.category || 'Sin categoría').toUpperCase(), margin + 49, y + 1.2);

    y += 12;

    // ─── Main Info Grid ───────────────────────────────────────────────
    const labelFn = (label: string, val: string, lx: number, vy: number, valColor?: [number, number, number]) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...muted);
        doc.text(label.toUpperCase(), lx, vy);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...(valColor || navy));
        doc.text(val || '—', lx, vy + 6);
    };

    const col1 = margin;
    const col2 = margin + contentW / 2 + 4;

    labelFn('CLIENTE', order.client, col1, y);
    labelFn('VENDEDOR', order.seller, col2, y);
    y += 18;

    labelFn('DIRECCIÓN', order.address || 'No especificada', col1, y);
    y += 20;

    // ─── Separator ────────────────────────────────────────────────────
    doc.setDrawColor(...blue);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    // ─── Description ─────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text('DESCRIPCIÓN DEL PROYECTO', margin, y);
    y += 5;

    const descText = order.description || 'Sin descripción.';
    const lines = wrapRichText(doc, descText, contentW - 8, 10);
    const descBlockH = lines.length * 5 + 6;

    checkPage(descBlockH + 10);

    doc.setFillColor(...light);
    doc.rect(margin, y, contentW, descBlockH, 'F');
    drawRichText(doc, descText, margin + 4, y + 5, contentW - 8, 10, 5, navy);
    y += descBlockH + 10;

    // ─── Comments ───────────────────────────────────────────────────
    const comments = order.comments || [];
    if (comments.length > 0) {
        checkPage(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...muted);
        doc.text('COMENTARIOS DEL USUARIO', margin, y);
        y += 5;

        comments.forEach((c: any) => {
            const dateStr = format(new Date(c.date), "dd/MM/yyyy HH:mm", { locale: es });
            const commentText = `${c.text}`;
            const commentLines = doc.splitTextToSize(commentText, contentW - 35);
            const blockH = Math.max(commentLines.length * 4 + 4, 10);
            
            checkPage(blockH + 2);
            
            // Date column
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(...blue);
            doc.text(dateStr, margin, y + 5);
            
            // Text column
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...navy);
            doc.text(commentLines, margin + 30, y + 5);
            
            doc.setDrawColor(...light);
            doc.setLineWidth(0.1);
            doc.line(margin, y + blockH, pageW - margin, y + blockH);
            
            y += blockH;
        });
        y += 5;
    }

    // ─── Attachments ─────────────────────────────────────────────────
    const files: string[] = order.files || [];
    if (files.length > 0) {
        checkPage(16);
        doc.setDrawColor(...blue);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageW - margin, y);
        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...muted);
        doc.text(`ARCHIVOS ADJUNTOS (${files.length})`, margin, y);
        y += 7;

        for (let i = 0; i < files.length; i++) {
            const fileUrl = files[i];
            const fileName = fileUrl.split('/').pop()?.split('?')[0] || `Archivo ${i + 1}`;

            if (isImageUrl(fileUrl)) {
                // Try to embed image
                checkPage(80);
                try {
                    const dataUrl = await fetchAsDataURL(fileUrl);
                    const ext = fileName.split('.').pop()?.toLowerCase() || 'jpeg';
                    const imgFormat = ext === 'webp' ? 'JPEG' : ext.toUpperCase();

                    // Label
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(...muted);
                    doc.text(`IMAGEN ${i + 1}`, margin, y);
                    y += 4;

                    // Fit image to width, max height 100mm
                    const maxW = contentW;
                    const maxH = 100;

                    // Get natural dimensions via Image element
                    const img = new Image();
                    img.src = dataUrl;
                    await new Promise(res => { img.onload = res; img.onerror = res; });

                    const natW = img.naturalWidth || 800;
                    const natH = img.naturalHeight || 600;
                    const ratio = natW / natH;
                    let iW = maxW;
                    let iH = iW / ratio;
                    if (iH > maxH) { iH = maxH; iW = iH * ratio; }

                    checkPage(iH + 6);
                    doc.addImage(dataUrl, imgFormat === 'WEBP' ? 'JPEG' : imgFormat, margin, y, iW, iH);
                    y += iH + 8;
                } catch {
                    // If image fails, show as link text
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(59, 130, 246);
                    doc.text(`[Imagen ${i + 1}] (no se pudo incrustar)`, margin, y);
                    y += 7;
                }
            } else {
                // PDF / other file — show as clickable link row
                checkPage(12);
                doc.setFillColor(...light);
                doc.rect(margin, y - 3, contentW, 10, 'F');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(...navy);
                doc.text(`📄 ${fileName}`, margin + 3, y + 3.5);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(59, 130, 246);
                const linkLabel = 'Abrir archivo →';
                const linkW = doc.getTextWidth(linkLabel);
                doc.text(linkLabel, pageW - margin - linkW, y + 3.5);
                doc.link(pageW - margin - linkW - 2, y - 3, linkW + 4, 10, { url: fileUrl });

                y += 13;
            }
        }
    }

    // ─── Footer ───────────────────────────────────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFillColor(...navy);
        doc.rect(0, pageH - 10, pageW, 10, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...muted);
        doc.text(`PUBLICARTEL — Generado el ${dateText}`, margin, pageH - 4);
        doc.setTextColor(...white);
        doc.text(`Pág. ${p} / ${totalPages}`, pageW - margin - 14, pageH - 4);
    }

    // ─── Save ──────────────────────────────────────────────────────────
    doc.save(`OP_${order.opNumber}_${order.client.replace(/\s+/g, '_')}.pdf`);
    sileo.success({ title: 'Resumen PDF generado', description: `OP #${order.opNumber}` });
};

