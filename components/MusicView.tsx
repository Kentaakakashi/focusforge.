
import React, { useState, useEffect } from 'react';
import { musicApi, DPDXSong, DPDXProfile } from '../lib/musicApi';
import { useMusic } from './MusicContext';
import { auth } from '../firebaseClient';
import { useToast } from './Toast';

const PlayIcon = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;
const PauseIcon = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>;
const SkipIcon = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>;
const SearchIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const MusicView: React.FC = () => {
  const [accessKey, setAccessKey] = useState<string | null>(localStorage.getItem('dpdx_access_key'));
  const [profile, setProfile] = useState<DPDXProfile | null>(null);
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const { activeSong, isPlaying, currentTime, duration, playSong, togglePlay, seek, skipNext, skipPrev } = useMusic();

  useEffect(() => {
    if (accessKey) {
      musicApi.getUserProfile(accessKey)
        .then(setProfile)
        .catch(() => {
          setAccessKey(null);
          localStorage.removeItem('dpdx_access_key');
        });
    }
  }, [accessKey]);

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const key = await musicApi.confirmLink(token);
      setAccessKey(key);
      localStorage.setItem('dpdx_access_key', key);
      setToken('');

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
    } catch (err: any) {
      showToast(err.message || 'Could not link account', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!accessKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-full max-w-2xl p-8 md:p-12 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark bg-white dark:bg-gray-800">
          <h1 className="font-grotesk text-3xl md:text-4xl font-bold mb-4">DPDX Music Login</h1>
          <p className="text-lg mb-8 text-gray-600 dark:text-gray-400 font-bold">
            Linking your DPDX account lets you stream music directly within FocusForge.
          </p>

          <form onSubmit={handleLinkAccount} className="space-y-6">
            <div className="text-left">
              <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-gray-500">TEMPORARY LINKING TOKEN</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ABCD-1234"
                className="w-full p-4 font-mono text-xl border-4 border-black dark:border-white rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-electric-blue"
                required
              />
              <p className="mt-2 text-sm text-gray-500">Get this from your profile at <a href="https://music.dpdx.in" target="_blank" rel="noreferrer" className="text-electric-blue underline">music.dpdx.in</a></p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-acid-green text-black font-grotesk font-bold text-2xl p-4 border-4 border-black rounded-lg transition-all duration-200 hover:bg-green-400 hover:-translate-y-1 hover:shadow-hard dark:hover:shadow-hard-dark active:translate-y-0 disabled:opacity-50"
            >
              {isLoading ? 'LINKING...' : 'LINK ACCOUNT'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-6xl font-grotesk font-black uppercase">Now <span className="text-electric-blue">Playing</span></h1>
          {profile && <p className="text-xl text-electric-blue font-bold">Account: {profile.name}</p>}
        </div>

        <button
          onClick={async () => {
            localStorage.removeItem('dpdx_access_key');
            setAccessKey(null);
            setProfile(null);

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
          }}
          className="px-6 py-3 border-4 border-black dark:border-white font-black uppercase hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-hard-sm"
        >
          Logout
        </button>
      </div>

      <div className="p-8 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
        {activeSong ? (
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="w-full lg:w-80 aspect-square border-8 border-black dark:border-white rounded-lg overflow-hidden bg-gray-800 shadow-hard group">
              <img
                src={activeSong.coverUrl}
                alt={activeSong.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = `https://picsum.photos/seed/${encodeURIComponent(activeSong.title)}/300/300`;
                }}
                className={`w-full h-full object-cover transition-transform duration-[10s] ease-linear ${isPlaying ? 'scale-110' : 'scale-100'}`}
              />
            </div>

            <div className="flex-grow w-full space-y-8">
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest">CURRENTLY STREAMING</p>
                <h2 className="text-5xl md:text-7xl font-grotesk font-black uppercase leading-none">{activeSong.title}</h2>
                <p className="text-2xl md:text-3xl text-electric-blue font-bold uppercase tracking-tight">{activeSong.artist}</p>
              </div>

              {/* Progress Bar Container */}
              <div className="space-y-3">
                <div className="relative h-6 bg-gray-200 dark:bg-gray-900 border-4 border-black dark:border-white rounded-full overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    seek(percent * duration);
                  }}>
                  <div
                    className="absolute h-full bg-acid-green transition-all duration-100 ease-linear"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between font-mono font-bold text-lg">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-center lg:justify-start gap-8">
                <button
                  onClick={skipPrev}
                  className="p-6 border-4 border-black dark:border-white bg-white dark:bg-gray-900 rounded-xl shadow-hard-sm hover:-translate-y-1 transition-all active:translate-y-0 active:shadow-none"
                >
                  <SkipIcon className="w-10 h-10 transform rotate-180" />
                </button>
                <button
                  onClick={togglePlay}
                  className="p-10 bg-acid-green text-black border-4 border-black dark:border-white rounded-full shadow-hard hover:bg-green-400 transition-all hover:-translate-y-2 active:translate-y-0 active:shadow-none"
                >
                  {isPlaying ? <PauseIcon className="w-16 h-16" /> : <PlayIcon className="w-16 h-16" />}
                </button>
                <button
                  onClick={skipNext}
                  className="p-6 border-4 border-black dark:border-white bg-white dark:bg-gray-900 rounded-xl shadow-hard-sm hover:-translate-y-1 transition-all active:translate-y-0 active:shadow-none"
                >
                  <SkipIcon className="w-10 h-10" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-24 space-y-6">
            <div className="w-32 h-32 mx-auto border-4 border-dashed border-black dark:border-white rounded-full flex items-center justify-center">
              <PlayIcon className="w-16 h-16 opacity-20" />
            </div>
            <p className="text-3xl font-black uppercase opacity-40 italic">Nothing playing right now</p>
            <p className="text-xl font-bold opacity-60">Head over to the Library to pick a track!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicView;
