import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { Sidebar } from './components/Sidebar';
import { INITIAL_PRODUCTS, SALES_REPS, SALES_REPS_PHONES, DEMO_USER, ADMIN_USER } from './constants';
import { Product, CartItem, User } from './types';
import {
    Search, Filter, ShoppingCart, Plus, Minus, Check, ArrowRight,
    MapPin, Printer, Download, CreditCard, ChevronRight, AlertCircle, Trash2, ArrowLeft,
    CheckCircle, Settings, Save, Lock, Truck, Phone, Mail, FileText
} from 'lucide-react';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

export default function App() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
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

    // Admin Bulk Load State
    const [bulkRows, setBulkRows] = useState<Partial<Product>[]>(
        Array(10).fill({ name: '', reference: '', price: 0, category: 'flexible', width: 0, length: 0 })
    );

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (username === 'demo' && password === 'demo') {
            setCurrentUser(DEMO_USER);
            setCurrentView('dashboard');
            setLoginError('');
        } else if (username === 'admin' && password === 'admin') {
            setCurrentUser(ADMIN_USER);
            setCurrentView('admin_load');
            setLoginError('');
        } else {
            setLoginError('Credenciales incorrectas');
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
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
    const cartTotal = cart.reduce((sum, item) => sum + (item.calculatedPrice * item.quantity), 0);
    const shippingCost = shippingMethod === 'agency' ? 6.00 : 0.00;
    const newRappelGenerated = cartTotal * 0.05;
    const rappelDiscount = useAccumulatedRappel && currentUser ? Math.min(cartTotal, currentUser.rappelAccumulated) : 0;
    const subtotalAfterDiscount = cartTotal - rappelDiscount;
    const tax = subtotalAfterDiscount * 0.21;
    const finalTotal = subtotalAfterDiscount + tax + shippingCost;

    const validatePromo = () => {
        const code = promoCode.toLowerCase();
        if (SALES_REPS[code]) {
            setActiveRep(SALES_REPS[code]);
            setActiveRepPhone(SALES_REPS_PHONES[code] || '958 000 000');
        } else {
            setActiveRep(null);
            setActiveRepPhone('');
            alert("Código no válido");
        }
    };

    const handleFinalizeOrder = () => {
        if (!activeRep) {
            alert("Es necesario introducir un código promocional válido para asignar su comercial.");
            return;
        }

        // Enviar email
        const templateParams = {
            to_email: currentUser?.email,
            to_name: currentUser?.name,
            order_id: Date.now().toString().slice(-6),
            order_total: formatCurrency(finalTotal),
            sales_rep: activeRep,
            sales_rep_phone: activeRepPhone,
            order_details: cart.map(item => `${item.name} x ${item.quantity}`).join('\n'),
            observations: observations || 'Sin observaciones'
        };

        // NOTA: Reemplazar con tus credenciales de EmailJS
        // Para pruebas, puedes usar 'service_id', 'template_id', 'user_id' de tu cuenta gratuita
        // O configurar variables de entorno VITE_EMAILJS_...

        // Simulamos el envío para no bloquear si no hay credenciales
        console.log('Enviando email...', templateParams);

        /* 
        // Descomentar cuando tengas las credenciales
        emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams, 'YOUR_PUBLIC_KEY')
          .then((response) => {
             console.log('SUCCESS!', response.status, response.text);
          }, (err) => {
             console.log('FAILED...', err);
          });
        */

        setCurrentView('order_success');
    };

    // --- ADMIN LOGIC ---
    const handleBulkChange = (index: number, field: string, value: any) => {
        const newRows = [...bulkRows];
        newRows[index] = { ...newRows[index], [field]: value };
        setBulkRows(newRows);
    };

    const saveBulkProducts = () => {
        const validProducts = bulkRows.filter(r => r.name && r.price).map((r, i) => ({
            ...r,
            id: `new-${Date.now()}-${i}`,
            unit: r.category === 'flexible' ? 'bobina' : 'ud',
            isFlexible: r.category === 'flexible',
            pricePerM2: r.category === 'flexible' ? r.price : undefined
        } as Product));

        setProducts([...products, ...validProducts]);
        setBulkRows(Array(10).fill({ name: '', reference: '', price: 0, category: 'flexible', width: 0, length: 0 }));
        alert("Productos cargados correctamente");
    };

    // --- VIEW RENDERERS ---

    const renderLoginView = () => (
        <div class="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-200">
                <div class="text-center mb-8">
                    <div class="h-12 w-12 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">DM</div>
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

    const renderAdminLoadView = () => (
        <div class="p-6 md:p-10 max-w-7xl mx-auto">
            <h1 class="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <Settings className="text-slate-400" /> Carga de Materiales
            </h1>

            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <tr>
                                <th class="px-4 py-3 w-12">#</th>
                                <th class="px-4 py-3">Referencia</th>
                                <th class="px-4 py-3">Nombre</th>
                                <th class="px-4 py-3">Cat.</th>
                                <th class="px-4 py-3">Precio</th>
                                <th class="px-4 py-3">Ancho</th>
                                <th class="px-4 py-3">Largo</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            {bulkRows.map((row, idx) => (
                                <tr key={idx} class="hover:bg-slate-50">
                                    <td class="px-4 py-2 text-slate-400 font-mono">{idx + 1}</td>
                                    <td class="px-4 py-2">
                                        <input type="text" class="w-full bg-transparent border-b border-transparent focus:border-slate-400 outline-none text-slate-900"
                                            placeholder="REF" value={row.reference} onChange={e => handleBulkChange(idx, 'reference', e.target.value)} />
                                    </td>
                                    <td class="px-4 py-2">
                                        <input type="text" class="w-full bg-transparent border-b border-transparent focus:border-slate-400 outline-none text-slate-900"
                                            placeholder="Nombre" value={row.name} onChange={e => handleBulkChange(idx, 'name', e.target.value)} />
                                    </td>
                                    <td class="px-4 py-2">
                                        <select class="bg-transparent outline-none text-slate-600" value={row.category} onChange={e => handleBulkChange(idx, 'category', e.target.value)}>
                                            <option value="flexible">Flexible</option>
                                            <option value="rigid">Rígido</option>
                                            <option value="accessory">Accesorio</option>
                                            <option value="ink">Tinta</option>
                                        </select>
                                    </td>
                                    <td class="px-4 py-2">
                                        <input type="number" class="w-16 bg-transparent border-b border-transparent focus:border-slate-400 outline-none text-slate-900"
                                            placeholder="0.00" value={row.price} onChange={e => handleBulkChange(idx, 'price', parseFloat(e.target.value))} />
                                    </td>
                                    <td class="px-4 py-2">
                                        <input type="number" class="w-16 bg-transparent border-b border-slate-200 outline-none text-slate-900"
                                            value={row.width} onChange={e => handleBulkChange(idx, 'width', parseFloat(e.target.value))} disabled={row.category !== 'flexible'} />
                                    </td>
                                    <td class="px-4 py-2">
                                        <input type="number" class="w-16 bg-transparent border-b border-slate-200 outline-none text-slate-900"
                                            value={row.length} onChange={e => handleBulkChange(idx, 'length', parseFloat(e.target.value))} disabled={row.category !== 'flexible'} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="flex justify-end">
                <button onClick={saveBulkProducts} class="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors">
                    <Save size={18} /> Guardar Productos
                </button>
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
        } else {
            return null; // Should not happen based on Sidebar
        }

        const filteredProducts = products.filter(p => {
            const matchCategory = p.category === targetCategory;
            const matchSub = targetSubCategory ? p.subcategory === targetSubCategory : true;
            const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.reference.toLowerCase().includes(searchQuery.toLowerCase());
            return matchCategory && matchSub && matchSearch;
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

            {/* 1. Código Promo */}
            <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
                <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">1</div>
                    Código Promocional / Comercial
                </h3>
                <div class="flex gap-3">
                    <input
                        type="text"
                        placeholder="Ej. josem5"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        disabled={!!activeRep}
                        class="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none uppercase text-slate-900"
                    />
                    {!activeRep ? (
                        <button onClick={validatePromo} class="bg-slate-900 text-white px-6 font-bold rounded-lg hover:bg-slate-800">
                            Aplicar
                        </button>
                    ) : (
                        <button onClick={() => { setActiveRep(null); setActiveRepPhone(''); setPromoCode(''); }} class="bg-green-100 text-green-700 px-6 font-bold rounded-lg flex items-center gap-2">
                            <Check size={18} /> {activeRep}
                        </button>
                    )}
                </div>
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

                <div class="bg-blue-50 border border-blue-100 p-3 rounded-lg flex justify-between items-center text-blue-800 text-sm">
                    <span class="font-medium">Beneficio generado (5%):</span>
                    <span class="font-bold">+{formatCurrency(newRappelGenerated)}</span>
                </div>

                {currentUser && currentUser.rappelAccumulated > 0 && (
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
                        disabled={!activeRep}
                        class="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                    >
                        {activeRep ? 'CONFIRMAR PEDIDO' : 'INTRODUCE CÓDIGO PROMO'} <CheckCircle size={20} />
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
            />

            <div class="flex-1 flex flex-col h-screen overflow-y-auto">
                <header class="md:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-30 flex items-center justify-between shadow-sm">
                    <div class="flex items-center gap-2">
                        <div class="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold">DM</div>
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
                    {currentView === 'admin_load' && currentUser.role === 'admin' && renderAdminLoadView()}
                </main>
            </div>
        </div>
    );
}

// Helper icons
import { LayoutDashboard, LogOut } from 'lucide-react';
