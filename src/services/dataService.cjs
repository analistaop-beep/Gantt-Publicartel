const db = require('../database/db.cjs');
const { v4: uuidv4 } = require('uuid');

const LIMIT = 8.0;

const getNextWorkingDay = (dateStr) => {
    let date = new Date(dateStr + 'T12:00:00');
    do {
        date.setDate(date.getDate() + 1);
    } while (date.getDay() === 0 || date.getDay() === 6);
    return date.toISOString().split('T')[0];
};

const isWeekend = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.getDay() === 0 || date.getDay() === 6;
};

const Services = {
    // Members
    getMembers: () => db.prepare('SELECT * FROM members').all(),
    addMember: (member) => {
        const id = uuidv4();
        db.prepare('INSERT INTO members (id, name, role, sector) VALUES (?, ?, ?, ?)')
            .run(id, member.name, member.role, member.sector || null);
        return id;
    },
    updateMember: (member) => {
        db.prepare('UPDATE members SET name = ?, role = ?, sector = ? WHERE id = ?')
            .run(member.name, member.role, member.sector || null, member.id);
    },
    deleteMember: (id) => db.prepare('DELETE FROM members WHERE id = ?').run(id),

    // Vehicles
    getVehicles: () => db.prepare('SELECT * FROM vehicles').all(),
    addVehicle: (vehicle) => {
        const id = uuidv4();
        db.prepare('INSERT INTO vehicles (id, name, plate) VALUES (?, ?, ?)')
            .run(id, vehicle.name, vehicle.plate);
        return id;
    },
    updateVehicle: (vehicle) => {
        db.prepare('UPDATE vehicles SET name = ?, plate = ? WHERE id = ?')
            .run(vehicle.name, vehicle.plate, vehicle.id);
    },
    deleteVehicle: (id) => db.prepare('DELETE FROM vehicles WHERE id = ?').run(id),

    // Teams
    getTeams: () => db.prepare('SELECT * FROM teams').all(),

    // Tasks & Validation
    getTasks: (type = 'instalacion') => {
        const tasks = db.prepare("SELECT * FROM tasks WHERE COALESCE(type, 'instalacion') = ?").all(type);
        return tasks.map(task => ({
            ...task,
            members: db.prepare('SELECT memberId as id, hours FROM task_members WHERE taskId = ?').all(task.id),
            vehicles: db.prepare('SELECT vehicleId FROM task_vehicles WHERE taskId = ?').all(task.id).map(v => v.vehicleId),
            additionalJobs: JSON.parse(task.additionalJobs || '[]')
        }));
    },

    calculateDailyHours: (teamId, date, excludeTaskId = null) => {
        let query = 'SELECT SUM(duration) as total FROM tasks WHERE teamId = ? AND date = ?';
        let params = [teamId, date];
        if (excludeTaskId) {
            query += " AND id != ?";
            params.push(excludeTaskId);
        }
        const result = db.prepare(query).get(...params);
        return result.total || 0;
    },

    calculateMemberHours: (memberId, date, excludeTaskId = null) => {
        let query = `
            SELECT SUM(tm.hours) as total 
            FROM tasks t
            JOIN task_members tm ON t.id = tm.taskId
            WHERE tm.memberId = ? AND t.date = ?
        `;
        let params = [memberId, date];
        if (excludeTaskId) {
            query += " AND t.id != ?";
            params.push(excludeTaskId);
        }
        const result = db.prepare(query).get(...params);
        return result.total || 0;
    },

    calculateVehicleHours: (vehicleId, date, excludeTaskId = null) => {
        if (!vehicleId) return 0;
        let query = `
            SELECT SUM(t.duration) as total 
            FROM tasks t
            JOIN task_vehicles tv ON t.id = tv.taskId
            WHERE tv.vehicleId = ? AND t.date = ?
        `;
        let params = [vehicleId, date];
        if (excludeTaskId) {
            query += " AND t.id != ?";
            params.push(excludeTaskId);
        }
        const result = db.prepare(query).get(...params);
        return result.total || 0;
    },

    getVehicleTeamOnDate: (vehicleId, date, excludeTaskId = null) => {
        if (!vehicleId) return null;
        let query = `
            SELECT t.teamId 
            FROM tasks t
            JOIN task_vehicles tv ON t.id = tv.taskId
            WHERE tv.vehicleId = ? AND t.date = ?
        `;
        let params = [vehicleId, date];
        if (excludeTaskId) {
            query += " AND t.id != ?";
            params.push(excludeTaskId);
        }
        const result = db.prepare(query).get(...params);
        return result ? result.teamId : null;
    },

    addTask: (task) => {
        const id = uuidv4();
        const groupId = task.groupId || id;
        const additionalJobsStr = JSON.stringify(task.additionalJobs || []);
        const taskType = task.type || 'instalacion';

        // Direct insertion without splitting or validation
        db.transaction((taskData) => {
            db.prepare('INSERT INTO tasks (id, opNumber, name, client, address, date, totalHours, duration, teamId, groupId, additionalJobs, type, section) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .run(id, taskData.opNumber ?? "", taskData.name ?? "", taskData.client ?? "", taskData.address ?? "", taskData.date ?? "", taskData.totalHours ?? 0, taskData.duration ?? 0, taskData.teamId ?? null, groupId, additionalJobsStr, taskType, taskData.section ?? 'Instalaciones');

            if (taskData.members && taskData.members.length > 0) {
                const insertMember = db.prepare('INSERT INTO task_members (taskId, memberId, hours) VALUES (?, ?, ?)');
                for (const memberObj of taskData.members) {
                    const memberId = typeof memberObj === 'string' ? memberObj : memberObj.id;
                    const hours = typeof memberObj === 'object' ? (memberObj.hours ?? 8) : 8;
                    if (memberId) {
                        insertMember.run(id, memberId, hours);
                    }
                }
            }

            if (taskData.vehicles && taskData.vehicles.length > 0) {
                const insertVehicle = db.prepare('INSERT INTO task_vehicles (taskId, vehicleId) VALUES (?, ?)');
                for (const vehicleId of taskData.vehicles) {
                    insertVehicle.run(id, vehicleId);
                }
            }
        })(task);

        return id;
    },

    updateTask: (task) => {
        const additionalJobsStr = JSON.stringify(task.additionalJobs || []);

        db.transaction((taskData) => {
            // Update the task basic info
            db.prepare('UPDATE tasks SET opNumber = ?, name = ?, client = ?, address = ?, date = ?, totalHours = ?, duration = ?, teamId = ?, additionalJobs = ?, section = ? WHERE id = ?')
                .run(taskData.opNumber ?? "", taskData.name ?? "", taskData.client ?? "", taskData.address ?? "", taskData.date ?? "", taskData.totalHours ?? 0, taskData.duration ?? 0, taskData.teamId ?? null, additionalJobsStr, taskData.section ?? 'Instalaciones', taskData.id);

            // Update members for this specific task
            db.prepare('DELETE FROM task_members WHERE taskId = ?').run(taskData.id);
            if (taskData.members && taskData.members.length > 0) {
                const insertMember = db.prepare('INSERT INTO task_members (taskId, memberId, hours) VALUES (?, ?, ?)');
                for (const memberObj of taskData.members) {
                    const memberId = typeof memberObj === 'string' ? memberObj : memberObj.id;
                    const hours = typeof memberObj === 'object' ? (memberObj.hours ?? 8) : 8;
                    if (memberId) {
                        insertMember.run(taskData.id, memberId, hours);
                    }
                }
            }

            // Update vehicles for this specific task
            db.prepare('DELETE FROM task_vehicles WHERE taskId = ?').run(taskData.id);
            if (taskData.vehicles && taskData.vehicles.length > 0) {
                const insertVehicle = db.prepare('INSERT INTO task_vehicles (taskId, vehicleId) VALUES (?, ?)');
                for (const vehicleId of taskData.vehicles) {
                    insertVehicle.run(taskData.id, vehicleId);
                }
            }
        })(task);
    },

    deleteTask: (id) => {
        db.transaction(() => {
            db.prepare('DELETE FROM task_members WHERE taskId = ?').run(id);
            db.prepare('DELETE FROM task_vehicles WHERE taskId = ?').run(id);
            db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
        })();
    },

    clearTasksByDateRange: (startDate, endDate, type = 'instalacion') => {
        const tasksToDelete = db.prepare('SELECT id, groupId FROM tasks WHERE date >= ? AND date <= ? AND type = ?').all(startDate, endDate, type);
        if (tasksToDelete.length === 0) return;

        db.transaction(() => {
            for (const task of tasksToDelete) {
                db.prepare('DELETE FROM task_members WHERE taskId = ?').run(task.id);
                db.prepare('DELETE FROM task_vehicles WHERE taskId = ?').run(task.id);
                db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
            }
        })();
    },

    resetDatabase: () => {
        db.transaction(() => {
            db.prepare('DELETE FROM task_members').run();
            db.prepare('DELETE FROM task_vehicles').run();
            db.prepare('DELETE FROM tasks').run();
        })();
    },

    // Reminders
    getReminders: () => db.prepare('SELECT * FROM reminders').all(),
    addReminder: (reminder) => {
        const id = uuidv4();
        db.prepare('INSERT INTO reminders (id, opNumber, name, client, address, totalHours) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id, reminder.opNumber, reminder.name, reminder.client, reminder.address, reminder.totalHours);
        return id;
    },
    updateReminder: (reminder) => {
        db.prepare('UPDATE reminders SET opNumber = ?, name = ?, client = ?, address = ?, totalHours = ? WHERE id = ?')
            .run(reminder.opNumber, reminder.name, reminder.client, reminder.address, reminder.totalHours, reminder.id);
    },
    deleteReminder: (id) => db.prepare('DELETE FROM reminders WHERE id = ?').run(id),
};

module.exports = Services;
