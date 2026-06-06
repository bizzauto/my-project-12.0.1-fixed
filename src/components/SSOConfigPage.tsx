import { useState } from 'react';
import { useToast } from '../components/Toast';
import { Shield, Key, Users, Plus, CheckCircle2, AlertCircle, Settings, Globe, Lock } from 'lucide-react';

interface SSOProvider {
  id: string;
  name: string;
  type: 'google' | 'azure' | 'okta' | 'saml';
  enabled: boolean;
  domain: string;
  users: number;
}

export default function SSOConfigPage() {
  const toast = useToast();
  const [providers, setProviders] = useState<SSOProvider[]>([
    { id: '1', name: 'Google Workspace', type: 'google', enabled: true, domain: 'bizzauto.com', users: 24 },
    { id: '2', name: 'Azure AD', type: 'azure', enabled: false, domain: '', users: 0 },
  ]);
  const [showSetup, setShowSetup] = useState(false);

  const toggleProvider = (id: string) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
    toast.success('Provider updated');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="text-blue-600" /> Single Sign-On (SSO)
        </h1>
        <p className="text-gray-600 mt-1">Configure SSO providers for your organization</p>
      </div>

      {/* Providers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {providers.map((provider) => (
          <div key={provider.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  provider.type === 'google' ? 'bg-blue-100' :
                  provider.type === 'azure' ? 'bg-indigo-100' : 'bg-gray-100'
                }`}>
                  {provider.type === 'google' ? <Globe size={20} className="text-blue-600" /> :
                   provider.type === 'azure' ? <Shield size={20} className="text-indigo-600" /> :
                   <Key size={20} className="text-gray-600" />}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{provider.name}</div>
                  <div className="text-xs text-gray-500 uppercase">{provider.type}</div>
                </div>
              </div>
              <button
                onClick={() => toggleProvider(provider.id)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  provider.enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                  provider.enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            {provider.enabled && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Domain</span><span>{provider.domain}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Connected Users</span><span>{provider.users}</span></div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={14} /> Active</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add Provider */}
        <button
          onClick={() => setShowSetup(true)}
          className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors min-h-[200px]"
        >
          <Plus size={32} />
          <div className="font-medium mt-2">Add SSO Provider</div>
        </button>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Settings size={18} /> SSO Settings</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="rounded text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Enforce SSO for all users</div>
              <div className="text-xs text-gray-500">Users must sign in via SSO (no password login)</div>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="rounded text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Auto-provision users</div>
              <div className="text-xs text-gray-500">Automatically create accounts for new SSO users</div>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="rounded text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Just-In-Time (JIT) provisioning</div>
              <div className="text-xs text-gray-500">Create user on first SSO login with default role</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}