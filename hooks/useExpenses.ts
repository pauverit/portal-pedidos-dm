import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Expense, ExpenseMonthlyReport, ExpenseType } from '../types';

interface UseExpensesOptions {
    userId: string | undefined;
}

const KM_RATE_DEFAULT = 0.19; // €/km

export function useExpenses({ userId }: UseExpensesOptions) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async (month?: number, year?: number) => {
        if (!userId) return;
        setLoading(true);
        try {
            let query = supabase
                .from('expenses')
                .select('*')
                .eq('user_id', userId)
                .order('expense_date', { ascending: false });

            if (month !== undefined && year !== undefined) {
                const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                const endDate = new Date(year, month + 1, 0);
                const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
                query = query.gte('expense_date', start).lte('expense_date', end);
            }

            const { data, error } = await query;
            if (error) throw error;
            setExpenses((data || []).map(mapExpense));
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const createExpense = useCallback(async (data: {
        expenseDate: string;
        type: ExpenseType;
        description?: string;
        amount: number;
        km?: number;
        kmRate?: number;
        ticketImageUrl?: string;
        userRole: string;
        ticketFile?: File;
    }) => {
        if (!userId) throw new Error('No user ID');

        let imageUrl = data.ticketImageUrl || null;

        // Upload photo to Supabase Storage if provided
        if (data.ticketFile) {
            const ext = data.ticketFile.name.split('.').pop() || 'jpg';
            const path = `${userId}/${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from('expense-tickets')
                .upload(path, data.ticketFile, { upsert: false });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage
                .from('expense-tickets')
                .getPublicUrl(path);
            imageUrl = urlData.publicUrl;
        }

        const { error } = await supabase.from('expenses').insert([{
            user_id: userId,
            user_role: data.userRole,
            expense_date: data.expenseDate,
            type: data.type,
            description: data.description || null,
            amount: data.amount,
            km: data.km || 0,
            km_rate: data.kmRate || KM_RATE_DEFAULT,
            ticket_image_url: imageUrl,
        }]);
        if (error) throw error;
        await load();
    }, [userId, load]);

    const deleteExpense = useCallback(async (id: string) => {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw error;
        setExpenses(prev => prev.filter(e => e.id !== id));
    }, []);

    const getMonthlyReport = useCallback((month: number, year: number, allExpenses?: Expense[]): ExpenseMonthlyReport => {
        const source = allExpenses || expenses;
        const filtered = source.filter(e => {
            const d = new Date(e.expenseDate);
            return d.getMonth() === month && d.getFullYear() === year;
        });

        const byType: ExpenseMonthlyReport['byType'] = {
            restaurant: { count: 0, amount: 0 },
            km: { count: 0, amount: 0, km: 0 },
            hotel: { count: 0, amount: 0 },
            other: { count: 0, amount: 0 },
        };

        let totalAmount = 0;
        let totalKm = 0;
        let totalKmAmount = 0;

        for (const e of filtered) {
            byType[e.type].count++;
            byType[e.type].amount += e.amount;
            totalAmount += e.amount;
            if (e.type === 'km') {
                byType['km'].km = (byType['km'].km || 0) + (e.km || 0);
                totalKm += e.km || 0;
                totalKmAmount += e.amount;
            }
        }

        return { month, year, totalAmount, totalKm, totalKmAmount, byType, expenses: filtered };
    }, [expenses]);

    return { expenses, loading, load, createExpense, deleteExpense, getMonthlyReport };
}

// ── Mapper ────────────────────────────────────────────────────────────────────
function mapExpense(row: any): Expense {
    return {
        id: row.id,
        userId: row.user_id,
        userRole: row.user_role,
        expenseDate: row.expense_date,
        type: row.type,
        description: row.description,
        amount: row.amount,
        km: row.km,
        kmRate: row.km_rate,
        ticketImageUrl: row.ticket_image_url,
        createdAt: row.created_at,
    };
}
