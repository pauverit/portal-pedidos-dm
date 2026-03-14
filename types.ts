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
  // PASO 11: Costes, márgenes y contabilidad
  precioCompra?: number;      // Precio de coste / compra
  pvp?: number;               // PVP recomendado (si difiere de price)
  margenBrutoPct?: number;    // Margen bruto calculado (%)
  familia?: string;           // Familia / agrupación comercial
  cuentaVentas?: string;      // Cuenta PGC ventas (default 700)
  cuentaCompras?: string;     // Cuenta PGC compras (default 600)
  cuentaExistencias?: string; // Cuenta PGC existencias (default 300)
  notasInternas?: string;
  activo?: boolean;
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
  | 'sales_lead'       // Jefe de Comerciales
  | 'tech'
  | 'tech_lead'        // Jefe de Técnicos
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

// ─── Módulo VeriFactu / Facturación Legal ─────────────────────────────────────

export type EstadoEnvioVerifactu = 'pendiente' | 'enviado' | 'aceptado' | 'rechazado' | 'anulado';

export interface VerifactuRegistro {
  id: string;
  facturaId: string;
  empresaId: string;
  numRegistro: number;
  nifEmisor: string;
  numSerie: string;
  fechaFactura: string;
  tipoFactura: string;       // F1, F2, R1…R5
  cuotaTotal: number;
  importeTotal: number;
  hashAnterior?: string;
  hashActual: string;
  qrUrl?: string;
  fechaRegistro: string;
  estadoEnvio: EstadoEnvioVerifactu;
  respuestaAeat?: Record<string, unknown>;
  // Joined
  referencia?: string;
  clienteNombre?: string;
}

export type MetodoCobro = 'transferencia' | 'tarjeta' | 'cheque' | 'efectivo' | 'sepa' | 'otro';

export interface Cobro {
  id: string;
  facturaId: string;
  empresaId: string;
  fecha: string;
  importe: number;
  metodo: MetodoCobro;
  referencia?: string;
  notas?: string;
  createdBy?: string;
  createdAt?: string;
  // Joined
  facturaReferencia?: string;
}

export interface LibroFacturaEmitida {
  id: string;
  referencia: string;
  fecha: string;
  nifEmisor: string;
  nombreEmisor: string;
  clienteId?: string;
  clienteNombre?: string;
  baseImponible: number;
  ivaPorcentaje: number;
  iva: number;
  total: number;
  estado: EstadoFactura;
  fechaCobro?: string;
  metodoCobro?: string;
  huellaVerifactu?: string;
  estadoVerifactu?: EstadoEnvioVerifactu;
  qrUrl?: string;
}

// ── Devoluciones de venta — PASO 12 ───────────────────────────────────────────

export type MotivoDevolucion = 'defecto' | 'error_pedido' | 'cambio' | 'no_deseado' | 'otro';
export type EstadoDevolucion = 'pendiente' | 'recibida' | 'procesada' | 'anulada';
export type TipoAbono        = 'nota_credito' | 'devolucion_efectivo' | 'canje' | 'saldo';

export interface DevolucionVenta {
  id: string;
  referencia: string;
  empresaId: string;
  delegacionId?: string;
  facturaId?: string;
  facturaRef?: string;
  albaranId?: string;
  albaranRef?: string;
  clienteId?: string;
  clienteNombre: string;
  almacenId?: string;
  almacenNombre?: string;
  fecha: string;
  motivo: MotivoDevolucion;
  estado: EstadoDevolucion;
  subtotal: number;
  baseImponible: number;
  ivaPorcentaje: number;
  iva: number;
  total: number;
  tipoAbono: TipoAbono;
  notaCreditoRef?: string;
  notas?: string;
  createdAt?: string;
  lineas?: DevolucionLinea[];
}

export interface DevolucionLinea {
  id?: string;
  devolucionId?: string;
  orden: number;
  productoId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  ivaPorcentaje: number;
  subtotal: number;
}

// ============================================================
// CONTABILIDAD PGC — PASO 5
// ============================================================

export type NaturalezaCuenta = 'D' | 'H';
export type TipoCuenta = 'activo' | 'pasivo' | 'neto' | 'ingreso' | 'gasto' | 'mixto';
export type TipoAsiento = 'manual' | 'venta' | 'compra' | 'nomina' | 'amortizacion' | 'apertura' | 'cierre';
export type EstadoAsiento = 'borrador' | 'confirmado' | 'cancelado';

export interface CuentaContable {
  id: string;
  empresa_id: string;
  codigo: string;
  nombre: string;
  grupo: number;
  naturaleza: NaturalezaCuenta;
  tipo: TipoCuenta;
  nivel: number;
  activa: boolean;
  es_pgc: boolean;
  created_at: string;
}

export interface AsientoLinea {
  id: string;
  asiento_id: string;
  cuenta_id: string;
  cuenta?: CuentaContable;
  descripcion?: string;
  debe: number;
  haber: number;
  orden: number;
  created_at: string;
}

export interface Asiento {
  id: string;
  empresa_id: string;
  num_asiento: number;
  fecha: string;
  referencia?: string;
  descripcion: string;
  tipo: TipoAsiento;
  estado: EstadoAsiento;
  origen_id?: string;
  origen_tipo?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
  lineas?: AsientoLinea[];
}

export interface SumaSaldo {
  empresa_id: string;
  codigo: string;
  nombre: string;
  grupo: number;
  naturaleza: NaturalezaCuenta;
  tipo: TipoCuenta;
  total_debe: number;
  total_haber: number;
  saldo: number;
}

// ============================================================
// FACTURACIÓN RECURRENTE — PASO 6
// ============================================================

export type FrecuenciaRecurrente = 'mensual' | 'trimestral' | 'semestral' | 'anual';
export type EstadoContrato       = 'activo' | 'pausado' | 'cancelado';
export type SecuenciaSepa        = 'FRST' | 'RCUR' | 'FNAL' | 'OOFF';
export type MetodoCobroContrato  = 'transferencia' | 'sepa' | 'tarjeta' | 'efectivo' | 'otro';

export interface ContratoRecurrente {
  id: string;
  empresa_id: string;
  cliente_id: string;
  cliente_nombre?: string;
  descripcion: string;
  importe_base: number;
  iva_porcentaje: number;
  frecuencia: FrecuenciaRecurrente;
  serie: string;
  dia_cobro: number;
  fecha_inicio: string;
  proxima_facturacion: string;
  estado: EstadoContrato;
  metodo_cobro: MetodoCobroContrato;
  iban_cliente?: string;
  bic_cliente?: string;
  mandato_id?: string;
  mandato_fecha?: string;
  secuencia_sepa: SecuenciaSepa;
  notas?: string;
  created_at: string;
  updated_at: string;
  // Joined from view contratos_pendientes
  cliente_nombre_completo?: string;
  cliente_email?: string;
  mrr_mensual?: number;
  vencido?: boolean;
}

export interface MrrEmpresa {
  empresa_id: string;
  contratos_activos: number;
  contratos_pausados: number;
  mrr: number;
  arr: number;
}

// ─────────────────────────────────────────────────────────────
// PASO 7 — RRHH y Nóminas
// ─────────────────────────────────────────────────────────────

export interface Departamento {
  id: string;
  empresa_id: string;
  nombre: string;
  codigo?: string;
  created_at: string;
}

export type TipoContrato =
  | 'indefinido' | 'temporal' | 'formacion' | 'obra_servicio'
  | 'interinidad' | 'practicas' | 'relevo' | 'otro';

export type EstadoEmpleado = 'activo' | 'baja' | 'excedencia' | 'suspendido';
export type JornadaEmpleado = 'completa' | 'parcial';

export interface Empleado {
  id: string;
  empresa_id: string;
  departamento_id?: string;
  nombre: string;
  apellidos: string;
  dni_nie?: string;
  fecha_nacimiento?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  num_ss?: string;
  num_cuenta_iban?: string;
  puesto: string;
  grupo_cotizacion: number;        // 1-11
  tipo_contrato: TipoContrato;
  jornada: JornadaEmpleado;
  porcentaje_jornada: number;
  sueldo_bruto_anual: number;
  num_pagas: 12 | 14;
  irpf_porcentaje: number;
  fecha_alta: string;
  fecha_baja?: string;
  estado: EstadoEmpleado;
  notas?: string;
  created_at: string;
  updated_at: string;
  // Vista extras
  departamento?: string;
  salario_mensual?: number;
}

export type EstadoNomina = 'borrador' | 'confirmada' | 'pagada' | 'anulada';

export interface Nomina {
  id: string;
  empresa_id: string;
  empleado_id: string;
  periodo: string;               // 'YYYY-MM'
  num_paga?: number;
  fecha_pago?: string;
  total_devengado: number;
  total_deducciones: number;
  liquido_percibir: number;
  ss_empresa: number;
  coste_total_empresa: number;
  estado: EstadoNomina;
  notas?: string;
  created_at: string;
  updated_at: string;
  // Vista extras
  empleado_nombre?: string;
  dni_nie?: string;
  puesto?: string;
  departamento?: string;
}

export type TipoConcepto = 'devengado' | 'deduccion';

export interface NominaConcepto {
  id: string;
  nomina_id: string;
  orden: number;
  tipo: TipoConcepto;
  codigo: string;
  descripcion: string;
  importe: number;
  base_calculo?: number;
  porcentaje?: number;
}

export type TipoAusencia =
  | 'vacaciones' | 'enfermedad' | 'accidente_laboral'
  | 'permiso_retribuido' | 'maternidad' | 'paternidad'
  | 'excedencia' | 'otro';

export type EstadoAusencia = 'solicitada' | 'aprobada' | 'rechazada' | 'cancelada';

export interface Ausencia {
  id: string;
  empresa_id: string;
  empleado_id: string;
  tipo: TipoAusencia;
  fecha_inicio: string;
  fecha_fin: string;
  dias_habiles?: number;
  dias_naturales?: number;
  estado: EstadoAusencia;
  aprobado_por?: string;
  notas?: string;
  created_at: string;
  // Vista extras
  empleado_nombre?: string;
  puesto?: string;
  departamento?: string;
}

export interface MasaSalarialPeriodo {
  empresa_id: string;
  periodo: string;
  num_nominas: number;
  total_bruto: number;
  total_deducciones: number;
  total_liquido: number;
  total_ss_empresa: number;
  coste_total: number;
}

// ─────────────────────────────────────────────────────────────
// PASO 8 — Business Intelligence & Analytics
// ─────────────────────────────────────────────────────────────

export interface BiVentasMensual {
  empresa_id: string;
  periodo: string;             // 'YYYY-MM'
  num_facturas: number;
  base_total: number;
  iva_total: number;
  total_facturado: number;
  total_cobrado: number;
  total_pendiente: number;
}

export interface BiTopCliente {
  empresa_id: string;
  cliente_id: string;
  cliente_nombre: string;
  num_facturas: number;
  total_facturado: number;
  total_cobrado: number;
  ultima_factura: string;
}

export type BiSituacionCartera = 'cobrada' | 'anulada' | 'vencida' | 'vence_pronto' | 'al_dia';

export interface BiCarteraCobros {
  empresa_id: string;
  factura_id: string;
  referencia: string;
  cliente_nombre: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  total: number;
  estado: string;
  dias_retraso: number;
  situacion: BiSituacionCartera;
}

export interface BiCuentaResultados {
  empresa_id: string;
  periodo: string;
  ingresos: number;
  gastos_compras: number;
  gastos_nominas: number;
  resultado: number;
}

export interface BiKpiEmpresa {
  empresa_id: string;
  ventas_mes: number;
  facturas_mes: number;
  ventas_año: number;
  pendiente_cobro: number;
  cobros_vencidos: number;
  mrr: number;
  num_empleados: number;
}

export interface BiPipelineComercial {
  empresa_id: string;
  estado: string;
  num_presupuestos: number;
  importe_total: number;
  ticket_medio: number;
  mas_antiguo: string;
}

// ── PASO 9: Remesas SEPA ──────────────────────────────────────────────────────

export type TipoMandatoSEPA = 'CORE' | 'B2B';
export type SecuenciaSEPA   = 'FRST' | 'RCUR' | 'OOFF' | 'FNAL';
export type EstadoMandato   = 'activo' | 'cancelado' | 'suspendido';
export type EstadoRemesa    = 'borrador' | 'enviada' | 'aceptada' | 'parcial' | 'rechazada';
export type EstadoLineaSepa = 'pendiente' | 'aceptada' | 'devuelta' | 'cancelada';

export interface MandatoSEPA {
  id: string;
  empresaId: string;
  clienteId?: string;
  clienteNombre: string;
  referencia: string;
  tipo: TipoMandatoSEPA;
  ibanDeudor: string;
  bicDeudor?: string;
  secuencia: SecuenciaSEPA;
  fechaFirma: string;
  estado: EstadoMandato;
  notas?: string;
  createdAt: string;
}

export interface RemesaSEPA {
  id: string;
  empresaId: string;
  nombre: string;
  fechaCreacion: string;
  fechaCobro: string;
  estado: EstadoRemesa;
  numOperaciones: number;
  importeTotal: number;
  mensajeId?: string;
  xmlGenerado?: string;
  notas?: string;
  createdAt: string;
  // From view
  lineasAceptadas?: number;
  lineasDevueltas?: number;
  lineasPendientes?: number;
}

export interface RemesaLinea {
  id: string;
  remesaId: string;
  mandatoId?: string;
  facturaId?: string;
  clienteNombre: string;
  ibanDeudor: string;
  bicDeudor?: string;
  referenciaMandato: string;
  fechaFirmaMandato: string;
  secuencia: SecuenciaSEPA;
  concepto: string;
  importe: number;
  estado: EstadoLineaSepa;
  motivoDevolucion?: string;
}

// ── PASO 10: Gastos de Empresa ────────────────────────────────────────────────

export type FormaPagoGasto = 'transferencia' | 'domiciliacion' | 'tarjeta' | 'efectivo' | 'cheque';
export type EstadoGasto    = 'pendiente' | 'pagado' | 'vencido' | 'anulado';
export type FrecuenciaGasto = 'mensual' | 'trimestral' | 'semestral' | 'anual';

export interface CategoriaGasto {
  id: string;
  empresaId: string;
  nombre: string;
  codigoPgc?: string;
  descripcion?: string;
  color: string;
  icono: string;
  activa: boolean;
}

export interface Acreedor {
  id: string;
  empresaId: string;
  nombre: string;
  nif?: string;
  iban?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  categoriaId?: string;
  notas?: string;
  activo: boolean;
  createdAt: string;
}

export interface Gasto {
  id: string;
  empresaId: string;
  acreedorId?: string;
  acreedorNombre: string;
  categoriaId?: string;
  categoriaNombre?: string;
  numeroFactura?: string;
  fecha: string;
  fechaVencimiento?: string;
  concepto: string;
  baseImponible: number;
  ivaPorcentaje: number;
  iva: number;
  irpfPorcentaje: number;
  irpf: number;
  total: number;
  formaPago: FormaPagoGasto;
  estado: EstadoGasto;
  esRecurrente: boolean;
  periodo?: string;
  urlDocumento?: string;
  notas?: string;
  createdAt: string;
  // From view
  situacion?: string;
  diasRetraso?: number;
}

export interface GastoRecurrente {
  id: string;
  empresaId: string;
  acreedorId?: string;
  acreedorNombre: string;
  categoriaId?: string;
  categoriaNombre?: string;
  concepto: string;
  baseImponible: number;
  ivaPorcentaje: number;
  irpfPorcentaje: number;
  diaVencimiento: number;
  frecuencia: FrecuenciaGasto;
  formaPago: FormaPagoGasto;
  activo: boolean;
  ultimoPeriodo?: string;
}

export interface GastoPorCategoria {
  empresaId: string;
  periodo: string;
  categoriaId?: string;
  categoriaNombre?: string;
  numGastos: number;
  baseTotal: number;
  ivaTotal: number;
  totalGastos: number;
  totalPagado: number;
  totalPendiente: number;
}

// ── PASO 11: Márgenes y Rentabilidad ─────────────────────────────────────────

export interface BiRentabilidadProducto {
  productoId: string;
  empresaId?: string;
  productoNombre: string;
  reference?: string;
  categoria?: string;
  familia?: string;
  costeActual: number;
  pvpActual: number;
  margenActualPct: number;
  numFacturas: number;
  unidadesVendidas: number;
  ingresoTotal: number;
  margenBrutoTotal: number;
  margenMedioPct: number;
}

export interface BiMargenNetoEmpresa {
  empresaId: string;
  periodo: string;
  ventas: number;
  margenBruto: number;
  gastosOperativos: number;
  gastosPersonal: number;
  gastosTotales: number;
  resultadoNeto: number;
  margenNetoPct: number;
}

// ── PASO 13: Trazabilidad de documentos + Activos de cliente ──────────────────

export type TipoDocTraza =
  | 'presupuesto' | 'pedido' | 'albaran' | 'factura'
  | 'devolucion'  | 'compra' | 'recepcion';

export interface TrazaProducto {
  tipoDoc: TipoDocTraza;
  docId: string;
  referencia: string;
  empresaId?: string;
  clienteNombre?: string;
  fecha: string;
  estado?: string;
  total?: number;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface StockAlmacenDetalle {
  productoId: string;
  almacenId: string;
  almacenNombre: string;
  almacenTipo?: string;
  cantidad: number;
  pmp?: number;
  updatedAt?: string;
}

/** Activo de cliente (extiende Machine con campos de PASO 13) */
export interface Activo extends Machine {
  numeroActivo?: string;
  nombre?: string;
  empresaId?: string;
  ubicacion?: string;
  updatedAt?: string;
  // Joined
  clienteEmpresa?: string;
  incidenciasAbiertas?: number;
  otAbiertas?: number;
  // Detail (loaded on demand)
  incidents?: Incident[];
  workOrders?: WorkOrder[];
}

// ============================================================
// PASO 14 — RIESGO DE CRÉDITO / LÍMITE COFACE
// ============================================================

/** Clasificación de riesgo COFACE (@rating estándar) */
export type ClasificacionCoface = 'A1' | 'A2' | 'A3' | 'A4' | 'B' | 'C' | 'D';

/** Estado semáforo de riesgo del cliente */
export type EstadoRiesgo =
  | 'ok'          // Dentro del límite, sin deuda vencida
  | 'alerta'      // >80% del límite consumido
  | 'vencido'     // Tiene facturas con fecha de vencimiento superada
  | 'excedido'    // Supera el 100% del límite
  | 'bloqueado'   // Bloqueado manualmente por administración
  | 'sin_limite'; // No tiene límite definido (COFACE ni interno)

/** Registro de límite de crédito por cliente (tabla limites_credito) */
export interface LimiteCredito {
  id?: string;
  empresaId: string;
  clienteId: string;

  // Datos COFACE
  limiteCoface?: number;
  clasificacionCoface?: ClasificacionCoface;
  numeroPolizaCoface?: string;
  fechaConsultaCoface?: string;
  fechaVencimientoCoface?: string;

  // Límite interno
  limiteInterno?: number;

  // Bloqueo
  bloqueado: boolean;
  motivoBloqueo?: string;
  fechaBloqueo?: string;
  bloqueadoPor?: string;

  // Metadatos
  notas?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Vista v_riesgo_cliente — riesgo calculado en tiempo real */
export interface RiesgoCliente {
  clienteId: string;
  clienteNombre: string;
  email: string;
  cif?: string;
  empresaId: string;

  // Límite
  limiteId?: string;
  limiteCoface?: number;
  clasificacionCoface?: ClasificacionCoface;
  numeroPolizaCoface?: string;
  fechaConsultaCoface?: string;
  fechaVencimientoCoface?: string;
  limiteInterno?: number;
  limiteEfectivo: number; // COFACE ?? interno ?? 0

  // Bloqueo
  bloqueado: boolean;
  motivoBloqueo?: string;
  fechaBloqueo?: string;

  // Riesgo calculado
  deudaTotal: number;          // Facturas pendientes (vencidas + vigentes)
  deudaVencida: number;        // Solo facturas vencidas
  deudaVigente: number;        // Facturas en plazo
  pedidosSinFacturar: number;  // Pedidos confirmados sin factura
  numFacturasPendientes: number;
  numPedidosVivos: number;
  diasMayorVencimiento: number; // Antigüedad del vencimiento más viejo (días)
  riesgoVivo: number;           // deudaTotal + pedidosSinFacturar

  // Indicadores
  pctLimiteUsado?: number;     // null si no hay límite definido
  creditoDisponible: number;
  estadoRiesgo: EstadoRiesgo;
}

/** Vista v_facturas_pendientes_cliente */
export interface FacturaPendienteRiesgo {
  id: string;
  referencia: string;
  empresaId: string;
  clienteId: string;
  clienteNombre?: string;
  fecha: string;
  fechaVencimiento?: string;
  estado: string;
  total: number;
  totalCobrado: number;
  saldoPendiente: number;
  diasVencida: number; // 0 si aún no ha vencido
}

/** Resumen para tarjetas del dashboard de riesgo */
export interface ResumenRiesgoEmpresa {
  totalClientesConRiesgo: number;
  totalRiesgoVivo: number;
  totalDeudaVencida: number;
  clientesBloqueados: number;
  clientesSinLimite: number;
  clientesEnAlerta: number;  // alerta + excedido + vencido
  limiteCoface_total: number;
  pctLimiteGlobalUsado?: number;
}
