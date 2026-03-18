import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

export default function PriceView() {
  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Генерация прайс-листа</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <button className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-lg font-medium transition-colors shadow-sm">
          <FileSpreadsheet className="w-6 h-6" />
          Сгенерировать прайс-лист
        </button>
      </div>
    </div>
  );
}
