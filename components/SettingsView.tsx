
import React, { useState } from 'react';
import type { Theme } from '../types';
// FIX: Import TimerIcon to resolve reference error.
import { SunIcon, MoonIcon, ProfileIcon, PaletteIcon, BellIcon, ShieldCheckIcon, BeakerIcon, TimerIcon, MusicIcon } from './icons/Icons';
import { auth } from '../firebaseClient';
import { musicApi, DPDXProfile } from '../lib/musicApi';
import { useToast } from './Toast';

interface SettingsViewProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

type SettingsTab = 'account' | 'personalization' | 'study' | 'notifications' | 'privacy' | 'experimental';

const SettingsView: React.FC<SettingsViewProps> = ({ theme, setTheme }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('personalization');
  const { showToast } = useToast();

  const BrutalistInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
      <label className="block font-bold mb-1 font-grotesk">{label}</label>
      <input {...props} className="w-full p-3 text-lg bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg focus:outline-none focus:ring-4 focus:ring-electric-blue" />
    </div>
  );

  const BrutalistToggle: React.FC<{ label: string; defaultChecked?: boolean }> = ({ label, defaultChecked = true }) => {
    const [isOn, setIsOn] = useState(defaultChecked);
    return (
      <div className="flex items-center justify-between p-3 border-2 border-black dark:border-white rounded-md">
        <span className="text-lg font-medium">{label}</span>
        <button onClick={() => setIsOn(!isOn)} className={`w-16 h-8 flex items-center border-4 border-black dark:border-white rounded-md transition-colors ${isOn ? 'bg-acid-green' : 'bg-gray-300 dark:bg-gray-600'}`}>
          <span className={`block w-6 h-6 bg-white dark:bg-gray-300 rounded-sm transform transition-transform ${isOn ? 'translate-x-8' : 'translate-x-1'}`} />
        </button>
      </div>
    );
  };

  const themes: { id: Theme, name: string, bg: string, accent: string }[] = [
    { id: 'expressive-white', name: 'Expressive White', bg: 'bg-light-bg', accent: 'bg-electric-blue' },
    { id: 'midnight', name: 'Midnight', bg: 'bg-midnight-bg', accent: 'bg-neon-purple' },
    { id: 'dark-forest', name: 'Dark Forest', bg: 'bg-forest-bg', accent: 'bg-acid-green' },
    { id: 'minimalist', name: 'Minimalist', bg: 'bg-minimalist-bg', accent: 'bg-gray-500' },
  ];

  const tabs = [
    { id: 'account', label: 'Account', icon: ProfileIcon },
    { id: 'personalization', label: 'Personalization', icon: PaletteIcon },
    { id: 'study', label: 'Study', icon: TimerIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'privacy', label: 'Privacy', icon: ShieldCheckIcon },
    { id: 'experimental', label: 'Experimental', icon: BeakerIcon },
  ];

  const user = auth.currentUser;
  const [dpdxAccessKey, setDpdxAccessKey] = useState<string | null>(localStorage.getItem('dpdx_access_key'));
  const [dpdxProfile, setDpdxProfile] = useState<DPDXProfile | null>(null);
  const [linkingToken, setLinkingToken] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  React.useEffect(() => {
    if (dpdxAccessKey) {
      musicApi.getUserProfile(dpdxAccessKey)
        .then(setDpdxProfile)
        .catch(() => {
          setDpdxAccessKey(null);
          localStorage.removeItem('dpdx_access_key');
        });
    }
  }, [dpdxAccessKey]);

  const handleLinkDPDX = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLinking(true);
    try {
      const key = await musicApi.confirmLink(linkingToken);
      setDpdxAccessKey(key);
      localStorage.setItem('dpdx_access_key', key);
      setLinkingToken('');

      // Persist to backend
      const user = auth.currentUser;
      if (user) {
        const authToken = await user.getIdToken();
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
        await fetch(`${API_BASE_URL}/user/music-key`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ key })
        });
      }

      showToast('DPDX account linked!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not link account', 'error');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkDPDX = async () => {
    localStorage.removeItem('dpdx_access_key');
    setDpdxAccessKey(null);
    setDpdxProfile(null);

    // Remove from backend
    const user = auth.currentUser;
    if (user) {
      try {
        const authToken = await user.getIdToken();
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
        await fetch(`${API_BASE_URL}/user/music-key`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ key: null })
        });
      } catch (e) {
        console.error('Failed to unlink backend', e);
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'account': return (
        <div className="space-y-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-grotesk">Account Settings</h2>
            <BrutalistInput label="Display Name" defaultValue={user?.displayName || ''} readOnly />
            <BrutalistInput label="Email Address" type="email" defaultValue={user?.email || ''} readOnly />
            <p className="text-sm text-gray-500 font-bold">Account information is managed via your linked authentication provider.</p>
          </div>

          <hr className="border-2 border-black dark:border-white" />

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <MusicIcon className="w-8 h-8 text-electric-blue" />
              <h2 className="text-2xl font-bold font-grotesk">DPDX Music</h2>
            </div>

            {dpdxAccessKey ? (
              <div className="p-4 border-4 border-black dark:border-white rounded-lg bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg">{dpdxProfile?.name || 'Linked Account'}</p>
                  <p className="text-sm text-gray-500">Status: <span className="text-acid-green font-bold">CONNECTED</span></p>
                </div>
                <button
                  onClick={handleUnlinkDPDX}
                  className="px-4 py-2 bg-bright-red text-white font-bold border-2 border-black rounded-md shadow-hard-sm"
                >
                  Unlink
                </button>
              </div>
            ) : (
              <form onSubmit={handleLinkDPDX} className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">Link your DPDX account to enable high-quality music streaming in the Music tab.</p>
                <BrutalistInput
                  label="Temporary Linking Token"
                  placeholder="ABCD-1234"
                  value={linkingToken}
                  onChange={(e) => setLinkingToken(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={isLinking}
                  className="w-full p-3 bg-electric-blue text-white font-bold border-2 border-black rounded-md shadow-hard-sm hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {isLinking ? 'Linking...' : 'Link DPDX Account'}
                </button>
                <p className="text-sm text-gray-500">Get your token at <a href="https://music.dpdx.in" target="_blank" rel="noreferrer" className="text-electric-blue underline">music.dpdx.in</a></p>
              </form>
            )}
          </div>

          <hr className="border-2 border-black dark:border-white" />

          <div className="pt-4">
            <button className="p-3 bg-bright-red text-white font-grotesk font-bold border-2 border-black dark:border-white rounded-md shadow-hard-sm opacity-50 cursor-not-allowed">Delete Account</button>
          </div>
        </div>
      );
      case 'personalization': return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-grotesk">Theme Selection</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {themes.map(t => (
              <button key={t.id} onClick={() => setTheme(t.id)} className={`p-4 border-4 rounded-lg shadow-hard dark:shadow-hard-dark ${theme === t.id ? 'border-electric-blue' : 'border-black dark:border-white'}`}>
                <div className={`w-full h-16 rounded-md flex items-end p-2 ${t.bg}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded ${t.accent}`}></div>
                    <div className={`w-12 h-4 rounded ${t.accent} opacity-70`}></div>
                  </div>
                </div>
                <p className="mt-2 font-bold font-grotesk">{t.name}</p>
              </button>
            ))}
          </div>
          <h2 className="text-2xl font-bold font-grotesk mt-4">Interface</h2>
          <BrutalistToggle label="Toggle Animations" defaultChecked={true} />
        </div>
      );
      case 'study': return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-grotesk">Focus Settings</h2>
          <BrutalistInput label="Pomodoro Duration (minutes)" type="number" defaultValue="25" />
          <BrutalistInput label="Break Duration (minutes)" type="number" defaultValue="5" />
          <BrutalistToggle label="Auto-start Breaks" defaultChecked={true} />
        </div>
      );
      case 'notifications': return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-grotesk">Notifications</h2>
          <BrutalistToggle label="Study Reminders" defaultChecked={true} />
          <BrutalistToggle label="Friend Activity Alerts" defaultChecked={true} />
          <BrutalistToggle label="Community Replies" defaultChecked={false} />
          <BrutalistToggle label="Email Notifications" defaultChecked={true} />
        </div>
      );
      case 'privacy': return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-grotesk">Privacy</h2>
          <BrutalistToggle label="Public Profile" defaultChecked={true} />
          <BrutalistToggle label="Show Online Status" defaultChecked={true} />
          <BrutalistToggle label="Show Study Stats" defaultChecked={true} />
        </div>
      );
      case 'experimental': return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-grotesk">Experimental Features</h2>
          <BrutalistToggle label="Enable AI Assistant" defaultChecked={false} />
          <BrutalistToggle label="Test New UI" defaultChecked={false} />
        </div>
      );
      default: return null;
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl md:text-5xl font-grotesk font-bold">Settings</h1>
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="md:w-1/3 lg:w-1/4">
          <nav className="flex flex-row md:flex-col gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`w-full flex items-center gap-3 p-3 text-left font-bold font-grotesk text-lg border-4 rounded-lg transition-all ${activeTab === tab.id ? 'bg-electric-blue text-white border-black dark:border-white shadow-hard dark:shadow-hard-dark' : 'bg-white dark:bg-gray-800 border-transparent hover:border-black dark:hover:border-white'}`}
              >
                <tab.icon className="w-6 h-6" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>
        <div className="flex-1 p-6 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark min-h-[400px]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
