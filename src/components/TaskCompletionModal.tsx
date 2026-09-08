import React from 'react';
import { CheckCircle2, Loader2, X } from 'lucide-react';

interface TaskCompletionModalProps {
    task: any | null;
    completeHours: string;
    isCompleting: boolean;
    onHoursChange: (hours: string) => void;
    onConfirm: () => Promise<void>;
    onClose: () => void;
}

export const TaskCompletionModal: React.FC<TaskCompletionModalProps> = ({
    task,
    completeHours,
    isCompleting,
    onHoursChange,
    onConfirm,
    onClose
}) => {
    if (!task) return null;

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[250] p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isCompleting) {
                    onClose();
                }
            }}
        >
            <div className="bg-[#0f172a] border border-emerald-500/30 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-5 border-b border-white/10 bg-emerald-500/10">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={22} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white">Marcar tarea como Terminada</h3>
                        <p className="text-xs text-slate-400">Confirmación y registro de horas reales</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isCompleting}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {/* Resumen de la tarea */}
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                OP #{task.opNumber || '—'}
                            </span>
                            <span className="text-xs font-semibold text-white truncate">
                                {task.client || 'Sin cliente'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                            {task.name || 'Sin descripción'}
                        </p>
                    </div>

                    {/* Input de Horas Totales */}
                    <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                            <span>Horas totales destinadas a la tarea:</span>
                            {task.totalHours ? (
                                <span className="text-[11px] text-slate-500 font-normal">
                                    Estimadas: {task.totalHours}h
                                </span>
                            ) : null}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                placeholder="Ej: 3.5"
                                value={completeHours}
                                onChange={(e) => onHoursChange(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        onConfirm();
                                    }
                                }}
                                className="w-full bg-[#1e293b] border border-emerald-500/40 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-lg font-bold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                                horas
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Al confirmar, la tarea quedará marcada como finalizada y se removerá del listado de pendientes.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/10 flex items-center gap-3">
                    <button
                        onClick={onConfirm}
                        disabled={isCompleting || !completeHours || parseFloat(completeHours) < 0}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 text-sm"
                    >
                        {isCompleting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={16} />
                                Confirmar y Finalizar
                            </>
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isCompleting}
                        className="px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 font-bold text-sm transition-all border border-white/10"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};
