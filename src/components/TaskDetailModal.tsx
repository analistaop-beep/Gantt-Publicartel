import React from 'react';
import { X, ExternalLink, Image, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { type SectorTaskStatus, SECTOR_TASK_STATUSES, getTaskStatus, getStatusBadgeStyle } from '../utils/taskStatusUtils';
import { useStore } from '../store/useStore';

interface TaskDetailModalProps {
    task: any | null;
    photo: string | null;
    isUploadingPhoto: boolean;
    onClose: () => void;
    onStatusChange: (task: any, newStatus: SectorTaskStatus) => void;
    onUploadPhoto: (file: File) => Promise<void>;
    onDeletePhoto: () => Promise<void>;
    onNavigateToOrder?: (opNumber: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
    task,
    photo,
    isUploadingPhoto,
    onClose,
    onStatusChange,
    onUploadPhoto,
    onDeletePhoto,
    onNavigateToOrder
}) => {
    const { productionOrders } = useStore();
    if (!task) return null;

    const opAddr = task.opNumber
        ? (productionOrders || []).find(o => String(o.opNumber).trim().toLowerCase() === String(task.opNumber).trim().toLowerCase())?.address
        : undefined;
    const taskAddress = opAddr || task.address || '—';

    const currentStatus = getTaskStatus(task);
    const style = getStatusBadgeStyle(currentStatus);

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-150"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-150 overflow-hidden">
                {/* Modal Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-blue-400 text-sm bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                            #{task.opNumber || '—'}
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cliente</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
                                    {currentStatus}
                                </span>
                            </div>
                            <h3 className="text-white font-bold text-base leading-tight">{task.client || 'Sin cliente'}</h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Description */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Descripción</p>
                        <p className="text-slate-200 text-sm leading-relaxed">
                            {task.name || <span className="text-slate-600 italic">Sin descripción</span>}
                        </p>
                    </div>

                    {/* Estado Selector */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Estado</p>
                        <select
                            value={currentStatus}
                            onChange={(e) => onStatusChange(task, e.target.value as SectorTaskStatus)}
                            className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                        >
                            {SECTOR_TASK_STATUSES.map(st => (
                                <option key={st} value={st} className="bg-slate-900 text-white font-semibold">
                                    {st}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date and Address */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Fecha de ejecución</p>
                            {(!task.date || task.date === '') ? (
                                <span className="text-amber-400 text-sm font-semibold">Sin asignar</span>
                            ) : (
                                <span className="text-slate-200 text-sm font-semibold">
                                    {format(new Date(task.date + 'T00:00:00'), "dd/MM/yyyy")}
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Dirección</p>
                            <span className="text-slate-200 text-sm truncate block" title={taskAddress}>{taskAddress}</span>
                        </div>
                    </div>

                    {/* Additional jobs */}
                    {task.additionalJobs && task.additionalJobs.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Trabajos adicionales</p>
                            <div className="space-y-1.5">
                                {task.additionalJobs.map((job: any, i: number) => (
                                    <div key={i} className="bg-white/5 rounded-lg px-3 py-2 text-xs text-slate-300 border border-white/5">
                                        <span className="font-bold text-white">{job.client}</span> — {job.description}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Photo */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Foto de referencia</p>
                        {photo ? (
                            <div className="relative group rounded-xl overflow-hidden border border-white/10">
                                <img
                                    src={photo}
                                    alt="Foto de tarea"
                                    className="w-full max-h-48 object-cover"
                                />
                                <button
                                    onClick={onDeletePhoto}
                                    className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-md"
                                    title="Eliminar foto"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <label className={`flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed border-white/10 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all cursor-pointer text-slate-600 hover:text-slate-400 ${isUploadingPhoto ? 'pointer-events-none opacity-50' : ''}`}>
                                {isUploadingPhoto ? (
                                    <>
                                        <Loader2 size={24} className="animate-spin text-blue-400" />
                                        <span className="text-xs font-bold">Subiendo foto...</span>
                                    </>
                                ) : (
                                    <>
                                        <Image size={24} />
                                        <span className="text-xs font-bold">Agregar foto</span>
                                        <span className="text-[10px]">JPG, PNG o WebP</span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) onUploadPhoto(file);
                                    }}
                                />
                            </label>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-5 border-t border-white/10 flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (onNavigateToOrder && task.opNumber) {
                                onNavigateToOrder(task.opNumber);
                            }
                        }}
                        disabled={!onNavigateToOrder || !task.opNumber}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-sm"
                    >
                        <ExternalLink size={16} />
                        Ver Orden de Producción
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 font-bold text-sm transition-all border border-white/10"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
