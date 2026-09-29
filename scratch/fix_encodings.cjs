const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/OrdersPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const lineFixes = {
  705: "            XLSX.utils.book_append_sheet(workbook, worksheet, 'Órdenes de Producción');",
  984: "                                Órdenes de Producción",
  1058: "                                            <p className=\"text-xs text-slate-400\">Resumen de Órdenes de Producción</p>",
  1093: "                                        <p className=\"text-[11px] text-slate-500\">Sin filtro — se exportarán todas las órdenes visibles.</p>",
  1392: "                                {isEditing ? 'EDITAR ORDEN DE PRODUCCIÓN' : 'NUEVA ORDEN DE PRODUCCIÓN'}",
  1743: "                                                <span className=\"text-[10px] text-slate-500\">Imágenes · WebP · PDF · Excel (.xls, .xlsx)</span>",
  1860: "                                    ORDEN DE PRODUCCIÓN",
  1885: "                                            title=\"OP anterior (←)\"",
  1896: "                                            title=\"OP siguiente (→)\"",
  1915: "                                    <label className=\"text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-0.5\">DIRECCIÓN</label>",
  2004: "                        {/* Body — two columns */}",
  2013: "                                    <label className=\"text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-3\">DESCRIPCIÓN DEL PROYECTO</label>",
  2485: "                            <span>ℹ️ <strong>Visor Microsoft Office Web:</strong> Visualización exacta con formatos de celda, colores, fuentes, anchos de columna y solapas en la parte inferior.</span>",
  2520: "                                title=\"Anterior (←)\"",
  2540: "                                title=\"Siguiente (→)\"",
  2618: "                                                    <label className=\"text-[9px] font-black uppercase tracking-widest text-slate-500 block\">SECCIÓN</label>",
  2645: "                                                <label className=\"text-[9px] font-black uppercase tracking-widest text-slate-500 block\">DESCRIPCIÓN / TAREA</label>",
  2668: "                                                    <label className=\"text-[9px] font-black uppercase tracking-widest text-slate-500 block\">DIRECCIÓN</label>",
  2741: "                                                                            {isOver ? `+${(realHoursComputed - estimated).toFixed(1)} sobre` : isUnder ? `-${(estimated - realHoursComputed).toFixed(1)} faltan` : '✓ OK'}",
  2898: "                                Etiquetar Usuarios — OP {isTaggingOrder.opNumber}"
};

let count = 0;
for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  if (lineFixes[lineNum]) {
    lines[i] = lineFixes[lineNum];
    count++;
  }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log(`Updated ${count} lines in OrdersPage.tsx`);
