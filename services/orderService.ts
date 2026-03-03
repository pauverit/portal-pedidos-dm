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
        subtotal: number,
        tax: number,
        shippingCost: number,
        discountAmount: number,
    }) {
        const {
            currentUser, cart, finalTotal, activeRep, activeRepPhone,
            observations, shippingMethod, useAccumulatedRappel,
            rappelDiscount, appliedCoupon, newRappelGenerated,
            subtotal, tax, shippingCost, discountAmount
        } = params;

        if (!supabase) throw new Error('Supabase client is not initialized.');

        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear().toString().slice(-2);
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();

        const orderNumber = `${day}${month}${year}-${hours}${minutes}${seconds}-${randomStr}`;

        // 1. Use the already-authenticated client's ID directly — no upsert needed
        const clientId = currentUser.id;
        if (!clientId) throw new Error('No se pudo identificar el cliente.');

        // 2. Create Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                client_id: clientId,
                order_number: orderNumber,
                total: finalTotal,
                sales_rep: activeRep,
                observations,
                shipping_method: shippingMethod,
                rappel_discount: rappelDiscount,
                coupon_discount: appliedCoupon?.discount || 0,
                status: 'tramitado'
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

        // Fetch Sales Rep email from DB
        let salesRepEmail = 'info@digitalmarket.com';
        if (activeRep) {
            const { data: repData } = await supabase
                .from('clients')
                .select('email')
                .eq('role', 'sales')
                .eq('company_name', activeRep)
                .single();
            if (repData?.email) {
                salesRepEmail = repData.email;
            }
        }

        const templateParams = {
            to_email: currentUser.email,
            to_name: currentUser.name,
            order_id: orderNumber,
            order_total: formatCurrency(finalTotal),
            sales_rep: activeRep || 'N/A',
            sales_rep_phone: activeRepPhone,
            shipping_method: shippingLabel,
            email_subject: `PEDIDO | ${currentUser.name} | ${shippingLabel}`,
            subtotal: formatCurrency(subtotal),
            shipping_cost: formatCurrency(shippingCost),
            rappel_discount: rappelDiscount > 0 ? `-${formatCurrency(rappelDiscount)}` : '0,00 €',
            coupon_discount: discountAmount > 0 ? `-${formatCurrency(discountAmount)}` : '0,00 €',
            tax: formatCurrency(tax),
            total_final: formatCurrency(finalTotal),
            order_details: cart
                .map(item =>
                    `${item.reference} | ${item.name} | ${item.quantity} x ${formatCurrency(item.calculatedPrice)} = ${formatCurrency(item.calculatedPrice * item.quantity)}`
                )
                .join('\n'),
            observations: observations || 'Sin observaciones'
        };

        // Send emails in the background — non-blocking so mobile/tablet network issues
        // don't abort the order. Errors are logged but don't affect the user flow.
        const sendEmails = async () => {
            try {
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
            } catch (emailError) {
                console.warn('Email sending failed (non-critical):', emailError);
            }
        };
        sendEmails(); // fire-and-forget

        // 5. Update Rappel
        const currentRappel = currentUser.rappelAccumulated || 0;
        const newRappelTotal = (currentRappel - (useAccumulatedRappel ? rappelDiscount : 0)) + newRappelGenerated;
        await supabase
            .from('clients')
            .update({ rappel_accumulated: newRappelTotal })
            .eq('id', clientId);

        // 6. Coupons
        if (appliedCoupon) {
            const { data: clientData } = await supabase
                .from('clients')
                .select('used_coupons')
                .eq('id', clientId)
                .single();
            const updatedUsedCoupons = [...((clientData?.used_coupons as string[]) || []), appliedCoupon.code];
            await supabase
                .from('clients')
                .update({ used_coupons: updatedUsedCoupons })
                .eq('id', clientId);
        }

        return {
            order,
            newRappelTotal,
            orderNumber
        };
    },

    async getUserOrders(userId?: string, clientIds?: string[]): Promise<Order[]> {
        if (!supabase) return [];

        // 1. Fetch Orders
        let ordersQuery = supabase
            .from('orders')
            .select('*');

        if (userId) {
            ordersQuery = ordersQuery.eq('client_id', userId);
        } else if (clientIds && clientIds.length > 0) {
            ordersQuery = ordersQuery.in('client_id', clientIds);
        }

        const { data: dbOrders, error: ordersError } = await ordersQuery
            .order('created_at', { ascending: false });

        if (ordersError) {
            console.error('Error fetching orders:', ordersError);
            return [];
        }
        if (!dbOrders || dbOrders.length === 0) return [];

        const orderIds = dbOrders.map(o => o.id);

        // 2. Fetch Order Lines
        const { data: dbLines, error: linesError } = await supabase
            .from('order_lines')
            .select('*')
            .in('order_id', orderIds);

        if (linesError) {
            console.error('Error fetching order lines:', linesError);
            return dbOrders.map(o => ({
                id: o.id,
                userId: o.client_id,
                date: o.created_at,
                total: Number(o.total),
                status: o.status as any,
                shippingMethod: o.shipping_method,
                salesRep: o.sales_rep,
                rappelDiscount: Number(o.rappel_discount) || 0,
                couponDiscount: Number(o.coupon_discount) || 0,
                items: []
            }));
        }

        // 3. Fetch Products (to get names and references)
        const productIds = [...new Set((dbLines || []).map(l => l.product_id))];
        const { data: dbProducts, error: prodError } = await supabase
            .from('products')
            .select('id, name, reference, category, price, unit')
            .in('id', productIds);

        const productsMap = (dbProducts || []).reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
        }, {} as Record<string, any>);

        // 4. Join in memory
        return dbOrders.map(order => {
            const lines = (dbLines || []).filter(l => l.order_id === order.id);
            return {
                id: order.id,
                userId: order.client_id,
                date: order.created_at,
                total: Number(order.total),
                status: (order.status || 'pending') as any,
                shippingMethod: order.shipping_method,
                salesRep: order.sales_rep,
                rappelDiscount: Number(order.rappel_discount) || 0,
                couponDiscount: Number(order.coupon_discount) || 0,
                items: lines.map(line => {
                    const p = productsMap[line.product_id];
                    return {
                        id: line.product_id,
                        name: p?.name || 'Producto eliminado',
                        reference: p?.reference || '',
                        quantity: line.quantity,
                        calculatedPrice: Number(line.unit_price),
                        price: p?.price || Number(line.unit_price),
                        unit: p?.unit || 'ud',
                        category: p?.category || 'otros'
                    } as CartItem;
                })
            } as Order;
        });
    }
};
