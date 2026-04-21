const Database = require('better-sqlite3');
const path = require('path');
const db = new Database('gantt.db');

console.log("--- TEAMS ---");
console.log(db.prepare('SELECT * FROM teams').all());

console.log("\n--- TASKS ---");
console.log(db.prepare('SELECT * FROM tasks').all());

console.log("\n--- MEMBERS ---");
console.log(db.prepare('SELECT * FROM members').all());
