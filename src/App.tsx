import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import StockView from './components/StockView';
import IncomeView from './components/IncomeView';
import ExpenseView from './components/ExpenseView';
import ReportsView from './components/ReportsView';
import PriceView from './components/PriceView';
import ProductModal from './components/ProductModal';
import { TabId, CatalogItem, StockRecord, PriceRecord, Partner, Document, ProductView, Brand, Location } from './types';
import { initialCatalog, initialStock, initialPrices, initialPartners, initialDocuments, initialBrands, initialLocations } from './data';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('stock');
  
  // Global State (Normalized)
  const [catalog, setCatalog] = useState<CatalogItem[]>(initialCatalog);
  const [stock, setStock] = useState<StockRecord[]>(initialStock);
  const [prices, setPrices] = useState<PriceRecord[]>(initialPrices);
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const [locations, setLocations] = useState<Location[]>(initialLocations);

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

  // Join data to create ProductView array for UI components
  const productsView: ProductView[] = useMemo(() => {
    return catalog.map(item => {
      // Find stock. If phantom, find stock of parent.
      let currentQty = 0;
      if (item.type === 'real') {
        currentQty = stock.find(s => s.productId === item.id)?.qty || 0;
      } else if (item.type === 'phantom' && item.parentId) {
        currentQty = stock.find(s => s.productId === item.parentId)?.qty || 0;
      }

      // Find prices
      const priceRecord = prices.find(p => p.productId === item.id);
      
      // Find brand and location
      const brandName = brands.find(b => b.id === item.brandId)?.name || 'Неизвестно';
      const locationName = item.locationId ? (locations.find(l => l.id === item.locationId)?.name || 'Неизвестно') : null;

      return {
        ...item,
        brand: brandName,
        location: locationName,
        qty: currentQty,
        purchasePrice: priceRecord?.purchasePrice || 0,
        sellingPrice: priceRecord?.sellingPrice || 0,
      };
    });
  }, [catalog, stock, prices, brands, locations]);

  const handleSaveProduct = (updatedProductView: ProductView) => {
    // Find or create brand
    let brandId = brands.find(b => b.name === updatedProductView.brand)?.id;
    if (!brandId) {
      brandId = `b${Date.now()}`;
      setBrands(prev => [...prev, { id: brandId!, name: updatedProductView.brand }]);
    }

    // Find or create location
    let locationId = null;
    if (updatedProductView.location) {
      locationId = locations.find(l => l.name === updatedProductView.location)?.id;
      if (!locationId) {
        locationId = `loc${Date.now()}`;
        setLocations(prev => [...prev, { id: locationId!, name: updatedProductView.location! }]);
      }
    }

    // Update Catalog
    setCatalog(prev => prev.map(c => c.id === updatedProductView.id ? {
      id: updatedProductView.id,
      article: updatedProductView.article,
      brandId: brandId!,
      name: updatedProductView.name,
      locationId: locationId,
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

  const handleSaveDocument = (doc: Document) => {
    setDocuments([...documents, doc]);
    
    // Update stock based on document
    setStock(prevStock => {
      let newStock = [...prevStock];
      
      doc.rows.forEach(row => {
        const existingStockIndex = newStock.findIndex(s => s.productId === row.productId);
        const qtyChange = doc.type === 'income' ? row.qty : -row.qty;
        
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

    // If it's an income document, update purchase prices
    if (doc.type === 'income') {
      setPrices(prevPrices => {
        let newPrices = [...prevPrices];
        doc.rows.forEach(row => {
          const existingPriceIndex = newPrices.findIndex(p => p.productId === row.productId);
          if (existingPriceIndex >= 0) {
            newPrices[existingPriceIndex] = {
              ...newPrices[existingPriceIndex],
              purchasePrice: row.price // Update purchase price to the latest one
            };
          } else {
            newPrices.push({
              productId: row.productId,
              purchasePrice: row.price,
              sellingPrice: row.price * 1.5 // Default markup
            });
          }
        });
        return newPrices;
      });
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
