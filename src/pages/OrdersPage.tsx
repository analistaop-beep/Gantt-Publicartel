import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, Edit2, ClipboardList, Search, FileText, X, DollarSign, User, MapPin, AlignLeft, Upload, Loader2, Layers, ChevronDown, Printer } from 'lucide-react';
import { sileo } from 'sileo';
import { convertToWebP } from '../utils/fileUtils';
import { printOrderSummaryPDF } from '../utils/reportUtils';

export const OrdersPage: React.FC = () => {
    const { productionOrders, addProductionOrder, updateProductionOrder, deleteProductionOrder, uploadFile } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [viewingOrder, setViewingOrder] = useState<any | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        opNumber: '',
        client: '',
        seller: '',
        price: 0,
        currency: 'UYU' as 'UYU' | 'USD',
        description: '',
        address: '',
        category: 'Proyectos',
        status: 'Gestión de Acopio',
        files: [] as string[],
        comments: [] as Array<{ text: string, date: string }>
    });
    const [newComment, setNewComment] = useState('');
    const categories = ['Proyectos', 'Outdoor', 'Digital', 'Mantenimiento', 'Otros'];
    const statuses = ['Gestión de Acopio', 'En Proceso', 'Para Facturar', 'Terminada'];
    const sellers = ["W. Maciel", "P. Goicoechea", "N. Mannise", "F. Cruz", "P. Lizuain", "V. Castellucci", "Otro"];
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
                currency: order.currency || 'UYU',
                description: order.description || '',
                address: order.address || '',
                category: order.category || 'Proyectos',
                status: order.status || 'Gestión de Acopio',
                files: order.files || [],
                comments: order.comments || []
            });
        } else {
            setIsEditing(null);
            setFormData({
                opNumber: '',
                client: '',
                seller: '',
                price: 0,
                currency: 'UYU',
                description: '',
                address: '',
                category: 'Proyectos',
                status: 'Gestión de Acopio',
                files: [],
                comments: []
            });
        }
        setNewComment('');
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
            currency: 'UYU',
            description: '',
            address: '',
            category: 'Proyectos',
            status: 'Gestión de Acopio',
            files: [],
            comments: []
        });
        setNewComment('');
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

    const handleStatusChange = async (order: any, newStatus: string) => {
        try {
            await updateProductionOrder({ ...order, status: newStatus });
            sileo.success({ title: "Estado actualizado correctamente" });
        } catch (err: any) {
            sileo.error({
                title: "Error al actualizar estado",
                description: err.message
            });
        }
    };

    const handlePrintSummary = async (order: any) => {
        setIsPrinting(true);
        try {
            await printOrderSummaryPDF(order);
        } catch (err: any) {
            sileo.error({ title: 'Error al generar PDF', description: err.message });
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-gray-900">
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/80 backdrop-blur-md px-10 py-6 border-b border-slate-200 dark:border-white/5">
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
                <div className="glass rounded-[1.25rem] overflow-hidden shadow-2xl border-white/10">
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
                                                <button 
                                                    onClick={() => setViewingOrder(order)}
                                                    className="flex flex-col text-left group/client hover:opacity-80 transition-all"
                                                >
                                                    <span className="font-bold text-white text-sm group-hover/client:text-blue-400 transition-colors underline decoration-blue-500/30 underline-offset-4">{order.client}</span>
                                                    <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{order.address || 'Sin dirección'}</span>
                                                </button>
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
                                                        <div className="relative inline-block group/select">
                                                            <select
                                                                value={s}
                                                                onChange={(e) => handleStatusChange(order, e.target.value)}
                                                                className={`px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer outline-none transition-all hover:scale-105 appearance-none text-center pr-8 ${color}`}
                                                            >
                                                                {statuses.map(status => (
                                                                    <option key={status} value={status} className="bg-gray-900 text-white capitalize">{status}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown size={12} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 group-hover/select:opacity-100 transition-opacity ${color.split(' ')[0]}`} />
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-8 py-4 text-slate-300 text-sm">
                                                {order.seller}
                                            </td>
                                            <td className="px-8 py-4 font-mono text-emerald-400 font-bold text-center">
                                                {order.currency === 'USD' ? 'U$D' : '$U'} {(order.price || 0).toLocaleString('es-UY')}
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] p-8 rounded-sm w-full max-w-[80vw] shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold flex items-center gap-3">
                                {isEditing ? <Edit2 className="text-blue-400" size={20} /> : <Plus className="text-blue-400" size={20} />}
                                {isEditing ? 'EDITAR ORDEN DE PRODUCCIÓN' : 'NUEVA ORDEN DE PRODUCCIÓN'}
                            </h3>
                            <button onClick={closeModal} className="p-2 hover:bg-white/5 transition-colors text-slate-400 hover:text-white">
                                <X size={20} />
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
                                    <div className="flex gap-2">
                                        <div className="relative group flex-1">
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
                                        <div className="relative group">
                                            <select 
                                                className="input w-24 text-center appearance-none pr-8"
                                                value={formData.currency}
                                                onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'UYU' | 'USD' })}
                                            >
                                                <option value="UYU">UYU</option>
                                                <option value="USD">USD</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                                        </div>
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
                                        <select
                                            className="input w-full pl-12 appearance-none pr-10"
                                            value={formData.seller}
                                            onChange={(e) => setFormData({ ...formData, seller: e.target.value })}
                                            required
                                        >
                                            <option value="">Seleccionar vendedor</option>
                                            {sellers.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors" />
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
                                            className="input w-full pl-12 appearance-none pr-10"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            required
                                        >
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Estado de la Orden</label>
                                <div className="relative group">
                                    <ClipboardList size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    <select
                                        className="input w-full pl-12 appearance-none pr-10"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        required
                                    >
                                        {statuses.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors" />
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
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Comentarios del Usuario</label>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input 
                                            className="input flex-1 text-sm"
                                            placeholder="Escribir un comentario..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    if (newComment.trim()) {
                                                        const comment = {
                                                            text: newComment.trim(),
                                                            date: new Date().toISOString()
                                                        };
                                                        setFormData({
                                                            ...formData,
                                                            comments: [...formData.comments, comment]
                                                        });
                                                        setNewComment('');
                                                    }
                                                }
                                            }}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                if (newComment.trim()) {
                                                    const comment = {
                                                        text: newComment.trim(),
                                                        date: new Date().toISOString()
                                                    };
                                                    setFormData({
                                                        ...formData,
                                                        comments: [...formData.comments, comment]
                                                    });
                                                    setNewComment('');
                                                }
                                            }}
                                            className="btn btn-primary px-4"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>

                                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                        {formData.comments.length === 0 ? (
                                            <p className="text-[10px] text-slate-500 italic ml-1">No hay comentarios registrados.</p>
                                        ) : (
                                            [...formData.comments].reverse().map((c, i) => (
                                                <div key={i} className="glass p-3 rounded-lg border-white/5 space-y-1">
                                                    <p className="text-sm text-slate-200">{c.text}</p>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase">
                                                            {new Date(c.date).toLocaleString('es-UY', { 
                                                                day: '2-digit', month: '2-digit', year: 'numeric', 
                                                                hour: '2-digit', minute: '2-digit' 
                                                            })}
                                                        </span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const newComments = formData.comments.filter((_, idx) => (formData.comments.length - 1 - idx) !== i);
                                                                setFormData({ ...formData, comments: newComments });
                                                            }}
                                                            className="text-slate-500 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
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
                                        <div key={index} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-md group hover:border-blue-500/30 transition-all">
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
                                    className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20"
                                >
                                    {isEditing ? 'GUARDAR CAMBIOS' : 'CREAR ORDEN'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {viewingOrder && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f172a] p-10 rounded-none w-full max-w-full shadow-2xl border-x border-white/10 h-full max-h-screen overflow-y-auto custom-scrollbar relative">
                        <button 
                            onClick={() => setViewingOrder(null)} 
                            className="absolute top-8 right-8 p-3 hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
                        >
                            <X size={24} />
                        </button>

                        <div className="mb-10">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2 inline-block">
                                DETALLES DE ORDEN DE PRODUCCIÓN
                            </span>
                            <h3 className="text-3xl font-black tracking-tight text-white flex items-center gap-4">
                                OP <span className="text-blue-400">#{viewingOrder.opNumber}</span>
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="space-y-8">
                                <div>
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">CLIENTE</label>
                                    <p className="text-xl font-bold text-white">{viewingOrder.client}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">VENDEDOR</label>
                                    <p className="text-lg text-slate-300 font-medium">{viewingOrder.seller}</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">DIRECCIÓN</label>
                                    <p className="text-lg text-slate-300">{viewingOrder.address || 'No especificada'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">PRECIO VENTA</label>
                                    <p className="text-3xl font-black text-emerald-400">
                                        {viewingOrder.currency === 'USD' ? 'U$D' : '$U'} {viewingOrder.price?.toLocaleString('es-UY')}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">CATEGORÍA</label>
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block bg-white/5 px-3 py-1 rounded-sm border border-white/5 w-fit">
                                        {viewingOrder.category}
                                    </span>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">ESTADO</label>
                                    <span className="text-blue-400 text-xs font-bold uppercase tracking-wider block bg-blue-400/10 px-3 py-1 rounded-sm border border-blue-400/20 w-fit">
                                        {viewingOrder.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-10 border-t border-white/5 grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-3">DESCRIPCIÓN DEL PROYECTO</label>
                                    <div className="p-6 bg-white/[0.02] border border-white/5 text-slate-300 whitespace-pre-wrap leading-relaxed min-h-[150px]">
                                        {viewingOrder.description || 'Sin descripción detallada.'}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-3">ARCHIVOS ADJUNTOS</label>
                                    {viewingOrder.files?.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {viewingOrder.files.map((file: string, i: number) => (
                                                <a 
                                                    key={i} 
                                                    href={file} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 hover:bg-blue-600/10 hover:border-blue-500/30 transition-all rounded-sm group"
                                                >
                                                    <FileText size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-bold text-white truncate">Adjunto {i + 1}</span>
                                                        <span className="text-[9px] text-slate-500 uppercase tracking-tighter">VER ARCHIVO</span>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500 italic">No hay archivos adjuntos.</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                {viewingOrder.comments?.length > 0 ? (
                                    <div>
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-3">COMENTARIOS DEL USUARIO</label>
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                            {[...viewingOrder.comments].reverse().map((c: any, i: number) => (
                                                <div key={i} className="p-4 bg-white/[0.02] border border-white/5 space-y-2 rounded-sm">
                                                    <p className="text-sm text-slate-200 leading-relaxed">{c.text}</p>
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase block">
                                                        {new Date(c.date).toLocaleString('es-UY', { 
                                                            day: '2-digit', month: '2-digit', year: 'numeric', 
                                                            hour: '2-digit', minute: '2-digit' 
                                                        })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-3">COMENTARIOS DEL USUARIO</label>
                                        <div className="p-6 bg-white/[0.01] border border-dashed border-white/5 text-slate-500 italic text-sm text-center rounded-sm">
                                            No hay comentarios registrados.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-white/5 flex justify-end gap-3">
                            <button 
                                onClick={() => handlePrintSummary(viewingOrder)}
                                disabled={isPrinting}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all border border-blue-500/30 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isPrinting ? (
                                    <><Loader2 size={16} className="animate-spin" /> GENERANDO PDF...</>
                                ) : (
                                    <><Printer size={16} /> IMPRIMIR RESUMEN</>
                                )}
                            </button>
                            <button 
                                onClick={() => setViewingOrder(null)}
                                className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10"
                            >
                                CERRAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
