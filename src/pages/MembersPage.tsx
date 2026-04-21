import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, Edit2, User, Search } from 'lucide-react';
import { getInitials } from '../utils/stringUtils';

export const MembersPage: React.FC = () => {
    const { members, addMember, updateMember, deleteMember } = useStore();
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', role: '', sector: '', ci: '', code: '' });
    const [searchQuery, setSearchQuery] = useState('');

    const filteredMembers = members.filter(member => 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.sector || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.ci || '').includes(searchQuery) ||
        (member.code || '').toLowerCase().includes(searchQuery.toLowerCase())
    );


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalCode = formData.code?.trim() ? formData.code.trim().toUpperCase() : getInitials(formData.name);
        const dataToSave = { ...formData, code: finalCode };

        if (isEditing) {
            await updateMember({ id: isEditing, ...dataToSave });
            setIsEditing(null);
            
            const sileo = (window as any).sileo;
            if (sileo) {
                sileo.success({ title: "Integrante actualizado" });
            }
        } else {
            await addMember(dataToSave);
        }
        setFormData({ name: '', role: '', sector: '', ci: '', code: '' });
    };

    return (
        <div className="h-full flex flex-col bg-gray-900">
            <div className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md px-10 py-6 border-b border-white/5">
                <div className="flex justify-between items-center gap-6">
                    <div className="flex items-center gap-8 flex-1">
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
                        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                        <input
                            className="input text-sm"
                            placeholder="Nombre"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <input
                            className="input text-sm w-32"
                            placeholder="N° C.I."
                            value={formData.ci}
                            onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
                        />
                        <input
                            className="input text-sm w-20 uppercase font-bold"
                            placeholder="Cód."
                            value={formData.code}
                            maxLength={4}
                            title="Código de operario (Autogenerado si está vacío)"
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        />
                        <select
                            className="input text-sm"
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
                        <button type="submit" className="btn btn-primary flex items-center gap-2">
                            <Plus size={18} /> Agregar
                        </button>
                    </form>
                )}
            </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar p-10">
            <div className="glass rounded-[2.5rem] overflow-hidden shadow-2xl border-white/10">
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
                                                    onClick={() => {
                                                        setIsEditing(member.id);
                                                        setFormData({ name: member.name, role: member.role, sector: member.sector || '', ci: member.ci || '', code: member.code || '' });
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

            {isEditing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass p-8 rounded-3xl w-full max-w-md space-y-4">
                        <h3 className="text-xl font-bold">Editar Integrante</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Nombre</label>
                                <input
                                    className="input w-full"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Rol</label>
                                <input
                                    className="input w-full"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">N° C.I. (Opcional)</label>
                                <input
                                    className="input w-full font-mono"
                                    value={formData.ci}
                                    onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Código</label>
                                <input
                                    className="input w-full uppercase font-bold"
                                    value={formData.code}
                                    maxLength={4}
                                    placeholder="Dejar vacío para usar iniciales"
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Sector</label>
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
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(null)}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary flex-1">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
