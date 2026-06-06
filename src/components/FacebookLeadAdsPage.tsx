import { useState } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useToast } from '../components/Toast';
import { Facebook, RefreshCw, Users, CheckCircle2, Clock, Link2, Settings, ArrowRight, Download } from 'lucide-react';

interface LeadForm {
  id: string;
  name: string;
  leads: number;
  synced: number;
  lastSync: string;
  status: 'active' | 'inactive';
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  formName: string;
  createdAt: string;
  synced: boolean;
}

export default function FacebookLeadAdsPage() {
  const { token } = useAuthStore();
  const toast = useToast();
  const [connected, setConnected] = useState(false);
  const [forms] = useState<LeadForm[]>([
    { id: '1', name: 'Summer Sale Lead Form', leads: 342, synced: 342, lastSync: '5 min ago', status: 'active' },
    { id: '2', name: 'Product Demo Request', leads: 89, synced: 87, lastSync: '1 hour ago', status: 'active' },
    { id: '3', name: 'Newsletter Signup', leads: 1205, synced: 1205, lastSync: '15 min ago', status: 'active' },
  ]);

  const [leads] = useState<Lead[]>([
    { id: '1', name: 'Arjun Kapoor', email: 'arjun@email.com', phone: '+91 98765 43210', formName: 'Summer Sale Lead Form', createdAt: '10 min ago', synced: true },
    { id: '2', name: 'Meera Singh', email: 'meera@email.com', phone: '+91 87654 32109', formName: 'Product Demo Request', createdAt: '30 min ago', synced: true },
    { id: '3', name: 'Vikram Joshi', email: 'vikram@email.com', phone: '+91 76543 21098', formName: 'Summer Sale Lead Form', createdAt: '1 hour ago', synced: false },
  ]);

  const handleConnect = () => {
    setConnected(true);
    toast.success('Facebook Ads connected!');
  };

  if (!connected) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <Facebook className="mx-auto text-blue-500 mb-4" size={64} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Facebook Lead Ads Sync</h1>
          <p className="text-gray-600 mb-6">Auto-sync Facebook leads to your CRM with real-time notifications</p>
          <button onClick={handleConnect}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            Connect Facebook Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Facebook className="text-blue-600" /> Facebook Lead Ads
          </h1>
          <p className="text-gray-600 mt-1">Auto-sync leads from Facebook to your CRM</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
          <RefreshCw size={16} /> Sync Now
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-blue-600">{forms.reduce((s, f) => s + f.leads, 0).toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Leads</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-green-600">{forms.reduce((s, f) => s + f.synced, 0).toLocaleString()}</div>
          <div className="text-sm text-gray-500">Synced to CRM</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-gray-900">{forms.length}</div>
          <div className="text-sm text-gray-500">Lead Forms</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-purple-600">Real-time</div>
          <div className="text-sm text-gray-500">Sync Mode</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Forms */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Lead Forms</h3>
          <div className="space-y-3">
            {forms.map((form) => (
              <div key={form.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">{form.name}</div>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{form.leads} leads • {form.synced} synced</span>
                  <span>Last: {form.lastSync}</span>
                </div>
                <div className="mt-2 h-1.5 bg-gray-200 rounded-full">
                  <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${(form.synced / form.leads) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={18} /> Recent Leads
          </h3>
          <div className="space-y-3">
            {leads.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 bg-blue-50 rounded-lg p-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                  {lead.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{lead.name}</div>
                  <div className="text-xs text-gray-500 truncate">{lead.email} • {lead.phone}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-gray-400">{lead.createdAt}</div>
                  {lead.synced ? (
                    <CheckCircle2 size={14} className="text-green-500 ml-auto" />
                  ) : (
                    <Clock size={14} className="text-yellow-500 ml-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Auto-response Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings size={18} /> Auto-Response Settings
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="rounded text-blue-600" />
            <div>
              <div className="text-sm font-medium">WhatsApp auto-reply to new leads</div>
              <div className="text-xs text-gray-500">Send welcome message via WhatsApp within 5 minutes</div>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="rounded text-blue-600" />
            <div>
              <div className="text-sm font-medium">Email confirmation to leads</div>
              <div className="text-xs text-gray-500">Send email with business details and next steps</div>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="rounded text-blue-600" />
            <div>
              <div className="text-sm font-medium">Assign to sales team</div>
              <div className="text-xs text-gray-500">Auto-assign new leads to available sales rep</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}