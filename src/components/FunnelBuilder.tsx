import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, GripVertical, Eye, Trash2, Copy, Layout } from 'lucide-react';

const mockFunnels = [
  { id: '1', name: 'Lead Capture Funnel', steps: 3, status: 'active', conversions: 234 },
  { id: '2', name: 'Webinar Registration', steps: 4, status: 'draft', conversions: 0 },
  { id: '3', name: 'Product Launch', steps: 5, status: 'active', conversions: 128 },
];

export default function FunnelBuilder() {
  const navigate = useNavigate();
  const [funnels] = useState(mockFunnels);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Funnels</h1>
          </div>
          <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transition-all">
            <Plus size={18} />
            New Funnel
          </button>
        </div>
      </div>
      <div className="p-4 sm:p-5 md:p-6">
        <div className="grid gap-4">
          {funnels.map((funnel) => (
            <div key={funnel.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4 hover:shadow-md transition-all">
              <div className="text-gray-400"><GripVertical size={20} /></div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Layout size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{funnel.name}</h3>
                <p className="text-sm text-gray-500">{funnel.steps} steps • {funnel.conversions} conversions</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${funnel.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                {funnel.status}
              </span>
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><Eye size={16} className="text-gray-500" /></button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><Copy size={16} className="text-gray-500" /></button>
                <button className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={16} className="text-red-500" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
