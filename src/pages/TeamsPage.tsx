import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, Edit2 } from 'lucide-react';

export const TeamsPage: React.FC = () => {
    const { teams, addTeam, updateTeam, deleteTeam } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            await updateTeam({ id: editingId, ...formData });
        } else {
            await addTeam(formData);
        }
        closeModal();
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ name: '' });
    };



    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Equipos</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={18} /> Nuevo Equipo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map((team) => {
                    return (
                        <div key={team.id} className="glass p-6 rounded-md space-y-4 group">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-blue-400">{team.name}</h3>
                                    <p className="text-sm text-slate-400 italic">Carril de planificación</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingId(team.id);
                                            setFormData({
                                                name: team.name
                                            });
                                            setIsModalOpen(true);
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => deleteTeam(team.id)}
                                        className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>


                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass p-8 rounded-[1rem] w-full max-w-2xl max-h-[90vh] overflow-auto space-y-6">
                        <h3 className="text-2xl font-bold">{editingId ? 'Editar' : 'Nuevo'} Equipo</h3>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Nombre del Equipo / Carril</label>
                                <input
                                    className="input w-full"
                                    placeholder="Ej: Equipo A"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary flex-1">
                                    {editingId ? 'Guardar Cambios' : 'Crear Equipo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
