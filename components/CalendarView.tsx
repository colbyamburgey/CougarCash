import React, { useState } from 'react';
import { CalendarEvent } from '../types';
import { getDayPoints } from '../utils/points';

interface CalendarViewProps {
  events: CalendarEvent[];
  onDateClick?: (date: string) => void;
  selectedDates?: string[];
}

interface DayData {
  day: number;
  dateStr: string;
  points: number;
  reason: string;
  eventType: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ events, onDateClick, selectedDates = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewingDay, setViewingDay] = useState<DayData | null>(null);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Today for comparison
  const today = new Date();
  today.setHours(0,0,0,0);

  // Generate calendar grid
  const days: (DayData | null)[] = [];
  // Empty cells for padding
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  // Actual days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const { points, reason, type } = getDayPoints(dateStr, events);
    const event = events.find(e => e.date === dateStr);
    
    days.push({
      day: i,
      dateStr,
      points,
      reason,
      eventType: event?.eventType || type || 'standard'
    });
  }

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  return (
    <div className="p-4 pb-24 bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="mb-6 flex justify-between items-end">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">School Calendar</h2>
           <p className="text-slate-500 text-sm">Plan your attendance streak!</p>
        </div>
        <div className="text-right text-xs font-bold text-[#0040ba] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Today is {today.toLocaleDateString()}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-[#0040ba]/10 border-b border-[#0040ba]/20 flex justify-between items-center">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-full text-[#0040ba]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h3 className="font-bold text-lg text-[#0040ba]">{monthName} {year}</h3>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-full text-[#0040ba]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 border-b border-slate-100 bg-slate-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((d, idx) => {
            const isSelected = d && selectedDates.includes(d.dateStr);
            
            // Date logic
            let isPast = false;
            let isToday = false;
            
            if (d) {
                // Parse correctly using local time components
                const [y, m, da] = d.dateStr.split('-').map(Number);
                const cellDate = new Date(y, m-1, da);
                isPast = cellDate < today;
                isToday = cellDate.getTime() === today.getTime();
            }
            
            return (
              <div 
                key={idx} 
                onClick={() => {
                   if (!d) return;
                   if (onDateClick) {
                      onDateClick(d.dateStr);
                   } else {
                      setViewingDay(d);
                   }
                }}
                className={`min-h-[80px] p-1 border-b border-r border-slate-50 relative flex flex-col items-center justify-start pt-2 transition-all
                  ${!d ? 'bg-slate-50/50' : ''} 
                  ${d ? 'cursor-pointer' : ''}
                  ${isSelected ? 'bg-[#0040ba]/10 ring-2 ring-inset ring-[#0040ba] z-10' : ''}
                  ${isToday ? 'bg-blue-50 ring-2 ring-inset ring-[#0040ba] z-20 shadow-lg' : ''}
                  ${isPast && !isSelected && !isToday ? 'opacity-50 grayscale-[0.5]' : ''}
                  ${!isSelected && !isToday && !isPast && d?.eventType === 'no_school' ? 'bg-red-50 hover:bg-red-100' : ''}
                  ${!isSelected && !isToday && !isPast && d?.eventType === 'break' ? 'bg-teal-50 hover:bg-teal-100' : ''}
                  ${!isSelected && !isToday && !isPast && d?.eventType === 'weekend' ? 'bg-slate-100 text-slate-400' : ''}
                  ${!isSelected && !isToday && !isPast && d?.eventType !== 'no_school' && d?.eventType !== 'break' && d?.eventType !== 'weekend' && d ? 'hover:bg-blue-50' : ''}
                `}
              >
                {d && (
                  <>
                    <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-0.5 transition-all
                      ${isSelected ? 'bg-[#0040ba] text-white' : 
                        isToday ? 'bg-[#0040ba] text-white font-bold scale-110 shadow-sm' :
                        d.eventType === 'no_school' ? 'text-red-400' : 
                        d.eventType === 'break' ? 'text-teal-600' :
                        d.eventType === 'weekend' ? 'text-slate-400' :
                        d.eventType === 'special' ? 'bg-yellow-100 text-yellow-700' : 'text-slate-700'}
                    `}>
                      {d.day}
                    </span>
                    
                    {isToday && <span className="text-[9px] text-[#0040ba] font-bold uppercase tracking-tighter leading-none mb-1">Today</span>}

                    {d.points > 0 && (
                      <div className={`mt-0 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        d.points >= 5 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        +{d.points}
                      </div>
                    )}

                    {d.eventType === 'no_school' && (
                       <div className="mt-1 text-[9px] text-red-500 font-bold leading-tight text-center px-1">NO SCHOOL</div>
                    )}

                    {d.eventType === 'break' && (
                       <div className="mt-1 text-[9px] text-teal-600 font-bold leading-tight text-center px-1">BREAK</div>
                    )}
                    
                    {d.eventType === 'weekend' && (
                       <div className="mt-1 text-[9px] text-slate-400 font-bold leading-tight text-center px-1">OFF</div>
                    )}

                    {d.eventType === 'special' && (
                       <div className="absolute top-1 right-1">
                          <span className="text-yellow-500 text-xs">★</span>
                       </div>
                    )}

                    {isSelected && (
                       <div className="absolute top-1 right-1">
                          <svg className="w-4 h-4 text-[#0040ba] fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                       </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Legend</h4>
        <div className="flex gap-4 text-sm flex-wrap">
           <div className="flex items-center gap-2">
             <span className="w-3 h-3 bg-[#0040ba] rounded-full ring-2 ring-offset-1 ring-[#0040ba]"></span>
             <span className="text-slate-600 font-bold">Today</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="w-3 h-3 bg-green-100 rounded-full border border-green-200"></span>
             <span className="text-slate-600">High Value (5+)</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="w-3 h-3 bg-blue-50 rounded-full border border-blue-200"></span>
             <span className="text-slate-600">Standard</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="w-3 h-3 bg-red-100 rounded-full border border-red-200"></span>
             <span className="text-slate-600">No School</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="w-3 h-3 bg-gray-300 rounded-full opacity-50"></span>
             <span className="text-slate-400 italic">Past Date</span>
           </div>
        </div>
      </div>

      {viewingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setViewingDay(null)}>
           <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {new Date(viewingDay.dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h3>
                    <p className="text-slate-500 font-medium">{viewingDay.eventType === 'no_school' ? 'No School Day' : viewingDay.eventType === 'break' ? 'Holiday Break' : 'School Day'}</p>
                 </div>
                 <button onClick={() => setViewingDay(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 text-center mb-6">
                 {viewingDay.points > 0 ? (
                    <>
                       <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Points Available</div>
                       <div className={`text-5xl font-extrabold ${viewingDay.points >= 5 ? 'text-green-600' : 'text-[#0040ba]'}`}>
                         +{viewingDay.points}
                       </div>
                    </>
                 ) : (
                    <div className="text-slate-400 font-bold text-lg">No Points Available</div>
                 )}
              </div>

              <div>
                 <h4 className="font-bold text-slate-800 mb-2">Event Details</h4>
                 <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                       viewingDay.eventType === 'special' ? 'bg-yellow-100 text-yellow-600' : 
                       viewingDay.points > 0 ? 'bg-blue-50 text-[#0040ba]' : 'bg-slate-100 text-slate-400'
                    }`}>
                       {viewingDay.eventType === 'special' ? '★' : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       )}
                    </div>
                    <div>
                       <p className="font-bold text-slate-800">{viewingDay.reason}</p>
                       <p className="text-xs text-slate-500 mt-1">
                          {viewingDay.eventType === 'special' ? 'This is a special event day! Don\'t miss out.' : 
                           viewingDay.points >= 5 ? 'High value attendance day.' : 
                           viewingDay.points > 0 ? 'Standard attendance day.' : 'Enjoy your day off!'}
                       </p>
                    </div>
                 </div>
              </div>

              <button onClick={() => setViewingDay(null)} className="w-full mt-6 py-3 bg-[#0040ba] text-white font-bold rounded-xl shadow-lg hover:bg-blue-800 transition-colors">
                 Close
              </button>
           </div>
        </div>
      )}
    </div>
  );
};