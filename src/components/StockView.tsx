import React, { useState } from 'react';
import { ProductView } from '../types';
import { Search, RefreshCw, MapPin, CornerDownRight, Ghost } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useGroupedProducts } from '../hooks/useGroupedProducts';

interface StockViewProps {
  products: ProductView[];
  onOpenProduct: (product: ProductView) => void;
}

export default function StockView({ products, onOpenProduct }: StockViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'real' | 'phantom'>('all');
  const [availFilter, setAvailFilter] = useState<'all' | 'in' | 'out'>('all');

  const [colWidths, setColWidths] = useState<Record<string, number>>({
    article: 150,
    brand: 120,
    name: 250,
    purchasePrice: 120,
    sellingPrice: 120,
    location: 120,
    type: 100,
    qty: 100,
    comment: 150
  });

  const totalWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);

  const startResize = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colId];

    const doDrag = (dragEvent: MouseEvent) => {
      setColWidths(prev => ({
        ...prev,
        [colId]: Math.max(50, startWidth + dragEvent.clientX - startX)
      }));
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const groupedRows = useGroupedProducts(products, searchQuery);

  const filteredGroupedRows = groupedRows.filter((p) => {
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    
    let matchesAvail = true;
    if (availFilter === 'in' && p.qty <= 0) matchesAvail = false;
    if (availFilter === 'out' && p.qty > 0) matchesAvail = false;

    return matchesType && matchesAvail;
  });

  const parentRef = React.useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: filteredGroupedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 53, // rough estimate of row height
    overscan: 10,
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
                    {type === 'all' ? 'Все' : type === 'real' ? 'Реальные' : 'Кроссы'}
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

        <div ref={parentRef} className="overflow-auto h-[70vh]">
          <table className="text-left text-sm relative border-collapse" style={{ width: totalWidth, minWidth: '100%' }}>
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 z-20 shadow-sm">
              <tr style={{ display: 'flex', width: '100%' }}>
                <th className="px-4 py-3 font-semibold relative group border-r border-slate-200 last:border-r-0" style={{ width: colWidths.article, flexShrink: 0 }}>
                  Артикул
                  <div onMouseDown={(e) => startResize(e, 'article')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 z-10 transition-opacity translate-x-1/2 bg-blue-400" />
                </th>
                <th className="px-4 py-3 font-semibold relative group border-r border-slate-200 last:border-r-0" style={{ width: colWidths.brand, flexShrink: 0 }}>
                  Бренд
                  <div onMouseDown={(e) => startResize(e, 'brand')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 z-10 transition-opacity translate-x-1/2 bg-blue-400" />
                </th>
                <th className="px-4 py-3 font-semibold relative group border-r border-slate-200 last:border-r-0" style={{ width: colWidths.name, flexShrink: 0 }}>
                  Название
                  <div onMouseDown={(e) => startResize(e, 'name')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 z-10 transition-opacity translate-x-1/2 bg-blue-400" />
                </th>
                <th className="px-4 py-3 font-semibold relative group border-r border-slate-200 last:border-r-0" style={{ width: colWidths.purchasePrice, flexShrink: 0 }}>
                  Закуп. цена
                  <div onMouseDown={(e) => startResize(e, 'purchasePrice')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 z-10 transition-opacity translate-x-1/2 bg-blue-400" />
                </th>
                <th className="px-4 py-3 font-semibold relative group border-r border-slate-200 last:border-r-0" style={{ width: colWidths.sellingPrice, flexShrink: 0 }}>
                  Цена продажи
                  <div onMouseDown={(e) => startResize(e, 'sellingPrice')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 z-10 transition-opacity translate-x-1/2 bg-blue-400" />
                </th>
                <th className="px-4 py-3 font-semibold relative group border-r border-slate-200 last:border-r-0" style={{ width: colWidths.location, flexShrink: 0 }}>
                  Полка
                  <div onMouseDown={(e) => startResize(e, 'location')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 z-10 transition-opacity translate-x-1/2 bg-blue-400" />
                </th>
                <th className="px-4 py-3 font-semibold relative group border-r border-slate-200 last:border-r-0" style={{ width: colWidths.type, flexShrink: 0 }}>
                  Тип
                  <div onMouseDown={(e) => startResize(e, 'type')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 z-10 transition-opacity translate-x-1/2 bg-blue-400" />
                </th>
                <th className="px-4 py-3 font-semibold relative group border-r border-slate-200 last:border-r-0" style={{ width: colWidths.qty, flexShrink: 0 }}>
                  Остаток
                  <div onMouseDown={(e) => startResize(e, 'qty')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 z-10 transition-opacity translate-x-1/2 bg-blue-400" />
                </th>
                <th className="px-4 py-3 font-semibold relative group border-r border-slate-200 last:border-r-0" style={{ width: colWidths.comment, flexShrink: 0 }}>
                  Комментарий
                  <div onMouseDown={(e) => startResize(e, 'comment')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 z-10 transition-opacity translate-x-1/2 bg-blue-400" />
                </th>
              </tr>
            </thead>
            <tbody 
              className="divide-y divide-slate-200"
              style={{
                display: 'block',
                position: 'relative',
                height: `${rowVirtualizer.getTotalSize()}px`,
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const p = filteredGroupedRows[virtualRow.index];
                const isEvenGroup = p.groupIndex % 2 === 0;
                // Using standard solid colors to prevent Tailwind JIT issues
                const bgColorStyles = isEvenGroup 
                  ? 'bg-blue-50 hover:bg-blue-100' 
                  : 'bg-emerald-50 hover:bg-emerald-100';

                return (
                  <tr 
                    key={p.id} 
                    className={`transition-colors group border-b border-slate-200 ${bgColorStyles}`}
                    style={{
                      display: 'flex',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                      alignItems: 'center'
                    }}
                  >
                    <td className="px-4 py-3 flex items-center truncate" style={{ width: colWidths.article, flexShrink: 0 }}>
                      {p.isPhantom && <CornerDownRight className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />}
                      {!p.isPhantom ? (
                        <button 
                          onClick={() => onOpenProduct(p)}
                          className="font-bold text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-4 truncate"
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
                          className="font-bold text-amber-600 hover:text-amber-800 underline decoration-dotted underline-offset-4 truncate"
                          title="Открыть карточку корневого товара"
                        >
                          {p.article}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 truncate" style={{ width: colWidths.brand, flexShrink: 0 }}>{p.brand}</td>
                    <td className={`px-4 py-3 truncate ${p.isPhantom ? 'text-slate-500' : 'text-slate-700'}`} style={{ width: colWidths.name, flexShrink: 0 }}>
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium truncate" style={{ width: colWidths.purchasePrice, flexShrink: 0 }}>{p.purchasePrice} ₽</td>
                    <td className="px-4 py-3 text-slate-900 font-bold truncate" style={{ width: colWidths.sellingPrice, flexShrink: 0 }}>{p.sellingPrice} ₽</td>
                    <td className="px-4 py-3 overflow-hidden" style={{ width: colWidths.location, flexShrink: 0 }}>
                      {p.location !== '-' && !p.isPhantom && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis w-full">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{p.location}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 truncate" style={{ width: colWidths.type, flexShrink: 0 }}>
                      {!p.isPhantom ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                          Реальный
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100/50 text-amber-800 text-xs font-medium">
                          <Ghost className="w-3 h-3 flex-shrink-0" />
                          Кросс
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 truncate" style={{ width: colWidths.qty, flexShrink: 0 }}>
                      {p.isPhantom ? (
                        <span className="text-slate-400 font-medium whitespace-nowrap" title="Остаток берется от корневого товара">
                          🔗 {p.qty} <span className="text-xs">шт</span>
                        </span>
                      ) : (
                        <span className="whitespace-nowrap">
                          <span className={`font-bold ${p.qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {p.qty}
                          </span>
                          <span className="text-slate-500 ml-1 text-xs">шт</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 truncate" style={{ width: colWidths.comment, flexShrink: 0 }}>
                      {p.comment && (
                        <span className={p.qty === 0 ? 'text-rose-500' : ''}>{p.comment}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredGroupedRows.length === 0 && (
                <tr style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
                  <td className="px-4 py-8 text-center text-slate-500">
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
