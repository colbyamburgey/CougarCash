
export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT'
}

export interface AttendanceRecord {
  date: string; // ISO Date string YYYY-MM-DD
  present: boolean;
  pointsAwarded: number;
  reason?: string; // Optional reason for the points (e.g. "Good Behavior", "Attendance")
  awardedBy?: string; // Admin ID who awarded these points
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'order_ready' | 'general' | 'purchase';
}

export interface PurchaseRecord {
  id: string;
  date: string; // ISO String
  itemName: string;
  cost: number;
  category: string;
  image?: string;
  redeemed: boolean; // Tracks if the voucher has been used/collected
  expirationDate?: string; // Optional fixed expiration
  startDate?: string; // Fixed start date
  endDate?: string; // Fixed end date
  durationDays?: number; // Flexible duration (days from activation)
  activationDate?: string; // When the duration started (first scan)
  requiresFulfillment?: boolean; // If true, requires admin to mark as fulfilled/delivered
  fulfillmentStatus?: 'pending' | 'ready' | 'fulfilled'; // Tracking physical item status
  externalBarcode?: string; // Optional custom barcode provided by a local business
}

export interface HallPassRecord {
  id: string;
  studentId: string;
  studentName: string;
  teacherId?: string;
  teacherName?: string;
  timestamp: string;
  endTime?: string;
  type: 'Restroom' | 'Library' | 'Nurse' | 'Office' | 'Other';
  status: 'active' | 'returned';
}

export interface Student {
  id: string;
  role: 'STUDENT';
  loginCode: string; // 6 digit access code
  name: string;
  email: string;
  totalPoints: number;
  attendanceHistory: AttendanceRecord[];
  purchaseHistory: PurchaseRecord[];
  cart: string[]; // Array of StoreItem IDs
  favorites: string[]; // Array of StoreItem IDs
  notifications: Notification[];
  hallPassLimit: number;
  hallPassesUsedThisMonth: number; // For tracking purposes
}

export type AdminPermission = 'attendance' | 'calendar' | 'store' | 'scanner' | 'student-directory' | 'orders' | 'manage-admins' | 'point-checkout' | 'hall-pass-monitor' | 'award-points' | 'polls-announcements' | 'event-checkin';

export interface Admin {
  id: string;
  role: 'ADMIN';
  name: string;
  email: string;
  loginCode: string;
  permissions: AdminPermission[];
  monthlyAwardLimit?: number; // Max points this admin can give per month
  pointsAwardedThisMonth?: number; // Points already given this month
  lastResetMonth?: string; // Format: "YYYY-MM"
}

export interface Group {
  id: string;
  name: string;
  type: 'Class' | 'Team' | 'Club' | 'Other';
  studentIds: string[]; // Array of Student IDs
}

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  image: string;
  category: string;
  quantity: number; // Inventory tracking
  expirationDate?: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number; // Flexible duration length
  requiresFulfillment?: boolean; // If true, requires admin physical handover
  externalBarcode?: string; // Admin can set this for merchant integration
  hallPassIncrease?: number; // Added: specific effect for "Buy Hall Pass" items
}

export type EventType = 'special' | 'no_school' | 'break' | 'custom' | 'default';

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  title: string;
  eventType: EventType;
  pointMultiplier?: number;
  bonusPoints?: number;
  overridePoints?: number; // Allows setting exact points for a day
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // Array of student IDs
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdAt: string;
  expiresAt: string;
  active: boolean;
  createdBy: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  expiresAt: string;
  active: boolean;
  createdBy: string;
}

export interface TimeLockout {
  id: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  label: string;
}

export interface BuddyConflict {
  id: string;
  studentIds: string[]; // Pair of IDs
  reason: string;
}

// Added CloudConfig interface to resolve import error in firebase.ts
export interface CloudConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface AppState {
  currentUser: Student | Admin | null;
  students: Student[];
  admins: Admin[];
  storeItems: StoreItem[];
  calendarEvents: CalendarEvent[];
  groups: Group[];
  hallPasses: HallPassRecord[];
  polls: Poll[];
  announcements: Announcement[];
  hallPassLockouts: TimeLockout[];
  hallPassConflicts: BuddyConflict[];
}
