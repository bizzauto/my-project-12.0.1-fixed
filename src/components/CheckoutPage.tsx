import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Truck, Check, ArrowLeft, Tag, MapPin, Package, Loader2 } from 'lucide-react';
import apiClient from '../lib/api';
import { useToast } from './Toast';
import { useAuthStore } from '../lib/authStore';

interface CartItem {
  id: string;
  product: { id: string; name: string; price: number; images: string[]; mainImage?: string };
  quantity: number;
  variantName?: string;
  variantPrice?: number;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const { user } = useAuthStore();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'address' | 'payment' | 'confirm'>('address');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');

  const fetchCart = useCallback(async () => {
    try {
      const res = await apiClient.get('/ecommerce/cart');
      const cartData = res.data?.data;
      if (cartData?.items) {
        setCartItems(cartData.items);
      } else {
        navigate('/store');
      }
    } catch {
      navigate('/store');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCart();
    if (user) {
      setShippingAddress(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
      }));
    }
  }, [fetchCart, user]);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.variantPrice || item.product.price) * item.quantity, 0);
  const discount = appliedCoupon
    ? appliedCoupon.type === 'PERCENTAGE'
      ? (subtotal * appliedCoupon.value) / 100
      : Math.min(appliedCoupon.value, subtotal)
    : 0;
  const total = Math.max(0, subtotal - discount);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await apiClient.post('/ecommerce/coupons/validate', { code: couponCode, cartTotal: subtotal });
      setAppliedCoupon(res.data?.data);
      setCouponCode('');
      showSuccess('Coupon applied!');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Invalid coupon');
    }
  };

  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.address || !shippingAddress.city) {
      showError('Please fill in all required shipping details');
      return;
    }

    setProcessing(true);
    try {
      const res = await apiClient.post('/ecommerce/checkout', {
        shippingAddress,
        couponCode: appliedCoupon?.code || null,
        paymentMethod,
        notes: '',
      });

      const order = res.data?.data;

      if (paymentMethod === 'razorpay' && order?.razorpayOrder) {
        const loaded = await loadRazorpay();
        if (!loaded) {
          showError('Failed to load payment gateway. Please try again.');
          setProcessing(false);
          return;
        }

        const options = {
          key: order.razorpayOrder.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: order.razorpayOrder.amount,
          currency: order.razorpayOrder.currency,
          name: 'Store Purchase',
          description: `Order ${order.orderNumber}`,
          order_id: order.razorpayOrder.id,
          handler: async (response: any) => {
            try {
              await apiClient.post(`/ecommerce/orders/${order.id}/verify-payment`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              showSuccess('Payment successful!');
              navigate(`/order-tracking/${order.orderNumber}`);
            } catch {
              showError('Payment verification failed. Contact support.');
              navigate(`/order-tracking/${order.orderNumber}`);
            }
          },
          prefill: {
            name: shippingAddress.name,
            email: shippingAddress.email,
            contact: shippingAddress.phone,
          },
          theme: { color: '#3B82F6' },
          modal: {
            ondismiss: () => {
              setProcessing(false);
              showSuccess('Order placed! You can pay later.');
              navigate(`/order-tracking/${order.orderNumber}`);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        showSuccess('Order placed successfully!');
        navigate(`/order-tracking/${order.orderNumber}`);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to place order');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Checkout</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[
            { key: 'address', label: 'Shipping', icon: <MapPin size={16} /> },
            { key: 'payment', label: 'Payment', icon: <CreditCard size={16} /> },
            { key: 'confirm', label: 'Confirm', icon: <Check size={16} /> },
          ].map((s, i) => (
            <React.Fragment key={s.key}>
              {i > 0 && <div className={`w-12 h-0.5 ${step === s.key || (i === 1 && step === 'confirm') ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`} />}
              <button
                onClick={() => setStep(s.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  step === s.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            {step === 'address' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <MapPin size={20} /> Shipping Address
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                    <input type="text" value={shippingAddress.name} onChange={e => setShippingAddress({ ...shippingAddress, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
                    <input type="tel" value={shippingAddress.phone} onChange={e => setShippingAddress({ ...shippingAddress, phone: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input type="email" value={shippingAddress.email} onChange={e => setShippingAddress({ ...shippingAddress, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address *</label>
                    <textarea value={shippingAddress.address} onChange={e => setShippingAddress({ ...shippingAddress, address: e.target.value })} rows={2} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City *</label>
                    <input type="text" value={shippingAddress.city} onChange={e => setShippingAddress({ ...shippingAddress, city: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State *</label>
                    <input type="text" value={shippingAddress.state} onChange={e => setShippingAddress({ ...shippingAddress, state: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pincode *</label>
                    <input type="text" value={shippingAddress.pincode} onChange={e => setShippingAddress({ ...shippingAddress, pincode: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                </div>
                <button onClick={() => setStep('payment')} className="mt-6 w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                  Continue to Payment
                </button>
              </div>
            )}

            {/* Payment */}
            {step === 'payment' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <CreditCard size={20} /> Payment Method
                </h2>
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${paymentMethod === 'razorpay' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    <input type="radio" name="payment" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} className="text-blue-600" />
                    <CreditCard size={20} className="text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Online Payment (Razorpay)</p>
                      <p className="text-sm text-gray-500">UPI, Cards, Net Banking, Wallets</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="text-blue-600" />
                    <Truck size={20} className="text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Cash on Delivery</p>
                      <p className="text-sm text-gray-500">Pay when you receive</p>
                    </div>
                  </label>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep('address')} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    Back
                  </button>
                  <button onClick={() => setStep('confirm')} className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Confirm */}
            {step === 'confirm' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Check size={20} /> Order Summary
                </h2>
                <div className="space-y-3 mb-4">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg flex-shrink-0 overflow-hidden">
                        {item.product.mainImage || (item.product.images && item.product.images[0]) ? (
                          <img src={item.product.mainImage || item.product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package size={16} className="m-auto mt-3 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.product.name}</p>
                        {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">₹{(item.variantPrice || item.product.price) * item.quantity}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Shipping to:</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{shippingAddress.name}, {shippingAddress.address}, {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.pincode}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{shippingAddress.phone}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep('payment')} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    Back
                  </button>
                  <button onClick={handlePlaceOrder} disabled={processing} className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {processing ? <><Loader2 className="animate-spin" size={18} /> Processing...</> : `Place Order • ₹${total.toLocaleString()}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 sticky top-24">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 truncate mr-2">{item.product.name} x{item.quantity}</span>
                    <span className="text-gray-900 dark:text-white font-medium whitespace-nowrap">₹{(item.variantPrice || item.product.price) * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">₹{subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-₹{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>Total</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>
              </div>

              {/* Coupon */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-green-600" />
                      <span className="text-sm font-medium text-green-700">{appliedCoupon.code}</span>
                    </div>
                    <button onClick={() => setAppliedCoupon(null)} className="text-xs text-red-500">Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Coupon" className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
                    <button onClick={applyCoupon} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Apply</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
