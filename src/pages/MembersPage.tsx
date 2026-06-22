import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, Edit2, User, Search, DollarSign, Printer, Paperclip, X, FileText, Loader2 } from 'lucide-react';
import { getInitials } from '../utils/stringUtils';
import { sileo } from 'sileo';
import { useSectionRates, SECTIONS } from '../hooks/useSectionRates';
import { generateWorkerPDF } from '../utils/pdfGenerator';

export const MembersPage: React.FC = () => {
    const { members, addMember, updateMember, deleteMember, uploadMemberFile } = useStore();
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState<{ name: string; role: string; sector: string; ci: string; code: string; files: string[] }>({ name: '', role: '', sector: '', ci: '', code: '', files: [] });
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { rates, setRate } = useSectionRates();

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isEditing) {
                    setIsEditing(null);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEditing]);

    const filteredMembers = members.filter(member => 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.sector || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.ci || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.code || '').toLowerCase().includes(searchQuery.toLowerCase())
    );


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const finalCode = formData.code?.trim() ? formData.code.trim().toUpperCase() : getInitials(formData.name);
            const dataToSave = { ...formData, code: finalCode };

            if (isEditing) {
                await updateMember({ id: isEditing, ...dataToSave, files: formData.files });
                setIsEditing(null);
                sileo.success({ title: "Integrante actualizado" });
            } else {
                await addMember({ ...dataToSave, files: formData.files });
                sileo.success({ title: "Integrante agregado" });
            }
            setFormData({ name: '', role: '', sector: '', ci: '', code: '', files: [] });
        } catch (err: any) {
            sileo.error({ 
                title: "Error al guardar",
                description: err.message || "No se pudo procesar la solicitud"
            });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const uploadedUrls: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const url = await uploadMemberFile(files[i], files[i].name);
                uploadedUrls.push(url);
            }
            setFormData(prev => ({ ...prev, files: [...(prev.files || []), ...uploadedUrls] }));
            sileo.success({ title: "Archivos subidos exitosamente" });
        } catch (err: any) {
            sileo.error({ title: "Error al subir", description: err.message });
        } finally {
            setUploading(false);
        }
    };

    const removeFile = (index: number) => {
        setFormData(prev => {
            const newFiles = [...(prev.files || [])];
            newFiles.splice(index, 1);
            return { ...prev, files: newFiles };
        });
    };

    const handlePrint = async (member: any) => {
        try {
            sileo.info({ title: "Generando Ficha..." });
            await generateWorkerPDF(member);
            sileo.success({ title: "Ficha generada exitosamente" });
        } catch (err: any) {
            sileo.error({ title: "Error", description: "No se pudo generar el PDF" });
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="sticky top-0 z-30 bg-[#0f172a]/80 backdrop-blur-md px-4 py-4 md:px-10 md:py-6 border-b border-white/5 sticky-header-custom">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 flex-1 w-full">
                        <h2 className="text-2xl font-bold whitespace-nowrap">Integrantes</h2>
                        
                        {/* Search Bar */}
                        <div className="relative flex-1 max-w-md group">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type="text"
                                className="input-sm w-full pl-12 bg-white/5 border-white/10"
                                placeholder="Buscar por nombre, sector, C.I. o rol..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {!isEditing && (
                        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center w-full md:w-auto mt-4 md:mt-0">
                        <input
                            className="input text-sm flex-1 sm:flex-none sm:w-auto"
                            placeholder="Nombre"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />

                        <input
                            className="input text-sm flex-1 sm:flex-none w-full sm:w-32"
                            placeholder="N° C.I."
                            value={formData.ci}
                            onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
                        />

                        <input
                            className="input text-sm flex-1 sm:flex-none w-full sm:w-20 uppercase font-bold"
                            placeholder="Cód."
                            value={formData.code}
                            maxLength={4}
                            title="Código de operario (Autogenerado si está vacío)"
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        />


                        <select
                            className="input text-sm w-full sm:w-auto"
                            value={formData.sector}
                            onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                            required
                        >
                            <option value="" disabled>Seleccionar Sector</option>
                            <option value="Instalaciones">Instalaciones</option>
                            <option value="Herrería">Herrería</option>
                            <option value="Vinilos">Vinilos</option>
                            <option value="Pintura">Pintura</option>
                            <option value="Impresión">Impresión</option>
                            <option value="Lonas">Lonas</option>
                            <option value="Carpintería">Carpintería</option>
                            <option value="Corpóreas">Corpóreas</option>
                        </select>
                        <button type="submit" className="btn btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
                            <Plus size={18} /> Agregar
                        </button>
                    </form>
                )}
            </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar p-4 md:p-10">
            <div className="glass rounded-[1.25rem] overflow-hidden shadow-2xl border-white/10">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Integrante</th>
                                <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Código</th>
                                <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">N° C.I.</th>


                                <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Sector</th>
                                <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Rol / Especialidad</th>
                                <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-slate-500 italic">
                                        {searchQuery ? 'No se encontraron integrantes que coincidan con la búsqueda.' : 'No hay integrantes registrados en el sistema.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredMembers.map((member) => (
                                    <tr key={member.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-1.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-300">
                                                    <User size={16} />
                                                </div>
                                                <span className="font-bold text-white text-sm">{member.name}</span>
                                            </div>
                                        </td>

                                        <td className="px-8 py-1.5 text-blue-400 font-bold text-xs uppercase">
                                            {member.code || getInitials(member.name)}
                                        </td>

                                        <td className="px-8 py-1.5 text-slate-400 font-mono text-[10px]">
                                            {member.ci || '—'}
                                        </td>


                                        <td className="px-8 py-1.5 text-center">
                                            {member.sector && (
                                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
                                                    {member.sector}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-1.5 text-slate-400 text-xs italic font-medium">
                                            {member.role || ''}
                                        </td>
                                        <td className="px-8 py-1.5 text-right">
                                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <button
                                                    onClick={() => handlePrint(member)}
                                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all hover:scale-110"
                                                    title="Imprimir Ficha"
                                                >
                                                    <Printer size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setIsEditing(member.id);
                                                        setFormData({ name: member.name, role: member.role, sector: member.sector || '', ci: member.ci || '', code: member.code || '', files: member.files || [] });
                                                    }}
                                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all hover:scale-110"
                                                    title="Editar integrante"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`¿Eliminar a ${member.name}?`)) {
                                                            deleteMember(member.id);
                                                        }
                                                    }}
                                                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all hover:scale-110"
                                                    title="Eliminar integrante"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* ─── Hourly Rates Panel ─── */}
        <div className="px-4 pb-8 md:px-10">
            <div className="glass rounded-[1.25rem] overflow-hidden shadow-2xl border-white/10">
                <div className="px-8 py-5 border-b border-white/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <DollarSign size={16} className="text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Configuración</p>
                        <h3 className="text-base font-black text-white">Costo por Hora por Sección</h3>
                    </div>
                    <span className="ml-auto text-[10px] text-slate-500 italic">Se guarda automáticamente</span>
                </div>
                <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {SECTIONS.map(section => (
                        <div key={section} className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">{section}</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm pointer-events-none">$</span>
                                <input
                                    type="number"
                                    min={0}
                                    step={10}
                                    className="input w-full pl-8 font-mono font-bold text-emerald-400"
                                    placeholder="0"
                                    value={rates[section] ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                        setRate(section, val);
                                    }}
                                />
                                {rates[section] ? (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-bold">/h</span>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

            {isEditing && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] p-4 md:p-8 rounded-sm w-full max-w-[95vw] md:max-w-[80vw] shadow-2xl border border-white/10">
                        <h3 className="text-xl font-bold mb-6">EDITAR INTEGRANTE</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre</label>
                                <input
                                    className="input w-full"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rol</label>
                                <input
                                    className="input w-full"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">N° C.I. (Opcional)</label>
                                <input
                                    className="input w-full font-mono"
                                    value={formData.ci}
                                    onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Código</label>
                                <input
                                    className="input w-full uppercase font-bold"
                                    value={formData.code}
                                    maxLength={4}
                                    placeholder="Dejar vacío para usar iniciales"
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>


                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sector</label>
                                <select
                                    className="input w-full"
                                    value={formData.sector}
                                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Seleccionar Sector</option>
                                    <option value="Instalaciones">Instalaciones</option>
                                    <option value="Herrería">Herrería</option>
                                    <option value="Vinilos">Vinilos</option>
                                    <option value="Pintura">Pintura</option>
                                    <option value="Impresión">Impresión</option>
                                    <option value="Lonas">Lonas</option>
                                    <option value="Carpintería">Carpintería</option>
                                    <option value="Corpóreas">Corpóreas</option>
                                </select>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Documentación (Fotos, PDFs)</label>
                                
                                {formData.files && formData.files.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                                        {formData.files.map((fileUrl, index) => (
                                            <div key={index} className="relative group bg-white/5 rounded-lg p-2 flex items-center gap-2 border border-white/10">
                                                {fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/) ? (
                                                    <img src={fileUrl} alt="doc" className="w-8 h-8 object-cover rounded" />
                                                ) : (
                                                    <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center text-blue-400">
                                                        <FileText size={14} />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] truncate text-slate-300">Adjunto {index + 1}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index)}
                                                    className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        multiple 
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                        disabled={uploading}
                                    />
                                    <div className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-dashed border-white/20 rounded-lg text-slate-400 hover:bg-white/5 hover:border-white/40 transition-all">
                                        {uploading ? (
                                            <><Loader2 size={16} className="animate-spin" /> Subiendo...</>
                                        ) : (
                                            <><Paperclip size={16} /> Seleccionar archivos</>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(null)}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10 flex-1"
                                >
                                    CANCELAR
                                </button>
                                <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all flex-1">
                                    GUARDAR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
