import React from 'react';
import { auth } from '../firebaseClient';
import type { Achievement } from '../types';
import { StarIcon, BookOpenIcon, ZapIcon, EditIcon } from './icons/Icons';
import { useToast } from './Toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const achievementsData: Achievement[] = [
  { id: 1, name: 'First Focus', icon: 'zap' },
  { id: 2, name: '7-Day Streak', icon: 'star' },
  { id: 3, name: '100 Hours Studied', icon: 'book' },
  { id: 4, name: 'Task Master', icon: 'zap' },
  { id: 5, name: 'Night Owl', icon: 'star' },
];

const COLORS = ['#0070f3', '#8a2be2', '#32cd32', '#ff0000'];

interface ProfileStats {
  totalHours: string;
  tasksDone: number;
  currentStreak: number;
  maxStreak: number;
  friendsCount: number;
  subjectData: { name: string; value: number }[];
}

const AchievementBadge: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
  const Icon = { star: StarIcon, book: BookOpenIcon, zap: ZapIcon }[achievement.icon] || StarIcon;
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900 border-4 border-black dark:border-white rounded-lg text-center shadow-hard dark:shadow-hard-dark">
      <Icon className="w-12 h-12 text-neon-purple mb-2" />
      <p className="font-grotesk font-bold">{achievement.name}</p>
    </div>
  );
};

const ProfileView: React.FC = () => {
  const [stats, setStats] = React.useState<ProfileStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const user = auth.currentUser;
  const { showToast } = useToast();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Student';
  const userAvatar = user?.photoURL || `https://ui-avatars.com/api/?name=${userName}`;
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  const fetchProfileStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/stats/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch profile stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/user/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: user.displayName || user.email?.split('@')[0] || 'Unknown User',
          avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'U'}`
        })
      });
      if (res.ok) {
        showToast('Profile synced!', 'success');
        fetchProfileStats();
      } else {
        showToast('Sync failed', 'error');
      }
    } catch (err) {
      showToast('Something went wrong', 'error');
    }
  };

  React.useEffect(() => {
    fetchProfileStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-black dark:border-white border-t-neon-purple rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark flex flex-col md:flex-row items-center gap-6">
        <img src={userAvatar} alt="User Avatar" className="w-32 h-32 rounded-full border-4 border-black dark:border-white object-cover" />
        <div className="flex-grow text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <h1 className="text-4xl font-grotesk font-bold">{userName}</h1>
            <span className="px-3 py-1 bg-yellow-400 text-black font-bold text-sm border-2 border-black rounded-md">
              LVL {Math.floor((stats?.tasksDone || 0) / 5) + 1}
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Ready to focus and achieve.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleManualSync}
            className="flex-shrink-0 flex items-center gap-2 p-3 bg-neon-purple text-white font-grotesk font-bold border-2 border-black dark:border-white rounded-md shadow-hard-sm dark:shadow-hard-sm-dark hover:-translate-y-0.5 transform transition"
          >
            <ZapIcon className="w-5 h-5" />
            Sync Profile
          </button>
          <button className="flex-shrink-0 flex items-center gap-2 p-3 bg-white dark:bg-gray-700 text-black dark:text-white font-grotesk font-bold border-2 border-black dark:border-white rounded-md shadow-hard-sm dark:shadow-hard-sm-dark hover:-translate-y-0.5 transform transition">
            <EditIcon className="w-5 h-5" />
            Edit Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark space-y-4">
            <h3 className="font-grotesk text-2xl font-bold">All-Time Stats</h3>
            <div className="space-y-2 font-mono text-xl">
              <p>Total Hours: <span className="font-bold text-electric-blue">{stats?.totalHours || 0}</span></p>
              <p>Max Streak: <span className="font-bold text-bright-red">{stats?.maxStreak || 0} days</span></p>
              <p>Tasks Done: <span className="font-bold text-acid-green">{stats?.tasksDone || 0}</span></p>
            </div>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
            <h3 className="font-grotesk text-2xl font-bold mb-4">Social</h3>
            <div className="space-y-2 font-mono text-xl">
              <p>Friends: <span className="font-bold">{stats?.friendsCount || 0}</span></p>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
          <h3 className="font-grotesk text-2xl font-bold mb-4">Study Analytics</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie data={stats?.subjectData || []} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {stats?.subjectData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: document.documentElement.classList.contains('dark') ? '#333' : '#fff', border: '2px solid black' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
          <h3 className="font-grotesk text-2xl font-bold mb-4">Achievements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {achievementsData.map(ach => <AchievementBadge key={ach.id} achievement={ach} />)}
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
          <h3 className="font-grotesk text-2xl font-bold mb-4">Recent Activity</h3>
          <ul className="space-y-2">
            <li className="p-2 border-b-2 border-gray-200 dark:border-gray-700">Ready to conquer FocusForge.</li>
            <li className="p-2 border-b-2 border-gray-200 dark:border-gray-700">Completed multiple focus sessions.</li>
            <li className="p-2">Started your study journey.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
