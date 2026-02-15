import { Product, User } from './types';

export const ADMIN_USER: User = {
  name: 'Administrador',
  id: 'ADMIN-001',
  email: 'admin@digitalmarket.com',
  role: 'admin',
  rappelAccumulated: 0,
  username: 'admin',
  password: 'admin' // In a real app, this should be hashed
};

export const DEMO_USER: User = {
  name: 'Cliente Demo S.L.',
  id: '#C-DEMO',
  email: 'demo@cliente.com',
  role: 'client',
  rappelAccumulated: 45.50,
  username: 'demo',
  password: 'demo'
};

export const DEFAULT_USERS: User[] = [ADMIN_USER, DEMO_USER];

// Mapa de códigos a nombres
export const SALES_REPS: Record<string, string> = {
  'javi5': 'Javier',
  'josem5': 'Jose Miguel',
  'alberto5': 'Alberto',
  'mariano5': 'Mariano',
  'julian5': 'Julian',
  'jorge5': 'Jorge',
  'demo5': 'Comercial General'
};

// Mapa de códigos a teléfonos
export const SALES_REPS_PHONES: Record<string, string> = {
  'javi5': '600 111 222',
  'josem5': '600 333 444',
  'alberto5': '600 555 666',
  'mariano5': '600 777 888',
  'julian5': '600 999 000',
  'jorge5': '600 123 456',
  'demo5': '958 000 000'
};

export const INITIAL_PRODUCTS: Product[] = [
  // --- FLEXIBLES ---
  {
    id: '1',
    name: 'Laminado Polimerico Brillo',
    reference: 'LPB-137-50',
    category: 'flexible',
    subcategory: 'laminados',
    price: 215.77,
    unit: 'bobina',
    isFlexible: true,
    width: 1.37,
    length: 50,
    pricePerM2: 3.15
  },
  {
    id: '2',
    name: 'Vinilo Monomérico Mate',
    reference: 'VMM-105-50',
    category: 'flexible',
    subcategory: 'vinilos',
    price: 97.12,
    unit: 'bobina',
    isFlexible: true,
    width: 1.05,
    length: 50,
    pricePerM2: 1.85
  },
  {
    id: '3',
    name: 'Lona Frontlit 510g',
    reference: 'LF-510-160',
    category: 'flexible',
    subcategory: 'lonas',
    price: 76.00,
    unit: 'bobina',
    isFlexible: true,
    width: 1.60,
    length: 50,
    pricePerM2: 0.95
  },
  // --- TINTAS ---
  {
    id: '4',
    name: 'HP 305 Negro Original',
    reference: '3YM61AE',
    category: 'ink',
    subcategory: 'otros',
    price: 12.45,
    unit: 'ud',
    volume: '120 ml',
    inStock: true
  },
  // --- RIGIDOS ---
  {
    id: '6',
    name: 'PVC Espumado Blanco 3mm',
    reference: 'PVC-3MM-305',
    category: 'rigid',
    subcategory: 'pvc',
    price: 45.50,
    unit: 'plancha',
    isFlexible: false
  },
  {
    id: '7',
    name: 'Dibond / Composite Blanco',
    reference: 'DIB-3MM',
    category: 'rigid',
    subcategory: 'composite',
    price: 89.90,
    unit: 'plancha',
    isFlexible: false
  },
  // --- ACCESORIOS ---
  {
    id: '8',
    name: 'Ollados Metálicos 10mm',
    reference: 'OLL-10MM',
    category: 'accessory',
    subcategory: 'ollados',
    price: 15.00,
    unit: 'pack 500',
    isFlexible: false
  },
  {
    id: '9',
    name: 'Espátula de Fieltro',
    reference: 'ESP-FIE',
    category: 'accessory',
    subcategory: 'herramientas',
    price: 4.50,
    unit: 'ud',
    isFlexible: false
  }
];
