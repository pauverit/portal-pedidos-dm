import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SATPartDoc, PartStatus } from '../components/SATPartDetail';

interface Options {
    technicianId?: string;
    clientId?: string; // When set, only fetch parts belonging to this client
}

export const useSATParts = (options: Options = {}) => {
    const [parts, setParts] = useState<SATPartDoc[]>([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            let q = supabase
                .from('incidents')
                .select('*')
                .order('created_at', { ascending: false });

            // Filter by client (for client role — they only see their own parts)
            if (options.clientId) {
                q = q.eq('client_id', options.clientId);
            } else if (options.technicianId) {
                // Tech sees: their assigned parts AND unassigned parts
                q = q.or(`assigned_to.eq.${options.technicianId},assigned_to.is.null`);
            }

            const { data, error } = await q;
            if (error) throw error;

            // Collect IDs for enrichment
            const clientIds = [...new Set((data || []).map((r: any) => r.client_id).filter(Boolean))];
            const assignedIds = [...new Set([
                ...(data || []).map((r: any) => r.assigned_to).filter(Boolean),
                ...(data || []).map((r: any) => r.created_by).filter(Boolean),
            ])];
            const machineIds = [...new Set((data || []).map((r: any) => r.machine_id).filter(Boolean))];

            const [clientsRes, techsRes, machinesRes] = await Promise.all([
                clientIds.length ? supabase.from('clients').select('id, company_name').in('id', clientIds) : { data: [], error: null },
                assignedIds.length ? supabase.from('clients').select('id, company_name').in('id', assignedIds) : { data: [], error: null },
                machineIds.length ? supabase.from('machines').select('id, brand, model, serial_number').in('id', machineIds) : { data: [], error: null },
            ]);

            const cMap: Record<string, string> = {};
            (clientsRes.data || []).forEach((c: any) => { cMap[c.id] = c.company_name; });
            const tMap: Record<string, string> = {};
            (techsRes.data || []).forEach((t: any) => { tMap[t.id] = t.company_name; });
            const mMap: Record<string, string> = {};
            (machinesRes.data || []).forEach((m: any) => { mMap[m.id] = [m.brand, m.model, `(${m.serial_number})`].filter(Boolean).join(' '); });

            setParts((data || []).map((r: any) => ({
                id: r.id,
                reference: r.reference,
                clientId: r.client_id,
                clientName: cMap[r.client_id] || '—',
                assignedTo: r.assigned_to || undefined,
                assignedToName: tMap[r.assigned_to] || undefined,
                machineId: r.machine_id || undefined,
                machineName: mMap[r.machine_id] || undefined,
                // Map old statuses to unified ones for backwards compatibility
                status: (r.status === 'pending' ? 'open' : r.status === 'closed' ? 'signed' : r.status) as PartStatus,
                // Use priority column if available, fall back to severity
                priority: r.priority || r.severity || 'normal',
                description: r.description || '',
                resolution: r.resolution || undefined,
                incidentType: r.incident_type || undefined,
                estimatedMinutes: r.estimated_minutes || undefined,
                scheduledAt: r.scheduled_at || undefined,
                startedAt: r.started_at || undefined,
                closedAt: r.closed_at || undefined,
                cancelledReason: r.cancelled_reason || undefined,
                signatureUrl: r.signature_url || undefined,
                createdBy: r.created_by || undefined,
                createdByName: tMap[r.created_by] || cMap[r.created_by] || undefined,
                createdAt: r.created_at,
            })));
        } catch (err: any) {
            console.error('useSATParts.load error:', err?.message || err);
        } finally {
            setLoading(false);
        }
    }, [options.technicianId, options.clientId]);

    const createPart = async (d: {
        clientId: string;
        machineId?: string;
        description: string;
        priority?: string;
        incidentType?: string;
        estimatedMinutes?: number;
        assignedTo?: string;
        scheduledAt?: string;
        createdBy: string;
    }) => {
        const { data: inserted, error } = await supabase.from('incidents').insert({
            client_id: d.clientId,
            machine_id: d.machineId || null,
            description: d.description,
            // Use 'pending' for backwards compatibility with old DB constraint.
            // After running sat_parts_migration.sql this becomes 'open'.
            status: 'pending',
            severity: d.priority || 'normal',  // old schema column
            priority: d.priority || 'normal',  // new schema column (after migration)
            incident_type: d.incidentType || null,
            estimated_minutes: d.estimatedMinutes || null,
            assigned_to: d.assignedTo || null,
            scheduled_at: d.scheduledAt || null,
            created_by: d.createdBy,
        }).select('id').single();
        if (error) {
            console.error('createPart error:', error);
            throw error;
        }
        return inserted;
    };

    const updatePart = async (id: string, d: Partial<SATPartDoc>) => {
        const payload: Record<string, any> = {};
        if (d.status !== undefined) payload.status = d.status;
        if (d.priority !== undefined) {
            payload.severity = d.priority;  // old schema
            payload.priority = d.priority;  // new schema (after migration)
        }
        if (d.assignedTo !== undefined) payload.assigned_to = d.assignedTo || null;
        if (d.machineId !== undefined) payload.machine_id = d.machineId || null;
        if (d.description !== undefined) payload.description = d.description;
        if (d.resolution !== undefined) payload.resolution = d.resolution || null;
        if (d.incidentType !== undefined) payload.incident_type = d.incidentType || null;
        if (d.estimatedMinutes !== undefined) payload.estimated_minutes = d.estimatedMinutes || null;
        if (d.scheduledAt !== undefined) payload.scheduled_at = d.scheduledAt || null;
        if (d.startedAt !== undefined) payload.started_at = d.startedAt || null;
        if (d.closedAt !== undefined) payload.closed_at = d.closedAt || null;
        if (d.cancelledReason !== undefined) payload.cancelled_reason = d.cancelledReason || null;
        if (d.signatureUrl !== undefined) payload.signature_url = d.signatureUrl || null;

        // Also store priority field (write both old and new column name for compatibility)
        if (d.priority !== undefined) {
            payload.severity = d.priority;  // old schema column
            payload.priority = d.priority;  // new schema column (after migration)
        }

        const { error } = await supabase.from('incidents').update(payload).eq('id', id);
        if (error) {
            console.error('updatePart error:', error);
            throw error;
        }
    };

    return { parts, loading, load, createPart, updatePart };
};
