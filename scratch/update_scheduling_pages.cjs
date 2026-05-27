const fs = require('fs');
const path = require('path');

const files = [
    'src/pages/GanttPage.tsx',
    'src/pages/CorporeasPage.tsx',
    'src/pages/HerreriaPage.tsx',
    'src/pages/LonasVinilosPage.tsx',
    'src/pages/PinturaPage.tsx'
];

const workspaceRoot = 'c:/Users/gcuel/Desktop/Gantt Publicartel';

files.forEach(relPath => {
    const filePath = path.join(workspaceRoot, relPath);
    console.log(`Processing: ${relPath}`);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Update formData default state
    // Replace: totalHours: 1, duration: 1, (with any spaces/newlines)
    const formDataRegex = /totalHours\s*:\s*1\s*,\s*duration\s*:\s*1\s*,/;
    if (!formDataRegex.test(content)) {
        console.error(`ERROR: formData state regex failed in ${relPath}`);
        return;
    }
    content = content.replace(formDataRegex, 'totalHours: 1,\n        duration: 1,\n        estimatedHours: 1,');

    // 2. Update handleTaskSubmit success state reset (usually setting totalHours: 1, duration: 1)
    // Wait, since we normalized the first one, let's look for other occurrences of:
    // totalHours: 1,\n                duration: 1,
    // We can do it by finding it inside the handleTaskSubmit block. Let's just do a regex replace for any occurrence of:
    // totalHours: 1,\s+duration: 1, (not matched by the first replace)
    // Let's replace all of them!
    const resetRegex = /totalHours\s*:\s*1\s*,\s*duration\s*:\s*1\b/g;
    content = content.replace(resetRegex, 'totalHours: 1,\n                duration: 1,\n                estimatedHours: 1');

    // 3. Update handleEditTask
    const editRegex = /totalHours\s*:\s*task\.totalHours\s*\|\|\s*0\s*,\s*duration\s*:\s*task\.duration\s*\|\|\s*0\s*,/;
    if (!editRegex.test(content)) {
        console.error(`ERROR: handleEditTask regex failed in ${relPath}`);
        return;
    }
    content = content.replace(editRegex, 'totalHours: task.totalHours || 0,\n            duration: task.duration || 0,\n            estimatedHours: task.estimatedHours || task.totalHours || 0,');

    // 4. Update handleTaskSubmit logic
    const submitEditRegex = /if\s*\(\s*editingTask\s*\)\s*\{\s*await\s+updateTask\(\s*\{\s*\.\.\.editingTask\s*,\s*\.\.\.formData\s*,/;
    if (!submitEditRegex.test(content)) {
        console.error(`ERROR: handleTaskSubmit edit regex failed in ${relPath}`);
        return;
    }
    content = content.replace(submitEditRegex, 'const totalAssignedHours = formData.members.reduce((acc, m) => acc + (m.hours || 0), 0);\n            if (editingTask) {\n                await updateTask({\n                    ...editingTask,\n                    ...formData,\n                    totalHours: totalAssignedHours,\n                    duration: totalAssignedHours,');

    const submitAddRegex = /else\s*\{\s*await\s+addTask\(\s*\{\s*\.\.\.formData\s*,/;
    if (!submitAddRegex.test(content)) {
        console.error(`ERROR: handleTaskSubmit add regex failed in ${relPath}`);
        return;
    }
    content = content.replace(submitAddRegex, 'else {\n                await addTask({\n                    ...formData,\n                    totalHours: totalAssignedHours,\n                    duration: totalAssignedHours,\n                    estimatedHours: formData.estimatedHours || formData.totalHours || 1,');

    // 5. Update task card grid rendering comparisons & metrics (estimatedHours vs totalHours)
    content = content.split('totalAssignedHours > task.totalHours').join('totalAssignedHours > (task.estimatedHours || task.totalHours)');
    content = content.split('{totalAssignedHours.toFixed(0)}/{task.totalHours.toFixed(0)}')
                     .join('{totalAssignedHours.toFixed(0)}/{(task.estimatedHours || task.totalHours || 1).toFixed(0)}');
    content = content.split('{totalAssignedHours.toFixed(1)} / {task.totalHours.toFixed(1)}h')
                     .join('{totalAssignedHours.toFixed(1)} / {(task.estimatedHours || task.totalHours || 0).toFixed(1)}h');
    content = content.split('(totalAssignedHours / (task.totalHours || 1))')
                     .join('(totalAssignedHours / (task.estimatedHours || task.totalHours || 1))');

    // 6. Update pending tasks grouping in click move and drag-drop
    // Match: if (existingPending) { updateTaskLocal({ ...existingPending, totalHours: ..., duration: ... });
    const pendingGroupRegex = /if\s*\(\s*existingPending\s*\)\s*\{\s*updateTaskLocal\(\s*\{\s*\.\.\.existingPending\s*,\s*totalHours\s*:\s*\(\s*existingPending\.totalHours\s*\|\|\s*0\s*\)\s*\+\s*\(\s*task\.totalHours\s*\|\|\s*0\s*\)\s*,\s*duration\s*:\s*\(\s*existingPending\.duration\s*\|\|\s*0\s*\)\s*\+\s*\(\s*task\.duration\s*\|\|\s*0\s*\)\s*\}\s*\)\s*;/g;
    content = content.replace(pendingGroupRegex, 'if (existingPending) {\n                        updateTaskLocal({\n                            ...existingPending,\n                            estimatedHours: (existingPending.estimatedHours || existingPending.totalHours || 0) + (task.estimatedHours || task.totalHours || 0),\n                            totalHours: (existingPending.totalHours || 0) + (task.totalHours || 0),\n                            duration: (existingPending.duration || 0) + (task.duration || 0)\n                        });\n                    }');

    // 7. Update pending task sidebar display
    content = content.split('{(task.totalHours || 0).toFixed(1)}h').join('{(task.estimatedHours || task.totalHours || 0).toFixed(1)}h');

    // 8. Update task modal input field
    // Match the whole div containing label "Horas Previstas" and the input
    const modalFieldRegex = /<div\s+className="p-4\s+bg-blue-500\/5\s+rounded-\[1rem\]\s+border\s+border-blue-500\/10\s+space-y-4">\s*<h4\s+className="text-xs\s+font-black\s+uppercase\s+tracking-widest\s+text-blue-400\s+mb-1">Carga de Horas<\/h4>\s*<div\s+className="space-y-1">\s*<label\s+className="text-\[10px\]\s+uppercase\s+font-bold\s+text-slate-500\s+ml-1">Horas Previstas<\/label>\s*<input\s+type="number"\s+step="0\.1"\s+className="input\s+w-full\s+font-mono\s+font-bold\s+text-emerald-400\s+text-xl"\s+value=\{\s*formData\.totalHours\s*\}\s*onChange=\{\s*\(\s*e\s*\)\s*=>\s*\{\s*const\s+total\s*=\s*parseFloat\(\s*e\.target\.value\s*\)\s*\|\|\s*0\s*;\s*setFormData\(\s*\{\s*\.\.\.formData\s*,\s*totalHours\s*:\s*total\s*,\s*duration\s*:\s*total\s*\}\s*\)\s*;\s*\}\s*\}\s*required\s*\/>\s*<\/div>\s*<\/div>/;
    
    if (!modalFieldRegex.test(content)) {
        console.error(`ERROR: targetModalField regex failed in ${relPath}`);
        return;
    }
    
    const replacementModalField = `<div className="p-4 bg-blue-500/5 rounded-[1rem] border border-blue-500/10 space-y-4">
                                         <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-1">Carga de Horas</h4>
                                         <div className="space-y-1">
                                             <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Horas Previstas {editingTask && '(Fijo)'}</label>
                                             <input
                                                 type="number" step="0.1" className={\`input w-full font-mono font-bold text-emerald-400 text-xl \${editingTask ? 'opacity-60 cursor-not-allowed' : ''}\`}
                                                 value={formData.estimatedHours}
                                                 onChange={(e) => {
                                                     const total = parseFloat(e.target.value) || 0;
                                                     setFormData({ ...formData, estimatedHours: total });
                                                 }}
                                                 disabled={!!editingTask}
                                                 required
                                             />
                                         </div>
                                         {editingTask && (
                                             <div className="space-y-1 mt-2">
                                                 <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Horas Asignadas (Reales)</label>
                                                 <div className="input w-full font-mono font-bold text-blue-400 text-xl flex items-center bg-white/5 border border-white/10 px-3 min-h-[42px] rounded-lg">
                                                     {formData.members.reduce((acc, m) => acc + (m.hours || 0), 0).toFixed(1)}h
                                                 </div>
                                             </div>
                                         )}
                                     </div>`;
    content = content.replace(modalFieldRegex, replacementModalField);

    // Save back
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully updated ${relPath}`);
});
