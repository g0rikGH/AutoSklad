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

  const handleSaveProduct = (updatedProductView: ProductView) => {
    // Handle brand creation if it's a temporary ID
    let finalBrandId = updatedProductView.brandId;
    if (finalBrandId.startsWith('temp_b_')) {
      finalBrandId = `b${Date.now()}`;
      setBrands(prev => [...prev, { id: finalBrandId, name: updatedProductView.brand }]);
    }

    // Handle location creation if it's a temporary ID
    let finalLocationId = updatedProductView.locationId;
    if (finalLocationId && finalLocationId.startsWith('temp_l_')) {
      finalLocationId = `loc${Date.now()}`;
      setLocations(prev => [...prev, { id: finalLocationId!, name: updatedProductView.location! }]);
    }

    // Update Catalog
    setCatalog(prev => prev.map(c => c.id === updatedProductView.id ? {
      id: updatedProductView.id,
      article: updatedProductView.article,
      brandId: finalBrandId,
      name: updatedProductView.name,
      locationId: finalLocationId,
      comment: updatedProductView.comment,
      type: updatedProductView.type,
      parentId: updatedProductView.parentId,
    } : c));

    // Update Prices
    setPrices(prev => {
      const existing = prev.find(p => p.productId === updatedProductView.id);
      if (existing) {
        return prev.map(p => p.productId === updatedProductView.id ? {
          ...p,
          purchasePrice: updatedProductView.purchasePrice,
          sellingPrice: updatedProductView.sellingPrice,
        } : p);
      } else {
        return [...prev, {
          productId: updatedProductView.id,
          purchasePrice: updatedProductView.purchasePrice,
          sellingPrice: updatedProductView.sellingPrice,
        }];
      }
    });

    setSelectedProduct(null);
  };

  const handleAddPartner = (name: string, type: 'supplier' | 'client') => {
    const newPartner: Partner = { id: `p${Date.now()}`, name, type };
    setPartners([...partners, newPartner]);
  };

  // Шаг 2: Проведение Накладной (POST)
  const handleSaveDocument = async (doc: Document) => {
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
      
      // Если запрос прошел успешно
      alert(`Документ успешно проведен!`);
      
      // Обновляем состояние каталога (остатки и цены) и историю документов
      fetchCatalog();
      fetchReferences(); 

    } catch (error: any) {
      // Отлавливаем ошибку, включая тупиковые CHECK (недостаток товара)
      const errorMessage = error.response?.data?.message || 'Неизвестная ошибка при проведении документа';
      alert(`Ошибка: ${errorMessage}`);
      console.error('Order creation error:', error);
    }
  };

  const handleRollbackDocument = (documentId: string) => {
    const docToRollback = documents.find(d => d.id === documentId);
    if (!docToRollback) return;

    // Restore stock
    setStock(prevStock => {
      let newStock = [...prevStock];
      
      docToRollback.rows.forEach(row => {
        const existingStockIndex = newStock.findIndex(s => s.productId === row.productId);
        // Reverse the quantity change
        const qtyChange = docToRollback.type === 'expense' ? row.qty : -row.qty;
        
        if (existingStockIndex >= 0) {
          newStock[existingStockIndex] = {
            ...newStock[existingStockIndex],
            qty: newStock[existingStockIndex].qty + qtyChange
          };
        } else {
          newStock.push({
            productId: row.productId,
            qty: qtyChange
          });
        }
      });
      
      return newStock;
    });

    // Remove document
    setDocuments(prevDocs => prevDocs.filter(d => d.id !== documentId));
  };

  const handleAddPhantom = (parentId: string, sku: string, price: number) => {
    const newId = `p${Date.now()}`;
    const parentProduct = catalog.find(c => c.id === parentId);
    
    if (!parentProduct) return;

    const newPhantom: CatalogItem = {
      id: newId,
      article: sku,
      brandId: parentProduct.brandId,
      name: `${parentProduct.name} (кросс)`,
      locationId: null, // Phantoms usually don't have a physical location
      type: 'phantom',
      parentId: parentId
    };

    setCatalog([...catalog, newPhantom]);
    
    setPrices([...prices, {
      productId: newId,
      purchasePrice: 0,
      sellingPrice: price
    }]);
  };

  const handleRemovePhantom = (phantomId: string) => {
    setCatalog(catalog.filter(c => c.id !== phantomId));
    setPrices(prices.filter(p => p.productId !== phantomId));
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
              onAddSupplier={(name) => handleAddPartner(name, 'supplier')} 
              onSaveDocument={handleSaveDocument}
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
          
          {activeTab === 'reports' && <ReportsView documents={documents} products={productsView} partners={partners} />}
          
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
