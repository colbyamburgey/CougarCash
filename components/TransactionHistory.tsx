
import React from 'react';
import { Student } from '../types';

interface TransactionHistoryProps {
  student: Student;
  onBack: () => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ student, onBack }) => {
  // Combine attendance and purchases into one sorted list
  const history = [
    ...student.attendanceHistory.map(a => ({
      type: 'earn',
      date: a.date, // YYYY-MM-DD
      title: a.reason || 'Attendance Reward',
      amount: a.pointsAwarded / 10,
      details: a.present ? 'Present' : 'Absent'
    })),
    ...student.purchaseHistory.map(p => ({
      type: 'spend',
      date: p.date.split('T')[0], // YYYY-MM-DD
      timestamp: p.date,
      title: p.itemName,
      amount: p.cost / 10,
      details: p.category
    }))
  ].sort((a, b) => {
    // Sort descending
    const dateA = new Date((a as any).timestamp || a.date).getTime();
    const dateB = new Date((b as any).timestamp || b.date).getTime();
    return dateB - dateA;
  });

  const totalEarned = history.filter(h => h.type === 'earn').reduce((acc, h) => acc + h.amount, 0);
  const totalSpent = history.filter(h => h.type === 'spend').reduce((acc, h) => acc + h.amount, 0);

  return (
    <div className="p-4 pb-24 min-h-screen bg-white">
      <div className="flex items-center gap-4 mb-6 sticky top-0 bg-white/95 backdrop-blur py-2 border-b border-slate-100 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-xl font-bold text-slate-800">Transaction History</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Total Earned</p>
              <p className="text-xl font-black text-green-700">${totalEarned.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Total Spent</p>
              <p className="text-xl font-black text-red-700">${totalSpent.toFixed(2)}</p>
          </div>
      </div>

      <div className="space-y-4">
        {history.length === 0 ? (
          <p className="text-center text-slate-500 py-10 italic">No transactions found.</p>
        ) : (
          history.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 shadow-sm bg-white hover:border-blue-100 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  item.type === 'earn' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {item.type === 'earn' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 leading-tight">{item.title}</h3>
                  <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">{item.date} • {item.details}</p>
                </div>
              </div>
              <span className={`font-black text-lg ${item.type === 'earn' ? 'text-green-600' : 'text-slate-900'}`}>
                {item.type === 'earn' ? '+' : '-'}${item.amount.toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
