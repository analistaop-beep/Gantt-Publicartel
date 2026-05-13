import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Exports data to an Excel-compatible XLS file using an HTML table.
 */
export const exportToExcel = (headers: string[], rows: any[][], filename: string) => {
    // ... (existing implementation)
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
    const doc = new jsPDF();
    const logoData = await (window as any).electronAPI.invoke('get-logo');
    
    // Institutional Colors
    const primaryColor = [15, 23, 42]; // #0f172a (Dark Blue)
    const accentColor = [37, 99, 235];  // #2563eb (Blue)
    
    // Header with Logo
    if (logoData) {
        doc.addImage(logoData, 'PNG', 15, 10, 40, 15);
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('ORDEN DE TRABAJO', 195, 20, { align: 'right' });
    
    doc.setFontSize(14);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`OP: ${task.opNumber}`, 195, 28, { align: 'right' });
    
    // Horizontal Line
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 35, 195, 35);
    
    // Task Details Section
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    
    const detailsY = 45;
    doc.text('CLIENTE:', 15, detailsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(task.client || 'N/A', 45, detailsY);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('TRABAJO:', 15, detailsY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(task.name || 'N/A', 45, detailsY + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('DIRECCIÓN:', 15, detailsY + 16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(task.address || 'S/D', 45, detailsY + 16);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('FECHA:', 15, detailsY + 24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    const taskDate = task.date ? format(new Date(task.date + 'T12:00:00'), 'eeee d \'de\' MMMM, yyyy', { locale: es }) : 'Pendiente';
    doc.text(taskDate, 45, detailsY + 24);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('SECCIÓN:', 130, detailsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(task.section || 'Instalaciones', 155, detailsY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('HORAS:', 130, detailsY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`${task.totalHours}h`, 155, detailsY + 8);
    
    // Members Table
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
    
    // Vehicles
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
            headStyles: { fillColor: [100, 116, 139], textColor: 255 },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 15, right: 15 }
        });
    }
    
    // Sub-tasks
    const additionalJobs = (task.additionalJobs || []).map((j: any) => [j.description || '', j.client || '']);
    if (additionalJobs.length > 0) {
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Tareas Adicionales', 'Referencia']],
            body: additionalJobs,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], textColor: 255 },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 15, right: 15 }
        });
    }
    
    // Footer / Signature
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

    // Save using Electron Dialog
    const pdfOutput = doc.output('arraybuffer');
    const fileName = `Reporte_OP_${task.opNumber}_${task.client.replace(/\s+/g, '_')}.pdf`;
    
    await (window as any).electronAPI.invoke('save-file', {
        content: pdfOutput,
        fileName: fileName,
        extension: 'pdf'
    });
};
