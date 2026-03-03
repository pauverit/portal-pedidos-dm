import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Machine, MaintenanceContract } from '../types';

export const useMachines = () => {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(false);

    const loadByClient = useCallback(async (clientId: string) => {
        if (!clientId) { setMachines([]); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('machines')
                .select('id, client_id, serial_number, model, brand, install_date, warranty_expires, status, notes, image_url, created_at')
                .eq('client_id', clientId)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Check active contracts
            const ids = (data || []).map((m: any) => m.id);
            let contractMap: Record<string, boolean> = {};
            if (ids.length > 0) {
                const today = new Date().toISOString().split('T')[0];
                const { data: contracts } = await supabase
                    .from('maintenance_contracts')
                    .select('machine_id, active, end_date')
                    .in('machine_id', ids)
                    .eq('active', true)
                    .gte('end_date', today);
                (contracts || []).forEach((c: any) => { contractMap[c.machine_id] = true; });
            }

            const rows: Machine[] = (data || []).map((m: any) => ({
                id: m.id,
                clientId: m.client_id,
                serialNumber: m.serial_number,
                model: m.model || '',
                brand: m.brand || '',
                installDate: m.install_date,
                warrantyExpires: m.warranty_expires,
                status: m.status,
                notes: m.notes,
                createdAt: m.created_at,
                imageUrl: m.image_url || undefined,
                hasActiveContract: contractMap[m.id] || false,
            }));

            setMachines(rows);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('machines')
                .select('id, client_id, serial_number, model, brand, install_date, warranty_expires, status, notes, image_url, created_at')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setMachines((data || []).map((m: any) => ({
                id: m.id,
                clientId: m.client_id,
                serialNumber: m.serial_number,
                model: m.model || '',
                brand: m.brand || '',
                installDate: m.install_date,
                warrantyExpires: m.warranty_expires,
                status: m.status,
                notes: m.notes,
                createdAt: m.created_at,
                imageUrl: m.image_url || undefined,
            })));
        } finally {
            setLoading(false);
        }
    }, []);

    const createMachine = async (data: {
        clientId: string;
        serialNumber: string;
        model: string;
        brand: string;
        installDate?: string;
        warrantyExpires?: string;
        notes?: string;
    }) => {
        const { data: inserted, error } = await supabase.from('machines').insert({
            client_id: data.clientId,
            serial_number: data.serialNumber,
            model: data.model,
            brand: data.brand,
            install_date: data.installDate || null,
            warranty_expires: data.warrantyExpires || null,
            notes: data.notes || null,
        }).select('id').single();
        if (error) throw error;
        return inserted as { id: string };
    };

    const updateMachine = async (id: string, data: Partial<{
        serialNumber: string;
        model: string;
        brand: string;
        installDate: string;
        warrantyExpires: string;
        status: string;
        notes: string;
    }>) => {
        const { error } = await supabase.from('machines').update({
            serial_number: data.serialNumber,
            model: data.model,
            brand: data.brand,
            install_date: data.installDate,
            warranty_expires: data.warrantyExpires,
            status: data.status,
            notes: data.notes,
        }).eq('id', id);
        if (error) throw error;
    };

    return { machines, loading, loadByClient, loadAll, createMachine, updateMachine };
};
