
import { CalendarEvent } from "../types";

export const getDayPoints = (dateStr: string, events: CalendarEvent[]): { points: number; reason: string; type?: string } => {
  // Fix: Parse YYYY-MM-DD manually to create a local date object. 
  // Standard new Date(dateStr) creates UTC, which can shift the day based on timezone.
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d); 
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  
  // Check for special events first
  const specialEvent = events.find(e => e.date === dateStr);
  
  // 1. Check for No School or Breaks (Overrides everything)
  if (specialEvent) {
    if (specialEvent.eventType === 'no_school') {
      return { points: 0, reason: specialEvent.title || "No School", type: 'no_school' };
    }
    if (specialEvent.eventType === 'break') {
      return { points: 0, reason: specialEvent.title || "Holiday Break", type: 'break' };
    }
    
    // 2. Manual Override (Custom Points)
    if (specialEvent.overridePoints !== undefined) {
      return { 
        points: specialEvent.overridePoints, 
        reason: specialEvent.title || "Manual Adjustment",
        type: 'custom'
      };
    }

    // 3. Special Event Bonus Logic (e.g. Spirit Day)
    if (specialEvent.eventType === 'special' || specialEvent.bonusPoints) {
      const base = 5; // Base for special day if not specified
      const total = (base + (specialEvent.bonusPoints || 0)) * (specialEvent.pointMultiplier || 1);
      return { points: total, reason: `Special Event: ${specialEvent.title}`, type: 'special' };
    }
  }

  // 4. Standard Logic
  // No school on weekends (Saturday & Sunday)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { points: 0, reason: "No School", type: 'weekend' };
  }
  
  // Mon (1) = 2 points
  if (dayOfWeek === 1) return { points: 2, reason: "Motivation Monday", type: 'standard_low' };
  
  // Fri (5) = 5 points
  if (dayOfWeek === 5) return { points: 5, reason: "Focus Friday", type: 'standard_high' };
  
  // Tue(2), Wed(3), Thu(4) = 1 point
  if (dayOfWeek >= 2 && dayOfWeek <= 4) return { points: 1, reason: "Daily Attendance", type: 'standard_low' };
  
  return { points: 0, reason: "No School", type: 'none' };
};