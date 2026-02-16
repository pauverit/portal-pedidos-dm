import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import emailjs from '@emailjs/browser';
import { Sidebar } from './components/Sidebar';
import { AdminBulkLoad } from './components/AdminBulkLoad';
import { INITIAL_PRODUCTS, SALES_REPS, SALES_REPS_PHONES, DEFAULT_USERS } from './constants';
import { Product, CartItem, User, Order } from './types';
import {
    Search, Filter, ShoppingCart, Plus, Minus, Check, ArrowRight,
    MapPin, Printer, Download, CreditCard, ChevronRight, AlertCircle, Trash2, ArrowLeft,
    CheckCircle, Settings, Save, Lock, Truck, Phone, Mail, FileText, UserPlus, Menu, ShoppingBag, LayoutDashboard, LogOut
} from 'lucide-react';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

// Helper to calculate effective price for a user
const getEffectiveProduct = (product: Product, user: User | null): Product => {
    if (!user || !user.customPrices) return product;

    // Check if there is a custom price for this reference
    const customPrice = user.customPrices[product.reference];

    if (customPrice !== undefined) {
        // Create a copy with the custom price
        // If flexible, custom price usually overrides the base price or pricePerM2?
        // Requirement: "a ciertos clientes se le vende la lona a 1.05€ el m2"
        // So for flexible, it overrides pricePerM2. For rigid/others, it overrides price.

        return {
            ...product,
            price: product.isFlexible ? 0 : customPrice,
            pricePerM2: product.isFlexible ? customPrice : undefined,
            // If we want to be safe and clear:
            // price: customPrice, 
            // but logic below uses pricePerM2 for flexible.
        };
    }

    return product;
};

export default function App() {
    // --- STATE MANAGEMENT ---
    const [users, setUsers] = useState<User[]>(DEFAULT_USERS);

    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('dm_portal_current_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [currentView, setCurrentView] = useState('login');
    const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);

    // Load data from Supabase
    useEffect(() => {
        const loadInitialData = async () => {
            if (!supabase) return;

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
                        category: p.category as any,
                        subcategory: p.subcategory,
                        price: Number(p.price) || 0,
                        unit: p.unit || 'ud',
                        isFlexible: p.is_flexible,
                        width: Number(p.width),
                        length: Number(p.length),
                        pricePerM2: Number(p.price_per_m2),
                        volume: p.volume,
                        inStock: p.in_stock,
                        brand: p.brand as any
                    }));
                    setProducts(mappedProducts);
                }

                // Load Clients
                const { data: dbClients, error: clientError } = await supabase
                    .from('clients')
                    .select('*');

                if (clientError) {
                    console.warn('Could not load clients from Supabase:', clientError);
                } else if (dbClients) {
                    const mappedClients: User[] = dbClients.map(c => ({
                        id: c.id,
                        name: c.company_name,
                        email: c.email,
                        role: 'client',
                        username: c.username,
                        password: c.password,
                        phone: c.phone,
                        rappelAccumulated: Number(c.rappel_accumulated) || 0,
                        delegation: c.delegation,
                        salesRep: c.sales_rep,
                        registrationDate: c.created_at,
                        hidePrices: c.hide_prices || false,
                        customPrices: c.custom_prices || {}
                    }));
                    // Merge with default admin
                    setUsers([DEFAULT_USERS[0], ...mappedClients]);
                }
            } catch (err) {
                console.error('Error loading Supabase data:', err);
            }
        };

        loadInitialData();
    }, []);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Checkout States
    const [promoCode, setPromoCode] = useState('');
    const [activeRep, setActiveRep] = useState<string | null>(null);
    const [activeRepPhone, setActiveRepPhone] = useState<string>('');
    const [useAccumulatedRappel, setUseAccumulatedRappel] = useState(false);
    const [shippingMethod, setShippingMethod] = useState<'agency' | 'own'>('own');
    const [observations, setObservations] = useState('');
    const [loginError, setLoginError] = useState('');

    // Login Form
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Mobile Menu State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Admin Bulk Load Logic
    const handleBulkSave = async (newProducts: Product[]) => {
        if (!supabase) return;

        try {
            const productsToInsert = newProducts.map(p => ({
                reference: p.reference,
                name: p.name,
                category: p.category,
                subcategory: p.subcategory || null,
                price: Number.isFinite(p.price) ? p.price : 0,
                price_per_m2: Number.isFinite(p.pricePerM2) ? p.pricePerM2 : null,
                unit: p.unit || 'ud',
                is_flexible: p.isFlexible || false,
                width: Number.isFinite(p.width) ? p.width : null,
                length: Number.isFinite(p.length) ? p.length : null,
                brand: p.brand || null,
                in_stock: p.inStock
            }));

            if (newProducts.length === 0) {
                // Special case: Delete All
                const { error: deleteError } = await supabase
                    .from('products')
                    .delete()
                    .neq('id', '000000'); // Delete all rows where id is not something impossible (basically all)

                if (deleteError) throw deleteError;

                setProducts([]);
                alert('Catálogo eliminado correctamente.');
                return;
            }

            const { error } = await supabase
                .from('products')
                .upsert(productsToInsert, { onConflict: 'reference' });

            if (error) throw error;

            // Refresh local state
            const { data: refreshedProds } = await supabase.from('products').select('*').order('name');
            if (refreshedProds) {
                setProducts(refreshedProds.map(p => ({
                    id: p.id,
                    name: p.name,
                    reference: p.reference,
                    category: p.category as any,
                    subcategory: p.subcategory,
                    price: Number(p.price) || 0,
                    unit: p.unit || 'ud',
                    isFlexible: p.is_flexible,
                    width: Number(p.width),
                    length: Number(p.length),
                    pricePerM2: Number(p.price_per_m2),
                    volume: p.volume,
                    inStock: p.in_stock,
                    brand: p.brand as any
                })));
            }

            alert('Materiales guardados correctamente en Supabase.');
        } catch (error: any) {
            console.error('Error saving products:', error);
            alert(`Error al guardar productos: ${error.message || JSON.stringify(error, null, 2)}`);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        const foundUser = users.find(u => u.username === username && u.password === password);

        if (foundUser) {
            setCurrentUser(foundUser);
            localStorage.setItem('dm_portal_current_user', JSON.stringify(foundUser));
            setCurrentView(foundUser.role === 'admin' ? 'admin_users' : 'dashboard');
            setLoginError('');
        } else {
            setLoginError('Credenciales incorrectas');
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('dm_portal_current_user');
        setUsername('');
        setPassword('');
        setCart([]);
        setActiveRep(null);
        setActiveRepPhone('');
        setPromoCode('');
        setObservations('');
        setCurrentView('login');
    }

    // --- CART LOGIC ---
    const addToCart = (product: Product, quantity = 1) => {
        setCart(prev => {
            const effectiveProduct = getEffectiveProduct(product, currentUser);

            const existing = prev.find(item => item.id === effectiveProduct.id);
            const calculatedPrice = effectiveProduct.isFlexible
                ? (effectiveProduct.width! * effectiveProduct.length! * effectiveProduct.pricePerM2!)
                : effectiveProduct.price;

            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...prev, {
                ...product,
                quantity,
                calculatedPrice
            }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, quantity: item.quantity + delta };
            }
            return item;
        }).filter(item => item.quantity > 0)); // Filter out items with 0 or less quantity
    };

    const clearCart = () => setCart([]);

    // --- CHECKOUT CALCULATIONS ---
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

    const cartTotal = cart.reduce((sum, item) => sum + (item.calculatedPrice * item.quantity), 0);
    const shippingCost = shippingMethod === 'agency' ? 6.00 : 0.00;

    // RAPPEL SYSTEM: Changed to 3% default accumulation
    const newRappelGenerated = cartTotal * 0.03;

    // COUPON LOGIC
    const calculateDiscount = () => {
        if (!appliedCoupon) return 0;
        return appliedCoupon.discount;
    };

    const discountAmount = calculateDiscount();

    const rappelDiscount = useAccumulatedRappel && currentUser ? Math.min(cartTotal - discountAmount, currentUser.rappelAccumulated) : 0;
    const subtotalAfterDiscount = cartTotal - discountAmount - rappelDiscount;
    const tax = subtotalAfterDiscount * 0.21;
    const finalTotal = subtotalAfterDiscount + tax + shippingCost;

    const applyCoupon = () => {
        const code = couponCode.toUpperCase().trim();

        if (code === 'PEDIDOINICIAL') {
            // Logic: 5% discount
            // TODO: Check if user already used it (mocked for now)
            if (currentUser?.usedCoupons?.includes('PEDIDOINICIAL')) {
                alert('Este cupón ya ha sido usado.');
                return;
            }
            setAppliedCoupon({ code, discount: cartTotal * 0.05 });
            alert('Cupón de Bienvenida aplicado: 5% Dto.');
        } else if (code === 'RAPPEL3') {
            // Logic: 3% discount if total > 900
            if (cartTotal > 900) {
                setAppliedCoupon({ code, discount: cartTotal * 0.03 });
                alert('Cupón RAPPEL3 aplicado: 3% Dto adicional.');
            } else {
                alert('Este cupón solo es válido para pedidos superiores a 900€');
                setAppliedCoupon(null);
            }
        } else {
            alert('Cupón no válido');
            setAppliedCoupon(null);
        }
    };

    // Auto-assign Sales Rep
    useEffect(() => {
        if (currentUser?.salesRep) {
            setActiveRep(currentUser.salesRep);
            // Try to find phone
            const repKey = Object.keys(SALES_REPS).find(key => SALES_REPS[key] === currentUser.salesRep);
            if (repKey) {
                setActiveRepPhone(SALES_REPS_PHONES[repKey]);
            } else {
                setActiveRepPhone('958 000 000'); // Default
            }
        }
    }, [currentUser]);

    const [orders, setOrders] = useState<Order[]>(() => {
        const saved = localStorage.getItem('dm_portal_orders');
        return saved ? JSON.parse(saved) : [];
    });

    const [lastOrder, setLastOrder] = useState<Order | null>(null);

    const handleFinalizeOrder = async () => {
        if (!currentUser) return;

        try {
            // Validate Supabase is initialized
            if (!supabase) {
                throw new Error('Supabase client is not initialized. Please check your environment variables in Vercel.');
            }

            console.log('🚀 Starting order submission...');
            console.log('Current user:', currentUser.email);
            console.log('Cart items:', cart.length);

            // 🧪 TEST: Verify Supabase connection first
            console.log('🔍 Testing Supabase connection...');
            const { data: testData, error: testError } = await supabase
                .from('clients')
                .select('count')
                .limit(1);

            if (testError) {
                console.error('❌ Supabase connection test FAILED:', testError);
                throw new Error(`No se puede conectar a Supabase: ${testError.message}\n\nVerifica que la URL y la clave anónima sean correctas en Vercel.`);
            }
            console.log('✅ Supabase connection test PASSED');

            const now = new Date();
            const timestamp = now.getFullYear().toString() +
                (now.getMonth() + 1).toString().padStart(2, '0') +
                now.getDate().toString().padStart(2, '0') + '-' +
                now.getHours().toString().padStart(2, '0') +
                now.getMinutes().toString().padStart(2, '0') +
                now.getSeconds().toString().padStart(2, '0');
            const orderNumber = timestamp;

            // 1️⃣ UPSERT CLIENTE
            console.log('📝 Creating/updating client...');

            // Preparar datos del cliente (solo campos definidos)
            const clientData: any = {
                email: currentUser.email,
                company_name: currentUser.name || currentUser.email.split('@')[0]
            };

            // Solo añadir campos opcionales si están definidos
            if (currentUser.username) clientData.username = currentUser.username;
            if (currentUser.phone) clientData.phone = currentUser.phone;

            const { data: client, error: clientError } = await supabase
                .from('clients')
                .upsert(clientData, { onConflict: 'email' })
                .select()
                .single();

            if (clientError) {
                console.error('❌ ERROR creating/updating client:', clientError);
                throw new Error(`Client error: ${clientError.message}`);
            }
            if (!client) {
                throw new Error('No client data returned from upsert');
            }

            console.log('✅ Client upserted successfully:', client);

            // 2️⃣ CREAR PEDIDO
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    client_id: client.id,
                    order_number: orderNumber,
                    total: finalTotal,
                    sales_rep: activeRep,
                    observations
                })
                .select()
                .single();

            if (orderError) {
                console.error('❌ ERROR creating order:', orderError);
                throw new Error(`Order error: ${orderError.message}`);
            }
            if (!order) {
                throw new Error('No order data returned from insert');
            }

            console.log('✅ Order created successfully:', order);

            // 3️⃣ LÍNEAS DE PEDIDO
            const orderLines = cart.map(item => ({
                order_id: order.id,
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.calculatedPrice,
                total_price: item.calculatedPrice * item.quantity
            }));

            const { data: insertedLines, error: linesError } = await supabase
                .from('order_lines')
                .insert(orderLines)
                .select();

            if (linesError) {
                console.error('❌ ERROR order_lines:', linesError);
                throw linesError;
            }

            console.log('✅ Líneas insertadas:', insertedLines);

            if (!insertedLines || insertedLines.length === 0) {
                throw new Error('No se insertaron líneas de pedido');
            }


            // 4️⃣ EMAIL
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

            await emailjs.send(
                import.meta.env.VITE_EMAILJS_SERVICE_ID,
                import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
                templateParams,
                import.meta.env.VITE_EMAILJS_PUBLIC_KEY
            );

            // 5️⃣ UI
            setLastOrder({
                id: order.id,
                userId: currentUser.id,
                date: new Date().toISOString(),
                items: [...cart],
                total: finalTotal,
                status: 'pending',
                shippingMethod,
                salesRep: activeRep || undefined,
                rappelDiscount: useAccumulatedRappel ? rappelDiscount : 0,
                couponDiscount: appliedCoupon ? appliedCoupon.discount : 0
            });

            setCart([]);
            setObservations('');
            setCurrentView('order_success');

        } catch (error: any) {
            console.error('❌ ERROR FINALIZANDO PEDIDO:', error);

            // Show more specific error message
            let errorMessage = 'Error al guardar el pedido en el sistema.';
            if (error.message) {
                errorMessage += `\n\nDetalles: ${error.message}`;
            }
            if (error.hint) {
                errorMessage += `\n\nSugerencia: ${error.hint}`;
            }

            alert(errorMessage);
        }
    };




    // --- ADMIN LOGIC ---


    // --- USER MANAGEMENT (ADMIN) ---
    // --- USER MANAGEMENT (ADMIN) ---
    // --- USER MANAGEMENT (ADMIN) ---
    const [newUser, setNewUser] = useState({
        id: '', username: '', password: '', name: '', email: '', phone: '', delegation: '', salesRep: '',
        hidePrices: false,
        customPricesText: ''
    });
    const [isEditing, setIsEditing] = useState(false);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.username || !newUser.password || !newUser.name || !newUser.delegation || !newUser.salesRep) {
            alert('Por favor rellena todos los campos obligatorios inc. Delegación y Comercial.');
            return;
        }

        if (!supabase) {
            alert('Supabase no está conectado.');
            return;
        }

        try {
            const clientData = {
                username: newUser.username,
                password: newUser.password,
                email: newUser.email,
                company_name: newUser.name,
                phone: newUser.phone,
                delegation: newUser.delegation,
                sales_rep: newUser.salesRep,
                rappel_accumulated: 0,
                hide_prices: newUser.hidePrices,
                custom_prices: parseCustomPrices(newUser.customPricesText)
            };

            const { data: client, error: clientError } = await supabase
                .from('clients')
                .upsert(clientData, { onConflict: 'email' })
                .select()
                .single();

            if (clientError) throw clientError;

            // Update local state
            const newUserObj: User = {
                id: client.id,
                name: client.company_name,
                email: client.email,
                role: 'client',
                username: client.username,
                password: client.password,
                phone: client.phone,
                delegation: client.delegation,
                salesRep: client.sales_rep,
                rappelAccumulated: Number(client.rappel_accumulated) || 0,
                registrationDate: client.created_at,
                hidePrices: client.hide_prices || false,
                customPrices: client.custom_prices || {},
                usedCoupons: []
            };

            if (isEditing) {
                setUsers(prev => prev.map(u => u.id === client.id ? newUserObj : u));
                alert('Cliente actualizado en Supabase correctamente');
                setIsEditing(false);
            } else {
                setUsers(prev => [...prev, newUserObj]);
                alert('Cliente registrado en Supabase correctamente');
            }

            // Reset form
            setNewUser({ id: '', username: '', password: '', name: '', email: '', phone: '', delegation: '', salesRep: '', hidePrices: false, customPricesText: '' });

        } catch (error: any) {
            console.error('Error saving user:', error);
            alert(`Error al guardar cliente: ${error.message}`);
        }
    };

    const handleEditUser = (user: User) => {
        setNewUser({
            id: user.id || '',
            username: user.username,
            email: user.email,
            phone: user.phone || '',
            delegation: user.delegation || '',
            salesRep: user.salesRep || '',
            hidePrices: user.hidePrices || false,
            customPricesText: user.customPrices ? Object.entries(user.customPrices).map(([ref, price]) => `${ref} ${price}`).join('\n') : ''
        });
        setIsEditing(true);
        // Scroll to form (optional, but good UX)
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setNewUser({ id: '', username: '', password: '', name: '', email: '', phone: '', delegation: '', salesRep: '', hidePrices: false, customPricesText: '' });
        setIsEditing(false);
    };

    const parseCustomPrices = (text: string): Record<string, number> => {
        const prices: Record<string, number> = {};
        if (!text) return prices;

        text.split('\n').forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
                const ref = parts[0];
                const priceStr = parts[1].replace(',', '.');
                const price = parseFloat(priceStr);
                if (ref && !isNaN(price)) {
                    prices[ref] = price;
                }
            }
        });
        return prices;
    };

    // --- VIEW RENDERERS ---

    const renderLoginView = () => (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-200">
                <div className="text-center mb-8">
                    <img src="/logo.png" alt="DigitalMarket" className="h-16 w-auto mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900">Portal B2B</h1>
                    <p className="text-slate-500 text-sm mt-2">Introduce tus credenciales de acceso</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-900"
                            placeholder="demo o admin"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-900"
                            placeholder="••••••"
                        />
                    </div>

                    {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}

                    <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg shadow-lg transition-all active:scale-[0.98]">
                        ENTRAR
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">Digital Market Granada &copy; 2023</p>
                </div>
            </div>
        </div>
    );

    const renderClientOrdersView = () => (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <ShoppingBag className="text-slate-400" /> Mis Pedidos
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs uppercase font-bold mb-1">Pedidos Totales</p>
                    <p className="text-3xl font-bold text-slate-900">{orders.filter(o => o.userId === currentUser?.id).length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs uppercase font-bold mb-1">Inversión Total</p>
                    <p className="text-3xl font-bold text-slate-900">{formatCurrency(orders.filter(o => o.userId === currentUser?.id).reduce((sum, o) => sum + o.total, 0))}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs uppercase font-bold mb-1">Saldo Rappel Acumulado</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(currentUser?.rappelAccumulated || 0)}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            <th className="px-6 py-3">Referencia</th>
                            <th className="px-6 py-3">Fecha</th>
                            <th className="px-6 py-3">Estado</th>
                            <th className="px-6 py-3">Artículos</th>
                            <th className="px-6 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {orders.filter(o => o.userId === currentUser?.id).length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No tienes pedidos registrados aún.</td>
                            </tr>
                        ) : (
                            orders.filter(o => o.userId === currentUser?.id).map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-slate-900">#{order.id.slice(-6)}</td>
                                    <td className="px-6 py-4 text-slate-500">{new Date(order.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase 
                                            ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'}`}>
                                            {order.status === 'pending' ? 'Pendiente' :
                                                order.status === 'processing' ? 'En Proceso' :
                                                    order.status === 'completed' ? 'Completado' : 'Cancelado'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {order.items.length} artículos
                                        <div className="text-xs text-slate-400 mt-1 truncate max-w-[200px]">
                                            {order.items.map(i => i.name).join(', ')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(order.total)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderAdminLoadView = () => (
        <AdminBulkLoad onSave={handleBulkSave} />
    );

    const renderAdminUsersView = () => (
        <div className="p-6 md:p-10 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <UserPlus className="text-slate-400" /> {isEditing ? 'Editar Cliente' : 'Alta de Nuevo Cliente'}
                </h1>
                {isEditing && (
                    <button onClick={handleCancelEdit} className="text-sm text-red-500 font-bold underline">
                        Cancelar Edición
                    </button>
                )}
            </div>

            <div className={isEditing ? "bg-yellow-50 rounded-xl shadow-lg border border-yellow-200 p-8 transition-colors" : "bg-white rounded-xl shadow-lg border border-slate-200 p-8 transition-colors"}>
                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Credenciales de Acceso</h3>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Usuario de Acceso</label>
                        <input required type="text" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="ej. cliente1" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contraseña</label>
                        <input required type="text" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="ej. 123456" />
                        <p className="text-[10px] text-slate-400 mt-1">Comparte estas credenciales con el cliente.</p>
                    </div>

                    <div className="md:col-span-2 mt-4">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Datos de Facturación / Contacto</h3>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Fiscal / Comercial</label>
                        <input required type="text" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="ej. Reformas y Construcciones S.L." />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                        <input required type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="ej. contabilidad@empresa.com" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                        <input required type="tel" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="ej. 600 000 000" />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Delegación / Dirección de Entrega</label>
                        <input required type="text" value={newUser.delegation} onChange={e => setNewUser({ ...newUser, delegation: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="ej. Polígono Juncaril, C/ Baza 12" />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Comercial Asignado</label>
                        <select required value={newUser.salesRep} onChange={e => setNewUser({ ...newUser, salesRep: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-slate-900">
                            <option value="">Seleccionar Comercial...</option>
                            {Object.values(SALES_REPS).map(rep => (
                                <option key={rep} value={rep}>{rep}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2 mt-4">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Configuración de Precios</h3>
                    </div>

                    <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={newUser.hidePrices}
                                onChange={e => setNewUser({ ...newUser, hidePrices: e.target.checked })}
                                className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            />
                            <div>
                                <span className="font-bold text-slate-900 text-sm">Ocultar Precios en el Catálogo</span>
                                <p className="text-xs text-slate-500">El cliente verá el catálogo sin precios, ideal para comerciales o clientes especiales.</p>
                            </div>
                        </label>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Precios Personalizados (REF PRECIO)</label>
                        <textarea
                            value={newUser.customPricesText}
                            onChange={e => setNewUser({ ...newUser, customPricesText: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none font-mono text-sm h-32"
                            placeholder={"REF123 10.50\nREF456 5.00"}
                        />
                        <p className="text-xs text-slate-400 mt-1">Introduce una referencia y un precio por línea. El precio debe usar punto (.) para decimales.</p>
                    </div>

                    <div className="md:col-span-2 mt-6 flex justify-end gap-3">
                        {isEditing && (
                            <button type="button" onClick={handleCancelEdit} className="px-6 py-3 rounded-lg font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                                Cancelar
                            </button>
                        )}
                        <button type="submit" className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg active:scale-95">
                            <UserPlus size={20} /> {isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Clientes Registrados</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <tr>
                                <th className="px-6 py-3">Nombre</th>
                                <th className="px-6 py-3">Usuario</th>
                                <th className="px-6 py-3">Rappels</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.filter(u => u.role === 'client').map((user, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-medium text-slate-900">{user.name}</td>
                                    <td className="px-6 py-3 font-mono text-slate-500">{user.username}</td>
                                    <td className="px-6 py-3 font-bold text-slate-900">{formatCurrency(user.rappelAccumulated)}</td>
                                    <td className="px-6 py-3 text-right">
                                        <button onClick={() => handleEditUser(user)} className="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-3 py-1 rounded">
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderProductListView = () => {
        const filteredProducts = products.filter(p => {
            // Global search filter
            if (searchQuery.trim().length > 0) {
                const query = searchQuery.toLowerCase();
                return (
                    p.name.toLowerCase().includes(query) ||
                    p.reference.toLowerCase().includes(query) ||
                    (p.subcategory || '').toLowerCase().includes(query)
                );
            }

            // Normal Category/Subcategory filter
            let targetCategory = '';
            let targetSubCategory = '';

            if (currentView.startsWith('cat_')) {
                const parts = currentView.split('_');
                targetCategory = parts[1];
                if (parts.length > 2) {
                    const sub = parts.slice(2).join('_');
                    if (sub !== 'all') {
                        targetSubCategory = sub;
                    }
                }
            } else {
                return false;
            }

            const matchCategory = p.category === targetCategory;
            const matchSub = targetSubCategory ? p.subcategory === targetSubCategory : true;

            return matchCategory && matchSub;
        });

        // Determine title
        let title = '';
        if (searchQuery) {
            title = `Resultados de búsqueda: "${searchQuery}"`;
        } else {
            let targetCategory = currentView.split('_')[1];
            let targetSubCategory = '';
            if (currentView.startsWith('cat_')) {
                const parts = currentView.split('_');
                if (parts.length > 2) {
                    const sub = parts.slice(2).join('_');
                    if (sub !== 'all') targetSubCategory = sub;
                }
                switch (targetCategory) {
                    case 'flexible': title = 'Materiales Flexibles'; break;
                    case 'rigid': title = 'Soportes Rígidos'; break;
                    case 'accessory': title = 'Accesorios & Herramientas'; break;
                    case 'ink': title = 'Tintas & Consumibles'; break;
                    case 'display': title = 'Displays & Expositores'; break;
                    default: title = 'Catálogo';
                }
                if (targetSubCategory) {
                    title += ` / ${targetSubCategory.charAt(0).toUpperCase() + targetSubCategory.slice(1).replace(/_/g, ' ')}`;
                }
            }
        }

        return (
            <div className="p-4 md:p-6 max-w-7xl mx-auto w-full pb-32">
                <div className="mb-6">
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900">{title}</h1>
                    <div className="mt-2 flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por referencia o descripción..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm hidden md:block">Catálogo actualizado. Precios netos.</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3 w-16">Ref</th>
                                    <th className="px-4 py-3">Nombre / Descripción</th>
                                    <th className="px-4 py-3 w-32">Formato</th>
                                    <th className="px-4 py-3 w-28 text-right">Precio</th>
                                    <th className="px-4 py-3 w-32 text-center">Cantidad</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map(product => {
                                    const cartItem = cart.find(item => item.id === product.id);
                                    const quantity = cartItem ? cartItem.quantity : 0;

                                    return (
                                        <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-4 py-2 align-middle">
                                                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                                                    {product.reference}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 align-middle">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 text-sm">{product.name}</span>
                                                    <span className="text-xs text-slate-400">{product.brand || 'DM'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 align-middle text-xs text-slate-500">
                                                {product.isFlexible ? (
                                                    <div className="flex flex-col">
                                                        <span>{product.width}m x {product.length}m</span>
                                                        <span className="text-[10px] text-slate-400">
                                                            ({currentUser?.hidePrices ? 'Consultar' : formatCurrency(product.pricePerM2!)}/m²)
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span>{product.category === 'ink' ? product.volume : product.unit}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 align-middle text-right">
                                                <span className="font-bold text-slate-900">
                                                    {currentUser?.hidePrices ? 'Consultar' : formatCurrency(product.price)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 align-middle">
                                                <div className="flex items-center justify-center gap-1">
                                                    {quantity === 0 ? (
                                                        <button
                                                            onClick={() => addToCart(product)}
                                                            className="bg-slate-900 hover:bg-slate-800 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-95 opacity-0 group-hover:opacity-100"
                                                            style={{ opacity: 1 }}
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center bg-slate-900 rounded-full shadow-sm overflow-hidden h-8">
                                                            <button
                                                                onClick={() => updateQuantity(product.id, -1)}
                                                                className="h-full px-2 flex items-center justify-center text-white hover:bg-slate-700"
                                                            >
                                                                <Minus size={12} />
                                                            </button>
                                                            <span className="text-white font-bold min-w-[20px] text-center text-xs">{quantity}</span>
                                                            <button
                                                                onClick={() => addToCart(product)}
                                                                className="h-full px-2 flex items-center justify-center text-white hover:bg-slate-700"
                                                            >
                                                                <Plus size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {filteredProducts.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            No hay productos en esta categoría.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderCheckoutView = () => (
        <div className="p-4 md:p-8 max-w-3xl mx-auto w-full pb-32">
            <button onClick={() => setCurrentView('cat_flexible_vinilos')} className="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm"><ArrowLeft size={16} /> Seguir comprando</button>

            <h1 className="text-2xl font-bold text-slate-900 mb-6">Finalizar Pedido</h1>

            {/* 1. Código Promocional (Opcional) */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">1</div>
                    Cupones y Descuentos
                </h3>
                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="Código Promocional (Opcional)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        disabled={!!appliedCoupon}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none uppercase text-slate-900"
                    />
                    {!appliedCoupon ? (
                        <button onClick={applyCoupon} className="bg-slate-900 text-white px-6 font-bold rounded-lg hover:bg-slate-800">
                            Aplicar
                        </button>
                    ) : (
                        <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="bg-green-100 text-green-700 px-6 font-bold rounded-lg flex items-center gap-2">
                            <Check size={18} /> {appliedCoupon.code}
                        </button>
                    )}
                </div>
                {appliedCoupon && <p className="text-green-600 text-sm mt-2 font-bold">Descuento aplicado: -{formatCurrency(appliedCoupon.discount)}</p>}
            </div>

            {/* Info Comercial */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-blue-800 uppercase">Comercial Asignado</p>
                    <p className="text-blue-900 font-bold text-lg">{activeRep || 'Sin asignar'}</p>
                </div>
                {activeRep && <div className="bg-white px-3 py-1 rounded text-blue-900 font-mono text-sm">{activeRepPhone}</div>}
            </div>

            {/* 2. Método de Envío */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">2</div>
                    Método de Envío
                </h3>
                <div className="space-y-3">
                    <label className="block relative cursor-pointer group">
                        <input type="radio" name="shipping" checked={shippingMethod === 'agency'} onChange={() => setShippingMethod('agency')} className="peer sr-only" />
                        <div className="p-4 rounded-xl border border-slate-200 bg-white peer-checked:border-slate-900 peer-checked:bg-slate-50 transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Truck className="text-slate-400 peer-checked:text-slate-900" size={24} />
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">ENVÍO POR AGENCIA 24H</p>
                                    <p className="text-xs text-slate-500">Entrega garantizada al día siguiente</p>
                                </div>
                            </div>
                            <span className="font-bold text-slate-900 text-sm">+ 6,00 €</span>
                        </div>
                    </label>
                    <label className="block relative cursor-pointer group">
                        <input type="radio" name="shipping" checked={shippingMethod === 'own'} onChange={() => setShippingMethod('own')} className="peer sr-only" />
                        <div className="p-4 rounded-xl border border-slate-200 bg-white peer-checked:border-slate-900 peer-checked:bg-slate-50 transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Truck className="text-slate-400 peer-checked:text-slate-900" size={24} />
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">REPARTO PROPIO</p>
                                    <p className="text-xs text-slate-500">Entrega en próxima ruta programada</p>
                                </div>
                            </div>
                            <span className="font-bold text-green-600 text-sm">GRATIS</span>
                        </div>
                    </label>
                </div>
            </div>

            {/* 3. Observaciones */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">3</div>
                    Observaciones
                </h3>
                <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Indica aquí si necesitas algo extra, horarios de entrega o detalles relevantes..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 h-24 resize-none"
                />
            </div>

            {/* 4. Resumen */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">4</div>
                    Resumen Económico
                </h3>

                {currentUser?.hidePrices ? (
                    <div className="bg-slate-50 p-6 text-center border border-slate-200 rounded-lg">
                        <p className="font-bold text-slate-900 mb-2">Precios Ocultos</p>
                        <p className="text-sm text-slate-500">
                            Su configuración actual no muestra los costes en pantalla.
                            El pedido se tramitará y valorará internamente con sus tarifas y condiciones vigentes.
                        </p>
                    </div>
                ) : (
                    <>
                        {appliedCoupon?.code === 'RAPPEL3' && (
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex justify-between items-center text-blue-800 text-sm">
                                <span className="font-medium">Beneficio generado (3%):</span>
                                <span className="font-bold">+{formatCurrency(newRappelGenerated)}</span>
                            </div>
                        )}

                        {currentUser && currentUser.rappelAccumulated > 0 && appliedCoupon?.code === 'RAPPEL3' && (
                            <div className="border-t border-slate-100 pt-4">
                                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-50 rounded select-none">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={useAccumulatedRappel}
                                            onChange={(e) => setUseAccumulatedRappel(e.target.checked)}
                                            className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Canjear saldo acumulado</p>
                                            <p className="text-xs text-slate-500">Disponible: {formatCurrency(currentUser.rappelAccumulated)}</p>
                                        </div>
                                    </div>
                                    {useAccumulatedRappel && <span className="text-green-600 font-bold">-{formatCurrency(rappelDiscount)}</span>}
                                </label>
                            </div>
                        )}

                        <div className="h-px bg-slate-200 my-2"></div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-500"><span>Subtotal Productos</span> <span>{formatCurrency(cartTotal)}</span></div>
                            {shippingCost > 0 && <div className="flex justify-between text-sm text-slate-500"><span>Envío</span> <span>{formatCurrency(shippingCost)}</span></div>}
                            {useAccumulatedRappel && <div className="flex justify-between text-sm text-green-600 font-medium"><span>Descuento Rappel</span> <span>-{formatCurrency(rappelDiscount)}</span></div>}
                            <div className="flex justify-between text-sm text-slate-500"><span>IVA (21%)</span> <span>{formatCurrency(tax)}</span></div>
                        </div>

                        <div className="h-px bg-slate-900 my-2"></div>
                        <div className="flex justify-between items-end">
                            <span className="font-bold text-slate-900">TOTAL A PAGAR</span>
                            <span className="text-3xl font-black text-slate-900">{formatCurrency(finalTotal)}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Footer Action */}
            <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
                <div className="max-w-3xl mx-auto">
                    <button
                        onClick={handleFinalizeOrder}
                        disabled={cart.length === 0}
                        className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                    >
                        CONFIRMAR PEDIDO <CheckCircle size={20} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderSuccessView = () => (
        <div className="p-6 md:p-10 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[80vh] text-center">
            <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={48} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">¡Pedido Confirmado!</h1>
            <p className="text-slate-500 mb-8 max-w-md">Hemos enviado un correo electrónico con el detalle de tu pedido a <span className="font-bold text-slate-700">{currentUser?.email}</span></p>

            <div className="w-full bg-white border border-slate-200 rounded-xl p-6 text-left mb-8 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Resumen Rápido</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Referencia Pedido:</span>
                        <span className="font-mono font-bold">#{lastOrder?.id.slice(-6)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Total:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(lastOrder?.total || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Comercial:</span>
                        <span className="font-bold text-slate-900">{lastOrder?.salesRep || 'N/A'}</span>
                    </div>
                    {observations && (
                        <div className="pt-2 mt-2 border-t border-slate-100">
                            <span className="text-slate-500 block mb-1 text-xs uppercase">Observaciones:</span>
                            <p className="text-slate-700 italic bg-slate-50 p-2 rounded">{observations}</p>
                        </div>
                    )}
                </div>
            </div>

            {lastOrder?.salesRep && (
                <div className="bg-slate-900 text-white rounded-xl p-6 w-full max-w-md mb-6">
                    <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-2">Contacto Comercial</p>
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                            <Phone size={24} />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-lg">{lastOrder.salesRep}</p>
                            <p className="text-slate-300">{Object.keys(SALES_REPS).find(k => SALES_REPS[k] === lastOrder.salesRep) ? SALES_REPS_PHONES[Object.keys(SALES_REPS).find(k => SALES_REPS[k] === lastOrder.salesRep)!] : '958 000 000'}</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-white/10">
                        Si necesitas añadir algo extra al pedido que no aparece en la web, contacta directamente con tu comercial.
                    </p>
                </div>
            )}

            <button
                onClick={() => { clearCart(); setCurrentView('dashboard'); setLastOrder(null); setObservations(''); }}
                className="px-8 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
            >
                Volver al Inicio
            </button>
        </div>
    );

    const renderDashboardView = () => (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Hola, {currentUser?.name}</h1>
            <p className="text-slate-500 mb-8">Bienvenido a tu área privada B2B.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Saldo Rappel Disponible</h3>
                        <p className="text-4xl font-bold">{formatCurrency(currentUser?.rappelAccumulated || 0)}</p>
                        <p className="text-xs text-slate-400 mt-4">* Caducidad 12 meses desde generación.</p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 bg-slate-800 w-32 h-32 rounded-full opacity-50 blur-xl"></div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-center items-center text-center cursor-pointer hover:border-slate-400 transition-colors" onClick={() => setCurrentView('cat_flexible_vinilos')}>
                    <div className="bg-slate-50 p-4 rounded-full mb-3">
                        <Plus className="text-slate-900" size={24} />
                    </div>
                    <h3 className="font-bold text-slate-900">Nuevo Pedido</h3>
                    <p className="text-slate-500 text-sm">Acceder al catálogo completo</p>
                </div>
            </div>
        </div>
    );

    // --- MAIN RENDER ---

    if (currentView === 'login') return renderLoginView();

    if (!currentUser) {
        setCurrentView('login');
        return renderLoginView();
    }

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            <Sidebar
                currentView={currentView}
                setCurrentView={setCurrentView}
                cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
                currentUser={currentUser}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <div className="flex-1 flex flex-col h-screen overflow-y-auto">
                <header className="md:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-30 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-700 hover:text-slate-900 mr-2">
                            <Menu size={24} />
                        </button>
                        <img src="/logo.png" alt="DigitalMarket" className="h-8 w-auto" />
                        <span className="font-bold text-sm truncate max-w-[150px]">{currentUser?.name}</span>
                    </div>
                    <div className="flex gap-4">
                        {currentUser.role === 'client' && (
                            <button onClick={() => setCurrentView('cart')} className="relative p-1">
                                <ShoppingCart size={24} />
                                {cart.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">{cart.length}</span>}
                            </button>
                        )}
                        <button onClick={handleLogout}><LogOut size={24} className="text-slate-400" /></button>
                    </div>
                </header>

                <main className="flex-1">
                    {currentView === 'dashboard' && renderDashboardView()}
                    {currentView.startsWith('cat_') && renderProductListView()}
                    {currentView === 'cart' && renderCheckoutView()}
                    {currentView === 'order_success' && renderSuccessView()}
                    {currentView === 'client_orders' && renderClientOrdersView()}
                    {currentView === 'admin_load' && currentUser.role === 'admin' && renderAdminLoadView()}
                    {currentView === 'admin_users' && currentUser.role === 'admin' && renderAdminUsersView()}
                </main>
            </div>
        </div>
    );
}



