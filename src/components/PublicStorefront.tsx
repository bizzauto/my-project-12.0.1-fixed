import React, { useState, useEffect, useCallback } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, X, Tag, ChevronRight, Package, Star, Filter } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../lib/api';
import { useToast } from './Toast';

interface Product {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  quantity: number;
  images: string[];
  mainImage?: string;
  description?: string;
  status: string;
  variants?: { id: string; name: string; options: any; price?: number; quantity: number }[];
}

interface CartItem {
  id?: string;
  product: Product;
  quantity: number;
  variant?: any;
}

const PublicStorefront: React.FC = () => {
  const navigate = useNavigate();
  const { businessId: urlBusinessId } = useParams<{ businessId: string }>();
  const { error: showError, success: showSuccess } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>(null);

  const isPublicMode = !!urlBusinessId;
  const apiBase = isPublicMode ? `/api/store/${urlBusinessId}` : '/api/ecommerce';

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`${apiBase}/products`);
      const data = res.data?.data;
      setProducts(data?.products || data || []);
      if (data?.categories) {
        // categories available if needed
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const fetchCart = useCallback(async () => {
    if (isPublicMode) return; // Public mode uses local cart only
    try {
      const res = await apiClient.get('/ecommerce/cart');
      const cartData = res.data?.data;
      if (cartData?.items) {
        setCart(cartData.items.map((item: any) => ({
          id: item.id,
          product: {
            id: item.product.id,
            name: item.product.name,
            price: item.variantPrice || item.product.price,
            compareAtPrice: item.product.compareAtPrice,
            category: item.product.category,
            quantity: item.product.quantity,
            images: item.product.images || [],
            mainImage: item.product.mainImage,
            description: item.product.description,
            status: item.product.status,
          },
          quantity: item.quantity,
          variant: item.variantId ? { id: item.variantId, name: item.variantName, price: item.variantPrice } : undefined,
        })));
      }
    } catch {
      // silently fail
    }
  }, [isPublicMode]);

  useEffect(() => {
    fetchProducts();
    fetchCart();
    if (isPublicMode && urlBusinessId) {
      apiClient.get(`/api/store/${urlBusinessId}/store`).then(res => setStoreInfo(res.data?.data)).catch(() => {});
    }
  }, [fetchProducts, fetchCart, isPublicMode, urlBusinessId]);

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = async (product: Product, quantity = 1, variant?: any) => {
    if (isPublicMode) {
      // Local cart for public mode
      setCart(prev => {
        const existing = prev.find(item => item.product.id === product.id && JSON.stringify(item.variant) === JSON.stringify(variant));
        if (existing) {
          return prev.map(item =>
            item.product.id === product.id && JSON.stringify(item.variant) === JSON.stringify(variant)
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [...prev, { product, quantity, variant }];
      });
      showSuccess('Added to cart');
      return;
    }

    setCartLoading(true);
    try {
      await apiClient.post('/ecommerce/cart/items', {
        productId: product.id,
        quantity,
        variantId: variant?.id,
        variantName: variant?.name,
        variantPrice: variant?.price,
      });
      await fetchCart();
      showSuccess('Added to cart');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to add to cart');
    } finally {
      setCartLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (isPublicMode) {
      if (newQuantity <= 0) {
        setCart(prev => prev.filter(item => item.id !== itemId));
      } else {
        setCart(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
      }
      return;
    }
    if (newQuantity <= 0) {
      await removeItem(itemId);
      return;
    }
    try {
      await apiClient.put(`/ecommerce/cart/items/${itemId}`, { quantity: newQuantity });
      await fetchCart();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to update');
    }
  };

  const removeItem = async (itemId: string) => {
    if (isPublicMode) {
      setCart(prev => prev.filter(item => item.id !== itemId));
      return;
    }
    try {
      await apiClient.delete(`/ecommerce/cart/items/${itemId}`);
      await fetchCart();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to remove');
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const url = isPublicMode ? `/api/store/${urlBusinessId}/coupons/validate` : '/ecommerce/coupons/validate';
      const res = await apiClient.post(url, { code: couponCode, cartTotal: subtotal });
      setAppliedCoupon(res.data?.data);
      setCouponCode('');
      showSuccess('Coupon applied!');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Invalid coupon');
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = appliedCoupon
    ? appliedCoupon.type === 'PERCENTAGE'
      ? (subtotal * appliedCoupon.value) / 100
      : Math.min(appliedCoupon.value, subtotal)
    : 0;
  const total = Math.max(0, subtotal - discount);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    setShowCart(false);
    if (isPublicMode) {
      // In public mode, navigate to public checkout
      navigate(`/checkout/${urlBusinessId}`);
    } else {
      navigate('/checkout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store</h1>
          <button
            onClick={() => setShowCart(true)}
            className="relative p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                  {product.mainImage || (product.images && product.images.length > 0) ? (
                    <img
                      src={product.mainImage || product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={40} className="text-gray-400" />
                  )}
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {Math.round((1 - product.price / product.compareAtPrice) * 100)}% OFF
                    </span>
                  )}
                  {product.quantity <= 0 && (
                    <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">
                      Out of Stock
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{product.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">₹{product.price}</span>
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <span className="text-sm text-gray-400 line-through">₹{product.compareAtPrice}</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                    disabled={product.quantity <= 0 || cartLoading}
                    className="w-full mt-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {product.quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="relative h-64 bg-gray-100 dark:bg-gray-700">
              {selectedProduct.mainImage || (selectedProduct.images && selectedProduct.images.length > 0) ? (
                <img src={selectedProduct.mainImage || selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-full object-cover rounded-t-2xl" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Package size={64} className="text-gray-400" /></div>
              )}
              <button onClick={() => setSelectedProduct(null)} className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-gray-800/80 rounded-full"><X size={18} /></button>
            </div>
            <div className="p-5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedProduct.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedProduct.category}</p>
              {selectedProduct.description && <p className="text-gray-600 dark:text-gray-300 mt-3 text-sm">{selectedProduct.description}</p>}
              <div className="flex items-center gap-3 mt-4">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">₹{selectedProduct.price}</span>
                {selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
                  <span className="text-lg text-gray-400 line-through">₹{selectedProduct.compareAtPrice}</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {selectedProduct.quantity > 0 ? `${selectedProduct.quantity} in stock` : 'Out of stock'}
              </p>
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Variants:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.variants.map(v => (
                      <button
                        key={v.id}
                        onClick={() => addToCart(selectedProduct, 1, { id: v.id, name: v.name, price: v.price })}
                        disabled={v.quantity <= 0 || cartLoading}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                      >
                        {v.name} {v.price ? `- ₹${v.price}` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                disabled={selectedProduct.quantity <= 0 || cartLoading}
                className="w-full mt-5 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {selectedProduct.quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setShowCart(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-md h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cart ({cartCount})</h2>
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id || item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="w-14 h-14 bg-gray-200 dark:bg-gray-600 rounded-lg flex-shrink-0 overflow-hidden">
                          {item.product.mainImage || (item.product.images && item.product.images[0]) ? (
                            <img src={item.product.mainImage || item.product.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-gray-400" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{item.product.name}</p>
                          {item.variant && <p className="text-xs text-gray-500">{item.variant.name}</p>}
                          <p className="text-sm font-semibold text-blue-600">₹{item.product.price}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => item.id && updateQuantity(item.id, item.quantity - 1)} className="p-1 bg-gray-200 dark:bg-gray-600 rounded"><Minus size={14} /></button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button onClick={() => item.id && updateQuantity(item.id, item.quantity + 1)} className="p-1 bg-gray-200 dark:bg-gray-600 rounded"><Plus size={14} /></button>
                          <button onClick={() => item.id && removeItem(item.id)} className="p-1 text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coupon */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Tag size={14} className="text-green-600" />
                          <span className="text-sm font-medium text-green-700">{appliedCoupon.code}</span>
                        </div>
                        <button onClick={() => setAppliedCoupon(null)} className="text-sm text-red-500">Remove</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={e => setCouponCode(e.target.value)}
                          placeholder="Coupon code"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
                        />
                        <button onClick={applyCoupon} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Apply</button>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-900 dark:text-white">₹{subtotal.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-₹{discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span>Total</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
                  </div>

                  <button onClick={handleCheckout} className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all">
                    Checkout • ₹{total.toLocaleString()}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicStorefront;
