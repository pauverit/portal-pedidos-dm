import React, { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { Sidebar } from './components/Sidebar';
import { CrossSellModal, PromoVinylEntry, PromoSelection } from './components/CrossSellModal';
import { LoginView } from './components/LoginView';
import { ProductListView } from './components/ProductListView';
import { CheckoutView } from './components/CheckoutView';
import { OrderSuccessView } from './components/OrderSuccessView';
import { DashboardView } from './components/DashboardView';
import { ClientOrdersView } from './components/ClientOrdersView';
import { ProfileEditModal } from './components/ProfileEditModal';
import { useToast } from './components/Toast';
import { useIncidents } from './hooks/useIncidents';
import { useWorkOrders } from './hooks/useWorkOrders';
import { useSATParts } from './hooks/useSATParts';
import { useCRM } from './hooks/useCRM';

// Lazy-loaded: Admin
const AdminBulkLoad        = React.lazy(() => import('./components/AdminBulkLoad').then(m => ({ default: m.AdminBulkLoad })));
const AdminBulkEdit        = React.lazy(() => import('./components/AdminBulkEdit').then(m => ({ default: m.AdminBulkEdit })));
const AdminClientList      = React.lazy(() => import('./components/AdminClientList').then(m => ({ default: m.AdminClientList })));
const AdminCoupons         = React.lazy(() => import('./components/AdminCoupons').then(m => ({ default: m.AdminCoupons })));
const AdminDashboard       = React.lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminProductList     = React.lazy(() => import('./components/AdminProductList').then(m => ({ default: m.AdminProductList })));
const AdminNewClient       = React.lazy(() => import('./components/AdminNewClient').then(m => ({ default: m.AdminNewClient })));
const AdminSalesManagement = React.lazy(() => import('./components/AdminSalesManagement').then(m => ({ default: m.AdminSalesManagement })));
const AdminTechManagement  = React.lazy(() => import('./components/AdminTechManagement').then(m => ({ default: m.AdminTechManagement })));
const AdminBulkImportSAT   = React.lazy(() => import('./components/AdminBulkImportSAT').then(m => ({ default: m.AdminBulkImportSAT })));
const AdminEmpresasView    = React.lazy(() => import('./components/AdminEmpresasView').then(m => ({ default: m.AdminEmpresasView })));
const VentasView           = React.lazy(() => import('./components/VentasView').then(m => ({ default: m.VentasView })));
const ComprasView          = React.lazy(() => import('./components/ComprasView').then(m => ({ default: m.ComprasView })));
const StockView            = React.lazy(() => import('./components/StockView').then(m => ({ default: m.StockView })));
const MaterialesView       = React.lazy(() => import('./components/MaterialesView').then(m => ({ default: m.MaterialesView })));
const LibroFacturasView    = React.lazy(() => import('./components/LibroFacturasView').then(m => ({ default: m.LibroFacturasView })));
const ContabilidadView         = React.lazy(() => import('./components/ContabilidadView').then(m => ({ default: m.ContabilidadView })));
const FacturacionRecurrenteView = React.lazy(() => import('./components/FacturacionRecurrenteView').then(m => ({ default: m.FacturacionRecurrenteView })));
const RRHHView        = React.lazy(() => import('./components/RRHHView'));
const BIAnalyticsView = React.lazy(() => import('./components/BIAnalyticsView'));
const RemesasSEPAView = React.lazy(() => import('./components/RemesasSEPAView'));
const GastosView      = React.lazy(() => import('./components/GastosView'));
const AdminProductEditModal = React.lazy(() => import('./components/AdminProductEditModal').then(m => ({ default: m.AdminProductEditModal })));

// Lazy-loaded: SAT / Técnico
const MachinesPanel    = React.lazy(() => import('./components/MachinesPanel').then(m => ({ default: m.MachinesPanel })));
const WorkOrderList    = React.lazy(() => import('./components/WorkOrderList').then(m => ({ default: m.WorkOrderList })));
const WorkOrderDetail  = React.lazy(() => import('./components/WorkOrderDetail').then(m => ({ default: m.WorkOrderDetail })));
const NewWorkOrderModal = React.lazy(() => import('./components/NewWorkOrderModal').then(m => ({ default: m.NewWorkOrderModal })));
const SATPartsList     = React.lazy(() => import('./components/SATPartsList').then(m => ({ default: m.SATPartsList })));
const SATPartDetail    = React.lazy(() => import('./components/SATPartDetail').then(m => ({ default: m.SATPartDetail })));
const NewSATPartModal  = React.lazy(() => import('./components/NewSATPartModal').then(m => ({ default: m.NewSATPartModal })));
const IncidentList     = React.lazy(() => import('./components/IncidentList').then(m => ({ default: m.IncidentList })));
const IncidentDetail   = React.lazy(() => import('./components/IncidentDetail').then(m => ({ default: m.IncidentDetail })));
const NewIncidentModal = React.lazy(() => import('./components/NewIncidentModal').then(m => ({ default: m.NewIncidentModal })));
const SalesDashboard        = React.lazy(() => import('./components/SalesDashboard').then(m => ({ default: m.SalesDashboard })));
const SalesDirectorDashboard = React.lazy(() => import('./components/SalesDirectorDashboard').then(m => ({ default: m.SalesDirectorDashboard })));
const SatDashboard          = React.lazy(() => import('./components/SatDashboard').then(m => ({ default: m.SatDashboard })));
const TechLeadDashboard     = React.lazy(() => import('./components/TechLeadDashboard').then(m => ({ default: m.TechLeadDashboard })));

// Lazy-loaded: CRM / Gastos
const CRMView      = React.lazy(() => import('./components/CRMView').then(m => ({ default: m.CRMView })));
const ExpensesView = React.lazy(() => import('./components/ExpensesView').then(m => ({ default: m.ExpensesView })));
const NewVisitModal = React.lazy(() => import('./components/NewVisitModal').then(m => ({ default: m.NewVisitModal })));
const NewCallModal  = React.lazy(() => import('./components/NewCallModal').then(m => ({ default: m.NewCallModal })));

// Lazy-loaded: Riesgo de Crédito (PASO 14)
const RiesgoClienteView = React.lazy(() => import('./components/RiesgoClienteView'));

// Lazy-loaded: Centro 360° Cliente (PASO 16)
const ClienteInfo360View = React.lazy(() => import('./components/ClienteInfo360View').then(m => ({ default: m.ClienteInfo360View })));

// Lazy-loaded: Impresos Fiscales (PASO 15)
const ImpresosFiscalesView = React.lazy(() => import('./components/ImpresosFiscalesView').then(m => ({ default: m.ImpresosFiscalesView })));

// Lazy-loaded: Conciliación Bancaria (PASO 17)
const ConciliacionBancariaView = React.lazy(() => import('./components/ConciliacionBancariaView').then(m => ({ default: m.ConciliacionBancariaView })));

// Lazy-loaded: Libros Oficiales (PASO 18)
const LibrosOficialesView = React.lazy(() => import('./components/LibrosOficialesView').then(m => ({ default: m.LibrosOficialesView })));

// Lazy-loaded: Agenda & Calendario (PASO 20)
const AgendaView = React.lazy(() => import('./components/AgendaView').then(m => ({ default: m.AgendaView })));

// PASO 19 — UX SAGE-like
import { GlobalSearch, useGlobalSearch } from './components/GlobalSearch';
import { Breadcrumb } from './components/Breadcrumb';

import {
    SALES_REPS, SALES_REPS_PHONES, SALES_REPS_EMAILS, INITIAL_PRODUCTS
} from './constants';
import { Product, CartItem, User, Order } from './types';
import { isVinyl, isLaminate, comparePassword, hashPassword } from './lib/utils';
import { orderService } from './services/orderService';
import { useSupabaseData } from './hooks/useSupabaseData';
import { useCart } from './hooks/useCart';
import { useAuth } from './hooks/useAuth';
import { useEmpresaData } from './hooks/useEmpresaData';

import {
    Menu, LogOut, X, ShoppingCart
} from 'lucide-react';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

export default function App() {
    const {
        products, users, setUsers, promoCoupons, setPromoCoupons, refreshData, loading, loadError
    } = useSupabaseData();
    const { currentUser, setCurrentUser, login, logout, updateCurrentUser } = useAuth();
    const { cart, setCart, addToCart, updateQuantity, clearCart, syncCartPrices } = useCart(currentUser);
    const { almacenes, empresas } = useEmpresaData();
    const { toast } = useToast();

    const [currentView, setCurrentView] = useState('login');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default');
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch();
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
    const [selectedClientForOrder, setSelectedClientForOrder] = useState<User | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState<any>(null);
    const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);
    const [selectedWorkOrder, setSelectedWorkOrder] = useState<any>(null);
    const [showNewWorkOrderModal, setShowNewWorkOrderModal] = useState(false);
    const [woPreselect, setWoPreselect] = useState<{ clientId?: string; machineId?: string; incidentId?: string }>({});
    const [selectedPart, setSelectedPart] = useState<any>(null);
    const [showNewPartModal, setShowNewPartModal] = useState(false);

    // CRM state
    const [showNewVisitModal, setShowNewVisitModal] = useState(false);
    const [showNewCallModal, setShowNewCallModal] = useState(false);
    const [crmPreselectedClient, setCrmPreselectedClient] = useState<string | undefined>(undefined);

    // CRM hook (only for sales reps). Director (no own clients) loads all activity.
    const crmIsDirector = currentUser?.role === 'sales' &&
        !users.some(u => u.role === 'client' && (u.salesRep === currentUser.name || (currentUser.salesRepCode && u.salesRepCode === currentUser.salesRepCode)));
    const { visits, calls, loading: crmLoading, load: loadCRM, createVisit, createCall, deleteVisit, deleteCall } = useCRM({
        salesRepId: currentUser?.role === 'sales' ? currentUser.id : undefined,
        loadAll: crmIsDirector,
    });

    // Expenses hook (for sales, tech, tech_lead)
    // (ExpensesView self-manages its load; hook is used only for CRM view's reload trigger)

    // SAT incidents
    const { incidents, loading: incidentsLoading, load: loadIncidents, createIncident } = useIncidents({
        technicianId: currentUser?.role === 'tech' ? currentUser.id : undefined,
        autoLoad: false,
    });
    // SAT work orders
    const { workOrders, loading: workOrdersLoading, load: loadWorkOrders, createWorkOrder, updateWorkOrder } = useWorkOrders({
        technicianId: currentUser?.role === 'tech' ? currentUser.id : undefined,
    });
    // Unified SAT parts
    const { parts: satParts, loading: satPartsLoading, load: loadSatParts, createPart, updatePart } = useSATParts({
        technicianId: currentUser?.role === 'tech' ? currentUser.id : undefined,
        clientId: currentUser?.role === 'client' ? currentUser.id : undefined,
    });

    // Sync cart prices when a sales rep selects a different client
    useEffect(() => {
        if (currentUser?.role === 'sales' && selectedClientForOrder) {
            syncCartPrices(selectedClientForOrder);
        } else if (currentUser?.role === 'sales' && !selectedClientForOrder) {
            syncCartPrices(currentUser);
        }
    }, [selectedClientForOrder?.id]);

    const [orders, setOrders] = useState<Order[]>([]);

    // Helper states from original logic
    // For sales reps, use the selected client's salesRep; for clients, use their own
    const orderUser = (currentUser?.role === 'sales' && selectedClientForOrder) ? selectedClientForOrder : currentUser;
    const activeRep = orderUser?.salesRep || (currentUser?.role === 'sales' ? currentUser?.name : null);
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

    const loadUserOrders = async (user: User, allUsers: User[]) => {
        try {
            if (user.role === 'client') {
                const userOrders = await orderService.getUserOrders(user.id);
                setOrders(userOrders);
            } else if (user.role === 'sales') {
                // Efficient: pass clientIds directly — DB filters, not JS
                const myClientIds = allUsers
                    .filter(u => u.role === 'client' && (u.salesRep === user.name || u.salesRepCode === user.salesRepCode))
                    .map(u => u.id);
                const repOrders = myClientIds.length > 0
                    ? await orderService.getUserOrders(undefined, myClientIds)
                    : [];
                setOrders(repOrders);
            } else {
                // Admin: load all orders
                const allOrders = await orderService.getUserOrders();
                setOrders(allOrders);
            }
        } catch (error) {
            console.error('Error loading user orders:', error);
        }
    };

    useEffect(() => {
        if (currentUser) {
            if (currentView === 'login') {
                setCurrentView(
                    currentUser.role === 'admin' ? 'admin_dashboard'
                        : currentUser.role === 'tech_lead' ? 'tech_lead_dashboard'
                        : currentUser.role === 'tech' ? 'sat_dashboard'
                        : currentUser.role === 'sales' && currentUser.username === 'corcoles' ? 'dashboard'
                        : currentUser.role === 'sales' ? 'crm'
                        : 'dashboard'
                );
            }
            loadUserOrders(currentUser, users);
        } else {
            setOrders([]);
        }
    }, [currentUser]);

    // Import products from Tarifa Online via hash parameter
    useEffect(() => {
        if (!currentUser || products.length === 0) return;
        const hash = window.location.hash;
        if (!hash.startsWith('#import=')) return;

        try {
            const encodedData = hash.substring('#import='.length);
            const jsonStr = decodeURIComponent(escape(atob(encodedData)));
            const importedItems: Array<{ name: string; price: number; category?: string; cat?: string; quantity?: number }> = JSON.parse(jsonStr);

            if (!Array.isArray(importedItems) || importedItems.length === 0) return;

            // Match imported items to ERP products by name (fuzzy: case-insensitive trim)
            for (const item of importedItems) {
                const match = products.find(p =>
                    p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                );
                if (match) {
                    addToCart(match, item.quantity || 1);
                } else {
                    // If no exact match, create an ad-hoc cart entry from tarifa data
                    const adHocProduct: any = {
                        id: `tarifa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                        name: item.name,
                        reference: '',
                        category: item.category || item.cat || 'otros',
                        price: item.price,
                        unit: 'ud',
                        inStock: true,
                    };
                    addToCart(adHocProduct, item.quantity || 1);
                }
            }

            // Clean the hash and navigate to cart
            window.location.hash = '';
            setCurrentView('cart');
            toast(`${importedItems.length} producto(s) importados desde la Tarifa`, 'success');
        } catch (e) {
            console.error('Error importing tarifa data:', e);
        }
    }, [currentUser, products.length]);

    // Load CRM data when entering the crm view (or on login for sales)
    useEffect(() => {
        if (currentUser?.role === 'sales' && (currentView === 'crm' || currentView === 'login')) {
            loadCRM();
        }
    }, [currentView, currentUser?.id]);

    // Load incidents when entering SAT incident views
    useEffect(() => {
        if (currentView === 'sat_incidents' || currentView === 'sat_new_incident') {
            loadIncidents();
        }
        if (!currentView.startsWith('sat_incident')) {
            setSelectedIncident(null);
        }
        // Reset unified parts selection when leaving/entering sat_parts
        if (currentView !== 'sat_parts') {
            setSelectedPart(null);
        }
    }, [currentView]);

    const handleLogin = async (u: string, p: string) => {
        const candidate = users.find(user => user.username?.toLowerCase() === u.toLowerCase().trim());
        if (candidate && candidate.password) {
            const ok = await comparePassword(p, candidate.password);
            if (ok) {
                login(candidate);
                setLoginError('');
                return;
            }
        }
        setLoginError('Credenciales incorrectas');
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
            toast('Cupón no válido o inactivo', 'error');
        }
    };

    const handleFinalizeOrder = async () => {
        if (!currentUser) return;
        // Sales rep must select a client
        if (currentUser.role === 'sales' && !selectedClientForOrder) {
            toast('Debes seleccionar un cliente para asignar el pedido antes de confirmar.', 'error');
            return;
        }
        const effectiveUser = (currentUser.role === 'sales' && selectedClientForOrder) ? selectedClientForOrder : currentUser;
        setIsFinalizing(true);
        try {
            const results = await orderService.finalizeOrder({
                currentUser: effectiveUser, cart, finalTotal, activeRep, activeRepPhone, observations,
                shippingMethod, useAccumulatedRappel, rappelDiscount, appliedCoupon,
                newRappelGenerated,
                subtotal: subtotalAfterDiscount,
                tax,
                shippingCost,
                discountAmount
            });

            const newOrder: Order = {
                id: results.order.id,
                orderNumber: results.orderNumber,
                userId: effectiveUser.id,
                date: new Date().toISOString(),
                items: [...cart],
                total: finalTotal,
                status: 'tramitado',
                shippingMethod,
                salesRep: activeRep || undefined,
                rappelDiscount,
                couponDiscount: discountAmount
            };

            setLastOrder(newOrder);
            setOrders(prev => [...prev, newOrder]);
            updateCurrentUser({ rappelAccumulated: results.newRappelTotal });
            clearCart();
            setSelectedClientForOrder(null);
            setCurrentView('order_success');
        } catch (error: any) {
            toast('Error al confirmar el pedido: ' + error.message, 'error');
        } finally {
            setIsFinalizing(false);
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
                // Match laminates by brand (width no longer stored for flexible products)
                const isMatchingLaminate = p.category === 'flexible' && isLaminate(p) && (v.brand ? p.brand === v.brand : true);
                if (!isMatchingLaminate) return false;

                // Allow only laminates with similar price (+/- 0.40€/m2)
                const pPrice = p.pricePerM2 ?? 0;
                if (vPrice === 0) return true;
                return Math.abs(pPrice - vPrice) <= 0.40;
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
                    username: updatedClient.username,
                    email: updatedClient.email,
                    phone: updatedClient.phone,
                    sales_rep: updatedClient.salesRep,
                    zone: updatedClient.zone,
                    rappel_threshold: updatedClient.rappelThreshold,
                    hide_prices: updatedClient.hidePrices,
                    is_active: updatedClient.isActive,
                    must_change_password: updatedClient.mustChangePassword,
                    hidden_categories: updatedClient.hiddenCategories || [],
                    custom_prices: updatedClient.customPrices || {},
                    password: updatedClient.password // Added to allow password updates
                })
                .eq('id', updatedClient.id);

            if (error) throw error;
            await refreshData();
        } catch (error: any) {
            toast('Error al guardar cliente: ' + error.message, 'error');
        }
    };

    const handleSaveProfile = async (updates: Partial<User>) => {
        if (!currentUser) return;
        try {
            const { error } = await supabase
                .from('clients')
                .update({
                    company_name: updates.name,
                    email: updates.email,
                    phone: updates.phone,
                    zone: updates.zone,
                    password: updates.password ? await hashPassword(updates.password) : undefined
                })
                .eq('id', currentUser.id);

            if (error) throw error;

            // Update local auth state
            updateCurrentUser(updates);

            // Refresh global users list
            await refreshData();
            toast('Perfil actualizado correctamente', 'success');
        } catch (error: any) {
            toast('Error al actualizar el perfil: ' + error.message, 'error');
            throw error;
        }
    };

    const handleDeleteClient = async (clientId: string) => {
        try {
            // 1. incident_comments — get this client's incident IDs first
            const { data: clientIncidents } = await supabase.from('incidents').select('id').eq('client_id', clientId);
            const incidentIds = (clientIncidents || []).map((i: any) => i.id);
            if (incidentIds.length > 0) {
                await supabase.from('incident_comments').delete().in('incident_id', incidentIds);
            }

            // 2. maintenance_contracts — get this client's machine IDs first
            const { data: clientMachines } = await supabase.from('machines').select('id').eq('client_id', clientId);
            const machineIds = (clientMachines || []).map((m: any) => m.id);
            if (machineIds.length > 0) {
                await supabase.from('maintenance_contracts').delete().in('machine_id', machineIds);
            }

            // 3. work_orders, incidents, machines
            await supabase.from('work_orders').delete().eq('client_id', clientId);
            await supabase.from('incidents').delete().eq('client_id', clientId);
            await supabase.from('machines').delete().eq('client_id', clientId);

            // 4. order_lines — get this client's order IDs first
            const { data: clientOrders } = await supabase.from('orders').select('id').eq('client_id', clientId);
            const orderIds = (clientOrders || []).map((o: any) => o.id);
            if (orderIds.length > 0) {
                await supabase.from('order_lines').delete().in('order_id', orderIds);
            }
            await supabase.from('orders').delete().eq('client_id', clientId);

            // 5. Delete client (client_visits + client_calls have ON DELETE CASCADE)
            const { error } = await supabase.from('clients').delete().eq('id', clientId);
            if (error) throw error;
            await refreshData();
        } catch (error: any) {
            toast('Error al eliminar cliente: ' + error.message, 'error');
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
                zone: clientData.zone,
                rappel_threshold: clientData.rappelThreshold,
                hide_prices: clientData.hidePrices,
                hidden_categories: clientData.hiddenCategories || [],
                custom_prices: clientData.customPrices || {},
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
            toast('Error al crear cupón: ' + error.message, 'error');
        }
    };

    const handleUpdateCoupon = async (code: string, updates: any) => {
        try {
            const { error } = await supabase.from('coupons').update(updates).eq('code', code);
            if (error) throw error;
            await refreshData();
        } catch (error: any) {
            toast('Error al actualizar cupón: ' + error.message, 'error');
        }
    };

    const handleDeleteCoupon = async (code: string) => {
        try {
            const { error } = await supabase.from('coupons').delete().eq('code', code);
            if (error) throw error;
            await refreshData();
        } catch (error: any) {
            toast('Error al eliminar cupón: ' + error.message, 'error');
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
        width: p.widthOptions?.[0] ?? p.width,
        width_options: p.widthOptions ?? null,
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
            setEditingProduct(null);
            toast('Producto actualizado correctamente', 'success');
        } catch (error: any) {
            toast('Error al actualizar producto: ' + error.message, 'error');
            throw error; // Re-throw so modal can catch it and stay open
        }
    };

    const handleDeleteProduct = async (productId: string) => {
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);
            if (error) throw error;
            await refreshData();
        } catch (error: any) {
            toast('Error al eliminar producto: ' + error.message, 'error');
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
            toast('Error en carga masiva: ' + error.message, 'error');
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
            toast('Error en edición masiva: ' + error.message, 'error');
        }
    };

    const renderContent = () => {
        if (currentView === 'crm' && currentUser?.role === 'sales') {
            return (
                <>
                    <CRMView
                        currentUser={currentUser}
                        clients={users}
                        visits={visits}
                        calls={calls}
                        loading={crmLoading}
                        onRefresh={loadCRM}
                        onNewVisit={(clientId) => { setCrmPreselectedClient(clientId); setShowNewVisitModal(true); }}
                        onNewCall={(clientId) => { setCrmPreselectedClient(clientId); setShowNewCallModal(true); }}
                        onDeleteVisit={deleteVisit}
                        onDeleteCall={deleteCall}
                        orders={orders}
                        formatCurrency={formatCurrency}
                    />
                    {showNewVisitModal && (
                        <NewVisitModal
                            clients={users}
                            currentUser={currentUser}
                            preselectedClientId={crmPreselectedClient}
                            onClose={() => setShowNewVisitModal(false)}
                            onSave={async (data) => {
                                await createVisit(data);
                                setShowNewVisitModal(false);
                                toast('Visita registrada', 'success');
                            }}
                        />
                    )}
                    {showNewCallModal && (
                        <NewCallModal
                            clients={users}
                            currentUser={currentUser}
                            preselectedClientId={crmPreselectedClient}
                            onClose={() => setShowNewCallModal(false)}
                            onSave={async (data) => {
                                await createCall(data);
                                setShowNewCallModal(false);
                                toast('Llamada registrada', 'success');
                            }}
                        />
                    )}
                </>
            );
        }
        if (currentView === 'crm') return <div className="p-10 text-slate-400">Acceso restringido a comerciales.</div>;

        if (currentView === 'expenses' && currentUser) {
            return (
                <ExpensesView
                    currentUser={currentUser}
                    formatCurrency={formatCurrency}
                />
            );
        }

        if (currentView === 'dashboard' && currentUser) {
            if (currentUser.role === 'sales') {
                if (currentUser.username === 'corcoles') {
                    const salesReps = users.filter(u => u.role === 'sales');
                    return <SalesDirectorDashboard salesReps={salesReps} clients={users} orders={orders} formatCurrency={formatCurrency} />;
                }
                return <SalesDashboard currentUser={currentUser} clients={users} orders={orders} onNavigate={setCurrentView} formatCurrency={formatCurrency} />;
            }
            return <DashboardView currentUser={currentUser} onNewOrder={() => setCurrentView('cat_flexible_vinilos')} formatCurrency={formatCurrency} />;
        }
        if (currentView === 'sat_dashboard' && currentUser) {
            return <SatDashboard currentUser={currentUser} onNavigate={setCurrentView} />;
        }
        if (currentView === 'tech_lead_dashboard' && currentUser) {
            const technicians = users.filter(u => u.role === 'tech' || u.role === 'tech_lead');
            return <TechLeadDashboard currentUser={currentUser} technicians={technicians} onNavigate={setCurrentView} />;
        }
        if ((currentView === 'sat_incidents' || currentView === 'sat_new_incident') && currentUser) {
            const technicians = users.filter(u => u.role === 'tech' || u.role === 'tech_lead');
            if (selectedIncident) {
                return (
                    <IncidentDetail
                        incident={selectedIncident}
                        currentUser={currentUser}
                        technicians={technicians}
                        onBack={() => setSelectedIncident(null)}
                        onRefresh={() => { loadIncidents(); setSelectedIncident(null); }}
                        onNewWorkOrder={(incId) => {
                            setWoPreselect({ clientId: selectedIncident.clientId, incidentId: incId });
                            setShowNewWorkOrderModal(true);
                            setCurrentView('sat_work_orders');
                        }}
                    />
                );
            }
            return (
                <>
                    <IncidentList
                        incidents={incidents}
                        loading={incidentsLoading}
                        currentUser={currentUser}
                        technicians={technicians}
                        clients={users}
                        onRefresh={loadIncidents}
                        onNewIncident={() => setShowNewIncidentModal(true)}
                        onViewIncident={setSelectedIncident}
                    />
                    {showNewIncidentModal && (
                        <NewIncidentModal
                            clients={users}
                            technicians={technicians}
                            currentUser={currentUser}
                            onClose={() => setShowNewIncidentModal(false)}
                            onSave={async (data) => {
                                await createIncident(data);
                                setShowNewIncidentModal(false);
                                toast('Incidencia creada correctamente', 'success');
                            }}
                        />
                    )}
                </>
            );
        }
        if ((currentView === 'sat_work_orders' || currentView === 'sat_new_work_order') && currentUser) {
            const technicians = users.filter(u => u.role === 'tech' || u.role === 'tech_lead');
            const machines = [] as any[]; // loaded inside WorkOrderDetail from useMachines lazily
            if (selectedWorkOrder) {
                return (
                    <WorkOrderDetail
                        workOrder={selectedWorkOrder}
                        currentUser={currentUser}
                        technicians={technicians}
                        machines={[]}  // loaded inside component
                        onBack={() => setSelectedWorkOrder(null)}
                        onSave={async (id, updates) => {
                            await updateWorkOrder(id, updates);
                            await loadWorkOrders();
                            setSelectedWorkOrder(null);
                        }}
                    />
                );
            }
            return (
                <>
                    <WorkOrderList
                        workOrders={workOrders}
                        loading={workOrdersLoading}
                        currentUser={currentUser}
                        technicians={technicians}
                        onRefresh={loadWorkOrders}
                        onNewWorkOrder={() => { setWoPreselect({}); setShowNewWorkOrderModal(true); }}
                        onViewWorkOrder={setSelectedWorkOrder}
                    />
                    {showNewWorkOrderModal && (
                        <NewWorkOrderModal
                            clients={users}
                            technicians={technicians}
                            currentUser={currentUser}
                            preselectedClientId={woPreselect.clientId}
                            preselectedMachineId={woPreselect.machineId}
                            preselectedIncidentId={woPreselect.incidentId}
                            onClose={() => setShowNewWorkOrderModal(false)}
                            onSave={async (data) => {
                                await createWorkOrder(data);
                                setShowNewWorkOrderModal(false);
                                toast('Parte de trabajo creado', 'success');
                                loadWorkOrders();
                            }}
                        />
                    )}
                </>
            );
        }
        if (currentView === 'sat_parts' && currentUser) {
            const technicians = users.filter(u => u.role === 'tech' || u.role === 'tech_lead');
            if (selectedPart) {
                return (
                    <SATPartDetail
                        part={selectedPart}
                        currentUser={currentUser}
                        technicians={technicians}
                        clients={users}
                        onBack={() => setSelectedPart(null)}
                        onSave={async (id, updates) => { await updatePart(id, updates); await loadSatParts(); }}
                        onRefresh={() => { loadSatParts(); setSelectedPart(null); }}
                    />
                );
            }
            return (
                <>
                    <SATPartsList
                        parts={satParts}
                        loading={satPartsLoading}
                        currentUser={currentUser}
                        technicians={technicians}
                        onRefresh={loadSatParts}
                        onNewPart={() => setShowNewPartModal(true)}
                        onViewPart={p => { setSelectedPart(p); loadSatParts(); }}
                    />
                    {showNewPartModal && (
                        <NewSATPartModal
                            clients={users}
                            technicians={technicians}
                            currentUser={currentUser}
                            onClose={() => setShowNewPartModal(false)}
                            onSave={async (data) => {
                                await createPart(data);
                                setShowNewPartModal(false);
                                toast('Parte creado correctamente', 'success');
                                loadSatParts();
                            }}
                        />
                    )}
                </>
            );
        }
        if (currentView.startsWith('cat_')) return <ProductListView products={products} cart={cart} currentView={currentView} searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} sortOrder={sortOrder} onSortOrderChange={setSortOrder} onAddToCart={addToCart} onUpdateQuantity={updateQuantity} onEditProduct={setEditingProduct} isAdmin={currentUser?.role === 'admin'} formatCurrency={formatCurrency} />;
        if (currentView === 'cart' && currentUser) {
            const isSalesRep = currentUser.role === 'sales';
            const assignedClients = isSalesRep
                ? users.filter(u => u.role === 'client' && (u.salesRep === currentUser.name || u.salesRepCode === currentUser.salesRepCode))
                : [];
            return <CheckoutView currentUser={selectedClientForOrder || currentUser} cart={cart} onContinueShopping={() => setCurrentView('cat_flexible_vinilos')} onUpdateQuantity={updateQuantity} onAddToCart={addToCart} formatCurrency={formatCurrency} couponCode={couponCode} onCouponCodeChange={setCouponCode} appliedCoupon={appliedCoupon} onApplyCoupon={handleApplyCoupon} onRemoveCoupon={() => setAppliedCoupon(null)} activeRep={activeRep} activeRepPhone={activeRepPhone} totalWeight={totalWeight} shippingMethod={shippingMethod} onShippingMethodChange={setShippingMethod} agencyCost={agencyCost} observations={observations} onObservationsChange={setObservations} useAccumulatedRappel={useAccumulatedRappel} onUseAccumulatedRappelChange={setUseAccumulatedRappel} rappelDiscount={rappelDiscount} cartTotal={cartTotal} shippingCost={shippingCost} tax={tax} finalTotal={finalTotal} newRappelGenerated={newRappelGenerated} onFinalizeOrder={handleFinalizeOrder} isSalesRep={isSalesRep} assignedClients={assignedClients} selectedClient={selectedClientForOrder} onSelectClient={setSelectedClientForOrder} isFinalizing={isFinalizing} />;
        }
        if (currentView === 'order_success') return <OrderSuccessView order={lastOrder} observations={observations} formatCurrency={formatCurrency} onReset={() => setCurrentView('dashboard')} userEmail={currentUser?.email || ''} salesRepPhone={activeRepPhone} />;
        if (currentView === 'client_orders') return <ClientOrdersView currentUser={currentUser!} orders={orders} formatCurrency={formatCurrency} allUsers={users} />;
        if (currentView === 'admin_dashboard') return <AdminDashboard onNavigate={setCurrentView} />;
        if (currentView === 'admin_products') return <AdminProductList products={products} searchQuery={searchQuery} onSearchChange={setSearchQuery} editingProduct={editingProduct} onEditClick={setEditingProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} onCancelEdit={() => setEditingProduct(null)} onEditingProductChange={setEditingProduct} onBack={() => setCurrentView('admin_dashboard')} formatCurrency={formatCurrency} />;
        if (currentView === 'admin_load') return <AdminBulkLoad onSave={handleSaveBulkProducts} currentProducts={products} />;
        if (currentView === 'admin_bulk_edit') return <AdminBulkEdit products={products} onSave={handleBulkEditProducts} onBack={() => setCurrentView('admin_dashboard')} />;
        if (currentView === 'admin_client_list') {
            const salesReps = users.filter(u => u.role === 'sales');
            // For sales reps with their own clients, pre-filter; directors/admins start unfiltered
            const hasOwnClients = currentUser?.role === 'sales' && users.some(u =>
                u.role === 'client' && (u.salesRep === currentUser.name || (currentUser.salesRepCode && u.salesRepCode === currentUser.salesRepCode))
            );
            const initialSalesRepFilter = hasOwnClients ? currentUser!.name : '';
            return <div className="p-4 md:p-10 max-w-7xl mx-auto"><AdminClientList clients={users} orders={orders} products={products} onEditClient={() => { }} onSaveClient={handleSaveClient} onDeleteClient={currentUser?.role === 'admin' ? handleDeleteClient : undefined} formatCurrency={formatCurrency} isAdmin={currentUser?.role === 'admin'} salesRepsData={salesReps} initialSalesRepFilter={initialSalesRepFilter} /></div>;
        }
        if (currentView === 'admin_new_client') {
            const salesReps = users.filter(u => u.role === 'sales');
            return <AdminNewClient onSave={handleCreateClient} onBack={() => setCurrentView(currentUser?.role === 'sales' ? 'dashboard' : 'admin_dashboard')} isAdmin={currentUser?.role === 'admin'} salesReps={salesReps} products={products} />;
        }
        if (currentView === 'admin_coupons') return <div className="p-4 md:p-10 max-w-7xl mx-auto"><AdminCoupons coupons={promoCoupons} onAddCoupon={handleAddCoupon} onUpdateCoupon={handleUpdateCoupon} onDeleteCoupon={handleDeleteCoupon} /></div>;
        if (currentView === 'admin_sales_management') return <AdminSalesManagement salesReps={users.filter(u => u.role === 'sales')} clients={users} orders={orders} onRefresh={refreshData} formatCurrency={formatCurrency} />;
        if (currentView === 'admin_tech_management') return <AdminTechManagement technicians={users.filter(u => u.role === 'tech' || u.role === 'tech_lead')} onRefresh={refreshData} />;
        if (currentView === 'admin_bulk_import_sat' && currentUser?.role === 'admin') return <AdminBulkImportSAT />;
        if (currentView === 'admin_empresa' && ['admin', 'administracion', 'direccion'].includes(currentUser?.role || '')) return <AdminEmpresasView />;
        if (currentView === 'cliente_360'
            && ['admin', 'sales', 'sales_lead', 'administracion', 'direccion'].includes(currentUser?.role || '')
            && currentUser) {
          const empresaId = empresas[0]?.id ?? '';
          return (
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              <ClienteInfo360View
                empresaId={empresaId}
                clients={users}
                currentUserRole={currentUser.role}
              />
            </div>
          );
        }
        if (currentView === 'riesgo_credito'
            && ['admin', 'administracion', 'direccion'].includes(currentUser?.role || '')
            && currentUser) {
          const empresaId = empresas[0]?.id ?? '';
          return (
            <div className="flex-1 overflow-auto h-full">
              <RiesgoClienteView
                empresaId={empresaId}
                currentUserId={currentUser.id}
                currentUserRole={currentUser.role}
              />
            </div>
          );
        }
        if (['ventas','ventas_presupuestos','ventas_pedidos','ventas_albaranes','ventas_facturas'].includes(currentView)
            && ['admin','sales','administracion','direccion'].includes(currentUser?.role || '')) {
          return (
            <div className="flex-1 flex flex-col overflow-hidden p-4">
              <VentasView
                currentUser={currentUser}
                clientes={users}
                productos={products}
              />
            </div>
          );
        }
        if (currentView === 'libro_facturas'
            && ['admin','administracion','direccion'].includes(currentUser?.role || '')) {
          return (
            <div className="flex-1 overflow-auto">
              <LibroFacturasView currentUser={currentUser} />
            </div>
          );
        }
        if (currentView === 'contabilidad'
            && ['admin','administracion','direccion'].includes(currentUser?.role || '')) {
          return (
            <div className="flex-1 overflow-auto">
              <ContabilidadView currentUser={currentUser} />
            </div>
          );
        }
        if (currentView === 'impresos_fiscales'
            && ['admin','administracion','direccion'].includes(currentUser?.role || '')) {
          const empresaId = empresas[0]?.id ?? '';
          return (
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              <ImpresosFiscalesView empresaId={empresaId} />
            </div>
          );
        }
        if (currentView === 'conciliacion_bancaria'
            && ['admin','administracion','direccion'].includes(currentUser?.role || '')) {
          const empresaId = empresas[0]?.id ?? '';
          return (
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              <ConciliacionBancariaView empresaId={empresaId} />
            </div>
          );
        }
        if (currentView === 'libros_oficiales'
            && ['admin','administracion','direccion'].includes(currentUser?.role || '')) {
          const empresaId = empresas[0]?.id ?? '';
          return (
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              <LibrosOficialesView empresaId={empresaId} />
            </div>
          );
        }
        if (currentView === 'facturacion_recurrente'
            && ['admin','administracion','direccion'].includes(currentUser?.role || '')) {
          return (
            <div className="flex-1 overflow-auto">
              <FacturacionRecurrenteView currentUser={currentUser} />
            </div>
          );
        }
        if (currentView === 'rrhh'
            && ['admin','administracion','direccion'].includes(currentUser?.role || '')) {
          return (
            <div className="flex-1 overflow-auto h-full">
              <RRHHView />
            </div>
          );
        }
        if (currentView === 'analisis_rentabilidad'
            && ['admin','administracion','direccion'].includes(currentUser?.role || '')) {
          return (
            <div className="flex-1 overflow-auto h-full">
              <BIAnalyticsView />
            </div>
          );
        }
        if (currentView === 'remesas_sepa'
            && ['admin','administracion','direccion'].includes(currentUser?.role || '')) {
          return (
            <div className="flex-1 overflow-auto h-full">
              <RemesasSEPAView />
            </div>
          );
        }
        if (currentView === 'gastos_empresa'
            && ['admin','administracion','direccion'].includes(currentUser?.role || '')) {
          return (
            <div className="flex-1 overflow-auto h-full">
              <GastosView />
            </div>
          );
        }
        if (['compras','compras_proveedores','compras_oc','compras_recepciones','compras_traspasos'].includes(currentView)
            && ['admin','compras','almacen','administracion','direccion'].includes(currentUser?.role || '')) {
          return (
            <div className="flex-1 overflow-auto">
              <ComprasView currentUser={currentUser} almacenes={almacenes} />
            </div>
          );
        }
        if (currentView === 'stock'
            && ['admin','compras','almacen','administracion','direccion'].includes(currentUser?.role || '')) {
          return (
            <div className="flex-1 overflow-auto">
              <StockView currentUser={currentUser} almacenes={almacenes} />
            </div>
          );
        }
        if (currentView === 'materiales'
            && ['admin','compras','almacen','administracion','direccion','sales_lead'].includes(currentUser?.role || '')) {
          return (
            <div className="flex-1 overflow-hidden">
              <MaterialesView productos={products} />
            </div>
          );
        }
        if (currentView === 'agenda'
            && ['admin','sales','sales_lead','tech','tech_lead','administracion','direccion','compras'].includes(currentUser?.role || '')) {
            return (
                <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /></div>}>
                    <AgendaView currentUser={currentUser!} />
                </Suspense>
            );
        }
        if (currentView === 'sat_machines' && currentUser) return (
            <MachinesPanel
                currentUser={currentUser}
                clients={users}
                onNewIncident={(machineId, clientId) => {
                    setShowNewIncidentModal(true);
                    setCurrentView('sat_incidents');
                }}
            />
        );
        return <div className="p-10">Vista no encontrada ({currentView})</div>;
    };

    if (currentView === 'login') return <LoginView onLogin={handleLogin} loginError={loginError} />;

    // Show error screen if Supabase data loading failed
    if (loadError) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-6">
                <img src="/logo.png" alt="DigitalMarket" className="h-12 w-auto opacity-70" />
                <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md w-full text-center shadow-sm">
                    <p className="text-red-600 font-bold text-base mb-2">Error de conexión</p>
                    <p className="text-slate-500 text-sm">{loadError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    // Show loading screen while Supabase data is being fetched
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <img src="/logo.png" alt="DigitalMarket" className="h-12 w-auto opacity-70" />
                <div className="flex items-center gap-3 text-slate-500">
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                    <span className="text-sm font-medium">Cargando datos...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            <Sidebar
                currentView={currentView}
                setCurrentView={setCurrentView}
                cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
                currentUser={currentUser!}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                onLogout={handleLogout}
                onProfileClick={() => setIsProfileModalOpen(true)}
            />
            <div className="flex-1 flex flex-col h-screen overflow-y-auto">
                {/* PASO 19 — Breadcrumb */}
                {currentView !== 'login' && (
                    <Breadcrumb
                        currentView={currentView}
                        onOpenSearch={() => setSearchOpen(true)}
                    />
                )}
                <header className="md:hidden flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 sticky top-0 z-30">
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
                <main className="flex-1">
                    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /></div>}>
                        {renderContent()}
                    </Suspense>
                </main>
            </div>
            {showLogoutModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold mb-4">Cerrar Sesión</h3>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => confirmLogout(false)} className="bg-green-600 text-white p-3 rounded font-bold">Guardar Carrito</button>
                            <button onClick={() => confirmLogout(true)} className="bg-red-600 text-white p-3 rounded font-bold">Vaciar Carrito</button>
                            <button onClick={() => setShowLogoutModal(false)} className="p-2">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
            <CrossSellModal isOpen={showPromoModal} onClose={() => setShowPromoModal(false)} promoEntries={promoEntries} onAcceptPromo={handleAcceptPromo} formatCurrency={formatCurrency} />
            {currentUser && (
                <ProfileEditModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    currentUser={currentUser}
                    onSaveProfile={handleSaveProfile}
                />
            )}
            {editingProduct && currentView.startsWith('cat_') && (
                <Suspense fallback={null}>
                    <AdminProductEditModal
                        product={editingProduct}
                        onSave={handleUpdateProduct}
                        onClose={() => setEditingProduct(null)}
                    />
                </Suspense>
            )}
            {/* PASO 19 — Global Search (Ctrl+K) */}
            {currentUser && (
                <GlobalSearch
                    open={searchOpen}
                    onClose={() => setSearchOpen(false)}
                    onNavigate={setCurrentView}
                    currentUserRole={currentUser.role}
                />
            )}
        </div>
    );
}
