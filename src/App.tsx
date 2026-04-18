import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import StockView from './components/StockView';
import IncomeView from './components/IncomeView';
import ExpenseView from './components/ExpenseView';
import ReportsView from './components/ReportsView';
import PriceView from './components/PriceView';
import ProductModal from './components/ProductModal';
import { TabId, Partner, Document, ProductView, Brand, Location } from './types';
import api from './api/axios'; // Подключаем наш axios-клиент

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';

function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('stock');
  
  // Global State (API Driven)
  const [productsView, setProductsView] = useState<ProductView[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<ProductView | null>(null);

  // Background color mapping based on active tab
  const bgColors: Record<TabId, string> = {
    stock: 'bg-slate-50',
    income: 'bg-teal-50/50',
    expense: 'bg-rose-50/50',
    reports: 'bg-fuchsia-50/50',
    price: 'bg-amber-50/50',
  };

  // Шаг 1: Загрузка Каталога (GET)
  const fetchCatalog = async () => {
    try {
      const res = await api.get('/catalog');
      // Бэкенд возвращает сразу готовый плоский массив ProductView!
      setProductsView(res.data.data);
    } catch (error) {
      console.error('Ошибка загрузки каталога:', error);
    }
  };

  // Шаг 3: Справочники и Документы (GET)
  const fetchReferences = async () => {
    try {
      // Параллельно запрашиваем остальные данные.
      // (Примечание: предполагается, что на бэкенде добавлены/работают эти GET роуты)
      const [brandsRes, locRes, partnersRes, docsRes] = await Promise.all([
        api.get('/catalog/brands').catch(() => ({ data: { data: [] } })),
        api.get('/catalog/locations').catch(() => ({ data: { data: [] } })),
        api.get('/partners').catch(() => ({ data: { data: [] } })),
        api.get('/documents').catch(() => ({ data: { data: [] } }))
      ]);
      setBrands(brandsRes.data?.data || []);
      setLocations(locRes.data?.data || []);
      setPartners(partnersRes.data?.data || []);
      setDocuments(docsRes.data?.data || []);
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error);
    }
  };

  // Загружаем данные при старте компонента
  useEffect(() => {
    fetchCatalog();
    fetchReferences();
  }, []);

  const handleSaveProduct = async (updatedProductView: ProductView) => {
    try {
      // Handle brand creation if it's a temporary ID
      let finalBrandId = updatedProductView.brandId;
      if (finalBrandId.startsWith('temp_b_')) {
        const brandRes = await api.post('/catalog/brands', { name: updatedProductView.brand });
        finalBrandId = brandRes.data.data.id;
      }

      // Handle location creation if it's a temporary ID
      let finalLocationId = updatedProductView.locationId;
      if (finalLocationId && finalLocationId.startsWith('temp_l_')) {
        const locRes = await api.post('/catalog/locations', { name: updatedProductView.location });
        finalLocationId = locRes.data.data.id;
      }

      // Update Catalog API calls
      await api.put(`/catalog/${updatedProductView.id}`, {
        article: updatedProductView.article,
        name: updatedProductView.name,
        brandId: finalBrandId,
        locationId: finalLocationId,
        comment: updatedProductView.comment,
        purchasePrice: updatedProductView.purchasePrice,
        sellingPrice: updatedProductView.sellingPrice,
      });

      // Refetch catalog to show updated data
      await fetchCatalog();
      setSelectedProduct(null);
    } catch (err) {
      console.error('Failed to update product', err);
      alert('Ошибка при сохранении карточки товара');
    }
  };

  const handleAddPartner = async (name: string, type: 'supplier' | 'client') => {
    try {
      const res = await api.post('/partners', { 
        name, 
        type: type === 'supplier' ? 'SUPPLIER' : 'CLIENT' 
      });
      if (res.data.success) {
        setPartners(prev => [...prev, res.data.data]);
        return res.data.data;
      }
    } catch (error) {
      console.error('Ошибка добавления контрагента:', error);
      alert('Не удалось добавить контрагента');
    }
  };

  const handleCreateMissingProduct = async (data: { article: string; brandName: string; productName: string; parentId?: string }) => {
    const { article, brandName, productName, parentId } = data;
    try {
      if (/[А-Яа-яЁё]/.test(article)) {
        console.error('Ошибка: артикул содержит кириллицу', article);
        return null;
      }

      let brandId = '';
      const existingBrand = brands.find(b => b.name.toLowerCase() === (brandName || 'Без бренда').toLowerCase());
      if (existingBrand) {
        brandId = existingBrand.id;
      } else {
        const brandRes = await api.post('/catalog/brands', { name: brandName || 'Без бренда' });
        brandId = brandRes.data.data.id;
        setBrands(prev => [...prev, brandRes.data.data]);
      }

      const payload = {
        article,
        name: productName || 'Новый товар',
        brandId,
        type: parentId ? 'PHANTOM' : 'REAL',
        parentId: parentId || undefined
      };
      
      const productRes = await api.post('/catalog', payload);
      const newProduct = productRes.data.data;
      const productViewObject = { 
        ...newProduct, 
        type: newProduct.type.toLowerCase(),
        brand: brandName || 'Без бренда',
        location: 'Не на полке',
        qty: 0, 
        purchasePrice: 0, 
        sellingPrice: 0 
      };
      
      setProductsView(prev => [...prev, productViewObject]);
      return productViewObject;
    } catch (e) {
      console.error('Ошибка при создании нового товара', e);
      return null;
    }
  };

  // Шаг 2: Проведение Накладной (POST)
  const handleSaveDocument = async (doc: Document): Promise<{ success: boolean; error?: string }> => {
    try {
      // Формируем payload на основе нашего DTO (CreateDocumentDto)
      const payload = {
        type: doc.type.toUpperCase(), // 'income' | 'expense' -> 'INCOME' | 'EXPENSE'
        partnerId: doc.partnerId,
        totalAmount: doc.totalAmount,
        rows: doc.rows.map(row => ({
          productId: row.productId,
          qty: row.qty,
          price: row.price
        }))
      };

      // Отправляем запрос
      await api.post('/documents', payload);
      
      // Обновляем состояние каталога (остатки и цены) и историю документов
      fetchCatalog();
      fetchReferences(); 
      return { success: true };
    } catch (error: any) {
      // Отлавливаем ошибку, включая тупиковые CHECK (недостаток товара)
      let errorMessage = error.response?.data?.message || error.message || 'Неизвестная ошибка при проведении документа';
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage.join(', '); // For class-validator DTO arrays
      }
      console.error('Order creation error:', error);
      return { success: false, error: errorMessage };
    }
  };

  const handleRollbackDocument = async (documentId: string) => {
    if (!window.confirm('Вы уверены, что хотите отменить этот документ? Это удалит связанные движения по складу.')) {
      return;
    }
    try {
      await api.post(`/documents/${documentId}/rollback`);
      await fetchReferences();
      await fetchCatalog();
    } catch (err) {
      console.error('Failed to rollback document', err);
      alert('Не удалось отменить документ');
    }
  };

  const handleAddPhantom = async (parentId: string, sku: string, price: number, brandName: string) => {
    try {
      const parentProduct = productsView.find(c => c.id === parentId);
      if (!parentProduct) return;

      let finalBrandId = parentProduct.brandId; // default to parent's brand
      if (brandName) {
        const existingBrand = brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
        if (existingBrand) {
          finalBrandId = existingBrand.id;
        } else {
          const brandRes = await api.post('/catalog/brands', { name: brandName });
          finalBrandId = brandRes.data.data.id;
          setBrands(prev => [...prev, brandRes.data.data]);
        }
      }

      const payload = {
        article: sku,
        name: `${parentProduct.name} (кросс)`,
        brandId: finalBrandId,
        type: 'PHANTOM',
        parentId: parentId
      };

      const productRes = await api.post('/catalog', payload);
      
      if (price > 0) {
        await api.put(`/catalog/${productRes.data.data.id}`, {
          sellingPrice: price
        });
      }

      await fetchCatalog();
    } catch (err) {
      console.error('Failed to create phantom product', err);
    }
  };

  const handleRemovePhantom = async (phantomId: string) => {
    if (!window.confirm('Вы уверены, что хотите отвязать этот кросс-артикул?')) {
      return;
    }
    try {
      await api.delete(`/catalog/${phantomId}`);
      await fetchCatalog();
    } catch (err) {
      console.error('Failed to delete phantom product', err);
    }
  };

  const handleUpdatePhantomInfo = async (phantomId: string, updates: any) => {
    try {
      if (updates.brandName !== undefined) {
        let finalBrandId = null;
        if (updates.brandName) {
           const existingBrand = brands.find(b => b.name.toLowerCase() === updates.brandName.toLowerCase());
           if (existingBrand) {
             finalBrandId = existingBrand.id;
           } else {
             const brandRes = await api.post('/catalog/brands', { name: updates.brandName });
             finalBrandId = brandRes.data.data.id;
             setBrands(prev => [...prev, brandRes.data.data]);
           }
        }
        await api.put(`/catalog/${phantomId}`, { brandId: finalBrandId });
      }
      
      if (updates.sellingPrice !== undefined) {
         await api.put(`/catalog/${phantomId}`, { sellingPrice: updates.sellingPrice });
      }
      
      await fetchCatalog();
    } catch (err) {
      console.error('Failed to update phantom info', err);
    }
  };

  const suppliers = partners.filter(p => p.type === 'supplier');
  const clients = partners.filter(p => p.type === 'client');

  return (
    <div className={`flex min-h-screen transition-colors duration-500 ease-in-out ${bgColors[activeTab]}`}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'stock' && (
            <StockView 
              products={productsView} 
              onOpenProduct={setSelectedProduct} 
            />
          )}
          
          {activeTab === 'income' && (
            <IncomeView 
              suppliers={suppliers} 
              products={productsView}
              documents={documents}
              locations={locations}
              onAddSupplier={(name) => handleAddPartner(name, 'supplier')} 
              onSaveDocument={handleSaveDocument}
              onCreateMissingProduct={handleCreateMissingProduct}
              onSaveLocations={async (updates: {productId: string, locationName: string}[]) => {
                try {
                  let currentLocations = [...locations];
                  for (const { productId, locationName } of updates) {
                    let finalLocationId = null;
                    if (locationName && locationName.trim()) {
                      const existingLoc = currentLocations.find(l => l.name.toLowerCase() === locationName.trim().toLowerCase());
                      if (existingLoc) {
                        finalLocationId = existingLoc.id;
                      } else {
                        const res = await api.post('/catalog/locations', { name: locationName.trim() });
                        finalLocationId = res.data.data.id;
                        currentLocations.push(res.data.data);
                      }
                    }
                    await api.put(`/catalog/${productId}`, { locationId: finalLocationId });
                  }
                  
                  // Only update state after full success
                  setLocations(currentLocations);
                  await fetchCatalog();
                } catch (err) {
                  console.error('Failed to update product locations', err);
                  throw err; // throw back to let the child know it failed
                }
              }}
            />
          )}
          
          {activeTab === 'expense' && (
            <ExpenseView 
              clients={clients} 
              products={productsView}
              documents={documents.filter(d => d.type === 'expense')}
              onAddClient={(name) => handleAddPartner(name, 'client')} 
              onSaveDocument={handleSaveDocument}
              onRollbackDocument={handleRollbackDocument}
            />
          )}
          
          {activeTab === 'reports' && <ReportsView />}
          
          {activeTab === 'price' && <PriceView products={productsView} />}
        </div>
      </main>

      {/* Modals */}
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          allProducts={productsView}
          brands={brands}
          locations={locations}
          onClose={() => setSelectedProduct(null)}
          onSave={handleSaveProduct}
          onAddPhantom={handleAddPhantom}
          onRemovePhantom={handleRemovePhantom}
          onUpdatePhantomInfo={handleUpdatePhantomInfo}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}
