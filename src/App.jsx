import React, { useState, useRef, useEffect } from 'react';
import { 
  ShoppingBag, Utensils, Armchair, Wine, Dog, ChefHat, 
  X, Plus, Minus, Check, LogOut, MessageCircle, Trash2, 
  Home, Clock, Calendar, Loader2, MapPin
} from 'lucide-react';

// --- Configuration ---
// Updated with your specific production n8n URLs
const N8N_AUTH_WEBHOOK = "https://maracuyabackend.app.n8n.cloud/webhook/guest-auth"; 
const N8N_ORDER_WEBHOOK = "https://maracuyabackend.app.n8n.cloud/webhook/log-order";
const RESTAURANT_PHONE = "523112683336";

// --- Mock Inventory Data ---
const CATEGORIES = [
  { id: 'kitchen', name: 'Kitchen & Dining', icon: Utensils },
  { id: 'furniture', name: 'Furniture', icon: Armchair },
  { id: 'minibar', name: 'Mini Bar & Ice', icon: Wine },
  { id: 'essentials', name: 'Bath & Linens', icon: ShoppingBag },
  { id: 'services', name: 'Services & Pets', icon: Dog },
  { id: 'takeout', name: 'Restaurant', icon: ChefHat },
];

const INVENTORY = [
  { id: 101, category: 'kitchen', name: 'Premium Espresso Machine', price: 25, image: '☕', desc: 'Nespresso Vertuo + 10 pods' },
  { id: 102, category: 'kitchen', name: 'Rice Cooker', price: 10, image: '🍚', desc: '3-cup capacity, non-stick' },
  { id: 103, category: 'kitchen', name: 'BBQ Grill Set', price: 15, image: '🥩', desc: 'Portable electric grill & utensils' },
  { id: 201, category: 'furniture', name: 'Ergonomic Office Chair', price: 20, image: '🪑', desc: 'For remote work setups' },
  { id: 202, category: 'furniture', name: 'High Chair', price: 0, image: '👶', desc: 'Sanitized baby high chair' },
  { id: 203, category: 'furniture', name: 'Extra Cot / Folding Bed', price: 45, image: '🛏️', desc: 'Includes linens and pillow' },
  { id: 301, category: 'minibar', name: 'Local Craft Beer Pack', price: 18, image: '🍺', desc: '4-pack of city specials' },
  { id: 302, category: 'minibar', name: 'Champagne & Ice', price: 65, image: '🍾', desc: 'Moët & Chandon with bucket' },
  { id: 303, category: 'minibar', name: 'Late Night Snack Box', price: 22, image: '🥨', desc: 'Chips, chocolate, nuts, soda' },
  { id: 304, category: 'minibar', name: 'Bag of Ice (5kg)', price: 5, image: '🧊', desc: 'Delivered to your door' },
  { id: 401, category: 'essentials', name: 'Luxury Towel Set', price: 12, image: '🧖', desc: '2 Bath, 2 Hand, 2 Face' },
  { id: 402, category: 'essentials', name: 'Beach Kit', price: 20, image: '🏖️', desc: '2 Towels, Umbrella, Cooler' },
  { id: 403, category: 'essentials', name: 'Toiletries Restock', price: 15, image: '🧴', desc: 'Shampoo, Conditioner, Soap' },
  { id: 501, category: 'services', name: 'Pet Cleaning Fee', price: 50, image: '🐕', desc: 'Required per pet per stay' },
  { id: 502, category: 'services', name: 'Extra Guest (Per Night)', price: 30, image: '👥', desc: 'Includes amenities' },
  { id: 503, category: 'services', name: 'Late Checkout (2PM)', price: 40, image: '🕑', desc: 'Subject to availability' },
];

const RESTAURANT_MENU = [
  { id: 901, name: 'Margherita Pizza', price: 14, desc: 'Tomato, mozzarella, basil' },
  { id: 902, name: 'Truffle Burger', price: 18, desc: 'Wagyu beef, truffle mayo, fries' },
  { id: 903, name: 'Caesar Salad', price: 12, desc: 'Romaine, parmesan, croutons' },
  { id: 904, name: 'Spicy Tuna Roll', price: 16, desc: 'Fresh tuna, spicy mayo, cucumber' },
  { id: 905, name: 'Chocolate Lava Cake', price: 9, desc: 'With vanilla ice cream' },
];

// --- Helper: WhatsApp Sender ---
const sendToWhatsApp = (cartItems, user, businessNumber, orderTiming, orderId) => {
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  let message = `*NEW ORDER REQUEST* 🛒\n`;
  if (orderId) message += `Order #: *${orderId}*\n`;
  message += `Booking ID: ${user.bookingId}\n`;
  message += `Guest: ${user.name}\n`;
  message += `Location: *${user.property || 'Not Specified'}*\n`; 
  
  const timingText = orderTiming === 'now' ? 'ASAP / IMMEDIATE' : 'UPON ARRIVAL';
  message += `Timing: *${timingText}*\n`;
  
  // Add stay dates context if it's an arrival order and dates exist
  if (orderTiming === 'arrival' && user.stay && user.stay.start) {
      message += `Arrival Date: ${user.stay.start.split('T')[0]}\n`;
  }

  message += `------------------\n`;

  cartItems.forEach(item => {
    const itemTotal = (item.price * item.quantity).toFixed(2);
    message += `${item.quantity}x ${item.name} - $${itemTotal}\n`;
  });

  message += `------------------\n`;
  message += `*TOTAL: $${total.toFixed(2)}*\n\n`;
  message += `(Please confirm receipt)`;

  const url = `https://wa.me/${businessNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

export default function GuestApp() {
  const [user, setUser] = useState(null); 
  // User object structure: { bookingId, name, property, email, phone, stay: {start, end} }
  
  const [activeTab, setActiveTab] = useState('kitchen');
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [orderTiming, setOrderTiming] = useState('now');
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  
  const mainContentRef = useRef(null);

  useEffect(() => {
    if (mainContentRef.current) mainContentRef.current.scrollTop = 0;
  }, [activeTab]);

  // --- Auth Handler ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    const formData = new FormData(e.target);
    const lastName = formData.get('lastName').trim();
    const bookingId = formData.get('bookingId').trim();

    if (!lastName || !bookingId) {
      setLoginError("Please fill in both fields.");
      setIsLoggingIn(false);
      return;
    }

    try {
      // 1. Call n8n to check Buffer Database
      const response = await fetch(N8N_AUTH_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastName, bookingId })
      });

      if (!response.ok) throw new Error("Connection failed");
      const data = await response.json();

      if (data.valid) {
        // 2. Hydrate User State with Rich Data from Spreadsheet
        setUser({ 
          bookingId,
          name: data.guest.name,         // From Sheet
          property: data.guest.property, // From Sheet (e.g. "Villa 4")
          email: data.guest.email,
          phone: data.guest.phone,
          stay: data.guest.stay          // { start, end }
        });
      } else {
        setLoginError(data.message || "Reservation not found. Please check your Last Name and Booking ID.");
      }
    } catch (err) {
      console.error(err);
      setLoginError("System offline. Please try again later.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCart({});
    setActiveTab('kitchen');
    setIsCartOpen(false);
  };

  // --- Cart Helpers ---
  const addToCart = (item) => {
    setCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
    showNotification(`Added ${item.name}`);
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) newCart[itemId]--;
      else delete newCart[itemId];
      return newCart;
    });
  };

  const removeAllFromCart = (itemId) => {
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[itemId];
      return newCart;
    });
  };

  const getCartTotal = () => {
    let total = 0;
    Object.entries(cart).forEach(([id, qty]) => {
      const item = [...INVENTORY, ...RESTAURANT_MENU].find(i => i.id === parseInt(id));
      if (item) total += item.price * qty;
    });
    return total;
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Checkout ---
  const handleCheckout = async () => {
    setIsProcessingOrder(true);

    const cartItems = Object.entries(cart).map(([id, qty]) => {
      const item = [...INVENTORY, ...RESTAURANT_MENU].find(i => i.id === parseInt(id));
      return item ? { name: item.name, price: item.price, quantity: qty } : null;
    }).filter(Boolean);

    if (cartItems.length === 0) return;

    let orderId = null;

    try {
      // Log order to n8n (which adds to 'Orders' sheet)
      // Only attempt this if we have the URL configured
      if (N8N_ORDER_WEBHOOK && !N8N_ORDER_WEBHOOK.includes('your-n8n-instance')) {
        const response = await fetch(N8N_ORDER_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user,
            cart: cartItems,
            total: getCartTotal(),
            timing: orderTiming,
            timestamp: new Date().toISOString()
          })
        });

        if (response.ok) {
          const data = await response.json();
          orderId = data.orderId; 
        }
      }
    } catch (err) {
      console.error("Logging failed, proceeding to WhatsApp fallback", err);
      // We intentionally proceed here so the user isn't blocked if the logger is down
    }

    // Send to WhatsApp
    sendToWhatsApp(cartItems, user, RESTAURANT_PHONE, orderTiming, orderId);

    setCart({});
    setIsCartOpen(false);
    setIsProcessingOrder(false);
    showNotification("Opening WhatsApp...");
  };

  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  // --- Views ---

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">MARACUYA SHOP</h1>
            <p className="text-gray-500">Guest Amenities & Service</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reservation Last Name</label>
              <input name="lastName" type="text" required className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Smith" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking ID</label>
              <input name="bookingId" type="text" required className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 123456" />
            </div>
            
            {loginError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">
                {loginError}
              </div>
            )}

            <button type="submit" disabled={isLoggingIn} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center justify-center space-x-2 disabled:opacity-70">
              {isLoggingIn ? <Loader2 className="animate-spin" /> : <span>Access Shop</span>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeItems = activeTab === 'takeout' ? RESTAURANT_MENU : INVENTORY.filter(i => i.category === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row h-screen overflow-hidden font-sans relative">
      {/* Sidebar */}
      <div className="md:w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col z-20">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-indigo-600 p-2 rounded-lg"><Home className="text-white w-5 h-5" /></div>
            <h1 className="text-xl font-bold text-gray-900">GuestStay</h1>
          </div>
          <div className="bg-indigo-50 p-4 rounded-xl mb-4">
             <h2 className="font-bold text-indigo-900">{user.name}</h2>
             <div className="flex items-center text-xs text-indigo-700 mt-1">
                <MapPin size={12} className="mr-1" />
                {user.property || 'Main Building'}
             </div>
             {user.stay && (
               <div className="text-[10px] text-indigo-500 mt-2">
                 {user.stay.start ? user.stay.start.split('T')[0] : 'N/A'} to {user.stay.end ? user.stay.end.split('T')[0] : 'N/A'}
               </div>
             )}
          </div>
          <button onClick={handleLogout} className="md:hidden flex items-center text-gray-400 text-sm">
            <LogOut size={16} className="mr-2"/> Sign Out
          </button>
        </div>
        
        <nav className="flex-1 overflow-x-auto md:overflow-y-auto flex md:flex-col scrollbar-hide">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`flex items-center space-x-3 px-6 py-4 whitespace-nowrap transition-colors ${activeTab === cat.id ? 'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Icon size={20} />
                <span className="font-medium text-sm">{cat.name}</span>
              </button>
            )
          })}
        </nav>
        <div className="hidden md:block p-6 border-t border-gray-100 absolute bottom-0 w-full bg-white">
           <button onClick={handleLogout} className="flex items-center space-x-2 text-gray-500 hover:text-red-500 text-sm font-medium transition">
              <LogOut size={16} /> <span>Sign Out</span>
           </button>
        </div>
      </div>

      {/* Main Content */}
      <main ref={mainContentRef} className="flex-1 overflow-y-auto relative bg-gray-50 pb-24 md:pb-0">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-4 flex justify-between items-center md:hidden border-b border-gray-200">
           <span className="font-bold text-gray-800">{CATEGORIES.find(c => c.id === activeTab)?.name}</span>
           <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-indigo-100 rounded-full text-indigo-700">
             <ShoppingBag size={20} />
             {cartItemCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">{cartItemCount}</span>}
           </button>
        </div>

        <div className="hidden md:flex justify-between items-center p-8 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{CATEGORIES.find(c => c.id === activeTab)?.name}</h1>
            <p className="text-gray-500 mt-1">Select items to add to your stay</p>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="flex items-center space-x-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
             <div className="relative">
               <ShoppingBag className="text-gray-600" />
               {cartItemCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">{cartItemCount}</span>}
             </div>
             <div className="text-left">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total</p>
                <p className="font-bold text-indigo-600">${getCartTotal()}</p>
             </div>
          </button>
        </div>

        <div className="p-4 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeItems.map(item => (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all border border-gray-100 flex flex-col">
                <div className="aspect-[4/3] bg-gray-50 rounded-xl mb-4 flex items-center justify-center text-6xl relative overflow-hidden group">
                  <span className="group-hover:scale-110 transition duration-300">{item.image || '🍽️'}</span>
                  {cart[item.id] > 0 && <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">{cart[item.id]}</div>}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800 leading-tight">{item.name}</h3>
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg text-sm">${item.price}</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{item.desc}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  {cart[item.id] > 0 ? (
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button onClick={() => removeFromCart(item.id)} className="p-2 hover:bg-white rounded-md transition shadow-sm"><Minus size={14} /></button>
                      <span className="w-8 text-center font-bold text-sm">{cart[item.id]}</span>
                      <button onClick={() => addToCart(item)} className="p-2 hover:bg-white rounded-md transition shadow-sm"><Plus size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)} className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium text-sm transition flex items-center justify-center space-x-2">
                      <Plus size={16} /> <span>Add</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-xl font-bold flex items-center space-x-2"><ShoppingBag className="text-indigo-600" /><span>Your Cart</span></h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {Object.keys(cart).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4"><ShoppingBag size={48} className="opacity-20" /><p>Cart is empty.</p></div>
              ) : (
                Object.entries(cart).map(([id, qty]) => {
                  const item = [...INVENTORY, ...RESTAURANT_MENU].find(i => i.id === parseInt(id));
                  if (!item) return null;
                  return (
                    <div key={id} className="flex items-center space-x-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                      <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center text-2xl relative group">
                        {item.image || '🍽️'}
                        <button onClick={() => removeAllFromCart(item.id)} className="absolute -top-2 -left-2 bg-red-100 text-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition"><Trash2 size={14} /></button>
                      </div>
                      <div className="flex-1"><h4 className="font-bold text-gray-800 text-sm">{item.name}</h4><p className="text-gray-500 text-xs">${item.price}</p></div>
                      <div className="flex flex-col items-end space-y-2"><span className="font-bold text-indigo-600">${item.price * qty}</span>
                        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                          <button onClick={() => removeFromCart(item.id)} className="p-1 hover:bg-white rounded-md"><Minus size={12} /></button>
                          <span className="w-6 text-center text-xs font-bold">{qty}</span>
                          <button onClick={() => addToCart(item)} className="p-1 hover:bg-white rounded-md"><Plus size={12} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50">
               <div className="flex justify-between items-center mb-6"><span className="text-gray-500 font-medium">Subtotal</span><span className="text-2xl font-bold text-gray-900">${getCartTotal()}</span></div>
               <div className="mb-6 bg-gray-200 p-1 rounded-xl flex">
                   <button onClick={() => setOrderTiming('now')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all ${orderTiming === 'now' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Clock size={16} /><span>Order Now</span></button>
                   <button onClick={() => setOrderTiming('arrival')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all ${orderTiming === 'arrival' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Calendar size={16} /><span>On Arrival</span></button>
               </div>
               <button onClick={handleCheckout} disabled={Object.keys(cart).length === 0 || isProcessingOrder} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-wait text-white py-4 rounded-xl font-bold shadow-lg transition flex items-center justify-center space-x-2">
                 {isProcessingOrder ? <Loader2 className="animate-spin" size={20} /> : <><MessageCircle size={20} /><span>Send Order</span></>}
               </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3 z-[60] animate-bounce-in">
          <Check size={18} className="text-green-400" /> <span className="font-medium text-sm">{notification}</span>
        </div>
      )}
    </div>
  );
}
