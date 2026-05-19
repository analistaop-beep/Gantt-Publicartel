import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, Edit2, ClipboardList, Search, FileText, X, DollarSign, User, MapPin, AlignLeft, Upload, Loader2, Layers, ChevronDown, Printer, Eye, ExternalLink, Calendar, Users, Bold, Italic } from 'lucide-react';
import { sileo } from 'sileo';
import { convertToWebP } from '../utils/fileUtils';
import { printOrderSummaryPDF } from '../utils/reportUtils';

export const OrdersPage: React.FC = () => {
    const { 
        productionOrders, 
        addProductionOrder, 
        updateProductionOrder, 
        deleteProductionOrder, 
        uploadFile,
        tasks,
        herreriaTasks,
        corporeasTasks,
        lonasTasks,
        pinturaTasks,
        addTask,
        deleteTask,
        members,
        vehicles
    } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [viewingOrder, setViewingOrder] = useState<any | null>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // State for associated task creation modal
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskMemberSearch, setTaskMemberSearch] = useState('');
    const [taskFormData, setTaskFormData] = useState({
        opNumber: '',
        name: '',
        client: '',
        address: '',
        totalHours: 8,
        duration: 8,
        vehicles: [] as string[],
        members: [] as Array<{ id: string, hours: number }>,
        date: '',
        teamId: null as string | null,
        section: 'Instalaciones'
    });

    const isImageFile = (url: string) => {
        const ext = url.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '');
    };

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isTaskModalOpen) {
                    setIsTaskModalOpen(false);
                } else if (lightboxImage) {
                    setLightboxImage(null);
                } else if (viewingOrder) {
                    setViewingOrder(null);
                } else if (isModalOpen) {
                    closeModal();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxImage, viewingOrder, isModalOpen, isTaskModalOpen]);

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
        (order.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
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

    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const applyFormatting = (formatType: 'bold' | 'italic') => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.description;
        const selectedText = text.substring(start, end);
        
        let replacement = '';
        if (formatType === 'bold') {
            replacement = `**${selectedText}**`;
        } else {
            replacement = `*${selectedText}*`;
        }
        
        const newText = text.substring(0, start) + replacement + text.substring(end);
        setFormData(prev => ({ ...prev, description: newText }));
        
        // Reset focus and selection
        setTimeout(() => {
            textarea.focus();
            const addedLen = formatType === 'bold' ? 2 : 1;
            textarea.setSelectionRange(start + addedLen, start + addedLen + selectedText.length);
        }, 0);
    };

    const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            applyFormatting('bold');
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            applyFormatting('italic');
        }
    };

    const renderFormattedText = (text: string) => {
        if (!text) return null;
        const lines = text.split('\n');
        return lines.map((line, lineIdx) => {
            const parts = [];
            let i = 0;
            
            while (i < line.length) {
                if (line.startsWith('**', i)) {
                    const closeIdx = line.indexOf('**', i + 2);
                    if (closeIdx !== -1) {
                        parts.push(<strong key={i} className="font-extrabold text-white">{line.substring(i + 2, closeIdx)}</strong>);
                        i = closeIdx + 2;
                        continue;
                    }
                } else if (line.startsWith('*', i)) {
                    const closeIdx = line.indexOf('*', i + 1);
                    if (closeIdx !== -1) {
                        parts.push(<em key={i} className="italic text-slate-300">{line.substring(i + 1, closeIdx)}</em>);
                        i = closeIdx + 1;
                        continue;
                    }
                }
                
                let nextMarker = line.length;
                const nextBold = line.indexOf('**', i + 1);
                const nextItalic = line.indexOf('*', i + 1);
                
                if (nextBold !== -1 && nextBold < nextMarker) nextMarker = nextBold;
                if (nextItalic !== -1 && nextItalic < nextMarker) nextMarker = nextItalic;
                
                parts.push(line.substring(i, nextMarker));
                i = nextMarker;
            }
            
            return (
                <React.Fragment key={lineIdx}>
                    {parts}
                    {lineIdx < lines.length - 1 && <br />}
                </React.Fragment>
            );
        });
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

    // Associated Tasks Calculations & Handlers
    const allTasks = React.useMemo(() => {
        return [
            ...(tasks || []).map(t => ({ ...t, section: t.section || 'Instalaciones', type: t.type || 'instalacion' })),
            ...(herreriaTasks || []).map(t => ({ ...t, section: 'Herrería', type: t.type || 'herreria' })),
            ...(corporeasTasks || []).map(t => ({ ...t, section: 'Corpóreas', type: t.type || 'corporeas' })),
            ...(lonasTasks || []).map(t => ({ ...t, section: 'Lonas', type: t.type || 'lonas' })),
            ...(pinturaTasks || []).map(t => ({ ...t, section: 'Pintura', type: t.type || 'pintura' }))
        ];
    }, [tasks, herreriaTasks, corporeasTasks, lonasTasks, pinturaTasks]);

    const linkedTasks = React.useMemo(() => {
        if (!viewingOrder) return [];
        return allTasks.filter(t => t.opNumber?.toString().trim() === viewingOrder.opNumber?.toString().trim());
    }, [allTasks, viewingOrder]);

    const handleOpenRegisterTask = () => {
        if (!viewingOrder) return;
        setTaskFormData({
            opNumber: viewingOrder.opNumber || '',
            name: '',
            client: viewingOrder.client || '',
            address: viewingOrder.address || '',
            totalHours: 8,
            duration: 8,
            vehicles: [],
            members: [],
            date: '',
            teamId: null,
            section: 'Instalaciones'
        });
        setTaskMemberSearch('');
        setIsTaskModalOpen(true);
    };

    const handleTaskSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const sectionToType: Record<string, string> = {
                'Instalaciones': 'instalacion',
                'Herrería': 'herreria',
                'Corpóreas': 'corporeas',
                'Lonas': 'lonas',
                'Pintura': 'pintura'
            };
            
            await addTask({
                ...taskFormData,
                type: sectionToType[taskFormData.section] as any
            });

            sileo.success({ title: 'Tarea registrada con éxito' });
            setIsTaskModalOpen(false);
        } catch (err: any) {
            sileo.error({
                title: 'Error al registrar tarea',
                description: err.message || 'No se pudo crear la tarea'
            });
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
            try {
                await deleteTask(taskId);
                sileo.success({ title: 'Tarea eliminada con éxito' });
            } catch (err: any) {
                sileo.error({
                    title: 'Error al eliminar tarea',
                    description: err.message
                });
            }
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="sticky top-0 z-30 bg-[#0f172a]/80 backdrop-blur-md px-10 py-6 border-b border-white/5">
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
                                placeholder="Buscar por OP, cliente, vendedor, categoría..."
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
                                <div className="flex justify-between items-center mr-1">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Descripción</label>
                                    <div className="flex gap-2 mb-1">
                                        <button
                                            type="button"
                                            onClick={() => applyFormatting('bold')}
                                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-[10px] font-bold border border-white/10 flex items-center gap-1 transition-all hover:scale-105"
                                            title="Negrita (Ctrl+B)"
                                        >
                                            <Bold size={11} className="text-slate-400" /> Negrita
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyFormatting('italic')}
                                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-[10px] italic border border-white/10 flex items-center gap-1 transition-all hover:scale-105"
                                            title="Cursiva (Ctrl+I)"
                                        >
                                            <Italic size={11} className="text-slate-400" /> Cursiva
                                        </button>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <AlignLeft size={18} className="absolute left-4 top-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    <textarea
                                        ref={textareaRef}
                                        className="input w-full pl-12 pt-3 min-h-[100px]"
                                        placeholder="Detalles del trabajo..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        onKeyDown={handleTextareaKeyDown}
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
                    <div className="bg-[#0f172a] w-full max-w-6xl shadow-2xl border border-white/10 rounded-2xl h-full max-h-[92vh] flex flex-col overflow-hidden relative">

                        {/* Header */}
                        <div className="flex items-center justify-between px-10 py-7 border-b border-white/8 flex-shrink-0 bg-[#0f172a]/80 backdrop-blur-sm">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1 block">
                                    ORDEN DE PRODUCCIÓN
                                </span>
                                <h3 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                                    OP <span className="text-blue-400">#{viewingOrder.opNumber}</span>
                                </h3>
                            </div>
                            <button
                                onClick={() => setViewingOrder(null)}
                                className="p-2.5 hover:bg-white/8 transition-colors text-slate-400 hover:text-white rounded-xl"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Info Grid (original style) */}
                        <div className="px-10 py-8 border-b border-white/5 flex-shrink-0 bg-white/[0.025]">
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
                                        {(() => {
                                            const s = viewingOrder.status || '';
                                            let color = 'text-slate-400 bg-white/5 border-white/10';
                                            if (s === 'Gestión de Acopio') color = 'text-amber-400 bg-amber-400/10 border-amber-400/20';
                                            if (s === 'En Proceso') color = 'text-blue-400 bg-blue-400/10 border-blue-400/20';
                                            if (s === 'Para Facturar') color = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
                                            if (s === 'Terminada') color = 'text-slate-500 bg-white/5 border-white/10';
                                            return (
                                                <span className={`text-xs font-bold uppercase tracking-wider block px-3 py-1 rounded-sm border w-fit ${color}`}>
                                                    {s}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Body – two columns */}
                        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_380px]">

                            {/* Left: Description + Comments */}
                            <div className="overflow-y-auto custom-scrollbar p-8 space-y-8 border-r border-white/5">


                                {/* Description */}
                                <div>
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-3">DESCRIPCIÓN DEL PROYECTO</label>
                                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl text-slate-300 leading-relaxed min-h-[120px] text-sm">
                                        {viewingOrder.description ? (
                                            renderFormattedText(viewingOrder.description)
                                        ) : (
                                            <span className="italic text-slate-500">Sin descripción detallada.</span>
                                        )}
                                    </div>
                                </div>

                                {/* Associated Tasks */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">
                                            TAREAS ASOCIADAS
                                            {linkedTasks.length > 0 && (
                                                <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[9px] font-black">
                                                    {linkedTasks.length}
                                                </span>
                                            )}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleOpenRegisterTask}
                                            className="px-3 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 font-bold border border-blue-500/20 rounded-lg text-[10px] uppercase transition-all tracking-wider flex items-center gap-1.5"
                                        >
                                            <Plus size={12} /> Registrar nueva tarea
                                        </button>
                                    </div>
                                    {linkedTasks.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {linkedTasks.map((task: any) => {
                                                let badgeColor = 'text-blue-400 bg-blue-400/10 border-blue-400/20';
                                                if (task.section === 'Herrería') badgeColor = 'text-orange-400 bg-orange-400/10 border-orange-400/20';
                                                if (task.section === 'Corpóreas') badgeColor = 'text-purple-400 bg-purple-400/10 border-purple-400/20';
                                                if (task.section === 'Lonas') badgeColor = 'text-pink-400 bg-pink-400/10 border-pink-400/20';
                                                if (task.section === 'Pintura') badgeColor = 'text-teal-400 bg-teal-400/10 border-teal-400/20';

                                                return (
                                                    <div key={task.id} className="p-4 bg-white/[0.015] border border-white/5 rounded-xl space-y-2 hover:bg-white/[0.03] transition-colors relative group/task-card">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider ${badgeColor}`}>
                                                                {task.section}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteTask(task.id)}
                                                                className="opacity-0 group-hover/task-card:opacity-100 p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                                                                title="Eliminar tarea"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                        <h4 className="text-sm font-bold text-white truncate">{task.name}</h4>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-500">
                                                            <div className="flex items-center gap-1">
                                                                <Calendar size={12} className="text-slate-400" />
                                                                <span>{task.date ? new Date(task.date + 'T12:00:00').toLocaleDateString('es-UY') : 'Sin fecha'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Users size={12} className="text-slate-400" />
                                                                <span>{(task.members || []).length} operarios</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 font-mono font-bold text-emerald-400">
                                                                <span>{task.totalHours} hrs</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-white/[0.01] border border-dashed border-white/8 text-slate-500 italic text-sm text-center rounded-xl">
                                            No hay tareas registradas para esta Orden de Producción.
                                        </div>
                                    )}
                                </div>

                                {/* Comments */}
                                <div>
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-3">
                                        COMENTARIOS
                                        {viewingOrder.comments?.length > 0 && (
                                            <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[9px] font-black">
                                                {viewingOrder.comments.length}
                                            </span>
                                        )}
                                    </label>
                                    {viewingOrder.comments?.length > 0 ? (
                                        <div className="space-y-3">
                                            {[...viewingOrder.comments].reverse().map((c: any, i: number) => (
                                                <div key={i} className="p-4 bg-white/[0.025] border border-white/5 rounded-xl space-y-1.5 hover:bg-white/[0.04] transition-colors">
                                                    <p className="text-sm text-slate-200 leading-relaxed">{c.text}</p>
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                                                        {new Date(c.date).toLocaleString('es-UY', {
                                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-white/[0.01] border border-dashed border-white/8 text-slate-500 italic text-sm text-center rounded-xl">
                                            No hay comentarios registrados.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: File thumbnails */}
                            <div className="overflow-y-auto custom-scrollbar p-6 bg-[#0a1120]">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-4">
                                    ARCHIVOS ADJUNTOS
                                    {viewingOrder.files?.length > 0 && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-slate-700/60 text-slate-400 rounded text-[9px] font-black">
                                            {viewingOrder.files.length}
                                        </span>
                                    )}
                                </label>
                                {viewingOrder.files?.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {viewingOrder.files.map((file: string, i: number) => {
                                            const isImg = isImageFile(file);
                                            const fileName = file.split('/').pop() || `Archivo ${i + 1}`;
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => isImg ? setLightboxImage(file) : window.open(file, '_blank')}
                                                    className="group relative aspect-square rounded-xl overflow-hidden bg-slate-800/50 border border-white/8 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer"
                                                    title={fileName}
                                                >
                                                    {isImg ? (
                                                        <img
                                                            src={file}
                                                            alt={`Adjunto ${i + 1}`}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-slate-900/30">
                                                            <div className="w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                                                                <FileText size={28} className="text-red-400" />
                                                            </div>
                                                            <span className="text-[9px] font-bold text-slate-400 group-hover:text-white transition-colors uppercase tracking-wide">PDF</span>
                                                            <span className="text-[8px] text-slate-600 truncate w-full text-center mt-1 px-1">{fileName}</span>
                                                        </div>
                                                    )}

                                                    {/* Hover overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                                                {isImg ? `Img ${i + 1}` : `PDF ${i + 1}`}
                                                            </span>
                                                            <div className="flex gap-1.5">
                                                                {isImg && (
                                                                    <div className="p-1.5 bg-blue-600/90 text-white rounded-lg flex items-center justify-center">
                                                                        <Eye size={12} />
                                                                    </div>
                                                                )}
                                                                <a
                                                                    href={file}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="p-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg flex items-center justify-center transition-colors"
                                                                    title="Abrir en nueva pestaña"
                                                                >
                                                                    <ExternalLink size={12} />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 text-slate-600 border border-dashed border-white/5 rounded-xl">
                                        <FileText size={36} className="mb-3 opacity-30" />
                                        <span className="text-xs italic">Sin archivos adjuntos</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 border-t border-white/8 flex-shrink-0 flex justify-end gap-3 bg-[#0f172a]/80">
                            <button
                                onClick={() => handlePrintSummary(viewingOrder)}
                                disabled={isPrinting}
                                className="px-7 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all border border-blue-500/30 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-sm"
                            >
                                {isPrinting ? (
                                    <><Loader2 size={15} className="animate-spin" /> GENERANDO...</>
                                ) : (
                                    <><Printer size={15} /> IMPRIMIR RESUMEN</>
                                )}
                            </button>
                            <button
                                onClick={() => setViewingOrder(null)}
                                className="px-7 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10 rounded-xl text-sm"
                            >
                                CERRAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox for viewing images */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[100] p-4 cursor-zoom-out animate-in"
                    onClick={() => setLightboxImage(null)}
                >
                    <button
                        onClick={() => setLightboxImage(null)}
                        className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors border border-white/10 cursor-pointer"
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={lightboxImage}
                        alt="Vista ampliada"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10 cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <a
                        href={lightboxImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 border border-blue-500/30 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink size={16} /> Abrir en nueva pestaña
                    </a>
                </div>
            )}

            {/* Task Creation Modal */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-[#0f172a] w-full max-w-4xl shadow-2xl border border-white/10 rounded-2xl h-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-white/10 flex-shrink-0 bg-[#0f172a]/80 backdrop-blur-sm">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1 block">
                                    REGISTRAR TAREA
                                </span>
                                <h3 className="text-2xl font-black text-white flex items-center gap-2">
                                    OP <span className="text-blue-400">#{taskFormData.opNumber}</span>
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsTaskModalOpen(false)}
                                className="p-2.5 hover:bg-white/8 transition-colors text-slate-400 hover:text-white rounded-xl"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleTaskSubmit} className="flex-1 min-h-0 flex flex-col">
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                                <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
                                    
                                    {/* Left: General Task Details */}
                                    <div className="space-y-6">
                                        <div className="bg-white/[0.015] border border-white/5 p-6 rounded-xl space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">SECCIÓN</label>
                                                    <select
                                                        className="input w-full"
                                                        value={taskFormData.section}
                                                        onChange={(e) => setTaskFormData({ ...taskFormData, section: e.target.value })}
                                                        required
                                                    >
                                                        <option value="Instalaciones">Instalaciones</option>
                                                        <option value="Herrería">Herrería</option>
                                                        <option value="Corpóreas">Corpóreas</option>
                                                        <option value="Lonas">Lonas</option>
                                                        <option value="Pintura">Pintura</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">FECHA</label>
                                                    <input
                                                        type="date"
                                                        className="input w-full font-bold text-slate-200"
                                                        value={taskFormData.date}
                                                        onChange={(e) => setTaskFormData({ ...taskFormData, date: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">DESCRIPCIÓN / TAREA</label>
                                                <input
                                                    type="text"
                                                    className="input w-full"
                                                    placeholder="Ej: Colocar vinilo impreso..."
                                                    value={taskFormData.name}
                                                    onChange={(e) => setTaskFormData({ ...taskFormData, name: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">CLIENTE</label>
                                                    <input
                                                        type="text"
                                                        className="input w-full"
                                                        value={taskFormData.client}
                                                        onChange={(e) => setTaskFormData({ ...taskFormData, client: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">DIRECCIÓN</label>
                                                    <input
                                                        type="text"
                                                        className="input w-full"
                                                        value={taskFormData.address}
                                                        onChange={(e) => setTaskFormData({ ...taskFormData, address: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Hours */}
                                            <div className="bg-blue-500/[0.02] border border-blue-500/10 p-5 rounded-xl space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">TOTAL HORAS PREVISTAS</label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    className="input w-full font-mono font-bold text-emerald-400 text-xl"
                                                    value={taskFormData.totalHours}
                                                    onChange={(e) => {
                                                        const total = parseFloat(e.target.value) || 0;
                                                        setTaskFormData({ ...taskFormData, totalHours: total, duration: total });
                                                    }}
                                                    required
                                                />
                                            </div>

                                            {/* Vehicles */}
                                            <div className="bg-orange-500/[0.02] border border-orange-500/10 p-5 rounded-xl space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">VEHÍCULOS ASIGNADOS</label>
                                                <select
                                                    className="input w-full text-xs"
                                                    value=""
                                                    onChange={(e) => {
                                                        const vehicleId = e.target.value;
                                                        if (vehicleId && !taskFormData.vehicles.includes(vehicleId)) {
                                                            setTaskFormData({ ...taskFormData, vehicles: [...taskFormData.vehicles, vehicleId] });
                                                        }
                                                    }}
                                                >
                                                    <option value="">SELECCIONAR VEHÍCULO...</option>
                                                    {(vehicles || []).map(v => (
                                                        <option key={v.id} value={v.id} disabled={taskFormData.vehicles.includes(v.id)}>
                                                            {v.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {taskFormData.vehicles.map(vId => {
                                                        const vehicle = vehicles.find(v => v.id === vId);
                                                        if (!vehicle) return null;
                                                        return (
                                                            <span key={vId} className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-black text-slate-300 uppercase">
                                                                {vehicle.name}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setTaskFormData({ ...taskFormData, vehicles: taskFormData.vehicles.filter(id => id !== vId) })}
                                                                    className="text-red-500 hover:text-red-400"
                                                                >
                                                                    <X size={10} />
                                                                </button>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Personal */}
                                    <div className="bg-white/[0.015] border border-white/5 p-5 rounded-xl flex flex-col min-h-[350px]">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-purple-400 block mb-3">PERSONAL ASIGNADO</label>
                                        <div className="relative mb-3 flex-shrink-0">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                                            <input
                                                type="text"
                                                placeholder="BUSCAR EMPLEADO..."
                                                className="w-full bg-white/5 border border-white/10 px-8 py-1.5 rounded-lg text-[10px] font-bold outline-none text-slate-200 uppercase"
                                                value={taskMemberSearch}
                                                onChange={(e) => setTaskMemberSearch(e.target.value)}
                                            />
                                        </div>
                                        
                                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1 bg-slate-950/40 p-2 border border-white/5 rounded-lg">
                                            {(members || [])
                                                .filter(m => m.sector === taskFormData.section && m.name.toLowerCase().includes(taskMemberSearch.toLowerCase()))
                                                .map(m => {
                                                    const assignedMember = taskFormData.members.find(am => am.id === m.id);
                                                    const isChecked = !!assignedMember;
                                                    return (
                                                        <div key={m.id} className="flex items-center justify-between gap-2 p-2 border border-transparent hover:border-white/5 hover:bg-white/5 transition-all rounded-lg">
                                                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-blue-500"
                                                                    checked={isChecked}
                                                                    onChange={(e) => {
                                                                        const newMembers = e.target.checked
                                                                            ? [...taskFormData.members, { id: m.id, hours: 8 }]
                                                                            : taskFormData.members.filter(am => am.id !== m.id);
                                                                        setTaskFormData({ ...taskFormData, members: newMembers });
                                                                    }}
                                                                />
                                                                <span className="text-xs font-black text-slate-300 uppercase truncate">{m.name}</span>
                                                            </label>
                                                            {isChecked && (
                                                                <input
                                                                    type="number"
                                                                    step="0.5"
                                                                    className="w-12 h-6 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] text-center font-bold text-blue-400 focus:outline-none"
                                                                    value={assignedMember.hours}
                                                                    onChange={(e) => {
                                                                        const hours = parseFloat(e.target.value) || 0;
                                                                        const newMembers = taskFormData.members.map(am =>
                                                                            am.id === m.id ? { ...am, hours } : am
                                                                        );
                                                                        setTaskFormData({ ...taskFormData, members: newMembers });
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            {!(members || []).some(m => m.sector === taskFormData.section) && (
                                                <span className="text-[10px] text-slate-500 italic block text-center pt-8">Sin integrantes en esta sección</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-8 py-5 border-t border-white/10 flex-shrink-0 flex justify-end gap-3 bg-[#0f172a]/80">
                                <button
                                    type="button"
                                    onClick={() => setIsTaskModalOpen(false)}
                                    className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10 rounded-xl text-sm uppercase tracking-wider"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20 rounded-xl text-sm uppercase tracking-wider"
                                >
                                    REGISTRAR TAREA
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
