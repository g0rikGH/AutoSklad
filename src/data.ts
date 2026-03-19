import { CatalogItem, StockRecord, PriceRecord, Partner, Document } from './types';

export const initialCatalog: CatalogItem[] = [
  {
    id: '1',
    article: 'L06L109259E',
    brand: 'VAG',
    name: 'Магнит клапана фазорегулятора',
    location: 'Стеллаж А-12',
    comment: 'Ходовой товар',
    type: 'real',
  },
  {
    id: '2',
    article: '06L109259a',
    brand: 'VAG',
    name: 'Магнит клапана (кросс)',
    location: '-',
    comment: '',
    type: 'phantom',
    parentId: '1',
  },
  {
    id: '3',
    article: '15208-65F0A',
    brand: 'Nissan',
    name: 'Фильтр масляный',
    location: 'Стеллаж Б-3',
    comment: '',
    type: 'real',
  },
  {
    id: '4',
    article: '90915-10001',
    brand: 'Toyota',
    name: 'Фильтр масляный',
    location: 'Стеллаж В-1',
    comment: 'Заказано 20 шт.',
    type: 'real',
  },
];

export const initialStock: StockRecord[] = [
  { productId: '1', qty: 15 },
  { productId: '3', qty: 8 },
  { productId: '4', qty: 0 },
];

export const initialPrices: PriceRecord[] = [
  { productId: '1', purchasePrice: 1000, sellingPrice: 1500 },
  { productId: '2', purchasePrice: 1000, sellingPrice: 1200 }, // Phantom specific selling price
  { productId: '3', purchasePrice: 450, sellingPrice: 800 },
  { productId: '4', purchasePrice: 300, sellingPrice: 600 },
];

export const initialPartners: Partner[] = [
  { id: 's1', name: 'ООО КитайПартс', type: 'supplier' },
  { id: 's2', name: 'ИП Иванов (Опт)', type: 'supplier' },
  { id: 's3', name: 'Local Parts Ltd.', type: 'supplier' },
  { id: 'c1', name: 'Иван (Розница)', type: 'client' },
  { id: 'c2', name: 'Автосервис "У Гаража"', type: 'client' },
  { id: 'c3', name: 'ООО АвтоВектор', type: 'client' },
];

export const initialDocuments: Document[] = [];

