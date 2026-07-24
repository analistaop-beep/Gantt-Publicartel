import React, { useState, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Check, DollarSign, MapPin, AlignLeft, Calendar, Zap, GripVertical, Upload, Loader2, FileText, Table2, Printer, Eye, Download, Paperclip } from 'lucide-react';
import { useStore } from '../store/useStore';
import { sileo } from 'sileo';
import type { TareaDisa, DisaEstado } from '../types';
import { DISA_ESTADOS } from '../types';
import { convertToWebP, getFileUrl, getFileName, isImageFile, isExcelFile, printFile } from '../utils/fileUtils';

// ─── Column config ─────────────────────────────────────────────────────────

const COLUMN_CONFIG: { estado: DisaEstado; label: string; color: string; bg: string; border: string; pill: string; dot: string }[] = [
    {
        estado: 'Detenido',
        label: 'Detenido',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        pill: 'bg-red-500/15 text-red-300 border-red-500/30',
        dot: 'bg-red-400',
    },
    {
        estado: 'Pendiente',
        label: 'Pendiente',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        pill: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        dot: 'bg-amber-400',
    },
    {
        estado: 'Para facturar',
        label: 'Para facturar',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        dot: 'bg-emerald-400',
    },
    {
        estado: 'Facturado',
        label: 'Facturado',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        pill: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        dot: 'bg-blue-400',
    },
];

// ─── Empty form ─────────────────────────────────────────────────────────────

const emptyForm = (): Omit<TareaDisa, 'id' | 'created_at'> => ({
    eess: '',
    monto: null,
    direccion: null,
    asunto: null,
    detalles: null,
    fecha_prometida: null,
    estado: 'Pendiente',
    files: [],
});

// ─── TaskCard ────────────────────────────────────────────────────────────────

interface TaskCardProps {
    task: TareaDisa;
    colConfig: typeof COLUMN_CONFIG[number];
    onClick: (task: TareaDisa) => void;
    onEdit: (task: TareaDisa) => void;
    onDelete: (id: string) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnd: () => void;
    isDragging: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, colConfig, onClick, onEdit, onDelete, onDragStart, onDragEnd, isDragging }) => {
    const formattedDate = task.fecha_prometida
        ? new Date(task.fecha_prometida + 'T12:00:00').toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : null;
    const formattedMonto = task.monto != null
        ? new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', minimumFractionDigits: 0 }).format(task.monto)
        : null;
    const fileCount = task.files?.length || 0;

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            onDragEnd={onDragEnd}
            className={`group relative rounded-xl border backdrop-blur-sm cursor-grab active:cursor-grabbing transition-all duration-200 select-none
                ${isDragging ? 'opacity-40 scale-[0.97] shadow-none' : 'opacity-100 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5'}
                bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600/60`}
        >
            {/* Drag handle + color strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${colConfig.dot}`} />
            
            <div className="pl-4 pr-3 py-3">
                {/* Header: EESS + actions */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <GripVertical size={13} className="text-slate-500 flex-shrink-0 group-hover:text-slate-300 transition-colors cursor-grab" />
                        <span className="font-bold text-white text-sm truncate">{task.eess}</span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); onClick(task); }}
                            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Ver información"
                        >
                            <Eye size={13} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Editar"
                        >
                            <Edit2 size={13} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                            className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </div>

                {/* Asunto */}
                {task.asunto && (
                    <p className="text-slate-300 text-xs mb-2 leading-relaxed line-clamp-2 pl-5 font-medium">{task.asunto}</p>
                )}

                {/* Metadata pills */}
                <div className="flex flex-wrap gap-1.5 mt-2 pl-5">
                    {formattedMonto && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                            <DollarSign size={9} />
                            {formattedMonto}
                        </span>
                    )}
                    {task.direccion && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-300 max-w-[140px] truncate">
                            <MapPin size={9} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate">{task.direccion}</span>
                        </span>
                    )}
                    {formattedDate && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-300">
                            <Calendar size={9} className="text-slate-400" />
                            {formattedDate}
                        </span>
                    )}
                    {fileCount > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[10px] font-bold text-blue-300">
                            <Paperclip size={9} />
                            {fileCount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

interface KanbanColumnProps {
    config: typeof COLUMN_CONFIG[number];
    tasks: TareaDisa[];
    onClick: (task: TareaDisa) => void;
    onEdit: (task: TareaDisa) => void;
    onDelete: (id: string) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent, estado: DisaEstado) => void;
    onDrop: (e: React.DragEvent, estado: DisaEstado) => void;
    draggingId: string | null;
    dragOverCol: DisaEstado | null;
    onAddNew: (estado: DisaEstado) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
    config, tasks, onClick, onEdit, onDelete, onDragStart, onDragEnd,
    onDragOver, onDrop, draggingId, dragOverCol, onAddNew,
}) => {
    const isOver = dragOverCol === config.estado;

    return (
        <div className="flex flex-col min-w-0 flex-1">
            {/* Column Header */}
            <div className={`flex items-center justify-between px-4 py-3 rounded-xl border mb-3 ${config.bg} ${config.border}`}>
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${config.dot} shadow-sm`} />
                    <span className={`font-black text-xs uppercase tracking-wider ${config.color}`}>{config.label}</span>
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${config.pill}`}>{tasks.length}</span>
                </div>
                <button
                    onClick={() => onAddNew(config.estado)}
                    className={`p-1.5 rounded-lg border transition-all hover:scale-110 ${config.pill} hover:opacity-80`}
                    title={`Nueva tarea en ${config.label}`}
                >
                    <Plus size={13} />
                </button>
            </div>

            {/* Drop zone */}
            <div
                onDragOver={(e) => onDragOver(e, config.estado)}
                onDrop={(e) => onDrop(e, config.estado)}
                className={`flex flex-col gap-2.5 flex-1 min-h-[140px] rounded-xl p-2 border-2 border-dashed transition-all duration-200
                    ${isOver
                        ? `${config.border} ${config.bg} scale-[1.01]`
                        : 'border-transparent'
                    }`}
            >
                {tasks.length === 0 && !isOver && (
                    <div className="flex flex-col items-center justify-center h-28 gap-2 text-slate-600">
                        <div className={`w-8 h-8 rounded-full border-2 border-dashed ${config.border} flex items-center justify-center`}>
                            <Plus size={14} className={config.color} />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">Arrastrá aquí</span>
                    </div>
                )}
                {tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        colConfig={config}
                        onClick={onClick}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        isDragging={draggingId === task.id}
                    />
                ))}
                {isOver && draggingId && (
                    <div className={`h-1 rounded-full ${config.dot} opacity-60 animate-pulse`} />
                )}
            </div>
        </div>
    );
};

// ─── DisaDetailModal (Estilo Detalle de Orden de Producción) ───────────────────

interface DisaDetailModalProps {
    task: TareaDisa;
    onClose: () => void;
    onEdit: (task: TareaDisa) => void;
    onDelete: (id: string) => void;
    onOpenExcel: (url: string, name: string) => void;
    onOpenImage: (url: string) => void;
}

const DisaDetailModal: React.FC<DisaDetailModalProps> = ({ task, onClose, onEdit, onDelete, onOpenExcel, onOpenImage }) => {
    const uploadDisaFile = useStore(s => s.uploadDisaFile);
    const updateDisaTask = useStore(s => s.updateDisaTask);

    const [isUploading, setIsUploading] = useState(false);
    const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null);
    const [editingFileName, setEditingFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const colConfig = COLUMN_CONFIG.find(c => c.estado === task.estado) || COLUMN_CONFIG[0];

    const formattedDate = task.fecha_prometida
        ? new Date(task.fecha_prometida + 'T12:00:00').toLocaleDateString('es-UY', { day: '2-digit', month: 'long', year: 'numeric' })
        : null;
    const formattedMonto = task.monto != null
        ? new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', minimumFractionDigits: 0 }).format(task.monto)
        : null;

    const filesList = task.files || [];

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setIsUploading(true);
        try {
            const newFilesList = [...filesList];
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                let fileToUpload: File | Blob = file;
                let fileName = file.name;

                if (file.type.startsWith('image/')) {
                    try {
                        fileToUpload = await convertToWebP(file, 0.8);
                        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                        fileName = `${nameWithoutExt}.webp`;
                    } catch (err) {
                        console.error('Error convirtiendo imagen a webp', err);
                    }
                }

                const publicUrl = await uploadDisaFile(fileToUpload, fileName);
                newFilesList.push({ url: publicUrl, name: fileName });
            }

            await updateDisaTask({ ...task, files: newFilesList });
            sileo.success({ title: 'Archivos adjuntados con éxito' });
        } catch (err: any) {
            sileo.error({ title: 'Error al subir archivo', description: err.message });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteFile = async (index: number) => {
        if (!confirm('¿Eliminar este archivo adjunto?')) return;
        const newFiles = filesList.filter((_, i) => i !== index);
        try {
            await updateDisaTask({ ...task, files: newFiles });
            sileo.success({ title: 'Archivo eliminado' });
        } catch (err: any) {
            sileo.error({ title: 'Error al eliminar archivo', description: err.message });
        }
    };

    const handleSaveFileName = async (index: number) => {
        if (!editingFileName.trim()) return;
        const newFiles = [...filesList];
        const current = newFiles[index];
        newFiles[index] = { url: getFileUrl(current), name: editingFileName.trim() };
        try {
            await updateDisaTask({ ...task, files: newFiles });
            sileo.success({ title: 'Nombre actualizado' });
            setEditingFileIndex(null);
        } catch (err: any) {
            sileo.error({ title: 'Error al actualizar nombre', description: err.message });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[110] p-4">
            <div className="bg-slate-900 w-full max-w-5xl h-[90vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                
                {/* 1. Header estilo Ordenes */}
                <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between flex-shrink-0 bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl ${colConfig.bg} border ${colConfig.border} flex items-center justify-center flex-shrink-0`}>
                            <Zap size={20} className={colConfig.color} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">TAREA DISA</span>
                                <span className="text-[10px] text-slate-500 font-mono">ID: {task.id.slice(0, 8)}</span>
                            </div>
                            <h2 className="text-xl font-black text-white tracking-tight">{task.eess}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { onClose(); onEdit(task); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold border border-white/10 rounded-xl text-xs transition-all"
                            title="Editar tarea"
                        >
                            <Edit2 size={13} /> Editar
                        </button>
                        <button
                            onClick={() => { onClose(); onDelete(task.id); }}
                            className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-colors"
                            title="Eliminar tarea"
                        >
                            <Trash2 size={16} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors ml-1"
                        >
                            <X size={22} />
                        </button>
                    </div>
                </div>

                {/* 2. Top Info Grid (Banner superior de datos clave) */}
                <div className="px-8 py-4 border-b border-white/5 flex-shrink-0 bg-white/[0.015]">
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                        <div>
                            <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">ESTADO</label>
                            <span className={`text-[10px] font-bold uppercase tracking-wider block px-2.5 py-0.5 rounded-md border w-fit ${colConfig.pill}`}>
                                {task.estado}
                            </span>
                        </div>
                        <div>
                            <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">MONTO PRESUPUESTADO</label>
                            <p className="text-lg font-black text-emerald-400 leading-none">
                                {formattedMonto || 'Sin monto'}
                            </p>
                        </div>
                        <div>
                            <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">FECHA PROMETIDA</label>
                            <p className="text-sm text-slate-300 font-medium flex items-center gap-1.5">
                                <Calendar size={13} className="text-slate-500" />
                                {formattedDate || 'Sin fecha'}
                            </p>
                        </div>
                        <div>
                            <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">DIRECCIÓN</label>
                            <p className="text-sm text-slate-300 font-medium flex items-center gap-1.5">
                                <MapPin size={13} className="text-slate-500 flex-shrink-0" />
                                {task.direccion || 'Sin dirección'}
                            </p>
                        </div>
                        {task.asunto && (
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">ASUNTO</label>
                                <p className="text-sm text-slate-300 italic truncate">{task.asunto}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Main Body — 2 Column Layout (Igual a Órdenes) */}
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_380px]">
                    
                    {/* Left Column: Descripción del proyecto / Detalles */}
                    <div className="overflow-y-auto custom-scrollbar p-8 space-y-8 border-r border-white/5">
                        {/* Asunto Block */}
                        {task.asunto && (
                            <div>
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-3">ASUNTO DEL TRABAJO</label>
                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-slate-200 font-medium text-sm">
                                    {task.asunto}
                                </div>
                            </div>
                        )}

                        {/* Details / Description Block */}
                        <div>
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-3">DETALLES / DESCRIPCIÓN DEL PROYECTO</label>
                            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl text-slate-300 leading-relaxed min-h-[140px] text-sm whitespace-pre-wrap">
                                {task.detalles ? (
                                    task.detalles
                                ) : (
                                    <span className="italic text-slate-500">Sin detalles registrados.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Archivos Adjuntos */}
                    <div className="overflow-y-auto custom-scrollbar p-6 bg-[#0a1120] flex flex-col gap-4">
                        {/* Header + Subir button */}
                        <div className="flex items-center justify-between gap-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">
                                ARCHIVOS ADJUNTOS
                                {filesList.length > 0 && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-slate-700/60 text-slate-400 rounded text-[9px] font-black">
                                        {filesList.length}
                                    </span>
                                )}
                            </label>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 font-bold border border-blue-500/20 rounded-lg text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                title="Subir archivos"
                            >
                                {isUploading ? (
                                    <><Loader2 size={12} className="animate-spin" /> Subiendo...</>
                                ) : (
                                    <><Upload size={12} /> Subir</>
                                )}
                            </button>
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                multiple
                                accept="image/*,.pdf,.xls,.xlsx,.xlsm,.xlsb,.ods,.csv"
                                onChange={handleFileUpload}
                            />
                        </div>

                        {/* File grid / empty zone */}
                        {filesList.length === 0 ? (
                            <div className="p-8 bg-white/[0.01] border border-dashed border-white/8 text-slate-500 italic text-sm text-center rounded-xl flex flex-col items-center justify-center gap-2">
                                <Paperclip size={24} className="opacity-30" />
                                <span>No hay archivos adjuntos en esta tarea.</span>
                                <span className="text-[10px] text-slate-600">Usá el botón "Subir" para cargar imágenes, PDF o Excel.</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {filesList.map((fileObj, i) => {
                                    const fileUrl = getFileUrl(fileObj);
                                    const fileName = getFileName(fileObj);
                                    const isImg = isImageFile(fileObj);
                                    const isExcel = isExcelFile(fileObj);
                                    const isEditingName = editingFileIndex === i;

                                    return (
                                        <div
                                            key={i}
                                            className="group relative bg-white/[0.025] hover:bg-white/[0.05] border border-white/5 rounded-xl overflow-hidden flex flex-col transition-all"
                                        >
                                            {/* Preview box */}
                                            <div
                                                onClick={() => {
                                                    if (!isEditingName) {
                                                        if (isImg) onOpenImage(fileUrl);
                                                        else if (isExcel) onOpenExcel(fileUrl, fileName);
                                                        else window.open(fileUrl, '_blank');
                                                    }
                                                }}
                                                className="h-28 bg-slate-950/60 flex items-center justify-center relative cursor-pointer overflow-hidden"
                                            >
                                                {isImg ? (
                                                    <img src={fileUrl} alt={fileName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                ) : isExcel ? (
                                                    <div className="flex flex-col items-center gap-1.5 text-emerald-400">
                                                        <Table2 size={32} />
                                                        <span className="text-[9px] font-black tracking-widest uppercase">Excel</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1.5 text-red-400">
                                                        <FileText size={32} />
                                                        <span className="text-[9px] font-black tracking-widest uppercase">PDF</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* File footer & actions */}
                                            <div className="p-2.5 flex flex-col gap-1.5 bg-slate-900/90">
                                                {isEditingName ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="text"
                                                            value={editingFileName}
                                                            onChange={e => setEditingFileName(e.target.value)}
                                                            className="bg-white/10 border border-white/20 rounded px-2 py-0.5 text-xs text-white outline-none w-full"
                                                            autoFocus
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleSaveFileName(i);
                                                                if (e.key === 'Escape') setEditingFileIndex(null);
                                                            }}
                                                        />
                                                        <button onClick={() => handleSaveFileName(i)} className="p-1 text-emerald-400 hover:text-emerald-300">
                                                            <Check size={13} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs font-bold text-slate-200 truncate" title={fileName}>
                                                        {fileName}
                                                    </p>
                                                )}

                                                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-slate-400">
                                                    <div className="flex items-center gap-1">
                                                        {isExcel ? (
                                                            <button
                                                                onClick={() => onOpenExcel(fileUrl, fileName)}
                                                                className="p-1 hover:text-white transition-colors"
                                                                title="Ver Excel"
                                                            >
                                                                <Table2 size={13} className="text-emerald-400" />
                                                            </button>
                                                        ) : isImg ? (
                                                            <button
                                                                onClick={() => onOpenImage(fileUrl)}
                                                                className="p-1 hover:text-white transition-colors"
                                                                title="Ver imagen"
                                                            >
                                                                <Eye size={13} className="text-sky-400" />
                                                            </button>
                                                        ) : (
                                                            <a
                                                                href={fileUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="p-1 hover:text-white transition-colors"
                                                                title="Abrir PDF"
                                                            >
                                                                <Eye size={13} className="text-blue-400" />
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={() => printFile(fileUrl)}
                                                            className="p-1 hover:text-white transition-colors"
                                                            title="Imprimir"
                                                        >
                                                            <Printer size={13} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setEditingFileIndex(i);
                                                                setEditingFileName(fileName);
                                                            }}
                                                            className="p-1 hover:text-white transition-colors"
                                                            title="Renombrar"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteFile(i)}
                                                            className="p-1 hover:text-red-400 transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── TaskModal (Create / Edit Form) ──────────────────────────────────────────

interface TaskModalProps {
    initial?: TareaDisa | null;
    defaultEstado?: DisaEstado;
    onSave: (data: Omit<TareaDisa, 'id' | 'created_at'>) => void;
    onClose: () => void;
    isSaving: boolean;
}

const TaskModal: React.FC<TaskModalProps> = ({ initial, defaultEstado = 'Pendiente', onSave, onClose, isSaving }) => {
    const uploadDisaFile = useStore(s => s.uploadDisaFile);

    const [form, setForm] = useState<Omit<TareaDisa, 'id' | 'created_at'>>(
        initial
            ? { eess: initial.eess, monto: initial.monto ?? null, direccion: initial.direccion ?? null, asunto: initial.asunto ?? null, detalles: initial.detalles ?? null, fecha_prometida: initial.fecha_prometida ?? null, estado: initial.estado, files: initial.files || [] }
            : { ...emptyForm(), estado: defaultEstado }
    );

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const set = (key: keyof typeof form, value: any) => setForm(f => ({ ...f, [key]: value }));

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setIsUploading(true);
        try {
            const newFilesList = [...(form.files || [])];
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                let fileToUpload: File | Blob = file;
                let fileName = file.name;

                if (file.type.startsWith('image/')) {
                    try {
                        fileToUpload = await convertToWebP(file, 0.8);
                        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                        fileName = `${nameWithoutExt}.webp`;
                    } catch (err) {
                        console.error('Error convirtiendo imagen a webp', err);
                    }
                }

                const publicUrl = await uploadDisaFile(fileToUpload, fileName);
                newFilesList.push({ url: publicUrl, name: fileName });
            }
            set('files', newFilesList);
            sileo.success({ title: 'Archivos adjuntados' });
        } catch (err: any) {
            sileo.error({ title: 'Error al subir archivo', description: err.message });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveFile = (index: number) => {
        const newFiles = (form.files || []).filter((_, i) => i !== index);
        set('files', newFiles);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.eess.trim()) return;
        onSave(form);
    };

    const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-slate-600";
    const labelClass = "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block";

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[120] p-4 overflow-y-auto">
            <div className="bg-[#0f172a] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-blue-950/30 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                            <Zap size={15} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">TAREA DISA</p>
                            <p className="text-sm font-bold text-white">{initial ? 'Editar tarea' : 'Nueva tarea'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1">
                    {/* EESS */}
                    <div>
                        <label className={labelClass}>EESS <span className="text-red-400">*</span></label>
                        <input
                            className={inputClass}
                            placeholder="Nombre de la estación de servicio"
                            value={form.eess}
                            onChange={e => set('eess', e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    {/* Asunto */}
                    <div>
                        <label className={labelClass}>Asunto</label>
                        <input
                            className={inputClass}
                            placeholder="Motivo o trabajo a realizar"
                            value={form.asunto ?? ''}
                            onChange={e => set('asunto', e.target.value || null)}
                        />
                    </div>

                    {/* Monto + Fecha */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Monto</label>
                            <div className="relative">
                                <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="number"
                                    className={`${inputClass} pl-8`}
                                    placeholder="0"
                                    value={form.monto ?? ''}
                                    onChange={e => set('monto', e.target.value ? Number(e.target.value) : null)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Fecha prometida</label>
                            <input
                                type="date"
                                className={inputClass}
                                value={form.fecha_prometida ?? ''}
                                onChange={e => set('fecha_prometida', e.target.value || null)}
                            />
                        </div>
                    </div>

                    {/* Dirección */}
                    <div>
                        <label className={labelClass}>Dirección</label>
                        <div className="relative">
                            <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                className={`${inputClass} pl-8`}
                                placeholder="Dirección de la EESS"
                                value={form.direccion ?? ''}
                                onChange={e => set('direccion', e.target.value || null)}
                            />
                        </div>
                    </div>

                    {/* Detalles */}
                    <div>
                        <label className={labelClass}>Detalles</label>
                        <div className="relative">
                            <AlignLeft size={13} className="absolute left-3 top-3 text-slate-500" />
                            <textarea
                                className={`${inputClass} pl-8 resize-none`}
                                placeholder="Notas adicionales..."
                                rows={3}
                                value={form.detalles ?? ''}
                                onChange={e => set('detalles', e.target.value || null)}
                            />
                        </div>
                    </div>

                    {/* Estado */}
                    <div>
                        <label className={labelClass}>Estado</label>
                        <div className="flex gap-2">
                            {DISA_ESTADOS.map(est => {
                                const cfg = COLUMN_CONFIG.find(c => c.estado === est)!;
                                return (
                                    <button
                                        key={est}
                                        type="button"
                                        onClick={() => set('estado', est)}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.estado === est
                                            ? `${cfg.pill} shadow-md`
                                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                        }`}
                                    >
                                        {est}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Archivos adjuntos en el formulario */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className={labelClass}>Archivos Adjuntos</label>
                            <label className={`text-[10px] font-bold uppercase text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-1 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                <span>{isUploading ? 'Subiendo...' : '+ Agregar'}</span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf,.xls,.xlsx,.xlsm,.xlsb,.ods,.csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {form.files && form.files.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {form.files.map((fileObj, idx) => (
                                    <span
                                        key={idx}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300"
                                    >
                                        <Paperclip size={11} className="text-slate-500" />
                                        <span className="max-w-[150px] truncate">{getFileName(fileObj)}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(idx)}
                                            className="p-0.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-600 italic">No hay archivos seleccionados.</p>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-3 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isUploading || !form.eess.trim()}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                        >
                            {isSaving ? (
                                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                            ) : (
                                <Check size={15} />
                            )}
                            {initial ? 'Guardar cambios' : 'Crear tarea'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── DisaPage ─────────────────────────────────────────────────────────────────

export const DisaPage: React.FC = () => {
    const disaTasks = useStore(s => s.disaTasks);
    const addDisaTask = useStore(s => s.addDisaTask);
    const updateDisaTask = useStore(s => s.updateDisaTask);
    const deleteDisaTask = useStore(s => s.deleteDisaTask);
    const moveDisaTask = useStore(s => s.moveDisaTask);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<TareaDisa | null>(null);
    const [viewingTask, setViewingTask] = useState<TareaDisa | null>(null);
    const [defaultEstado, setDefaultEstado] = useState<DisaEstado>('Pendiente');
    const [isSaving, setIsSaving] = useState(false);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<DisaEstado | null>(null);

    // Visores
    const [excelViewerFile, setExcelViewerFile] = useState<{ url: string; name: string } | null>(null);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

    // Keep viewingTask up to date with store
    const currentViewingTask = viewingTask ? (disaTasks.find(t => t.id === viewingTask.id) || viewingTask) : null;

    // ── Drag handlers ──────────────────────────────────────────────────────

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        setDraggingId(id);
    };

    const handleDragEnd = () => {
        setDraggingId(null);
        setDragOverCol(null);
    };

    const handleDragOver = (e: React.DragEvent, estado: DisaEstado) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(estado);
    };

    const handleDrop = async (e: React.DragEvent, estado: DisaEstado) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        setDraggingId(null);
        setDragOverCol(null);
        if (!id) return;
        const task = disaTasks.find(t => t.id === id);
        if (!task || task.estado === estado) return;
        try {
            await moveDisaTask(id, estado);
        } catch {
            sileo.error({ title: 'Error', description: 'No se pudo mover la tarea' });
        }
    };

    // ── Modal handlers ─────────────────────────────────────────────────────

    const openCreate = (estado: DisaEstado) => {
        setEditingTask(null);
        setDefaultEstado(estado);
        setModalOpen(true);
    };

    const openEdit = (task: TareaDisa) => {
        setEditingTask(task);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingTask(null);
    };

    const handleSave = async (data: Omit<TareaDisa, 'id' | 'created_at'>) => {
        setIsSaving(true);
        try {
            if (editingTask) {
                await updateDisaTask({ ...editingTask, ...data });
                sileo.success({ title: 'Tarea actualizada' });
            } else {
                await addDisaTask(data);
                sileo.success({ title: 'Tarea creada' });
            }
            closeModal();
        } catch (err: any) {
            sileo.error({ title: 'Error', description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta tarea Disa?')) return;
        try {
            await deleteDisaTask(id);
            sileo.success({ title: 'Tarea eliminada' });
            if (viewingTask?.id === id) setViewingTask(null);
        } catch (err: any) {
            sileo.error({ title: 'Error', description: err.message });
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────

    const totalDetenido = disaTasks.filter(t => t.estado === 'Detenido').length;
    const totalPendiente = disaTasks.filter(t => t.estado === 'Pendiente').length;
    const totalFacturar = disaTasks.filter(t => t.estado === 'Para facturar').length;
    const totalFacturado = disaTasks.filter(t => t.estado === 'Facturado').length;

    return (
        <div className="h-full flex flex-col bg-gray-900 overflow-hidden">
            {/* Header estilo Órdenes */}
            <div className="px-8 py-5 border-b border-white/8 flex items-center justify-between flex-shrink-0 bg-slate-900">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/10">
                        <Zap size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight">Gestión Disa</h1>
                        <p className="text-xs text-slate-400 font-medium">
                            {totalDetenido} detenidas · {totalPendiente} pendientes · {totalFacturar} para facturar · {totalFacturado} facturadas
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => openCreate('Detenido')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 uppercase tracking-wider"
                >
                    <Plus size={16} />
                    Nueva tarea
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 min-h-0 overflow-auto p-6 custom-scrollbar">
                <div className="flex gap-5 h-full min-w-[980px]">
                    {COLUMN_CONFIG.map(colConfig => (
                        <KanbanColumn
                            key={colConfig.estado}
                            config={colConfig}
                            tasks={disaTasks.filter(t => t.estado === colConfig.estado)}
                            onClick={setViewingTask}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            draggingId={draggingId}
                            dragOverCol={dragOverCol}
                            onAddNew={openCreate}
                        />
                    ))}
                </div>
            </div>

            {/* Task Detail Modal (Estilo Ordenes) */}
            {currentViewingTask && (
                <DisaDetailModal
                    task={currentViewingTask}
                    onClose={() => setViewingTask(null)}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onOpenExcel={(url, name) => {
                        setExcelViewerFile({ url, name });
                        setIframeLoaded(false);
                    }}
                    onOpenImage={setViewingImageUrl}
                />
            )}

            {/* Create/Edit Form Modal */}
            {modalOpen && (
                <TaskModal
                    initial={editingTask}
                    defaultEstado={defaultEstado}
                    onSave={handleSave}
                    onClose={closeModal}
                    isSaving={isSaving}
                />
            )}

            {/* Excel Viewer Modal */}
            {excelViewerFile && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[130] p-2 sm:p-4">
                    <div className="bg-[#0f172a] w-full max-w-[98vw] h-[95vh] rounded-2xl border border-emerald-500/20 shadow-2xl shadow-emerald-500/10 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/8 bg-emerald-950/30 flex-shrink-0 gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                                    <Table2 size={18} className="text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">PLANILLA EXCEL</p>
                                    <p className="text-sm font-bold text-white truncate max-w-[300px] sm:max-w-[500px]">{excelViewerFile.name}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <a
                                    href={excelViewerFile.url}
                                    download={excelViewerFile.name}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 font-bold border border-emerald-500/30 rounded-lg text-[10px] uppercase tracking-wider transition-all"
                                >
                                    <Download size={12} /> Descargar
                                </a>
                                <button
                                    onClick={() => printFile(excelViewerFile.url)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 font-bold border border-blue-500/30 rounded-lg text-[10px] uppercase tracking-wider transition-all"
                                >
                                    <Printer size={12} /> Imprimir
                                </button>
                                <button
                                    onClick={() => setExcelViewerFile(null)}
                                    className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors ml-1"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 relative bg-slate-900 overflow-hidden">
                            {!iframeLoaded && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0f172a] gap-3">
                                    <Loader2 size={36} className="animate-spin text-emerald-400" />
                                    <p className="text-slate-300 font-medium text-sm">Cargando planilla Excel con formato original...</p>
                                </div>
                            )}
                            <iframe
                                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(excelViewerFile.url)}`}
                                className="w-full h-full border-0"
                                title="Excel Viewer"
                                onLoad={() => setIframeLoaded(true)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Single Image Viewer Lightbox Modal */}
            {viewingImageUrl && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[130] p-4">
                    <button
                        onClick={() => setViewingImageUrl(null)}
                        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={viewingImageUrl}
                        alt="Previsualización"
                        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
                    />
                </div>
            )}
        </div>
    );
};
