import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ShoppingBag, 
  Utensils, 
  Armchair, 
  Wine, 
  Dog, 
  Users, 
  ChefHat, 
  Search, 
  X, 
  Plus, 
  Minus, 
  Check, 
  ArrowRight,
  LogOut,
  CreditCard,
  MessageCircle,
  Trash2,
  Home,
  Clock,
  Calendar
} from 'lucide-react';

// --- Mock Data ---

const CATEGORIES = [
  { id: 'kitchen', name: 'Kitchen & Dining', icon: Utensils },
  { id: 'furniture', name: 'Furniture', icon: Armchair },
  { id: 'minibar', name: 'Mini Bar & Ice', icon: Wine },
  { id: 'essentials', name: 'Bath & Linens', icon: ShoppingBag },
  { id: 'services', name: 'Services & Pets', icon: Dog },
  { id: 'takeout', name: 'Restaurant', icon: ChefHat },
];

const INVENTORY = [
  // Kitchen
  { id: 101, category: 'kitchen', name: 'Premium Espresso Machine', price: 25, image: '☕', desc: 'Nespresso Vertuo + 10 pods' },
  { id: 102, category: 'kitchen', name: 'Rice Cooker', price: 10, image: '🍚', desc: '3-cup capacity, non-stick' },
  { id: 103, category: 'kitchen', name: 'BBQ Grill Set', price: 15, image: '🥩', desc: 'Portable electric grill & utensils' },
  
  // Furniture
  { id: 201, category: 'furniture', name: 'Ergonomic Office Chair', price: 20, image: '🪑', desc: 'For remote work setups' },
  { id: 202, category: 'furniture', name: 'High Chair', price: 0, image: '👶', desc: 'Sanitized baby high chair' },
  { id: 203, category: 'furniture', name: 'Extra Cot / Folding Bed', price: 45, image: '🛏️', desc: 'Includes linens and pillow' },

  // Mini Bar
  { id: 301, category: 'minibar', name: 'Local Craft Beer Pack', price: 18, image: '🍺', desc: '4-pack of city specials' },
  { id: 302, category: 'minibar', name: 'Champagne & Ice', price: 65, image: '🍾', desc: 'Moët & Chandon with bucket' },
  { id: 303, category: 'minibar', name: 'Late Night Snack Box', price: 22, image: '🥨', desc: 'Chips, chocolate, nuts, soda' },
  { id: 304, category: 'minibar', name: 'Bag of Ice (5kg)', price: 5, image: '🧊', desc: 'Delivered to your door' },
  { id: 304, category: 'minibar', name: 'Charcoal (2kg)', price: 4, image: '"placeholder"', desc: 'Delivered to your door' },
  
  // Essentials
  { id: 401, category: 'essentials', name: 'Luxury Towel Set', price: 12, image: '🧖', desc: '2 Bath, 2 Hand, 2 Face' },
  { id: 402, category: 'essentials', name: 'Beach Kit', price: 20, image: '🏖️', desc: '2 Towels, Umbrella, Cooler' },
  { id: 403, category: 'essentials', name: 'Toiletries Restock', price: 15, image: '🧴', desc: 'Shampoo, Conditioner, Soap' },

  // Services
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

// --- Helper Functions ---

const sendToWhatsApp = (cartItems, user, businessNumber, orderTiming) => {
  // 1. Calculate Total
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // 2. Build the Message String
  let message = `*NEW ORDER REQUEST* 🛒\n`;
  message += `Booking ID: ${user.bookingId}\n`;
  message += `Name: ${user.lastName}\n`;
  
  // Add Timing Flag
  const timingText = orderTiming === 'now' ? 'ASAP / IMMEDIATE' : 'UPON ARRIVAL';
  message += `Timing: *${timingText}*\n`;
  message += `------------------\n`;

  // 3. Dynamic Itemization Loop
  cartItems.forEach(item => {
    // Format: "2x Burger - $20.00"
    const itemTotal = (item.price * item.quantity).toFixed(2);
    message += `${item.quantity}x ${item.name} - $${itemTotal}\n`;
  });

  message += `------------------\n`;
  message += `*TOTAL: $${total.toFixed(2)}*\n\n`;
  message += `(Please send this message to finalize your order)`;

  // 4. Encode and Open URL
  const url = `https://wa.me/${businessNumber}?text=${encodeURIComponent(message)}`;

  window.open(url, '_blank');
};


// --- Main App Component ---

export default function GuestApp() {
  const [user, setUser] = useState(null); // { lastName, bookingId }
  const [activeTab, setActiveTab] = useState('kitchen');
  const [cart, setCart] = useState({}); // { itemId: quantity }
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [orderTiming, setOrderTiming] = useState('now'); // 'now' | 'arrival'
  
  // Ref for the main scrollable container
  const mainContentRef = useRef(null);

  // --- Effect: Reset Scroll on Tab Change ---
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // --- Auth Logic ---
  const handleLogin = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const lastName = formData.get('lastName');
    const bookingId = formData.get('bookingId');
    if (lastName && bookingId) {
      setUser({ lastName, bookingId });
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCart({});
    setActiveTab('kitchen');
    setIsCartOpen(false);
    setOrderTiming('now');
  };

  // --- Cart Logic ---
  const addToCart = (item) => {
    setCart(prev => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1
    }));
    showNotification(`Added ${item.name} to cart`);
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId]--;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const removeAllFromCart = (itemId) => {
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[itemId];
      return newCart;
    });
    showNotification("Item removed from cart");
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

  // --- Unified Checkout Handler ---
  const handleCheckout = () => {
    // 1. Transform Cart State {id: qty} into Array [{name, price, quantity}]
    const cartItems = Object.entries(cart).map(([id, qty]) => {
      const item = [...INVENTORY, ...RESTAURANT_MENU].find(i => i.id === parseInt(id));
      return item ? { 
        name: item.name, 
        price: item.price, 
        quantity: qty 
      } : null;
    }).filter(Boolean);

    if (cartItems.length === 0) {
      showNotification("Your cart is empty!");
      return;
    }

    // 2. Trigger WhatsApp Function
    sendToWhatsApp(cartItems, user, "523112683336", orderTiming);

    // 3. Cleanup
    setCart({});
    setIsCartOpen(false);
    showNotification("Opening WhatsApp...");
  };

  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  // --- Render Functions ---

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Guest Portal</h1>
            <p className="text-gray-500">Access amenities & services</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reservation Last Name</label>
              <input 
                name="lastName" 
                type="text" 
                required 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="e.g. Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking ID</label>
              <input 
                name="bookingId" 
                type="text" 
                required 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="e.g. #88342"
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition shadow-lg">
              Enter Guest Zone
            </button>
            <p className="text-xs text-center text-gray-400 mt-4">
              By entering, you agree to the house rules and charges for selected amenities.
            </p>
          </form>
        </div>
      </div>
    );
  }

  const activeItems = activeTab === 'takeout' 
    ? RESTAURANT_MENU 
    : INVENTORY.filter(i => i.category === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row h-screen overflow-hidden font-sans relative">
      
      {/* Sidebar / Topbar Navigation */}
      <div className="md:w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col z-20">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between md:block">
          <div className="flex items-center space-x-3 md:mb-6">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Home className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">GuestStay</h1>
          </div>
          <div>
            <h2 className="font-bold text-gray-800 md:hidden">Welcome, {user.lastName}</h2>
            <p className="text-xs text-gray-500 md:hidden">ID: {user.bookingId}</p>
          </div>
          <button onClick={handleLogout} className="md:hidden text-gray-400 hover:text-red-500">
            <LogOut size={18} />
          </button>
        </div>
        
        <div className="hidden md:block px-6 pb-4">
          <h2 className="font-bold text-gray-800">Welcome, {user.lastName}</h2>
          <p className="text-xs text-gray-500">ID: {user.bookingId}</p>
        </div>
        
        <nav className="flex-1 overflow-x-auto md:overflow-y-auto flex md:flex-col scrollbar-hide md:pb-20">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center space-x-3 px-6 py-4 whitespace-nowrap md:whitespace-normal transition-colors
                  ${activeTab === cat.id ? 'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}
                `}
              >
                <Icon size={20} />
                <span className="font-medium text-sm">{cat.name}</span>
              </button>
            )
          })}
        </nav>

        <div className="hidden md:block p-6 border-t border-gray-100 absolute bottom-0 w-full bg-white">
           <button onClick={handleLogout} className="flex items-center space-x-2 text-gray-500 hover:text-red-500 text-sm font-medium transition">
              <LogOut size={16} />
              <span>Sign Out</span>
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main ref={mainContentRef} className="flex-1 overflow-y-auto relative bg-gray-50 pb-20 md:pb-0">
        
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-4 flex justify-between items-center md:hidden border-b border-gray-200">
           <span className="font-bold text-gray-800">{CATEGORIES.find(c => c.id === activeTab)?.name}</span>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center p-8 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{CATEGORIES.find(c => c.id === activeTab)?.name}</h1>
            <p className="text-gray-500 mt-1">Select items to add to your stay</p>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="p-4 md:p-8">
          
          {activeTab === 'takeout' && (
            <div className="mb-8 bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-start space-x-4">
              <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 flex-shrink-0">
                <MessageCircle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-emerald-900 text-lg">Direct to Kitchen</h3>
                <p className="text-emerald-700 mt-1 text-sm leading-relaxed">
                  Items selected here are sent directly to our partner restaurant via WhatsApp. 
                  The kitchen will confirm your order and estimated delivery time instantly.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
            {activeItems.map(item => (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all border border-gray-100 flex flex-col">
                <div className="aspect-[4/3] bg-gray-50 rounded-xl mb-4 flex items-center justify-center text-6xl relative overflow-hidden group">
                  <span className="group-hover:scale-110 transition duration-300">{item.image || '🍽️'}</span>
                  {cart[item.id] > 0 && (
                     <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                       {cart[item.id]} in cart
                     </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800 leading-tight">{item.name}</h3>
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg text-sm">
                      ${item.price}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{item.desc}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  {cart[item.id] > 0 ? (
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button onClick={() => removeFromCart(item.id)} className="p-2 hover:bg-white rounded-md transition shadow-sm">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-bold text-sm">{cart[item.id]}</span>
                      <button onClick={() => addToCart(item)} className="p-2 hover:bg-white rounded-md transition shadow-sm">
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => addToCart(item)}
                      className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium text-sm transition flex items-center justify-center space-x-2"
                    >
                      <Plus size={16} />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      
      {/* Fixed Bottom "Review Order" Button */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-0 left-0 md:left-64 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-30">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition flex items-center justify-between px-6"
          >
            <div className="flex items-center space-x-3">
              <ShoppingBag size={20} />
              <span>Review Order</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="bg-white/20 px-2 py-1 rounded-md text-sm font-bold">{cartItemCount} items</span>
              <span className="font-bold">${getCartTotal()}</span>
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-xl font-bold flex items-center space-x-2">
                <ShoppingBag className="text-indigo-600" />
                <span>Your Cart</span>
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {Object.keys(cart).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                   <ShoppingBag size={48} className="opacity-20" />
                   <p>Your cart is empty.</p>
                   <button onClick={() => setIsCartOpen(false)} className="text-indigo-600 font-medium hover:underline">
                     Start Browsing
                   </button>
                </div>
              ) : (
                Object.entries(cart).map(([id, qty]) => {
                  const item = [...INVENTORY, ...RESTAURANT_MENU].find(i => i.id === parseInt(id));
                  if (!item) return null;
                  return (
                    <div key={id} className="flex items-center space-x-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                      <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center text-2xl relative group">
                        {item.image || '🍽️'}
                        <button 
                          onClick={() => removeAllFromCart(item.id)}
                          className="absolute -top-2 -left-2 bg-red-100 text-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 text-sm">{item.name}</h4>
                        <p className="text-gray-500 text-xs">${item.price} each</p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className="font-bold text-indigo-600">${item.price * qty}</span>
                        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                          <button onClick={() => removeFromCart(item.id)} className="p-1 hover:bg-white rounded-md transition">
                            <Minus size={12} />
                          </button>
                          <span className="w-6 text-center text-xs font-bold">{qty}</span>
                          <button onClick={() => addToCart(item)} className="p-1 hover:bg-white rounded-md transition">
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50">
               <div className="flex justify-between items-center mb-6">
                 <span className="text-gray-500 font-medium">Subtotal</span>
                 <span className="text-2xl font-bold text-gray-900">${getCartTotal()}</span>
               </div>
               
               {/* Order Timing Selector */}
               <div className="mb-6">
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">When should we deliver?</label>
                 <div className="bg-gray-200 p-1 rounded-xl flex">
                   <button
                    onClick={() => setOrderTiming('now')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all ${
                      orderTiming === 'now' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                   >
                     <Clock size={16} />
                     <span>Order Now</span>
                   </button>
                   <button
                    onClick={() => setOrderTiming('arrival')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all ${
                      orderTiming === 'arrival' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                   >
                     <Calendar size={16} />
                     <span>On Arrival</span>
                   </button>
                 </div>
               </div>
               
               <button 
                onClick={handleCheckout}
                disabled={Object.keys(cart).length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 transition flex items-center justify-center space-x-2"
               >
                 <MessageCircle size={20} />
                 <span>Send Order via WhatsApp</span>
               </button>
               
               <p className="text-xs text-center text-gray-400 mt-4">
                 Payment & Delivery confirmed via chat.
               </p>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3 z-[60] animate-bounce-in">
          <Check size={18} className="text-green-400" />
          <span className="font-medium text-sm">{notification}</span>
        </div>
      )}
    </div>
  );
}
