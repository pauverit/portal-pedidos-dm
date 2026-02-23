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
        const timestamp = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') + '-' +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0');
        const orderNumber = timestamp;

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

        const templateParams = {
            to_email: currentUser.email,
            to_name: currentUser.name,
            order_id: orderNumber,
            order_total: formatCurrency(finalTotal),
            sales_rep: activeRep || 'N/A',
            sales_rep_phone: activeRepPhone,
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
    }
};
