import React, { useState, useRef } from 'react';
import { Partner, Document, ProductView } from '../types';
import { FolderOpen, Plus, FileSpreadsheet, Columns, RotateCcw, CheckCheck, Eye, TableProperties, History, X, Trash2 } from 'lucide-react';

interface ExpenseViewProps {
  clients: Partner[];
  products: ProductView[];
  documents: Document[];
  onAddClient: (name: string) => void;
  onSaveDocument: (doc: Document) => Promise<{ success: boolean; error?: string }>;
  onRollbackDocument: (id: string) => void;
}

type Step = 'upload' | 'mapping' | 'reconcile';

interface ReconcileItem {
  productId: string;
  sku: string;
  brand: string;
  name: string;
  reqQty: number;
  stockQty: number;
  price: number;
  shipQty: number;
}

export default function ExpenseView({ clients, products, documents, onAddClient, onSaveDocument, onRollbackDocument }: ExpenseViewProps) {
  const [step, setStep] = useState<Step>('upload');
  const [selectedClient, setSelectedClient] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapping state
  const [startRow, setStartRow] = useState(2);
  const [mapping, setMapping] = useState({ A: '', B: '', C: '', D: '', E: '' });

  // Reconcile state
  const [items, setItems] = useState<ReconcileItem[]>([]);

  // History state
  const [historyFilterClient, setHistoryFilterClient] = useState<string>('all');
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    }
  };

  const filteredDocs = documents
    .filter(d => historyFilterClient === 'all' || d.partnerId === historyFilterClient)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleRollback = (docId: string) => {
    if (window.confirm('Вы уверены, что хотите отменить эту реализацию? Товары вернутся на склад, а документ будет удален.')) {
      onRollbackDocument(docId);
      setViewingDoc(null);
    }
  };

  const handleProceedToMapping = () => {
    if (!selectedClient) {
      alert('Пожалуйста, выберите покупателя!');
      return;
    }
    setStep('mapping');
  };

  const handleProceedToReconcile = () => {
    // Mock data generation based on the original HTML
    // In a real app, this would parse the uploaded file and match with products
    const mockRequested = [
      { article: "L06L109259E", reqQty: 10 },
      { article: "15208-65F0A", reqQty: 10 },
      { article: "06L109259a", reqQty: 5 }
    ];

    const reconcileItems: ReconcileItem[] = mockRequested.map(req => {
      const product = products.find(p => p.article === req.article);
      if (product) {
        return {
          productId: product.id,
          sku: product.article,
          brand: product.brand,
          name: product.name,
          reqQty: req.reqQty,
          stockQty: product.qty,
          price: product.sellingPrice,
          shipQty: Math.min(req.reqQty, product.qty) // Default to max available
        };
      } else {
        return {
          productId: 'unknown',
          sku: req.article,
          brand: 'Неизвестно',
          name: 'Товар не найден',
          reqQty: req.reqQty,
          stockQty: 0,
          price: 0,
          shipQty: 0
        };
      }
    });

    setItems(reconcileItems);
    setStep('reconcile');
  };

  const handleShipQtyChange = (index: number, val: string) => {
    const newItems = [...items];
    let numVal = parseInt(val) || 0;
    const max = newItems[index].stockQty;
    
    if (numVal > max) {
      alert(`На складе всего ${max} шт.`);
      numVal = max;
    } else if (numVal < 0) {
      numVal = 0;
    }
    
    newItems[index].shipQty = numVal;
    setItems(newItems);
  };

  const handleConfirm = async () => {
    const documentRows = items
      .filter(item => item.shipQty > 0 && item.productId !== 'unknown')
      .map(item => ({
        productId: item.productId,
        qty: item.shipQty,
        price: item.price
      }));

    if (documentRows.length === 0) {
      alert("Нет товаров к отгрузке!");
      return;
    }

    const totalAmount = documentRows.reduce((sum, row) => sum + (row.qty * row.price), 0);

    const newDoc: Document = {
      id: `doc_${Date.now()}`,
      type: 'expense',
      date: new Date().toISOString(),
      partnerId: selectedClient,
      rows: documentRows,
      totalAmount
    };

    const result = await onSaveDocument(newDoc);
    if (!result.success) {
      alert(`Ошибка: ${result.error || 'Сбой операции'}`);
      return;
    }

    alert("Накладная проведена! Остатки списаны.");
    setStep('upload');
    setFileName('');
    setSelectedClient('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddClientClick = () => {
    const name = prompt('Введите ФИО/Название нового покупателя:');
    if (name && name.trim()) {
      onAddClient(name.trim());
      // We can't automatically select the new client here because the ID is generated in App.tsx
    }
  };

  const totalSum = items.reduce((sum, item) => sum + (item.shipQty * item.price), 0);

  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Списание товара (Формирование накладной)</h2>

      {step === 'upload' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Загрузка файла-заявки от клиента</h3>

          <div className="flex items-center gap-4 mb-6">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Покупатель:</label>
            <div className="flex gap-2 max-w-md w-full">
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Выберите покупателя...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button 
                onClick={handleAddClientClick}
                className="px-3 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                title="Добавить покупателя"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              Выбрать файл-заявку
            </button>
          </div>

          {fileName && (
            <div className="mt-6 flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <span className="font-semibold text-slate-800">{fileName}</span>
              </div>
              <button 
                onClick={handleProceedToMapping}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Columns className="w-4 h-4" />
                Настроить и Сверить
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'mapping' && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-600">Предпросмотр файла и настройка колонок</h3>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            Выберите в заголовках таблицы, какие данные находятся в колонке. Настройки сохранятся для текущего покупателя.
          </p>

          <div className="flex items-center gap-3 mb-6">
            <label className="text-sm font-bold text-slate-600">Строка начала данных:</label>
            <input
              type="number"
              value={startRow}
              onChange={(e) => setStartRow(Number(e.target.value))}
              min={1}
              className="w-20 px-3 py-1.5 text-center bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
            <table className="w-full text-sm text-center">
              <thead className="bg-slate-50">
                <tr>
                  {['A', 'B', 'C', 'D', 'E'].map((col) => (
                    <th key={col} className="p-2 border-b border-r border-slate-200 last:border-r-0">
                      <select
                        value={mapping[col as keyof typeof mapping]}
                        onChange={(e) => setMapping({...mapping, [col]: e.target.value})}
                        className="w-full px-2 py-1.5 bg-white border border-blue-300 text-blue-700 font-bold rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Пропустить --</option>
                        <option value="colArticle">Артикул</option>
                        <option value="colBrand">Бренд</option>
                        <option value="colName">Название</option>
                        <option value="colQty">Количество</option>
                        <option value="colPrice">Цена продажи</option>
                      </select>
                    </th>
                  ))}
                </tr>
                <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="py-2 border-b border-r border-slate-200">Колонка A</th>
                  <th className="py-2 border-b border-r border-slate-200">Колонка B</th>
                  <th className="py-2 border-b border-r border-slate-200">Колонка C</th>
                  <th className="py-2 border-b border-r border-slate-200">Колонка D</th>
                  <th className="py-2 border-b border-slate-200">Колонка E</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                <tr className="hover:bg-slate-50">
                  <td className="py-2 border-r border-slate-200">L06L109259E</td>
                  <td className="py-2 border-r border-slate-200">VAG</td>
                  <td className="py-2 border-r border-slate-200">Магнит клапана фазорегулятора</td>
                  <td className="py-2 border-r border-slate-200">10</td>
                  <td className="py-2">1500</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 border-r border-slate-200">15208-65F0A</td>
                  <td className="py-2 border-r border-slate-200">Nissan</td>
                  <td className="py-2 border-r border-slate-200">Фильтр масляный</td>
                  <td className="py-2 border-r border-slate-200">5</td>
                  <td className="py-2">800</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setStep('upload')}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Назад
            </button>
            <button 
              onClick={handleProceedToReconcile}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <TableProperties className="w-4 h-4" />
              Сверить со складом
            </button>
          </div>
        </div>
      )}

      {step === 'reconcile' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
              <TableProperties className="w-5 h-5" />
              Сверка заказа со складом
            </h3>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium border border-slate-200">
              Клиент: {clients.find(c => c.id === selectedClient)?.name || selectedClient}
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            Отредактируйте колонку "К отгрузке". Если товара меньше, чем в заявке, строка подсвечена.
          </p>

          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm text-center">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="py-3 px-4 font-semibold text-left border-r border-slate-700">Артикул</th>
                  <th className="py-3 px-4 font-semibold border-r border-slate-700">Бренд</th>
                  <th className="py-3 px-4 font-semibold text-left border-r border-slate-700">Название</th>
                  <th className="py-3 px-4 font-semibold border-r border-slate-700">Запрошено</th>
                  <th className="py-3 px-4 font-semibold border-r border-slate-700">На складе</th>
                  <th className="py-3 px-4 font-semibold bg-blue-600 border-r border-blue-700 w-32">К отгрузке</th>
                  <th className="py-3 px-4 font-semibold border-r border-slate-700">Цена (₽)</th>
                  <th className="py-3 px-4 font-semibold">Сумма (₽)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => {
                  const isOutOfStock = item.stockQty === 0;
                  const isPartial = !isOutOfStock && item.shipQty < item.reqQty;
                  
                  let rowClass = "bg-white hover:bg-slate-50";
                  if (isOutOfStock) rowClass = "bg-rose-50 hover:bg-rose-100";
                  else if (isPartial) rowClass = "bg-amber-50 hover:bg-amber-100";

                  return (
                    <tr key={idx} className={`${rowClass} transition-colors`}>
                      <td className="py-3 px-4 font-bold text-left border-r border-slate-200">{item.sku}</td>
                      <td className="py-3 px-4 border-r border-slate-200">{item.brand}</td>
                      <td className="py-3 px-4 text-left border-r border-slate-200">{item.name}</td>
                      <td className="py-3 px-4 border-r border-slate-200">{item.reqQty}</td>
                      <td className="py-3 px-4 font-bold border-r border-slate-200">{item.stockQty}</td>
                      <td className="py-2 px-4 border-r border-slate-200">
                        <input
                          type="number"
                          value={item.shipQty}
                          onChange={(e) => handleShipQtyChange(idx, e.target.value)}
                          className="w-full px-2 py-1.5 text-center font-bold bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200">{item.price}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{item.shipQty * item.price}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={7} className="py-4 px-4 text-right font-bold text-lg text-slate-700">
                    Итого к оплате:
                  </td>
                  <td className="py-4 px-4 font-bold text-lg text-emerald-600">
                    {totalSum}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setStep('upload')}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Назад (Отмена)
            </button>
            <button 
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <CheckCheck className="w-4 h-4" />
              Подтвердить и Списать
            </button>
          </div>
        </div>
      )}

      {/* History Section */}
      {step === 'upload' && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              История реализаций
            </h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Фильтр по покупателю:</label>
              <select
                value={historyFilterClient}
                onChange={(e) => setHistoryFilterClient(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все покупатели</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="py-3 px-4 font-semibold border-b border-slate-200">Дата</th>
                  <th className="py-3 px-4 font-semibold border-b border-slate-200">Номер документа</th>
                  <th className="py-3 px-4 font-semibold border-b border-slate-200">Покупатель</th>
                  <th className="py-3 px-4 font-semibold border-b border-slate-200 text-right">Сумма</th>
                  <th className="py-3 px-4 font-semibold border-b border-slate-200 text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Нет проведенных реализаций
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map(doc => {
                    const client = clients.find(c => c.id === doc.partnerId);
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">{new Date(doc.date).toLocaleString('ru-RU')}</td>
                        <td className="py-3 px-4 font-medium text-slate-700">{doc.id}</td>
                        <td className="py-3 px-4">{client?.name || 'Неизвестный покупатель'}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">{doc.totalAmount} ₽</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setViewingDoc(doc)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Просмотр"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Реализация {viewingDoc.id}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  от {new Date(viewingDoc.date).toLocaleString('ru-RU')} • Покупатель: {clients.find(c => c.id === viewingDoc.partnerId)?.name || 'Неизвестно'}
                </p>
              </div>
              <button 
                onClick={() => setViewingDoc(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-sm text-left border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold border-b border-slate-200">Артикул</th>
                    <th className="py-3 px-4 font-semibold border-b border-slate-200">Название</th>
                    <th className="py-3 px-4 font-semibold border-b border-slate-200 text-center">Кол-во</th>
                    <th className="py-3 px-4 font-semibold border-b border-slate-200 text-right">Цена</th>
                    <th className="py-3 px-4 font-semibold border-b border-slate-200 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {viewingDoc.rows.map((row, idx) => {
                    const product = products.find(p => p.id === row.productId);
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-4 font-medium">{product?.article || 'Неизвестно'}</td>
                        <td className="py-2 px-4">{product?.name || 'Товар удален'}</td>
                        <td className="py-2 px-4 text-center">{row.qty}</td>
                        <td className="py-2 px-4 text-right">{row.price} ₽</td>
                        <td className="py-2 px-4 text-right font-medium">{row.qty * row.price} ₽</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right font-bold text-slate-700">Итого:</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">{viewingDoc.totalAmount} ₽</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => handleRollback(viewingDoc.id)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Откат реализации (вернуть на склад)
              </button>
              <button
                onClick={() => setViewingDoc(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
