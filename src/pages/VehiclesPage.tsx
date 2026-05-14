import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, Edit2, Truck } from 'lucide-react';
import { sileo } from 'sileo';

export const VehiclesPage: React.FC = () => {
    const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useStore();
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', plate: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await updateVehicle({ id: isEditing, ...formData });
                setIsEditing(null);
                sileo.success({ title: "Vehículo actualizado" });
            } else {
                await addVehicle(formData);
                sileo.success({ title: "Vehículo agregado" });
            }
            setFormData({ name: '', plate: '' });
        } catch (err: any) {
            sileo.error({
                title: "Error al guardar",
                description: err.message || "No se pudo procesar la solicitud"
            });
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-gray-900">
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/80 backdrop-blur-md px-10 py-6 border-b border-slate-200 dark:border-white/5">
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
                    <div key={vehicle.id} className="glass p-5 rounded-md flex items-center justify-between group">
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] p-8 rounded-sm w-full max-w-[80vw] shadow-2xl border border-white/10">
                        <h3 className="text-xl font-bold mb-6">EDITAR VEHÍCULO</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre / Modelo</label>
                                <input
                                    className="input w-full"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Patente</label>
                                <input
                                    className="input w-full"
                                    value={formData.plate}
                                    onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                                    required
                                />
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
