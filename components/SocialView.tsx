import React, { useState, useEffect } from 'react';
import type { Friend, StudyGroup } from '../types';
import { UserPlusIcon, PlusIcon, LockIcon } from './icons/Icons';
import { auth } from '../firebaseClient';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const FriendCard: React.FC<{ friend: Friend }> = ({ friend }) => (
  <div className="p-4 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark flex items-center justify-between gap-4">
    <div className="flex items-center gap-4">
      <div className="relative">
        <img src={friend.avatar} alt={friend.name} className="w-16 h-16 rounded-md border-2 border-black dark:border-white" />
        <span className={`absolute -top-1 -right-1 block h-4 w-4 rounded-full border-2 border-white dark:border-black ${friend.online ? 'bg-acid-green' : 'bg-gray-400'}`}></span>
      </div>
      <div>
        <h3 className="text-xl font-grotesk font-bold">{friend.name}</h3>
        <p className={`text-sm font-bold ${friend.online ? friend.studying ? 'text-neon-purple' : 'text-acid-green' : 'text-gray-500'}`}>
          {friend.online ? (friend.studying ? `Studying: ${friend.studying}` : 'Online') : 'Offline'}
        </p>
      </div>
    </div>
    <div className="flex flex-col sm:flex-row gap-2">
      <button className="p-2 bg-white dark:bg-gray-700 font-bold border-2 border-black dark:border-white rounded-md shadow-hard-sm dark:shadow-hard-sm-dark text-sm">Message</button>
      {friend.online && (
        <button className="p-2 bg-electric-blue text-white font-bold border-2 border-black dark:border-white rounded-md shadow-hard-sm dark:shadow-hard-sm-dark text-sm">Invite</button>
      )}
    </div>
  </div>
);

const GroupCard: React.FC<{ group: StudyGroup, joinedGroupIds: number[], setActiveGroup: (g: StudyGroup) => void, handleToggleJoinGroup: (id: number) => void }> = ({ group, joinedGroupIds, setActiveGroup, handleToggleJoinGroup }) => {
  const isMember = joinedGroupIds.includes(group.id);
  return (
    <div className={`p-4 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark flex flex-col justify-between transition-all ${isMember ? 'ring-4 ring-acid-green ring-offset-2 dark:ring-offset-gray-900' : ''}`}>
      <div>
        <div className="flex items-start justify-between">
          <div className="text-4xl">{group.icon}</div>
          <div className="flex gap-2">
            {isMember && <span className="bg-acid-green text-black px-2 py-0.5 text-[10px] font-bold border-2 border-black rounded uppercase">Joined</span>}
            {group.isPrivate && <LockIcon className="w-6 h-6 text-gray-500" />}
          </div>
        </div>
        <h3 className="text-2xl font-grotesk font-bold mt-2">{group.name}</h3>
        <p className="font-mono px-2 py-1 bg-gray-200 dark:bg-gray-700 inline-block rounded-md text-sm my-2">{group.subject}</p>
        <p className="text-gray-600 dark:text-gray-400 text-sm font-bold font-mono">{group.memberCount}/{group.maxMembers} Members</p>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          onClick={() => setActiveGroup(group)}
          className="p-3 bg-white dark:bg-gray-700 text-black dark:text-white font-grotesk font-bold border-2 border-black dark:border-white rounded-md shadow-hard-sm dark:shadow-hard-sm-dark hover:-translate-y-0.5"
        >
          View
        </button>
        <button
          onClick={() => handleToggleJoinGroup(group.id)}
          className={`p-3 font-grotesk font-bold border-2 border-black dark:border-white rounded-md shadow-hard-sm dark:shadow-hard-sm-dark transition-all ${isMember ? 'bg-bright-red text-white' : 'bg-electric-blue text-white'}`}
        >
          {isMember ? 'Leave' : 'Join'}
        </button>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ tabId: 'friends' | 'groups' | 'dms', label: string, activeTab: string, setActiveTab: (t: 'friends' | 'groups' | 'dms') => void }> = ({ tabId, label, activeTab, setActiveTab }) => (
  <button
    onClick={() => setActiveTab(tabId)}
    className={`p-3 font-grotesk font-bold text-xl border-b-4 transition-all ${activeTab === tabId ? 'border-electric-blue' : 'border-transparent text-gray-500 hover:border-gray-300'}`}
  >
    {label}
  </button>
);

interface SocialViewProps {
  setActiveGroup: (group: StudyGroup) => void;
}

const SocialView: React.FC<SocialViewProps> = ({ setActiveGroup }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'groups' | 'dms'>('friends');
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();

        // Sync profile first
        await fetch(`${API_BASE_URL}/user/sync`, {
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

        const [groupsRes, friendsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/social/groups`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/social/friends`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const groupsData = await groupsRes.json();
        const friendsData = await friendsRes.json();

        setGroups(groupsData);
        setFriends(friendsData);

        // For now, let's assume we don't have a specific "joined groups" endpoint yet, 
        // but we could filter it or just use the memberCount logic.
        // In a real app, you'd fetch joined groups specifically.
      } catch (err) { } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleToggleJoinGroup = async (groupId: number) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const isMember = joinedGroupIds.includes(groupId);

      const endpoint = isMember ? 'leave' : 'join';
      const res = await fetch(`${API_BASE_URL}/social/groups/${groupId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const updatedGroup = await res.json();

      setJoinedGroupIds(prev => isMember ? prev.filter(id => id !== groupId) : [...prev, groupId]);
      setGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
    } catch (err) { }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="w-12 h-12 border-4 border-black dark:border-white border-t-electric-blue rounded-full animate-spin"></div>
        </div>
      );
    }
    switch (activeTab) {
      case 'groups':
        return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => <GroupCard key={group.id} group={group} joinedGroupIds={joinedGroupIds} setActiveGroup={setActiveGroup} handleToggleJoinGroup={handleToggleJoinGroup} />)}
          <div className="p-4 bg-gray-100 dark:bg-gray-900 border-4 border-dashed border-black dark:border-white rounded-lg flex flex-col items-center justify-center text-center hover:bg-gray-200 transition-colors cursor-pointer">
            <PlusIcon className="w-12 h-12 text-gray-500 mb-2" />
            <h3 className="text-lg font-grotesk font-bold">Create New Group</h3>
            <p className="text-sm text-gray-500">Start a new study community</p>
          </div>
        </div>;
      case 'dms':
        return <div className="p-6 text-center bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark">
          <h3 className="text-2xl font-grotesk font-bold">Direct Messages</h3>
          <p className="text-gray-500 mt-2">Select a friend to start a conversation.</p>
        </div>
      case 'friends':
      default:
        return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {friends.map(friend => <FriendCard key={friend.id} friend={friend} />)}
          <div className="p-4 bg-gray-100 dark:bg-gray-900 border-4 border-dashed border-black dark:border-white rounded-lg flex flex-col items-center justify-center text-center hover:bg-gray-200 transition-colors cursor-pointer">
            <UserPlusIcon className="w-12 h-12 text-gray-500 mb-2" />
            <h3 className="text-lg font-grotesk font-bold">Add New Friend</h3>
            <p className="text-sm text-gray-500">Enter username to connect</p>
          </div>
        </div>;
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-4xl md:text-5xl font-grotesk font-bold">Social Hub</h1>
      <div className="flex gap-4 border-b-2 border-black dark:border-white">
        <TabButton tabId="friends" label="Friends" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton tabId="groups" label="Groups" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton tabId="dms" label="DMs" activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      <div>
        {renderContent()}
      </div>
    </div>
  );
};

export default SocialView;
