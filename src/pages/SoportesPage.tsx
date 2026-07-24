import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, Edit2, Signpost, MapPin, Route, FileText, Hash, Upload, ExternalLink, X, Loader2 } from 'lucide-react';
import { sileo } from 'sileo';
import type { Soporte } from '../types';

const EMPTY_FORM: Omit<Soporte, 'id' | 'created_at'> = {
    tipo: '',
    numero: '',
    ubicacion: '',
    ruta: '',
    localidad: '',
    ficha: '',
};

export const SoportesPage: React.FC = () => {
    const { soportes, addSoporte, updateSoporte, deleteSoporte, uploadSoporteFile } = useStore();
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<Soporte, 'id' | 'created_at'>>(EMPTY_FORM);
    const [search, setSearch] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsEditing(null);
                setConfirmDelete(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.tipo.trim() || !formData.numero.trim()) {
            sileo.warning({ title: 'Campos requeridos', description: 'Tipo y Número son obligatorios.' });
            return;
        }
        try {
            if (isEditing && isEditing !== 'new') {
                await updateSoporte({ id: isEditing, ...formData });
                sileo.success({ title: 'Soporte actualizado' });
                setIsEditing(null);
            } else {
                await addSoporte(formData);
                sileo.success({ title: 'Soporte agregado' });
                setIsEditing(null);
            }
            setFormData(EMPTY_FORM);
            setShowUrlInput(false);
        } catch (err: any) {
            sileo.error({ title: 'Error al guardar', description: err.message || 'No se pudo procesar la solicitud' });
        }
    };

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            sileo.warning({ title: 'Formato no soportado', description: 'El archivo de la ficha debe ser un PDF.' });
            return;
        }
        setUploading(true);
        try {
            const url = await uploadSoporteFile(file, file.name);
            setFormData(prev => ({ ...prev, ficha: url }));
            sileo.success({ title: 'PDF subido correctamente' });
        } catch (err: any) {
            sileo.error({ title: 'Error al subir PDF', description: err.message || 'No se pudo cargar el archivo.' });
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const filtered = soportes.filter(s =>
        s.tipo.toLowerCase().includes(search.toLowerCase()) ||
        s.numero.toLowerCase().includes(search.toLowerCase()) ||
        (s.ubicacion || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.ruta || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleEditStart = (s: Soporte) => {
        setIsEditing(s.id);
        setFormData({ tipo: s.tipo, numero: s.numero, ubicacion: s.ubicacion || '', ruta: s.ruta || '', localidad: s.localidad || '', ficha: s.ficha || '' });
        setShowUrlInput(false);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-[#0f172a]/80 backdrop-blur-md px-4 py-4 md:px-10 md:py-6 border-b border-white/5 sticky-header-custom">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                            <Signpost size={18} className="text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Soportes</h2>
                            <p className="text-xs text-slate-500 font-medium">{soportes.length} soporte{soportes.length !== 1 ? 's' : ''} registrado{soportes.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <input
                            className="input text-sm"
                            placeholder="Buscar por tipo, número, ubicación..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button
                            onClick={() => { setFormData(EMPTY_FORM); setIsEditing('new'); setShowUrlInput(false); }}
                            className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus size={18} /> Agregar
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar p-4 md:p-10">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-3">
                        <Signpost size={40} className="text-slate-700" />
                        <p className="font-medium">{search ? 'Sin resultados para la búsqueda' : 'No hay soportes registrados'}</p>
                        {!search && <p className="text-xs text-slate-600">Hacé clic en "Agregar" para crear el primero.</p>}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-white/5 text-slate-400 text-xs uppercase tracking-widest font-black">
                                    <th className="px-4 py-3 text-left">Tipo</th>
                                    <th className="px-4 py-3 text-left">Número</th>
                                    <th className="px-4 py-3 text-left">Ubicación</th>
                                    <th className="px-4 py-3 text-left">Ruta</th>
                                    <th className="px-4 py-3 text-left">Localidad</th>
                                    <th className="px-4 py-3 text-left">Ficha (PDF)</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map((s) => (
                                    <tr key={s.id} className="hover:bg-white/[0.03] transition-colors group">
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-wide">
                                                {s.tipo}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono font-semibold text-slate-200">{s.numero}</td>
                                        <td className="px-4 py-3 text-slate-400">{s.ubicacion || <span className="text-slate-600 italic">—</span>}</td>
                                        <td className="px-4 py-3 text-slate-400">{s.ruta || <span className="text-slate-600 italic">—</span>}</td>
                                        <td className="px-4 py-3 text-slate-400">{s.localidad || <span className="text-slate-600 italic">—</span>}</td>
                                        <td className="px-4 py-3 text-slate-400">
                                            {s.ficha ? (
                                                s.ficha.startsWith('http') || s.ficha.startsWith('blob') || s.ficha.includes('/') ? (
                                                    <a
                                                        href={s.ficha}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-semibold transition-all group/link"
                                                    >
                                                        <FileText size={13} className="text-red-400 group-hover/link:scale-110 transition-transform" />
                                                        Ver PDF
                                                        <ExternalLink size={11} className="opacity-60" />
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-300 font-mono">{s.ficha}</span>
                                                )
                                            ) : (
                                                <span className="text-slate-600 italic">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditStart(s)}
                                                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(s.id)}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Agregar / Editar */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-2xl border border-white/10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                                <Signpost size={18} className="text-violet-400" />
                            </div>
                            <h3 className="text-xl font-bold">{isEditing === 'new' ? 'Nuevo Soporte' : 'Editar Soporte'}</h3>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                        <Signpost size={11} /> Tipo <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        className="input w-full"
                                        placeholder="ej: Cartel, Valla, Lona..."
                                        value={formData.tipo}
                                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                        <Hash size={11} /> Número <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        className="input w-full"
                                        placeholder="ej: 001, A-42..."
                                        value={formData.numero}
                                        onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                    <MapPin size={11} /> Ubicación
                                </label>
                                <input
                                    className="input w-full"
                                    placeholder="ej: Av. 18 de Julio 1234"
                                    value={formData.ubicacion}
                                    onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                        <Route size={11} /> Ruta
                                    </label>
                                    <input
                                        className="input w-full"
                                        placeholder="ej: Ruta 5 km 12"
                                        value={formData.ruta}
                                        onChange={(e) => setFormData({ ...formData, ruta: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                        <MapPin size={11} /> Localidad
                                    </label>
                                    <input
                                        className="input w-full"
                                        placeholder="ej: Montevideo, Las Piedras..."
                                        value={formData.localidad}
                                        onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                    <FileText size={11} className="text-red-400" /> Ficha Técnica (Archivo PDF)
                                </label>

                                {formData.ficha ? (
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0 text-red-400">
                                                <FileText size={16} />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-xs font-semibold text-slate-200">Ficha PDF adjunta</p>
                                                <a
                                                    href={formData.ficha}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-red-400 hover:underline flex items-center gap-1 truncate"
                                                >
                                                    Abrir archivo <ExternalLink size={9} />
                                                </a>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, ficha: '' }))}
                                            className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-300 transition-colors"
                                            title="Quitar PDF"
                                        >
                                            <X size={15} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="pdf-input"
                                            className={`flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/15 hover:border-violet-500/50 rounded-xl cursor-pointer bg-white/[0.02] hover:bg-white/[0.05] transition-all group ${
                                                uploading ? 'opacity-60 pointer-events-none' : ''
                                            }`}
                                        >
                                            <input
                                                id="pdf-input"
                                                type="file"
                                                accept="application/pdf,.pdf"
                                                onChange={handlePdfUpload}
                                                className="hidden"
                                                disabled={uploading}
                                            />
                                            {uploading ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 size={24} className="text-violet-400 animate-spin" />
                                                    <span className="text-xs text-slate-400 font-medium">Subiendo archivo PDF...</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div className="w-9 h-9 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors">
                                                        <Upload size={18} />
                                                    </div>
                                                    <p className="text-xs font-semibold text-slate-300 group-hover:text-violet-300 transition-colors">
                                                        Seleccionar o arrastrar PDF
                                                    </p>
                                                    <p className="text-[10px] text-slate-500">Solo archivos .pdf</p>
                                                </div>
                                            )}
                                        </label>

                                        {!showUrlInput ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowUrlInput(true)}
                                                className="text-[10px] text-slate-500 hover:text-slate-400 underline transition-colors"
                                            >
                                                ¿Ingresar enlace URL de PDF manualmente?
                                            </button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input
                                                    className="input text-xs w-full"
                                                    placeholder="https://.../archivo.pdf"
                                                    value={formData.ficha}
                                                    onChange={(e) => setFormData({ ...formData, ficha: e.target.value })}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowUrlInput(false)}
                                                    className="px-2 text-slate-500 hover:text-white"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsEditing(null); setFormData(EMPTY_FORM); setShowUrlInput(false); }}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10 rounded-xl flex-1"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold transition-all rounded-xl flex-1"
                                >
                                    {isEditing === 'new' ? 'Agregar' : 'Guardar cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Confirmación Eliminar */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-red-500/20">
                        <h3 className="text-lg font-bold text-red-400 mb-2">¿Eliminar soporte?</h3>
                        <p className="text-slate-400 text-sm mb-6">Esta acción no se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl flex-1 border border-white/10 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        await deleteSoporte(confirmDelete);
                                        sileo.success({ title: 'Soporte eliminado' });
                                    } catch {
                                        sileo.error({ title: 'Error al eliminar' });
                                    }
                                    setConfirmDelete(null);
                                }}
                                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex-1 transition-all"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
