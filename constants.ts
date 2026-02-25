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

export const DEFAULT_USERS: User[] = [ADMIN_USER];

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

export const SALES_REPS_EMAILS: Record<string, string> = {
  'javi5': 'javier@digitalmarket.com',
  'josem5': 'josemiguel@digitalmarket.com',
  'alberto5': 'alberto@digitalmarket.com',
  'mariano5': 'mariano@digitalmarket.com',
  'julian5': 'julian@digitalmarket.com',
  'jorge5': 'jorge@digitalmarket.com',
  'demo5': 'info@digitalmarket.com'
};

export const INITIAL_PRODUCTS: Product[] = [];
