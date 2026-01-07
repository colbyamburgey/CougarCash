
import React, { useState, useEffect } from 'react';
import { UserRole, Student, Admin, StoreItem, CalendarEvent, Group, HallPassRecord, PurchaseRecord, Poll, Announcement, TimeLockout, BuddyConflict } from './types';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminPanel } from './components/AdminPanel';
import { Store } from './components/Store';
import { CalendarView } from './components/CalendarView';
import { TransactionHistory } from './components/TransactionHistory';

// Helper to generate mock students - set to empty as requested
const generateMockStudents = (): Student[] => {
  return [];
};

// Updated Initial Admin with Budget Fields and new Event Check-in Permission
const INITIAL_ADMINS: Admin[] = [
  { 
    id: 'adm-main', 
    role: 'ADMIN', 
    name: 'Main Admin', 
    email: 'karen.baker@letcher.kyschools.us', 
    loginCode: 'admin',
    permissions: ['attendance', 'calendar', 'store', 'scanner', 'student-directory', 'orders', 'manage-admins', 'point-checkout', 'hall-pass-monitor', 'award-points', 'polls-announcements', 'event-checkin'],
    monthlyAwardLimit: 5000, // $500 monthly budget
    pointsAwardedThisMonth: 0,
    lastResetMonth: new Date().toISOString().substring(0, 7) // Current YYYY-MM
  }
];

const INITIAL_STORE_ITEMS: StoreItem[] = [
  { id: '1', name: 'School Hoodie', description: 'Comfortable fleece hoodie with logo.', cost: 50, category: 'Apparel', image: 'https://picsum.photos/seed/hoodie/300/300', quantity: 15, requiresFulfillment: true },
  { id: '2', name: 'Front of Lunch Line', description: 'Skip the line pass for one week.', cost: 25, category: 'Privilege', image: 'https://picsum.photos/seed/lunch/300/300', quantity: 5, durationDays: 7 },
  { id: '3', name: 'Joe\'s Pizza Slice', description: 'Voucher for one free slice at Joe\'s.', cost: 15, category: 'Voucher', image: 'https://picsum.photos/seed/pizza/300/300', quantity: 50, externalBarcode: '012345678905' },
  { id: '4', name: 'City Cinema Ticket', description: 'One movie ticket voucher.', cost: 40, category: 'Voucher', image: 'https://picsum.photos/seed/cinema/300/300', quantity: 20, externalBarcode: '987654321098' },
  { id: '5', name: 'Extra Hall Pass', description: 'Permanently increases your weekly hall pass limit by 1.', cost: 100, category: 'Privilege', image: 'https://picsum.photos/seed/pass/300/300', quantity: 99, hallPassIncrease: 1 }
];

const INITIAL_EVENTS: CalendarEvent[] = [
  { date: '2023-10-31', title: 'Halloween Costume Day', bonusPoints: 10, eventType: 'special' }
];

const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (e) {
    console.error(`Error loading ${key} from storage`, e);
    return fallback;
  }
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'store' | 'admin' | 'calendar' | 'transactions'>('dashboard');
  const [currentUser, setCurrentUser] = useState<Student | Admin | null>(null);
  
  const [loginView, setLoginView] = useState<'menu' | 'student' | 'admin'>('menu');
  const [accessCode, setAccessCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  
  const [students, setStudents] = useState<Student[]>(() => {
    const loaded = loadFromStorage('app_students', generateMockStudents());
    return loaded.map(s => ({
      ...s,
      hallPassLimit: s.hallPassLimit ?? 5,
      hallPassesUsedThisMonth: s.hallPassesUsedThisMonth ?? 0
    }));
  });

  const [admins, setAdmins] = useState<Admin[]>(() => {
    const loadedAdmins = loadFromStorage('app_admins', INITIAL_ADMINS);
    return loadedAdmins.map((admin: any) => ({
      ...admin,
      permissions: admin.permissions || ['attendance', 'calendar', 'store', 'scanner', 'student-directory', 'orders', 'manage-admins', 'point-checkout', 'hall-pass-monitor', 'award-points', 'polls-announcements', 'event-checkin'],
      monthlyAwardLimit: admin.monthlyAwardLimit || 1000,
      pointsAwardedThisMonth: admin.pointsAwardedThisMonth || 0,
      lastResetMonth: admin.lastResetMonth || new Date().toISOString().substring(0, 7)
    }));
  });

  const [storeItems, setStoreItems] = useState<StoreItem[]>(() => loadFromStorage('app_storeItems', INITIAL_STORE_ITEMS));
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => loadFromStorage('app_calendarEvents', INITIAL_EVENTS));
  const [groups, setGroups] = useState<Group[]>(() => loadFromStorage('app_groups', []));
  const [hallPasses, setHallPasses] = useState<HallPassRecord[]>(() => loadFromStorage('app_hallPasses', []));
  const [polls, setPolls] = useState<Poll[]>(() => loadFromStorage('app_polls', []));
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => loadFromStorage('app_announcements', []));
  const [hallPassLockouts, setHallPassLockouts] = useState<TimeLockout[]>(() => loadFromStorage('app_hallPassLockouts', []));
  const [hallPassConflicts, setHallPassConflicts] = useState<BuddyConflict[]>(() => loadFromStorage('app_hallPassConflicts', []));
  
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [buyNowItem, setBuyNowItem] = useState<StoreItem | null>(null);

  const checkoutItems = currentUser?.role === 'STUDENT'
    ? (buyNowItem ? [buyNowItem] : storeItems.filter(item => (currentUser as Student).cart.includes(item.id)))
    : [];
  const checkoutTotal = checkoutItems.reduce((acc, item) => acc + item.cost, 0);

  useEffect(() => {
    localStorage.setItem('app_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('app_admins', JSON.stringify(admins));
    if (currentUser && currentUser.role === 'ADMIN') {
        const freshAdmin = admins.find(a => a.id === currentUser.id);
        if (freshAdmin) setCurrentUser(freshAdmin);
    }
  }, [admins, currentUser]);

  useEffect(() => {
    localStorage.setItem('app_storeItems', JSON.stringify(storeItems));
  }, [storeItems]);

  useEffect(() => {
    localStorage.setItem('app_calendarEvents', JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    localStorage.setItem('app_groups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('app_hallPasses', JSON.stringify(hallPasses));
  }, [hallPasses]);

  useEffect(() => {
    localStorage.setItem('app_polls', JSON.stringify(polls));
  }, [polls]);

  useEffect(() => {
    localStorage.setItem('app_announcements', JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem('app_hallPassLockouts', JSON.stringify(hallPassLockouts));
  }, [hallPassLockouts]);

  useEffect(() => {
    localStorage.setItem('app_hallPassConflicts', JSON.stringify(hallPassConflicts));
  }, [hallPassConflicts]);

  useEffect(() => {
    if (!currentUser) {
        setLoginView('menu');
        setAccessCode('');
        setLoginError('');
        setBiometricStatus('idle');
    }
  }, [currentUser]);

  const handleLogin = (user: Student | Admin) => {
    setCurrentUser(user);
    if (user.role === 'ADMIN') {
        setCurrentView('admin');
    } else {
        setCurrentView('dashboard');
    }
  };

  const verifyAccessCode = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (loginView === 'student') {
        const student = students.find(s => s.loginCode === accessCode);
        if (student) {
            handleLogin(student);
        } else {
            setLoginError('Invalid Access Code');
            setAccessCode('');
        }
    } else if (loginView === 'admin') {
        const admin = admins.find(a => a.loginCode === accessCode);
        if (admin) {
            handleLogin(admin);
        } else {
            setLoginError('Invalid Admin Code');
            setAccessCode('');
        }
    }
  };

  const handleBiometricLogin = () => {
    setBiometricStatus('scanning');
    setTimeout(() => {
        const lastId = localStorage.getItem('last_student_id');
        if (lastId) {
            const student = students.find(s => s.id === lastId);
            if (student) {
                setBiometricStatus('success');
                setTimeout(() => {
                    handleLogin(student);
                }, 1000);
            } else {
                setBiometricStatus('error');
                setLoginError('User data not found. Please use code.');
            }
        } else {
            setBiometricStatus('error');
            setLoginError('Face ID not set up on this device.');
        }
    }, 1500);
  };

  const handleToggleFavorite = (itemId: string) => {
    if (!currentUser || currentUser.role !== 'STUDENT') return;
    const student = currentUser as Student;
    const isFav = student.favorites.includes(itemId);
    const newFavorites = isFav 
      ? student.favorites.filter(id => id !== itemId)
      : [...student.favorites, itemId];

    const updatedStudents = students.map(s => s.id === student.id ? { ...s, favorites: newFavorites } : s);
    setStudents(updatedStudents);
    setCurrentUser({ ...student, favorites: newFavorites });
  };

  const handleAddToCart = (item: StoreItem) => {
    if (!currentUser || currentUser.role !== 'STUDENT') return;
    const student = currentUser as Student;
    
    const currentCartItems = storeItems.filter(i => student.cart.includes(i.id));
    const currentCartCost = currentCartItems.reduce((acc, i) => acc + i.cost, 0);
    
    if (student.totalPoints >= currentCartCost + item.cost) {
      const updatedStudents = students.map(s => s.id === student.id ? { ...s, cart: [...s.cart, item.id] } : s);
      setStudents(updatedStudents);
      setCurrentUser({ ...student, cart: [...student.cart, item.id] });
    } else {
      alert("You don't have enough points to add this to your cart.");
    }
  };

  const handleRemoveFromCart = (itemId: string) => {
    if (!currentUser || currentUser.role !== 'STUDENT') return;
    const student = currentUser as Student;
    
    const updatedCart = student.cart.filter(id => id !== itemId);
    const updatedStudents = students.map(s => {
        if (s.id === student.id) {
            return { ...s, cart: updatedCart };
        }
        return s;
    });
    setStudents(updatedStudents);
    setCurrentUser({ ...student, cart: updatedCart });
  };

  const handleBuyNow = (item: StoreItem) => {
    if (!currentUser || currentUser.role !== 'STUDENT') return;
    const student = currentUser as Student;

    if (student.totalPoints < item.cost) {
      alert("Insufficient points.");
      return;
    }

    if (item.quantity <= 0) {
      alert("Item is out of stock.");
      return;
    }

    setBuyNowItem(item);
    setShowCheckoutModal(true);
  };

  const handleCheckout = () => {
    if (!currentUser || currentUser.role !== 'STUDENT' || (currentUser as Student).cart.length === 0) return;
    const student = currentUser as Student;

    const cartItems = storeItems.filter(i => student.cart.includes(i.id));
    const totalCost = cartItems.reduce((acc, i) => acc + i.cost, 0);

    if (student.totalPoints < totalCost) {
      alert("Insufficient points.");
      return;
    }

    const outOfStockItems = cartItems.filter(i => i.quantity <= 0);
    if (outOfStockItems.length > 0) {
      alert(`Some items are out of stock: ${outOfStockItems.map(i => i.name).join(', ')}`);
      return;
    }

    setBuyNowItem(null);
    setShowCheckoutModal(true);
  };

  const confirmPurchase = () => {
    if (!currentUser || currentUser.role !== 'STUDENT') return;
    const student = currentUser as Student;
    
    const itemsToPurchase = buyNowItem 
        ? [buyNowItem] 
        : storeItems.filter(i => student.cart.includes(i.id));

    const totalCost = itemsToPurchase.reduce((acc, i) => acc + i.cost, 0);
    
    // Calculate total hall pass limit increase from all items in this purchase
    const totalPassIncrease = itemsToPurchase.reduce((acc, i) => acc + (i.hallPassIncrease || 0), 0);

    const updatedStoreItems = [...storeItems];
    const newPurchases: PurchaseRecord[] = [];
    
    itemsToPurchase.forEach(item => {
      const storeItem = updatedStoreItems.find(i => i.id === item.id);
      if (storeItem && storeItem.quantity > 0) {
          storeItem.quantity -= 1;
      }

      newPurchases.push({
        id: `TX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        date: new Date().toISOString(),
        itemName: item.name,
        cost: item.cost,
        category: item.category,
        image: item.image,
        redeemed: false,
        expirationDate: item.expirationDate,
        startDate: item.startDate,
        endDate: item.endDate,
        durationDays: item.durationDays,
        activationDate: undefined,
        requiresFulfillment: item.requiresFulfillment || false,
        fulfillmentStatus: item.requiresFulfillment ? 'pending' : undefined,
        externalBarcode: item.externalBarcode
      });
    });

    setStoreItems(updatedStoreItems);
    
    const updatedStudent: Student = {
      ...student,
      totalPoints: student.totalPoints - totalCost,
      hallPassLimit: student.hallPassLimit + totalPassIncrease, // Apply the increase
      purchaseHistory: [...student.purchaseHistory, ...newPurchases],
      cart: buyNowItem ? student.cart : [] 
    };

    const updatedStudents = students.map(s => s.id === student.id ? updatedStudent : s);

    setStudents(updatedStudents);
    setCurrentUser(updatedStudent);
    setShowCheckoutModal(false);
    setBuyNowItem(null);
    
    setTimeout(() => {
        let alertMsg = "Purchase successful! Check your Wallet.";
        if (totalPassIncrease > 0) {
          alertMsg += `\n\nYour weekly Hall Pass limit has been increased by ${totalPassIncrease}!`;
        }
        alert(alertMsg);
    }, 100);
  };

  const handleRedeemItem = (code: string): { success: boolean; message: string } => {
    let message = "Code not found.";
    let success = false;
    const now = new Date();
    
    const updatedStudents = students.map(student => {
      let studentModified = false;
      
      const updatedPurchases = student.purchaseHistory.map(p => {
        if (p.id === code || (p.externalBarcode && p.externalBarcode === code)) {
          
          if (p.category === 'Athletic Pass') {
             success = true;
             message = "Valid Athletic Pass";
             return p;
          }

          if (p.requiresFulfillment && !p.redeemed) {
              if (p.fulfillmentStatus === 'pending') {
                  success = true;
                  studentModified = true;
                  message = "Order fulfilled and picked up!";
                  return { ...p, redeemed: true, fulfillmentStatus: 'fulfilled' as const };
              }
              if (p.fulfillmentStatus === 'ready') {
                  success = true;
                  studentModified = true;
                  message = "Order picked up successfully!";
                  return { ...p, redeemed: true, fulfillmentStatus: 'fulfilled' as const };
              }
          }

          if (p.durationDays && p.durationDays > 0) {
             if (p.redeemed) {
               message = "This pass has expired.";
               return p;
             }
             if (!p.activationDate) {
               success = true;
               studentModified = true;
               message = `Activated! Valid for ${p.durationDays} days.`;
               return { ...p, activationDate: now.toISOString() };
             } else {
               const activation = new Date(p.activationDate);
               const expiry = new Date(activation.getTime() + (p.durationDays * 24 * 60 * 60 * 1000));
               
               if (now < expiry) {
                  success = true;
                  message = `Active! Expires on ${expiry.toLocaleDateString()}.`;
                  return p;
               } else {
                  studentModified = true;
                  message = "Pass has expired.";
                  return { ...p, redeemed: true };
               }
             }
          }

          if (p.startDate && p.endDate) {
             const start = new Date(p.startDate);
             const end = new Date(p.endDate);
             end.setHours(23, 59, 59, 999);

             if (now < start) {
                message = `Not valid yet. Starts ${p.startDate}.`;
                return p;
             }
             if (now > end) {
                studentModified = true;
                message = "Pass has expired.";
                return { ...p, redeemed: true };
             }
             
             success = true;
             message = `Valid Pass! (Expires ${p.endDate})`;
             return p;
          }

          if (p.expirationDate && new Date(p.expirationDate) < now) {
             message = "Voucher expired.";
             return p;
          }

          if (p.redeemed) {
             message = "Already used.";
             return p;
          }

          success = true;
          studentModified = true;
          message = `Verified! Redeemed ${p.itemName}.`;
          return { ...p, redeemed: true };
        }
        return p;
      });

      if (studentModified) {
        return { ...student, purchaseHistory: updatedPurchases };
      }
      return student;
    });

    if (success) {
       setStudents(updatedStudents);
    }

    return { success, message };
  };

  const handleClearNotifications = () => {
     if (!currentUser || currentUser.role !== 'STUDENT') return;
     const student = currentUser as Student;
     
     const updatedStudents = students.map(s => {
         if (s.id === student.id) {
             return {
                 ...s,
                 notifications: s.notifications.map(n => ({ ...n, read: true }))
             };
         }
         return s;
     });
     
     setStudents(updatedStudents);
     setCurrentUser({ ...student, notifications: student.notifications.map(n => ({ ...n, read: true })) });
  };

  const handleUseHallPass = (studentId: string, type: HallPassRecord['type']) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    if (student.hallPassesUsedThisMonth >= student.hallPassLimit) {
      alert("You have reached your hall pass limit for the week.");
      return;
    }

    const newPass: HallPassRecord = {
      id: `HP-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      studentId,
      studentName: student.name,
      timestamp: new Date().toISOString(),
      type,
      status: 'active'
    };

    setHallPasses([...hallPasses, newPass]);
    
    const updatedStudents = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          hallPassesUsedThisMonth: s.hallPassesUsedThisMonth + 1
        };
      }
      return s;
    });
    setStudents(updatedStudents);
    
    if (currentUser?.id === studentId) {
      setCurrentUser(updatedStudents.find(s => s.id === studentId) as Student);
    }
    
    return newPass;
  };

  const handleVote = (pollId: string, optionId: string) => {
    if (!currentUser || currentUser.role !== 'STUDENT') return;
    const student = currentUser as Student;

    const updatedPolls = polls.map(poll => {
      if (poll.id === pollId) {
        // Check if student already voted in this poll
        const alreadyVoted = poll.options.some(opt => opt.votes.includes(student.id));
        if (alreadyVoted) return poll;

        const updatedOptions = poll.options.map(opt => {
          if (opt.id === optionId) {
            return { ...opt, votes: [...opt.votes, student.id] };
          }
          return opt;
        });
        return { ...poll, options: updatedOptions };
      }
      return poll;
    });

    setPolls(updatedPolls);
  };

  return (
    <div className="h-screen h-[100dvh] bg-slate-50 w-full mx-auto shadow-2xl overflow-hidden relative lg:max-w-[95%] xl:max-w-[1920px] flex flex-col">
      {currentUser && (
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => currentUser?.role === 'ADMIN' ? setCurrentView('admin') : setCurrentView('dashboard')}>
              <div className="w-10 h-10 bg-[#0040ba] rounded-lg flex items-center justify-center text-white shadow-md overflow-hidden">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 7.28V5C21 3.9 20.11 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.11 3.9 21 5 21H19C20.11 21 21 20.11 21 19V16.72C21.59 16.37 22 15.74 22 15V9C22 8.26 21.59 7.63 21 7.28ZM20 15H13V9H20V15ZM5 19V5H19V7H13C11.9 7 11 7.9 11 9V15C11 16.1 11.9 17 13 17H19V19H5Z" />
                  <circle cx="16.5" cy="12" r="1.5" />
                </svg>
              </div>
              <div className="leading-tight hidden sm:block">
                <div className="font-extrabold text-[#0040ba] uppercase tracking-wide">Cougar Cash</div>
                <div className="text-[10px] text-slate-500 font-bold tracking-widest">LCC COUGARS</div>
              </div>
            </div>

            {/* Desktop Navigation for Students */}
            {currentUser.role === 'STUDENT' && (
              <nav className="hidden lg:flex items-center ml-4 gap-1">
                <button 
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentView === 'dashboard' ? 'text-[#0040ba] bg-blue-50 border-b-2 border-[#0040ba]' : 'text-slate-500 hover:text-[#0040ba] hover:bg-blue-50/50'}`}
                >
                  Home
                </button>
                <button 
                  onClick={() => setCurrentView('calendar')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentView === 'calendar' ? 'text-[#0040ba] bg-blue-50 border-b-2 border-[#0040ba]' : 'text-slate-500 hover:text-[#0040ba] hover:bg-blue-50/50'}`}
                >
                  Calendar
                </button>
                <button 
                  onClick={() => setCurrentView('store')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all relative ${currentView === 'store' ? 'text-[#0040ba] bg-blue-50 border-b-2 border-[#0040ba]' : 'text-slate-500 hover:text-[#0040ba] hover:bg-blue-50/50'}`}
                >
                  Store
                  {(currentUser as Student).cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                      {(currentUser as Student).cart.length}
                    </span>
                  )}
                </button>
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {currentUser?.role === 'STUDENT' && (
               <div 
                 onClick={() => setCurrentView('transactions')}
                 className="bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-2 border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
               >
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="font-bold text-[#0040ba] text-sm">{(currentUser as Student).totalPoints} pts</span>
               </div>
            )}

            {currentUser?.role === 'ADMIN' && (
              <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-slate-700">{(currentUser as Admin).name}</div>
                      <div className="text-[10px] text-slate-400">ADMINISTRATOR</div>
                  </div>
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600">
                      {(currentUser as Admin).name.charAt(0)}
                  </div>
              </div>
            )}

            <button 
              onClick={() => setCurrentUser(null)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Log Out"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto">
        {currentUser?.role === 'STUDENT' && currentView === 'dashboard' && (
          <StudentDashboard 
            student={currentUser as Student} 
            calendarEvents={calendarEvents} 
            hallPasses={hallPasses}
            polls={polls}
            announcements={announcements}
            hallPassLockouts={hallPassLockouts}
            hallPassConflicts={hallPassConflicts}
            onViewHistory={() => setCurrentView('transactions')}
            onClearNotifications={handleClearNotifications}
            onUseHallPass={handleUseHallPass}
            onVote={handleVote}
          />
        )}
        
        {currentUser && currentView === 'store' && (
          <Store 
            student={currentUser as Student} 
            items={storeItems} 
            onUpdateItems={setStoreItems}
            isAdmin={currentUser.role === 'ADMIN'} 
            onAddToCart={handleAddToCart}
            onRemoveFromCart={handleRemoveFromCart}
            onToggleFavorite={handleToggleFavorite}
            onCheckout={handleCheckout}
            onBuyNow={handleBuyNow}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView events={calendarEvents} />
        )}

        {currentUser?.role === 'STUDENT' && currentView === 'transactions' && (
          <TransactionHistory 
            student={currentUser as Student} 
            onBack={() => setCurrentView('dashboard')} 
          />
        )}

        {currentUser?.role === 'ADMIN' && currentView === 'admin' && (
          <AdminPanel 
            currentAdmin={currentUser as Admin}
            students={students}
            admins={admins}
            calendarEvents={calendarEvents}
            storeItems={storeItems}
            groups={groups}
            hallPasses={hallPasses}
            polls={polls}
            announcements={announcements}
            hallPassLockouts={hallPassLockouts}
            hallPassConflicts={hallPassConflicts}
            onUpdateStudents={setStudents}
            onUpdateAdmins={setAdmins}
            onUpdateEvents={setCalendarEvents}
            onUpdateStoreItems={setStoreItems}
            onUpdateGroups={setGroups}
            onUpdateHallPasses={setHallPasses}
            onUpdatePolls={setPolls}
            onUpdateAnnouncements={setAnnouncements}
            onUpdateLockouts={setHallPassLockouts}
            onUpdateConflicts={setHallPassConflicts}
            onRedeemItem={handleRedeemItem}
          />
        )}
        
        {currentUser && (
          <footer className="py-6 text-center text-slate-400 text-xs border-t border-slate-200 mt-auto bg-slate-50">
              <div className="flex justify-center gap-4 mb-2">
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
                  <span>•</span>
                  <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">Terms of Service</a>
                  <span>•</span>
                  <a href="#" className="hover:text-slate-600 transition-colors">Data Compliance</a>
              </div>
              <p>© {new Date().getFullYear()} Letcher County Central High School. All rights reserved.</p>
          </footer>
        )}
      </main>

      {currentUser?.role === 'STUDENT' && (
        <nav className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center z-50 lg:hidden">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'dashboard' ? 'text-[#0040ba]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-[10px] font-bold">Home</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('calendar')}
            className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'calendar' ? 'text-[#0040ba]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-[10px] font-bold">Calendar</span>
          </button>

          <button 
            onClick={() => setCurrentView('store')}
            className={`relative flex flex-col items-center gap-1 transition-colors ${currentView === 'store' ? 'text-[#0040ba]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {(currentUser as Student).cart.length > 0 && (
               <div className="absolute -top-2 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                 {(currentUser as Student).cart.length}
               </div>
            )}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            <span className="text-[10px] font-bold">Store</span>
          </button>
        </nav>
      )}

      {showCheckoutModal && currentUser?.role === 'STUDENT' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-100">
                 <h2 className="text-xl font-bold text-slate-800">Confirm Purchase</h2>
                 <p className="text-slate-500 text-sm">Review your items before redeeming.</p>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                 {checkoutItems.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="flex justify-between items-center">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                             <img src={item.image} alt="" className="w-full h-full object-cover"/>
                          </div>
                          <div>
                             <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                             <p className="text-xs text-slate-500">{item.category}</p>
                          </div>
                       </div>
                       <span className="font-bold text-[#0040ba]">{item.cost} pts</span>
                    </div>
                 ))}
                 
                 <div className="border-t border-slate-100 pt-4 mt-4 space-y-2">
                    <div className="flex justify-between text-slate-500 text-sm">
                       <span>Total Cost</span>
                       <span className="font-bold">{checkoutTotal} pts</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-sm">
                       <span>Current Balance</span>
                       <span className="font-bold">{(currentUser as Student).totalPoints} pts</span>
                    </div>
                    <div className="flex justify-between text-slate-800 font-bold text-lg pt-2 border-t border-slate-100">
                       <span>Remaining Balance</span>
                       <span className={(currentUser as Student).totalPoints - checkoutTotal < 0 ? "text-red-500" : "text-green-600"}>
                          {(currentUser as Student).totalPoints - checkoutTotal} pts
                       </span>
                    </div>
                 </div>
              </div>
              <div className="p-4 bg-slate-50 flex gap-3">
                 <button onClick={() => { setShowCheckoutModal(false); setBuyNowItem(null); }} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                 <button onClick={confirmPurchase} className="flex-1 py-3 bg-[#0040ba] text-white font-bold rounded-xl hover:bg-blue-800 shadow-md transition-colors">Confirm Purchase</button>
              </div>
           </div>
        </div>
      )}
      
      {!currentUser && (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-8 border-[#0040ba] transition-all relative z-10">
            <div className="w-24 h-24 bg-[#0040ba] rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg border-4 border-white z-10 relative">
               <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M21 7.28V5C21 3.9 20.11 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.11 3.9 21 5 21H19C20.11 21 21 20.11 21 19V16.72C21.59 16.37 22 15.74 22 15V9C22 8.26 21.59 7.63 21 7.28ZM20 15H13V9H20V15ZM5 19V5H19V7H13C11.9 7 11 7.9 11 9V15C11 16.1 11.9 17 13 17H19V19H5Z" />
               </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-[#0040ba] mb-1">Cougar Cash</h1>
            <p className="text-slate-500 mb-8 font-medium">Letcher County Central</p>
            
            {loginView === 'menu' ? (
               <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                 <button onClick={() => setLoginView('student')} className="w-full py-4 px-4 bg-[#0040ba] hover:bg-blue-800 text-white rounded-xl font-bold transition-all hover:scale-[1.02] shadow-md flex items-center justify-center gap-2">Student Access</button>
                 <button onClick={() => setLoginView('admin')} className="w-full py-3 px-4 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-transform active:scale-95 flex items-center justify-center gap-2">Admin Portal</button>
               </div>
            ) : (
               <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                  <form onSubmit={verifyAccessCode} className="space-y-4">
                      <div className="text-left">
                         <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">{loginView === 'admin' ? 'Enter Admin Code' : 'Enter Access Code'}</label>
                         <input 
                           type="password" 
                           inputMode={loginView === 'admin' ? "text" : "numeric"}
                           maxLength={loginView === 'admin' ? 20 : 6} 
                           value={accessCode} 
                           onChange={e => setAccessCode(loginView === 'admin' ? e.target.value : e.target.value.replace(/[^0-9]/g, ''))} 
                           className="w-full p-4 text-center text-3xl font-mono border-2 border-slate-300 rounded-xl focus:border-[#0040ba] outline-none" 
                           autoFocus 
                         />
                      </div>
                      {loginError && <p className="text-red-500 text-sm font-bold">{loginError}</p>}
                      <button type="submit" disabled={accessCode.length < 3} className="w-full py-4 rounded-xl font-bold text-lg bg-[#0040ba] text-white hover:bg-blue-800 disabled:bg-slate-200 shadow-md">Login</button>
                      
                      <button 
                        type="button" 
                        onClick={() => { setLoginView('menu'); setAccessCode(''); setLoginError(''); }}
                        className="w-full mt-2 text-slate-400 font-bold hover:text-[#0040ba] text-xs uppercase tracking-widest transition-colors"
                      >
                        ← Back to Roles
                      </button>
                  </form>
               </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500 transition-colors">Terms of Service</a>
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500 transition-colors">Privacy Policy</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
