
import React, { useState, useEffect } from 'react';
import { Student, CalendarEvent, PurchaseRecord, HallPassRecord, Poll, Announcement, TimeLockout, BuddyConflict } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StudentDashboardProps {
  student: Student;
  calendarEvents: CalendarEvent[];
  hallPasses: HallPassRecord[];
  polls: Poll[];
  announcements: Announcement[];
  hallPassLockouts: TimeLockout[];
  hallPassConflicts: BuddyConflict[];
  onViewHistory: () => void;
  onClearNotifications?: () => void;
  onUseHallPass: (studentId: string, type: HallPassRecord['type']) => void;
  onVote: (pollId: string, optionId: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
  student, 
  calendarEvents, 
  hallPasses,
  polls,
  announcements,
  hallPassLockouts,
  hallPassConflicts,
  onViewHistory, 
  onClearNotifications, 
  onUseHallPass,
  onVote
}) => {
  const [selectedPass, setSelectedPass] = useState<PurchaseRecord | (Partial<PurchaseRecord> & { isDebit?: boolean, isHallPass?: boolean }) | null>(null);
  const [isWalletHubOpen, setIsWalletHubOpen] = useState(false);
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [showPassRequest, setShowPassRequest] = useState(false);

  useEffect(() => {
    // Check if Face ID is enabled for this specific user on this device
    const storedId = localStorage.getItem('last_student_id');
    setFaceIdEnabled(storedId === student.id);
  }, [student.id]);

  const activeHallPass = hallPasses.find(p => p.studentId === student.id && p.status === 'active');

  const handleToggleFaceId = () => {
    if (faceIdEnabled) {
      localStorage.removeItem('last_student_id');
      setFaceIdEnabled(false);
    } else {
      const confirmSetup = window.confirm("Enable Face ID for faster login on this device?");
      if (confirmSetup) {
          localStorage.setItem('last_student_id', student.id);
          setFaceIdEnabled(true);
      }
    }
  }

  const data = student.attendanceHistory
    .filter(entry => {
       const [y, m, d] = entry.date.split('-').map(Number);
       const date = new Date(y, m - 1, d);
       const day = date.getDay();
       return day >= 1 && day <= 5; 
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-5)
    .map(entry => {
       const [y, m, d] = entry.date.split('-').map(Number);
       const date = new Date(y, m - 1, d);
       return {
         name: date.toLocaleDateString('en-US', { weekday: 'short' }),
         cash: entry.pointsAwarded / 10
       };
    });

  const upcomingEvents = calendarEvents
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const walletItems = student.purchaseHistory.filter(item => 
    (!item.redeemed || (item.requiresFulfillment && item.fulfillmentStatus === 'ready') || item.category === 'Athletic Pass') && (
      item.category.toLowerCase().includes('voucher') || 
      item.category.toLowerCase().includes('privilege') ||
      item.category.toLowerCase().includes('food') ||
      item.category.toLowerCase().includes('apparel') ||
      item.category.toLowerCase().includes('supplies') ||
      item.category === 'Athletic Pass'
    )
  );
  
  const debitCard = { 
    itemName: 'Student Debit Card', 
    category: 'Account Card', 
    id: student.id, 
    isDebit: true 
  };

  const hallPassCard = {
    itemName: 'Digital Hall Pass',
    category: 'Student Privilege',
    id: activeHallPass?.id || 'hall-pass',
    isHallPass: true
  };

  const unreadNotifications = student.notifications.filter(n => !n.read);

  const cashBalance = (student.totalPoints / 10).toFixed(2);
  const progressPoints = student.totalPoints % 10;
  const progressPercentage = (progressPoints / 10) * 100;

  const handleRequestPass = (type: HallPassRecord['type']) => {
    // 1. Time Lockout Check
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const activeLockout = hallPassLockouts.find(l => currentTime >= l.startTime && currentTime <= l.endTime);
    if (activeLockout) {
      alert(`Hall passes are currently restricted: ${activeLockout.label}. They will be available after ${activeLockout.endTime}.`);
      return;
    }

    // 2. Buddy Conflict Check
    const relevantConflicts = hallPassConflicts.filter(c => c.studentIds.includes(student.id));
    for (const conflict of relevantConflicts) {
      const otherStudentId = conflict.studentIds.find(id => id !== student.id);
      if (otherStudentId) {
        const isOtherStudentOut = hallPasses.some(p => p.studentId === otherStudentId && p.status === 'active');
        if (isOtherStudentOut) {
          alert(`Conflict: You cannot leave class while certain restricted students are already out on a pass. Please wait for their return.`);
          return;
        }
      }
    }

    onUseHallPass(student.id, type);
    setShowPassRequest(false);
  };

  // Polls filtering
  const nowTime = new Date();
  const activeAnnouncements = announcements.filter(a => a.active && new Date(a.expiresAt) > nowTime);
  const relevantPolls = polls.filter(p => p.active && new Date(p.expiresAt) > nowTime);

  return (
    <div className="space-y-6 p-4 pb-24 relative max-w-7xl mx-auto">
      
      {activeAnnouncements.length > 0 && (
          <div className="space-y-2">
              {activeAnnouncements.map(ann => (
                  <div key={ann.id} className="bg-[#0040ba] text-white p-4 rounded-xl shadow-md animate-in slide-in-from-top-4 duration-500 flex items-start gap-4">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                      </div>
                      <div>
                          <h4 className="font-bold uppercase tracking-wider text-xs text-blue-200">School Announcement</h4>
                          <p className="font-bold text-lg leading-tight">{ann.title}</p>
                          <p className="text-sm text-blue-100 mt-1">{ann.content}</p>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {unreadNotifications.length > 0 && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
               <div className="bg-[#0040ba] p-4 text-white flex items-center justify-center">
                   <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                   </div>
               </div>
               <div className="p-6 text-center">
                  <h3 className="text-xl font-extrabold text-slate-800 mb-2">You have updates!</h3>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto mb-4">
                      {unreadNotifications.map(notif => (
                          <div key={notif.id} className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-left">
                              <p className="font-bold text-[#0040ba] text-sm">{notif.title}</p>
                              <p className="text-slate-600 text-sm mt-1">{notif.message}</p>
                              <p className="text-xs text-slate-400 mt-2 text-right">{new Date(notif.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                      ))}
                  </div>
                  <button 
                     onClick={onClearNotifications}
                     className="w-full py-3 bg-[#0040ba] text-white font-bold rounded-xl shadow-lg hover:bg-blue-800 transition-colors"
                  >
                     Got it!
                  </button>
               </div>
            </div>
         </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Hi, {student.name.split(' ')[0]}! 👋</h1>
          <p className="text-slate-500 text-sm font-medium">Logged in as {student.name}</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">System Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card Main */}
          <div 
            onClick={onViewHistory}
            className="lg:col-span-2 bg-[#0040ba] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden cursor-pointer hover:bg-blue-800 transition-all active:scale-[0.99] group"
          >
            <div className="relative z-10 flex flex-col h-full">
              <p className="text-blue-100 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                Available Cash Balance
                <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </p>
              <h1 className="text-7xl font-black mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-medium text-blue-300">$</span>
                {cashBalance}
              </h1>
              
              <div className="mt-auto pt-10">
                  <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Progress to next $1.00</span>
                      <span className="text-sm font-black text-white">{progressPoints}/10 points</span>
                  </div>
                  <div className="h-3 w-full bg-blue-900/40 rounded-full overflow-hidden border border-white/10">
                      <div 
                          className="h-full bg-gradient-to-r from-blue-300 to-white rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                          style={{ width: `${progressPercentage}%` }}
                      ></div>
                  </div>
                  <p className="text-blue-200 mt-4 text-xs font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Tap anywhere to view transaction history</p>
              </div>
            </div>
            
            <div className="absolute right-[-20px] bottom-[-40px] opacity-10 transform rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <svg width="300" height="300" viewBox="0 0 100 100" fill="currentColor" className="text-white">
                <path d="M20,10 C25,25 20,40 10,55 C15,40 25,30 35,15 Z M40,8 C45,28 42,45 35,60 C40,45 50,30 60,12 Z M65,10 C68,30 63,50 55,65 C62,50 75,35 85,15 Z" />
              </svg>
            </div>
          </div>

          {/* Quick Stats / Right Side */}
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#0040ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  Quick Stats
                </h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <span className="text-xs font-bold text-slate-400 uppercase">Purchases</span>
                        <span className="font-black text-slate-700">{student.purchaseHistory.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <span className="text-xs font-bold text-slate-400 uppercase">Days Present</span>
                        <span className="font-black text-slate-700">{student.attendanceHistory.filter(a => a.present).length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <span className="text-xs font-bold text-slate-400 uppercase">Weekly Limit</span>
                        <span className="font-black text-orange-600">{student.hallPassesUsedThisMonth}/{student.hallPassLimit}</span>
                    </div>
                </div>
              </div>

              {/* Mini Calendar Rate */}
              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden">
                <h3 className="font-bold text-[#0040ba] mb-1">Today's Rate</h3>
                <p className="text-4xl font-black text-[#0040ba] flex items-baseline gap-1">
                    2 <span className="text-sm font-bold uppercase">points</span>
                </p>
                <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/></svg>
                </div>
              </div>
          </div>
      </div>

      {/* Interactive Polls Section */}
      {relevantPolls.length > 0 && (
          <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  Student Voice Polls
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {relevantPolls.map(poll => {
                      const votedOption = poll.options.find(opt => opt.votes.includes(student.id));
                      const hasVoted = !!votedOption;
                      const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

                      return (
                          <div key={poll.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in zoom-in duration-300">
                              <h4 className="font-bold text-slate-800 text-lg mb-4">{poll.question}</h4>
                              <div className="space-y-3">
                                  {poll.options.map(opt => {
                                      const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                                      const isSelected = votedOption?.id === opt.id;

                                      return (
                                          <button 
                                              key={opt.id}
                                              disabled={hasVoted}
                                              onClick={() => onVote(poll.id, opt.id)}
                                              className={`w-full text-left p-4 rounded-2xl border-2 transition-all relative overflow-hidden group ${
                                                  hasVoted 
                                                  ? (isSelected ? 'border-[#0040ba] bg-blue-50' : 'border-slate-100 bg-white')
                                                  : 'border-slate-100 hover:border-[#0040ba] hover:bg-blue-50 active:scale-95'
                                              }`}
                                          >
                                              {hasVoted && (
                                                  <div 
                                                      className="absolute inset-0 bg-[#0040ba]/10 transition-all duration-1000 z-0"
                                                      style={{ width: `${pct}%` }}
                                                  ></div>
                                              )}
                                              <div className="relative z-10 flex justify-between items-center">
                                                  <span className={`font-bold ${hasVoted && isSelected ? 'text-[#0040ba]' : 'text-slate-700'}`}>
                                                      {opt.text}
                                                  </span>
                                                  {hasVoted ? (
                                                      <span className="text-xs font-black text-[#0040ba]">{pct}%</span>
                                                  ) : (
                                                      <div className="w-5 h-5 rounded-full border-2 border-slate-200 group-hover:border-[#0040ba] transition-colors"></div>
                                                  )}
                                              </div>
                                          </button>
                                      );
                                  })}
                              </div>
                              <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  <span>{hasVoted ? 'Thank you for voting!' : 'Select an option to vote'}</span>
                                  <span>{totalVotes} total votes</span>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-[#0040ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            My Wallet <span className="text-xs bg-[#0040ba] text-white px-2 py-0.5 rounded-full">{walletItems.length + 2}</span>
          </h3>
          <button 
            onClick={() => setIsWalletHubOpen(true)}
            className="text-[#0040ba] flex items-center gap-1 text-sm font-bold hover:underline"
          >
            See All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar">
          <button 
            onClick={() => setSelectedPass(debitCard)}
            className="snap-center shrink-0 w-64 rounded-xl overflow-hidden relative shadow-md text-white border-l-4 text-left transition-transform active:scale-[0.95] group bg-gradient-to-br from-[#0040ba] to-blue-900 border-white/30"
          >
             <div className="absolute top-0 right-0 p-2 opacity-30">
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v2h16V6H4zm0 6v4h16v-4H4z"/>
                </svg>
             </div>
             <div className="p-4 relative z-10 h-32 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded text-white border border-white/30">DEBIT CARD</span>
                  <h4 className="font-bold text-lg mt-2 leading-tight">Cougar Cash Card</h4>
                </div>
                <div className="flex justify-between items-end">
                   <span className="text-xs text-blue-100">{student.name}</span>
                   <span className="text-[10px] font-bold px-2 py-1 rounded bg-white text-[#0040ba]">TAP TO PAY</span>
                </div>
             </div>
          </button>

          <button 
            onClick={() => setSelectedPass(hallPassCard)}
            className={`snap-center shrink-0 w-64 rounded-xl overflow-hidden relative shadow-md text-white border-l-4 text-left transition-transform active:scale-[0.95] group ${
              activeHallPass ? 'bg-orange-600 border-white/40' : 'bg-slate-800 border-orange-500'
            }`}
          >
             <div className="absolute top-0 right-0 p-2 opacity-30">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
             </div>
             <div className="p-4 relative z-10 h-32 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded text-white border border-white/30">WEEKLY PASS</span>
                  <h4 className="font-bold text-lg mt-2 leading-tight">Digital Hall Pass</h4>
                </div>
                <div className="flex justify-between items-end">
                   <span className="text-xs text-orange-200">{student.hallPassesUsedThisMonth}/{student.hallPassLimit} used</span>
                   <span className={`text-[10px] font-bold px-2 py-1 rounded bg-white ${activeHallPass ? 'text-orange-600' : 'text-slate-800'}`}>
                      {activeHallPass ? 'ACTIVE' : 'TAP TO USE'}
                   </span>
                </div>
             </div>
          </button>

          {walletItems.map((item, idx) => {
            const isAthleticPass = item.category === 'Athletic Pass';
            return (
              <button 
                key={idx} 
                onClick={() => setSelectedPass(item)}
                className={`snap-center shrink-0 w-64 rounded-xl overflow-hidden relative shadow-md text-white border-l-4 text-left transition-transform active:scale-[0.95] group ${
                  isAthleticPass ? 'bg-slate-900 border-blue-500' : 'bg-slate-800 border-blue-400'
                }`}
              >
                 <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-80">
                    {isAthleticPass ? (
                      <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                      <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C7.5 2 4 4.5 4 6C4 7.5 6 9 6 10.5C6 12 5 14 5 16C5 19 8 21.5 12 21.5C16 21.5 19 19 19 16C19 14 18 12 18 10.5C18 9 20 7.5 20 6C20 4.5 16.5 2 12 2Z"/></svg>
                    )}
                 </div>
                 <div className="p-4 relative z-10 h-32 flex flex-col justify-between">
                    <div>
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ${isAthleticPass ? 'text-blue-400 border border-blue-400/30' : 'text-blue-300 border border-blue-300/30'}`}>
                          {item.category}
                      </span>
                      <h4 className={`font-bold text-lg mt-2 leading-tight ${isAthleticPass ? 'text-blue-50' : ''}`}>{item.itemName}</h4>
                    </div>
                    <div className="flex justify-between items-end">
                       <span className="text-xs text-slate-400">{item.date?.split('T')[0]}</span>
                       <span className={`text-[10px] font-bold px-2 py-1 rounded bg-white ${isAthleticPass ? 'text-blue-600' : 'text-[#0040ba]'}`}>USE</span>
                    </div>
                 </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-3 text-lg">Weekly Earning Rates</h3>
        <div className="flex justify-between text-center divide-x divide-slate-100">
          <div className="flex-1 px-2">
            <span className="block text-2xl font-bold text-blue-600">2 pts</span>
            <span className="text-xs text-slate-500 uppercase font-semibold">Mon</span>
          </div>
          <div className="flex-1 px-2">
            <span className="block text-2xl font-bold text-slate-600">1 pt</span>
            <span className="text-xs text-slate-500 uppercase font-semibold">Tue-Thu</span>
          </div>
          <div className="flex-1 px-2">
            <span className="block text-2xl font-bold text-green-600">5 pts</span>
            <span className="text-xs text-slate-500 uppercase font-semibold">Fri</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">Earn 10 points in a week for a full <span className="text-green-600 font-bold">$1.00</span></p>
        </div>
      </div>

      <div className="bg-orange-50 p-5 rounded-xl border border-orange-100 shadow-sm">
        <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Upcoming Events
        </h3>
        {upcomingEvents.length > 0 ? (
          <ul className="space-y-3">
            {upcomingEvents.map((evt, i) => (
              <li key={i} className={`flex justify-between items-center bg-white p-3 rounded-lg border 
                ${evt.eventType === 'no_school' ? 'border-red-200 bg-red-50' : 
                  evt.eventType === 'break' ? 'border-teal-200 bg-teal-50' : 'border-orange-100'}`}>
                <div>
                  <div className={`font-semibold ${
                    evt.eventType === 'no_school' ? 'text-red-700' : 
                    evt.eventType === 'break' ? 'text-teal-700' : 'text-slate-800'
                  }`}>{evt.title}</div>
                  <div className="text-xs text-slate-500">{evt.date}</div>
                </div>
                <span className={`font-bold px-2 py-1 rounded text-xs ${
                  evt.eventType === 'no_school' || evt.eventType === 'break' 
                  ? 'text-slate-500 bg-slate-100' 
                  : 'text-orange-600 bg-orange-100'
                }`}>
                   {evt.eventType === 'no_school' || evt.eventType === 'break' 
                     ? 'NO SCHOOL' 
                     : (evt.overridePoints ? `${(evt.overridePoints / 10).toFixed(2)} cash` : `+$${((5 + (evt.bonusPoints || 0)) / 10).toFixed(2)}`)
                   }
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-orange-600/70 italic">No events coming up soon.</p>
        )}
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 text-lg">Daily Earnings Trend</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0040ba" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#0040ba" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
              <YAxis hide />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earned']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="cash" stroke="#0040ba" strokeWidth={3} fillOpacity={1} fill="url(#colorCash)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {selectedPass && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm" onClick={() => setSelectedPass(null)}>
           <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
             <div className={`p-6 text-white relative overflow-hidden ${
                (selectedPass as any).isDebit ? 'bg-gradient-to-br from-[#0040ba] to-blue-900' :
                (selectedPass as any).isHallPass ? 'bg-orange-600' :
                selectedPass.category === 'Athletic Pass' ? 'bg-slate-900' : 
                'bg-[#0040ba]'
              }`}>
               <div className="relative z-10 flex justify-between items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm ${
                    (selectedPass as any).isDebit ? 'bg-white/20' :
                    (selectedPass as any).isHallPass ? 'bg-white/20' :
                    selectedPass.category === 'Athletic Pass' ? 'bg-blue-600 text-white' : 'bg-white/20'
                  }`}>
                     {(selectedPass as any).isDebit ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                     ) : (selectedPass as any).isHallPass ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                     ) : (
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21 7.28V5C21 3.9 20.11 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.11 3.9 21 5 21H19C20.11 21 21 20.11 21 19V16.72C21.59 16.37 22 15.74 22 15V9C22 8.26 21.59 7.63 21 7.28ZM20 15H13V9H20V15ZM5 19V5H19V7H13C11.9 7 11 7.9 11 9V15C11 16.1 11.9 17 13 17H19V19H5Z" />
                        </svg>
                     )}
                  </div>
                  <span className={`font-bold tracking-widest text-sm opacity-80 uppercase ${selectedPass.category === 'Athletic Pass' ? 'text-blue-300' : ''}`}>
                      {(selectedPass as any).isDebit ? 'STUDENT DEBIT CARD' : 
                       (selectedPass as any).isHallPass ? 'DIGITAL HALL PASS' : 'COUGAR CASH PASS'}
                  </span>
               </div>
               <div className="absolute -right-6 -bottom-6 opacity-10">
                  <svg width="120" height="120" viewBox="0 0 100 100" fill="white">
                     <path d="M20,10 C25,25 20,40 10,55 C15,40 25,30 35,15 Z M40,8 C45,28 42,45 35,60 C40,45 50,30 60,12 Z M65,10 C68,30 63,50 55,65 C62,50 75,35 85,15 Z" />
                  </svg>
               </div>
             </div>
             
             <div className="p-8 pb-4">
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase">Item</p>
                  <h2 className="text-2xl font-bold text-slate-900 leading-tight">{selectedPass.itemName}</h2>
                </div>
                
                <div className="flex justify-between mb-8 text-sm">
                   <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Student</p>
                     <p className="font-semibold text-slate-800">{student.name}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                     <p className="font-semibold text-slate-800">VALID</p>
                   </div>
                </div>

                {(selectedPass as any).isHallPass ? (
                    <div className="space-y-4">
                        {activeHallPass ? (
                            <div className="bg-orange-50 p-6 rounded-lg flex flex-col items-center justify-center border border-orange-200 text-center">
                                <img 
                                    src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${activeHallPass.id}&scale=3&height=12&includetext`} 
                                    alt="Pass Barcode" 
                                    className="w-full max-w-[240px] h-auto object-contain mb-2 mix-blend-multiply"
                                />
                                <h4 className="font-bold text-orange-800 mb-1">Pass in Use</h4>
                                <p className="text-sm text-orange-700">Started at {new Date(activeHallPass.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setShowPassRequest(true)}
                                disabled={student.hallPassesUsedThisMonth >= student.hallPassLimit}
                                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${
                                    student.hallPassesUsedThisMonth >= student.hallPassLimit 
                                    ? 'bg-slate-300 cursor-not-allowed' 
                                    : 'bg-orange-600 hover:bg-orange-700 active:scale-95'
                                }`}
                            >
                                {student.hallPassesUsedThisMonth >= student.hallPassLimit ? 'WEEKLY LIMIT REACHED' : 'REQUEST NEW PASS'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-slate-100 p-4 rounded-lg flex flex-col items-center justify-center border border-slate-200">
                       <img 
                            src={`https://bwipjs-api.metafloor.com/?bcid=${selectedPass.externalBarcode ? 'upca' : 'code128'}&text=${selectedPass.externalBarcode || selectedPass.id}&scale=3&height=12&includetext`} 
                            alt="Redemption Barcode" 
                            className="w-full max-w-[240px] h-auto object-contain mb-2 mix-blend-multiply opacity-90"
                       />
                       <p className="mt-4 text-[10px] text-slate-400 uppercase font-bold tracking-widest">Authorized Staff Use Only</p>
                    </div>
                )}
             </div>

             <button onClick={() => setSelectedPass(null)} className="w-full py-4 bg-slate-50 text-[#0040ba] font-bold border-t border-slate-100 hover:bg-slate-100 transition-colors">
               Close
             </button>
           </div>
        </div>
      )}

      {showPassRequest && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[120] p-4" onClick={() => setShowPassRequest(false)}>
           <div className="bg-white rounded-3xl w-full max-w-sm p-6 overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Request Hall Pass</h3>
                <p className="text-sm text-slate-500 mb-6">Select your destination. This counts as 1 use.</p>
                <div className="grid grid-cols-2 gap-3 mb-8">
                    {['Restroom', 'Library', 'Nurse', 'Office'].map(type => (
                        <button 
                            key={type} 
                            onClick={() => handleRequestPass(type as any)}
                            className="py-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all active:scale-95"
                        >
                            {type}
                        </button>
                    ))}
                </div>
                <button onClick={() => setShowPassRequest(false)} className="w-full py-4 text-slate-400 font-bold">
                    Cancel
                </button>
           </div>
        </div>
      )}
    </div>
  );
};
