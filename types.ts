export type ProductCategory = 'rigid' | 'flexible' | 'ink' | 'accessory' | 'display';

export interface Product {
  id: string;
  name: string;
  reference: string;
  category: ProductCategory;
  subcategory?: string; // Para filtros específicos (vinilos, pvc, etc.)
  price: number;
  unit: string;
  // Flexible specific
  isFlexible?: boolean;
  width?: number; // meters (canonical / first width)
  widthOptions?: number[]; // all available widths for this product
  length?: number; // meters
  pricePerM2?: number;
  // Ink specific
  volume?: string;
  inStock?: boolean;
  brand?: string;
  weight?: number; // Weight in kg
  description?: string; // Product description (for lona weight extraction, etc.)
  // Configurable Product Fields
  allowFinish?: boolean;
  allowBacking?: boolean;
  allowAdhesive?: boolean;
  finish?: 'gloss' | 'matte'; // Brillo/Mate
  backing?: 'white' | 'gray' | 'black'; // Blanca/Gris/Negra
  adhesive?: 'permanent' | 'removable'; // Permanente/Removible
  materialType?: 'monomeric' | 'polymeric' | 'cast' | 'frontlit' | 'backlit' | 'mesh' | 'blockout';
}

export interface CartItem extends Product {
  quantity: number;
  calculatedPrice: number;
  promoLinkedId?: string; // ID of the laminate linked to this vinyl in a promotion
  originalPricePerM2?: number; // Store original price to restore it if needed
}

export type UserRole =
  | 'admin'
  | 'client'
  | 'sales'
  | 'tech'
  | 'tech_lead'
  | 'compras'
  | 'almacen'
  | 'administracion'
  | 'direccion';

export interface User {
  name: string;
  id: string;
  email: string;
  role: UserRole;
  rappelAccumulated: number;
  rappelThreshold?: number;
  // Auth fields
  username?: string;
  password?: string;
  phone?: string;
  registrationDate?: string;
  // B2B Specifics
  salesRep?: string;
  delegation?: string;       // texto legacy (nombre de delegación)
  delegationId?: string;     // UUID FK → delegaciones.id
  zone?: string;             // For technicians: their assigned zone/area
  // Pricing
  hidePrices?: boolean;
  customPrices?: Record<string, number>;
  mustChangePassword?: boolean;
  isActive?: boolean;
  usedCoupons?: string[];
  salesRepCode?: string;
  hiddenCategories?: string[];
}

export interface SalesRep {
  code: string;
  name: string;
  phone: string;
}

export interface Order {
  id: string;
  orderNumber?: string; // Human-readable: DDMMYY-HHmmss-XXXX
  userId: string;
  date: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'tramitado';
  shippingMethod: 'agency' | 'own';
  salesRep?: string;
  rappelDiscount: number;
  couponDiscount: number;
}

export interface Coupon {
  id?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxUses: number;
  usesCount: number;
  isActive: boolean;
  createdAt: string;
  description?: string;
  expiresAt?: string;
}

// ─── SAT Module Types ─────────────────────────────────────────────────────────

export interface Machine {
  id: string;
  clientId: string;
  serialNumber: string;
  model: string;
  brand: string;
  installDate?: string;
  warrantyExpires?: string;
  status: 'active' | 'inactive' | 'decommissioned';
  notes?: string;
  createdAt?: string;
  imageUrl?: string;
  // Joined data
  clientName?: string;
  hasActiveContract?: boolean;
}

export interface MaintenanceContract {
  id: string;
  machineId: string;
  type: 'basic' | 'full' | 'premium';
  startDate: string;
  endDate: string;
  annualCost: number;
  active: boolean;
  notes?: string;
}

export type IncidentStatus = 'pending' | 'in_progress' | 'closed';
export type IncidentSeverity = 'low' | 'normal' | 'high' | 'urgent';

export interface Incident {
  id: string;
  reference: string; // INC00001
  clientId: string;
  machineId?: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  assignedTo?: string; // technician user id
  assignedToName?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  closedAt?: string;
  // Joined
  clientName?: string;
  machineName?: string;
}

export type WorkOrderStatus = 'pending' | 'in_progress' | 'closed';

export interface WorkOrder {
  id: string;
  reference: string; // PAR00001
  incidentId?: string;
  machineId?: string;
  clientId: string;
  technicianId?: string;
  technicianName?: string;
  scheduledDate?: string;
  startDate?: string;
  endDate?: string;
  status: WorkOrderStatus;
  diagnosis?: string;
  resolution?: string;
  hoursWorked?: number;
  materialsCost: number;
  laborCost: number;
  rappelDiscount: number;
  total: number;
  clientSignature?: string; // base64
  createdAt: string;
  // Joined
  clientName?: string;
  machineName?: string;
}

export interface SatCall {
  id: string;
  clientId: string;
  direction: 'inbound' | 'outbound';
  operatorId?: string;
  operatorName?: string;
  summary?: string;
  incidentId?: string;
  callDate: string;
}

export interface IncidentComment {
  id: string;
  incidentId: string;
  authorId: string;
  authorName?: string;
  body: string;
  createdAt: string;
}

// ─── CRM Module Types ─────────────────────────────────────────────────────────

export interface ClientVisit {
  id: string;
  clientId: string;
  clientName?: string;
  salesRepId: string;
  salesRepName?: string;
  visitDate: string;
  notes?: string;
  nextAction?: string;
  createdAt: string;
}

export interface ClientCall {
  id: string;
  clientId: string;
  clientName?: string;
  salesRepId: string;
  salesRepName?: string;
  callDate: string;
  direction: 'outbound' | 'inbound';
  summary?: string;
  createdAt: string;
}

// ─── Expenses Module Types ────────────────────────────────────────────────────

export type ExpenseType = 'restaurant' | 'km' | 'hotel' | 'other';

export interface Expense {
  id: string;
  userId: string;
  userRole: 'sales' | 'tech' | 'tech_lead' | 'admin';
  expenseDate: string;
  type: ExpenseType;
  description?: string;
  amount: number;
  km?: number;
  kmRate?: number;
  ticketImageUrl?: string;
  createdAt: string;
}

export interface ExpenseMonthlyReport {
  month: number;
  year: number;
  totalAmount: number;
  totalKm: number;
  totalKmAmount: number;
  byType: Record<ExpenseType, { count: number; amount: number; km?: number }>;
  expenses: Expense[];
}

// ─── Estructura Base Digital Market ───────────────────────────────────────────

export interface Empresa {
  id: string;
  nombre: string;
  razonSocial: string;
  cif: string;
  direccion?: string;
  cp?: string;
  ciudad?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  web?: string;
  iban?: string;
  logoUrl?: string;
  activa: boolean;
  createdAt?: string;
}

export interface Delegacion {
  id: string;
  empresaId: string;
  nombre: string;
  codigo: string;       // MU / VA / MA / SE
  ciudad?: string;
  provincia?: string;
  direccion?: string;
  cp?: string;
  telefono?: string;
  email?: string;
  activa: boolean;
  createdAt?: string;
  // Joined
  empresaNombre?: string;
}

export interface Almacen {
  id: string;
  delegacionId: string;
  nombre: string;
  codigo: string;       // ALM-MU / ALM-VA / ALM-MA / ALM-SE
  direccion?: string;
  descripcion?: string;
  activo: boolean;
  createdAt?: string;
  // Joined
  delegacionNombre?: string;
  empresaNombre?: string;
}

// ─── Ciclo de Ventas ──────────────────────────────────────────────────────────

// Línea de documento (compartida por presupuesto, pedido, albarán, factura)
export interface DocumentoLinea {
  id?: string;
  orden: number;
  productoId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;       // porcentaje
  ivaPorcentaje: number;
  subtotal: number;        // calculado: cantidad * precioUnitario * (1 - descuento/100)
}

// ── Presupuestos ──────────────────────────────────────────────
export type EstadoPresupuesto =
  | 'borrador' | 'enviado' | 'aceptado' | 'rechazado' | 'facturado' | 'cancelado';

export interface Presupuesto {
  id: string;
  referencia: string;        // PRES-0001
  empresaId: string;
  empresaNombre?: string;
  delegacionId?: string;
  clienteId: string;
  clienteNombre?: string;
  fecha: string;
  fechaValidez?: string;
  estado: EstadoPresupuesto;
  subtotal: number;
  descuentoGlobal: number;
  baseImponible: number;
  ivaPorcentaje: number;
  iva: number;
  total: number;
  notas?: string;
  condiciones?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  lineas?: DocumentoLinea[];
}

// ── Pedidos de Venta ──────────────────────────────────────────
export type EstadoPedidoVenta =
  | 'borrador' | 'confirmado' | 'en_proceso' | 'entregado' | 'facturado' | 'cancelado';

export interface PedidoVenta {
  id: string;
  referencia: string;        // PED-0001
  presupuestoId?: string;
  empresaId: string;
  empresaNombre?: string;
  delegacionId?: string;
  almacenId?: string;
  clienteId: string;
  clienteNombre?: string;
  fecha: string;
  fechaEntrega?: string;
  estado: EstadoPedidoVenta;
  subtotal: number;
  descuentoGlobal: number;
  baseImponible: number;
  ivaPorcentaje: number;
  iva: number;
  total: number;
  metodoEnvio?: 'agencia' | 'propio' | 'recogida';
  notas?: string;
  createdBy?: string;
  createdAt?: string;
  lineas?: DocumentoLinea[];
}

// ── Albaranes ─────────────────────────────────────────────────
export type EstadoAlbaran = 'pendiente' | 'entregado' | 'firmado' | 'facturado';

export interface Albaran {
  id: string;
  referencia: string;        // ALB-0001
  pedidoVentaId?: string;
  empresaId: string;
  empresaNombre?: string;
  delegacionId?: string;
  almacenId?: string;
  clienteId: string;
  clienteNombre?: string;
  fecha: string;
  estado: EstadoAlbaran;
  firmaCliente?: string;     // base64
  firmaFecha?: string;
  firmaNombre?: string;
  notas?: string;
  createdBy?: string;
  createdAt?: string;
  lineas?: DocumentoLinea[];
}

// ─── Módulo Compras y Almacén ─────────────────────────────────────────────────

export interface Proveedor {
  id: string;
  empresaId?: string;
  codigo?: string;
  nombre: string;
  razonSocial?: string;
  cif?: string;
  direccion?: string;
  cp?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  telefono?: string;
  email?: string;
  web?: string;
  iban?: string;
  swift?: string;
  contacto?: string;
  diasPago?: number;
  notas?: string;
  activo: boolean;
  createdAt?: string;
}

export type EstadoPedidoCompra =
  | 'borrador' | 'confirmado' | 'enviado' | 'recibido_parcial' | 'recibido' | 'cancelado';

export interface PedidoCompra {
  id: string;
  referencia: string;       // OC-0001
  empresaId?: string;
  empresaNombre?: string;
  delegacionId?: string;
  almacenId?: string;
  proveedorId: string;
  proveedorNombre?: string;
  fecha: string;
  fechaEntrega?: string;
  estado: EstadoPedidoCompra;
  subtotal: number;
  descuentoGlobal: number;
  baseImponible: number;
  ivaPorcentaje: number;
  iva: number;
  total: number;
  notas?: string;
  createdBy?: string;
  createdAt?: string;
  lineas?: CompraLinea[];
}

export interface CompraLinea {
  id?: string;
  orden: number;
  productoId?: string;
  referenciaProveedor?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  ivaPorcentaje: number;
  subtotal: number;
  cantidadRecibida?: number;
}

export type EstadoRecepcion = 'borrador' | 'confirmada' | 'anulada';

export interface Recepcion {
  id: string;
  referencia: string;       // REC-0001
  pedidoCompraId?: string;
  empresaId?: string;
  delegacionId?: string;
  almacenId: string;
  almacenNombre?: string;
  proveedorId?: string;
  proveedorNombre?: string;
  fecha: string;
  estado: EstadoRecepcion;
  albaranProveedor?: string;
  total: number;
  notas?: string;
  createdBy?: string;
  createdAt?: string;
  lineas?: RecepcionLinea[];
}

export interface RecepcionLinea {
  id?: string;
  orden: number;
  productoId?: string;
  descripcion: string;
  cantidad: number;
  precioCoste: number;
  subtotal: number;
}

export interface StockItem {
  id: string;
  productoId: string;
  almacenId: string;
  almacenNombre?: string;
  cantidad: number;
  pmp: number;             // Precio Medio Ponderado
  updatedAt?: string;
  // Joined
  productoNombre?: string;
  productoReferencia?: string;
}

export type TipoMovimientoStock =
  | 'entrada_compra' | 'salida_venta'
  | 'entrada_traspaso' | 'salida_traspaso'
  | 'ajuste_positivo' | 'ajuste_negativo'
  | 'devolucion_cliente' | 'devolucion_proveedor';

export interface MovimientoStock {
  id: string;
  productoId: string;
  almacenId: string;
  almacenNombre?: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  precioCoste?: number;
  referenciaDoc?: string;
  docId?: string;
  notas?: string;
  createdBy?: string;
  createdAt: string;
}

export type EstadoTraspaso = 'borrador' | 'en_transito' | 'confirmado' | 'anulado';

export interface Traspaso {
  id: string;
  referencia: string;       // TRA-0001
  empresaId?: string;
  almacenOrigenId: string;
  almacenOrigenNombre?: string;
  almacenDestinoId: string;
  almacenDestinoNombre?: string;
  fecha: string;
  estado: EstadoTraspaso;
  notas?: string;
  firmaRecepcion?: string;  // base64
  firmaFecha?: string;
  firmaNombre?: string;
  createdBy?: string;
  createdAt?: string;
  lineas?: TraspasoLinea[];
}

export interface TraspasoLinea {
  id?: string;
  orden: number;
  productoId?: string;
  descripcion: string;
  cantidad: number;
  pmpOrigen?: number;
}

export interface LandedCost {
  id: string;
  recepcionId: string;
  concepto: string;
  importe: number;
  metodoReparto: 'proporcional' | 'por_unidad' | 'igual';
  aplicado: boolean;
  createdAt?: string;
}

// ── Facturas ──────────────────────────────────────────────────
export type EstadoFactura = 'borrador' | 'emitida' | 'enviada' | 'cobrada' | 'cancelada';

export interface Factura {
  id: string;
  serie: string;             // A / B
  numero: number;
  referencia: string;        // A-0001, B-0001…
  empresaId: string;
  empresaNombre?: string;
  delegacionId?: string;
  clienteId: string;
  clienteNombre?: string;
  presupuestoId?: string;
  pedidoVentaId?: string;
  albaranId?: string;
  fecha: string;
  fechaVencimiento?: string;
  estado: EstadoFactura;
  subtotal: number;
  descuentoGlobal: number;
  baseImponible: number;
  ivaPorcentaje: number;
  iva: number;
  total: number;
  metodoCobro?: string;
  fechaCobro?: string;
  notas?: string;
  verifactuHash?: string;
  createdBy?: string;
  createdAt?: string;
  lineas?: DocumentoLinea[];
}
