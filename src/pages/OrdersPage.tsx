import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, Edit2, ClipboardList, Search, FileText, X, DollarSign, User, MapPin, AlignLeft, Upload, Loader2, Layers } from 'lucide-react';
import { sileo } from 'sileo';
import { convertToWebP } from '../utils/fileUtils';

export const OrdersPage: React.FC = () => {
    const { productionOrders, addProductionOrder, updateProductionOrder, deleteProductionOrder, uploadFile } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        opNumber: '',
        client: '',
        seller: '',
        price: 0,
        description: '',
        address: '',
        category: 'Proyectos',
        status: 'Gestión de Acopio',
        files: [] as string[]
    });
    const categories = ['Proyectos', 'Outdoor', 'Digital', 'Mantenimiento', 'Otros'];
    const statuses = ['Gestión de Acopio', 'En Proceso', 'Para Facturar', 'Terminada'];
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const filteredOrders = productionOrders.filter(order =>
        order.opNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await updateProductionOrder({ id: isEditing, ...formData });
                sileo.success({ title: "Orden de producción actualizada" });
            } else {
                await addProductionOrder(formData);
                sileo.success({ title: "Orden de producción creada" });
            }
            closeModal();
        } catch (err: any) {
            sileo.error({
                title: "Error al guardar",
                description: err.message || "No se pudo procesar la solicitud"
            });
        }
    };

    const openModal = (order?: any) => {
        if (order) {
            setIsEditing(order.id);
            setFormData({
                opNumber: order.opNumber,
                client: order.client,
                seller: order.seller,
                price: order.price,
                description: order.description || '',
                address: order.address || '',
                category: order.category || 'Proyectos',
                status: order.status || 'Gestión de Acopio',
                files: order.files || []
            });
        } else {
            setIsEditing(null);
            setFormData({
                opNumber: '',
                client: '',
                seller: '',
                price: 0,
                description: '',
                address: '',
                category: 'Proyectos',
                status: 'Gestión de Acopio',
                files: []
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsEditing(null);
        setFormData({
            opNumber: '',
            client: '',
            seller: '',
            price: 0,
            description: '',
            address: '',
            category: 'Proyectos',
            status: 'Gestión de Acopio',
            files: []
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setIsUploading(true);
        try {
            const uploadedUrls: string[] = [];
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                let fileToUpload: File | Blob = file;
                let fileName = file.name;

                // Check if it's an image
                if (file.type.startsWith('image/')) {
                    fileToUpload = await convertToWebP(file);
                    fileName = fileName.replace(/\.[^/.]+$/, "") + ".webp";
                }

                const url = await uploadFile(fileToUpload, fileName);
                uploadedUrls.push(url);
            }

            setFormData(prev => ({
                ...prev,
                files: [...prev.files, ...uploadedUrls]
            }));
            sileo.success({ title: "Archivos subidos correctamente" });
        } catch (err: any) {
            sileo.error({
                title: "Error al subir archivos",
                description: err.message
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeFile = (index: number) => {
        const newFiles = [...formData.files];
        newFiles.splice(index, 1);
        setFormData({ ...formData, files: newFiles });
    };

    return (
        <div className="h-full flex flex-col bg-gray-900">
            <div className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md px-10 py-6 border-b border-white/5">
                <div className="flex justify-between items-center gap-6">
                    <div className="flex items-center gap-8 flex-1">
                        <h2 className="text-2xl font-bold whitespace-nowrap flex items-center gap-3">
                            <ClipboardList className="text-blue-400" />
                            Órdenes de Producción
                        </h2>

                        <div className="relative flex-1 max-w-md group">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type="text"
                                className="input-sm w-full pl-12 bg-white/5 border-white/10"
                                placeholder="Buscar por OP, cliente, vendedor..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <button 
                        onClick={() => openModal()}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} /> Nueva Orden
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar p-10">
                <div className="glass rounded-[2.5rem] overflow-hidden shadow-2xl border-white/10">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10">
                                    <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">N° OP</th>
                                    <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Cliente</th>
                                    <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Categoría</th>
                                    <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Estado</th>
                                    <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Vendedor</th>
                                    <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Precio Venta</th>
                                    <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Archivos</th>
                                    <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center text-slate-500 italic">
                                            {searchQuery ? 'No se encontraron órdenes que coincidan con la búsqueda.' : 'No hay órdenes registradas.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-4">
                                                <span className="font-mono font-bold text-blue-400">{order.opNumber}</span>
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white text-sm">{order.client}</span>
                                                    <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{order.address || 'Sin dirección'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/5 text-slate-400 border border-white/10">
                                                    {order.category || 'Sin Cat.'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-center">
                                                {(() => {
                                                    const s = order.status || 'Gestión de Acopio';
                                                    let color = 'text-slate-400 bg-white/5 border-white/10';
                                                    if (s === 'Gestión de Acopio') color = 'text-amber-400 bg-amber-400/10 border-amber-400/20';
                                                    if (s === 'En Proceso') color = 'text-blue-400 bg-blue-400/10 border-blue-400/20';
                                                    if (s === 'Para Facturar') color = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
                                                    if (s === 'Terminada') color = 'text-slate-500 bg-white/5 border-white/10';
                                                    
                                                    return (
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${color}`}>
                                                            {s}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-8 py-4 text-slate-300 text-sm">
                                                {order.seller}
                                            </td>
                                            <td className="px-8 py-4 font-mono text-emerald-400 font-bold text-center">
                                                ${(order.price || 0).toLocaleString('es-AR')}
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex -space-x-2">
                                                    {(order.files || []).slice(0, 3).map((file: string, i: number) => (
                                                        <a 
                                                            key={i} 
                                                            href={file} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-600/20 hover:border-blue-500/50 transition-all cursor-pointer" 
                                                            title={file.split('/').pop()}
                                                        >
                                                            <FileText size={14} />
                                                        </a>
                                                    ))}
                                                    {(order.files || []).length > 3 && (
                                                        <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                            +{(order.files || []).length - 3}
                                                        </div>
                                                    )}
                                                    {(order.files || []).length === 0 && <span className="text-[10px] text-slate-600 italic">Sin archivos</span>}
                                                </div>
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <button
                                                        onClick={() => openModal(order)}
                                                        className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all hover:scale-110"
                                                        title="Editar orden"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`¿Eliminar la orden ${order.opNumber}?`)) {
                                                                deleteProductionOrder(order.id);
                                                            }
                                                        }}
                                                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all hover:scale-110"
                                                        title="Eliminar orden"
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="glass p-8 rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-bold flex items-center gap-3">
                                {isEditing ? <Edit2 className="text-blue-400" /> : <Plus className="text-blue-400" />}
                                {isEditing ? 'Editar Orden de Producción' : 'Nueva Orden de Producción'}
                            </h3>
                            <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Número de OP</label>
                                    <div className="relative group">
                                        <ClipboardList size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                        <input
                                            className="input w-full pl-12"
                                            placeholder="Ej: 12345"
                                            value={formData.opNumber}
                                            onChange={(e) => setFormData({ ...formData, opNumber: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Precio Venta</label>
                                    <div className="relative group">
                                        <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                                        <input
                                            type="number"
                                            className="input w-full pl-12"
                                            placeholder="0.00"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Cliente</label>
                                    <div className="relative group">
                                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                        <input
                                            className="input w-full pl-12"
                                            placeholder="Nombre del cliente"
                                            value={formData.client}
                                            onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Vendedor</label>
                                    <div className="relative group">
                                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                        <input
                                            className="input w-full pl-12"
                                            placeholder="Nombre del vendedor"
                                            value={formData.seller}
                                            onChange={(e) => setFormData({ ...formData, seller: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Dirección</label>
                                    <div className="relative group">
                                        <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                        <input
                                            className="input w-full pl-12"
                                            placeholder="Dirección de entrega/obra"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Categoría</label>
                                    <div className="relative group">
                                        <Layers size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                        <select
                                            className="input w-full pl-12 appearance-none"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            required
                                        >
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Estado de la Orden</label>
                                <div className="relative group">
                                    <ClipboardList size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    <select
                                        className="input w-full pl-12 appearance-none"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        required
                                    >
                                        {statuses.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Descripción</label>
                                <div className="relative group">
                                    <AlignLeft size={18} className="absolute left-4 top-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    <textarea
                                        className="input w-full pl-12 pt-3 min-h-[100px]"
                                        placeholder="Detalles del trabajo..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Archivos / Adjuntos (Fotos o PDF)</label>
                                <div className="flex flex-col gap-4">
                                    <input
                                        type="file"
                                        className="hidden"
                                        ref={fileInputRef}
                                        multiple
                                        accept="image/*,application/pdf"
                                        onChange={handleFileUpload}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="btn btn-secondary w-full py-4 border-dashed border-2 flex flex-col items-center gap-2 hover:border-blue-500/50 hover:bg-blue-500/5"
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 size={24} className="animate-spin text-blue-400" />
                                                <span className="text-sm font-bold">Subiendo y convirtiendo...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={24} className="text-slate-400" />
                                                <span className="text-sm font-bold">Click para subir archivos</span>
                                                <span className="text-[10px] text-slate-500">Imágenes se convertirán a WebP automáticamente</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.files.map((file, index) => (
                                        <div key={index} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl group hover:border-blue-500/30 transition-all">
                                            <FileText size={14} className="text-blue-400" />
                                            <a href={file} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-300 hover:text-white truncate max-w-[150px]">
                                                {file.split('/').pop()}
                                            </a>
                                            <button 
                                                type="button" 
                                                onClick={() => removeFile(index)}
                                                className="text-slate-500 hover:text-red-400 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.files.length === 0 && !isUploading && (
                                        <span className="text-xs text-slate-500 italic">No hay archivos adjuntos.</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary flex-1">
                                    {isEditing ? 'Guardar Cambios' : 'Crear Orden'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
