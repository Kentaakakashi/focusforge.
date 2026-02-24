
import React, { useState, useEffect } from 'react';
import { DashboardIcon, TimerIcon, TasksIcon, CommunityIcon, FriendsIcon, ProfileIcon, MusicIcon, SettingsIcon, AdminIcon, LogoutIcon, ChatIcon, BookOpenIcon, SparklesIcon } from './components/icons/Icons';
import Dashboard from './components/Dashboard';
import FocusView from './components/FocusView';
import TasksView from './components/TasksView';
import CommunityView from './components/CommunityView';
import SocialView from './components/SocialView';
import ProfileView from './components/ProfileView';
import MusicHub from './components/MusicHub';
import SettingsView from './components/SettingsView';
import AdminView from './components/AdminView';
import PublicContainer from './components/PublicContainer';
import ChatView from './components/ChatView';
import GroupDetailView from './components/GroupDetailView';
import type { Theme, StudyGroup } from './types';
import DoubtsView from './components/DoubtsView';
import AiChatView from './components/AiChatView';
import VaultView from './components/VaultView';
import GatekeeperScreen from './components/GatekeeperScreen';
import BannedScreen from './components/BannedScreen';
import PersistentPlayer from './components/PersistentPlayer';
import { MusicProvider, useMusic } from './components/MusicContext';
import { ToastProvider } from './components/Toast';
import { auth } from './firebaseClient';
import { onAuthStateChanged, signOut, type User, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

type View = 'dashboard' | 'focus' | 'tasks' | 'community' | 'social' | 'profile' | 'music' | 'settings' | 'admin' | 'chat' | 'doubts' | 'library' | 'vault' | 'ai-tutor';

const SidebarPlayer: React.FC = () => {
  const { activeSong, isPlaying, togglePlay, skipNext, skipPrev } = useMusic();
  if (!activeSong) return null;

  return (
    <div className="border-4 border-black dark:border-white rounded-lg bg-black text-white overflow-hidden shadow-hard-sm">
      {/* Cover + Info */}
      <div className="flex items-center gap-3 p-3">
        <img
          src={activeSong.coverUrl || `https://picsum.photos/seed/${activeSong.id}/48/48`}
          alt={activeSong.title}
          className="w-10 h-10 lg:w-12 lg:h-12 border-2 border-white flex-shrink-0 object-cover"
        />
        <div className="min-w-0 lg:block hidden">
          <p className="text-sm font-black truncate leading-tight">{activeSong.title}</p>
          <p className="text-[10px] text-acid-green font-mono uppercase truncate">{activeSong.artist}</p>
        </div>
      </div>
      {/* Controls */}
      <div className="flex items-center justify-center gap-2 px-3 pb-3">
        <button onClick={skipPrev} className="p-1.5 hover:text-electric-blue transition-colors" title="Previous">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
        </button>
        <button
          onClick={togglePlay}
          className="p-2 bg-acid-green text-black border-2 border-white rounded-md hover:bg-green-400 transition-all"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <button onClick={skipNext} className="p-1.5 hover:text-acid-green transition-colors" title="Next">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [registrationStatus, setRegistrationStatus] = useState<string>('active');
  const navigate = useNavigate();
  const location = useLocation();
  const [activeGroup, setActiveGroup] = useState<StudyGroup | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'midnight';
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async nextUser => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const token = await nextUser.getIdToken();
          const res = await fetch(`${API_BASE_URL}/user/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: nextUser.displayName || nextUser.email?.split('@')[0] || 'Unknown User',
              avatar: nextUser.photoURL || `https://ui-avatars.com/api/?name=${nextUser.displayName || 'U'}`
            })
          });
          const data = await res.json();
          setIsVerified(data.isVerified);
          setIsAdmin(data.isAdmin);
          setRegistrationStatus(data.registrationStatus || 'active');
          if (data.dpdxAccessKey) {
            localStorage.setItem('dpdx_access_key', data.dpdxAccessKey);
          }
        } catch (err) {
          console.error("Sync error:", err);
        }
      }
      setIsLoadingAuth(false);
    });

    // Handle Magic Link sign-in
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            // Remove the finishSignIn parameter from the URL
            window.history.replaceState({}, '', window.location.origin);
          })
          .catch((error) => {
            console.error('Magic link sign-in error:', error);
          });
      }
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;

    const bodyClasses = body.className.split(' ');
    const persistentClasses = bodyClasses.filter(c => !c.startsWith('bg-') && !c.startsWith('text-'));
    body.className = persistentClasses.join(' ');

    root.classList.remove('dark');

    localStorage.setItem('theme', theme);

    switch (theme) {
      case 'midnight':
        root.classList.add('dark');
        body.classList.add('bg-midnight-bg', 'text-gray-200');
        break;
      case 'dark-forest':
        root.classList.add('dark');
        body.classList.add('bg-forest-bg', 'text-gray-200');
        break;
      case 'minimalist':
        root.classList.add('dark');
        body.classList.add('bg-minimalist-bg', 'text-gray-300');
        break;
      case 'expressive-white':
      default:
        body.classList.add('bg-light-bg', 'text-black');
        break;
    }

  }, [theme]);

  if (isLoadingAuth) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center font-grotesk">
        <div className="space-y-4 text-center">
          <div className="w-20 h-20 border-8 border-acid-green border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white font-black tracking-[0.5em] uppercase text-[10px] animate-pulse font-mono">Connecting_Core...</p>
        </div>
      </div>
    );
  }

  if (user && registrationStatus === 'banned') {
    return <BannedScreen />;
  }

  if (user && (registrationStatus === 'pending' || registrationStatus === 'waitlisted')) {
    return <GatekeeperScreen status={registrationStatus as any} />;
  }

  if (!user) {
    return <PublicContainer />;
  }
  const renderContent = () => {
    if (activeGroup) {
      return <GroupDetailView group={activeGroup} onBack={() => setActiveGroup(null)} />;
    }

    return (
      <Routes>
        <Route path="/" element={<Dashboard setView={(v) => navigate(`/${v}`)} />} />
        <Route path="/dashboard" element={<Dashboard setView={(v) => navigate(`/${v}`)} />} />
        <Route path="/focus" element={<FocusView />} />
        <Route path="/tasks" element={<TasksView />} />
        <Route path="/chat" element={<ChatView isAdmin={isAdmin} />} />
        <Route path="/community" element={<CommunityView />} />
        <Route path="/social" element={<SocialView setActiveGroup={setActiveGroup} />} />
        <Route path="/profile" element={<ProfileView />} />
        <Route path="/music" element={<MusicHub />} />
        <Route path="/settings" element={<SettingsView theme={theme} setTheme={setTheme} />} />
        <Route path="/doubts" element={<DoubtsView />} />
        <Route path="/ai-tutor" element={<AiChatView />} />
        <Route path="/admin" element={<AdminView />} />
        <Route path="/vault" element={<VaultView />} />
        <Route path="*" element={<Dashboard setView={(v) => navigate(`/${v}`)} />} />
      </Routes>
    );
  };

  const navItems: { id: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; label: string; notification?: number }[] = [
    { id: 'dashboard', icon: DashboardIcon, label: 'Dashboard' },
    { id: 'focus', icon: TimerIcon, label: 'Focus' },
    { id: 'tasks', icon: TasksIcon, label: 'Tasks' },
    { id: 'ai-tutor', icon: SparklesIcon, label: 'AI Tutor' },
    { id: 'chat', icon: ChatIcon, label: 'Chat' },
    { id: 'doubts', icon: BookOpenIcon, label: 'Doubts' },
    { id: 'social', icon: FriendsIcon, label: 'Social' },
    { id: 'community', icon: CommunityIcon, label: 'Community' },
    { id: 'music', icon: MusicIcon, label: 'Music' },
    { id: 'profile', icon: ProfileIcon, label: 'Profile' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' },
    { id: 'vault', icon: BookOpenIcon, label: 'Vault' },
  ];

  return (
    <ToastProvider>
      <MusicProvider>
        <div className="flex flex-col md:flex-row min-h-screen font-sans transition-colors duration-300">
          {/* Mobile Navigation - Now at top */}
          <header className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-dark-bg border-b border-gray-400 dark:border-gray-800 p-2 z-[60] shadow-md">
            <nav className="flex overflow-x-auto no-scrollbar py-1">
              <div className="flex space-x-4 px-2">
                {navItems.map(item => {
                  const isActive = location.pathname.startsWith(`/${item.id}`) || (location.pathname === '/' && item.id === 'dashboard');
                  return (
                    <button
                      key={item.id}
                      onClick={() => { navigate(`/${item.id}`); setActiveGroup(null); }}
                      className={`relative flex-shrink-0 p-2 rounded-md transition-all duration-200 ${isActive ? 'bg-electric-blue text-white shadow-hard-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                    >
                      <item.icon className="w-8 h-8" />
                      {item.notification && (
                        <span className="absolute -top-1 -right-1 block h-4 w-4 rounded-full bg-bright-red text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-black animate-pulse">{item.notification}</span>
                      )}
                    </button>
                  );
                })}
                <button
                  onClick={() => navigate('/admin')}
                  className={`relative flex-shrink-0 p-2 rounded-md transition-all duration-200 ${location.pathname.startsWith('/admin') ? 'bg-bright-red text-white shadow-hard-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                >
                  <AdminIcon className="w-8 h-8" />
                </button>
                <button
                  onClick={() => signOut(auth)}
                  className="relative flex-shrink-0 p-2 rounded-md transition-all duration-200 hover:bg-bright-red hover:text-white"
                >
                  <LogoutIcon className="w-8 h-8" />
                </button>
              </div>
            </nav>
          </header>

          <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-inherit border-r-4 border-black dark:border-white p-4 space-y-4">
            <h1 className="font-grotesk text-3xl font-bold lg:block hidden">FocusForge</h1>
            <div className="w-12 h-12 bg-black dark:bg-gray-800 border-2 border-black dark:border-white lg:hidden" />
            <nav className="flex flex-col space-y-2 flex-grow">
              {navItems.map(item => {
                const isActive = location.pathname.startsWith(`/${item.id}`) || (location.pathname === '/' && item.id === 'dashboard');
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigate(`/${item.id}`); setActiveGroup(null); }}
                    className={`relative flex items-center space-x-4 p-3 rounded-lg border-2 border-transparent font-grotesk text-lg font-bold transition-all duration-200 hover:border-black dark:hover:border-white hover:shadow-hard-sm dark:hover:shadow-hard-sm-dark ${isActive && !activeGroup ? 'bg-electric-blue text-white shadow-hard-sm dark:shadow-hard-sm-dark border-black dark:border-white' : ''}`}
                  >
                    <item.icon className="w-7 h-7 flex-shrink-0" />
                    <span className="lg:block hidden">{item.label}</span>
                    {item.notification && (
                      <span className="absolute top-2 right-2 block h-5 w-5 rounded-full bg-bright-red text-white text-xs font-bold flex items-center justify-center lg:hidden">{item.notification}</span>
                    )}
                  </button>
                );
              })}
            </nav>
            <SidebarPlayer />
            <div className="space-y-2">
              <button
                onClick={() => navigate('/admin')}
                className={`w-full flex items-center space-x-4 p-3 rounded-lg border-2 font-grotesk text-lg font-bold transition-all duration-200 hover:shadow-hard-sm dark:hover:shadow-hard-sm-dark ${location.pathname.startsWith('/admin') ? 'bg-bright-red text-white shadow-hard-sm dark:shadow-hard-sm-dark border-black dark:border-white' : 'border-dashed border-black dark:border-white'}`}
              >
                <AdminIcon className="w-7 h-7 flex-shrink-0" />
                <span className="lg:block hidden">Admin Panel</span>
              </button>
              <button
                onClick={() => signOut(auth)}
                className="w-full flex items-center space-x-4 p-3 rounded-lg border-2 border-transparent font-grotesk text-lg font-bold transition-all duration-200 hover:border-black dark:hover:border-white hover:shadow-hard-sm dark:hover:shadow-hard-sm-dark"
              >
                <LogoutIcon className="w-7 h-7 flex-shrink-0" />
                <span className="lg:block hidden">Logout</span>
              </button>
            </div>
          </aside>
          <main className="flex-grow p-4 md:p-8 pt-28 md:pt-8 pb-32 md:pb-8 overflow-y-auto">
            {renderContent()}
          </main>
          <PersistentPlayer />
        </div>
      </MusicProvider>
    </ToastProvider >
  );
};

export default App;
