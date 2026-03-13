import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Clock, CheckCircle, AlertTriangle, User, Calendar,
    Wrench, MessageSquare, Send, ChevronDown, X
} from 'lucide-react';
import { Incident, IncidentComment, IncidentStatus, User as UserType } from '../types';
import { useIncidents } from '../hooks/useIncidents';
import { useToast } from './Toast';

interface IncidentDetailProps {
    incident: Incident;
    currentUser: UserType;
    technicians: UserType[];
    onBack: () => void;
    onRefresh: () => void;
    onNewWorkOrder: (incidentId: string) => void;
}

const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string; icon: React.FC<any> }> = {
    pending: { label: 'Pendiente', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock },
    in_progress: { label: 'En curso', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: AlertTriangle },
    closed: { label: 'Cerrada', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
};

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
    low: { label: 'Baja', color: 'text-slate-500' },
    normal: { label: 'Normal', color: 'text-blue-600' },
    high: { label: 'Alta', color: 'text-orange-600' },
    urgent: { label: 'Urgente', color: 'text-red-600 font-bold' },
};

export const IncidentDetail: React.FC<IncidentDetailProps> = ({
    incident, currentUser, technicians, onBack, onRefresh, onNewWorkOrder
}) => {
    const [comments, setComments] = useState<IncidentComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [changingStatus, setChangingStatus] = useState(false);
    const { getComments, addComment, updateStatus, assignTech } = useIncidents({ autoLoad: false });
    const { toast } = useToast();
    const isTechLead = currentUser.role === 'tech_lead' || currentUser.role === 'admin';

    useEffect(() => {
        loadComments();
    }, [incident.id]);

    const loadComments = async () => {
        setLoadingComments(true);
        try {
            const data = await getComments(incident.id);
            setComments(data);
        } catch (err: any) {
            toast('Error al cargar comentarios: ' + err.message, 'error');
        } finally {
            setLoadingComments(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setSubmitting(true);
        try {
            await addComment(incident.id, currentUser.id, newComment.trim());
            setNewComment('');
            await loadComments();
        } catch (err: any) {
            toast('Error al añadir comentario: ' + err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (status: IncidentStatus) => {
        setChangingStatus(true);
        try {
            await updateStatus(incident.id, status);
            toast(`Estado cambiado a "${STATUS_CONFIG[status].label}"`, 'success');
            onRefresh();
        } catch (err: any) {
            toast('Error al cambiar estado: ' + err.message, 'error');
        } finally {
            setChangingStatus(false);
        }
    };

    const handleAssign = async (techId: string) => {
        try {
            await assignTech(incident.id, techId);
            toast('Técnico asignado', 'success');
            onRefresh();
        } catch (err: any) {
            toast('Error al asignar técnico: ' + err.message, 'error');
        }
    };

    const formatDate = (iso?: string) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const st = STATUS_CONFIG[incident.status];
    const StatusIcon = st.icon;
    const sev = SEVERITY_LABELS[incident.severity];

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4">
            {/* Back + Header */}
            <div className="flex items-start gap-3">
                <button
                    onClick={onBack}
                    className="mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-xl font-black text-slate-900 font-mono">{incident.reference}</h1>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${st.color}`}>
                            <StatusIcon size={13} />
                            {st.label}
                        </span>
                        <span className={`text-sm font-semibold ${sev.color}`}>
                            ⬤ Prioridad {sev.label}
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-1">{incident.clientName}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Main info */}
                <div className="md:col-span-2 space-y-4">
                    {/* Description card */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descripción</h2>
                        <p className="text-slate-800 text-sm leading-relaxed">{incident.description}</p>
                    </div>

                    {/* Activity / Comments */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Actividad
                            {comments.length > 0 && <span className="ml-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{comments.length}</span>}
                        </h2>

                        {/* Timeline */}
                        <div className="space-y-3">
                            {/* Created event */}
                            <div className="flex gap-3 items-start">
                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <AlertTriangle size={13} className="text-slate-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-slate-600">Incidencia creada</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(incident.createdAt)}</p>
                                </div>
                            </div>
                            {incident.closedAt && (
                                <div className="flex gap-3 items-start">
                                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <CheckCircle size={13} className="text-emerald-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-600">Incidencia cerrada</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(incident.closedAt)}</p>
                                    </div>
                                </div>
                            )}
                            {/* Comments */}
                            {loadingComments ? (
                                <p className="text-slate-400 text-sm py-2">Cargando comentarios…</p>
                            ) : (
                                comments.map(c => (
                                    <div key={c.id} className="flex gap-3 items-start bg-slate-50 rounded-xl p-3">
                                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                                            <MessageSquare size={12} className="text-indigo-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-slate-700">{c.authorName || 'Usuario'}</span>
                                                <span className="text-xs text-slate-400">{formatDate(c.createdAt)}</span>
                                            </div>
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.body}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add comment */}
                        <div className="flex gap-2 mt-2">
                            <textarea
                                rows={2}
                                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="Añade un comentario o nota…"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAddComment(); }}
                            />
                            <button
                                onClick={handleAddComment}
                                disabled={submitting || !newComment.trim()}
                                className="self-end px-3 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-700 disabled:opacity-40 transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-400">Ctrl+Enter para enviar</p>
                    </div>
                </div>

                {/* Sidebar panel */}
                <div className="space-y-4">
                    {/* Details card */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detalles</h2>

                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-2 text-slate-600">
                                <User size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                <div>
                                    <p className="text-xs text-slate-400 font-semibold">CLIENTE</p>
                                    <p className="font-medium">{incident.clientName || '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 text-slate-600">
                                <Wrench size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                <div>
                                    <p className="text-xs text-slate-400 font-semibold">TÉCNICO ASIGNADO</p>
                                    {isTechLead ? (
                                        <select
                                            className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={incident.assignedTo || ''}
                                            onChange={e => e.target.value && handleAssign(e.target.value)}
                                        >
                                            <option value="">Sin asignar</option>
                                            {technicians.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="font-medium">{incident.assignedToName || <span className="text-slate-400 italic">Sin asignar</span>}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-start gap-2 text-slate-600">
                                <Calendar size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                <div>
                                    <p className="text-xs text-slate-400 font-semibold">CREADA</p>
                                    <p className="font-medium">{formatDate(incident.createdAt)}</p>
                                </div>
                            </div>
                            {incident.closedAt && (
                                <div className="flex items-start gap-2 text-slate-600">
                                    <CheckCircle size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                                    <div>
                                        <p className="text-xs text-slate-400 font-semibold">CERRADA</p>
                                        <p className="font-medium">{formatDate(incident.closedAt)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Change status */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cambiar estado</h2>
                        <div className="space-y-2">
                            {(Object.keys(STATUS_CONFIG) as IncidentStatus[]).map(s => {
                                const cfg = STATUS_CONFIG[s];
                                const Icon = cfg.icon;
                                const isActive = incident.status === s;
                                return (
                                    <button
                                        key={s}
                                        disabled={isActive || changingStatus}
                                        onClick={() => handleStatusChange(s)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${isActive
                                                ? `${cfg.color} border opacity-100 cursor-default`
                                                : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                                            }`}
                                    >
                                        <Icon size={14} />
                                        {cfg.label}
                                        {isActive && <span className="ml-auto text-[10px] font-bold uppercase">Actual</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Create work order */}
                    {incident.status !== 'closed' && (
                        <button
                            onClick={() => onNewWorkOrder(incident.id)}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors"
                        >
                            <Wrench size={16} />
                            Crear Parte de Trabajo
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
