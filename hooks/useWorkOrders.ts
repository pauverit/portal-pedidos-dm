import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface WorkOrder {
    id: string;
    reference: string;          // PAR-XXXXX
    incidentId?: string;
    clientId: string;
    clientName?: string;
    assignedTo?: string;
    assignedToName?: string;
    machineId?: string;
    machineName?: string;
    status: 'draft' | 'scheduled' | 'in_progress' | 'done' | 'invoiced';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    description: string;
    resolution?: string;
    incidentType?: string;
    estimatedMinutes?: number;
    scheduledAt?: string;
    startedAt?: string;
    closedAt?: string;
    createdBy?: string;
    createdByName?: string;
    createdAt: string;
}

interface Options {
    technicianId?: string;
    autoLoad?: boolean;
}

export const useWorkOrders = (options: Options = {}) => {
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            let q = supabase
                .from('work_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (options.technicianId) {
                q = q.eq('assigned_to', options.technicianId);
            }

            const { data, error } = await q;
            if (error) throw error;

            // Enrich with names
            const clientIds = [...new Set((data || []).map((r: any) => r.client_id).filter(Boolean))];
            const techIds = [...new Set([
                ...(data || []).map((r: any) => r.assigned_to).filter(Boolean),
                ...(data || []).map((r: any) => r.created_by).filter(Boolean),
            ])];
            const machineIds = [...new Set((data || []).map((r: any) => r.machine_id).filter(Boolean))];

            const [clientsRes, techsRes, machinesRes] = await Promise.all([
                clientIds.length ? supabase.from('clients').select('id, company_name').in('id', clientIds) : { data: [] },
                techIds.length ? supabase.from('clients').select('id, company_name').in('id', techIds) : { data: [] },
                machineIds.length ? supabase.from('machines').select('id, brand, model, serial_number').in('id', machineIds) : { data: [] },
            ]);

            const cMap: Record<string, string> = {};
            (clientsRes.data || []).forEach((c: any) => { cMap[c.id] = c.company_name; });
            const tMap: Record<string, string> = {};
            (techsRes.data || []).forEach((t: any) => { tMap[t.id] = t.company_name; });
            const mMap: Record<string, string> = {};
            (machinesRes.data || []).forEach((m: any) => { mMap[m.id] = `${m.brand} ${m.model} (${m.serial_number})`; });

            setWorkOrders((data || []).map((r: any) => ({
                id: r.id,
                reference: r.reference,
                incidentId: r.incident_id,
                clientId: r.client_id,
                clientName: cMap[r.client_id] || r.client_id,
                assignedTo: r.assigned_to,
                assignedToName: tMap[r.assigned_to] || r.assigned_to,
                machineId: r.machine_id,
                machineName: mMap[r.machine_id],
                status: r.status,
                priority: r.priority || 'normal',
                description: r.description || '',
                resolution: r.resolution,
                incidentType: r.incident_type,
                estimatedMinutes: r.estimated_minutes,
                scheduledAt: r.scheduled_at,
                startedAt: r.started_at,
                closedAt: r.closed_at,
                createdBy: r.created_by,
                createdByName: tMap[r.created_by] || cMap[r.created_by] || '',
                createdAt: r.created_at,
            })));
        } finally {
            setLoading(false);
        }
    }, [options.technicianId]);

    const createWorkOrder = async (d: {
        clientId: string;
        machineId?: string;
        incidentId?: string;
        assignedTo?: string;
        description: string;
        priority?: string;
        incidentType?: string;
        estimatedMinutes?: number;
        scheduledAt?: string;
        createdBy: string;
    }) => {
        const { error } = await supabase.from('work_orders').insert({
            client_id: d.clientId,
            machine_id: d.machineId || null,
            incident_id: d.incidentId || null,
            assigned_to: d.assignedTo || null,
            description: d.description,
            priority: d.priority || 'normal',
            status: 'draft',
            incident_type: d.incidentType || null,
            estimated_minutes: d.estimatedMinutes || null,
            scheduled_at: d.scheduledAt || null,
            created_by: d.createdBy,
        });
        if (error) throw error;
    };

    const updateWorkOrder = async (id: string, d: Partial<{
        assignedTo: string;
        machineId: string;
        status: string;
        priority: string;
        description: string;
        resolution: string;
        incidentType: string;
        estimatedMinutes: number;
        scheduledAt: string;
        startedAt: string;
        closedAt: string;
    }>) => {
        const payload: Record<string, any> = {};
        if (d.assignedTo !== undefined) payload.assigned_to = d.assignedTo || null;
        if (d.machineId !== undefined) payload.machine_id = d.machineId || null;
        if (d.status !== undefined) payload.status = d.status;
        if (d.priority !== undefined) payload.priority = d.priority;
        if (d.description !== undefined) payload.description = d.description;
        if (d.resolution !== undefined) payload.resolution = d.resolution;
        if (d.incidentType !== undefined) payload.incident_type = d.incidentType;
        if (d.estimatedMinutes !== undefined) payload.estimated_minutes = d.estimatedMinutes;
        if (d.scheduledAt !== undefined) payload.scheduled_at = d.scheduledAt;
        if (d.startedAt !== undefined) payload.started_at = d.startedAt;
        if (d.closedAt !== undefined) payload.closed_at = d.closedAt;

        const { error } = await supabase.from('work_orders').update(payload).eq('id', id);
        if (error) throw error;
    };

    return { workOrders, loading, load, createWorkOrder, updateWorkOrder };
};
