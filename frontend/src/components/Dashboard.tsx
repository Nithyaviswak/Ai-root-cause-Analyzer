'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

const MOCK_LINE_DATA = [
  { time: '09:00', incidents: 2 },
  { time: '10:00', incidents: 5 },
  { time: '11:00', incidents: 3 },
  { time: '12:00', incidents: 8 },
  { time: '13:00', incidents: 4 },
  { time: '14:00', incidents: 6 },
  { time: '15:00', incidents: 12 },
  { time: '16:00', incidents: 7 },
];

const MOCK_PIE_DATA = [
  { name: 'Database', value: 400, color: '#3b82f6' },
  { name: 'Auth', value: 300, color: '#6366f1' },
  { name: 'API Gateway', value: 300, color: '#10b981' },
  { name: 'Storage', value: 200, color: '#f59e0b' },
];

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 gap-6 p-2 lg:grid-cols-2">
      <div className="rounded-[32px] border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Incident Frequency (24h)
        </h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MOCK_LINE_DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 600}} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 600}} 
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  backdropFilter: 'blur(8px)',
                  background: 'rgba(255,255,255,0.8)'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="incidents" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{fill: '#3b82f6', r: 4}} 
                activeDot={{r: 6, strokeWidth: 0}}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Root Cause Distribution
        </h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={MOCK_PIE_DATA}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {MOCK_PIE_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  backdropFilter: 'blur(8px)',
                  background: 'rgba(255,255,255,0.8)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
