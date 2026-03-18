import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import StockView from './components/StockView';
import IncomeView from './components/IncomeView';
import ExpenseView from './components/ExpenseView';
import ReportsView from './components/ReportsView';
import PriceView from './components/PriceView';
import ProductModal from './components/ProductModal';
import { TabId, Product, Supplier, Client } from './types';
import { initialProducts, initialSuppliers, initialClients } from './data';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('stock');
  
  // Global State
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [clients, setClients] = useState<Client[]>(initialClients);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Background color mapping based on active tab
  const bgColors: Record<TabId, string> = {
    stock: 'bg-slate-50',
    income: 'bg-teal-50/50',
    expense: 'bg-rose-50/50',
    reports: 'bg-fuchsia-50/50',
    price: 'bg-amber-50/50',
  };

  const handleSaveProduct = (updatedProduct: Product) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    setSelectedProduct(null);
  };

  const handleAddSupplier = (name: string) => {
    const newSupplier: Supplier = { id: `s${Date.now()}`, name };
    setSuppliers([...suppliers, newSupplier]);
  };

  const handleAddClient = (name: string) => {
    const newClient: Client = { id: `c${Date.now()}`, name };
    setClients([...clients, newClient]);
  };

  return (
    <div className={`flex min-h-screen transition-colors duration-500 ease-in-out ${bgColors[activeTab]}`}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'stock' && (
            <StockView 
              products={products} 
              onOpenProduct={setSelectedProduct} 
            />
          )}
          
          {activeTab === 'income' && (
            <IncomeView 
              suppliers={suppliers} 
              onAddSupplier={handleAddSupplier} 
            />
          )}
          
          {activeTab === 'expense' && (
            <ExpenseView 
              clients={clients} 
              onAddClient={handleAddClient} 
            />
          )}
          
          {activeTab === 'reports' && <ReportsView />}
          
          {activeTab === 'price' && <PriceView />}
        </div>
      </main>

      {/* Modals */}
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
}
