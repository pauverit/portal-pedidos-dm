import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Incident, IncidentComment, IncidentStatus, IncidentSeverity } from '../types';

interface UseIncidentsOptions {
    technicianId?: string;   // filter by assigned tech (for 'tech' role)
    autoLoad?: boolean;
}

export const useIncidents = (options: UseIncidentsOptions = {}) => {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('incidents')
                .select(`
                    id, reference, client_id, machine_id, description,
                    status, severity, assigned_to, created_by,
                    created_at, closed_at
                `)
                .order('created_at', { ascending: false });

            if (options.technicianId) {
                query = query.eq('assigned_to', options.technicianId);
            }

            const { data, error: dbError } = await query;
            if (dbError) throw dbError;

            // Enrich with client names from users list
            const rows: Incident[] = (data || []).map((row: any) => ({
                id: row.id,
                reference: row.reference,
                clientId: row.client_id,
                machineId: row.machine_id,
                description: row.description,
                status: row.status as IncidentStatus,
                severity: row.severity as IncidentSeverity,
                assignedTo: row.assigned_to,
                createdBy: row.created_by,
                createdAt: row.created_at,
                closedAt: row.closed_at,
            }));

            // Enrich with client names
            const clientIds = [...new Set(rows.map(r => r.clientId).filter(Boolean))];
            if (clientIds.length > 0) {
                const { data: clients } = await supabase
                    .from('clients')
                    .select('id, company_name')
                    .in('id', clientIds);
                const clientMap: Record<string, string> = {};
                (clients || []).forEach((c: any) => { clientMap[c.id] = c.company_name; });
                rows.forEach(r => { r.clientName = clientMap[r.clientId] || '—'; });
            }

            // Enrich with technician names
            const techIds = [...new Set(rows.map(r => r.assignedTo).filter(Boolean))];
            if (techIds.length > 0) {
                const { data: techs } = await supabase
                    .from('clients')
                    .select('id, company_name')
                    .in('id', techIds);
                const techMap: Record<string, string> = {};
                (techs || []).forEach((t: any) => { techMap[t.id] = t.company_name; });
                rows.forEach(r => {
                    if (r.assignedTo) r.assignedToName = techMap[r.assignedTo] || '—';
                });
            }

            setIncidents(rows);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [options.technicianId]);

    useEffect(() => {
        if (options.autoLoad !== false) load();
    }, [load]);

    const createIncident = async (data: {
        clientId: string;
        machineId?: string;
        description: string;
        severity: IncidentSeverity;
        assignedTo?: string;
        createdBy?: string;
    }) => {
        const { error } = await supabase.from('incidents').insert({
            client_id: data.clientId,
            machine_id: data.machineId || null,
            description: data.description,
            severity: data.severity,
            assigned_to: data.assignedTo || null,
            created_by: data.createdBy || null,
        });
        if (error) throw error;
        await load();
    };

    const updateStatus = async (id: string, status: IncidentStatus) => {
        const { error } = await supabase
            .from('incidents')
            .update({
                status,
                closed_at: status === 'closed' ? new Date().toISOString() : null,
            })
            .eq('id', id);
        if (error) throw error;
        await load();
    };

    const assignTech = async (id: string, techId: string) => {
        const { error } = await supabase
            .from('incidents')
            .update({ assigned_to: techId, status: 'in_progress' })
            .eq('id', id);
        if (error) throw error;
        await load();
    };

    const getComments = async (incidentId: string): Promise<IncidentComment[]> => {
        const { data, error } = await supabase
            .from('incident_comments')
            .select('id, incident_id, author_id, body, created_at')
            .eq('incident_id', incidentId)
            .order('created_at', { ascending: true });
        if (error) throw error;

        const comments: IncidentComment[] = (data || []).map((c: any) => ({
            id: c.id,
            incidentId: c.incident_id,
            authorId: c.author_id,
            body: c.body,
            createdAt: c.created_at,
        }));

        // Enrich with author names
        const authorIds = [...new Set(comments.map(c => c.authorId).filter(Boolean))];
        if (authorIds.length > 0) {
            const { data: authors } = await supabase
                .from('clients')
                .select('id, company_name')
                .in('id', authorIds);
            const authorMap: Record<string, string> = {};
            (authors || []).forEach((a: any) => { authorMap[a.id] = a.company_name; });
            comments.forEach(c => { c.authorName = authorMap[c.authorId] || 'Desconocido'; });
        }
        return comments;
    };

    const addComment = async (incidentId: string, authorId: string, body: string) => {
        const { error } = await supabase.from('incident_comments').insert({
            incident_id: incidentId,
            author_id: authorId,
            body,
        });
        if (error) throw error;
    };

    return { incidents, loading, error, load, createIncident, updateStatus, assignTech, getComments, addComment };
};
