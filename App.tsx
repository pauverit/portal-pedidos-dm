import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { Sidebar } from './components/Sidebar';
import { AdminBulkLoad } from './components/AdminBulkLoad';
import { INITIAL_PRODUCTS, SALES_REPS, SALES_REPS_PHONES, DEFAULT_USERS } from './constants';
import { Product, CartItem, User, Order } from './types';
import {
    Search, Filter, ShoppingCart, Plus, Minus, Check, ArrowRight,
    MapPin, Printer, Download, CreditCard, ChevronRight, AlertCircle, Trash2, ArrowLeft,
    CheckCircle, Settings, Save, Lock, Truck, Phone, Mail, FileText, UserPlus, Menu, ShoppingBag
} from 'lucide-react';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

export default function App() {
    // --- STATE MANAGEMENT ---
    // User persistence using LocalStorage
    const [users, setUsers] = useState<User[]>(() => {
        const saved = localStorage.getItem('dm_portal_users');
        return saved ? JSON.parse(saved) : DEFAULT_USERS;
    });

    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('dm_portal_current_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [currentView, setCurrentView] = useState('login');
    const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
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
    const handleBulkSave = (newProducts: Product[]) => {
        setProducts(prev => [...prev, ...newProducts]);
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
            const existing = prev.find(item => item.id === product.id);
            const calculatedPrice = product.isFlexible
                ? (product.width! * product.length! * product.pricePerM2!)
                : product.price;

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

    const handleFinalizeOrder = () => {
        // Enviar email
        const templateParams = {
            to_email: currentUser?.email,
            to_name: currentUser?.name,
            order_id: Date.now().toString().slice(-6),
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

        const newOrder: Order = {
            id: Date.now().toString(),
            userId: currentUser?.id || 'unknown',
            date: new Date().toISOString(),
            items: [...cart],
            total: finalTotal,
            status: 'pending',
            shippingMethod: shippingMethod,
            salesRep: activeRep || undefined,
            rappelDiscount: useAccumulatedRappel ? rappelDiscount : 0,
            couponDiscount: appliedCoupon ? appliedCoupon.discount : 0
        };

        // Save Order
        const updatedOrders = [newOrder, ...orders];
        setOrders(updatedOrders);
        localStorage.setItem('dm_portal_orders', JSON.stringify(updatedOrders));

        // Update User Rappel if used
        if (useAccumulatedRappel && currentUser) {
            const updatedUser = { ...currentUser, rappelAccumulated: currentUser.rappelAccumulated - rappelDiscount };
            setCurrentUser(updatedUser);
            // Update in users list
            const updatedUsersList = users.map(u => u.id === currentUser.id ? updatedUser : u);
            setUsers(updatedUsersList);
            localStorage.setItem('dm_portal_users', JSON.stringify(updatedUsersList));
            localStorage.setItem('dm_portal_current_user', JSON.stringify(updatedUser));
        }

        // Email logic
        emailjs
            .send(
                import.meta.env.VITE_EMAILJS_SERVICE_ID,
                import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
                templateParams,
                import.meta.env.VITE_EMAILJS_PUBLIC_KEY
            )
            .then((response) => {
                console.log('EMAIL ENVIADO OK', response.status, response.text);
            })
            .catch((error) => {
                console.error('ERROR ENVIANDO EMAIL', error);
            });

        setCart([]); // FIX: Clear cart immediately
        setCurrentView('order_success');
    };

    // --- ADMIN LOGIC ---


    // --- USER MANAGEMENT (ADMIN) ---
    // --- USER MANAGEMENT (ADMIN) ---
    // --- USER MANAGEMENT (ADMIN) ---
    const [newUser, setNewUser] = useState({ id: '', username: '', password: '', name: '', email: '', phone: '', delegation: '', salesRep: '' });
    const [isEditing, setIsEditing] = useState(false);

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.username || !newUser.password || !newUser.name || !newUser.delegation || !newUser.salesRep) {
            alert('Por favor rellena todos los campos obligatorios inc. Delegación y Comercial.');
            return;
        }

        if (isEditing) {
            // Update existing user
            const updatedUsers = users.map(u => {
                if (u.id === newUser.id) {
                    return {
                        ...u,
                        name: newUser.name,
                        email: newUser.email,
                        username: newUser.username,
                        password: newUser.password,
                        phone: newUser.phone,
                        delegation: newUser.delegation,
                        salesRep: newUser.salesRep
                    };
                }
                return u;
            });
            setUsers(updatedUsers);
            localStorage.setItem('dm_portal_users', JSON.stringify(updatedUsers));
            alert('Cliente actualizado correctamente');
            setIsEditing(false);
        } else {
            // Create new user
            const userToAdd: User = {
                id: `client-${Date.now()}`,
                name: newUser.name,
                email: newUser.email,
                role: 'client',
                username: newUser.username,
                password: newUser.password,
                phone: newUser.phone,
                delegation: newUser.delegation,
                salesRep: newUser.salesRep,
                rappelAccumulated: 0,
                registrationDate: new Date().toISOString(),
                usedCoupons: []
            };
            const updatedUsers = [...users, userToAdd];
            setUsers(updatedUsers);
            localStorage.setItem('dm_portal_users', JSON.stringify(updatedUsers));
            alert('Cliente registrado correctamente');
        }

        // Reset form
        setNewUser({ id: '', username: '', password: '', name: '', email: '', phone: '', delegation: '', salesRep: '' });
    };

    const handleEditUser = (user: User) => {
        setNewUser({
            id: user.id || '',
            username: user.username,
            password: user.password || '',
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            delegation: user.delegation || '',
            salesRep: user.salesRep || ''
        });
        setIsEditing(true);
        // Scroll to form (optional, but good UX)
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setNewUser({ id: '', username: '', password: '', name: '', email: '', phone: '', delegation: '', salesRep: '' });
        setIsEditing(false);
    };

    // --- VIEW RENDERERS ---

    const renderLoginView = () => (
        <div class="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-200">
                <div class="text-center mb-8">
                    <img src="/logo.png" alt="DigitalMarket" class="h-16 w-auto mx-auto mb-4" />
                    <h1 class="text-2xl font-bold text-slate-900">Portal B2B</h1>
                    <p class="text-slate-500 text-sm mt-2">Introduce tus credenciales de acceso</p>
                </div>

                <form onSubmit={handleLogin} class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-900"
                            placeholder="demo o admin"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-900"
                            placeholder="••••••"
                        />
                    </div>

                    {loginError && <p class="text-red-500 text-sm text-center">{loginError}</p>}

                    <button type="submit" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg shadow-lg transition-all active:scale-[0.98]">
                        ENTRAR
                    </button>
                </form>

                <div class="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p class="text-xs text-slate-400">Digital Market Granada &copy; 2023</p>
                </div>
            </div>
        </div>
    );

    const renderClientOrdersView = () => (
        <div class="p-6 md:p-10 max-w-7xl mx-auto">
            <h1 class="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <ShoppingBag className="text-slate-400" /> Mis Pedidos
            </h1>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p class="text-slate-500 text-xs uppercase font-bold mb-1">Pedidos Totales</p>
                    <p class="text-3xl font-bold text-slate-900">{orders.filter(o => o.userId === currentUser?.id).length}</p>
                </div>
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p class="text-slate-500 text-xs uppercase font-bold mb-1">Inversión Total</p>
                    <p class="text-3xl font-bold text-slate-900">{formatCurrency(orders.filter(o => o.userId === currentUser?.id).reduce((sum, o) => sum + o.total, 0))}</p>
                </div>
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p class="text-slate-500 text-xs uppercase font-bold mb-1">Saldo Rappel Acumulado</p>
                    <p class="text-3xl font-bold text-green-600">{formatCurrency(currentUser?.rappelAccumulated || 0)}</p>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            <th class="px-6 py-3">Referencia</th>
                            <th class="px-6 py-3">Fecha</th>
                            <th class="px-6 py-3">Estado</th>
                            <th class="px-6 py-3">Artículos</th>
                            <th class="px-6 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        {orders.filter(o => o.userId === currentUser?.id).length === 0 ? (
                            <tr>
                                <td colSpan={5} class="px-6 py-8 text-center text-slate-500">No tienes pedidos registrados aún.</td>
                            </tr>
                        ) : (
                            orders.filter(o => o.userId === currentUser?.id).map((order) => (
                                <tr key={order.id} class="hover:bg-slate-50 transition-colors">
                                    <td class="px-6 py-4 font-mono font-bold text-slate-900">#{order.id.slice(-6)}</td>
                                    <td class="px-6 py-4 text-slate-500">{new Date(order.date).toLocaleDateString()}</td>
                                    <td class="px-6 py-4">
                                        <span class={`px-2 py-1 rounded text-xs font-bold uppercase 
                                            ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'}`}>
                                            {order.status === 'pending' ? 'Pendiente' :
                                                order.status === 'processing' ? 'En Proceso' :
                                                    order.status === 'completed' ? 'Completado' : 'Cancelado'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-slate-600">
                                        {order.items.length} artículos
                                        <div class="text-xs text-slate-400 mt-1 truncate max-w-[200px]">
                                            {order.items.map(i => i.name).join(', ')}
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(order.total)}</td>
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
        <div class="p-6 md:p-10 max-w-4xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <UserPlus className="text-slate-400" /> {isEditing ? 'Editar Cliente' : 'Alta de Nuevo Cliente'}
                </h1>
                {isEditing && (
                    <button onClick={handleCancelEdit} class="text-sm text-red-500 font-bold underline">
                        Cancelar Edición
                    </button>
                )}
            </div>

            <div class={isEditing ? "bg-yellow-50 rounded-xl shadow-lg border border-yellow-200 p-8 transition-colors" : "bg-white rounded-xl shadow-lg border border-slate-200 p-8 transition-colors"}>
                <form onSubmit={handleAddUser} class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="md:col-span-2">
                        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Credenciales de Acceso</h3>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Usuario de Acceso</label>
                        <input required type="text" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                            class="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="ej. cliente1" />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Contraseña</label>
                        <input required type="text" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                            class="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="ej. 123456" />
                        <p class="text-[10px] text-slate-400 mt-1">Comparte estas credenciales con el cliente.</p>
                    </div>

                    <div class="md:col-span-2 mt-4">
                        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Datos de Facturación / Contacto</h3>
                    </div>

                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Fiscal / Comercial</label>
                        <input required type="text" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                            class="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="ej. Reformas y Construcciones S.L." />
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                        <input required type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            class="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="ej. contabilidad@empresa.com" />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                        <input required type="tel" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                            class="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="ej. 600 000 000" />
                    </div>

                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Delegación / Dirección de Entrega</label>
                        <input required type="text" value={newUser.delegation} onChange={e => setNewUser({ ...newUser, delegation: e.target.value })}
                            class="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="ej. Polígono Juncaril, C/ Baza 12" />
                    </div>

                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Comercial Asignado</label>
                        <select required value={newUser.salesRep} onChange={e => setNewUser({ ...newUser, salesRep: e.target.value })}
                            class="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-slate-900">
                            <option value="">Seleccionar Comercial...</option>
                            {Object.values(SALES_REPS).map(rep => (
                                <option key={rep} value={rep}>{rep}</option>
                            ))}
                        </select>
                    </div>

                    <div class="md:col-span-2 mt-6 flex justify-end gap-3">
                        {isEditing && (
                            <button type="button" onClick={handleCancelEdit} class="px-6 py-3 rounded-lg font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                                Cancelar
                            </button>
                        )}
                        <button type="submit" class="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg active:scale-95">
                            <UserPlus size={20} /> {isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}
                        </button>
                    </div>
                </form>
            </div>

            <div class="mt-8">
                <h3 class="text-lg font-bold text-slate-900 mb-4">Clientes Registrados</h3>
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <tr>
                                <th class="px-6 py-3">Nombre</th>
                                <th class="px-6 py-3">Usuario</th>
                                <th class="px-6 py-3">Rappels</th>
                                <th class="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            {users.filter(u => u.role === 'client').map((user, idx) => (
                                <tr key={idx} class="hover:bg-slate-50">
                                    <td class="px-6 py-3 font-medium text-slate-900">{user.name}</td>
                                    <td class="px-6 py-3 font-mono text-slate-500">{user.username}</td>
                                    <td class="px-6 py-3 font-bold text-slate-900">{formatCurrency(user.rappelAccumulated)}</td>
                                    <td class="px-6 py-3 text-right">
                                        <button onClick={() => handleEditUser(user)} class="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-3 py-1 rounded">
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
        // Logic to parse currentView for filtering
        // Example: 'cat_flexible_vinilos' -> category: flexible, subcategory: vinilos
        // Example: 'cat_ink_all' -> category: ink

        let targetCategory = '';
        let targetSubCategory = '';
        let title = '';

        if (currentView.startsWith('cat_')) {
            const parts = currentView.split('_');
            targetCategory = parts[1];
            if (parts[2] && parts[2] !== 'all') {
                targetSubCategory = parts[2];
            }

            // Global Search Logic: If search query exists, ignore category filters
            if (searchQuery) {
                title = `Resultados de búsqueda: "${searchQuery}"`;
            } else {
                switch (targetCategory) {
                    case 'flexible': title = 'Materiales Flexibles'; break;
                    case 'rigid': title = 'Soportes Rígidos'; break;
                    case 'accessory': title = 'Accesorios & Herramientas'; break;
                    case 'ink': title = 'Tintas & Consumibles'; break;
                    default: title = 'Catálogo';
                }
                if (targetSubCategory) {
                    title += ` / ${targetSubCategory.charAt(0).toUpperCase() + targetSubCategory.slice(1)}`;
                }
            }
        } else {
            return null; // Should not happen based on Sidebar
        }

        const filteredProducts = products.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.reference.toLowerCase().includes(searchQuery.toLowerCase());

            // If searching, ignore category match. If not searching, enforce category match.
            if (searchQuery) {
                return matchSearch;
            }

            const matchCategory = p.category === targetCategory;
            const matchSub = targetSubCategory ? p.subcategory === targetSubCategory : true;
            return matchCategory && matchSub;
        });

        return (
            <div class="p-6 md:p-10 max-w-7xl mx-auto">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 class="text-2xl font-bold text-slate-900 capitalize">{title}</h1>
                        <p class="text-slate-500 text-sm mt-1">Catálogo actualizado. Precios netos.</p>
                    </div>
                    <div class="relative max-w-xs w-full">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar referencia..."
                            class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {filteredProducts.length === 0 ? (
                    <div class="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                        <p class="text-slate-400">No se han encontrado productos en esta categoría.</p>
                    </div>
                ) : (
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProducts.map(product => {
                            // Check if item is in cart
                            const cartItem = cart.find(item => item.id === product.id);
                            const quantity = cartItem ? cartItem.quantity : 0;

                            return (
                                <div key={product.id} class="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
                                    <div>
                                        <div class="flex justify-between items-start mb-2">
                                            <span class="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded tracking-wider">{product.reference}</span>
                                            {product.category === 'ink' && <span class="text-green-600 text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> Stock</span>}
                                        </div>
                                        <h3 class="font-bold text-slate-900 text-lg mb-1 leading-tight">{product.name}</h3>

                                        {product.isFlexible ? (
                                            <div class="mt-4 bg-slate-50 p-3 rounded-lg text-sm space-y-2 border border-slate-100">
                                                <div class="flex justify-between">
                                                    <span class="text-slate-500">Formato:</span>
                                                    <span class="font-mono font-bold text-slate-700">{product.width}m x {product.length}m</span>
                                                </div>
                                                <div class="flex justify-between border-t border-slate-200 pt-2">
                                                    <span class="text-slate-500">Precio m²:</span>
                                                    <span class="font-bold text-slate-900">{formatCurrency(product.pricePerM2!)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p class="text-slate-500 text-sm mt-2">{product.category === 'ink' ? product.volume : product.unit}</p>
                                        )}
                                    </div>

                                    <div class="mt-6 flex items-end justify-between">
                                        <div>
                                            <p class="text-xs text-slate-400 uppercase">Precio Unidad</p>
                                            <p class="text-xl font-bold text-slate-900">{formatCurrency(product.price)}</p>
                                        </div>

                                        {quantity === 0 ? (
                                            <button
                                                onClick={() => addToCart(product)}
                                                class="bg-slate-900 hover:bg-slate-800 text-white h-10 w-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        ) : (
                                            <div class="flex items-center bg-slate-900 rounded-full shadow-lg overflow-hidden h-10">
                                                <button
                                                    onClick={() => updateQuantity(product.id, -1)}
                                                    class="h-full px-3 flex items-center justify-center text-white hover:bg-slate-700 transition-colors"
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span class="text-white font-bold min-w-[20px] text-center text-sm">{quantity}</span>
                                                <button
                                                    onClick={() => addToCart(product)}
                                                    class="h-full px-3 flex items-center justify-center text-white hover:bg-slate-700 transition-colors"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderCheckoutView = () => (
        <div class="p-4 md:p-8 max-w-3xl mx-auto w-full pb-32">
            <button onClick={() => setCurrentView('cat_flexible_vinilos')} class="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm"><ArrowLeft size={16} /> Seguir comprando</button>

            <h1 class="text-2xl font-bold text-slate-900 mb-6">Finalizar Pedido</h1>

            {/* 1. Código Promocional (Opcional) */}
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
                <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">1</div>
                    Cupones y Descuentos
                </h3>
                <div class="flex gap-3">
                    <input
                        type="text"
                        placeholder="Código Promocional (Opcional)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        disabled={!!appliedCoupon}
                        class="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none uppercase text-slate-900"
                    />
                    {!appliedCoupon ? (
                        <button onClick={applyCoupon} class="bg-slate-900 text-white px-6 font-bold rounded-lg hover:bg-slate-800">
                            Aplicar
                        </button>
                    ) : (
                        <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} class="bg-green-100 text-green-700 px-6 font-bold rounded-lg flex items-center gap-2">
                            <Check size={18} /> {appliedCoupon.code}
                        </button>
                    )}
                </div>
                {appliedCoupon && <p class="text-green-600 text-sm mt-2 font-bold">Descuento aplicado: -{formatCurrency(appliedCoupon.discount)}</p>}
            </div>

            {/* Info Comercial */}
            <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div>
                    <p class="text-xs font-bold text-blue-800 uppercase">Comercial Asignado</p>
                    <p class="text-blue-900 font-bold text-lg">{activeRep || 'Sin asignar'}</p>
                </div>
                {activeRep && <div class="bg-white px-3 py-1 rounded text-blue-900 font-mono text-sm">{activeRepPhone}</div>}
            </div>

            {/* 2. Método de Envío */}
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
                <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">2</div>
                    Método de Envío
                </h3>
                <div class="space-y-3">
                    <label class="block relative cursor-pointer group">
                        <input type="radio" name="shipping" checked={shippingMethod === 'agency'} onChange={() => setShippingMethod('agency')} class="peer sr-only" />
                        <div class="p-4 rounded-xl border border-slate-200 bg-white peer-checked:border-slate-900 peer-checked:bg-slate-50 transition-all flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <Truck className="text-slate-400 peer-checked:text-slate-900" size={24} />
                                <div>
                                    <p class="font-bold text-slate-900 text-sm">ENVÍO POR AGENCIA 24H</p>
                                    <p class="text-xs text-slate-500">Entrega garantizada al día siguiente</p>
                                </div>
                            </div>
                            <span class="font-bold text-slate-900 text-sm">+ 6,00 €</span>
                        </div>
                    </label>
                    <label class="block relative cursor-pointer group">
                        <input type="radio" name="shipping" checked={shippingMethod === 'own'} onChange={() => setShippingMethod('own')} class="peer sr-only" />
                        <div class="p-4 rounded-xl border border-slate-200 bg-white peer-checked:border-slate-900 peer-checked:bg-slate-50 transition-all flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <Truck className="text-slate-400 peer-checked:text-slate-900" size={24} />
                                <div>
                                    <p class="font-bold text-slate-900 text-sm">REPARTO PROPIO</p>
                                    <p class="text-xs text-slate-500">Entrega en próxima ruta programada</p>
                                </div>
                            </div>
                            <span class="font-bold text-green-600 text-sm">GRATIS</span>
                        </div>
                    </label>
                </div>
            </div>

            {/* 3. Observaciones */}
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
                <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">3</div>
                    Observaciones
                </h3>
                <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Indica aquí si necesitas algo extra, horarios de entrega o detalles relevantes..."
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 h-24 resize-none"
                />
            </div>

            {/* 4. Resumen */}
            <div class="bg-white rounded-xl p-6 shadow-lg border border-slate-100 space-y-4">
                <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">4</div>
                    Resumen Económico
                </h3>

                {appliedCoupon?.code === 'RAPPEL3' && (
                    <div class="bg-blue-50 border border-blue-100 p-3 rounded-lg flex justify-between items-center text-blue-800 text-sm">
                        <span class="font-medium">Beneficio generado (3%):</span>
                        <span class="font-bold">+{formatCurrency(newRappelGenerated)}</span>
                    </div>
                )}

                {currentUser && currentUser.rappelAccumulated > 0 && appliedCoupon?.code === 'RAPPEL3' && (
                    <div class="border-t border-slate-100 pt-4">
                        <label class="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-50 rounded select-none">
                            <div class="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={useAccumulatedRappel}
                                    onChange={(e) => setUseAccumulatedRappel(e.target.checked)}
                                    class="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                                <div>
                                    <p class="text-sm font-bold text-slate-700">Canjear saldo acumulado</p>
                                    <p class="text-xs text-slate-500">Disponible: {formatCurrency(currentUser.rappelAccumulated)}</p>
                                </div>
                            </div>
                            {useAccumulatedRappel && <span class="text-green-600 font-bold">-{formatCurrency(rappelDiscount)}</span>}
                        </label>
                    </div>
                )}

                <div class="h-px bg-slate-200 my-2"></div>

                <div class="space-y-2">
                    <div class="flex justify-between text-sm text-slate-500"><span>Subtotal Productos</span> <span>{formatCurrency(cartTotal)}</span></div>
                    {shippingCost > 0 && <div class="flex justify-between text-sm text-slate-500"><span>Envío</span> <span>{formatCurrency(shippingCost)}</span></div>}
                    {useAccumulatedRappel && <div class="flex justify-between text-sm text-green-600 font-medium"><span>Descuento Rappel</span> <span>-{formatCurrency(rappelDiscount)}</span></div>}
                    <div class="flex justify-between text-sm text-slate-500"><span>IVA (21%)</span> <span>{formatCurrency(tax)}</span></div>
                </div>

                <div class="h-px bg-slate-900 my-2"></div>
                <div class="flex justify-between items-end">
                    <span class="font-bold text-slate-900">TOTAL A PAGAR</span>
                    <span class="text-3xl font-black text-slate-900">{formatCurrency(finalTotal)}</span>
                </div>
            </div>

            {/* Footer Action */}
            <div class="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
                <div class="max-w-3xl mx-auto">
                    <button
                        onClick={handleFinalizeOrder}
                        disabled={cart.length === 0}
                        class="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                    >
                        CONFIRMAR PEDIDO <CheckCircle size={20} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderSuccessView = () => (
        <div class="p-6 md:p-10 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[80vh] text-center">
            <div class="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={48} />
            </div>
            <h1 class="text-3xl font-bold text-slate-900 mb-2">¡Pedido Confirmado!</h1>
            <p class="text-slate-500 mb-8 max-w-md">Hemos enviado un correo electrónico con el detalle de tu pedido a <span class="font-bold text-slate-700">digitalmarketgranada@gmail.com</span></p>

            <div class="w-full bg-white border border-slate-200 rounded-xl p-6 text-left mb-8 shadow-sm">
                <h3 class="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Resumen Rápido</h3>
                <div class="space-y-3 text-sm">
                    <div class="flex justify-between">
                        <span class="text-slate-500">Referencia Pedido:</span>
                        <span class="font-mono font-bold">#{Date.now().toString().slice(-6)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-500">Total:</span>
                        <span class="font-bold text-slate-900">{formatCurrency(finalTotal)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-500">Comercial:</span>
                        <span class="font-bold text-slate-900">{activeRep}</span>
                    </div>
                    {observations && (
                        <div class="pt-2 mt-2 border-t border-slate-100">
                            <span class="text-slate-500 block mb-1 text-xs uppercase">Observaciones:</span>
                            <p class="text-slate-700 italic bg-slate-50 p-2 rounded">{observations}</p>
                        </div>
                    )}
                </div>
            </div>

            {activeRep && (
                <div class="bg-slate-900 text-white rounded-xl p-6 w-full max-w-md mb-6">
                    <p class="text-slate-400 text-xs uppercase tracking-wider font-bold mb-2">Contacto Comercial</p>
                    <div class="flex items-center gap-4">
                        <div class="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                            <Phone size={24} />
                        </div>
                        <div class="text-left">
                            <p class="font-bold text-lg">{activeRep}</p>
                            <p class="text-slate-300">{activeRepPhone}</p>
                        </div>
                    </div>
                    <p class="text-xs text-slate-400 mt-4 pt-4 border-t border-white/10">
                        Si necesitas añadir algo extra al pedido que no aparece en la web, contacta directamente con tu comercial.
                    </p>
                </div>
            )}

            <button
                onClick={() => { clearCart(); setCurrentView('dashboard'); }}
                class="px-8 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
            >
                Volver al Inicio
            </button>
        </div>
    );

    const renderDashboardView = () => (
        <div class="p-6 md:p-10 max-w-7xl mx-auto">
            <h1 class="text-3xl font-bold text-slate-900 mb-2">Hola, {currentUser?.name}</h1>
            <p class="text-slate-500 mb-8">Bienvenido a tu área privada B2B.</p>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-slate-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div class="relative z-10">
                        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Saldo Rappel Disponible</h3>
                        <p class="text-4xl font-bold">{formatCurrency(currentUser?.rappelAccumulated || 0)}</p>
                        <p class="text-xs text-slate-400 mt-4">* Caducidad 12 meses desde generación.</p>
                    </div>
                    <div class="absolute -right-4 -bottom-4 bg-slate-800 w-32 h-32 rounded-full opacity-50 blur-xl"></div>
                </div>

                <div class="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-center items-center text-center cursor-pointer hover:border-slate-400 transition-colors" onClick={() => setCurrentView('cat_flexible_vinilos')}>
                    <div class="bg-slate-50 p-4 rounded-full mb-3">
                        <Plus className="text-slate-900" size={24} />
                    </div>
                    <h3 class="font-bold text-slate-900">Nuevo Pedido</h3>
                    <p class="text-slate-500 text-sm">Acceder al catálogo completo</p>
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
        <div class="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            <Sidebar
                currentView={currentView}
                setCurrentView={setCurrentView}
                cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
                currentUser={currentUser}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <div class="flex-1 flex flex-col h-screen overflow-y-auto">
                <header class="md:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-30 flex items-center justify-between shadow-sm">
                    <div class="flex items-center gap-2">
                        <button onClick={() => setIsMobileMenuOpen(true)} class="text-slate-700 hover:text-slate-900 mr-2">
                            <Menu size={24} />
                        </button>
                        <img src="/logo.png" alt="DigitalMarket" class="h-8 w-auto" />
                        <span class="font-bold text-sm truncate max-w-[150px]">{currentUser?.name}</span>
                    </div>
                    <div class="flex gap-4">
                        {currentUser.role === 'client' && (
                            <button onClick={() => setCurrentView('cart')} class="relative p-1">
                                <ShoppingCart size={24} />
                                {cart.length > 0 && <span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">{cart.length}</span>}
                            </button>
                        )}
                        <button onClick={handleLogout}><LogOut size={24} className="text-slate-400" /></button>
                    </div>
                </header>

                <main class="flex-1">
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

// Helper icons
import { LayoutDashboard, LogOut } from 'lucide-react';
