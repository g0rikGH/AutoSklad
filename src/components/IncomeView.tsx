import React, { useState, useRef } from 'react';
import { Supplier } from '../types';
import { FolderOpen, Plus, FileSpreadsheet, Columns, RotateCcw, CheckCheck, Eye } from 'lucide-react';

interface IncomeViewProps {
  suppliers: Supplier[];
  onAddSupplier: (name: string) => void;
}

type Step = 'upload' | 'mapping';

export default function IncomeView({ suppliers, onAddSupplier }: IncomeViewProps) {
  const [step, setStep] = useState<Step>('upload');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapping state
  const [startRow, setStartRow] = useState(2);
  const [mapping, setMapping] = useState({ A: '', B: '', C: '', D: '', E: '' });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleProceedToMapping = () => {
    if (!selectedSupplier) {
      alert('Пожалуйста, выберите поставщика!');
      return;
    }
    setStep('mapping');
  };

  const handleConfirm = () => {
    alert(`Накладная от поставщика успешно проведена!\nНовые остатки будут добавлены на склад.`);
    setStep('upload');
    setFileName('');
    setSelectedSupplier('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddSupplierClick = () => {
    const name = prompt('Введите наименование нового поставщика:');
    if (name && name.trim()) {
      onAddSupplier(name.trim());
      setSelectedSupplier(name.trim()); // Assuming ID is the name for simplicity in this prototype
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Приход товара</h2>

      {step === 'upload' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Загрузка накладной от поставщика</h3>
          <p className="text-sm text-slate-500 mb-6">
            Ожидаемый формат Excel: <strong className="text-slate-700">Артикул | Бренд | Название | Количество | Закупочная цена</strong>
          </p>

          <div className="flex items-center gap-4 mb-6">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Поставщик:</label>
            <div className="flex gap-2 max-w-md w-full">
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Выберите поставщика...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button 
                onClick={handleAddSupplierClick}
                className="px-3 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                title="Добавить поставщика"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls, .csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors mb-6"
          >
            <FolderOpen className="w-4 h-4" />
            Выбрать файл на компьютере
          </button>

          {fileName && (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <span className="font-semibold text-slate-800">{fileName}</span>
              </div>
              <button 
                onClick={handleProceedToMapping}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Columns className="w-4 h-4" />
                Настроить и Провести
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'mapping' && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-600">Предпросмотр накладной и настройка колонок</h3>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            Укажите, в каких колонках находятся данные. Настройки сохранятся для текущего поставщика.
          </p>

          <div className="flex items-center gap-3 mb-6">
            <label className="text-sm font-bold text-slate-600">Строка начала данных (пропуск шапки):</label>
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
                        <option value="colPrice">Закуп. Цена</option>
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
                  <td className="py-2 border-r border-slate-200">50</td>
                  <td className="py-2">1200</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 border-r border-slate-200">15208-65F0A</td>
                  <td className="py-2 border-r border-slate-200">Nissan</td>
                  <td className="py-2 border-r border-slate-200">Фильтр масляный</td>
                  <td className="py-2 border-r border-slate-200">20</td>
                  <td className="py-2">650</td>
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
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <CheckCheck className="w-4 h-4" />
              Подтвердить и Провести накладную
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
