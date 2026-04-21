const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'gantt.db');
const db = new Database(dbPath);

const tables = ['members', 'vehicles', 'teams', 'tasks', 'task_members', 'task_vehicles', 'reminders'];
const output = {};

tables.forEach(table => {
    try {
        const rows = db.prepare(`SELECT * FROM ${table}`).all();
        output[table] = rows;
    } catch (e) {
        console.warn(`Table ${table} not found or empty.`);
    }
});

fs.writeFileSync(path.join(__dirname, '..', 'data_dump.json'), JSON.stringify(output, null, 2));
console.log('Data dumped to data_dump.json');
db.close();
