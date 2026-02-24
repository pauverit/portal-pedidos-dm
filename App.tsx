import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Sidebar } from './components/Sidebar';
import { AdminBulkLoad } from './components/AdminBulkLoad';
import { AdminBulkEdit } from './components/AdminBulkEdit';
import { CrossSellModal, PromoVinylEntry, PromoSelection } from './components/CrossSellModal';
import { AdminClientList } from './components/AdminClientList';
import { AdminCoupons } from './components/AdminCoupons';
import { LoginView } from './components/LoginView';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminProductList } from './components/AdminProductList';
import { ClientOrdersView } from './components/ClientOrdersView';
import { AdminNewClient } from './components/AdminNewClient';
import { ProductListView } from './components/ProductListView';
import { CheckoutView } from './components/CheckoutView';
import { OrderSuccessView } from './components/OrderSuccessView';
import { DashboardView } from './components/DashboardView';
import { SalesDashboard } from './components/SalesDashboard';
import { AdminSalesManagement } from './components/AdminSalesManagement';

import {
    SALES_REPS, SALES_REPS_PHONES, SALES_REPS_EMAILS, INITIAL_PRODUCTS
} from './constants';
import { Product, CartItem, User, Order } from './types';
import { isVinyl, isLaminate } from './lib/utils';
import { orderService } from './services/orderService';
import { useSupabaseData } from './hooks/useSupabaseData';
import { useCart } from './hooks/useCart';
import { useAuth } from './hooks/useAuth';

import {
    Menu, LogOut, X, ShoppingCart
} from 'lucide-react';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

export default function App() {
    const {
        products, users, setUsers, promoCoupons, setPromoCoupons, refreshData
    } = useSupabaseData();
    const { currentUser, setCurrentUser, login, logout, updateCurrentUser } = useAuth();
    const { cart, setCart, addToCart, updateQuantity, clearCart } = useCart(currentUser);

    const [currentView, setCurrentView] = useState('login');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default');
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
    const [shippingMethod, setShippingMethod] = useState<'agency' | 'own'>('own');
    const [observations, setObservations] = useState('');
    const [lastOrder, setLastOrder] = useState<Order | null>(null);
    const [useAccumulatedRappel, setUseAccumulatedRappel] = useState(false);
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [promoEntries, setPromoEntries] = useState<PromoVinylEntry[]>([]);
    const offeredVinylIds = useRef<Set<string>>(new Set());
    const [loginError, setLoginError] = useState('');

    const [orders, setOrders] = useState<Order[]>([]);

    // Helper states from original logic
    const activeRep = currentUser?.salesRep || null;
    const repKey = Object.keys(SALES_REPS).find(key => SALES_REPS[key] === activeRep);
    const activeRepPhone = repKey ? SALES_REPS_PHONES[repKey] : '958 000 000';

    const cartTotal = cart.reduce((sum, item) => sum + (item.calculatedPrice * item.quantity), 0);
    const totalWeight = cart.reduce((sum, item) => sum + ((item.weight || 1) * item.quantity), 0);
    const agencyCost = (cartTotal > 400 && totalWeight <= 25) ? 0 : (totalWeight <= 25 ? 8 : (totalWeight <= 50 ? 12 : 18));
    const shippingCost = shippingMethod === 'agency' ? agencyCost : 0;
    const rappelGeneratedThreshold = currentUser?.rappelThreshold || 800;
    const newRappelGenerated = cartTotal > rappelGeneratedThreshold ? cartTotal * 0.03 : 0;
    const discountAmount = appliedCoupon?.discount || 0;
    const rappelDiscount = useAccumulatedRappel && currentUser ? Math.min(cartTotal - discountAmount, currentUser.rappelAccumulated) : 0;
    const subtotalAfterDiscount = cartTotal - discountAmount - rappelDiscount;
    const tax = subtotalAfterDiscount * 0.21;
    const finalTotal = subtotalAfterDiscount + tax + shippingCost;

    const loadUserOrders = async (userId: string) => {
        try {
            const userOrders = await orderService.getUserOrders(userId);
            setOrders(userOrders);
        } catch (error) {
            console.error('Error loading user orders:', error);
        }
    };

    useEffect(() => {
        if (currentUser) {
            if (currentView === 'login') {
                setCurrentView(currentUser.role === 'admin' ? 'admin_dashboard' : currentUser.role === 'sales' ? 'dashboard' : 'dashboard');
            }
            loadUserOrders(currentUser.role === 'client' ? currentUser.id : undefined);
        } else {
            setOrders([]);
        }
    }, [currentUser]);

    const handleLogin = (u: string, p: string) => {
        const foundUser = users.find(user => user.username === u && user.password === p);
        if (foundUser) {
            login(foundUser);
            setLoginError('');
        } else {
            setLoginError('Credenciales incorrectas');
        }
    };

    const handleLogout = () => {
        if (cart.length === 0) {
            confirmLogout(true);
        } else {
            setShowLogoutModal(true);
        }
    };
    const confirmLogout = (shouldClearCart: boolean) => {
        if (shouldClearCart) clearCart();
        logout();
        setCurrentView('login');
        setShowLogoutModal(false);
    };

    const handleApplyCoupon = () => {
        const code = couponCode.toUpperCase().trim();
        const dynamicCoupon = promoCoupons.find(c => c.code === code);
        if (dynamicCoupon && dynamicCoupon.isActive) {
            const discount = dynamicCoupon.discountType === 'percentage' ? cartTotal * (dynamicCoupon.discountValue / 100) : dynamicCoupon.discountValue;
            setAppliedCoupon({ code, discount });
        } else {
            alert('Cupón no válido');
        }
    };

    const handleFinalizeOrder = async () => {
        if (!currentUser) return;
        try {
            const results = await orderService.finalizeOrder({
                currentUser, cart, finalTotal, activeRep, activeRepPhone, observations,
                shippingMethod, useAccumulatedRappel, rappelDiscount, appliedCoupon,
                newRappelGenerated
            });

            const newOrder: Order = {
                id: results.order.id,
                userId: currentUser.id,
                date: new Date().toISOString(),
                items: [...cart],
                total: finalTotal,
                status: 'processing',
                shippingMethod,
                salesRep: activeRep || undefined,
                rappelDiscount,
                couponDiscount: discountAmount
            };

            setLastOrder(newOrder);
            setOrders(prev => [...prev, newOrder]);
            updateCurrentUser({ rappelAccumulated: results.newRappelTotal });
            clearCart();
            setCurrentView('client_orders');
        } catch (error: any) {
            alert('Error: ' + error.message);
        }
    };

    const handleAcceptPromo = (selections: PromoSelection[]) => {
        setCart(prev => {
            let next = [...prev];
            for (const sel of selections) {
                const laminateId = `${sel.laminate.id}-pack-${sel.vinylCartItemId}`;

                next = next.map(item => {
                    if (item.id !== sel.vinylCartItemId) return item;
                    const nm2 = Math.max(0, (item.pricePerM2 ?? 0) - 0.10);
                    return {
                        ...item,
                        pricePerM2: nm2,
                        originalPricePerM2: item.pricePerM2,
                        promoLinkedId: laminateId,
                        calculatedPrice: (item.width ?? 0) * (item.length ?? 0) * nm2,
                        name: item.name.includes('(Pack)') ? item.name : `${item.name} (Pack)`
                    };
                });

                const l = sel.laminate;
                const dpm2 = Math.max(0, (l.pricePerM2 ?? 0) - 0.10);
                next.push({
                    ...l,
                    id: laminateId,
                    finish: sel.finish,
                    pricePerM2: dpm2,
                    calculatedPrice: (l.width ?? 0) * (l.length ?? 0) * dpm2,
                    quantity: 1,
                    name: `${l.name} [${sel.finish === 'gloss' ? 'Brillo' : 'Mate'}, Pack]`
                });
            }
            return next;
        });
        setShowPromoModal(false);
    };

    // Auto-restore vinyl price if linked laminate is removed
    useEffect(() => {
        const promotedVinyls = cart.filter(item => item.promoLinkedId);
        if (promotedVinyls.length === 0) return;

        let needsUpdate = false;
        const newCart = cart.map(item => {
            if (item.promoLinkedId && !cart.some(l => l.id === item.promoLinkedId)) {
                needsUpdate = true;
                const restoredPrice = item.originalPricePerM2 ?? (item.pricePerM2 ?? 0) + 0.10;
                return {
                    ...item,
                    pricePerM2: restoredPrice,
                    originalPricePerM2: undefined,
                    promoLinkedId: undefined,
                    calculatedPrice: (item.width ?? 0) * (item.length ?? 0) * restoredPrice,
                    name: item.name.replace(' (Pack)', '')
                };
            }
            return item;
        });

        if (needsUpdate) {
            setCart(newCart);
        }
    }, [cart]);

    useEffect(() => {
        if (currentView !== 'cart') { offeredVinylIds.current.clear(); return; }
        const vinylItems = cart.filter(item => item.category === 'flexible' && isVinyl(item) && !item.name.includes('Pack') && !offeredVinylIds.current.has(item.id));
        if (vinylItems.length === 0) return;
        const entries: PromoVinylEntry[] = [];
        for (const v of vinylItems) {
            const vPrice = v.pricePerM2 ?? 0;
            const candidates = products.filter(p => {
                const isMatchingLaminate = p.category === 'flexible' && isLaminate(p) && p.width === v.width && (v.brand ? p.brand === v.brand : true);
                if (!isMatchingLaminate) return false;

                // Allow only laminates with similar price (+/- 0.40€/m2)
                const pPrice = p.pricePerM2 ?? 0;
                if (vPrice === 0) return true; // Fallback if price is missing
                const diff = Math.abs(pPrice - vPrice);
                return diff <= 0.40;
            });

            if (candidates.length > 0) entries.push({ vinylItem: v, candidates });
            offeredVinylIds.current.add(v.id);
        }
        if (entries.length > 0) { setPromoEntries(entries); setShowPromoModal(true); }
    }, [currentView, cart, products]);

    const handleSaveClient = async (updatedClient: User) => {
        try {
            const { error } = await supabase
                .from('clients')
                .update({
                    company_name: updatedClient.name,
                    email: updatedClient.email,
                    phone: updatedClient.phone,
                    sales_rep: updatedClient.salesRep,
                    delegation: updatedClient.delegation,
                    rappel_threshold: updatedClient.rappelThreshold,
                    hide_prices: updatedClient.hidePrices,
                    is_active: updatedClient.isActive,
                    must_change_password: updatedClient.mustChangePassword
                })
                .eq('id', updatedClient.id);

            if (error) throw error;
            await refreshData();
        } catch (error: any) {
            alert('Error al guardar cliente: ' + error.message);
        }
    };

    const handleCreateClient = async (clientData: any) => {
        try {
            const data = {
                company_name: clientData.name,
                username: clientData.username,
                password: clientData.password,
                email: clientData.email,
                phone: clientData.phone,
                sales_rep: currentUser?.role === 'sales' ? currentUser.name : clientData.salesRep,
                sales_rep_code: currentUser?.role === 'sales' ? currentUser.salesRepCode : undefined,
                delegation: clientData.delegation,
                rappel_threshold: clientData.rappelThreshold,
                hide_prices: clientData.hidePrices,
                rappel_accumulated: 0,
                must_change_password: true,
                role: 'client'
            };

            const { error } = await supabase
                .from('clients')
                .insert([data]);

            if (error) throw error;
            await refreshData();
        } catch (error: any) {
            throw error;
        }
    };

    const handleAddCoupon = async (coupon: any) => {
        try {
            const { error } = await supabase.from('coupons').insert([coupon]);
            if (error) throw error;
            await refreshData();
        } catch (error: any) {
            alert('Error al crear cupón: ' + error.message);
        }
    };

    const handleUpdateCoupon = async (code: string, updates: any) => {
        try {
            const { error } = await supabase.from('coupons').update(updates).eq('code', code);
            if (error) throw error;
            await refreshData();
        } catch (error: any) {
            alert('Error al actualizar cupón: ' + error.message);
        }
    };

    const handleDeleteCoupon = async (code: string) => {
        try {
            const { error } = await supabase.from('coupons').delete().eq('code', code);
            if (error) throw error;
            await refreshData();
        } catch (error: any) {
            alert('Error al eliminar cupón: ' + error.message);
        }
    };

    const mapProductToDb = (p: Product) => ({
        name: p.name,
        reference: p.reference,
        category: p.category,
        subcategory: p.subcategory,
        price: p.price,
        unit: p.unit,
        is_flexible: p.isFlexible,
        width: p.width,
        length: p.length,
        price_per_m2: p.pricePerM2,
        volume: p.volume,
        in_stock: p.inStock,
        brand: p.brand,
        weight: p.weight,
        description: p.description,
        finish: p.finish,
        backing: p.backing,
        adhesive: p.adhesive,
        material_type: p.materialType,
        allow_finish: p.allowFinish,
        allow_backing: p.allowBacking,
        allow_adhesive: p.allowAdhesive
    });

    const handleUpdateProduct = async (product: Product) => {
        try {
            const { error } = await supabase
                .from('products')
                .update(mapProductToDb(product))
                .eq('id', product.id);
            if (error) throw error;
            await refreshData();
        } catch (error: any) {
            alert('Error al actualizar producto: ' + error.message);
        }
    };

    const handleSaveBulkProducts = async (newProducts: Product[]) => {
        try {
            if (newProducts.length === 0) {
                // Bulk delete
                const { error } = await supabase.from('products').delete().neq('id', '0');
                if (error) throw error;
            } else {
                // Bulk insert
                const dbProducts = newProducts.map(mapProductToDb);
                const { error } = await supabase.from('products').insert(dbProducts);
                if (error) throw error;
            }
            await refreshData();
        } catch (error: any) {
            alert('Error en carga masiva: ' + error.message);
        }
    };

    const handleBulkEditProducts = async (modifiedProducts: Product[]) => {
        try {
            for (const p of modifiedProducts) {
                const { error } = await supabase.from('products').update(mapProductToDb(p)).eq('id', p.id);
                if (error) throw error;
            }
            await refreshData();
        } catch (error: any) {
            alert('Error en edición masiva: ' + error.message);
        }
    };

    const renderContent = () => {
        if (currentView === 'dashboard' && currentUser) {
            if (currentUser.role === 'sales') {
                return <SalesDashboard currentUser={currentUser} clients={users} orders={orders} onNavigate={setCurrentView} formatCurrency={formatCurrency} />;
            }
            return <DashboardView currentUser={currentUser} onNewOrder={() => setCurrentView('cat_flexible_vinilos')} formatCurrency={formatCurrency} />;
        }
        if (currentView.startsWith('cat_')) return <ProductListView products={products} cart={cart} currentView={currentView} searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} sortOrder={sortOrder} onSortOrderChange={setSortOrder} onAddToCart={addToCart} onUpdateQuantity={updateQuantity} onEditProduct={setEditingProduct} isAdmin={currentUser?.role === 'admin'} formatCurrency={formatCurrency} />;
        if (currentView === 'cart' && currentUser) return <CheckoutView currentUser={currentUser} cart={cart} onContinueShopping={() => setCurrentView('cat_flexible_vinilos')} onUpdateQuantity={updateQuantity} onAddToCart={addToCart} formatCurrency={formatCurrency} couponCode={couponCode} onCouponCodeChange={setCouponCode} appliedCoupon={appliedCoupon} onApplyCoupon={handleApplyCoupon} onRemoveCoupon={() => setAppliedCoupon(null)} activeRep={activeRep} activeRepPhone={activeRepPhone} totalWeight={totalWeight} shippingMethod={shippingMethod} onShippingMethodChange={setShippingMethod} agencyCost={agencyCost} observations={observations} onObservationsChange={setObservations} useAccumulatedRappel={useAccumulatedRappel} onUseAccumulatedRappelChange={setUseAccumulatedRappel} rappelDiscount={rappelDiscount} cartTotal={cartTotal} shippingCost={shippingCost} tax={tax} finalTotal={finalTotal} newRappelGenerated={newRappelGenerated} onFinalizeOrder={handleFinalizeOrder} />;
        if (currentView === 'order_success') return <OrderSuccessView order={lastOrder} observations={observations} formatCurrency={formatCurrency} onReset={() => setCurrentView('dashboard')} userEmail={currentUser?.email || ''} salesRepPhone={activeRepPhone} />;
        if (currentView === 'client_orders') return <ClientOrdersView currentUser={currentUser!} orders={orders} formatCurrency={formatCurrency} />;
        if (currentView === 'admin_dashboard') return <AdminDashboard onNavigate={setCurrentView} />;
        if (currentView === 'admin_products') return <AdminProductList products={products} searchQuery={searchQuery} onSearchChange={setSearchQuery} editingProduct={editingProduct} onEditClick={setEditingProduct} onUpdateProduct={handleUpdateProduct} onCancelEdit={() => setEditingProduct(null)} onEditingProductChange={setEditingProduct} onBack={() => setCurrentView('admin_dashboard')} formatCurrency={formatCurrency} />;
        if (currentView === 'admin_load') return <AdminBulkLoad onSave={handleSaveBulkProducts} currentProducts={products} />;
        if (currentView === 'admin_bulk_edit') return <AdminBulkEdit products={products} onSave={handleBulkEditProducts} onBack={() => setCurrentView('admin_dashboard')} />;
        if (currentView === 'admin_client_list') {
            const displayClients = currentUser?.role === 'sales'
                ? users.filter(u => u.salesRep === currentUser.name || u.salesRepCode === currentUser.salesRepCode)
                : users;
            const salesReps = users.filter(u => u.role === 'sales');
            return <div className="p-6 md:p-10 max-w-7xl mx-auto"><AdminClientList clients={displayClients} orders={orders} onEditClient={() => { }} onSaveClient={handleSaveClient} formatCurrency={formatCurrency} isAdmin={currentUser?.role === 'admin'} salesRepsData={salesReps} /></div>;
        }
        if (currentView === 'admin_new_client') {
            const salesReps = users.filter(u => u.role === 'sales');
            return <AdminNewClient onSave={handleCreateClient} onBack={() => setCurrentView(currentUser?.role === 'sales' ? 'dashboard' : 'admin_dashboard')} isAdmin={currentUser?.role === 'admin'} salesReps={salesReps} />;
        }
        if (currentView === 'admin_coupons') return <div className="p-6 md:p-10 max-w-7xl mx-auto"><AdminCoupons coupons={promoCoupons} onAddCoupon={handleAddCoupon} onUpdateCoupon={handleUpdateCoupon} onDeleteCoupon={handleDeleteCoupon} /></div>;
        if (currentView === 'admin_sales_management') return <AdminSalesManagement salesReps={users.filter(u => u.role === 'sales')} clients={users} orders={orders} onRefresh={refreshData} formatCurrency={formatCurrency} />;

        return <div className="p-10">Vista no encontrada ({currentView})</div>;
    };

    if (currentView === 'login') return <LoginView onLogin={handleLogin} loginError={loginError} />;

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} cartCount={cart.reduce((a, b) => a + b.quantity, 0)} currentUser={currentUser!} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} onLogout={handleLogout} />
            <div className="flex-1 flex flex-col h-screen overflow-y-auto">
                <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600">
                        <Menu size={24} />
                    </button>
                    <img src="/logo.png" alt="DigitalMarket" className="h-8 w-auto" />
                    <button onClick={() => setCurrentView('cart')} className="p-2 -mr-2 text-slate-600 relative">
                        <ShoppingCart size={24} />
                        {cart.length > 0 && (
                            <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                                {cart.reduce((a, b) => a + b.quantity, 0)}
                            </span>
                        )}
                    </button>
                </header>
                <main className="flex-1">{renderContent()}</main>
            </div>
            {showLogoutModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Cerrar Sesión</h3>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => confirmLogout(false)} className="bg-green-600 text-white p-3 rounded font-bold">Guardar Carrito</button>
                            <button onClick={() => confirmLogout(true)} className="bg-red-600 text-white p-3 rounded font-bold">Vaciar Carrito</button>
                            <button onClick={() => setShowLogoutModal(false)} className="p-2">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
            <CrossSellModal isOpen={showPromoModal} onClose={() => setShowPromoModal(false)} promoEntries={promoEntries} onAcceptPromo={handleAcceptPromo} formatCurrency={formatCurrency} />
        </div>
    );
}
