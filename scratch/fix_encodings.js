const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/OrdersPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace corrupted character patterns (U+FFFD + U+001C, control chars, etc.)
content = content.replace(/\uFFFD\s*rdenes/g, 'Órdenes');
content = content.replace(/\u001crdenes/g, 'Órdenes');
content = content.replace(/PRODUCCI\uFFFD\s*N/g, 'PRODUCCIÓN');
content = content.replace(/PRODUCCI\u001cN/g, 'PRODUCCIÓN');
content = content.replace(/DIRECCI\uFFFD\s*N/g, 'DIRECCIÓN');
content = content.replace(/DIRECCI\u001cN/g, 'DIRECCIÓN');
content = content.replace(/SECCI\uFFFD\s*N/g, 'SECCIÓN');
content = content.replace(/SECCI\u001cN/g, 'SECCIÓN');
content = content.replace(/DESCRIPCI\uFFFD\s*N/g, 'DESCRIPCIÓN');
content = content.replace(/DESCRIPCI\u001cN/g, 'DESCRIPCIÓN');

// Specific line fixes
content = content.replace(/Sin filtro [\uFFFD\u001d\s]+ se exportarán/g, 'Sin filtro — se exportarán');
content = content.replace(/Imágenes [\uFFFD\u001d\s]+ WebP/g, 'Imágenes · WebP');
content = content.replace(/title="OP anterior \([\uFFFD\u001d\u001c\s]+\)"/g, 'title="OP anterior (←)"');
content = content.replace(/title="OP siguiente \([\uFFFD\u001d\u001c\s]+\)"/g, 'title="OP siguiente (→)"');
content = content.replace(/\{\/\* Body [\uFFFD\u001d\s]+ two columns \*\/\}/g, '{/* Body — two columns */}');
content = content.replace(/[\uFFFD\u001d\s]*xx[\uFFFD\u001d\s]* <strong>Visor Microsoft Office Web:<\/strong>/g, 'ℹ️ <strong>Visor Microsoft Office Web:</strong>');
content = content.replace(/title="Anterior \([\uFFFD\u001d\u001c\s]+\)"/g, 'title="Anterior (←)"');
content = content.replace(/title="Siguiente \([\uFFFD\u001d\u001c\s]+\)"/g, 'title="Siguiente (→)"');
content = content.replace(/: '[\uFFFD\u001d\s]*S\s*OK'/g, ": '✓ OK'");
content = content.replace(/Etiquetar Usuarios [\uFFFD\u001d\s]+ OP/g, 'Etiquetar Usuarios — OP');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Finished updating OrdersPage.tsx');
