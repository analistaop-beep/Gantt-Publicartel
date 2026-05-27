const fs = require('fs');
const path = require('path');

const files = [
    'src/pages/GanttPage.tsx'
];

const workspaceRoot = 'c:/Users/gcuel/Desktop/Gantt Publicartel';

files.forEach(relPath => {
    const filePath = path.join(workspaceRoot, relPath);
    console.log(`Processing: ${relPath}`);
    let content = fs.readFileSync(filePath, 'utf8');

    // Normalize CRLF to LF
    const isCRLF = content.includes('\r\n');
    content = content.replace(/\r\n/g, '\n');

    // 1. Update formData default state
    const formDataRegex = /totalHours\s*:\s*1\s*,\s*duration\s*:\s*1\s*,/;
    if (!formDataRegex.test(content)) {
        console.error(`ERROR: formData state regex failed in ${relPath}`);
        return;
    }
    content = content.replace(formDataRegex, 'totalHours: 1,\n        duration: 1,\n        estimatedHours: 1,');

    // 2. Update handleTaskSubmit success state reset
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
    const pendingGroupRegex = /if\s*\(\s*existingPending\s*\)\s*\{\s*updateTaskLocal\(\s*\{\s*\.\.\.existingPending\s*,\s*totalHours\s*:\s*\(\s*existingPending\.totalHours\s*\|\|\s*0\s*\)\s*\+\s*\(\s*task\.totalHours\s*\|\|\s*0\s*\)\s*,\s*duration\s*:\s*\(\s*existingPending\.duration\s*\|\|\s*0\s*\)\s*\+\s*\(\s*task\.duration\s*\|\|\s*0\s*\)\s*\}\s*\)\s*;/g;
    content = content.replace(pendingGroupRegex, 'if (existingPending) {\n                        updateTaskLocal({\n                            ...existingPending,\n                            estimatedHours: (existingPending.estimatedHours || existingPending.totalHours || 0) + (task.estimatedHours || task.totalHours || 0),\n                            totalHours: (existingPending.totalHours || 0) + (task.totalHours || 0),\n                            duration: (existingPending.duration || 0) + (task.duration || 0)\n                        });\n                    }');

    const targetDragGroup = /if\s*\(\s*existingPending\s*\)\s*\{\s*updateTaskLocal\(\s*\{\s*\.\.\.existingPending\s*,\s*totalHours\s*:\s*\(\s*existingPending\.totalHours\s*\|\|\s*0\s*\)\s*\+\s*\(\s*task\.totalHours\s*\|\|\s*0\s*\)\s*,\s*duration\s*:\s*\(\s*existingPending\.duration\s*\|\|\s*0\s*\)\s*\+\s*\(\s*task\.duration\s*\|\|\s*0\s*\)\s*\}\s*\)\s*;\s*deleteTaskLocal\(\s*task\.id\s*\)\s*;\s*sileo\.success\(\s*\{\s*title\s*:\s*"Tarea\s+agrupada\s+en\s+pendientes"\s*\}\s*\)\s*;\s*\}\s*else/g;
    content = content.replace(targetDragGroup, 'if (existingPending) {\n                    updateTaskLocal({\n                        ...existingPending,\n                        estimatedHours: (existingPending.estimatedHours || existingPending.totalHours || 0) + (task.estimatedHours || task.totalHours || 0),\n                        totalHours: (existingPending.totalHours || 0) + (task.totalHours || 0),\n                        duration: (existingPending.duration || 0) + (task.duration || 0)\n                    });\n                    deleteTaskLocal(task.id);\n                    sileo.success({ title: "Tarea agrupada en pendientes" });\n                } else');

    // 7. Update pending task sidebar display
    content = content.split('{(task.totalHours || 0).toFixed(1)}h').join('{(task.estimatedHours || task.totalHours || 0).toFixed(1)}h');

    // 8. Update task modal input field
    const modalFieldRegex = /<div\s+className="space-y-1">\s*<label\s+className="[^"]+">(?:TOTAL\s+)?HORAS\s+PREVISTAS<\/label>\s*<input[\s\S]+?value=\{\s*formData\.totalHours\s*\}[\s\S]+?<\/div>/i;
    
    if (!modalFieldRegex.test(content)) {
        console.error(`ERROR: targetModalField regex failed in ${relPath}`);
        return;
    }
    
    const replacementModalField = `<div className="space-y-1">
                                                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">TOTAL HORAS PREVISTAS {editingTask && '(FIJO)'}</label>
                                                     <input
                                                             type="number" step="0.1" 
                                                             className={\`input w-full font-mono font-bold text-emerald-400 text-xl \${editingTask ? 'opacity-60 cursor-not-allowed' : ''}\`}
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
                                                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">HORAS ASIGNADAS (REALES)</label>
                                                         <div className="input w-full font-mono font-bold text-blue-400 text-xl flex items-center bg-white/5 border border-white/10 px-3 min-h-[42px] rounded-lg">
                                                             {formData.members.reduce((acc, m) => acc + (m.hours || 0), 0).toFixed(1)}h
                                                         </div>
                                                     </div>
                                                 )}`;
    content = content.replace(modalFieldRegex, replacementModalField);

    // Convert back to CRLF if it was CRLF originally
    if (isCRLF) {
        content = content.replace(/\n/g, '\r\n');
    }

    // Save back
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully updated ${relPath}`);
});
