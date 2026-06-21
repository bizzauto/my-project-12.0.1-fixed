import { useState } from 'react';
import { Star, QrCode, MessageSquare, Shield, BarChart3, Zap, Download, Copy, Settings, RefreshCw, Eye, Trash2, Plus, Check, X, AlertCircle } from 'lucide-react';
import { useToast } from './Toast';

interface QRCodeItem {
  id: string;
  name: string;
  url: string;
  scans: number;
  reviews: number;
  createdAt: string;
  status: 'active' | 'paused';
}

const templates = [
  { id: 'classic', name: 'Classic', color: '#f59e0b', bg: 'from-amber-500/20 to-orange-500/10' },
  { id: 'modern', name: 'Modern', color: '#3b82f6', bg: 'from-blue-500/20 to-cyan-500/10' },
  { id: 'minimal', name: 'Minimal', color: '#10b981', bg: 'from-emerald-500/20 to-teal-500/10' },
  { id: 'bold', name: 'Bold', color: '#ef4444', bg: 'from-red-500/20 to-pink-500/10' },
  { id: 'elegant', name: 'Elegant', color: '#8b5cf6', bg: 'from-violet-500/20 to-purple-500/10' },
  { id: 'playful', name: 'Playful', color: '#ec4899', bg: 'from-pink-500/20 to-rose-500/10' },
];

const autoReplyRules = [
  { id: '1', trigger: '5 star', reply: 'Thank you so much for the amazing review! We\'re thrilled you had a great experience. 🙏', enabled: true },
  { id: '2', trigger: '4 star', reply: 'Thanks for your feedback! We\'re glad you enjoyed it. Let us know if there\'s anything we can improve.', enabled: true },
  { id: '3', trigger: '3 star', reply: 'Thank you for your feedback. We\'d love to hear how we can improve your experience.', enabled: false },
  { id: '4', trigger: 'negative', reply: 'We\'re sorry to hear about your experience. Please contact us directly so we can make it right.', enabled: true },
];

export default function GoogleReviewsQRPage() {
  const toast = useToast();
  const [view, setView] = useState<'qr' | 'auto-reply' | 'analytics' | 'settings'>('qr');
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>([
    { id: '1', name: 'Main Entrance QR', url: 'https://g.page/bizzauto/review', scans: 1247, reviews: 89, createdAt: '2026-05-15', status: 'active' },
    { id: '2', name: 'Counter Stand', url: 'https://g.page/bizzauto/review', scans: 856, reviews: 62, createdAt: '2026-05-20', status: 'active' },
    { id: '3', name: 'Receipt Footer', url: 'https://g.page/bizzauto/review', scans: 2341, reviews: 178, createdAt: '2026-06-01', status: 'paused' },
  ]);
  const [rules, setRules] = useState(autoReplyRules);
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQRName, setNewQRName] = useState('');

  const totalScans = qrCodes.reduce((a, b) => a + b.scans, 0);
  const totalReviews = qrCodes.reduce((a, b) => a + b.reviews, 0);
  const avgConversion = totalScans > 0 ? ((totalReviews / totalScans) * 100).toFixed(1) : '0';

  const createQR = () => {
    if (!newQRName.trim()) { toast.error('Enter a name'); return; }
    const newItem: QRCodeItem = {
      id: Date.now().toString(), name: newQRName, url: 'https://g.page/bizzauto/review',
      scans: 0, reviews: 0, createdAt: new Date().toISOString().split('T')[0], status: 'active',
    };
    setQrCodes(prev => [...prev, newItem]);
    setShowCreateModal(false); setNewQRName('');
    toast.success('QR Code created!');
  };

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    toast.success('Rule updated');
  };

  const deleteQR = (id: string) => {
    setQrCodes(prev => prev.filter(q => q.id !== id));
    toast.success('QR Code deleted');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Star className="text-amber-500" /> Google Reviews QR
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Generate QR codes to collect more Google reviews automatically</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
          <Plus size={18} /> Create QR Code
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Scans', value: totalScans.toLocaleString(), icon: <QrCode size={20} className="text-amber-500" /> },
          { label: 'Reviews Collected', value: totalReviews.toLocaleString(), icon: <Star size={20} className="text-green-500" /> },
          { label: 'Conversion Rate', value: `${avgConversion}%`, icon: <BarChart3 size={20} className="text-blue-500" /> },
          { label: 'Active QR Codes', value: qrCodes.filter(q => q.status === 'active').length, icon: <Zap size={20} className="text-purple-500" /> },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'qr', label: 'QR Codes', icon: <QrCode size={16} /> },
          { id: 'auto-reply', label: 'Auto-Reply', icon: <MessageSquare size={16} /> },
          { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
          { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id as typeof view)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${view === tab.id ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* QR Codes View */}
      {view === 'qr' && (
        <div className="space-y-4">
          {qrCodes.map(qr => (
            <div key={qr.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${templates.find(t => t.id === selectedTemplate)?.bg} flex items-center justify-center`}>
                <QrCode size={32} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{qr.name}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${qr.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {qr.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">{qr.url}</p>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  <span>{qr.scans.toLocaleString()} scans</span>
                  <span>{qr.reviews} reviews</span>
                  <span>Created {qr.createdAt}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Download"><Download size={16} /></button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Copy Link"><Copy size={16} /></button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Preview"><Eye size={16} /></button>
                <button onClick={() => deleteQR(qr.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg" title="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Auto-Reply View */}
      {view === 'auto-reply' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="text-amber-500" size={20} />
              <h3 className="font-semibold">Auto-Reply Rules</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">AI automatically replies to reviews based on star rating. Negative reviews are handled privately.</p>
            {rules.map(rule => (
              <div key={rule.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-2">
                <button onClick={() => toggleRule(rule.id)} className={`mt-1 w-10 h-5 rounded-full transition-colors ${rule.enabled ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'} relative`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">Trigger: {rule.trigger}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{rule.reply}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics View */}
      {view === 'analytics' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-amber-500" /> Review Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
              <p className="text-3xl font-bold text-amber-600">4.7</p>
              <p className="text-xs text-gray-500 mt-1">Avg Rating</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-xl">
              <p className="text-3xl font-bold text-green-600">{totalReviews}</p>
              <p className="text-xs text-gray-500 mt-1">Total Reviews</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
              <p className="text-3xl font-bold text-blue-600">89%</p>
              <p className="text-xs text-gray-500 mt-1">5-Star Rate</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl">
              <p className="text-3xl font-bold text-purple-600">2h</p>
              <p className="text-xs text-gray-500 mt-1">Avg Reply Time</p>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-500">Recent Reviews</h4>
            {[
              { name: 'Priya S.', rating: 5, text: 'Amazing service! The team was very professional and helpful.', time: '2 hours ago', replied: true },
              { name: 'Rahul M.', rating: 5, text: 'Best experience ever. Highly recommended!', time: '5 hours ago', replied: true },
              { name: 'Amit K.', rating: 4, text: 'Good service, slightly slow but quality is excellent.', time: '1 day ago', replied: false },
            ].map((review, i) => (
              <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{review.name}</span>
                  <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />)}</div>
                  <span className="text-xs text-gray-500 ml-auto">{review.time}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{review.text}</p>
                {review.replied && <span className="text-xs text-green-600 dark:text-green-400 mt-1 inline-block">✓ Auto-replied</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings View */}
      {view === 'settings' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Settings size={20} className="text-amber-500" /> QR Code Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Review URL</label>
              <input type="text" defaultValue="https://g.page/bizzauto/review" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">QR Code Template</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {templates.map(t => (
                  <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                    className={`p-3 rounded-lg border-2 text-center ${selectedTemplate === t.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    <div className={`w-8 h-8 mx-auto rounded bg-gradient-to-br ${t.bg} flex items-center justify-center mb-1`}>
                      <QrCode size={16} style={{ color: t.color }} />
                    </div>
                    <span className="text-xs">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Redirect Negative Reviews To</label>
              <input type="text" defaultValue="https://forms.gle/feedback-form" placeholder="Google Form / Feedback URL" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <p className="text-xs text-gray-500 mt-1">Negative reviews (1-3 stars) will be redirected here instead of posting publicly</p>
            </div>
            <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Save Settings</button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Create New QR Code</h3>
            <input type="text" placeholder="QR Code Name (e.g. Main Entrance)" value={newQRName} onChange={e => setNewQRName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 mb-4" autoFocus />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={createQR} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
