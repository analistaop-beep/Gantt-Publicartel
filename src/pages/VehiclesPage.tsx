import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, Edit2, Truck } from 'lucide-react';

export const VehiclesPage: React.FC = () => {
    const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useStore();
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', plate: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) {
            await updateVehicle({ id: isEditing, ...formData });
            setIsEditing(null);
        } else {
            await addVehicle(formData);
        }
        setFormData({ name: '', plate: '' });
    };

    return (
        <div className="h-full flex flex-col bg-gray-900">
            <div className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md px-10 py-6 border-b border-white/5">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Vehículos</h2>
                {!isEditing && (
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            className="input text-sm"
                            placeholder="Nombre / Modelo"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <input
                            className="input text-sm"
                            placeholder="Patente"
                            value={formData.plate}
                            onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                            required
                        />
                        <button type="submit" className="btn btn-primary flex items-center gap-2">
                            <Plus size={18} /> Agregar
                        </button>
                    </form>
                )}
            </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="glass p-5 rounded-2xl flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400">
                                <Truck size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold">{vehicle.name}</h3>
                                <p className="text-sm text-slate-400 uppercase">{vehicle.plate}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => {
                                    setIsEditing(vehicle.id);
                                    setFormData({ name: vehicle.name, plate: vehicle.plate });
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => deleteVehicle(vehicle.id)}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                </div>
            </div>

            {isEditing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass p-8 rounded-3xl w-full max-w-md space-y-4">
                        <h3 className="text-xl font-bold">Editar Vehículo</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Nombre / Modelo</label>
                                <input
                                    className="input w-full"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Patente</label>
                                <input
                                    className="input w-full"
                                    value={formData.plate}
                                    onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                                    required
                                />
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
