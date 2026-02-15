export type ProductCategory = 'rigid' | 'flexible' | 'ink' | 'accessory';

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
  // Auth fields
  username?: string;
  password?: string;
  phone?: string;
  registrationDate?: string;
  // B2B Specifics
  salesRep?: string;
  delegation?: string;
  usedCoupons?: string[];
}

export interface SalesRep {
  code: string;
  name: string;
  phone: string;
}
