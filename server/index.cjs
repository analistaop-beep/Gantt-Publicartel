const express = require('express');
const cors = require('cors');
const Services = require('./services.cjs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ── Members ──────────────────────────────────────────────
app.get('/api/members', (req, res) => {
    try { res.json(Services.getMembers()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/members', (req, res) => {
    try { const id = Services.addMember(req.body); res.json({ id }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/members/:id', (req, res) => {
    try { Services.updateMember({ ...req.body, id: req.params.id }); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/members/:id', (req, res) => {
    try { Services.deleteMember(req.params.id); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Vehicles ─────────────────────────────────────────────
app.get('/api/vehicles', (req, res) => {
    try { res.json(Services.getVehicles()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/vehicles', (req, res) => {
    try { const id = Services.addVehicle(req.body); res.json({ id }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/vehicles/:id', (req, res) => {
    try { Services.updateVehicle({ ...req.body, id: req.params.id }); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/vehicles/:id', (req, res) => {
    try { Services.deleteVehicle(req.params.id); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Teams ────────────────────────────────────────────────
app.get('/api/teams', (req, res) => {
    try { res.json(Services.getTeams()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Tasks ────────────────────────────────────────────────
app.get('/api/tasks', (req, res) => {
    try { const type = req.query.type || 'instalacion'; res.json(Services.getTasks(type)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks', (req, res) => {
    try { const id = Services.addTask(req.body); res.json({ id }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tasks/:id', (req, res) => {
    try { Services.updateTask({ ...req.body, id: req.params.id }); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tasks/:id', (req, res) => {
    try { Services.deleteTask(req.params.id); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks/clear-range', (req, res) => {
    try {
        const { startDate, endDate, type } = req.body;
        Services.clearTasksByDateRange(startDate, endDate, type);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks/reset', (req, res) => {
    try { Services.resetDatabase(); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Reminders ────────────────────────────────────────────
app.get('/api/reminders', (req, res) => {
    try { res.json(Services.getReminders()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reminders', (req, res) => {
    try { const id = Services.addReminder(req.body); res.json({ id }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/reminders/:id', (req, res) => {
    try { Services.updateReminder({ ...req.body, id: req.params.id }); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/reminders/:id', (req, res) => {
    try { Services.deleteReminder(req.params.id); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Start ────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ Gantt API Server running at http://localhost:${PORT}`);
});
