export type TabId = 'stock' | 'income' | 'expense' | 'reports' | 'price';

export interface Phantom {
  sku: string;
  price?: number;
}

export interface Product {
  id: string;
  article: string;
  brand: string;
  name: string;
  qty: number;
  location: string;
  comment: string;
  type: 'real' | 'phantom';
  parentId?: string; // For phantoms, points to the real product
  phantoms: Phantom[];
}

export interface Supplier {
  id: string;
  name: string;
}

export interface Client {
  id: string;
  name: string;
}

export interface ColumnMapping {
  startRow: number;
  A: string;
  B: string;
  C: string;
  D: string;
  E: string;
}
