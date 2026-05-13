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
export const exportTaskToPDF = async (task: any, members: any[], vehicles: any[]) => {
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
        doc.text('ORDEN DE TRABAJO', 195, 20, { align: 'right' });
        
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
        
        const taskMembers = (task.members || []).map((m: any) => {
            const memberInfo = members.find(mem => mem.id === (typeof m === 'string' ? m : m.id));
            return [
                memberInfo?.name || 'Desconocido',
                memberInfo?.role || 'Operario',
                `${typeof m === 'object' ? m.hours : 8}h`
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
        
        const finalY = (doc as any).lastAutoTable.finalY + 30;
        doc.setDrawColor(200);
        doc.line(15, finalY, 80, finalY);
        doc.line(115, finalY, 180, finalY);
        
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Firma Responsable', 47.5, finalY + 5, { align: 'center' });
        doc.text('Firma Cliente / Recepción', 147.5, finalY + 5, { align: 'center' });
        
        doc.setFontSize(7);
        doc.text(`Reporte generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 285, { align: 'center' });

        const pdfOutput = doc.output('arraybuffer');
        const sanitizedClient = (task.client || 'Sin_Cliente').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
        const fileName = `Reporte_OP_${task.opNumber || 'S-OP'}_${sanitizedClient}.pdf`;
        
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
            sileo.success({ title: 'Reporte descargado' });
        }
    } catch (error) {
        console.error('Error in exportTaskToPDF:', error);
        throw error;
    }
};
