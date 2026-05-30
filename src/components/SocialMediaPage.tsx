import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Plus, Image, Zap, Send, Clock, MoreVertical,
  BarChart3, TrendingUp, Eye, Heart, MessageCircle, Share2,
  Edit3, Trash2, Copy, CheckCircle, XCircle, Filter,
  ChevronLeft, ChevronRight, Settings, RefreshCw,
  Instagram, Upload, Loader2, Plug, Unplug, Camera, Film, ImagePlus
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RT,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { postsAPI, instagramAPI } from '../lib/api';
import { useAuthStore } from '../lib/authStore';

// Types
interface SocialPost {
  id: string;
  content: string;
  platforms: string[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledAt?: string;
  publishedAt?: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
}

const platforms = [
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-600', textColor: 'text-blue-600', bgLight: 'bg-blue-50 dark:bg-blue-900/30' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-pink-600', textColor: 'text-pink-600', bgLight: 'bg-pink-50 dark:bg-pink-900/30' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-700', textColor: 'text-blue-700', bgLight: 'bg-blue-50 dark:bg-blue-900/30' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: 'bg-black', textColor: 'text-gray-900 dark:text-white', bgLight: 'bg-gray-50 dark:bg-gray-700' },
  { id: 'youtube', name: 'YouTube', icon: '📺', color: 'bg-red-600', textColor: 'text-red-600', bgLight: 'bg-red-50 dark:bg-red-900/30' },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', icon: <Edit3 size={12} /> },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400', icon: <Clock size={12} /> },
  published: { label: 'Published', color: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400', icon: <CheckCircle size={12} /> },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400', icon: <XCircle size={12} /> },
};

// Stat card component
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; change: string; positive: boolean; color: string }> = ({ icon, label, value, change, positive, color }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-5 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className={`p-1.5 sm:p-2.5 rounded-lg ${colorMap[color]}`}>{icon}</div>
        <span className={`text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${positive ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
          {change}
        </span>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
};

const SocialMediaPage: React.FC = () => {
  const { isDemoMode } = useAuthStore();
  const [activeView, setActiveView] = useState<'dashboard' | 'compose' | 'calendar' | 'analytics'>('dashboard');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeContent, setComposeContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram']);
  const [scheduleDate, setScheduleDate] = useState('');
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  // Instagram-specific state
  const [igStatus, setIgStatus] = useState<{ connected: boolean; accountInfo?: any } | null>(null);
  const [showIgConnectModal, setShowIgConnectModal] = useState(false);
  const [igConnectForm, setIgConnectForm] = useState({ igUserId: '', igAccessToken: '' });
  const [igConnecting, setIgConnecting] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<Array<{ url: string; type: string; file?: File; previewUrl: string }>>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [publishingToIg, setPublishingToIg] = useState(false);
  const [publishProgress, setPublishProgress] = useState<string>('');

  // Demo mode data
  const demoPosts: SocialPost[] = [
    {
      id: '1',
      content: '🚀 Exciting news! We are launching our new product next week. Stay tuned for updates! #Launch #NewProduct',
      platforms: ['facebook', 'instagram', 'linkedin'],
      status: 'published',
      publishedAt: '2024-01-15T10:30:00Z',
      likes: 245,
      comments: 32,
      shares: 18,
      reach: 12500,
    },
    {
      id: '2',
      content: '📢 Special offer: Get 20% off on all services this weekend only! Limited time offer. #SpecialOffer #WeekendSale',
      platforms: ['facebook', 'instagram'],
      status: 'scheduled',
      scheduledAt: '2024-01-20T09:00:00Z',
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
    },
    {
      id: '3',
      content: '💡 Did you know? Our platform helps businesses automate their workflows and save up to 10 hours per week! #Productivity #Automation',
      platforms: ['linkedin', 'twitter'],
      status: 'published',
      publishedAt: '2024-01-12T14:00:00Z',
      likes: 89,
      comments: 15,
      shares: 24,
      reach: 8200,
    },
    {
      id: '4',
      content: '🎉 Thank you to our amazing customers! We reached 10,000 users today! #Milestone #ThankYou',
      platforms: ['facebook', 'instagram', 'twitter'],
      status: 'draft',
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
    },
    {
      id: '5',
      content: '📸 Behind the scenes: Our team working hard to bring you the best features! #TeamWork #BehindTheScenes',
      platforms: ['instagram'],
      status: 'published',
      publishedAt: '2024-01-10T16:45:00Z',
      likes: 312,
      comments: 45,
      shares: 12,
      reach: 9800,
    },
  ];

  // Demo platform stats
  const platformStats = [
    { platform: 'Facebook', icon: '📘', posts: 45, followers: 12500, engagement: 4.8 },
    { platform: 'Instagram', icon: '📷', posts: 38, followers: 8900, engagement: 5.2 },
    { platform: 'LinkedIn', icon: '💼', posts: 28, followers: 4200, engagement: 3.9 },
    { platform: 'Twitter/X', icon: '🐦', posts: 26, followers: 3100, engagement: 4.1 },
    { platform: 'YouTube', icon: '📺', posts: 15, followers: 5600, engagement: 6.8 },
  ];

  // Demo analytics data
  const engagementData = [
    { name: 'Mon', likes: 245, comments: 32, shares: 18 },
    { name: 'Tue', likes: 312, comments: 45, shares: 24 },
    { name: 'Wed', likes: 189, comments: 28, shares: 15 },
    { name: 'Thu', likes: 278, comments: 38, shares: 21 },
    { name: 'Fri', likes: 356, comments: 52, shares: 32 },
    { name: 'Sat', likes: 198, comments: 25, shares: 16 },
    { name: 'Sun', likes: 145, comments: 18, shares: 12 },
  ];

  const platformDistribution = [
    { name: 'Facebook', value: 45, color: '#3B82F6' },
    { name: 'Instagram', value: 38, color: '#EC4899' },
    { name: 'LinkedIn', value: 28, color: '#0A66C2' },
    { name: 'Twitter/X', value: 26, color: '#000000' },
    { name: 'YouTube', value: 15, color: '#EF4444' },
  ];

  const fetchPosts = useCallback(async () => {
    setLoading(true);

    // If in demo mode, use mock data
    if (isDemoMode) {
      setPosts(demoPosts);
      setLoading(false);
      return;
    }

    try {
      const res = await postsAPI.list();
      if (res.data.success) {
        const data = (res.data.data?.posts || []).map((p: any) => ({
          id: p.id,
          content: p.content || '',
          platforms: p.platforms || [],
          status: p.status || 'draft',
          scheduledAt: p.scheduledAt || undefined,
          publishedAt: p.publishedAt || undefined,
          image: p.mediaUrls?.[0] || undefined,
          likes: p.likes || 0,
          comments: p.comments || 0,
          shares: p.shares || 0,
          reach: p.reach || 0,
        }));
        setPosts(data);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    fetchPosts();

    // Check Instagram connection status
    if (!isDemoMode) {
      instagramAPI.getStatus().then(res => {
        if (res.data.success) {
          setIgStatus(res.data.data);
        }
      }).catch(() => {});
    }
  }, [fetchPosts, isDemoMode]);

  const showToast = (message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredPosts = posts.filter(p => filterStatus === 'all' || p.status === filterStatus);

  const handleCreatePost = async () => {
    if (!composeContent.trim()) return;
    try {
      const res = await postsAPI.create({
        content: composeContent,
        platforms: selectedPlatforms,
        scheduledAt: scheduleDate || undefined,
      });
      if (res.data.success) {
        // If Instagram is selected and media was uploaded, attach media URLs to the post
        if (selectedPlatforms.includes('instagram') && uploadedMedia.length > 0) {
          await postsAPI.update(res.data.data.id, {
            mediaUrls: uploadedMedia.map(m => m.url),
          });
          setUploadedMedia([]);
        }
        fetchPosts();
        setComposeContent('');
        setSelectedPlatforms(['facebook', 'instagram']);
        setScheduleDate('');
        setShowComposeModal(false);
        showToast('Post created successfully!');
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      showToast('Failed to create post', 'error');
    }
  };

  const deletePost = async (id: string) => {
    try {
      await postsAPI.delete(id);
      setPosts(posts.filter(p => p.id !== id));
      showToast('Post deleted');
    } catch (error) {
      console.error('Failed to delete post:', error);
      showToast('Failed to delete post', 'error');
    }
  };

  const duplicatePost = (post: SocialPost) => {
    const dup = { ...post, id: Date.now().toString(), status: 'draft' as const, likes: 0, comments: 0, shares: 0, reach: 0 };
    setPosts([dup, ...posts]);
    showToast('Post duplicated as draft');
  };

  // Instagram: Upload media
  const handleIgMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('media', files[i]);
    }

    try {
      const res = await instagramAPI.uploadMedia(formData);
      if (res.data.success) {
        const newMedia = res.data.data.media.map((m: any, i: number) => ({
          url: m.url,
          type: m.type,
          previewUrl: URL.createObjectURL(files[i]),
        }));
        setUploadedMedia(prev => [...prev, ...newMedia]);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to upload media', 'error');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Instagram: Remove uploaded media
  const removeIgMedia = (index: number) => {
    setUploadedMedia(prev => {
      const item = prev[index];
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Instagram: Connect account
  const handleIgConnect = async () => {
    if (!igConnectForm.igUserId || !igConnectForm.igAccessToken) {
      showToast('Please enter Instagram User ID and Access Token', 'error');
      return;
    }
    setIgConnecting(true);
    try {
      const res = await instagramAPI.connect(igConnectForm);
      if (res.data.success) {
        showToast(res.data.message);
        setShowIgConnectModal(false);
        // Refresh status
        const statusRes = await instagramAPI.getStatus();
        if (statusRes.data.success) setIgStatus(statusRes.data.data);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to connect Instagram', 'error');
    } finally {
      setIgConnecting(false);
    }
  };

  // Instagram: Disconnect account
  const handleIgDisconnect = async () => {
    try {
      await instagramAPI.disconnect();
      setIgStatus({ connected: false });
      showToast('Instagram account disconnected');
    } catch (err: any) {
      showToast('Failed to disconnect', 'error');
    }
  };

  // Instagram: Publish a post directly to Instagram
  const handleIgPublishPost = async (post: SocialPost) => {
    setPublishingToIg(true);
    setPublishProgress('Creating Instagram container...');

    if (!uploadedMedia.length && !post.image) {
      showToast('Instagram requires media. Upload images first.', 'error');
      setPublishingToIg(false);
      return;
    }

    try {
      let mediaUrls: string[];
      let mediaTypes: string[];

      if (uploadedMedia.length > 0) {
        mediaUrls = uploadedMedia.map(m => m.url);
        mediaTypes = uploadedMedia.map(m => m.type);
      } else if (post.image) {
        mediaUrls = [post.image];
        mediaTypes = ['IMAGE'];
      } else {
        throw new Error('No media to publish');
      }

      setPublishProgress('Publishing...');

      if (mediaUrls.length === 1) {
        const res = await instagramAPI.publish({
          mediaUrl: mediaUrls[0],
          caption: post.content,
          mediaType: mediaTypes[0],
        });
        if (res.data.success) {
          // Update post status
          await postsAPI.publish(post.id).catch(() => {});
          showToast('✅ Published to Instagram!');
          setUploadedMedia([]);
          fetchPosts();
        }
      } else {
        const res = await instagramAPI.publishCarousel({
          children: mediaUrls.map((url, i) => ({ mediaUrl: url, mediaType: mediaTypes[i] })),
          caption: post.content,
        });
        if (res.data.success) {
          // Update post status
          await postsAPI.publish(post.id).catch(() => {});
          showToast('✅ Carousel published to Instagram!');
          setUploadedMedia([]);
          fetchPosts();
        }
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to publish to Instagram', 'error');
    } finally {
      setPublishingToIg(false);
      setPublishProgress('');
    }
  };

  // Calendar data for current month
  const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const day = i - 2; // offset for starting day
    return { day: day > 0 && day <= 30 ? day : null, posts: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0 };
  });

  return (
    <div className="p-3 sm:p-5 md:p-6 lg:p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Social Media</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Manage and schedule your social media posts</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${activeView === 'dashboard' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveView('calendar')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${activeView === 'calendar' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <Calendar size={16} className="inline mr-1" /> Calendar
          </button>
          <button
            onClick={() => setActiveView('analytics')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${activeView === 'analytics' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <BarChart3 size={16} className="inline mr-1" /> Analytics
          </button>
          <button
            onClick={() => setShowComposeModal(true)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap text-xs sm:text-sm ml-auto sm:ml-0"
          >
            <Plus size={16} />
            <span className="hidden xs:inline">Create Post</span>
            <span className="xs:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <StatCard icon={<Send size={20} />} label="Total Posts" value="137" change="+12%" positive color="blue" />
            <StatCard icon={<Clock size={20} />} label="Scheduled" value="8" change="+3" positive color="purple" />
            <StatCard icon={<TrendingUp size={20} />} label="Engagement Rate" value="4.8%" change="+0.6%" positive color="green" />
            <StatCard icon={<Eye size={20} />} label="Total Reach" value="24.5K" change="+18%" positive color="orange" />
          </div>

          {/* Platform Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {platformStats.map(p => (
              <div key={p.platform} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{p.platform}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.posts} posts this month</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{(p.followers / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Followers</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{p.engagement}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Engagement</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter + Posts List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Recent Posts</h3>
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <Filter size={16} className="text-gray-400 shrink-0" />
                {['all', 'draft', 'scheduled', 'published', 'failed'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${filterStatus === s ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredPosts.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Send size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No posts found</p>
                </div>
              ) : (
                filteredPosts.map(post => (
                  <div key={post.id} className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white text-sm line-clamp-2 mb-2">{post.content}</p>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          {post.platforms.map(pid => {
                            const p = platforms.find(x => x.id === pid);
                            return p ? (
                              <span key={pid} className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${p.bgLight} ${p.textColor}`}>
                                {p.icon} <span className="hidden sm:inline">{p.name}</span>
                              </span>
                            ) : null;
                          })}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusConfig[post.status].color}`}>
                            {statusConfig[post.status].icon} {statusConfig[post.status].label}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 hidden md:inline">
                            {post.scheduledAt || post.publishedAt}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        {post.status === 'published' && (
                          <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1"><Heart size={12} /> {post.likes}</span>
                            <span className="flex items-center gap-1"><MessageCircle size={12} /> {post.comments}</span>
                            <span className="flex items-center gap-1"><Share2 size={12} /> {post.shares}</span>
                            <span className="flex items-center gap-1 hidden sm:flex"><Eye size={12} /> {post.reach}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          {(post.platforms.includes('instagram') || post.status === 'draft') && igStatus?.connected && (
                            <button
                              onClick={() => handleIgPublishPost(post)}
                              disabled={publishingToIg}
                              className="p-1.5 hover:bg-pink-50 dark:hover:bg-pink-900/30 rounded-lg"
                              title="Publish to Instagram"
                            >
                              {publishingToIg ? <Loader2 size={14} className="text-pink-500 animate-spin" /> : <Instagram size={14} className="text-pink-500" />}
                            </button>
                          )}
                          <button onClick={() => duplicatePost(post)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg" title="Duplicate">
                            <Copy size={14} className="text-gray-400" />
                          </button>
                          <button onClick={() => deletePost(post.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="Delete">
                            <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {activeView === 'calendar' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
          <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><ChevronLeft size={20} /></button>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><ChevronRight size={20} /></button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Published</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full"></span>Scheduled</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-300 rounded-full"></span>Draft</span>
              </div>
              <button
                onClick={() => setShowComposeModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs sm:text-sm hover:bg-blue-700"
              >
                <Plus size={16} /> <span className="hidden sm:inline">New Post</span><span className="sm:hidden">New</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 min-w-[500px] sm:min-w-0">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="p-1.5 sm:p-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{d.charAt(0)}</span>
              </div>
            ))}
            {calendarDays.map((d, i) => (
              <div key={i} className={`min-h-[60px] sm:min-h-[80px] md:min-h-[100px] p-1 sm:p-2 border-b border-r border-gray-100 dark:border-gray-700 ${d.day ? '' : 'text-gray-300 dark:text-gray-600'}`}>
                {d.day && (
                  <>
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{d.day}</span>
                    {d.posts > 0 && (
                      <div className="mt-1 space-y-1">
                        {Array.from({ length: Math.min(d.posts, 2) }).map((_, j) => (
                          <div key={j} className="px-1 sm:px-2 py-0.5 sm:py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded truncate">
                            <span className="hidden sm:inline">📱 Post {j + 1}</span>
                            <span className="sm:hidden">📱</span>
                          </div>
                        ))}
                        {d.posts > 2 && <p className="text-xs text-gray-400">+{d.posts - 2}</p>}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Engagement Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 text-sm sm:text-base">Weekly Engagement</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <RT />
                <Bar dataKey="likes" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="comments" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="shares" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Platform Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 text-sm sm:text-base">Posts by Platform</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={platformDistribution} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {platformDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <RT />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Follower Growth */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 text-sm sm:text-base">Follower Growth</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={[
                  { name: 'Jan', followers: 8200 },
                  { name: 'Feb', followers: 8900 },
                  { name: 'Mar', followers: 9800 },
                  { name: 'Apr', followers: 10500 },
                  { name: 'May', followers: 11200 },
                  { name: 'Jun', followers: 12570 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                  <RT />
                  <Line type="monotone" dataKey="followers" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Best Time to Post */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 text-sm sm:text-base">⏰ Best Time to Post</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Facebook</p>
                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-1">9:00 AM - 11:00 AM</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tuesday & Thursday</p>
              </div>
              <div className="p-3 sm:p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                <p className="text-sm text-pink-600 dark:text-pink-400 font-medium">Instagram</p>
                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-1">11:00 AM - 1:00 PM</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Monday & Wednesday</p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Twitter/X</p>
                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-1">12:00 PM - 3:00 PM</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Monday to Friday</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish Progress Bar */}
      {publishingToIg && (
        <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-xs">
          <div className="flex items-center gap-3 mb-2">
            <Instagram size={18} className="text-pink-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Publishing to Instagram...</span>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="text-pink-500 animate-spin" />
            <span className="text-xs text-gray-500">{publishProgress}</span>
          </div>
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-full rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* Instagram Connect Modal */}
      {showIgConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowIgConnectModal(false)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                  <Instagram size={20} className="text-pink-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {igStatus?.connected ? 'Change Instagram Account' : 'Connect Instagram'}
                </h2>
              </div>
              <button onClick={() => setShowIgConnectModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <XCircle size={20} className="text-gray-500" />
              </button>
            </div>

            {igStatus?.connected && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Already connected as <strong>{igStatus.accountInfo?.username || 'Instagram Account'}</strong>
                </p>
                <button
                  onClick={handleIgDisconnect}
                  className="mt-2 text-xs text-red-600 hover:underline"
                >
                  <Unplug size={12} className="inline mr-1" /> Disconnect
                </button>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connect your Instagram Business Account to publish posts directly. You'll need your Instagram User ID and a Page Access Token with <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">instagram_basic</code> and <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">instagram_content_publish</code> permissions.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instagram User ID</label>
                <input
                  type="text"
                  value={igConnectForm.igUserId}
                  onChange={e => setIgConnectForm(prev => ({ ...prev, igUserId: e.target.value }))}
                  placeholder="e.g. 17841405822304945"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instagram Access Token</label>
                <input
                  type="password"
                  value={igConnectForm.igAccessToken}
                  onChange={e => setIgConnectForm(prev => ({ ...prev, igAccessToken: e.target.value }))}
                  placeholder="EAAB... long token"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowIgConnectModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleIgConnect}
                  disabled={igConnecting || !igConnectForm.igUserId || !igConnectForm.igAccessToken}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 text-sm"
                >
                  {igConnecting ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
                  {igConnecting ? 'Connecting...' : igStatus?.connected ? 'Update Connection' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowComposeModal(false)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Create New Post</h2>
              <button onClick={() => setShowComposeModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <XCircle size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Post Content</label>
                <textarea
                  value={composeContent}
                  onChange={e => setComposeContent(e.target.value)}
                  placeholder="Write your post or click ✨ Generate with AI..."
                  rows={4}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm sm:text-base"
                />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-2">
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg text-xs sm:text-sm hover:bg-purple-100 dark:hover:bg-purple-900/50">
                    <Zap size={14} /> ✨ Generate with AI
                  </button>
                  <span className="text-xs text-gray-400">{composeContent.length} characters</span>
                </div>
              </div>

              {/* Instagram Connect Banner */}
              {selectedPlatforms.includes('instagram') && !igStatus?.connected && (
                <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Instagram size={20} className="text-pink-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-pink-700 dark:text-pink-300">Connect your Instagram Business Account</p>
                      <p className="text-xs text-pink-600 dark:text-pink-400 mt-1">You need to connect Instagram to publish posts directly.</p>
                      <button
                        onClick={() => setShowIgConnectModal(true)}
                        className="mt-2 px-3 py-1.5 bg-pink-600 text-white text-xs rounded-lg hover:bg-pink-700 transition-colors"
                      >
                        <Plug size={12} className="inline mr-1" /> Connect Instagram
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Instagram Connected Status */}
              {selectedPlatforms.includes('instagram') && igStatus?.connected && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Instagram size={16} className="text-green-600" />
                      <span className="text-xs sm:text-sm text-green-700 dark:text-green-300 font-medium">
                        Instagram Connected {igStatus.accountInfo?.username ? `@${igStatus.accountInfo.username}` : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowIgConnectModal(true)}
                      className="text-xs text-pink-600 hover:underline"
                    >
                      Change Account
                    </button>
                  </div>
                </div>
              )}

              {/* Instagram Media Upload (shown when Instagram is selected) */}
              {selectedPlatforms.includes('instagram') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Media for Instagram
                    <span className="text-xs text-gray-400 ml-2">(Up to 10 images/videos for carousel)</span>
                  </label>

                  {/* Uploaded media preview */}
                  {uploadedMedia.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                      {uploadedMedia.map((media, i) => (
                        <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                          {media.type === 'VIDEO' ? (
                            <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              <Film size={24} className="text-gray-400" />
                            </div>
                          ) : (
                            <img src={media.previewUrl} alt={`Media ${i + 1}`} className="w-full h-full object-cover" />
                          )}
                          <button
                            onClick={() => removeIgMedia(i)}
                            className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XCircle size={14} />
                          </button>
                          <span className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/50 text-white text-[10px] rounded">
                            {media.type === 'VIDEO' ? '🎬' : '📷'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {igStatus?.connected && (
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer text-xs sm:text-sm">
                        {uploadingMedia ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                        <span>{uploadingMedia ? 'Uploading...' : 'Add Images'}</span>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,video/mp4"
                          onChange={handleIgMediaUpload}
                          className="hidden"
                          disabled={uploadingMedia}
                        />
                      </label>
                      {uploadedMedia.length > 0 && (
                        <button
                          onClick={() => setUploadedMedia([])}
                          className="px-3 py-2 text-xs text-gray-500 hover:text-red-500"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Regular image upload (for non-Instagram platforms) */}
              {!selectedPlatforms.includes('instagram') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Media</label>
                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                      <Image size={18} /> Upload Image
                    </button>
                  </div>
                </div>
              )}

              {/* Platforms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                      className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg border-2 transition-all text-xs sm:text-sm ${selectedPlatforms.includes(p.id)
                        ? `${p.color} text-white border-transparent`
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                        }`}
                    >
                      {p.icon} {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Schedule</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="schedule" checked={!scheduleDate} onChange={() => setScheduleDate('')} className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Save as Draft</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="schedule" checked={!!scheduleDate} onChange={() => setScheduleDate(new Date().toISOString().slice(0, 16))} className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Schedule for:</span>
                  </label>
                  {scheduleDate !== undefined && (
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setShowComposeModal(false)} className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm">
                  Cancel
                </button>
                <button onClick={handleCreatePost} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  <Send size={16} />
                  {scheduleDate ? 'Schedule Post' : 'Save Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialMediaPage;
