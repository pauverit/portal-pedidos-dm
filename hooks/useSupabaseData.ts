import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, User, ProductCategory, Coupon } from '../types';
import { INITIAL_PRODUCTS } from '../constants';

export function useSupabaseData() {
    const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
    const [users, setUsers] = useState<User[]>([]);
    const [promoCoupons, setPromoCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadInitialData = async () => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        try {
            // Load Products
            const { data: dbProducts, error: prodError } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (prodError) {
                console.warn('Could not load products from Supabase, using defaults:', prodError);
            } else if (dbProducts && dbProducts.length > 0) {
                const mappedProducts: Product[] = dbProducts.map(p => ({
                    id: p.id,
                    name: p.name,
                    reference: p.reference,
                    category: p.category as ProductCategory,
                    subcategory: p.subcategory,
                    price: Number(p.price) || 0,
                    unit: p.unit || 'ud',
                    isFlexible: p.is_flexible,
                    width: Number(p.width),
                    length: Number(p.length),
                    pricePerM2: Number(p.price_per_m2),
                    volume: p.volume,
                    inStock: p.in_stock,
                    brand: p.brand as any,
                    weight: Number(p.weight) || 0,
                    description: p.description || '',
                    finish: p.finish,
                    backing: p.backing,
                    adhesive: p.adhesive,
                    materialType: p.material_type,
                    allowFinish: p.allow_finish,
                    allowBacking: p.allow_backing,
                    allowAdhesive: p.allow_adhesive,
                    widthOptions: Array.isArray(p.width_options) ? p.width_options : undefined,
                }));
                setProducts(mappedProducts);
            }

            // Load Clients — paginated to bypass Supabase's 1000-row default limit
            const PAGE = 1000;
            const allDbClients: any[] = [];
            let page = 0;
            while (true) {
                const { data: pageData, error: pageError } = await supabase
                    .from('clients')
                    .select('*')
                    .range(page * PAGE, (page + 1) * PAGE - 1);
                if (pageError) {
                    console.warn('Could not load clients from Supabase:', pageError);
                    break;
                }
                if (!pageData || pageData.length === 0) break;
                allDbClients.push(...pageData);
                if (pageData.length < PAGE) break;
                page++;
            }

            if (allDbClients.length > 0) {
                const mappedClients: User[] = allDbClients.map(c => ({
                    id: c.id,
                    name: c.company_name,
                    email: c.email,
                    role: c.role || 'client',
                    username: c.username,
                    password: c.password,
                    phone: c.phone,
                    rappelAccumulated: Number(c.rappel_accumulated) || 0,
                    delegation: c.delegation,
                    delegationId: c.delegation_id,
                    salesRep: c.sales_rep,
                    salesRepCode: c.sales_rep_code,
                    registrationDate: c.created_at,
                    hidePrices: c.hide_prices || false,
                    customPrices: c.custom_prices || {},
                    rappelThreshold: Number(c.rappel_threshold) || 800,
                    mustChangePassword: c.must_change_password ?? false,
                    isActive: c.is_active ?? !c.must_change_password,
                    usedCoupons: c.used_coupons || [],
                    hiddenCategories: c.hidden_categories || [],
                    zone: c.zone,
                }));
                setUsers(mappedClients);
            }

            // Load Coupons
            const { data: dbCoupons, error: couponError } = await supabase
                .from('coupons')
                .select('*')
                .order('created_at', { ascending: false });

            if (dbCoupons && !couponError) {
                const mappedCoupons: Coupon[] = dbCoupons.map((c: any) => ({
                    id: c.id,
                    code: c.code,
                    description: c.description,
                    discountType: c.discount_type,
                    discountValue: Number(c.discount_value),
                    minOrderAmount: Number(c.min_order_amount),
                    maxUses: c.max_uses,
                    usesCount: c.uses_count,
                    isActive: c.is_active,
                    createdAt: c.created_at,
                    expiresAt: c.expires_at
                }));
                setPromoCoupons(mappedCoupons);
            }
        } catch (err: any) {
            console.error('Error loading Supabase data:', err);
            setLoadError('Error al cargar los datos. Comprueba tu conexión o la configuración de Supabase.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    return {
        products,
        setProducts,
        users,
        setUsers,
        promoCoupons,
        setPromoCoupons,
        loading,
        loadError,
        refreshData: loadInitialData
    };
}
