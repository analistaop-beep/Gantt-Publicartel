import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Download, Edit2, FilePlus2, FileText, Loader2, Plus, Printer, Search, Trash2, User, X } from 'lucide-react';
import { sileo } from 'sileo';
import { useStore } from '../store/useStore';
import { getInitials } from '../utils/stringUtils';
import { generateWorkerPDF } from '../utils/pdfGenerator';

type WorkerDocument = { url: string; document: string; originalName?: string; uploadedAt: string; expiresAt: string };
type WorkerForm = { name: string; code: string; ci: string; sector: string };
type DocumentEditor = { memberId: string; index: number | null; document: string; expiresAt: string; url: string };

const EMPTY_WORKER: WorkerForm = { name: '', code: '', ci: '', sector: '' };
const WORKER_SECTORS = ['Instalaciones', 'Herrería', 'Vinilos', 'Pintura', 'Impresión', 'Lonas', 'Carpintería', 'Corpóreas'];

const fileNameFromUrl = (url: string) => {
    const rawName = url.split('/').pop()?.split('?')[0] || 'Documento adjunto';
    try { return decodeURIComponent(rawName); } catch { return rawName; }
};

const normalizeDocument = (file: string | Partial<WorkerDocument>): WorkerDocument => {
    if (typeof file === 'string') {
        return { url: file, document: fileNameFromUrl(file), originalName: fileNameFromUrl(file), uploadedAt: '', expiresAt: '' };
    }
    const url = file.url || '';
    return {
        url,
        document: file.document || fileNameFromUrl(url),
        originalName: file.originalName || file.document || fileNameFromUrl(url),
        uploadedAt: file.uploadedAt || '',
        expiresAt: file.expiresAt || '',
    };
};

const formatDate = (value: string) => {
    if (!value) return 'Sin registro';
    const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const isExpired = (value: string) => {
    if (!value) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiration = new Date(`${value.slice(0, 10)}T00:00:00`);
    return !Number.isNaN(expiration.getTime()) && expiration < today;
};

export const MembersPage: React.FC = () => {
    const { members, addMember, updateMember, deleteMember, uploadMemberFile, checkMemberDocumentAlerts } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [workerEditorId, setWorkerEditorId] = useState<string | 'new' | null>(null);
    const [workerForm, setWorkerForm] = useState<WorkerForm>(EMPTY_WORKER);
    const [documentEditor, setDocumentEditor] = useState<DocumentEditor | null>(null);
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    React.useEffect(() => {
        if (members.length > 0) {
            void checkMemberDocumentAlerts().catch((error) => {
                console.error('Error checking RRHH document alerts:', error);
            });
        }
    }, [members, checkMemberDocumentAlerts]);

    const filteredMembers = useMemo(() => {
        const query = searchQuery.trim().toLocaleLowerCase('es');
        if (!query) return members;
        return members.filter((member) => [member.name, member.code, member.ci, member.sector]
            .some((value) => String(value || '').toLocaleLowerCase('es').includes(query)));
    }, [members, searchQuery]);

    const closeWorkerEditor = () => { setWorkerEditorId(null); setWorkerForm(EMPTY_WORKER); };
    const openNewWorker = () => { setWorkerForm(EMPTY_WORKER); setWorkerEditorId('new'); };
    const openWorkerEditor = (member: any) => {
        setWorkerForm({ name: member.name || '', code: member.code || '', ci: member.ci || '', sector: member.sector || '' });
        setWorkerEditorId(member.id);
    };

    const handleWorkerSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSaving(true);
        try {
            const code = workerForm.code.trim().toUpperCase() || getInitials(workerForm.name);
            if (workerEditorId === 'new') {
                await addMember({ ...workerForm, code, role: '', files: [] } as any);
                sileo.success({ title: 'Trabajador agregado' });
            } else if (workerEditorId) {
                const currentMember = members.find((member) => member.id === workerEditorId);
                await updateMember({ ...currentMember, ...workerForm, code });
                sileo.success({ title: 'Trabajador actualizado' });
            }
            closeWorkerEditor();
        } catch (error: any) {
            sileo.error({ title: 'No se pudo guardar', description: error.message });
        } finally { setIsSaving(false); }
    };

    const toggleRow = (memberId: string) => {
        setExpandedRows((current) => {
            const next = new Set(current);
            if (next.has(memberId)) next.delete(memberId); else next.add(memberId);
            return next;
        });
    };

    const openNewDocument = (memberId: string) => {
        setDocumentFile(null);
        setDocumentEditor({ memberId, index: null, document: '', expiresAt: '', url: '' });
    };
    const openDocumentEditor = (memberId: string, index: number, file: WorkerDocument) => {
        setDocumentFile(null);
        setDocumentEditor({ memberId, index, document: file.document, expiresAt: file.expiresAt, url: file.url });
    };
    const closeDocumentEditor = () => { setDocumentEditor(null); setDocumentFile(null); };

    const handleDocumentSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!documentEditor) return;
        if (documentEditor.index === null && !documentFile) {
            sileo.error({ title: 'Seleccioná un archivo' });
            return;
        }
        const member = members.find((item) => item.id === documentEditor.memberId);
        if (!member) return;
        setIsSaving(true);
        try {
            const existingFiles = (member.files || []).map(normalizeDocument);
            let url = documentEditor.url;
            if (documentFile) url = await uploadMemberFile(documentFile, documentFile.name);
            const nextDocument: WorkerDocument = {
                url,
                document: documentEditor.document.trim() || documentFile?.name || fileNameFromUrl(url),
                originalName: documentFile?.name || (documentEditor.index !== null ? existingFiles[documentEditor.index]?.originalName : '') || fileNameFromUrl(url),
                uploadedAt: documentEditor.index === null ? new Date().toISOString() : existingFiles[documentEditor.index]?.uploadedAt || new Date().toISOString(),
                expiresAt: documentEditor.expiresAt,
            };
            if (documentEditor.index === null) existingFiles.push(nextDocument); else existingFiles[documentEditor.index] = nextDocument;
            await updateMember({ ...member, files: existingFiles });
            setExpandedRows((current) => new Set(current).add(member.id));
            sileo.success({ title: documentEditor.index === null ? 'Documento cargado' : 'Documento actualizado' });
            closeDocumentEditor();
        } catch (error: any) {
            sileo.error({ title: 'No se pudo guardar el documento', description: error.message });
        } finally { setIsSaving(false); }
    };

    const handlePrint = async (member: any) => {
        try {
            await generateWorkerPDF(member);
            sileo.success({ title: 'Ficha generada' });
        } catch { sileo.error({ title: 'No se pudo generar la ficha' }); }
    };

    return (
        <div className="h-full flex flex-col">
            <header className="sticky top-0 z-30 bg-[#0f172a]/80 backdrop-blur-md px-4 py-4 md:px-10 md:py-6 border-b border-white/5 sticky-header-custom">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400 mb-1">Gestión de personal</p>
                        <h2 className="text-2xl font-bold">RRHH</h2>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative sm:w-80">
                            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input type="search" className="input-sm w-full pl-11 bg-white/5 border-white/10" placeholder="Buscar trabajador..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
                        </div>
                        <button type="button" onClick={openNewWorker} className="btn btn-primary flex items-center justify-center gap-2"><Plus size={18} /> Nuevo trabajador</button>
                    </div>
                </div>
            </header>

            <main className="flex-1 min-h-0 overflow-auto custom-scrollbar p-4 md:p-10">
                <div className="glass rounded-[1.25rem] overflow-hidden shadow-2xl border-white/10">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-[850px] text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10">
                                    <th className="w-14 px-5 py-4"><span className="sr-only">Desplegar</span></th>
                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre completo</th>
                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Código</th>
                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Número de C.I.</th>
                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Sector</th>
                                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredMembers.length === 0 ? (
                                    <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-500 italic">{searchQuery ? 'No se encontraron trabajadores.' : 'No hay trabajadores registrados.'}</td></tr>
                                ) : filteredMembers.map((member) => {
                                    const isExpanded = expandedRows.has(member.id);
                                    const documents = (member.files || []).map(normalizeDocument);
                                    const hasExpiredDocument = documents.some((file: WorkerDocument) => isExpired(file.expiresAt));
                                    return (
                                        <React.Fragment key={member.id}>
                                            <tr className={`group cursor-pointer transition-colors border-l-4 ${hasExpiredDocument ? 'bg-red-500/20 hover:bg-red-500/25 border-red-500' : isExpanded ? 'bg-blue-500/[0.05] border-blue-500/40' : 'hover:bg-white/[0.025] border-transparent'}`} onClick={() => toggleRow(member.id)}>
                                                <td className="px-5 py-3"><button type="button" className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10" aria-label={isExpanded ? 'Ocultar documentos' : 'Ver documentos'} aria-expanded={isExpanded}>{isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</button></td>
                                                <td className="px-4 py-3"><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-full flex items-center justify-center ${hasExpiredDocument ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/10 text-blue-400'}`}><User size={17} /></div><span className="font-bold text-white text-sm">{member.name}</span>{hasExpiredDocument && <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 border border-red-400/30 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-red-200"><AlertTriangle size={11} /> Documento vencido</span>}</div></td>
                                                <td className="px-4 py-3 text-blue-400 font-black text-xs uppercase tracking-wider">{member.code || getInitials(member.name)}</td>
                                                <td className="px-4 py-3 text-slate-300 font-mono text-xs">{member.ci || '—'}</td>
                                                <td className="px-4 py-3"><span className="inline-flex px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/20">{member.sector || 'Sin sector'}</span></td>
                                                <td className="px-5 py-3"><div className="flex gap-1 justify-end" onClick={(event) => event.stopPropagation()}>
                                                    <button type="button" onClick={() => handlePrint(member)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white" title="Imprimir ficha"><Printer size={15} /></button>
                                                    <button type="button" onClick={() => openWorkerEditor(member)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white" title="Modificar trabajador"><Edit2 size={15} /></button>
                                                    <button type="button" onClick={() => { if (confirm(`¿Eliminar a ${member.name}?`)) deleteMember(member.id); }} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400" title="Eliminar trabajador"><Trash2 size={15} /></button>
                                                </div></td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-slate-50/80 dark:bg-black/10"><td colSpan={6} className="p-0">
                                                    <div className="mx-5 mb-5 ml-16 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-[#0f172a]/60 shadow-sm dark:shadow-none">
                                                        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center gap-2 bg-slate-50/70 dark:bg-transparent"><FileText size={15} className="text-blue-600 dark:text-blue-400" /><span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Archivos adjuntos</span><span className="text-[10px] text-slate-500">{documents.length} {documents.length === 1 ? 'documento' : 'documentos'}</span></div>
                                                        <table className="w-full text-left">
                                                            <thead><tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/40 dark:bg-transparent">
                                                                <th className="px-5 py-3 text-[9px] uppercase tracking-widest text-slate-500">Documento</th>
                                                                <th className="px-5 py-3 text-[9px] uppercase tracking-widest text-slate-500">Fecha subido</th>
                                                                <th className="px-5 py-3 text-[9px] uppercase tracking-widest text-slate-500">Fecha vencimiento</th>
                                                                <th className="px-5 py-3 text-right"><span className="sr-only">Modificar</span></th>
                                                            </tr></thead>
                                                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                                {documents.map((file: WorkerDocument, index: number) => (
                                                                    <tr key={`${file.url}-${index}`} className="hover:bg-slate-50 dark:hover:bg-white/[0.025] transition-colors">
                                                                        <td className="px-5 py-3"><a href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"><Download size={14} /> {file.document}</a></td>
                                                                        <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-400">{formatDate(file.uploadedAt)}</td>
                                                                        <td className={`px-5 py-3 text-xs ${isExpired(file.expiresAt) ? 'font-black text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>{file.expiresAt ? formatDate(file.expiresAt) : 'Sin vencimiento'}</td>
                                                                        <td className="px-5 py-3 text-right"><button type="button" onClick={() => openDocumentEditor(member.id, index, file)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-[10px] font-bold uppercase tracking-wider transition-colors"><Edit2 size={13} /> Modificar</button></td>
                                                                    </tr>
                                                                ))}
                                                                {documents.length === 0 && <tr><td colSpan={4} className="px-5 py-6 text-center text-xs text-slate-500 italic">Este trabajador todavía no tiene documentos.</td></tr>}
                                                                <tr><td colSpan={4} className="px-5 py-3 bg-slate-50/70 dark:bg-white/[0.015]"><button type="button" onClick={() => openNewDocument(member.id)} className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"><FilePlus2 size={16} /> Cargar archivo nuevo</button></td></tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td></tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>

            {workerEditorId && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={closeWorkerEditor}>
                    <div className="bg-[#1e293b] w-full max-w-xl rounded-2xl shadow-2xl border border-white/10" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">RRHH</p><h3 className="text-lg font-bold">{workerEditorId === 'new' ? 'Nuevo trabajador' : 'Modificar trabajador'}</h3></div><button type="button" onClick={closeWorkerEditor} className="p-2 text-slate-400 hover:text-white"><X size={19} /></button></div>
                        <form onSubmit={handleWorkerSubmit} className="p-6 space-y-4">
                            <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre completo</label><input className="input w-full mt-1" value={workerForm.name} onChange={(event) => setWorkerForm({ ...workerForm, name: event.target.value })} required /></div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Código</label><input className="input w-full mt-1 uppercase font-bold" maxLength={4} placeholder="Se genera si queda vacío" value={workerForm.code} onChange={(event) => setWorkerForm({ ...workerForm, code: event.target.value })} /></div>
                                <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Número de C.I.</label><input className="input w-full mt-1 font-mono" value={workerForm.ci} onChange={(event) => setWorkerForm({ ...workerForm, ci: event.target.value })} required /></div>
                            </div>
                            <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sector</label><select className="input w-full mt-1" value={workerForm.sector} onChange={(event) => setWorkerForm({ ...workerForm, sector: event.target.value })} required><option value="" disabled>Seleccionar sector</option>{WORKER_SECTORS.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select></div>
                            <div className="flex gap-3 pt-3"><button type="button" onClick={closeWorkerEditor} className="btn flex-1 bg-white/5 hover:bg-white/10 border border-white/10">Cancelar</button><button type="submit" disabled={isSaving} className="btn btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">{isSaving && <Loader2 size={16} className="animate-spin" />} Guardar</button></div>
                        </form>
                    </div>
                </div>
            )}

            {documentEditor && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={closeDocumentEditor}>
                    <div className="bg-[#1e293b] w-full max-w-xl rounded-2xl shadow-2xl border border-white/10" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Archivo adjunto</p><h3 className="text-lg font-bold">{documentEditor.index === null ? 'Cargar documento' : 'Modificar documento'}</h3></div><button type="button" onClick={closeDocumentEditor} className="p-2 text-slate-400 hover:text-white"><X size={19} /></button></div>
                        <form onSubmit={handleDocumentSubmit} className="p-6 space-y-4">
                            <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Documento</label><input className="input w-full mt-1" placeholder="Ej.: Carné de salud" value={documentEditor.document} onChange={(event) => setDocumentEditor({ ...documentEditor, document: event.target.value })} /></div>
                            <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fecha vencimiento</label><input type="date" className="input w-full mt-1" value={documentEditor.expiresAt} onChange={(event) => setDocumentEditor({ ...documentEditor, expiresAt: event.target.value })} /><p className="text-[10px] text-slate-500 mt-1">Dejar vacío si el documento no vence.</p></div>
                            <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Archivo {documentEditor.index !== null && '(opcional)'}</label><input type="file" className="block w-full mt-1 text-xs text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-500/10 file:px-4 file:py-2.5 file:font-bold file:text-blue-400 hover:file:bg-blue-500/20" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} required={documentEditor.index === null} />{documentEditor.index !== null && <p className="text-[10px] text-slate-500 mt-1">Elegí un archivo sólo si querés reemplazar el actual.</p>}</div>
                            <div className="flex gap-3 pt-3"><button type="button" onClick={closeDocumentEditor} className="btn flex-1 bg-white/5 hover:bg-white/10 border border-white/10">Cancelar</button><button type="submit" disabled={isSaving} className="btn btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">{isSaving && <Loader2 size={16} className="animate-spin" />} Guardar documento</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
