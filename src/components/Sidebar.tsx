import React from 'react';
import { 
  PackageSearch, 
  ArrowRightToLine, 
  FileMinus2, 
  PieChart, 
  FileSpreadsheet,
  CarFront
} from 'lucide-react';
import { TabId } from '../types';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const navItems: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'stock', label: 'Остатки на складе', icon: PackageSearch },
    { id: 'income', label: 'Приход товара', icon: ArrowRightToLine },
    { id: 'expense', label: 'Списание / Расход', icon: FileMinus2 },
    { id: 'reports', label: 'Отчеты', icon: PieChart },
    { id: 'price', label: 'Прайс-лист', icon: FileSpreadsheet },
  ];

  return (
    <nav className="w-64 min-h-screen bg-slate-800 text-white flex flex-col py-6 flex-shrink-0">
      <div className="flex items-center justify-center gap-2 mb-8 px-4">
        <CarFront className="w-6 h-6 text-blue-400" />
        <h1 className="text-xl font-bold tracking-wide">АвтоСклад</h1>
      </div>
      
      <ul className="flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                  isActive 
                    ? 'bg-slate-700 text-white font-medium' 
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
