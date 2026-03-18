import { Product, Supplier, Client } from './types';

export const initialProducts: Product[] = [
  {
    id: '1',
    article: 'L06L109259E',
    brand: 'VAG',
    name: 'Магнит клапана фазорегулятора',
    qty: 15,
    location: 'Стеллаж А-12',
    comment: 'Ходовой товар',
    type: 'real',
    phantoms: [
      { sku: '06L109259a', price: 1200 },
      { sku: '06L109259b', price: 1150 },
      { sku: '06L109259c', price: 1300 },
    ],
  },
  {
    id: '2',
    article: '06L109259a',
    brand: 'VAG',
    name: 'Магнит клапана (кросс)',
    qty: 15,
    location: '-',
    comment: '',
    type: 'phantom',
    parentId: '1',
    phantoms: [],
  },
  {
    id: '3',
    article: '15208-65F0A',
    brand: 'Nissan',
    name: 'Фильтр масляный',
    qty: 8,
    location: 'Стеллаж Б-3',
    comment: '',
    type: 'real',
    phantoms: [],
  },
  {
    id: '4',
    article: '90915-10001',
    brand: 'Toyota',
    name: 'Фильтр масляный',
    qty: 0,
    location: 'Стеллаж В-1',
    comment: 'Заказано 20 шт.',
    type: 'real',
    phantoms: [],
  },
];

export const initialSuppliers: Supplier[] = [
  { id: 's1', name: 'ООО КитайПартс' },
  { id: 's2', name: 'ИП Иванов (Опт)' },
  { id: 's3', name: 'Local Parts Ltd.' },
];

export const initialClients: Client[] = [
  { id: 'c1', name: 'Иван (Розница)' },
  { id: 'c2', name: 'Автосервис "У Гаража"' },
  { id: 'c3', name: 'ООО АвтоВектор' },
];
