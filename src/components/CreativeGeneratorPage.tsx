import React, { useState, useEffect, useRef } from 'react';
import {
  Download, Share2, Sparkles, Palette, Type, Image,
  Wand2, RefreshCw, Layout, Eye, Clock,
  Zap, Copy, Upload, X, MessageCircle, QrCode, Globe,
  Sliders, Paintbrush, Instagram, Star, Plus, Trash2,
  Bookmark, Save, Sun, Moon, Layers, Smile, Lightbulb,
  Hash, ChevronDown, GripVertical
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { postersAPI } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import html2canvas from 'html2canvas';

interface Template {
  id: string; name: string; emoji: string; gradient: string; category: string;
}

interface SavedPoster {
  id: string; name: string; createdAt: string; thumbnail?: string;
}

interface Sticker {
  id: string; emoji: string; x: number; y: number; size: number;
}

interface BrandKit {
  name: string; palette: number; font: number; businessName: string; phone: string;
}

interface LogoStyle {
  id: string; name: string; icon: string; gradient: string;
}

const COLOR_PALETTES = [
  { name: 'Sunset', colors: ['#FF6B35', '#F7931E', '#FFD700'] },
  { name: 'Ocean', colors: ['#0077B6', '#00B4D8', '#90E0EF'] },
  { name: 'Forest', colors: ['#2D6A4F', '#40916C', '#95D5B2'] },
  { name: 'Royal', colors: ['#7B2CBF', '#9D4EDD', '#C77DFF'] },
  { name: 'Cherry', colors: ['#D00000', '#E85D04', '#FFBA08'] },
  { name: 'Midnight', colors: ['#1B263B', '#415A77', '#778DA9'] },
  { name: 'Gold', colors: ['#BF953F', '#FCF6B5', '#B38728'] },
  { name: 'Neon', colors: ['#00F5D4', '#00BBF9', '#FEE440'] },
  { name: 'Rose', colors: ['#E0115F', '#FF69B4', '#FFB6C1'] },
  { name: 'Tricolor', colors: ['#FF9933', '#FFFFFF', '#138808'] },
];

const FONT_OPTIONS = [
  { name: 'Bold Sans', class: 'font-bold', family: "'Inter', sans-serif" },
  { name: 'Elegant', class: 'font-serif italic', family: "'Georgia', serif" },
  { name: 'Modern', class: 'font-light tracking-wider', family: "'Inter', sans-serif" },
  { name: 'Impact', class: 'font-black uppercase', family: "'Impact', sans-serif" },
  { name: 'Hindi', family: "'Noto Sans Devanagari', sans-serif" },
  { name: 'Poppins', class: 'font-semibold', family: "'Poppins', sans-serif" },
];

const FORMAT_OPTIONS = [
  { name: 'Square', desc: '1080×1080', ratio: 'aspect-square', width: 1080, height: 1080 },
  { name: 'Story', desc: '1080×1920', ratio: 'aspect-[9/16]', width: 1080, height: 1920 },
  { name: 'Landscape', desc: '1200×628', ratio: 'aspect-[16/9]', width: 1200, height: 628 },
];

const CATEGORIES = ['Festival', 'Offer', 'Product', 'Seasonal', 'Menu', 'Price List', 'Testimonial', 'Wedding', 'Birthday'];

const DEFAULT_TEMPLATES: Template[] = [
  { id: '1', name: 'Diwali Special', emoji: '🪔', gradient: 'from-orange-500 via-red-500 to-yellow-500', category: 'Festival' },
  { id: '2', name: 'Holi Colors', emoji: '🎨', gradient: 'from-pink-500 via-purple-500 to-blue-500', category: 'Festival' },
  { id: '3', name: 'Eid Mubarak', emoji: '🌙', gradient: 'from-emerald-500 via-teal-500 to-cyan-500', category: 'Festival' },
  { id: '4', name: 'Christmas', emoji: '🎄', gradient: 'from-red-600 via-green-600 to-red-700', category: 'Festival' },
  { id: '5', name: 'Pongal Wishes', emoji: '🌾', gradient: 'from-yellow-600 via-orange-500 to-red-500', category: 'Festival' },
  { id: '6', name: 'Flash Sale', emoji: '⚡', gradient: 'from-blue-600 via-indigo-600 to-purple-600', category: 'Offer' },
  { id: '7', name: 'Grand Opening', emoji: '🏪', gradient: 'from-amber-500 via-orange-500 to-red-500', category: 'Offer' },
  { id: '8', name: 'Buy 1 Get 1', emoji: '🎯', gradient: 'from-green-500 via-teal-500 to-cyan-500', category: 'Offer' },
  { id: '9', name: '50% Off', emoji: '🏷', gradient: 'from-pink-500 via-rose-500 to-red-500', category: 'Offer' },
  { id: '10', name: 'New Arrival', emoji: '🆕', gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', category: 'Product' },
  { id: '11', name: 'Best Seller', emoji: '🏆', gradient: 'from-amber-600 via-yellow-500 to-orange-500', category: 'Product' },
  { id: '12', name: 'Summer Deal', emoji: '☀', gradient: 'from-yellow-400 via-orange-400 to-red-400', category: 'Seasonal' },
  { id: '13', name: 'Monsoon Sale', emoji: '🌧', gradient: 'from-slate-500 via-blue-500 to-indigo-500', category: 'Seasonal' },
  { id: '14', name: 'Winter Collection', emoji: '❄', gradient: 'from-blue-300 via-indigo-400 to-purple-500', category: 'Seasonal' },
  { id: '15', name: 'Todays Special', emoji: '🍽', gradient: 'from-amber-600 via-orange-500 to-red-500', category: 'Menu' },
  { id: '16', name: 'Biryani Fest', emoji: '🍛', gradient: 'from-red-700 via-orange-600 to-yellow-500', category: 'Menu' },
  { id: '17', name: 'Pizza Offer', emoji: '🍕', gradient: 'from-green-600 via-yellow-500 to-red-500', category: 'Menu' },
  { id: '18', name: 'Price List', emoji: '📋', gradient: 'from-gray-600 via-slate-500 to-blue-600', category: 'Price List' },
  { id: '19', name: 'Rate Card', emoji: '💰', gradient: 'from-emerald-600 via-green-500 to-teal-500', category: 'Price List' },
  { id: '20', name: 'Customer Review', emoji: '⭐', gradient: 'from-purple-600 via-pink-500 to-rose-500', category: 'Testimonial' },
  { id: '21', name: 'Happy Clients', emoji: '😊', gradient: 'from-teal-500 via-cyan-500 to-blue-500', category: 'Testimonial' },
  { id: '22', name: 'Wedding Invite', emoji: '💍', gradient: 'from-pink-400 via-rose-400 to-red-400', category: 'Wedding' },
  { id: '23', name: 'Engagement', emoji: '💎', gradient: 'from-cyan-400 via-blue-400 to-indigo-400', category: 'Wedding' },
  { id: '24', name: 'Birthday Party', emoji: '🎂', gradient: 'from-pink-400 via-purple-400 to-indigo-400', category: 'Birthday' },
  { id: '25', name: 'Kids Party', emoji: '🎈', gradient: 'from-yellow-300 via-green-300 to-blue-300', category: 'Birthday' },
];

const LOGO_STYLES: LogoStyle[] = [
  { id: 'modern', name: 'Modern', icon: '🔷', gradient: 'from-blue-500 to-purple-500' },
  { id: 'classic', name: 'Classic', icon: '✨', gradient: 'from-amber-500 to-red-500' },
  { id: 'minimal', name: 'Minimal', icon: '⭕', gradient: 'from-gray-500 to-slate-500' },
  { id: 'playful', name: 'Playful', icon: '⭐', gradient: 'from-pink-500 to-yellow-500' },
  { id: 'nature', name: 'Nature', icon: '🌿', gradient: 'from-green-500 to-emerald-500' },
  { id: 'luxury', name: 'Luxury', icon: '👑', gradient: 'from-yellow-600 to-amber-700' },
];

const STICKERS = ['⭐', '🔥', '❤️', '✨', '🎉', '💥', '🎯', '✅', '🚀', '💰', '💎', '🏆', '🌟', '🎪', '🎨', '🛍️', '📱', '🎁', '💡', '📢', '🥇', '📣', '💫', '🎊'];

const AI_PROMPTS: Record<string, string[]> = {
  Festival: [
    'Diwali special offers with diya and rangoli theme',
    'Holi celebration with colorful powder splash',
    'Eid Mubarak greeting with crescent moon',
    'Christmas sale with Santa and snowflakes',
    'Pongal wishes with traditional kolam design',
    'Navratri special garba night event',
    'Ganesh Chaturthi festive offer',
    'New Year 2026 celebration party',
  ],
  Offer: [
    'Flash sale 50% off with countdown timer',
    'Buy 1 Get 1 free limited period offer',
    'Grand opening ceremony ribbon cutting',
    'Clearance sale up to 70% off',
    'Festival special combo offer',
    'First time customer discount 20%',
    'Loyalty reward points program',
    'Refer a friend and get ₹500 off',
  ],
  Product: [
    'New smartphone launch with specs',
    'Latest fashion collection arrivals',
    'Handmade jewelry showcase',
    'Organic food products natural theme',
    'Fitness equipment with health theme',
    'Home decor items interior design',
    'Beauty products with glamorous theme',
    'Electronics gadgets tech theme',
  ],
  Seasonal: [
    'Summer cooling products special',
    'Monsoon umbrella and raincoat sale',
    'Winter woolen collection launch',
    'Spring flower collection new arrivals',
    'Back to school supplies special',
  ],
  Menu: [
    'Todays special thali with items',
    'New biryani flavor launch',
    'Pizza combo with drinks deal',
    'Weekend buffet offer family pack',
    'Healthy smoothie bowl menu',
  ],
  Wedding: [
    'Wedding invitation card elegant',
    'Save the date announcement',
    'Engagement ceremony invite',
    'Wedding reception card design',
    'Mehendi function colorful invite',
  ],
  Birthday: [
    'Birthday party invitation fun',
    'Kids birthday theme party',
    'Surprise birthday celebration',
    'Milestone birthday 18th 21st 50th',
    'Birthday sale special discount',
  ],
};

const TEXT_COLORS = [
  { name: 'White', color: '#FFFFFF' },
  { name: 'Black', color: '#1A1A1A' },
  { name: 'Gold', color: '#FFD700' },
  { name: 'Red', color: '#FF4444' },
  { name: 'Blue', color: '#4488FF' },
  { name: 'Green', color: '#44DD66' },
  { name: 'Purple', color: '#AA44FF' },
  { name: 'Pink', color: '#FF69B4' },
];

const CreativeGeneratorPage: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [activeView, setActiveView] = useState<'create' | 'history'>('create');
  const [headline, setHeadline] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [selectedFormat, setSelectedFormat] = useState(0);
  const [selectedFont, setSelectedFont] = useState(0);
  const [selectedPalette, setSelectedPalette] = useState(0);
  const [category, setCategory] = useState('Festival');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [history, setHistory] = useState<SavedPoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiHeadlines, setAiHeadlines] = useState<string[]>([]);
  const [aiSubtitles, setAiSubtitles] = useState<string[]>([]);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [textSize, setTextSize] = useState(100);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [showQR, setShowQR] = useState(true);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [adminBackgrounds, setAdminBackgrounds] = useState<any[]>([]);
  const [showAdminBgPicker, setShowAdminBgPicker] = useState(false);
  const [showPremiumBadge, setShowPremiumBadge] = useState(true);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Image Filters
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, grayscale: 0, sepia: 0, blur: 0, saturate: 100 });
  const [showFilters, setShowFilters] = useState(false);

  // Text Effects
  const [textEffects, setTextEffects] = useState({ shadow: false, glow: false, outline: false, uppercase: false });

  // Stickers
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [showStickers, setShowStickers] = useState(false);
  const nextStickerId = useRef(0);

  // Brand Kit
  const [brandKits, setBrandKits] = useState<BrandKit[]>(() => {
    try { return JSON.parse(localStorage.getItem('brandKits') || '[]'); } catch { return []; }
  });
  const [showBrandKit, setShowBrandKit] = useState(false);

  // Logo Generator
  const [showLogoGen, setShowLogoGen] = useState(false);
  const [logoBusinessName, setLogoBusinessName] = useState('');
  const [logoSlogan, setLogoSlogan] = useState('');
  const [logoStyle, setLogoStyle] = useState(0);
  const [generatedLogo, setGeneratedLogo] = useState<string | null>(null);

  // AI Prompt Library
  const [showPrompts, setShowPrompts] = useState(false);

  // Active design tab
  const [activeDesignTab, setActiveDesignTab] = useState<'basic' | 'filters' | 'effects' | 'stickers'>('basic');

  const filterStyle = {
    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) blur(${filters.blur}px) saturate(${filters.saturate}%)`,
  };

  const getTextEffectStyle = (): React.CSSProperties => {
    const styles: React.CSSProperties = {};
    if (textEffects.shadow) {
      styles.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    }
    if (textEffects.glow) {
      styles.textShadow = '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.4)';
    }
    if (textEffects.outline) {
      styles.WebkitTextStroke = '1px rgba(0,0,0,0.6)';
      styles.textShadow = 'none';
    }
    return styles;
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProductImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeProductImage = () => setProductImage(null);

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBackgroundImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeBackground = () => setBackgroundImage(null);

  const addSticker = (emoji: string) => {
    setStickers(prev => [...prev, {
      id: `sticker-${nextStickerId.current++}`,
      emoji, x: 20 + Math.random() * 40, y: 20 + Math.random() * 40, size: 32,
    }]);
  };

  const removeSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  };

  const updateStickerPos = (id: string, x: number, y: number) => {
    setStickers(prev => prev.map(s => s.id === id ? { ...s, x, y } : s));
  };

  const saveBrandKit = () => {
    const kit: BrandKit = {
      name: businessName || 'My Brand',
      palette: selectedPalette,
      font: selectedFont,
      businessName,
      phone,
    };
    const updated = [...brandKits.filter(b => b.name !== kit.name), kit];
    setBrandKits(updated);
    localStorage.setItem('brandKits', JSON.stringify(updated));
    setShowBrandKit(false);
  };

  const loadBrandKit = (kit: BrandKit) => {
    setSelectedPalette(kit.palette);
    setSelectedFont(kit.font);
    setBusinessName(kit.businessName);
    setPhone(kit.phone);
  };

  const deleteBrandKit = (name: string) => {
    const updated = brandKits.filter(b => b.name !== name);
    setBrandKits(updated);
    localStorage.setItem('brandKits', JSON.stringify(updated));
  };

  const generateLogo = () => {
    if (!logoBusinessName.trim()) return;
    const style = LOGO_STYLES[logoStyle];
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 500, 500);
    if (style.id === 'modern') { grad.addColorStop(0, '#6366f1'); grad.addColorStop(1, '#8b5cf6'); }
    else if (style.id === 'classic') { grad.addColorStop(0, '#f59e0b'); grad.addColorStop(1, '#ef4444'); }
    else if (style.id === 'minimal') { grad.addColorStop(0, '#6b7280'); grad.addColorStop(1, '#1f2937'); }
    else if (style.id === 'playful') { grad.addColorStop(0, '#ec4899'); grad.addColorStop(1, '#f59e0b'); }
    else if (style.id === 'nature') { grad.addColorStop(0, '#22c55e'); grad.addColorStop(1, '#059669'); }
    else { grad.addColorStop(0, '#d97706'); grad.addColorStop(1, '#b45309'); }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 500, 500);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.fillText(logoBusinessName, 250, 230);
    if (logoSlogan) {
      ctx.font = '20px Inter, sans-serif';
      ctx.globalAlpha = 0.8;
      ctx.fillText(logoSlogan, 250, 290);
    }
    ctx.globalAlpha = 0.15;
    ctx.font = '120px sans-serif';
    ctx.fillText(style.icon, 420, 100);
    ctx.globalAlpha = style.id === 'minimal' ? 0.05 : 0.1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(50 + Math.random() * 400, 50 + Math.random() * 400, 2 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    setGeneratedLogo(canvas.toDataURL('image/png'));
  };

  const applyLogoToPreview = () => {
    if (generatedLogo) {
      setProductImage(generatedLogo);
      setProductName(logoBusinessName);
      setShowLogoGen(false);
    }
  };

  // Auto-fill business profile from user account
  const business = useAuthStore((s: any) => s.business);
  const user = useAuthStore((s: any) => s.user);

  useEffect(() => {
    if (business) {
      if (!businessName && business.name) setBusinessName(business.name);
      if (!phone && (business.phone || user?.phone)) setPhone(business.phone || user?.phone || '');
    }
  }, [business, user]);

  useEffect(() => {
    fetchTemplates();
    fetchHistory();
    fetchAdminBackgrounds();
  }, []);

  const fetchAdminBackgrounds = async () => {
    try {
      const res = await postersAPI.list(); // reuse posters API client
      try {
        const bgRes = await (await import('../lib/api')).default.get('/posters/backgrounds/active');
        if (bgRes.data?.success) setAdminBackgrounds(bgRes.data.data || []);
      } catch {}
    } catch {}
  };

  const fetchTemplates = async () => {
    try {
      const res = await postersAPI.list();
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setTemplates(data.map((t: any) => ({
          id: t.id, name: t.name,
          emoji: getEmojiForCategory(t.category),
          gradient: getGradientForCategory(t.category),
          category: t.category,
        })));
        setSelectedTemplate(DEFAULT_TEMPLATES[0]);
      }
    } catch {
      setTemplates(DEFAULT_TEMPLATES);
      setSelectedTemplate(DEFAULT_TEMPLATES[0]);
    } finally {
      setLoading(false);
    }
  };

  const getEmojiForCategory = (cat: string): string => {
    const map: Record<string, string> = { Festival: '🎉', Offer: '🎁', Product: '📦', Seasonal: '🌸', Testimonial: '⭐', Menu: '🍽', 'Price List': '💰', Wedding: '💍', Birthday: '🎂' };
    return map[cat] || '🎨';
  };
  const getGradientForCategory = (cat: string): string => {
    const map: Record<string, string> = { Festival: 'from-orange-500 via-red-500 to-yellow-500', Offer: 'from-blue-600 via-indigo-600 to-purple-600', Product: 'from-violet-500 via-purple-500 to-fuchsia-500', Seasonal: 'from-yellow-400 via-orange-400 to-red-400', Testimonial: 'from-green-500 via-teal-500 to-cyan-500', Menu: 'from-amber-500 via-orange-500 to-red-500', 'Price List': 'from-slate-500 via-blue-500 to-indigo-500', Wedding: 'from-pink-400 via-rose-400 to-red-400', Birthday: 'from-pink-400 via-purple-400 to-indigo-400' };
    return map[cat] || 'from-purple-500 to-pink-500';
  };

  const fetchHistory = async () => {
    try {
      const res = await postersAPI.list();
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) setHistory(data.map((item: any) => ({ id: item.id, name: item.name || 'Untitled', createdAt: item.createdAt || new Date().toISOString(), thumbnail: item.thumbnail })));
    } catch { setHistory([]); }
  };

  const filteredTemplates = templates.filter(t => t.category === category);

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await postersAPI.generate({ templateId: selectedTemplate?.id || '', userData: { headline, subtitle, businessName, phone } });
      if (res.data?.headline) setHeadline(res.data.headline);
      if (res.data?.subtitle) setSubtitle(res.data.subtitle);
      if (res.data?.headlines) setAiHeadlines(res.data.headlines);
      if (res.data?.subtitles) setAiSubtitles(res.data.subtitles);
    } catch {
      const h = language === 'hi'
        ? ['Biggest Sale Ever!', 'Festival Special!', 'New Collection!', 'Limited Time!', 'Exclusive Deal!']
        : ['Biggest Sale Ever!', 'Festival Special!', 'New Collection!', 'Limited Time!', 'Exclusive Deal!'];
      const s = language === 'hi' ? ['Shop Now', 'Limited Time', 'While Stocks Last'] : ['Shop Now', 'Limited Time', 'While Stocks Last'];
      setAiHeadlines(h);
      setAiSubtitles(s);
    } finally { setIsGenerating(false); }
  };

  const handleGenerateAIImage = async () => {
    setIsGeneratingImage(true);
    try {
      const res = await postersAPI.generate({ templateId: selectedTemplate?.id || '', userData: { headline, subtitle, businessName, phone, productName } });
      if (res.data?.url) setAiImageUrl(res.data.url);
    } catch { setAiImageUrl(null); }
    finally { setIsGeneratingImage(false); }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`*${headline || 'Check this!'}*\n${subtitle || ''}\n\n${businessName ? `🏪 ${businessName}` : ''}\n${phone ? `📞 ${phone}` : '' }`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleDownloadImage = async () => {
    if (!previewRef.current) return;
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const link = document.createElement('a');
      link.download = `poster-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch { if (aiImageUrl) window.open(aiImageUrl, '_blank'); }
  };

  const handleSave = async () => {
    try {
      const res = await postersAPI.create({
        templateId: selectedTemplate?.id || '', headline, subtitle, phone, businessName, productName,
        format: FORMAT_OPTIONS[selectedFormat].name, font: FONT_OPTIONS[selectedFont].name,
        palette: COLOR_PALETTES[selectedPalette].name, language,
      });
      if (res.data?.data) setHistory(prev => [{ id: res.data.data.id, name: headline || 'Untitled', createdAt: new Date().toISOString(), thumbnail: res.data.data.thumbnail }, ...prev]);
    } catch {
      setHistory(prev => [{ id: Date.now().toString(), name: headline || 'Untitled', createdAt: new Date().toISOString() }, ...prev]);
    }
  };

  const applyPrompt = (prompt: string) => {
    const parts = prompt.split(':');
    if (parts.length >= 2) {
      if (headline === '') setHeadline(parts[0].trim());
      if (subtitle === '') setSubtitle(parts.length > 1 ? parts.slice(1).join(':').trim() : '');
    } else {
      setHeadline(prompt);
    }
    setShowPrompts(false);
  };

  const getPaletteColors = () => COLOR_PALETTES[selectedPalette]?.colors || ['#6366f1', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="p-4 sm:p-5 md:p-6 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading creative studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 space-y-6 animate-fade-in-up max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Wand2 size={20} className="text-white" />
            </div>
            AI Creative Studio
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 ml-13 text-sm">Design stunning posters for your business</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(['create', 'history'] as const).map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === v ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
              {v === 'create' ? '✨ Create' : '📂 History'}
            </button>
          ))}
        </div>
      </div>

      {activeView === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ============ LEFT PANEL ============ */}
          <div className="lg:col-span-4 space-y-4">
            {/* AI Assistant */}
            <div className="modern-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-purple-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={handleAIGenerate} disabled={isGenerating}
                  className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50">
                  {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  {isGenerating ? '...' : 'AI Suggest'}
                </button>
                <button onClick={() => setShowAIPanel(!showAIPanel)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">
                  <Sparkles size={14} /> Headlines
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowPrompts(!showPrompts)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all">
                  <Lightbulb size={14} /> Prompts
                </button>
                <button onClick={() => setShowLogoGen(true)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-xl text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all">
                  <Star size={14} /> Logo
                </button>
              </div>
              {showAIPanel && (aiHeadlines.length > 0 || aiSubtitles.length > 0) && (
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                  {aiHeadlines.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Headlines</p>
                      {aiHeadlines.map((h, i) => (
                        <button key={i} onClick={() => { setHeadline(h); }}
                          className="w-full text-left px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300 transition-colors mb-1">{h}</button>
                      ))}
                    </div>
                  )}
                  {aiSubtitles.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Subtitles</p>
                      {aiSubtitles.map((s, i) => (
                        <button key={i} onClick={() => { setSubtitle(s); }}
                          className="w-full text-left px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300 transition-colors mb-1">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {showPrompts && (
                <div className="mt-3 max-h-64 overflow-y-auto space-y-1">
                  <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Lightbulb size={11} /> {category} Prompts</p>
                  {(AI_PROMPTS[category] || AI_PROMPTS['Offer']).map((p, i) => (
                    <button key={i} onClick={() => applyPrompt(p)}
                      className="w-full text-left px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-600 dark:text-gray-400 transition-colors">{p}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Templates */}
            <div className="modern-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Layout size={18} className="text-blue-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Templates</h3>
              </div>
              <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-thin">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${category === cat ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                    {getEmojiForCategory(cat)} {cat}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {filteredTemplates.map(t => (
                  <button key={t.id} onClick={() => setSelectedTemplate(t)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${selectedTemplate?.id === t.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                    <span className="text-2xl">{t.emoji}</span>
                    <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate w-full px-1 leading-tight text-center">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Design Options with Tabs */}
            <div className="modern-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Palette size={18} className="text-pink-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Design Studio</h3>
              </div>
              {/* Tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto">
                {(['basic', 'filters', 'effects', 'stickers'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveDesignTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${activeDesignTab === tab ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                    {tab === 'basic' && '🎨 Basic'}
                    {tab === 'filters' && '🔄 Filters'}
                    {tab === 'effects' && '✨ Effects'}
                    {tab === 'stickers' && '😊 Stickers'}
                  </button>
                ))}
              </div>

              {/* BASIC TAB */}
              {activeDesignTab === 'basic' && (
                <div>
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><Globe size={12} /> Language</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setLanguage('en')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${language === 'en' ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>English</button>
                      <button onClick={() => setLanguage('hi')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${language === 'hi' ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>हिन्दी</button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Format</label>
                    <div className="grid grid-cols-3 gap-2">
                      {FORMAT_OPTIONS.map((opt, i) => (
                        <button key={i} onClick={() => setSelectedFormat(i)}
                          className={`px-2 py-2 rounded-lg text-[10px] transition-all ${selectedFormat === i ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                          {opt.name}<br /><span className="opacity-70">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><Image size={12} /> Product Image</label>
                    {productImage ? (
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                        <img src={productImage} alt="Product" className="w-full h-28 object-cover" style={filterStyle} />
                        <button onClick={removeProductImage} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"><X size={12} /></button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20">
                        <Upload size={16} className="text-gray-400 mb-1" />
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Upload photo</p>
                        <input type="file" className="hidden" accept="image/*" onChange={handleProductImageUpload} />
                      </label>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><Image size={12} /> Background</label>
                    {backgroundImage ? (
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                        <img src={backgroundImage} alt="BG" className="w-full h-16 object-cover" />
                        <button onClick={removeBackground} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <label className="flex-1 flex items-center justify-center h-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-purple-500">
                          <Upload size={14} className="text-gray-400 mr-1" />
                          <span className="text-[10px] text-gray-500">Upload</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleBackgroundUpload} />
                        </label>
                        {adminBackgrounds.length > 0 && (
                          <button onClick={() => setShowAdminBgPicker(!showAdminBgPicker)}
                            className="flex items-center gap-1 px-3 h-12 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-[10px] font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all">
                            <Image size={14} /> Admin
                          </button>
                        )}
                      </div>
                    )}
                    {showAdminBgPicker && adminBackgrounds.length > 0 && (
                      <div className="mt-2 grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        {adminBackgrounds.map((bg: any) => (
                          <button key={bg.id} onClick={() => { setBackgroundImage(bg.imageUrl); setShowAdminBgPicker(false); }}
                            className="aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-500 transition-all bg-gray-100">
                            <img src={bg.imageUrl} alt={bg.name} className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {productImage && (
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Product Name</label>
                      <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Enter product name"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block"><Type size={12} className="inline mr-1" />Font</label>
                    <div className="grid grid-cols-2 gap-2">
                      {FONT_OPTIONS.map((opt, i) => (
                        <button key={i} onClick={() => setSelectedFont(i)}
                          className={`px-2 py-1.5 rounded-lg text-xs transition-all ${selectedFont === i ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                          style={{ fontFamily: opt.family }}>{opt.name}</button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><Sliders size={12} /> Size: {textSize}%</label>
                    <input type="range" min="60" max="150" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer accent-purple-500" />
                  </div>
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><Paintbrush size={12} /> Text Color</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {TEXT_COLORS.map((c, i) => (
                        <button key={i} onClick={() => setTextColor(c.color)}
                          className={`w-7 h-7 rounded-lg transition-all ${textColor === c.color ? 'ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-gray-800' : ''}`}
                          style={{ backgroundColor: c.color, border: c.color === '#FFFFFF' ? '1px solid #ccc' : 'none' }} title={c.name} />
                      ))}
                      <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600" title="Custom" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Color Palette</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {COLOR_PALETTES.map((p, i) => (
                        <button key={i} onClick={() => setSelectedPalette(i)}
                          className={`h-8 rounded-lg transition-all ${selectedPalette === i ? 'ring-2 ring-purple-500' : ''}`}
                          style={{ background: `linear-gradient(135deg, ${p.colors.join(', ')})` }} title={p.name} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button onClick={() => setShowQR(!showQR)} className={`w-9 h-4.5 rounded-full transition-all ${showQR ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all ${showQR ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1"><QrCode size={11} /> QR</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button onClick={() => setShowPremiumBadge(!showPremiumBadge)} className={`w-9 h-4.5 rounded-full transition-all ${showPremiumBadge ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all ${showPremiumBadge ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">⭐ Badge</span>
                    </label>
                  </div>
                  {/* Brand Kit */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1"><Bookmark size={11} /> Brand Kit</label>
                      <button onClick={() => setShowBrandKit(!showBrandKit)} className="text-[10px] text-purple-500 hover:text-purple-600">{showBrandKit ? 'Close' : 'Manage'}</button>
                    </div>
                    {showBrandKit && (
                      <div>
                        <div className="flex gap-2 mb-2">
                          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Brand name"
                            className="flex-1 px-2 py-1 text-[10px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                          <button onClick={saveBrandKit} className="px-2 py-1 bg-purple-500 text-white rounded-lg text-[10px] font-medium hover:bg-purple-600 flex items-center gap-1"><Save size={10} /> Save</button>
                        </div>
                        {brandKits.length > 0 && (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {brandKits.map((kit, i) => (
                              <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2 py-1">
                                <button onClick={() => loadBrandKit(kit)} className="text-[10px] text-gray-700 dark:text-gray-300 hover:text-purple-500 truncate flex-1 text-left">{kit.name}</button>
                                <button onClick={() => deleteBrandKit(kit.name)} className="text-red-400 hover:text-red-500"><Trash2 size={10} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FILTERS TAB */}
              {activeDesignTab === 'filters' && productImage && (
                <div className="space-y-3">
                  <div><label className="text-[10px] text-gray-500">Brightness: {filters.brightness}%</label><input type="range" min="0" max="200" value={filters.brightness} onChange={(e) => setFilters(f => ({ ...f, brightness: Number(e.target.value) }))} className="w-full h-1 accent-purple-500" /></div>
                  <div><label className="text-[10px] text-gray-500">Contrast: {filters.contrast}%</label><input type="range" min="0" max="200" value={filters.contrast} onChange={(e) => setFilters(f => ({ ...f, contrast: Number(e.target.value) }))} className="w-full h-1 accent-purple-500" /></div>
                  <div><label className="text-[10px] text-gray-500">Saturate: {filters.saturate}%</label><input type="range" min="0" max="200" value={filters.saturate} onChange={(e) => setFilters(f => ({ ...f, saturate: Number(e.target.value) }))} className="w-full h-1 accent-purple-500" /></div>
                  <div><label className="text-[10px] text-gray-500">Grayscale: {filters.grayscale}%</label><input type="range" min="0" max="100" value={filters.grayscale} onChange={(e) => setFilters(f => ({ ...f, grayscale: Number(e.target.value) }))} className="w-full h-1 accent-purple-500" /></div>
                  <div><label className="text-[10px] text-gray-500">Sepia: {filters.sepia}%</label><input type="range" min="0" max="100" value={filters.sepia} onChange={(e) => setFilters(f => ({ ...f, sepia: Number(e.target.value) }))} className="w-full h-1 accent-purple-500" /></div>
                  <div><label className="text-[10px] text-gray-500">Blur: {filters.blur}px</label><input type="range" min="0" max="10" step="0.5" value={filters.blur} onChange={(e) => setFilters(f => ({ ...f, blur: Number(e.target.value) }))} className="w-full h-1 accent-purple-500" /></div>
                  <button onClick={() => setFilters({ brightness: 100, contrast: 100, grayscale: 0, sepia: 0, blur: 0, saturate: 100 })}
                    className="w-full py-1.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Reset Filters</button>
                </div>
              )}
              {activeDesignTab === 'filters' && !productImage && (
                <p className="text-xs text-gray-400 text-center py-4 sm:py-5 md:py-6">Upload a product image to apply filters</p>
              )}

              {/* EFFECTS TAB */}
              {activeDesignTab === 'effects' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <button onClick={() => setTextEffects(e => ({ ...e, shadow: !e.shadow }))}
                      className={`w-9 h-4.5 rounded-full transition-all ${textEffects.shadow ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all ${textEffects.shadow ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-xs text-gray-700 dark:text-gray-300">Drop Shadow</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <button onClick={() => setTextEffects(e => ({ ...e, glow: !e.glow }))}
                      className={`w-9 h-4.5 rounded-full transition-all ${textEffects.glow ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all ${textEffects.glow ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-xs text-gray-700 dark:text-gray-300">Glow Effect</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <button onClick={() => setTextEffects(e => ({ ...e, outline: !e.outline }))}
                      className={`w-9 h-4.5 rounded-full transition-all ${textEffects.outline ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all ${textEffects.outline ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-xs text-gray-700 dark:text-gray-300">Text Outline</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <button onClick={() => setTextEffects(e => ({ ...e, uppercase: !e.uppercase }))}
                      className={`w-9 h-4.5 rounded-full transition-all ${textEffects.uppercase ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all ${textEffects.uppercase ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-xs text-gray-700 dark:text-gray-300">UPPERCASE</span>
                  </label>
                </div>
              )}

              {/* STICKERS TAB */}
              {activeDesignTab === 'stickers' && (
                <div>
                  {stickers.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-medium text-gray-500 mb-1">Added ({stickers.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {stickers.map(s => (
                          <button key={s.id} onClick={() => removeSticker(s.id)}
                            className="text-lg bg-gray-100 dark:bg-gray-700 rounded-lg px-1.5 py-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors relative group">
                            {s.emoji}
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={8} /></span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] font-medium text-gray-500 mb-2">Tap to add stickers</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {STICKERS.map((s, i) => (
                      <button key={i} onClick={() => addSticker(s)}
                        className="aspect-square text-lg bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:scale-110 transition-all flex items-center justify-center">{s}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ============ RIGHT PANEL - PREVIEW ============ */}
          <div className="lg:col-span-8 space-y-4">
            {/* Preview */}
            <div className="modern-card rounded-2xl p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Eye size={18} className="text-gray-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Preview</h3>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button onClick={handleWhatsAppShare} className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="WhatsApp"><MessageCircle size={15} className="text-green-500" /></button>
                  <button onClick={() => window.open('https://www.instagram.com/', '_blank')} className="p-2 hover:bg-pink-100 dark:hover:bg-pink-900/30 rounded-lg transition-colors" title="Instagram"><Instagram size={15} className="text-pink-500" /></button>
                  <button onClick={handleDownloadImage} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Download PNG"><Download size={15} className="text-gray-500" /></button>
                  <button onClick={handleSave} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">Save</button>
                </div>
              </div>

              {/* Poster Preview Canvas */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 md:p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[400px] md:min-h-[500px]">
                {selectedTemplate ? (
                  <div ref={previewRef}
                    className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ${FORMAT_OPTIONS[selectedFormat].ratio} relative select-none`}
                    style={{
                      background: backgroundImage
                        ? `url(${backgroundImage}) center/cover no-repeat`
                        : `linear-gradient(135deg, ${getPaletteColors().join(', ')})`,
                    }}
                  >
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/25" />

                    {/* Premium Badge */}
                    {showPremiumBadge && (
                      <div className="absolute top-3 right-3 z-20">
                        <div className="px-2.5 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-[10px] font-bold rounded-full shadow-lg flex items-center gap-1">⭐ PREMIUM</div>
                      </div>
                    )}

                    {/* Stickers */}
                    {stickers.map(s => (
                      <div key={s.id}
                        className="absolute z-10 cursor-grab active:cursor-grabbing"
                        style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: `${s.size}px` }}
                        draggable
                        onDragEnd={(e) => {
                          const rect = previewRef.current?.getBoundingClientRect();
                          if (rect) {
                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                            updateStickerPos(s.id, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
                          }
                        }}
                      >
                        {s.emoji}
                      </div>
                    ))}

                    {/* Content */}
                    <div className="relative z-10 p-5 md:p-7 flex flex-col items-center justify-center h-full text-center">
                      {/* Product Image with Filters */}
                      {productImage ? (
                        <div className="mb-3 w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden border-3 border-white/30 shadow-xl">
                          <img src={productImage} alt={productName} className="w-full h-full object-cover" style={filterStyle} />
                        </div>
                      ) : (
                        <div className="text-3xl sm:text-4xl md:text-6xl mb-3 drop-shadow-lg">{selectedTemplate.emoji}</div>
                      )}

                      {productName && productImage && (
                        <p className="text-white/80 text-xs font-medium mb-1.5 drop-shadow-md"
                          style={{ fontFamily: FONT_OPTIONS[selectedFont].family }}>{productName}</p>
                      )}

                      <h2 className="font-bold leading-tight drop-shadow-md px-2"
                        style={{
                          fontSize: `${textSize * 0.26}px`,
                          color: textColor,
                          fontFamily: FONT_OPTIONS[selectedFont].family,
                          textTransform: textEffects.uppercase ? 'uppercase' : 'none',
                          ...getTextEffectStyle(),
                        }}
                      >
                        {headline || 'Your Headline'}
                      </h2>

                      <p className="mt-1.5 opacity-90 drop-shadow-md px-2 max-w-xs"
                        style={{
                          fontSize: `${textSize * 0.15}px`,
                          color: textColor,
                          fontFamily: FONT_OPTIONS[selectedFont].family,
                          textTransform: textEffects.uppercase ? 'uppercase' : 'none',
                        }}
                      >
                        {subtitle || 'Your subtitle goes here'}
                      </p>

                      <div className="mt-auto pt-3 w-full px-3">
                        <div className="border-t border-white/20 pt-2.5 flex items-center justify-between">
                          <div className="text-left">
                            <p className="font-semibold text-xs drop-shadow-md"
                              style={{ color: textColor, fontFamily: FONT_OPTIONS[selectedFont].family }}>
                              {businessName || (language === 'hi' ? 'à¤µà¥à¤¯à¤µà¤¸à¤¾à¤¯' : 'Business Name')}
                            </p>
                            <p className="text-[11px] opacity-80 drop-shadow-md" style={{ color: textColor }}>{phone || '+91 XXXXX XXXXX'}</p>
                          </div>
                          {showQR && phone?.replace(/\D/g, '').length >= 10 && (
                            <div className="bg-white rounded-xl p-1.5 shadow-lg flex-shrink-0">
                              <QRCodeSVG value={`https://wa.me/91${phone.replace(/\D/g, '').slice(-10)}`} size={44} level="M" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500"><Layout size={48} className="mx-auto mb-4 opacity-50" /><p>Select a template</p></div>
                )}
              </div>

              {/* AI Image Gen */}
              <div className="mt-3 flex justify-end">
                <button onClick={handleGenerateAIImage} disabled={isGeneratingImage}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${aiImageUrl ? 'bg-green-500/20 text-green-600 hover:bg-green-500/30' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25'}`}>
                  {isGeneratingImage ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                  {isGeneratingImage ? 'Generating...' : aiImageUrl ? '✨ Regenerate' : '🚀 Generate AI Poster'}
                </button>
              </div>
            </div>

            {/* Content Inputs */}
            <div className="modern-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Type size={18} className="text-indigo-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Content</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{'Headline'}</label>
                  <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder='Enter headline...'
                    style={{ fontFamily: language === 'hi' ? "'Noto Sans Devanagari', sans-serif" : 'inherit' }} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{language === 'hi' ? 'à¤‰à¤ªà¤¶à¥€à¤°à¥à¤·à¤•' : 'Subtitle'}</label>
                  <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder={language === 'hi' ? 'à¤‰à¤ªà¤¶à¥€à¤°à¥à¤·à¤• à¤²à¤¿à¤–à¥‡à¤‚...' : 'Enter subtitle...'}
                    style={{ fontFamily: language === 'hi' ? "'Noto Sans Devanagari', sans-serif" : 'inherit' }} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{language === 'hi' ? 'à¤µà¥à¤¯à¤µà¤¸à¤¾à¤¯ à¤•à¤¾ à¤¨à¤¾à¤®' : 'Business Name'}</label>
                    <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder={language === 'hi' ? 'à¤µà¥à¤¯à¤µà¤¸à¤¾à¤¯ à¤•à¤¾ à¤¨à¤¾à¤®...' : 'Business name...'} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{language === 'hi' ? 'à¤«à¤¼à¥‹à¤¨ à¤¨à¤‚à¤¬à¤°' : 'Phone'}</label>
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="+91 XXXXX XXXXX" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History View */
        <div className="modern-card rounded-2xl p-4 sm:p-5 md:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📂 Saved Posters</h3>
          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Image size={48} className="mx-auto mb-4 opacity-30" />
              <p>{'No saved posters yet'}</p>
              <p className="text-sm mt-1">{'Create your first poster'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {history.map(item => (
                <div key={item.id} className="group relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
                      <Image size={32} className="text-purple-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={handleDownloadImage} className="p-2 bg-white rounded-lg hover:bg-gray-100"><Download size={16} className="text-gray-900" /></button>
                    <button onClick={handleWhatsAppShare} className="p-2 bg-white rounded-lg hover:bg-gray-100"><MessageCircle size={16} className="text-gray-900" /></button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-white text-xs truncate">{item.name}</p>
                    <p className="text-white/70 text-[10px]">{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ LOGO GENERATOR MODAL ============ */}
      {showLogoGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowLogoGen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 md:p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Star size={20} className="text-yellow-500" /> AI Logo Generator</h3>
              <button onClick={() => setShowLogoGen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Business Name</label>
                <input type="text" value={logoBusinessName} onChange={(e) => setLogoBusinessName(e.target.value)}
                  placeholder="Enter your business name"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Slogan (optional)</label>
                <input type="text" value={logoSlogan} onChange={(e) => setLogoSlogan(e.target.value)}
                  placeholder="Your tagline"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {LOGO_STYLES.map((style, i) => (
                    <button key={style.id} onClick={() => setLogoStyle(i)}
                      className={`p-3 rounded-xl text-center transition-all ${logoStyle === i ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                      <div className={`text-2xl bg-gradient-to-br ${style.gradient} bg-clip-text text-transparent`}>{style.icon}</div>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">{style.name}</p>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={generateLogo}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-2">
                <Wand2 size={16} /> Generate Logo
              </button>
              {generatedLogo && (
                <div className="text-center space-y-3">
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 mx-auto max-w-[200px]">
                    <img src={generatedLogo} alt="Generated Logo" className="w-full" />
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button onClick={applyLogoToPreview}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600">Use on Poster</button>
                    <button onClick={() => { const l = document.createElement('a'); l.download = 'logo.png'; l.href = generatedLogo; l.click(); }}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1"><Download size={14} /> Download</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreativeGeneratorPage;
