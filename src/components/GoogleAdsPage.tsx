import { useState } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useToast } from '../components/Toast';
import { Megaphone, TrendingUp, DollarSign, Eye, MousePointerClick, Target, Settings, RefreshCw, BarChart3 } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpc: number;
}

export default function GoogleAdsPage() {
  const { token } = useAuthStore();
  const toast = useToast();
  const [connected, setConnected] = useState(false);
  const [campaigns] = useState<Campaign[]>([
    { id: '1', name: 'Brand Awareness - Diwali', status: 'active', budget: 50000, spent: 32000, impressions: 450000, clicks: 12000, conversions: 380, cpc: 2.67 },
    { id: '2', name: 'Product Retargeting', status: 'active', budget: 30000, spent: 18500, impressions: 280000, clicks: 8400, conversions: 210, cpc: 2.20 },
    { id: '3', name: 'Lead Gen Campaign', status: 'paused', budget: 25000, spent: 12000, impressions: 150000, clicks: 4500, conversions: 95, cpc: 2.67 },
  ]);

  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);

  const handleConnect = () => {
    setConnected(true);
    toast.success('Google Ads connected!');
  };

  if (!connected) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <Megaphone className="mx-auto text-gray-300 mb-4" size={64} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Google Ads Integration</h1>
          <p className="text-gray-600 mb-6">Connect your Google Ads account to manage campaigns and sync leads</p>
          <button onClick={handleConnect}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            Connect Google Ads Account
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
            <Megaphone className="text-blue-600" /> Google Ads
          </h1>
          <p className="text-gray-600 mt-1">Manage campaigns and track performance</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw size={16} /> Sync Data
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-blue-600">₹{totalSpent.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Spent</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-gray-900">{totalClicks.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Clicks</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-green-600">{totalConversions}</div>
          <div className="text-sm text-gray-500">Conversions</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-purple-600">{totalConversions > 0 ? (totalSpent / totalConversions).toFixed(0) : 0}</div>
          <div className="text-sm text-gray-500">Cost / Conversion</div>
        </div>
      </div>

      {/* Campaigns */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Campaigns</h3>
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-medium text-gray-900">{campaign.name}</div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                    campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{campaign.status}</span>
                </div>
                <div className="text-right text-sm">
                  <div className="text-gray-500">Budget</div>
                  <div className="font-medium">₹{campaign.budget.toLocaleString()}</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center text-sm">
                <div><div className="font-bold">{(campaign.spent / campaign.budget * 100).toFixed(0)}%</div><div className="text-xs text-gray-500">Spent</div></div>
                <div><div className="font-bold">{campaign.clicks.toLocaleString()}</div><div className="text-xs text-gray-500">Clicks</div></div>
                <div><div className="font-bold">{campaign.conversions}</div><div className="text-xs text-gray-500">Conversions</div></div>
                <div><div className="font-bold">₹{campaign.cpc}</div><div className="text-xs text-gray-500">CPC</div></div>
              </div>
              <div className="mt-3 h-2 bg-gray-100 rounded-full">
                <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${(campaign.spent / campaign.budget) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}