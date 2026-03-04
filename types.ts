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

export interface User {
  name: string;
  id: string;
  email: string;
  role: 'admin' | 'client' | 'sales' | 'tech' | 'tech_lead';
  rappelAccumulated: number;
  rappelThreshold?: number;
  // Auth fields
  username?: string;
  password?: string;
  phone?: string;
  registrationDate?: string;
  // B2B Specifics
  salesRep?: string;
  delegation?: string;
  zone?: string; // For technicians: their assigned zone/area
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
