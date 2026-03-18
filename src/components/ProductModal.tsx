import React, { useState, useEffect } from 'react';
import { Product, Phantom } from '../types';
import { X, MapPin, MessageSquare, Link as LinkIcon, Ghost, Plus, Save } from 'lucide-react';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: (updatedProduct: Product) => void;
}

export default function ProductModal({ product, onClose, onSave }: ProductModalProps) {
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);
  const [newPhantomSku, setNewPhantomSku] = useState('');
  const [newPhantomPrice, setNewPhantomPrice] = useState('');

  useEffect(() => {
    setEditedProduct(product ? { ...product } : null);
  }, [product]);

  if (!editedProduct) return null;

  const handleAddPhantom = () => {
    if (!newPhantomSku.trim()) return;
    setEditedProduct({
      ...editedProduct,
      phantoms: [
        ...editedProduct.phantoms,
        { sku: newPhantomSku.trim(), price: newPhantomPrice ? Number(newPhantomPrice) : undefined }
      ]
    });
    setNewPhantomSku('');
    setNewPhantomPrice('');
  };

  const handleRemovePhantom = (skuToRemove: string) => {
    setEditedProduct({
      ...editedProduct,
      phantoms: editedProduct.phantoms.filter(p => p.sku !== skuToRemove)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center text-white">
          <h3 className="text-lg font-semibold">Карточка товара (Редактирование)</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-bold text-blue-600 mb-1">{editedProduct.article}</h2>
              <p className="text-slate-500 font-medium">{editedProduct.brand}</p>
            </div>
            <div className="text-right">
              <span className="block text-sm text-slate-500 mb-1">Остаток:</span>
              <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-lg font-bold ${
                editedProduct.qty > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {editedProduct.qty}
              </span>
            </div>
          </div>

          <p className="text-slate-700 mb-6">
            <strong className="font-semibold text-slate-900">Название:</strong> {editedProduct.name}
          </p>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 mb-2">
                <MapPin className="w-4 h-4" /> Полка:
              </label>
              <input
                type="text"
                value={editedProduct.location}
                onChange={(e) => setEditedProduct({...editedProduct, location: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 mb-2">
                <MessageSquare className="w-4 h-4" /> Коммент:
              </label>
              <input
                type="text"
                value={editedProduct.comment}
                onChange={(e) => setEditedProduct({...editedProduct, comment: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <h4 className="flex items-center gap-2 font-semibold text-slate-800 mb-3">
              <LinkIcon className="w-4 h-4" /> Привязанные фантомы:
            </h4>
            
            <ul className="space-y-2 mb-4">
              {editedProduct.phantoms.length === 0 ? (
                <li className="text-sm text-slate-500 italic">Нет привязанных фантомов</li>
              ) : (
                editedProduct.phantoms.map((phantom) => (
                  <li key={phantom.sku} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Ghost className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-slate-700">{phantom.sku}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="number"
                          value={phantom.price || ''}
                          readOnly
                          className="w-24 px-3 py-1.5 text-right bg-slate-50 border border-slate-200 rounded-md text-sm"
                          placeholder="Цена"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₽</span>
                      </div>
                      <button 
                        onClick={() => handleRemovePhantom(phantom.sku)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Добавить новый фантом:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPhantomSku}
                  onChange={(e) => setNewPhantomSku(e.target.value)}
                  placeholder="Артикул"
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={newPhantomPrice}
                  onChange={(e) => setNewPhantomPrice(e.target.value)}
                  placeholder="Цена"
                  className="w-28 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={handleAddPhantom}
                  className="px-3 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button 
            onClick={() => onSave(editedProduct)}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
