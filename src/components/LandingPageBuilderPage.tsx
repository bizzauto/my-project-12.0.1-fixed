import { useState } from 'react';
import { useToast } from '../components/Toast';
import { Layout, Plus, Edit, Eye, Trash2, Globe, Palette, Code, Smartphone, Monitor, ArrowRight } from 'lucide-react';

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'published';
  views: number;
  conversions: number;
  createdAt: string;
}

const blocks = [
  { type: 'hero', name: 'Hero Section', icon: '🎯' },
  { type: 'features', name: 'Features Grid', icon: '✨' },
  { type: 'testimonials', name: 'Testimonials', icon: '💬' },
  { type: 'pricing', name: 'Pricing Table', icon: '💰' },
  { type: 'cta', name: 'Call to Action', icon: '📢' },
  { type: 'form', name: 'Lead Form', icon: '📝' },
  { type: 'faq', name: 'FAQ Accordion', icon: '❓' },
  { type: 'contact', name: 'Contact Info', icon: '📞' },
];

export default function LandingPageBuilderPage() {
  const toast = useToast();
  const [pages, setPages] = useState<LandingPage[]>([
    { id: '1', name: 'Summer Sale 2026', slug: 'summer-sale', status: 'published', views: 3420, conversions: 156, createdAt: '2026-05-20' },
    { id: '2', name: 'Product Demo', slug: 'product-demo', status: 'draft', views: 0, conversions: 0, createdAt: '2026-06-01' },
  ]);
  const [editing, setEditing] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>(['hero', 'features', 'cta']);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const addBlock = (type: string) => {
    if (!selectedBlocks.includes(type)) {
      setSelectedBlocks(prev => [...prev, type]);
      toast.success('Block added!');
    }
  };

  const removeBlock = (type: string) => {
    setSelectedBlocks(prev => prev.filter(b => b !== type));
  };

  const publishPage = () => {
    toast.success('Landing page published!');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Layout className="text-pink-600" /> Landing Page Builder
          </h1>
          <p className="text-gray-600 mt-1">Drag-and-drop builder for high-converting pages</p>
        </div>
        <button onClick={() => setEditing(!editing)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg">
          {editing ? <Eye size={18} /> : <Edit size={18} />}
          {editing ? 'Preview' : 'Edit'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Block Palette */}
        {editing && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Add Blocks</h3>
            <div className="space-y-2">
              {blocks.map((block) => (
                <button key={block.type} onClick={() => addBlock(block.type)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-pink-50 text-sm text-left">
                  <span>{block.icon}</span> {block.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className={`${editing ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Device Toggle */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
              <div className="flex gap-2">
                <button onClick={() => setPreviewMode('desktop')}
                  className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-white shadow-sm' : ''}`}><Monitor size={16} /></button>
                <button onClick={() => setPreviewMode('mobile')}
                  className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-white shadow-sm' : ''}`}><Smartphone size={16} /></button>
              </div>
              <span className="text-xs text-gray-500">Preview</span>
            </div>

            {/* Page Preview */}
            <div className={`mx-auto ${previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'} p-0`}>
              {selectedBlocks.includes('hero') && (
                <div className="bg-gradient-to-br from-pink-500 to-purple-600 text-white p-8 text-center">
                  <h2 className="text-2xl font-bold mb-2">Summer Sale is Live!</h2>
                  <p className="text-white/80 mb-4">Up to 50% off on all products</p>
                  <button className="px-6 py-2 bg-white text-pink-600 rounded-full font-semibold">Shop Now →</button>
                </div>
              )}
              {selectedBlocks.includes('features') && (
                <div className="p-6 grid grid-cols-3 gap-4">
                  {['Free Shipping', 'Easy Returns', '24/7 Support'].map((f, i) => (
                    <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl mb-2">✅</div>
                      <div className="text-xs font-medium text-gray-700">{f}</div>
                    </div>
                  ))}
                </div>
              )}
              {selectedBlocks.includes('testimonials') && (
                <div className="p-6 bg-gray-50">
                  <div className="text-center font-semibold mb-4">What Our Customers Say</div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-600 italic">"Great product! Loved the quality."</p>
                    <div className="text-xs text-gray-400 mt-2">- Priya S.</div>
                  </div>
                </div>
              )}
              {selectedBlocks.includes('cta') && (
                <div className="bg-pink-50 p-6 text-center">
                  <h3 className="font-bold text-lg mb-2">Ready to Get Started?</h3>
                  <p className="text-sm text-gray-600 mb-4">Join 10,000+ happy customers</p>
                  <button className="px-6 py-2 bg-pink-600 text-white rounded-lg">Sign Up Free</button>
                </div>
              )}
              {selectedBlocks.includes('form') && (
                <div className="p-6">
                  <div className="bg-white border rounded-lg p-4 max-w-sm mx-auto">
                    <div className="text-sm font-semibold mb-3">Get a Free Quote</div>
                    <input className="w-full px-3 py-2 border rounded text-sm mb-2" placeholder="Name" />
                    <input className="w-full px-3 py-2 border rounded text-sm mb-2" placeholder="Phone" />
                    <button className="w-full py-2 bg-pink-600 text-white rounded text-sm">Submit</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pages List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center justify-between">
            My Pages
            <button className="text-pink-600"><Plus size={16} /></button>
          </h3>
          <div className="space-y-2">
            {pages.map((page) => (
              <div key={page.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{page.name}</div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    page.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                  }`}>{page.status}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">/{page.slug}</div>
                {page.status === 'published' && (
                  <div className="flex gap-3 mt-2 text-xs text-gray-500">
                    <span>👁 {page.views}</span>
                    <span>🎯 {page.conversions}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={publishPage}
            className="w-full mt-3 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700">
            Publish Page
          </button>
        </div>
      </div>
    </div>
  );
}