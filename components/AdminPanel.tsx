
import React, { useState, useRef, useEffect } from 'react';
import { Student, CalendarEvent, StoreItem, EventType, Admin, Notification, AdminPermission, AttendanceRecord, Group, HallPassRecord, Poll, Announcement, PollOption, TimeLockout, BuddyConflict } from '../types';
import { getDayPoints } from '../utils/points';
import { suggestCalendarEvents } from '../services/geminiService';
import { CalendarView } from './CalendarView';

interface AdminPanelProps {
  currentAdmin: Admin;
  students: Student[];
  admins: Admin[];
  calendarEvents: CalendarEvent[];
  storeItems: StoreItem[];
  groups: Group[];
  hallPasses: HallPassRecord[];
  polls: Poll[];
  announcements: Announcement[];
  hallPassLockouts: TimeLockout[];
  hallPassConflicts: BuddyConflict[];
  onUpdateStudents: (students: Student[]) => void;
  onUpdateAdmins: (admins: Admin[]) => void;
  onUpdateEvents: (events: CalendarEvent[]) => void;
  onUpdateStoreItems: (items: StoreItem[]) => void;
  onUpdateGroups: (groups: Group[]) => void;
  onUpdateHallPasses: (passes: HallPassRecord[]) => void;
  onUpdatePolls: (polls: Poll[]) => void;
  onUpdateAnnouncements: (announcements: Announcement[]) => void;
  onUpdateLockouts: (lockouts: TimeLockout[]) => void;
  onUpdateConflicts: (conflicts: BuddyConflict[]) => void;
  onRedeemItem: (code: string) => { success: boolean; message: string };
}

type AdminTool = 'none' | 'attendance' | 'calendar' | 'store' | 'scanner' | 'student-directory' | 'orders' | 'manage-admins' | 'point-checkout' | 'hall-pass-monitor' | 'award-points' | 'polls-announcements' | 'event-checkin';
type PassType = 'standard' | 'fixed_dates' | 'duration';
type SortOption = 'lastName' | 'firstName' | 'pointsHigh' | 'pointsLow';

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  currentAdmin,
  students, 
  admins,
  calendarEvents, 
  storeItems,
  groups,
  hallPasses,
  polls,
  announcements,
  hallPassLockouts,
  hallPassConflicts,
  onUpdateStudents,
  onUpdateAdmins,
  onUpdateEvents,
  onUpdateStoreItems,
  onUpdateGroups,
  onUpdateHallPasses,
  onUpdatePolls,
  onUpdateAnnouncements,
  onUpdateLockouts,
  onUpdateConflicts,
  onRedeemItem,
}) => {
  const [activeTool, setActiveTool] = useState<AdminTool>('none');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Student Directory State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('lastName');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [pointAdjustment, setPointAdjustment] = useState<{ amount: string; reason: string; mode: 'add' | 'subtract' }>({ amount: '0.00', reason: '', mode: 'add' });
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({ name: '', email: '' });
  
  const [deletedStudents, setDeletedStudents] = useState<Student[]>([]);
  
  // Group Management State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [newGroupForm, setNewGroupForm] = useState<{
    name: string;
    type: 'Class' | 'Team' | 'Club' | 'Other';
    studentIds: string[];
  }>({ name: '', type: 'Class', studentIds: [] });

  // Polls & Announcements State
  const [pollForm, setPollForm] = useState({ question: '', expiresAt: '', options: ['', ''] });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', expiresAt: '' });

  // Hall Pass Restriction Forms
  const [lockoutForm, setLockoutForm] = useState({ label: '', startTime: '', endTime: '' });
  const [conflictForm, setConflictForm] = useState({ studentA: '', studentB: '', reason: '' });

  // Event Check-in State
  const [eventAmount, setEventAmount] = useState('1.00');
  const [eventName, setEventName] = useState('');
  const [eventCheckinList, setEventCheckinList] = useState<{name: string, time: string}[]>([]);
  const [eventResult, setEventResult] = useState<{success: boolean; message: string} | null>(null);

  // Point Checkout State
  const [checkoutPrice, setCheckoutPrice] = useState('0.00');
  const [checkoutReason, setCheckoutReason] = useState('');
  const [checkoutResult, setCheckoutResult] = useState<{success: boolean; message: string} | null>(null);

  // Award Points State
  const [awardAmount, setAwardAmount] = useState('0.00');
  const [awardReason, setAwardReason] = useState('');
  const [awardResult, setAwardResult] = useState<{success: boolean; message: string} | null>(null);

  // Bulk Student Management State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkPointsModalOpen, setIsBulkPointsModalOpen] = useState(false);
  const [bulkPointsForm, setBulkPointsForm] = useState({ amount: '', reason: '' });
  const studentCsvRef = useRef<HTMLInputElement>(null);

  // Admin Management State
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [newAdminForm, setNewAdminForm] = useState({ name: '', email: '', loginCode: '', monthlyLimit: '100.00' });
  const [newAdminPermissions, setNewAdminPermissions] = useState<AdminPermission[]>(['attendance', 'scanner', 'store', 'orders', 'student-directory', 'point-checkout', 'hall-pass-monitor', 'award-points', 'polls-announcements', 'event-checkin']);

  const PERMISSIONS_LIST: { id: AdminPermission; label: string; icon: React.ReactNode; color: string; description: string }[] = [
    { 
        id: 'event-checkin', 
        label: 'Event Gate', 
        color: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600',
        description: 'Scan barcodes at events to give bucks to all.',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
    },
    { 
        id: 'award-points', 
        label: 'Award Rewards', 
        color: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600',
        description: 'Scan student card to give bucks (Monthly budget).',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    { 
        id: 'point-checkout', 
        label: 'Quick Checkout', 
        color: 'bg-green-50 text-green-600 group-hover:bg-green-600',
        description: 'Scan student card for instant purchase.',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 11-4 0 2 2 0 014 0z" /></svg>
    },
    { 
        id: 'hall-pass-monitor', 
        label: 'Hall Monitor', 
        color: 'bg-orange-50 text-orange-600 group-hover:bg-orange-600',
        description: 'Track students out on passes.',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    },
    { 
        id: 'polls-announcements', 
        label: 'Polls & News', 
        color: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600',
        description: 'Post polls and high-priority news.',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    },
    { 
        id: 'attendance', 
        label: 'Attendance Upload', 
        color: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600',
        description: 'Upload daily PDF logs.',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    },
    { 
        id: 'calendar', 
        label: 'Calendar Manager',
        color: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600',
        description: 'Set special events & reward multipliers.',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> 
    },
    { 
        id: 'store', 
        label: 'Store Inventory',
        color: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600',
        description: 'Manage items, stock, and costs.',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
    },
    { 
        id: 'orders', 
        label: 'Orders Fulfillment',
        color: 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-600',
        description: 'Track and fulfill physical item orders.',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    },
    { 
        id: 'scanner', 
        label: 'Redemption Scanner',
        color: 'bg-orange-50 text-orange-600 group-hover:bg-orange-600',
        description: 'Scan student passes to redeem.',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 14.5v.01M12 13c0 5.523 4.477 10 10 10S22 18.523 22 13 17.523 3 12 3 2 7.477 2 13s4.477 10 10 10z" /></svg>
    },
    { 
        id: 'student-directory', 
        label: 'Student Directory',
        color: 'bg-pink-50 text-pink-600 group-hover:bg-pink-600',
        description: 'View accounts, bucks, and history.',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    },
    { 
        id: 'manage-admins', 
        label: 'Manage Admins',
        color: 'bg-slate-100 text-slate-600 group-hover:bg-slate-700',
        description: 'Add or remove administrative access.',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
    },
  ];

  // Scanner State
  const [scanCode, setScanCode] = useState('');
  const [scanResult, setScanResult] = useState<{success: boolean; message: string} | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const scannerRef = useRef<any>(null);

  // Calendar State
  const [editingDate, setEditingDate] = useState<string | null>(null);
  
  // Bulk Edit State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkDates, setBulkDates] = useState<string[]>([]);
  
  const [editEventForm, setEditEventForm] = useState<{
    title: string;
    overridePoints: string;
    eventType: EventType;
  }>({ title: '', overridePoints: '', eventType: 'default' });
  
  // Store State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [passType, setPassType] = useState<PassType>('standard');
  const [newItem, setNewItem] = useState<{
    name: string;
    description: string;
    cashPrice: string;
    category: string;
    image: string;
    quantity: number;
    expirationDate: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    requiresFulfillment: boolean;
    externalBarcode: string; 
    hallPassIncrease: number;
  }>({ 
    name: '', description: '', cashPrice: '0.00', category: 'Voucher', image: '', quantity: 50,
    expirationDate: '', startDate: '', endDate: '', durationDays: 0, requiresFulfillment: false,
    externalBarcode: '', hallPassIncrease: 0
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Event Gate logic ---
  const processEventScan = (scannedId: string) => {
    const student = students.find(s => s.id === scannedId);
    if (!student) {
        setEventResult({ success: false, message: "Student card not recognized." });
        return;
    }

    // Check if already checked in this session (simple local check for speed)
    if (eventCheckinList.some(item => item.name === student.name)) {
        setEventResult({ success: false, message: `${student.name} is already checked in.` });
        return;
    }

    const rewardPoints = Math.round(Number(eventAmount) * 10);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newRecord: AttendanceRecord = {
        date: today,
        present: true,
        pointsAwarded: rewardPoints,
        reason: eventName || "Event Attendance",
        awardedBy: currentAdmin.id
    };

    const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        title: 'Event Reward!',
        message: `You earned $${Number(eventAmount).toFixed(2)} for attending: ${eventName || "School Event"}.`,
        date: now.toISOString(),
        read: false,
        type: 'general'
    };

    const updatedStudents = students.map(s => {
        if (s.id === student.id) {
            return {
                ...s,
                totalPoints: s.totalPoints + rewardPoints,
                attendanceHistory: [...s.attendanceHistory, newRecord],
                notifications: [newNotification, ...s.notifications]
            };
        }
        return s;
    });

    onUpdateStudents(updatedStudents);
    setEventCheckinList([{ name: student.name, time: timeStr }, ...eventCheckinList]);
    setEventResult({ success: true, message: `Checked in ${student.name} (+$${Number(eventAmount).toFixed(2)})` });

    // Important: Scanner stays on for next student in line
    setTimeout(() => setEventResult(null), 3000);
  };

  // --- Point Adjustment logic ---
  const handleSavePointAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !pointAdjustment.amount || !pointAdjustment.reason) return;

    const bucksAmount = parseFloat(pointAdjustment.amount);
    if (isNaN(bucksAmount) || bucksAmount <= 0) return;

    const pointsToApply = Math.round(bucksAmount * 10) * (pointAdjustment.mode === 'add' ? 1 : -1);
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const newRecord: AttendanceRecord = {
      date: today,
      present: true,
      pointsAwarded: pointsToApply,
      reason: pointAdjustment.reason,
      awardedBy: currentAdmin.id
    };

    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      title: pointAdjustment.mode === 'add' ? 'Cougar Bucks Received!' : 'Account Adjusted',
      message: `${pointAdjustment.mode === 'add' ? 'Received' : 'Deducted'} $${bucksAmount.toFixed(2)}: ${pointAdjustment.reason}`,
      date: now.toISOString(),
      read: false,
      type: pointAdjustment.mode === 'add' ? 'general' : 'purchase'
    };

    const updatedStudents = students.map(s => {
      if (s.id === selectedStudent.id) {
        return {
          ...s,
          totalPoints: Math.max(0, s.totalPoints + pointsToApply),
          attendanceHistory: [...s.attendanceHistory, newRecord],
          notifications: [newNotification, ...s.notifications]
        };
      }
      return s;
    });

    onUpdateStudents(updatedStudents);
    setSelectedStudent(updatedStudents.find(s => s.id === selectedStudent.id) || null);
    setPointAdjustment({ amount: '0.00', reason: '', mode: 'add' });
    alert(`Successfully ${pointAdjustment.mode === 'add' ? 'added' : 'deducted'} $${bucksAmount.toFixed(2)} to ${selectedStudent.name}'s account.`);
  };

  // --- Polls & Announcements logic ---
  const handleSavePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollForm.question || pollForm.options.some(o => !o)) return;

    const newPoll: Poll = {
      id: `poll-${Date.now()}`,
      question: pollForm.question,
      options: pollForm.options.map((text, i) => ({ id: `opt-${i}`, text, votes: [] })),
      createdAt: new Date().toISOString(),
      expiresAt: pollForm.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      active: true,
      createdBy: currentAdmin.id
    };

    onUpdatePolls([...polls, newPoll]);
    setPollForm({ question: '', expiresAt: '', options: ['', ''] });
    alert("Poll posted!");
  };

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.content) return;

    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title: announcementForm.title,
      content: announcementForm.content,
      createdAt: new Date().toISOString(),
      expiresAt: announcementForm.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      active: true,
      createdBy: currentAdmin.id
    };

    onUpdateAnnouncements([...announcements, newAnn]);
    setAnnouncementForm({ title: '', content: '', expiresAt: '' });
    alert("Announcement posted!");
  };

  const handleDeletePoll = (id: string) => {
    if (window.confirm("Delete this poll?")) {
      onUpdatePolls(polls.filter(p => p.id !== id));
    }
  };

  const handleDeleteAnnouncement = (id: string) => {
    if (window.confirm("Delete this announcement?")) {
      onUpdateAnnouncements(announcements.filter(a => a.id !== id));
    }
  };

  // --- Hall Pass Restriction Handlers ---
  const handleSaveLockout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockoutForm.label || !lockoutForm.startTime || !lockoutForm.endTime) return;
    const newLockout: TimeLockout = {
      id: `lock-${Date.now()}`,
      ...lockoutForm
    };
    onUpdateLockouts([...hallPassLockouts, newLockout]);
    setLockoutForm({ label: '', startTime: '', endTime: '' });
  };

  const handleSaveConflict = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conflictForm.studentA || !conflictForm.studentB || conflictForm.studentA === conflictForm.studentB) return;
    const newConflict: BuddyConflict = {
      id: `conf-${Date.now()}`,
      studentIds: [conflictForm.studentA, conflictForm.studentB],
      reason: conflictForm.reason || 'Restricted Buddy Group'
    };
    onUpdateConflicts([...hallPassConflicts, newConflict]);
    setConflictForm({ studentA: '', studentB: '', reason: '' });
  };

  const handleDeleteLockout = (id: string) => {
    onUpdateLockouts(hallPassLockouts.filter(l => l.id !== id));
  };

  const handleDeleteConflict = (id: string) => {
    onUpdateConflicts(hallPassConflicts.filter(c => c.id !== id));
  };

  // --- Point Awarding logic ---
  const processAwardScan = (scannedId: string) => {
    const student = students.find(s => s.id === scannedId);
    if (!student) {
        setAwardResult({ success: false, message: "Student not found." });
        return;
    }

    const awardPointsValue = Math.round(Number(awardAmount) * 10);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let adminBudgetUsed = currentAdmin.pointsAwardedThisMonth || 0;
    const adminBudgetMax = currentAdmin.monthlyAwardLimit || 1000;

    if (currentAdmin.lastResetMonth !== currentMonth) {
        adminBudgetUsed = 0;
    }

    if (adminBudgetUsed + awardPointsValue > adminBudgetMax) {
        setAwardResult({ 
            success: false, 
            message: `Monthly budget exceeded. You have $${((adminBudgetMax - adminBudgetUsed)/10).toFixed(2)} remaining.` 
        });
        return;
    }

    const today = now.toISOString().split('T')[0];
    const newRecord: AttendanceRecord = {
        date: today,
        present: true,
        pointsAwarded: awardPointsValue,
        reason: awardReason || "Teacher Award",
        awardedBy: currentAdmin.id
    };

    const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        title: 'Cougar Bucks Received!',
        message: `You received $${Number(awardAmount).toFixed(2)} from ${currentAdmin.name}. Reason: ${awardReason || "General Award"}.`,
        date: now.toISOString(),
        read: false,
        type: 'general'
    };

    const updatedStudents = students.map(s => {
        if (s.id === student.id) {
            return {
                ...s,
                totalPoints: s.totalPoints + awardPointsValue,
                attendanceHistory: [...s.attendanceHistory, newRecord],
                notifications: [newNotification, ...s.notifications]
            };
        }
        return s;
    });

    const updatedAdmins = admins.map(a => {
        if (a.id === currentAdmin.id) {
            return {
                ...a,
                pointsAwardedThisMonth: adminBudgetUsed + awardPointsValue,
                lastResetMonth: currentMonth
            };
        }
        return a;
    });

    onUpdateStudents(updatedStudents);
    onUpdateAdmins(updatedAdmins);
    
    setAwardResult({ success: true, message: `Awarded $${Number(awardAmount).toFixed(2)} to ${student.name}.` });
    setAwardAmount('0.00');
    setAwardReason('');
    setShowCamera(false);
  };

  // --- Point Checkout / Merchant Logic ---
  const processCheckoutScan = (scannedId: string) => {
      const student = students.find(s => s.id === scannedId);
      if (!student) {
          setCheckoutResult({ success: false, message: "Student not found." });
          return;
      }

      const activePass = hallPasses.find(p => p.id === scannedId && p.status === 'active');
      if (activePass) {
          handleReturnStudent(activePass.id);
          setCheckoutResult({ success: true, message: `Returned ${activePass.studentName} from pass.` });
          return;
      }

      const pointCost = Math.round(Number(checkoutPrice) * 10);
      if (student.totalPoints < pointCost) {
          setCheckoutResult({ success: false, message: `Insufficient Funds. Student has $${(student.totalPoints / 10).toFixed(2)}` });
          return;
      }

      const reason = checkoutReason || "School Store Purchase";
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const newRecord: AttendanceRecord = {
          date: today,
          present: true,
          pointsAwarded: -pointCost,
          reason: reason
      };

      const newNotification: Notification = {
          id: `notif-${Date.now()}`,
          title: 'Cougar Bucks Spent',
          message: `Deducted $${Number(checkoutPrice).toFixed(2)} from your balance for: ${reason}.`,
          date: now.toISOString(),
          read: false,
          type: 'purchase'
      };

      const updatedStudents = students.map(s => {
          if (s.id === student.id) {
              return {
                  ...s,
                  totalPoints: s.totalPoints - pointCost,
                  attendanceHistory: [...s.attendanceHistory, newRecord],
                  notifications: [newNotification, ...s.notifications]
              };
          }
          return s;
      });

      onUpdateStudents(updatedStudents);
      setCheckoutResult({ success: true, message: `Successfully deducted $${Number(checkoutPrice).toFixed(2)} from ${student.name}.` });
      setCheckoutPrice('0.00');
      setCheckoutReason('');
      setShowCamera(false);
  };

  // --- Scanner Effect ---
  const processRedemption = (code: string) => {
    if (activeTool === 'point-checkout') {
        processCheckoutScan(code);
    } else if (activeTool === 'award-points') {
        processAwardScan(code);
    } else if (activeTool === 'event-checkin') {
        processEventScan(code);
    } else {
        const result = onRedeemItem(code);
        if (!result.success) {
            const pass = hallPasses.find(p => p.id === code && p.status === 'active');
            if (pass) {
                handleReturnStudent(pass.id);
                setScanResult({ success: true, message: `Returned ${pass.studentName} from ${pass.type}.` });
                return;
            }
        }
        setScanResult(result);
    }
  };

  const handleStopCamera = async () => {
      if (scannerRef.current) {
          try {
              if (scannerRef.current.isScanning) {
                  await scannerRef.current.stop();
              }
              scannerRef.current.clear();
          } catch (err) {
              console.error("Error stopping scanner", err);
          }
          scannerRef.current = null;
      }
      setShowCamera(false);
  };

  const downloadBarcode = async (id: string, name: string) => {
    const url = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${id}&scale=3&height=12&includetext`;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${name.replace(/\s+/g, '_')}_Barcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Failed to download barcode", e);
      alert("Failed to download barcode. Please try again.");
    }
  };

  useEffect(() => {
    const isScanningTool = ['scanner', 'point-checkout', 'award-points', 'event-checkin'].includes(activeTool);
    if (isScanningTool && showCamera) {
        const startScanner = async () => {
            const Html5Qrcode = (window as any).Html5Qrcode;
            const Html5QrcodeSupportedFormats = (window as any).Html5QrcodeSupportedFormats;

            if (!Html5Qrcode) {
                console.error("Html5Qrcode library not loaded");
                return;
            }

            if (scannerRef.current) {
                try {
                    await scannerRef.current.stop();
                    scannerRef.current.clear();
                } catch(e) {}
            }

            const config = { 
                verbose: false,
                formatsToSupport: Html5QrcodeSupportedFormats ? [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E
                ] : undefined
            };

            const html5QrCode = new Html5Qrcode("reader", config);
            scannerRef.current = html5QrCode;

            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    { 
                        fps: 15, // Higher FPS for high-volume gate scanning
                        qrbox: { width: 280, height: 150 } 
                    },
                    (decodedText: string) => {
                        processRedemption(decodedText);
                        // For event check-in, we DON'T stop the camera automatically to allow continuous line scanning
                        if (activeTool !== 'event-checkin') {
                          handleStopCamera();
                        }
                    },
                    (errorMessage: any) => {}
                );
            } catch (err) {
                console.error("Error starting camera", err);
                setShowCamera(false);
            }
        };

        const timer = setTimeout(startScanner, 100);
        return () => {
            clearTimeout(timer);
            if(scannerRef.current) {
                try {
                    scannerRef.current.stop().then(() => scannerRef.current.clear());
                } catch(e) {}
            }
        };
    } else {
        if (scannerRef.current) {
            try {
                scannerRef.current.stop().then(() => scannerRef.current.clear());
                scannerRef.current = null;
            } catch(e) {}
        }
    }
  }, [activeTool, showCamera]);


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (arrayBuffer) {
           processPDF(arrayBuffer);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setUploadStatus("Please upload a valid PDF file.");
    }
    
    if (event.target) event.target.value = '';
  };

  const processPDF = async (pdfData: ArrayBuffer) => {
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += ' ' + pageText;
      }

      const dateRegex = /Date Range:\s*(\d{2}\/\d{2}\/\d{4})/;
      const dateMatch = fullText.match(dateRegex);
      
      if (!dateMatch) {
          setUploadStatus("Could not find a valid date in the report header.");
          return;
      }

      const [m, d, y] = dateMatch[1].split('/');
      const reportDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      
      const studentRegex = /([A-Z][a-z,.\-\s]+?)\s+(\d{10})\s+(\d{1,2})\s+(\d+\.\d+)\s+\d+\s+\d+/g;
      
      let matches;
      const records: { name: string, id: string, absentDays: number }[] = [];
      
      while ((matches = studentRegex.exec(fullText)) !== null) {
          records.push({
              name: matches[1].trim(),
              id: matches[2],
              absentDays: parseFloat(matches[4])
          });
      }

      if (records.length === 0) {
          setUploadStatus("No student records found. Check report format.");
          return;
      }

      const { points } = getDayPoints(reportDate, calendarEvents);
      let presentCount = 0;
      let absentCount = 0;
      let updatedCount = 0;

      const updatedStudents = students.map(student => {
          const systemName = student.name.toLowerCase().replace(/[^a-z\s]/g, '').trim();
          
          const record = records.find(r => {
              const nameParts = r.name.split(',').map(p => p.trim());
              let reportFirstLast = '';
              if (nameParts.length === 2) {
                  reportFirstLast = `${nameParts[1]} ${nameParts[0]}`.toLowerCase().replace(/[^a-z\s]/g, '').trim();
              } else {
                  reportFirstLast = r.name.toLowerCase().replace(/[^a-z\s]/g, '').trim();
              }

              return r.id === student.id || 
                     reportFirstLast === systemName || 
                     reportFirstLast.includes(systemName) || 
                     systemName.includes(reportFirstLast);
          });

          if (record) {
              const hasRecord = student.attendanceHistory.some(r => r.date === reportDate);
              if (hasRecord) return student;

              const isPresent = record.absentDays === 0;
              const pointsToAward = isPresent ? points : 0;
              
              if (isPresent) presentCount++;
              else absentCount++;

              updatedCount++;

              const newRecord: AttendanceRecord = {
                  date: reportDate,
                  present: isPresent,
                  pointsAwarded: pointsToAward,
                  reason: isPresent ? 'Daily Attendance' : 'Absent'
              };

              const newNotifications = [...student.notifications];
              if (isPresent && pointsToAward > 0) {
                  newNotifications.unshift({
                    id: `notif-${Date.now()}-${Math.random()}`,
                    title: 'Cougar Bucks Earned!',
                    message: `You earned $${(pointsToAward / 10).toFixed(2)} for attendance on ${reportDate}.`,
                    date: new Date().toISOString(),
                    read: false,
                    type: 'general'
                  });
              }

              return {
                  ...student,
                  totalPoints: student.totalPoints + pointsToAward,
                  attendanceHistory: [...student.attendanceHistory, newRecord],
                  notifications: newNotifications
              };
          }
          return student;
      });

      if (updatedCount > 0) {
          onUpdateStudents(updatedStudents);
          setUploadStatus(`Processed ${updatedCount} students for ${reportDate}. (${presentCount} Present, ${absentCount} Absent)`);
      } else {
          setUploadStatus(`Report processed but no new data added for ${reportDate}. (Records may already exist)`);
      }

    } catch (err) {
      console.error("PDF Parsing Error:", err);
      setUploadStatus("Error reading PDF. Please ensure it is the official Attendance Day Count Report.");
    }
  };

  const handleStudentBatchUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processStudentBatchCSV(text);
    };
    reader.readAsText(file);
    if(event.target) event.target.value = '';
  };

  const processStudentBatchCSV = (text: string) => {
    const lines = text.split('\n');
    const newStudents: Student[] = [];
    let addedCount = 0;
    let duplicateCount = 0;

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const parts = trimmed.split(',');
      if (parts.length < 2) return; 

      const name = parts[0].trim();
      const email = parts[1].trim();
      
      if (idx === 0 && name.toLowerCase() === 'name' && email.toLowerCase() === 'email') return;

      if (name && email) {
         if (students.some(s => s.email.toLowerCase() === email.toLowerCase()) || newStudents.some(s => s.email.toLowerCase() === email.toLowerCase())) {
            duplicateCount++;
            return;
         }

         newStudents.push({
            id: `stu-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            role: 'STUDENT',
            loginCode: Math.floor(100000 + Math.random() * 900000).toString(),
            name,
            email,
            totalPoints: 0,
            attendanceHistory: [],
            purchaseHistory: [
                {
                    id: `ATH-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                    date: new Date().toISOString(),
                    itemName: 'LCC Athletic Pass',
                    cost: 0,
                    category: 'Athletic Pass',
                    redeemed: false,
                    image: '', 
                    requiresFulfillment: false
                }
            ],
            cart: [],
            favorites: [],
            notifications: [],
            hallPassLimit: 5,
            hallPassesUsedThisMonth: 0
         });
         addedCount++;
      }
    });

    if (newStudents.length > 0) {
        onUpdateStudents([...students, ...newStudents]);
        alert(`Successfully added ${addedCount} new students.${duplicateCount > 0 ? ` Skipped ${duplicateCount} duplicates.` : ''}`);
    } else {
        alert('No new students added. Ensure CSV format is "Name, Email".');
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newStudentForm.name || !newStudentForm.email) return;

      if (students.some(s => s.email.toLowerCase() === newStudentForm.email.toLowerCase())) {
          alert("A student with this email already exists.");
          return;
      }

      const newStudent: Student = {
          id: `stu-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          role: 'STUDENT',
          loginCode: Math.floor(100000 + Math.random() * 900000).toString(),
          name: newStudentForm.name,
          email: newStudentForm.email,
          totalPoints: 0,
          attendanceHistory: [],
          purchaseHistory: [
              {
                  id: `ATH-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                  date: new Date().toISOString(),
                  itemName: 'LCC Athletic Pass',
                  cost: 0,
                  category: 'Athletic Pass',
                  redeemed: false,
                  image: '', 
                  requiresFulfillment: false
              }
          ],
          cart: [],
          favorites: [],
          notifications: [],
          hallPassLimit: 5,
          hallPassesUsedThisMonth: 0
      };

      onUpdateStudents([...students, newStudent]);
      setNewStudentForm({ name: '', email: '' });
      setIsAddingStudent(false);
      alert(`Student ${newStudent.name} added successfully.`);
  };

  const handleBulkDeleteStudents = () => {
    if (selectedStudentIds.length === 0) return;

    if (window.confirm(`Are you sure you want to delete ${selectedStudentIds.length} student accounts?\n\nThey will be moved to 'Recently Deleted' where they can be recovered.`)) {
        const studentsToDelete = students.filter(s => selectedStudentIds.includes(s.id));
        setDeletedStudents(prev => [...studentsToDelete, ...prev]);

        onUpdateStudents(students.filter(s => !selectedStudentIds.includes(s.id)));
        setSelectedStudentIds([]);
    }
  };

  const toggleStudentSelection = (id: string) => {
     setSelectedStudentIds(prev => 
       prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
     );
  };

  const handleBulkGivePoints = (e: React.FormEvent) => {
    e.preventDefault();
    const bucksAmount = parseFloat(bulkPointsForm.amount);
    if (isNaN(bucksAmount)) return;

    const pointsToApply = Math.round(bucksAmount * 10);
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const reason = bulkPointsForm.reason || 'Bulk Adjustment';

    const updatedStudents = students.map(s => {
        if (selectedStudentIds.includes(s.id)) {
            const newRecord: AttendanceRecord = {
                date: today,
                present: true,
                pointsAwarded: pointsToApply,
                reason: reason,
                awardedBy: currentAdmin.id
            };

            const newNotification: Notification = {
                id: `notif-${Date.now()}-${Math.random()}`,
                title: pointsToApply > 0 ? 'Cougar Bucks Earned!' : 'Adjustment',
                message: `You ${pointsToApply > 0 ? 'received' : 'lost'} $${Math.abs(bucksAmount).toFixed(2)}. Reason: ${reason}.`,
                date: new Date().toISOString(),
                read: false,
                type: 'general'
             };

            return {
                ...s,
                totalPoints: Math.max(0, s.totalPoints + pointsToApply),
                attendanceHistory: [...s.attendanceHistory, newRecord],
                notifications: [newNotification, ...s.notifications]
            };
        }
        return s;
    });

    onUpdateStudents(updatedStudents);
    setIsBulkPointsModalOpen(false);
    setBulkPointsForm({ amount: '', reason: '' });
    setSelectedStudentIds([]);
    alert(`Successfully adjusted $${Math.abs(bucksAmount).toFixed(2)} for ${selectedStudentIds.length} students.`);
  };


  const handlePrintCodes = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    const htmlContent = `
        <html>
            <head>
                <title>Student Login Codes</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    h1 { text-align: center; margin-bottom: 20px; color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                </style>
            </head>
            <body>
                <h1>Student Access Codes</h1>
                <table>
                    <thead>
                        <tr><th>Student Name</th><th>Email</th><th>Access Code</th></tr>
                    </thead>
                    <tbody>
                        ${students.map(s => `<tr><td>${s.name}</td><td>${s.email}</td><td>${s.loginCode}</td></tr>`).join('')}
                    </tbody>
                </table>
                <script>window.onload = function() { window.print(); }</script>
            </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDateClick = (date: string) => {
    if (isBulkMode) {
      setBulkDates(prev => {
        if (prev.includes(date)) return prev.filter(d => d !== date);
        return [...prev, date];
      });
      return;
    }

    setEditingDate(date);
    const existing = calendarEvents.find(e => e.date === date);
    const { points } = getDayPoints(date, calendarEvents);
    
    setEditEventForm({
      title: existing?.title || '',
      overridePoints: existing?.overridePoints?.toString() || (existing?.eventType === 'no_school' || existing?.eventType === 'break' ? '0' : points.toString()),
      eventType: existing?.eventType || 'default'
    });
  };

  const handleSaveDay = () => {
    if (!editingDate) return;
    
    const newEvents = calendarEvents.filter(e => e.date !== editingDate);
    const points = parseInt(editEventForm.overridePoints);
    const eventType = editEventForm.eventType;

    if (eventType !== 'default' || editEventForm.title) {
        newEvents.push({
          date: editingDate,
          title: editEventForm.title || (eventType === 'no_school' ? 'No School' : eventType === 'break' ? 'Holiday Break' : 'Manual Adjustment'),
          overridePoints: (eventType === 'custom') ? (isNaN(points) ? 0 : points) : undefined,
          eventType: eventType
        });
    }

    onUpdateEvents(newEvents);
    setEditingDate(null);
  };

  const handleBulkSave = () => {
    if (bulkDates.length === 0) return;

    let newEvents = calendarEvents.filter(e => !bulkDates.includes(e.date));
    const points = parseInt(editEventForm.overridePoints);
    const eventType = editEventForm.eventType;

    if (eventType !== 'default' || editEventForm.title) {
      bulkDates.forEach(date => {
        newEvents.push({
          date: date,
          title: editEventForm.title || (eventType === 'no_school' ? 'No School' : eventType === 'break' ? 'Holiday Break' : 'Manual Adjustment'),
          overridePoints: (eventType === 'custom') ? (isNaN(points) ? 0 : points) : undefined,
          eventType: eventType
        });
      });
    }

    onUpdateEvents(newEvents);
    setBulkDates([]);
    setIsBulkMode(false);
    setEditEventForm({ title: '', overridePoints: '', eventType: 'default' });
  };

  const handleAiSuggestEvents = async () => {
    setIsGenerating(true);
    const month = new Date().toLocaleString('default', { month: 'long' });
    const suggestions = await suggestCalendarEvents(month);
    if (suggestions.length > 0) {
      const newEvents = [...calendarEvents];
      suggestions.forEach(s => {
        if (!newEvents.find(e => e.date === s.date)) {
          newEvents.push({ ...s, eventType: 'special' });
        }
      });
      onUpdateEvents(newEvents);
    }
    setIsGenerating(false);
  };

  const toggleBulkMode = () => {
    setIsBulkMode(!isBulkMode);
    setBulkDates([]);
    setEditEventForm({ title: '', overridePoints: '', eventType: 'default' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditItem = (item: StoreItem) => {
    setEditingItemId(item.id);
    
    let type: PassType = 'standard';
    if (item.startDate && item.endDate) type = 'fixed_dates';
    if (item.durationDays && item.durationDays > 0) type = 'duration';

    setPassType(type);

    setNewItem({
      name: item.name,
      description: item.description,
      cashPrice: (item.cost / 10).toFixed(2), 
      category: item.category,
      image: item.image,
      quantity: item.quantity,
      expirationDate: item.expirationDate || '',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      durationDays: item.durationDays || 0,
      requiresFulfillment: item.requiresFulfillment || false,
      externalBarcode: item.externalBarcode || '',
      hallPassIncrease: item.hallPassIncrease || 0
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveItem = () => {
    if (!newItem.name || Number(newItem.cashPrice) <= 0) return;

    const pointCost = Math.round(Number(newItem.cashPrice) * 10);

    const itemData = {
      name: newItem.name,
      description: newItem.description,
      cost: pointCost,
      category: newItem.category,
      quantity: Number(newItem.quantity),
      expirationDate: passType === 'standard' ? newItem.expirationDate : undefined,
      startDate: passType === 'fixed_dates' ? newItem.startDate : undefined,
      endDate: passType === 'fixed_dates' ? newItem.endDate : undefined,
      durationDays: passType === 'duration' ? Number(newItem.durationDays) : undefined,
      requiresFulfillment: newItem.requiresFulfillment,
      image: newItem.image,
      externalBarcode: newItem.externalBarcode || undefined,
      hallPassIncrease: Number(newItem.hallPassIncrease) || undefined
    };

    if (editingItemId) {
      onUpdateStoreItems(storeItems.map(item => item.id === editingItemId ? { ...item, ...itemData } : item));
      setEditingItemId(null);
    } else {
      onUpdateStoreItems([...storeItems, { ...itemData, id: `item-${Date.now()}` } as StoreItem]);
    }

    setNewItem({ 
      name: '', description: '', cashPrice: '0.00', category: 'Voucher', image: '', quantity: 50,
      expirationDate: '', startDate: '', endDate: '', durationDays: 0, requiresFulfillment: false,
      externalBarcode: '', hallPassIncrease: 0
    });
    setPassType('standard');
    setEditingItemId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    alert("Item saved successfully!");
  };

  const handleDeleteItem = (id: string) => {
      if(window.confirm("Delete this item?")) {
          onUpdateStoreItems(storeItems.filter(i => i.id !== id));
      }
  };

  const handleSaveAdmin = () => {
      if (!newAdminForm.name || !newAdminForm.email || !newAdminForm.loginCode) return;
      
      const adminData = {
          name: newAdminForm.name,
          email: newAdminForm.email,
          loginCode: newAdminForm.loginCode,
          permissions: newAdminPermissions,
          role: 'ADMIN' as const,
          monthlyAwardLimit: Math.round(Number(newAdminForm.monthlyLimit) * 10)
      };

      if (editingAdminId) {
          onUpdateAdmins(admins.map(a => a.id === editingAdminId ? { ...a, ...adminData } : a));
          setEditingAdminId(null);
      } else {
          onUpdateAdmins([...admins, { ...adminData, id: `adm-${Date.now()}` }]);
      }
      
      setNewAdminForm({ name: '', email: '', loginCode: '', monthlyLimit: '100.00' });
      setNewAdminPermissions(['attendance', 'scanner', 'store', 'orders', 'student-directory', 'point-checkout', 'hall-pass-monitor', 'award-points', 'polls-announcements', 'event-checkin']);
      setEditingAdminId(null);
      alert("Admin saved.");
  };

  const handleDeleteAdmin = (id: string) => {
      if (admins.length <= 1) {
          alert("Cannot delete the last admin.");
          return;
      }
      if (window.confirm("Delete this admin?")) {
          onUpdateAdmins(admins.filter(a => a.id !== id));
      }
  };

  const handleEditAdmin = (admin: Admin) => {
      setEditingAdminId(admin.id);
      setNewAdminForm({ 
        name: admin.name, 
        email: admin.email, 
        loginCode: admin.loginCode,
        monthlyLimit: ((admin.monthlyAwardLimit || 1000) / 10).toFixed(2)
      });
      setNewAdminPermissions(admin.permissions || []);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupForm.name || !newGroupForm.type) return;

    if (editingGroup) {
      const updatedGroup = { ...editingGroup, ...newGroupForm };
      onUpdateGroups(groups.map(g => g.id === editingGroup.id ? updatedGroup : g));
    } else {
      const newGroup: Group = {
        id: `grp-${Date.now()}`,
        ...newGroupForm
      };
      onUpdateGroups([...groups, newGroup]);
    }

    setIsGroupModalOpen(false);
    setEditingGroup(null);
    setNewGroupForm({ name: '', type: 'Class', studentIds: [] });
  };

  const toggleStudentInGroup = (studentId: string) => {
    setNewGroupForm(prev => {
      const isSelected = prev.studentIds.includes(studentId);
      return {
        ...prev,
        studentIds: isSelected 
          ? prev.studentIds.filter(id => id !== studentId) 
          : [...prev.studentIds, studentId]
      };
    });
  };

  const handleReturnStudent = (passId: string) => {
    const updatedPasses = hallPasses.map(p => {
        if (p.id === passId) {
            return { ...p, status: 'returned' as const, endTime: new Date().toISOString() };
        }
        return p;
    });
    onUpdateHallPasses(updatedPasses);
  };

  const activePasses = hallPasses.filter(p => p.status === 'active');

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isMonthFresh = currentAdmin.lastResetMonth === currentMonthStr;
  const adminBudgetUsed = isMonthFresh ? (currentAdmin.pointsAwardedThisMonth || 0) : 0;
  const adminBudgetMax = currentAdmin.monthlyAwardLimit || 1000;
  const remainingBudget = Math.max(0, adminBudgetMax - adminBudgetUsed);

  const myAwardHistory = students.flatMap(s => 
    s.attendanceHistory
      .filter(h => h.awardedBy === currentAdmin.id)
      .map(h => ({ ...h, studentName: s.name }))
  ).sort((a, b) => b.date.localeCompare(a.date));

  const pendingOrders = students.flatMap(student => 
    (student.purchaseHistory || [])
      .filter(p => p.requiresFulfillment && p.fulfillmentStatus !== 'fulfilled')
      .map(p => ({ ...p, student }))
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handlePrintOrders = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    const htmlContent = `
        <html>
            <head>
                <title>Pending Orders</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    h1 { text-align: center; color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                </style>
            </head>
            <body>
                <h1>Pending Store Orders</h1>
                <table>
                    <thead>
                        <tr><th>Student</th><th>Item</th><th>Date</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        ${pendingOrders.map(o => `<tr><td>${o.student.name}</td><td>${o.itemName}</td><td>${new Date(o.date).toLocaleString()}</td><td>${o.fulfillmentStatus}</td></tr>`).join('')}
                    </tbody>
                </table>
                <script>window.onload = function() { window.print(); }</script>
            </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleMarkReadyForPickup = (studentId: string, orderId: string, itemName: string) => {
    const updatedStudents = students.map(s => {
      if (s.id === studentId) {
        const updatedPurchases = s.purchaseHistory.map(p => {
          if (p.id === orderId) {
            return { ...p, fulfillmentStatus: 'ready' as const };
          }
          return p;
        });

        const newNotification: Notification = {
          id: `notif-${Date.now()}`,
          title: 'Order Ready!',
          message: `Your order for "${itemName}" is ready for pickup at the school store.`,
          date: new Date().toISOString(),
          read: false,
          type: 'order_ready'
        };

        return {
          ...s,
          purchaseHistory: updatedPurchases,
          notifications: [newNotification, ...s.notifications]
        };
      }
      return s;
    });

    onUpdateStudents(updatedStudents);
  };

  return (
      <div className="min-h-screen bg-slate-50 p-6">
          {selectedStudent && (
            <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}>
              <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                <div className="bg-[#0040ba] p-8 text-white relative">
                  <button onClick={() => setSelectedStudent(null)} className="absolute top-6 right-6 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl font-black">
                      {selectedStudent.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black leading-tight">{selectedStudent.name}</h2>
                      <p className="text-blue-100 font-medium">{selectedStudent.email}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-8 border-r border-slate-100 bg-slate-50/50">
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Balance</p>
                        <p className="text-2xl font-black text-green-600">${(selectedStudent.totalPoints / 10).toFixed(2)}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pass Limit</p>
                        <p className="text-2xl font-black text-[#0040ba]">{selectedStudent.hallPassLimit}</p>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Recent Activity</h4>
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
                      {selectedStudent.attendanceHistory.slice(-5).reverse().map((h, i) => (
                        <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-700">{h.reason}</p>
                            <p className="text-slate-400">{h.date}</p>
                          </div>
                          <span className={`font-black ${h.pointsAwarded >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {h.pointsAwarded >= 0 ? '+' : ''}${(h.pointsAwarded / 10).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-8">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#0040ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      Adjust Cougar Bucks
                    </h3>
                    <form onSubmit={handleSavePointAdjustment} className="space-y-4">
                      <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                        <button 
                          type="button"
                          onClick={() => setPointAdjustment({...pointAdjustment, mode: 'add'})}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${pointAdjustment.mode === 'add' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'}`}
                        >
                          ADD BUCKS
                        </button>
                        <button 
                          type="button"
                          onClick={() => setPointAdjustment({...pointAdjustment, mode: 'subtract'})}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${pointAdjustment.mode === 'subtract' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                        >
                          DEDUCT BUCKS
                        </button>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Amount ($)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                          <input 
                            type="number" 
                            step="0.10"
                            required
                            value={pointAdjustment.amount}
                            onChange={e => setPointAdjustment({...pointAdjustment, amount: e.target.value})}
                            className="w-full p-4 pl-8 border-2 border-slate-200 rounded-xl focus:border-[#0040ba] outline-none font-bold text-xl"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Reason</label>
                        <input 
                          type="text" 
                          required
                          value={pointAdjustment.reason}
                          onChange={e => setPointAdjustment({...pointAdjustment, reason: e.target.value})}
                          className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-[#0040ba] outline-none text-sm"
                          placeholder="e.g. Lost ID card, Bonus points"
                        />
                      </div>

                      <button 
                        type="submit" 
                        className={`w-full py-4 rounded-xl font-black shadow-lg transition-all text-white ${pointAdjustment.mode === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                      >
                        CONFIRM {pointAdjustment.mode.toUpperCase()}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTool === 'none' ? (
              <div className="max-w-7xl mx-auto">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#0040ba]">Admin Hub</h1>
                        <p className="text-slate-500 font-medium">Welcome back, {currentAdmin.name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {PERMISSIONS_LIST.filter(p => currentAdmin.permissions?.includes(p.id)).map(tool => (
                        <button 
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-[#0040ba] transition-all text-left group relative h-48 flex flex-col"
                        >
                        {tool.id === 'orders' && pendingOrders.length > 0 && (
                            <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                {pendingOrders.length} Pending
                            </div>
                        )}
                        {tool.id === 'hall-pass-monitor' && activePasses.length > 0 && (
                            <div className="absolute top-4 right-4 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                {activePasses.length} Out
                            </div>
                        )}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:text-white ${tool.color}`}>
                            {tool.icon}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-[#0040ba] transition-colors">{tool.label}</h3>
                        <p className="text-sm text-slate-500 mt-auto">
                            {tool.description}
                        </p>
                        </button>
                    ))}
                  </div>
              </div>
          ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="mb-4 flex items-center justify-between">
                      <button onClick={() => { setActiveTool('none'); setCheckoutResult(null); setAwardResult(null); setScanResult(null); setEventResult(null); }} className="text-[#0040ba] flex items-center gap-1 font-bold hover:underline">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                          Back to Admin Hub
                      </button>
                      {activeTool === 'event-checkin' && (
                         <span className="text-xs bg-rose-100 text-rose-700 px-3 py-1 rounded-full font-bold animate-pulse">Gate Active</span>
                      )}
                  </div>

                  {activeTool === 'event-checkin' && (
                    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                            <h2 className="text-2xl font-bold mb-2 text-slate-800 text-center">Event Gate Check-in</h2>
                            <p className="text-center text-slate-500 mb-8 text-sm">Scan students as they enter the event.</p>
                            
                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Gate Reward Amount ($)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">$</span>
                                        <input 
                                            type="number" 
                                            step="0.10"
                                            value={eventAmount}
                                            onChange={e => setEventAmount(e.target.value)}
                                            className="w-full p-3 pl-10 border-2 border-slate-200 rounded-xl focus:border-rose-500 outline-none text-2xl font-bold text-rose-600"
                                            placeholder="1.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Event Name</label>
                                    <input 
                                        type="text" 
                                        value={eventName}
                                        onChange={e => setEventName(e.target.value)}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:border-rose-500 outline-none"
                                        placeholder="e.g. Basketball Game vs. Rivals"
                                    />
                                </div>
                            </div>

                            <div className="bg-black rounded-2xl overflow-hidden shadow-xl aspect-video relative mb-6 border-4 border-slate-900">
                                {showCamera ? (
                                    <div id="reader" className="w-full h-full"></div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-white/50 bg-slate-900">
                                        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                                        <p className="font-bold">Ready to Open Gate</p>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => { setShowCamera(!showCamera); setEventResult(null); }}
                                className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all ${showCamera ? 'bg-red-50 text-red-600' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
                            >
                                {showCamera ? 'Close Gate Scanner' : 'Open Gate & Start Scanning'}
                            </button>

                            {eventResult && (
                                <div className={`mt-6 p-4 rounded-xl text-center animate-in zoom-in duration-300 ${eventResult.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                    <h3 className="font-bold">{eventResult.success ? '✓' : '✕'} {eventResult.message}</h3>
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    Checked-in Students
                                </span>
                                <span className="text-sm bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{eventCheckinList.length}</span>
                            </h3>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                                {eventCheckinList.length === 0 ? (
                                    <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300 text-slate-400 italic">
                                        No check-ins for this session yet.
                                    </div>
                                ) : (
                                    eventCheckinList.map((h, i) => (
                                        <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center animate-in slide-in-from-top-2">
                                            <div>
                                                <p className="font-bold text-slate-800">{h.name}</p>
                                                <p className="text-xs text-slate-500">{h.time}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-green-600">+$${Number(eventAmount).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                  )}

                  {activeTool === 'hall-pass-monitor' && (
                    <div className="max-w-4xl mx-auto space-y-12">
                         <div>
                            <h2 className="text-2xl font-bold mb-6 text-slate-800">Active Hall Passes</h2>
                            {activePasses.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                                    No students are currently out on passes.
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {activePasses.map(pass => (
                                        <div key={pass.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center animate-in zoom-in">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl">
                                                    {pass.studentName.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{pass.studentName}</h4>
                                                    <p className="text-sm text-slate-500">To: <span className="font-bold text-orange-600 uppercase">{pass.type}</span></p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Started: {new Date(pass.timestamp).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <img 
                                                   src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${pass.id}&scale=1&height=8`} 
                                                   alt="Pass Barcode" 
                                                   className="h-8 mb-1"
                                                />
                                                <button 
                                                   onClick={() => handleReturnStudent(pass.id)}
                                                   className="px-4 py-2 bg-green-50 text-green-600 font-bold rounded-lg text-xs hover:bg-green-100 transition-colors"
                                                >
                                                   Return Student
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-200">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Time Lockouts
                                </h3>
                                <form onSubmit={handleSaveLockout} className="space-y-4 mb-6 bg-slate-50 p-4 rounded-xl">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reason / Label</label>
                                        <input type="text" value={lockoutForm.label} onChange={e => setLockoutForm({...lockoutForm, label: e.target.value})} placeholder="e.g. Lunch Block" className="w-full p-2 text-sm border rounded" required />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start</label>
                                            <input type="time" value={lockoutForm.startTime} onChange={e => setLockoutForm({...lockoutForm, startTime: e.target.value})} className="w-full p-2 text-sm border rounded" required />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End</label>
                                            <input type="time" value={lockoutForm.endTime} onChange={e => setLockoutForm({...lockoutForm, endTime: e.target.value})} className="w-full p-2 text-sm border rounded" required />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors">Add Time Restriction</button>
                                </form>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                    {hallPassLockouts.map(l => (
                                        <div key={l.id} className="flex justify-between items-center p-3 border rounded-lg text-sm bg-white hover:bg-slate-50 transition-colors">
                                            <div>
                                                <p className="font-bold text-slate-700">{l.label}</p>
                                                <p className="text-xs text-slate-400">{l.startTime} - {l.endTime}</p>
                                            </div>
                                            <button onClick={() => handleDeleteLockout(l.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                    {hallPassLockouts.length === 0 && <p className="text-xs text-slate-400 text-center italic py-4">No active time blocks.</p>}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    Buddy Conflicts
                                </h3>
                                <form onSubmit={handleSaveConflict} className="space-y-4 mb-6 bg-slate-50 p-4 rounded-xl">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">First Student</label>
                                            <select value={conflictForm.studentA} onChange={e => setConflictForm({...conflictForm, studentA: e.target.value})} className="w-full p-2 text-sm border rounded bg-white" required>
                                                <option value="">Select Student...</option>
                                                {students.sort((a,b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Second Student</label>
                                            <select value={conflictForm.studentB} onChange={e => setConflictForm({...conflictForm, studentB: e.target.value})} className="w-full p-2 text-sm border rounded bg-white" required>
                                                <option value="">Select Student...</option>
                                                {students.sort((a,b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-2 bg-orange-600 text-white text-xs font-bold rounded hover:bg-orange-700 transition-colors">Prevent Simultaneous Exit</button>
                                </form>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                    {hallPassConflicts.map(c => {
                                        const s1 = students.find(s => s.id === c.studentIds[0]);
                                        const s2 = students.find(s => s.id === c.studentIds[1]);
                                        return (
                                            <div key={c.id} className="p-3 border rounded-lg text-sm bg-white flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                <div>
                                                    <p className="font-bold text-slate-700 leading-tight">{s1?.name || 'Unknown'}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black my-0.5">VS</p>
                                                    <p className="font-bold text-slate-700 leading-tight">{s2?.name || 'Unknown'}</p>
                                                </div>
                                                <button onClick={() => handleDeleteConflict(c.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {hallPassConflicts.length === 0 && <p className="text-xs text-slate-400 text-center italic py-4">No buddy restrictions set.</p>}
                                </div>
                            </div>
                         </div>

                         <div className="mt-12">
                             <h3 className="font-bold text-slate-800 mb-4">Recent History</h3>
                             <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-sm">
                                {hallPasses.filter(p => p.status === 'returned').slice(-5).reverse().map(p => (
                                    <div key={p.id} className="p-4 border-b border-slate-100 flex justify-between hover:bg-slate-50 transition-colors">
                                        <span><span className="font-bold">{p.studentName}</span> went to {p.type}</span>
                                        <span className="text-slate-400">{new Date(p.timestamp).toLocaleDateString()} {new Date(p.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                ))}
                             </div>
                         </div>
                    </div>
                  )}

                  {activeTool === 'polls-announcements' && (
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-10">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-[#0040ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    Post Announcement
                                </h2>
                                <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Title</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={announcementForm.title}
                                            onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none"
                                            placeholder="e.g. Pep Rally on Friday!"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Message Content</label>
                                        <textarea 
                                            required
                                            value={announcementForm.content}
                                            onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none h-24"
                                            placeholder="Details about the announcement..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Expiration Date</label>
                                        <input 
                                            type="date" 
                                            required
                                            value={announcementForm.expiresAt}
                                            onChange={e => setAnnouncementForm({...announcementForm, expiresAt: e.target.value})}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">When should this news disappear from student dashboards?</p>
                                    </div>
                                    <button type="submit" className="w-full py-3 bg-[#0040ba] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors shadow-md">
                                        Post Announcement
                                    </button>
                                </form>
                            </div>

                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-[#0040ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                    Create Student Poll
                                </h2>
                                <form onSubmit={handleSavePoll} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Question</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={pollForm.question}
                                            onChange={e => setPollForm({...pollForm, question: e.target.value})}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none"
                                            placeholder="e.g. Which design for the graduation shirt?"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-400 uppercase">Poll Options</label>
                                        {pollForm.options.map((opt, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={opt}
                                                    onChange={e => {
                                                        const newOpts = [...pollForm.options];
                                                        newOpts[i] = e.target.value;
                                                        setPollForm({...pollForm, options: newOpts});
                                                    }}
                                                    className="flex-1 p-3 border border-slate-200 rounded-lg text-sm"
                                                    placeholder={`Option ${i+1}`}
                                                />
                                                {pollForm.options.length > 2 && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => setPollForm({...pollForm, options: pollForm.options.filter((_, idx) => idx !== i)})}
                                                        className="p-2 text-red-400 hover:text-red-600"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button 
                                            type="button" 
                                            onClick={() => setPollForm({...pollForm, options: [...pollForm.options, '']})}
                                            className="text-xs text-[#0040ba] font-bold hover:underline"
                                        >
                                            + Add Option
                                        </button>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Expiration Date</label>
                                        <input 
                                            type="date" 
                                            required
                                            value={pollForm.expiresAt}
                                            onChange={e => setPollForm({...pollForm, expiresAt: e.target.value})}
                                            className="w-full p-3 border border-slate-300 rounded-lg"
                                        />
                                    </div>
                                    <button type="submit" className="w-full py-3 bg-[#0040ba] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors shadow-md">
                                        Post Poll
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center justify-between">
                                    Active Polls
                                    <span className="text-xs bg-blue-50 text-[#0040ba] px-2 py-1 rounded-full">{polls.length}</span>
                                </h3>
                                <div className="space-y-4">
                                    {polls.length === 0 ? (
                                        <div className="bg-white p-10 text-center rounded-2xl border border-dashed border-slate-300 text-slate-400 italic text-sm">
                                            No polls posted yet.
                                        </div>
                                    ) : (
                                        polls.map(poll => {
                                            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
                                            return (
                                                <div key={poll.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <h4 className="font-bold text-slate-800 text-lg leading-tight">{poll.question}</h4>
                                                        <button onClick={() => handleDeletePoll(poll.id)} className="text-slate-300 hover:text-red-500">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {poll.options.map(opt => {
                                                            const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                                                            return (
                                                                <div key={opt.id}>
                                                                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1 uppercase">
                                                                        <span className="flex-1 truncate pr-2">{opt.text}</span>
                                                                        <span>{opt.votes.length} ({pct}%)</span>
                                                                    </div>
                                                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                        <div 
                                                                            className="h-full bg-[#0040ba] transition-all duration-1000"
                                                                            style={{ width: `${pct}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <span>Total Votes: {totalVotes}</span>
                                                        <span>Expires: {poll.expiresAt}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center justify-between">
                                    Current News
                                    <span className="text-xs bg-blue-50 text-[#0040ba] px-2 py-1 rounded-full">{announcements.length}</span>
                                </h3>
                                <div className="space-y-4">
                                    {announcements.length === 0 ? (
                                        <div className="bg-white p-10 text-center rounded-2xl border border-dashed border-slate-300 text-slate-400 italic text-sm">
                                            No announcements posted.
                                        </div>
                                    ) : (
                                        announcements.map(ann => (
                                            <div key={ann.id} className="bg-[#0040ba]/5 p-6 rounded-2xl border border-[#0040ba]/20 shadow-sm relative group">
                                                <button 
                                                    onClick={() => handleDeleteAnnouncement(ann.id)}
                                                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                                <h4 className="font-bold text-[#0040ba] text-lg mb-1">{ann.title}</h4>
                                                <p className="text-slate-600 text-sm">{ann.content}</p>
                                                <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase">Expires: {ann.expiresAt}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                  )}

                  {activeTool === 'award-points' && (
                    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                            <h2 className="text-2xl font-bold mb-2 text-slate-800 text-center">Award Rewards</h2>
                            <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-8">
                                <div>
                                    <p className="text-xs font-bold text-indigo-400 uppercase">Monthly Budget</p>
                                    <p className="text-2xl font-black text-indigo-700">${(remainingBudget/10).toFixed(2)} <span className="text-sm font-normal text-indigo-400">left</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-indigo-400 uppercase">Reset Month</p>
                                    <p className="text-sm font-bold text-indigo-700">{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Enter Reward Amount ($)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-slate-400">$</span>
                                        <input 
                                            type="number" 
                                            step="0.10"
                                            value={awardAmount}
                                            onChange={e => setAwardAmount(e.target.value)}
                                            className="w-full p-4 pl-10 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-3xl font-bold text-center text-indigo-600"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-center text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Gives {Math.round(Number(awardAmount) * 10)} Cougar Bucks</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Reason (Optional)</label>
                                    <input 
                                        type="text" 
                                        value={awardReason}
                                        onChange={e => setAwardReason(e.target.value)}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none"
                                        placeholder="e.g. Helpful Student, Great Performance"
                                    />
                                </div>
                            </div>

                            <div className="bg-black rounded-2xl overflow-hidden shadow-xl aspect-video relative mb-6 border-4 border-slate-900">
                                {showCamera ? (
                                    <div id="reader" className="w-full h-full"></div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-white/50 bg-slate-900">
                                        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <p className="font-bold uppercase tracking-wider text-xs">Ready to Scan Student Card</p>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => { setShowCamera(!showCamera); setAwardResult(null); }}
                                disabled={Number(awardAmount) <= 0 || (Number(awardAmount)*10) > remainingBudget}
                                className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all ${showCamera ? 'bg-red-50 text-red-600' : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'}`}
                            >
                                {showCamera ? 'Cancel Scanning' : 'Scan Card to Award'}
                            </button>

                            {awardResult && (
                                <div className={`mt-6 p-6 rounded-2xl text-center animate-in zoom-in duration-300 ${awardResult.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                    <div className="text-4xl mb-2">{awardResult.success ? '✓' : '✕'}</div>
                                    <h3 className="text-xl font-bold">{awardResult.success ? 'Success!' : 'Failed'}</h3>
                                    <p className="mt-1 opacity-90">{awardResult.message}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                My Award History
                            </h3>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                                {myAwardHistory.length === 0 ? (
                                    <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300 text-slate-400 italic">
                                        No awards given this session.
                                    </div>
                                ) : (
                                    myAwardHistory.map((h, i) => (
                                        <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-slate-800">{h.studentName}</p>
                                                <p className="text-xs text-slate-500">{h.reason}</p>
                                                <p className="text-[10px] text-slate-400 mt-1 uppercase">{h.date}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-green-600">+$${(h.pointsAwarded/10).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                  )}

                  {activeTool === 'point-checkout' && (
                    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800 text-center">Merchant Checkout</h2>
                        <p className="text-center text-slate-500 mb-8 -mt-4 text-sm font-medium">Instantly deduct bucks from student cards.</p>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Enter Sale Price ($)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-slate-400">$</span>
                                    <input 
                                        type="number" 
                                        step="0.10"
                                        value={checkoutPrice}
                                        onChange={e => setCheckoutPrice(e.target.value)}
                                        className="w-full p-4 pl-10 border-2 border-slate-200 rounded-xl focus:border-green-500 outline-none text-3xl font-bold text-center text-green-600"
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-center text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Equivalent to {Math.round(Number(checkoutPrice) * 10)} Cougar Bucks</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Item/Reason (Optional)</label>
                                <input 
                                    type="text" 
                                    value={checkoutReason}
                                    onChange={e => setCheckoutReason(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none"
                                    placeholder="e.g. Snack, Event Ticket"
                                />
                            </div>
                        </div>

                        <div className="bg-black rounded-2xl overflow-hidden shadow-xl aspect-video relative mb-6 border-4 border-slate-900">
                            {showCamera ? (
                                <div id="reader" className="w-full h-full"></div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-white/50 bg-slate-900">
                                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                    <p className="font-bold">Scanner Ready</p>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => { setShowCamera(!showCamera); setCheckoutResult(null); }}
                            disabled={Number(checkoutPrice) <= 0 && !activePasses.length}
                            className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all ${showCamera ? 'bg-red-50 text-red-600' : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:grayscale'}`}
                        >
                            {showCamera ? 'Cancel Transaction' : 'Scan Card to Deduct Bucks'}
                        </button>

                        {checkoutResult && (
                            <div className={`mt-6 p-6 rounded-2xl text-center animate-in zoom-in duration-300 ${checkoutResult.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                <div className="text-4xl mb-2">{checkoutResult.success ? '✓' : '✕'}</div>
                                <h3 className="text-xl font-bold">{checkoutResult.success ? 'Transaction Complete!' : 'Deduction Failed'}</h3>
                                <p className="mt-1 opacity-90">{checkoutResult.message}</p>
                            </div>
                        )}
                    </div>
                  )}

                  {activeTool === 'attendance' && (
                    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800">Attendance Upload</h2>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                            <input 
                                type="file" 
                                accept=".pdf"
                                onChange={handleFileUpload}
                                className="hidden" 
                                id="attendance-upload"
                            />
                            <label htmlFor="attendance-upload" className="cursor-pointer flex flex-col items-center">
                                <svg className="w-12 h-12 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                <span className="font-bold text-[#0040ba]">Click to Upload PDF</span>
                                <span className="text-sm text-slate-500 mt-1">Upload the official Letcher County Central Day Count Report</span>
                            </label>
                        </div>
                        {uploadStatus && (
                            <div className={`mt-4 p-4 rounded-lg text-sm ${uploadStatus.includes('Processed') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {uploadStatus}
                            </div>
                        )}
                        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                           <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Report Parsing Logic</h4>
                           <ul className="text-xs text-slate-500 space-y-1">
                               <li>• <b>Absent Days 0.0:</b> Student is Present (+Daily Bucks)</li>
                               <li>• <b>Absent Days 1.0:</b> Student is Absent (0 Bucks)</li>
                               <li>• <b>Date:</b> Automatically detected from "Date Range" header.</li>
                           </ul>
                        </div>
                    </div>
                  )}

                  {activeTool === 'scanner' && (
                    <div className="max-w-md mx-auto">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800 text-center">Redemption Scanner</h2>
                        <p className="text-center text-slate-500 -mt-4 mb-8 text-sm">Scan official TX codes or merchant-issued barcodes.</p>
                        
                        <div className="bg-black rounded-2xl overflow-hidden shadow-xl aspect-video relative mb-6">
                            {showCamera ? (
                                <div id="reader" className="w-full h-full"></div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-white/50">
                                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <p>Camera Off</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-4 mb-6">
                            <button 
                                onClick={() => { setShowCamera(!showCamera); setScanResult(null); }}
                                className={`flex-1 py-3 rounded-xl font-bold transition-colors ${showCamera ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-[#0040ba] text-white hover:bg-blue-800'}`}
                            >
                                {showCamera ? 'Stop Camera' : 'Start Camera'}
                            </button>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wider">Manual Code Entry</h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Enter code manually..."
                                    value={scanCode}
                                    onChange={e => setScanCode(e.target.value)}
                                    className="flex-1 p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none font-mono uppercase"
                                />
                                <button 
                                    onClick={() => processRedemption(scanCode)}
                                    disabled={!scanCode}
                                    className="px-6 bg-slate-800 text-white rounded-lg font-bold hover:bg-black disabled:opacity-50"
                                >
                                    Verify
                                </button>
                            </div>
                        </div>

                        {scanResult && (
                            <div className={`mt-6 p-6 rounded-2xl text-center animate-in zoom-in duration-300 ${scanResult.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                <div className="text-4xl mb-2">{scanResult.success ? '✓' : '✕'}</div>
                                <h3 className="text-xl font-bold">{scanResult.success ? 'Success!' : 'Error'}</h3>
                                <p className="mt-1 opacity-90">{scanResult.message}</p>
                            </div>
                        )}
                    </div>
                  )}

                  {activeTool === 'store' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">Store Inventory</h2>
                            <button 
                                onClick={() => {
                                    setEditingItemId(null);
                                    setNewItem({ 
                                        name: '', description: '', cashPrice: '0.00', category: 'Voucher', image: '', quantity: 50,
                                        expirationDate: '', startDate: '', endDate: '', durationDays: 0, requiresFulfillment: false,
                                        externalBarcode: '', hallPassIncrease: 0
                                    });
                                }}
                                className="text-sm text-[#0040ba] font-bold hover:underline"
                            >
                                Reset Form
                            </button>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Item Name</label>
                                    <input 
                                        type="text" 
                                        value={newItem.name}
                                        onChange={e => setNewItem({...newItem, name: e.target.value})}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none"
                                        placeholder="e.g. Free Pizza Slice"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Category</label>
                                    <select 
                                        value={newItem.category}
                                        onChange={e => setNewItem({...newItem, category: e.target.value})}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none"
                                    >
                                        <option value="Voucher">Voucher</option>
                                        <option value="Privilege">Privilege</option>
                                        <option value="Apparel">Apparel</option>
                                        <option value="School Supplies">School Supplies</option>
                                        <option value="Athletic Pass">Athletic Pass</option>
                                        <option value="Food/Drink">Food/Drink</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label>
                                    <textarea 
                                        value={newItem.description}
                                        onChange={e => setNewItem({...newItem, description: e.target.value})}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none h-20"
                                        placeholder="Describe the item..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Price ($)</label>
                                    <input 
                                        type="number" 
                                        step="0.10"
                                        value={newItem.cashPrice}
                                        onChange={e => setNewItem({...newItem, cashPrice: e.target.value})}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none font-bold text-green-600"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Equivalent to {Math.round(Number(newItem.cashPrice) * 10)} Bucks</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Quantity</label>
                                    <input 
                                        type="number" 
                                        value={newItem.quantity}
                                        onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">External UPC-A Barcode (12 digits)</label>
                                    <input 
                                        type="text" 
                                        maxLength={12}
                                        value={newItem.externalBarcode}
                                        onChange={e => setNewItem({...newItem, externalBarcode: e.target.value.replace(/[^0-9]/g, '')})}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none font-mono"
                                        placeholder="012345678901"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Hall Pass Limit Increase (+X)</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        max="50"
                                        value={newItem.hallPassIncrease}
                                        onChange={e => setNewItem({...newItem, hallPassIncrease: parseInt(e.target.value) || 0})}
                                        className="w-full p-3 border border-blue-200 rounded-lg focus:border-[#0040ba] outline-none bg-blue-50 font-bold"
                                        placeholder="e.g. 1"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Gives student X extra weekly hall passes upon purchase.</p>
                                </div>

                                <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Redemption Type</label>
                                    <div className="flex gap-4 mb-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" checked={passType === 'standard'} onChange={() => setPassType('standard')} />
                                            <span className="text-sm font-medium">Standard / One-time</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" checked={passType === 'fixed_dates'} onChange={() => setPassType('fixed_dates')} />
                                            <span className="text-sm font-medium">Fixed Date Range</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" checked={passType === 'duration'} onChange={() => setPassType('duration')} />
                                            <span className="text-sm font-medium">Flexible Duration</span>
                                        </label>
                                    </div>

                                    {passType === 'standard' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Expiration Date (Optional)</label>
                                            <input 
                                                type="date" 
                                                value={newItem.expirationDate}
                                                onChange={e => setNewItem({...newItem, expirationDate: e.target.value})}
                                                className="w-full p-3 border border-slate-300 rounded-lg bg-white"
                                            />
                                        </div>
                                    )}
                                    {passType === 'fixed_dates' && (
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Start Date</label>
                                                <input 
                                                    type="date" 
                                                    value={newItem.startDate}
                                                    onChange={e => setNewItem({...newItem, startDate: e.target.value})}
                                                    className="w-full p-3 border border-slate-300 rounded-lg bg-white"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">End Date</label>
                                                <input 
                                                    type="date" 
                                                    value={newItem.endDate}
                                                    onChange={e => setNewItem({...newItem, endDate: e.target.value})}
                                                    className="w-full p-3 border border-slate-300 rounded-lg bg-white"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {passType === 'duration' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Duration (Days)</label>
                                            <input 
                                                type="number" 
                                                value={newItem.durationDays}
                                                onChange={e => setNewItem({...newItem, durationDays: Number(e.target.value)})}
                                                className="w-full p-3 border border-slate-300 rounded-lg bg-white"
                                                placeholder="e.g. 7 for one week"
                                            />
                                            <p className="text-xs text-slate-400 mt-1">Pass starts counting down when student first scans it.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                                        <input 
                                            type="checkbox" 
                                            checked={newItem.requiresFulfillment}
                                            onChange={e => setNewItem({...newItem, requiresFulfillment: e.target.checked})}
                                            className="w-5 h-5 text-[#0040ba] rounded"
                                        />
                                        <div>
                                            <span className="block font-bold text-slate-800">Requires Physical Fulfillment?</span>
                                            <span className="block text-xs text-slate-500">If checked, student must pick up item. Admin marks as "Ready" then "Fulfilled".</span>
                                        </div>
                                    </label>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Image</label>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                        accept="image/*"
                                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#0040ba] file:text-white hover:file:bg-blue-800"
                                    />
                                    {newItem.image && (
                                        <div className="mt-4 w-32 h-32 rounded-lg overflow-hidden border border-slate-200">
                                            <img src={newItem.image} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mt-8">
                                <button 
                                    onClick={handleSaveItem}
                                    className="w-full py-4 bg-[#0040ba] text-white font-bold rounded-xl shadow-lg hover:bg-blue-800 transition-colors"
                                >
                                    {editingItemId ? 'Update Item' : 'Create Item'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {storeItems.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col relative group">
                                    <div className="h-32 bg-slate-100 rounded-lg mb-4 overflow-hidden">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    </div>
                                    <h4 className="font-bold text-slate-800">{item.name}</h4>
                                    <p className="text-sm text-slate-500">${(item.cost / 10).toFixed(2)} • {item.quantity} left</p>
                                    {item.hallPassIncrease && <p className="text-[10px] text-orange-600 font-bold mt-1 uppercase">Effect: +{item.hallPassIncrease} Hall Pass Limit</p>}
                                    {item.externalBarcode && <p className="text-[10px] text-blue-600 font-bold mt-1">UPC: {item.externalBarcode}</p>}
                                    
                                    <div className="mt-4 flex gap-2">
                                        <button 
                                            onClick={() => handleEditItem(item)}
                                            className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-200"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="flex-1 py-2 bg-red-50 text-red-600 font-bold rounded-lg text-xs hover:bg-red-100"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}

                  {activeTool === 'calendar' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">Calendar Manager</h2>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleAiSuggestEvents}
                                    disabled={isGenerating}
                                    className="text-sm bg-[#0040ba]/10 text-[#0040ba] px-4 py-2 rounded-lg hover:bg-[#0040ba]/20 font-bold transition-colors"
                                >
                                    {isGenerating ? 'Thinking...' : '✨ Suggest Events'}
                                </button>
                                <button 
                                    onClick={toggleBulkMode}
                                    className={`text-sm px-4 py-2 rounded-lg font-bold transition-colors ${isBulkMode ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}
                                >
                                    {isBulkMode ? 'Finish Bulk Edit' : 'Bulk Edit'}
                                </button>
                            </div>
                        </div>
                        
                        {isBulkMode && (
                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-6 flex items-center justify-between">
                                <span className="text-orange-800 font-medium text-sm">Select multiple dates then define event below. Selected: {bulkDates.length}</span>
                                <button onClick={handleBulkSave} disabled={bulkDates.length === 0} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50">Apply to Selected</button>
                            </div>
                        )}

                        {(editingDate || (isBulkMode && bulkDates.length > 0)) && (
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 mb-6 animate-in slide-in-from-top-4">
                                <h3 className="font-bold text-lg mb-4 text-slate-800">{isBulkMode ? `Bulk Edit (${bulkDates.length} days)` : `Editing ${editingDate}`}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Event Type</label>
                                        <select 
                                            value={editEventForm.eventType}
                                            onChange={e => setEditEventForm({...editEventForm, eventType: e.target.value as EventType})}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none"
                                        >
                                            <option value="default">Standard Day</option>
                                            <option value="special">Special Event</option>
                                            <option value="no_school">No School</option>
                                            <option value="break">Holiday Break</option>
                                            <option value="custom">Manual Adjustment</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Event Title</label>
                                        <input 
                                            type="text" 
                                            value={editEventForm.title}
                                            onChange={e => setEditEventForm({...editEventForm, title: e.target.value})}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none"
                                            placeholder="e.g. Spirit Day"
                                        />
                                    </div>
                                    {editEventForm.eventType !== 'no_school' && editEventForm.eventType !== 'break' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Reward Bucks Override</label>
                                            <input 
                                                type="number" 
                                                value={editEventForm.overridePoints}
                                                onChange={e => setEditEventForm({...editEventForm, overridePoints: e.target.value})}
                                                className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none"
                                                placeholder="Leave empty for default"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button 
                                        onClick={() => { setEditingDate(null); if(isBulkMode) setBulkDates([]); }}
                                        className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={isBulkMode ? handleBulkSave : handleSaveDay}
                                        className="px-6 py-2 bg-[#0040ba] text-white font-bold rounded-lg hover:bg-blue-800 shadow-md"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        )}

                        <CalendarView 
                            events={calendarEvents} 
                            onDateClick={handleDateClick}
                            selectedDates={isBulkMode ? bulkDates : (editingDate ? [editingDate] : [])}
                        />
                    </div>
                  )}
                  
                  {activeTool === 'student-directory' && (
                    <div className="max-w-6xl mx-auto">
                        {isAddingStudent && (
                            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in duration-200">
                                    <h3 className="text-xl font-bold text-slate-800 mb-4">Add New Student</h3>
                                    <form onSubmit={handleAddStudent} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
                                            <input 
                                                type="text" 
                                                required
                                                value={newStudentForm.name}
                                                onChange={e => setNewStudentForm({...newStudentForm, name: e.target.value})}
                                                className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none"
                                                placeholder="e.g. John Doe"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address</label>
                                            <input 
                                                type="email" 
                                                required
                                                value={newStudentForm.email}
                                                onChange={e => setNewStudentForm({...newStudentForm, email: e.target.value})}
                                                className="w-full p-3 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none"
                                                placeholder="e.g. john@school.edu"
                                            />
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button 
                                                type="button"
                                                onClick={() => setIsAddingStudent(false)}
                                                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="submit"
                                                className="flex-1 py-3 bg-[#0040ba] text-white font-bold rounded-xl hover:bg-blue-800 shadow-md"
                                            >
                                                Add Student
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-6 gap-4">
                            <div className="flex-1 flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Search students by name or email..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="flex-1 p-2 border border-slate-300 rounded-lg focus:border-[#0040ba] outline-none"
                                />
                                <select 
                                    value={sortOption}
                                    onChange={e => setSortOption(e.target.value as SortOption)}
                                    className="p-2 border border-slate-300 rounded-lg outline-none text-sm font-medium text-slate-600"
                                >
                                    <option value="lastName">Last Name</option>
                                    <option value="firstName">First Name</option>
                                    <option value="pointsHigh">Balance (High-Low)</option>
                                    <option value="pointsLow">Balance (Low-High)</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsAddingStudent(true)} 
                                    className="text-xs bg-[#0040ba] text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-800 flex items-center gap-1 shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    Add
                                </button>
                                <button onClick={handlePrintCodes} className="text-xs bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-bold hover:bg-slate-200">Print</button>
                                <input 
                                    type="file" 
                                    accept=".csv"
                                    onChange={handleStudentBatchUpload}
                                    className="hidden" 
                                    id="batch-student-upload"
                                />
                                <label htmlFor="batch-student-upload" className="text-xs bg-[#0040ba]/10 text-[#0040ba] px-4 py-2 rounded-lg font-bold hover:bg-[#0040ba]/20 cursor-pointer">
                                    Import
                                </label>
                            </div>
                        </div>

                        {selectedStudentIds.length > 0 && (
                            <div className="bg-[#0040ba] text-white p-4 rounded-xl shadow-lg mb-6 flex items-center justify-between animate-in slide-in-from-top-2">
                                <span className="font-bold">{selectedStudentIds.length} students selected</span>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsBulkPointsModalOpen(true)} className="px-4 py-2 bg-white text-[#0040ba] rounded-lg font-bold text-sm">Bulk Adjust Bucks</button>
                                    <button onClick={handleBulkDeleteStudents} className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold text-sm hover:bg-red-600">Delete</button>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase font-bold">
                                    <tr>
                                        <th className="p-4 w-10">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedStudentIds.length === students.length && students.length > 0}
                                                onChange={() => {
                                                if (selectedStudentIds.length === students.length) setSelectedStudentIds([]);
                                                else setSelectedStudentIds(students.map(s => s.id));
                                                }}
                                            />
                                        </th>
                                        <th className="p-4">Student Profile (Click to Adjust)</th>
                                        <th className="p-4">Pass Limit</th>
                                        <th className="p-4">Bucks ($)</th>
                                        <th className="p-4">ID Barcode</th>
                                        <th className="p-4">Access Code</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {students
                                        .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .sort((a, b) => {
                                            if (sortOption === 'lastName') return a.name.split(' ').pop()!.localeCompare(b.name.split(' ').pop()!);
                                            if (sortOption === 'firstName') return a.name.localeCompare(b.name);
                                            if (sortOption === 'pointsHigh') return b.totalPoints - a.totalPoints;
                                            if (sortOption === 'pointsLow') return a.totalPoints - b.totalPoints;
                                            return 0;
                                        })
                                        .map(student => (
                                        <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-4">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedStudentIds.includes(student.id)}
                                                    onChange={() => toggleStudentSelection(student.id)}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <button 
                                                  onClick={() => setSelectedStudent(student)}
                                                  className="text-left group"
                                                >
                                                  <p className="font-bold text-slate-700 group-hover:text-[#0040ba] transition-colors">{student.name}</p>
                                                  <p className="text-xs text-slate-400">{student.email}</p>
                                                </button>
                                            </td>
                                            <td className="p-4">
                                               <input 
                                                   type="number" 
                                                   defaultValue={student.hallPassLimit}
                                                   onBlur={(e) => {
                                                       const limit = parseInt(e.target.value);
                                                       onUpdateStudents(students.map(s => s.id === student.id ? { ...s, hallPassLimit: limit } : s));
                                                   }}
                                                   className="w-12 p-1 border rounded text-sm text-center font-bold text-slate-600"
                                               />
                                            </td>
                                            <td className="p-4 font-black text-green-700">${(student.totalPoints / 10).toFixed(2)}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-white p-1 rounded border border-slate-200">
                                                        <img 
                                                            src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${student.id}&scale=3&height=12&includetext`} 
                                                            alt="ID Barcode" 
                                                            className="h-6"
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => downloadBarcode(student.id, student.name)}
                                                        className="p-1.5 text-[#0040ba] hover:bg-blue-50 rounded transition-colors"
                                                        title="Download Barcode PNG"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono text-xs bg-slate-100 rounded px-2 py-1 w-fit select-all">{student.loginCode}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {students.length === 0 && <div className="p-8 text-center text-slate-400">No students found. Import a CSV to start.</div>}
                        </div>

                        {isBulkPointsModalOpen && (
                          <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsBulkPointsModalOpen(false)}>
                            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                              <h3 className="text-xl font-bold text-slate-800 mb-4">Bulk Bucks Adjustment</h3>
                              <p className="text-sm text-slate-500 mb-6">Adjust balance for {selectedStudentIds.length} selected students.</p>
                              <form onSubmit={handleBulkGivePoints} className="space-y-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Amount ($)</label>
                                  <input 
                                    type="number" 
                                    step="0.10"
                                    required
                                    value={bulkPointsForm.amount}
                                    onChange={e => setBulkPointsForm({...bulkPointsForm, amount: e.target.value})}
                                    className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-[#0040ba] outline-none font-bold"
                                    placeholder="Enter positive or negative amount"
                                  />
                                  <p className="text-[10px] text-slate-400 mt-1 italic">Use negative sign to deduct. e.g. -5.00</p>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Reason</label>
                                  <input 
                                    type="text" 
                                    required
                                    value={bulkPointsForm.reason}
                                    onChange={e => setBulkPointsForm({...bulkPointsForm, reason: e.target.value})}
                                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-[#0040ba] outline-none"
                                    placeholder="Reason for change"
                                  />
                                </div>
                                <div className="flex gap-3 pt-4">
                                  <button type="button" onClick={() => setIsBulkPointsModalOpen(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancel</button>
                                  <button type="submit" className="flex-1 py-3 bg-[#0040ba] text-white font-bold rounded-xl shadow-lg">Confirm Bulk Change</button>
                                </div>
                              </form>
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                  
                  {activeTool === 'manage-admins' && (
                    <div className="max-w-2xl mx-auto">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800">Manage Administrators</h2>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
                            <h3 className="font-bold text-lg mb-4">{editingAdminId ? 'Edit Admin' : 'Add New Admin'}</h3>
                            <div className="space-y-4">
                                <input 
                                    type="text" 
                                    placeholder="Name" 
                                    value={newAdminForm.name}
                                    onChange={e => setNewAdminForm({...newAdminForm, name: e.target.value})}
                                    className="w-full p-3 border border-slate-300 rounded-lg"
                                />
                                <input 
                                    type="email" 
                                    placeholder="Email" 
                                    value={newAdminForm.email}
                                    onChange={e => setNewAdminForm({...newAdminForm, email: e.target.value})}
                                    className="w-full p-3 border border-slate-300 rounded-lg"
                                />
                                <input 
                                    type="text" 
                                    placeholder="Login Code" 
                                    value={newAdminForm.loginCode}
                                    onChange={e => setNewAdminForm({...newAdminForm, loginCode: e.target.value})}
                                    className="w-full p-3 border border-slate-300 rounded-lg font-mono"
                                />
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Monthly Award Limit ($)</label>
                                    <input 
                                        type="number" 
                                        step="0.10"
                                        placeholder="100.00" 
                                        value={newAdminForm.monthlyLimit}
                                        onChange={e => setNewAdminForm({...newAdminForm, monthlyLimit: e.target.value})}
                                        className="w-full p-3 border border-slate-300 rounded-lg font-bold text-indigo-600"
                                    />
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Permissions</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {PERMISSIONS_LIST.map(perm => (
                                            <label key={perm.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white rounded-lg transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    checked={newAdminPermissions.includes(perm.id)}
                                                    onChange={e => {
                                                        if(e.target.checked) setNewAdminPermissions([...newAdminPermissions, perm.id]);
                                                        else setNewAdminPermissions(newAdminPermissions.filter(p => p !== perm.id));
                                                    }}
                                                    className="rounded text-[#0040ba] focus:ring-[#0040ba]"
                                                />
                                                <span className="text-sm font-medium text-slate-700">{perm.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    {editingAdminId && <button onClick={() => setEditingAdminId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancel</button>}
                                    <button onClick={handleSaveAdmin} className="px-6 py-2 bg-[#0040ba] text-white font-bold rounded-lg hover:bg-blue-800">Save Admin</button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {admins.map(admin => (
                                <div key={admin.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-slate-800">{admin.name}</h4>
                                        <p className="text-sm text-slate-500">{admin.email}</p>
                                        <div className="flex gap-2 mt-2 items-center">
                                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase">Budget: ${((admin.monthlyAwardLimit || 1000)/10).toFixed(2)}</span>
                                            {admin.permissions?.slice(0, 3).map(p => (
                                                <span key={p} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">{p}</span>
                                            ))}
                                            {(admin.permissions?.length || 0) > 3 && <span className="text-[10px] text-slate-400">+{admin.permissions!.length - 3} more</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditAdmin(admin)} className="p-2 text-slate-400 hover:text-[#0040ba] hover:bg-blue-50 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button onClick={() => handleDeleteAdmin(admin.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}
                  
                  {activeTool === 'orders' && (
                    <div className="max-w-5xl mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Order Fulfillment</h2>
                                <p className="text-slate-500">Manage physical items purchased by students.</p>
                            </div>
                            <button onClick={handlePrintOrders} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-slate-200 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                Print List
                            </button>
                        </div>
                        {pendingOrders.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                                <h3 className="text-xl font-bold text-slate-800">All Caught Up!</h3>
                                <p className="text-slate-500">No pending orders to fulfill.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingOrders.map((order, idx) => (
                                    <div key={`${order.id}-${idx}`} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${order.fulfillmentStatus === 'ready' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {order.fulfillmentStatus === 'ready' ? '✓' : '!'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-800 text-lg">{order.itemName}</h4>
                                                </div>
                                                <p className="text-slate-600">Ordered by <span className="font-bold">{order.student.name}</span></p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full md:w-auto">
                                            {order.fulfillmentStatus !== 'ready' && (
                                                <button 
                                                    onClick={() => handleMarkReadyForPickup(order.student.id, order.id, order.itemName)}
                                                    className="flex-1 md:flex-none px-6 py-2 bg-[#0040ba] text-white font-bold rounded-lg hover:bg-blue-800 transition-colors"
                                                >
                                                    Mark Ready
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                  )}
              </div>
          )}
      </div>
  );
};
