import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowRightIcon } from './icons/Icons';
import { auth } from '../firebaseClient';

interface DashboardProps {
  setView: (view: 'focus' | 'tasks' | 'community' | 'friends' | 'profile' | 'dashboard') => void;
}

const motivationalQuotes = [
  "The secret of getting ahead is getting started.",
  "Don't watch the clock; do what it does. Keep going.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "The expert in anything was once a beginner."
];

interface Stats {
  todayHours: string;
  weeklyData: { name: string; hours: number }[];
  streak: number;
  points: number;
  isVerifiedSolver: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const quote = React.useMemo(() => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)], []);
  const user = auth.currentUser;
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Student';

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  React.useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE_URL}/stats/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch dash stats:", err);
      }
    };
    fetchStats();
  }, [user]);

  const formatTime = (decimalHours: string) => {
    const totalMinutes = Math.floor(parseFloat(decimalHours) * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-4xl md:text-5xl font-grotesk font-bold">Welcome back, {userName}!</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">Ready to conquer your goals today?</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
            <h2 className="font-grotesk text-xl font-bold">Study Time Today</h2>
            <p className="font-mono text-7xl font-bold text-electric-blue my-4">
              {stats ? formatTime(stats.todayHours) : '0:00'}
            </p>
            <p className="text-sm text-gray-500">hours</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
            <h2 className="font-grotesk text-xl font-bold">Current Streak</h2>
            <p className="font-mono text-7xl font-bold text-bright-red my-4">
              {stats?.streak || 0}
            </p>
            <p className="text-sm text-gray-500">days in a row</p>
          </div>
          <div className="p-6 bg-neon-purple text-white border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark flex flex-col justify-between">
            <div>
              <h2 className="font-grotesk text-xl font-bold">Doubt Points</h2>
              <p className="font-mono text-5xl font-bold my-2">
                {stats?.points || 0}
              </p>
              {stats?.isVerifiedSolver && (
                <span className="inline-block p-1 bg-acid-green text-black text-xs font-bold rounded mt-2 border-2 border-black">VERIFIED SOLVER</span>
              )}
            </div>
          </div>
        </div>
        <div className="p-6 bg-neon-purple text-white border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark flex flex-col justify-center items-center">
          <h2 className="font-grotesk text-xl font-bold text-center mb-4">Quick Start</h2>
          <button
            onClick={() => setView('focus')}
            className="w-full bg-white dark:bg-gray-200 text-neon-purple font-grotesk font-bold text-2xl p-4 border-4 border-black dark:border-white rounded-lg transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-300 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] dark:hover:shadow-[6px_6px_0px_#FFF] active:translate-y-0 active:shadow-hard dark:active:shadow-hard-dark"
          >
            FOCUS NOW
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
          <h2 className="font-grotesk text-2xl font-bold mb-4">Weekly Progress</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.weeklyData || []} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={document.documentElement.classList.contains('dark') ? '#4A4A4A' : '#E0E0E0'} />
                <XAxis dataKey="name" tick={{ fill: document.documentElement.classList.contains('dark') ? 'white' : 'black', fontFamily: 'Space Grotesk' }} />
                <YAxis tick={{ fill: document.documentElement.classList.contains('dark') ? 'white' : 'black', fontFamily: 'Space Grotesk' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: document.documentElement.classList.contains('dark') ? '#18181b' : '#f5f5f5',
                    border: `2px solid ${document.documentElement.classList.contains('dark') ? 'white' : 'black'}`,
                    fontFamily: 'Inter'
                  }}
                  cursor={{ fill: 'rgba(0, 112, 243, 0.2)' }}
                />
                <Bar dataKey="hours" fill="#0070f3" barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="p-6 bg-acid-green text-black border-4 border-black rounded-lg shadow-hard flex flex-col justify-between">
          <div>
            <h2 className="font-grotesk text-2xl font-bold">Quote of the Day</h2>
            <p className="text-xl mt-4 font-medium italic">"{quote}"</p>
          </div>
          <button onClick={() => setView('tasks')} className="mt-6 self-start flex items-center gap-2 font-grotesk font-bold text-lg p-3 bg-white dark:bg-gray-700 border-2 border-black dark:border-white rounded-md shadow-hard-sm dark:shadow-hard-sm-dark hover:-translate-y-0.5 transform transition">
            My Tasks <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
