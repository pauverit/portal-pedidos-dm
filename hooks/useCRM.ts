import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ClientVisit, ClientCall } from '../types';

interface UseCRMOptions {
    salesRepId: string | undefined;
    loadAll?: boolean; // true for directors: load all sales reps' activity
}

export function useCRM({ salesRepId, loadAll = false }: UseCRMOptions) {
    const [visits, setVisits] = useState<ClientVisit[]>([]);
    const [calls, setCalls] = useState<ClientCall[]>([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        if (!salesRepId && !loadAll) return;
        setLoading(true);
        try {
            const visitsQuery = supabase.from('client_visits').select('*').order('visit_date', { ascending: false });
            const callsQuery = supabase.from('client_calls').select('*').order('call_date', { ascending: false });
            const [visitsRes, callsRes] = await Promise.all([
                loadAll ? visitsQuery : visitsQuery.eq('sales_rep_id', salesRepId!),
                loadAll ? callsQuery : callsQuery.eq('sales_rep_id', salesRepId!),
            ]);

            if (visitsRes.error) throw visitsRes.error;
            if (callsRes.error) throw callsRes.error;

            setVisits((visitsRes.data || []).map(mapVisit));
            setCalls((callsRes.data || []).map(mapCall));
        } finally {
            setLoading(false);
        }
    }, [salesRepId]);

    const createVisit = useCallback(async (data: {
        clientId: string;
        visitDate: string;
        notes?: string;
        nextAction?: string;
    }) => {
        if (!salesRepId) throw new Error('No sales rep ID');
        const { error } = await supabase.from('client_visits').insert([{
            client_id: data.clientId,
            sales_rep_id: salesRepId,
            visit_date: data.visitDate,
            notes: data.notes || null,
            next_action: data.nextAction || null,
        }]);
        if (error) throw error;
        await load();
    }, [salesRepId, load]);

    const createCall = useCallback(async (data: {
        clientId: string;
        callDate: string;
        direction: 'outbound' | 'inbound';
        summary?: string;
    }) => {
        if (!salesRepId) throw new Error('No sales rep ID');
        const { error } = await supabase.from('client_calls').insert([{
            client_id: data.clientId,
            sales_rep_id: salesRepId,
            call_date: data.callDate,
            direction: data.direction,
            summary: data.summary || null,
        }]);
        if (error) throw error;
        await load();
    }, [salesRepId, load]);

    const deleteVisit = useCallback(async (id: string) => {
        const { error } = await supabase.from('client_visits').delete().eq('id', id);
        if (error) throw error;
        setVisits(prev => prev.filter(v => v.id !== id));
    }, []);

    const deleteCall = useCallback(async (id: string) => {
        const { error } = await supabase.from('client_calls').delete().eq('id', id);
        if (error) throw error;
        setCalls(prev => prev.filter(c => c.id !== id));
    }, []);

    return { visits, calls, loading, load, createVisit, createCall, deleteVisit, deleteCall };
}

// ── Mappers ───────────────────────────────────────────────────────────────────
function mapVisit(row: any): ClientVisit {
    return {
        id: row.id,
        clientId: row.client_id,
        clientName: row.client_name,
        salesRepId: row.sales_rep_id,
        visitDate: row.visit_date,
        notes: row.notes,
        nextAction: row.next_action,
        createdAt: row.created_at,
    };
}

function mapCall(row: any): ClientCall {
    return {
        id: row.id,
        clientId: row.client_id,
        clientName: row.client_name,
        salesRepId: row.sales_rep_id,
        callDate: row.call_date,
        direction: row.direction,
        summary: row.summary,
        createdAt: row.created_at,
    };
}
