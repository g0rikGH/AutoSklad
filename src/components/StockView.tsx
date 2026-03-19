import React, { useState } from 'react';
import { ProductView } from '../types';
import { Search, RefreshCw, MapPin } from 'lucide-react';

interface StockViewProps {
  products: ProductView[];
  onOpenProduct: (product: ProductView) => void;
}

export default function StockView({ products, onOpenProduct }: StockViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'real' | 'phantom'>('all');
  const [availFilter, setAvailFilter] = useState<'all' | 'in' | 'out'>('all');

  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.article.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    
    let matchesAvail = true;
    if (availFilter === 'in' && p.qty <= 0) matchesAvail = false;
    if (availFilter === 'out' && p.qty > 0) matchesAvail = false;

    return matchesSearch && matchesType && matchesAvail;
  });

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Остатки на складе</h2>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <RefreshCw className="w-4 h-4" />
          Обновить
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по артикулу, бренду..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Type Filter */}
            <div className="flex justify-center">
              <div className="inline-flex bg-slate-100 p-1 rounded-lg">
                {(['all', 'real', 'phantom'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      typeFilter === type
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {type === 'all' ? 'Все' : type === 'real' ? 'Реальные' : 'Фантомы'}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Filter */}
            <div className="flex justify-end">
              <div className="inline-flex bg-slate-100 p-1 rounded-lg">
                {(['all', 'in', 'out'] as const).map((avail) => (
                  <button
                    key={avail}
                    onClick={() => setAvailFilter(avail)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      availFilter === avail
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {avail === 'all' ? 'Все' : avail === 'in' ? 'В наличии' : 'Отсутствуют'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Артикул</th>
                <th className="px-4 py-3 font-semibold">Бренд</th>
                <th className="px-4 py-3 font-semibold">Название</th>
                <th className="px-4 py-3 font-semibold">Закуп. цена</th>
                <th className="px-4 py-3 font-semibold">Цена продажи</th>
                <th className="px-4 py-3 font-semibold">Полка</th>
                <th className="px-4 py-3 font-semibold">Тип</th>
                <th className="px-4 py-3 font-semibold">Остаток</th>
                <th className="px-4 py-3 font-semibold">Комментарий</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    {p.type === 'real' ? (
                      <button 
                        onClick={() => onOpenProduct(p)}
                        className="font-bold text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-4"
                      >
                        {p.article}
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          if (p.parentId) {
                            const rootProduct = products.find(rp => rp.id === p.parentId);
                            if (rootProduct) onOpenProduct(rootProduct);
                          }
                        }}
                        className="font-bold text-amber-600 hover:text-amber-800 underline decoration-dotted underline-offset-4"
                        title="Открыть карточку корневого товара"
                      >
                        {p.article}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.brand}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {p.name}
                    {p.type === 'phantom' && p.parentId && (() => {
                      const rootProduct = products.find(rp => rp.id === p.parentId);
                      if (!rootProduct) return null;
                      return (
                        <span className="block text-xs text-slate-400 mt-0.5">
                          корень:{' '}
                          <button
                            onClick={() => onOpenProduct(rootProduct)}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            {rootProduct.article}
                          </button>
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{p.purchasePrice} ₽</td>
                  <td className="px-4 py-3 text-slate-900 font-bold">{p.sellingPrice} ₽</td>
                  <td className="px-4 py-3">
                    {p.location !== '-' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                        <MapPin className="w-3 h-3" />
                        {p.location}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.type === 'real' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                        Реальный
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                        Фантом
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${p.qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {p.qty}
                    </span>
                    <span className="text-slate-500 ml-1">шт.</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {p.comment && (
                      <span className={p.qty === 0 ? 'text-rose-500' : ''}>{p.comment}</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Ничего не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
