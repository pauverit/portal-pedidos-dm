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
  width?: number; // meters
  length?: number; // meters
  pricePerM2?: number;
  // Ink specific
  volume?: string;
  inStock?: boolean;
  brand?: string;
  weight?: number; // Weight in kg
}

export interface CartItem extends Product {
  quantity: number;
  calculatedPrice: number;
}

export interface User {
  name: string;
  id: string;
  email: string;
  role: 'admin' | 'client';
  rappelAccumulated: number;
  rappelThreshold?: number; // New: custom threshold for rappel accumulation
  // Auth fields
  username?: string;
  password?: string;
  phone?: string;
  registrationDate?: string;
  // B2B Specifics
  salesRep?: string;
  delegation?: string;
  usedCoupons?: string[];
  // Pricing
  hidePrices?: boolean;
  customPrices?: Record<string, number>; // Map reference -> price
}

export interface SalesRep {
  code: string;
  name: string;
  phone: string;
}

export interface Order {
  id: string;
  userId: string;
  date: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  shippingMethod: 'agency' | 'own';
  salesRep?: string;
  rappelDiscount: number;
  couponDiscount: number;
}
