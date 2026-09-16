const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'OrdersPage.tsx');
let code = fs.readFileSync(filePath, 'utf8');

if (!code.includes("section === 'Carpintería'")) {
    code = code.replace(
        "else if (section === 'Herrería') { letter = 'H'; colorClass = 'bg-orange-400/10 text-orange-400 border-orange-400/20 hover:bg-orange-400/20'; }",
        "else if (section === 'Herrería') { letter = 'H'; colorClass = 'bg-orange-400/10 text-orange-400 border-orange-400/20 hover:bg-orange-400/20'; }\n                                                             else if (section === 'Carpintería') { letter = 'CP'; colorClass = 'bg-amber-400/10 text-amber-400 border-amber-400/20 hover:bg-amber-400/20'; }"
    );
}

if (!code.includes("task.section === 'Carpintería'")) {
    code = code.replace(
        "if (task.section === 'Herrería') badgeColor = 'text-orange-600 bg-orange-400/10 border-orange-400/20 dark:text-orange-400 dark:bg-orange-400/10 dark:border-orange-400/20';",
        "if (task.section === 'Herrería') badgeColor = 'text-orange-600 bg-orange-400/10 border-orange-400/20 dark:text-orange-400 dark:bg-orange-400/10 dark:border-orange-400/20';\n                                                 if (task.section === 'Carpintería') badgeColor = 'text-amber-600 bg-amber-400/10 border-amber-400/20 dark:text-amber-400 dark:bg-amber-400/10 dark:border-amber-400/20';"
    );
}

if (!code.includes('<option value="Carpintería">Carpintería</option>')) {
    code = code.replace(
        '<option value="Herrería">Herrería</option>',
        '<option value="Herrería">Herrería</option>\n                                                         <option value="Carpintería">Carpintería</option>'
    );
}

if (!code.includes("carpinteria: 'Carpintería'")) {
    code = code.replace(
        "herreria: 'Herrería',",
        "herreria: 'Herrería',\n                                                             carpinteria: 'Carpintería',"
    );
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('OrdersPage.tsx updated successfully');
