
import React from 'react';
import type { Friend } from '../types';
import { UserPlusIcon } from './icons/Icons';

const friendsData: Friend[] = [
  { id: 1, name: 'Alice', avatar: 'https://picsum.photos/seed/alice/100/100', online: true },
  { id: 2, name: 'Bob', avatar: 'https://picsum.photos/seed/bob/100/100', online: false },
  { id: 3, name: 'Charlie', avatar: 'https://picsum.photos/seed/charlie/100/100', online: true },
  { id: 4, name: 'Diana', avatar: 'https://picsum.photos/seed/diana/100/100', online: true },
  { id: 5, name: 'Eve', avatar: 'https://picsum.photos/seed/eve/100/100', online: false },
];

const FriendCard: React.FC<{ friend: Friend }> = ({ friend }) => (
    <div className="p-4 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg shadow-hard dark:shadow-hard-dark flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <div className="relative">
                <img src={friend.avatar} alt={friend.name} className="w-16 h-16 rounded-md border-2 border-black dark:border-white" />
                <span className={`absolute -top-1 -right-1 block h-4 w-4 rounded-full border-2 border-white dark:border-black ${friend.online ? 'bg-acid-green' : 'bg-gray-400'}`}></span>
            </div>
            <div>
                <h3 className="text-xl font-grotesk font-bold">{friend.name}</h3>
                <p className={`text-sm font-bold ${friend.online ? 'text-acid-green' : 'text-gray-500'}`}>
                    {friend.online ? 'Online' : 'Offline'}
                </p>
            </div>
        </div>
        {friend.online && (
            <button className="p-3 bg-electric-blue text-white font-grotesk font-bold border-2 border-black dark:border-white rounded-md shadow-hard-sm dark:shadow-hard-sm-dark hover:bg-blue-600 transition-transform hover:-translate-y-0.5">
                Invite
            </button>
        )}
    </div>
);

const FriendsView: React.FC = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl md:text-5xl font-grotesk font-bold">Friends & Study Groups</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {friendsData.map(friend => (
            <FriendCard key={friend.id} friend={friend} />
        ))}
        <div className="p-4 bg-gray-100 dark:bg-gray-900 border-4 border-dashed border-black dark:border-white rounded-lg flex flex-col items-center justify-center text-center">
            <UserPlusIcon className="w-12 h-12 text-gray-500 mb-2"/>
            <h3 className="text-lg font-grotesk font-bold">Add New Friend</h3>
            <p className="text-sm text-gray-500">Enter username to connect</p>
        </div>
      </div>

    </div>
  );
};

export default FriendsView;
