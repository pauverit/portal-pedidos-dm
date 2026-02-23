import { supabase } from '../lib/supabase';
import emailjs from '@emailjs/browser';
import { User, CartItem, Order } from '../types';
import { SALES_REPS, SALES_REPS_EMAILS, SALES_REPS_PHONES } from '../constants';

export const orderService = {
    async finalizeOrder(params: {
        currentUser: User,
        cart: CartItem[],
        finalTotal: number,
        activeRep: string | null,
        activeRepPhone: string,
        observations: string,
        shippingMethod: 'agency' | 'own',
        useAccumulatedRappel: boolean,
        rappelDiscount: number,
        appliedCoupon: { code: string; discount: number } | null,
        newRappelGenerated: number,
    }) {
        const {
            currentUser, cart, finalTotal, activeRep, activeRepPhone,
            observations, shippingMethod, useAccumulatedRappel,
            rappelDiscount, appliedCoupon, newRappelGenerated
        } = params;

        if (!supabase) throw new Error('Supabase client is not initialized.');

        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear().toString().slice(-2);
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');

        const orderNumber = `${day}${month}${year}-${hours}${minutes}`;

        // 1. Mark/Upsert Client
        const clientData: any = {
            email: currentUser.email,
            company_name: currentUser.name || currentUser.email.split('@')[0]
        };
        if (currentUser.username) clientData.username = currentUser.username;
        if (currentUser.phone) clientData.phone = currentUser.phone;

        const { data: client, error: clientError } = await supabase
            .from('clients')
            .upsert(clientData, { onConflict: 'email' })
            .select()
            .single();

        if (clientError) throw new Error(`Client error: ${clientError.message}`);

        // 2. Create Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                client_id: client.id,
                order_number: orderNumber,
                total: finalTotal,
                sales_rep: activeRep,
                observations,
                shipping_method: shippingMethod,
                rappel_discount: rappelDiscount,
                coupon_discount: appliedCoupon?.discount || 0
            })
            .select()
            .single();

        if (orderError) {
            console.error('Insert Order Error:', orderError);
            throw new Error(`Error en el pedido (Supabase): ${orderError.message} - ${orderError.details || ''}`);
        }

        // 3. Order Lines
        const orderLines = cart.map(item => ({
            order_id: order.id,
            product_id: item.id.split('-variant-')[0].split('-pack-')[0], // Extract base ID
            quantity: item.quantity,
            unit_price: item.calculatedPrice,
            total_price: item.calculatedPrice * item.quantity
        }));

        const { error: linesError } = await supabase
            .from('order_lines')
            .insert(orderLines);

        if (linesError) {
            console.error('Insert Order Lines Error:', linesError);
            throw new Error(`Error en las líneas del pedido: ${linesError.message}`);
        }

        // 4. Email
        const formatCurrency = (value: number) =>
            new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

        const shippingLabel = shippingMethod === 'agency' ? 'TIPSA' : 'REPARTO PROPIO';

        const templateParams = {
            to_email: currentUser.email,
            to_name: currentUser.name,
            order_id: orderNumber,
            order_total: formatCurrency(finalTotal),
            sales_rep: activeRep || 'N/A',
            sales_rep_phone: activeRepPhone,
            shipping_method: shippingLabel,
            email_subject: `PEDIDO | ${currentUser.name} | ${shippingLabel}`,
            order_details: cart
                .map(item =>
                    `${item.reference} | ${item.name} | ${item.quantity} x ${formatCurrency(item.calculatedPrice)} = ${formatCurrency(item.calculatedPrice * item.quantity)}`
                )
                .join('\n'),
            observations: observations || 'Sin observaciones'
        };

        const salesRepEmail = activeRep && Object.keys(SALES_REPS).find(k => SALES_REPS[k] === activeRep)
            ? SALES_REPS_EMAILS[Object.keys(SALES_REPS).find(k => SALES_REPS[k] === activeRep)!]
            : 'info@digitalmarket.com';

        await emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID,
            import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
            { ...templateParams, to_email: currentUser.email },
            import.meta.env.VITE_EMAILJS_PUBLIC_KEY
        );

        await emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID,
            import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
            { ...templateParams, to_email: salesRepEmail },
            import.meta.env.VITE_EMAILJS_PUBLIC_KEY
        );

        // 5. Update Rappel
        const newRappelTotal = (client.rappel_accumulated - (useAccumulatedRappel ? rappelDiscount : 0)) + newRappelGenerated;
        await supabase
            .from('clients')
            .update({ rappel_accumulated: newRappelTotal })
            .eq('id', client.id);

        // 6. Coupons
        if (appliedCoupon) {
            const updatedUsedCoupons = [...(currentUser.usedCoupons || []), appliedCoupon.code];
            await supabase
                .from('clients')
                .update({ used_coupons: updatedUsedCoupons })
                .eq('id', currentUser.id);
        }

        return {
            order,
            newRappelTotal,
            orderNumber
        };
    },

    async getUserOrders(userId?: string): Promise<Order[]> {
        if (!supabase) return [];

        // 1. Get client by external user_id if needed, but here we assume 'client_id' in orders table
        // matches the 'id' of the client record.
        // If App.tsx passes the client table ID, we use it directly.

        let query = supabase
            .from('orders')
            .select(`
                *,
                order_lines (
                    *,
                    products (*)
                )
            `);

        if (userId) {
            query = query.eq('client_id', userId);
        }

        const { data: dbOrders, error: ordersError } = await query
            .order('created_at', { ascending: false });

        if (ordersError) {
            console.error('Error fetching orders:', ordersError);
            return [];
        }

        return (dbOrders || []).map(order => ({
            id: order.id,
            userId: order.client_id,
            date: order.created_at,
            total: Number(order.total),
            status: order.status as any,
            shippingMethod: order.shipping_method,
            salesRep: order.sales_rep,
            rappelDiscount: Number(order.rappel_discount) || 0,
            couponDiscount: Number(order.coupon_discount) || 0,
            items: (order.order_lines || []).map((line: any) => ({
                id: line.product_id,
                name: line.products?.name || 'Producto eliminado',
                reference: line.products?.reference || '',
                quantity: line.quantity,
                calculatedPrice: Number(line.unit_price),
                category: line.products?.category || 'otros'
            }))
        }));
    }
};
