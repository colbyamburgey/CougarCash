
import React, { useState } from 'react';
import { StoreItem, Student } from '../types';
import { generateStoreItems } from '../services/geminiService';

interface StoreProps {
  student: Student;
  items: StoreItem[];
  onUpdateItems: (items: StoreItem[]) => void;
  isAdmin: boolean;
  onAddToCart?: (item: StoreItem) => void;
  onRemoveFromCart?: (itemId: string) => void;
  onToggleFavorite?: (itemId: string) => void;
  onCheckout?: () => void;
  onBuyNow?: (item: StoreItem) => void;
}

export const Store: React.FC<StoreProps> = ({ 
  student, 
  items, 
  onUpdateItems, 
  isAdmin, 
  onAddToCart,
  onRemoveFromCart,
  onToggleFavorite,
  onCheckout,
  onBuyNow
}) => {
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'shop' | 'favorites' | 'cart'>('shop');

  const handleGenerateItems = async () => {
    setGenerating(true);
    const newItems = await generateStoreItems("High School Finals Week Survival");
    if (newItems.length > 0) {
      onUpdateItems([...items, ...newItems]);
    }
    setGenerating(false);
  };

  // Internal conversion logic: 10 pts = $1
  const cartItems = items.filter(item => student.cart.includes(item.id));
  const cartTotalPoints = cartItems.reduce((acc, item) => acc + item.cost, 0);
  const cartTotalCash = (cartTotalPoints / 10).toFixed(2);
  const studentCash = (student.totalPoints / 10).toFixed(2);
  
  const favoriteItems = items.filter(item => student.favorites.includes(item.id));
  
  const renderItemCard = (item: StoreItem, isCartView = false) => {
    const isFavorite = student.favorites.includes(item.id);
    const isInCart = student.cart.includes(item.id);
    const outOfStock = item.quantity <= 0;
    
    // Affordability Check
    const canAfford = student.totalPoints >= (cartTotalPoints + (isInCart ? 0 : item.cost));
    const canAffordBuyNow = student.totalPoints >= item.cost;
    
    const cashPrice = (item.cost / 10).toFixed(2);

    return (
      <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow relative">
        <div className="h-40 bg-slate-100 relative group">
           <img 
            src={item.image} 
            alt={item.name} 
            className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${outOfStock ? 'grayscale opacity-60' : ''}`}
           />
           <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm z-10 uppercase tracking-wider">
             {item.category}
           </div>
           
           {!isAdmin && (
             <button 
               onClick={(e) => { e.stopPropagation(); onToggleFavorite && onToggleFavorite(item.id); }}
               className="absolute top-2 left-2 p-1.5 rounded-full bg-white/80 hover:bg-white text-red-500 z-10 transition-colors"
             >
               {isFavorite ? (
                 <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
               ) : (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
               )}
             </button>
           )}

           {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
              <span className="bg-red-600 text-white font-bold px-3 py-1 text-sm rounded shadow-lg transform -rotate-12 border-2 border-white uppercase">Sold Out</span>
            </div>
           )}
        </div>
        
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex justify-between items-start">
             <h3 className="font-bold text-lg text-slate-800 leading-tight">{item.name}</h3>
          </div>
          <p className="text-slate-500 text-xs mt-1 mb-3 line-clamp-2">{item.description}</p>
          
          {!outOfStock && (
             <div className="mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${item.quantity < 5 ? 'bg-red-50 text-red-500 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                   {item.quantity} available
                </span>
             </div>
           )}

          <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center gap-2">
             <div className="flex flex-col">
                <span className="font-bold text-[#0040ba] text-xl">${cashPrice}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{item.cost} points</span>
             </div>
             
             {!isAdmin && (
               isCartView ? (
                 <button 
                   onClick={() => onRemoveFromCart && onRemoveFromCart(item.id)}
                   className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                   title="Remove from Cart"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
               ) : (
                 <div className="flex gap-2">
                   <button
                     onClick={() => onBuyNow && onBuyNow(item)}
                     disabled={outOfStock || !canAffordBuyNow}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        outOfStock || !canAffordBuyNow
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700 active:scale-95 shadow-sm'
                     }`}
                   >
                     Buy Now
                   </button>
                   <button
                     onClick={() => onAddToCart && onAddToCart(item)}
                     disabled={outOfStock || isInCart || !canAfford}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all whitespace-nowrap ${
                       outOfStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                       isInCart ? 'bg-blue-50 text-[#0040ba] cursor-not-allowed' :
                       !canAfford ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                       'bg-[#0040ba] text-white hover:bg-blue-800 active:scale-95 shadow-sm'
                     }`}
                   >
                     {isInCart ? (
                       <>
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                         In Cart
                       </>
                     ) : (
                       <>
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                         Add
                       </>
                     )}
                   </button>
                 </div>
               )
             )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 pb-24 max-w-[95%] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cougar Store</h2>
          <p className="text-slate-500 text-sm">Redeem your hard-earned rewards!</p>
        </div>
        
        {isAdmin ? (
           <button 
             onClick={handleGenerateItems}
             disabled={generating}
             className="text-sm bg-[#0040ba]/10 text-[#0040ba] px-4 py-2 rounded-lg hover:bg-[#0040ba]/20 font-bold transition-colors"
           >
             {generating ? 'Loading...' : '✨ AI Stock Items'}
           </button>
        ) : (
          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button 
               onClick={() => setActiveTab('shop')}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'shop' ? 'bg-white text-[#0040ba] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Shop
             </button>
             <button 
               onClick={() => setActiveTab('favorites')}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${activeTab === 'favorites' ? 'bg-white text-[#0040ba] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Favorites
             </button>
             <button 
               onClick={() => setActiveTab('cart')}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${activeTab === 'cart' ? 'bg-white text-[#0040ba] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Cart
               {student.cart.length > 0 && <span className="bg-[#0040ba] text-white text-[10px] px-1.5 rounded-full">{student.cart.length}</span>}
             </button>
          </div>
        )}
      </div>

      {activeTab === 'cart' && !isAdmin ? (
        <div className="space-y-6">
           {cartItems.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
               <svg className="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
               <h3 className="text-xl font-bold text-slate-400">Your cart is empty</h3>
               <button onClick={() => setActiveTab('shop')} className="mt-4 text-[#0040ba] font-bold hover:underline">Start Shopping</button>
             </div>
           ) : (
             <>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                 {cartItems.map(item => renderItemCard(item, true))}
               </div>
               
               <div className="bg-white p-6 rounded-xl border-t-4 border-[#0040ba] shadow-lg sticky bottom-24">
                  <div className="flex justify-between items-center mb-4">
                     <div>
                       <p className="text-slate-500 text-sm font-bold uppercase">Total Order</p>
                       <h3 className="text-3xl font-extrabold text-slate-800">${cartTotalCash}</h3>
                     </div>
                     <div className="text-right">
                       <p className="text-slate-500 text-sm font-bold uppercase">Wallet</p>
                       <h3 className={`text-xl font-bold ${student.totalPoints >= cartTotalPoints ? 'text-green-600' : 'text-red-500'}`}>
                         ${studentCash}
                       </h3>
                     </div>
                  </div>
                  <button 
                    onClick={onCheckout}
                    disabled={student.totalPoints < cartTotalPoints}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-md transition-all ${
                      student.totalPoints >= cartTotalPoints 
                      ? 'bg-[#0040ba] text-white hover:bg-blue-800 active:scale-95' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {student.totalPoints >= cartTotalPoints ? 'Complete Purchase' : 'Insufficient Funds'}
                  </button>
               </div>
             </>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(!isAdmin && activeTab === 'favorites') ? (
             favoriteItems.length > 0 ? (
               favoriteItems.map(item => renderItemCard(item))
             ) : (
               <div className="col-span-full text-center py-20 text-slate-400 italic">No favorites yet. Tap the heart on items to add them here.</div>
             )
          ) : (
             items.map(item => renderItemCard(item))
          )}
        </div>
      )}
    </div>
  );
};
