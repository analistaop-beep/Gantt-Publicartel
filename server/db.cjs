const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'gantt.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    sector TEXT
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    plate TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    opNumber TEXT NOT NULL,
    name TEXT NOT NULL,
    client TEXT NOT NULL,
    address TEXT NOT NULL,
    date TEXT NOT NULL,
    totalHours REAL NOT NULL,
    duration REAL NOT NULL,
    teamId TEXT,
    vehicleId TEXT,
    type TEXT DEFAULT 'instalacion',
    FOREIGN KEY(teamId) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY(vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS task_members (
    taskId TEXT,
    memberId TEXT,
    PRIMARY KEY(taskId, memberId),
    FOREIGN KEY(taskId) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY(memberId) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_vehicles (
    taskId TEXT,
    vehicleId TEXT,
    PRIMARY KEY(taskId, vehicleId),
    FOREIGN KEY(taskId) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY(vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    opNumber TEXT NOT NULL,
    name TEXT NOT NULL,
    client TEXT NOT NULL,
    address TEXT NOT NULL,
    totalHours REAL NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS production_orders (
    id TEXT PRIMARY KEY,
    opNumber TEXT NOT NULL,
    client TEXT NOT NULL,
    seller TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    address TEXT,
    category TEXT,
    status TEXT,
    files TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrations
const ensureColumnExists = (table, column, typeDef) => {
  try {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.find(c => c.name === column)) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef}`).run();
      console.log(`Added column ${column} to table ${table}`);
    }
  } catch (e) {
    console.error(`Failed to ensure column ${column} in ${table}:`, e.message);
  }
};

ensureColumnExists('tasks', 'totalHours', 'REAL DEFAULT 0');
ensureColumnExists('tasks', 'vehicleId', 'TEXT');
ensureColumnExists('tasks', 'opNumber', 'TEXT DEFAULT ""');
ensureColumnExists('tasks', 'address', 'TEXT DEFAULT ""');
ensureColumnExists('tasks', 'client', 'TEXT DEFAULT ""');
ensureColumnExists('tasks', 'groupId', 'TEXT');
ensureColumnExists('tasks', 'additionalJobs', 'TEXT DEFAULT "[]"');
ensureColumnExists('tasks', 'type', "TEXT DEFAULT 'instalacion'");
ensureColumnExists('tasks', 'section', "TEXT DEFAULT 'Instalaciones'");
ensureColumnExists('members', 'sector', 'TEXT');
ensureColumnExists('task_members', 'hours', 'REAL DEFAULT 8');
ensureColumnExists('production_orders', 'category', 'TEXT');
ensureColumnExists('production_orders', 'status', 'TEXT');

// Backfill: set type = 'instalacion' for any tasks that still have NULL type
try {
  db.prepare("UPDATE tasks SET type = 'instalacion' WHERE type IS NULL").run();
} catch (e) {
  console.error('Failed to backfill task types:', e.message);
}

// Seed Teams if empty
try {
  const teams = db.prepare('SELECT count(*) as count FROM teams').get();
  if (teams.count === 0) {
    console.log('Seeding default teams...');
    const insert = db.prepare('INSERT INTO teams (id, name) VALUES (?, ?)');
    insert.run('1', 'Cuadrilla 1');
    insert.run('2', 'Cuadrilla 2');
    insert.run('3', 'Cuadrilla 3');
    insert.run('4', 'Taller');
  }
} catch (e) {
  console.error('Failed to seed teams:', e.message);
}

module.exports = db;
