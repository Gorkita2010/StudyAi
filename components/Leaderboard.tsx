import React, { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  currentScore?: number;
  onClose: () => void;
}

// Mock Data Generator
const generateMockData = (): LeaderboardEntry[] => [
  { id: '1', name: 'QuizMaster_99', score: 15400, avatar: '👑', rank: 1 },
  { id: '2', name: 'TriviaTitan', score: 12350, avatar: '⚡', rank: 2 },
  { id: '3', name: 'BrainiacBot', score: 10800, avatar: '🤖', rank: 3 },
  { id: '4', name: 'Alice', score: 8900, avatar: '🦊', rank: 4, isFriend: true },
  { id: '5', name: 'Bob', score: 7200, avatar: '🐼', rank: 5, isFriend: true },
  { id: '6', name: 'Charlie', score: 5400, avatar: '🦁', rank: 6, isFriend: true },
  { id: '7', name: 'NeonRider', score: 4300, avatar: '🏍️', rank: 7 },
];

const Leaderboard: React.FC<LeaderboardProps> = ({ currentScore, onClose }) => {
  const [activeTab, setActiveTab] = useState<'global' | 'friends'>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    // Load and merge data
    const baseData = generateMockData();
    
    if (currentScore !== undefined && currentScore > 0) {
      const userEntry: LeaderboardEntry = {
        id: 'user',
        name: 'YOU',
        score: currentScore,
        avatar: '👤',
        isFriend: true
      };
      baseData.push(userEntry);
    }

    // Sort and rank
    const sorted = baseData.sort((a, b) => b.score - a.score);
    const ranked = sorted.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
    
    setEntries(ranked);
  }, [currentScore]);

  const displayEntries = activeTab === 'global' 
    ? entries 
    : entries.filter(e => e.isFriend);

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        <div className="p-6 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Leaderboard
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            Close
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button 
            onClick={() => setActiveTab('global')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'global' ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400' : 'bg-slate-900/30 text-slate-500 hover:text-slate-300'}`}
          >
            Global
          </button>
          <button 
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'friends' ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-400' : 'bg-slate-900/30 text-slate-500 hover:text-slate-300'}`}
          >
            Friends
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {displayEntries.map((entry) => (
            <div 
              key={entry.id}
              className={`flex items-center p-4 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${entry.id === 'user' ? 'bg-cyan-900/20 border-l-4 border-l-cyan-500' : ''}`}
            >
              <div className="w-12 text-center">
                {entry.rank === 1 && <span className="text-2xl">🥇</span>}
                {entry.rank === 2 && <span className="text-2xl">🥈</span>}
                {entry.rank === 3 && <span className="text-2xl">🥉</span>}
                {entry.rank! > 3 && <span className="text-slate-500 font-mono font-bold">#{entry.rank}</span>}
              </div>
              
              <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-2xl mr-4 border border-slate-600">
                {entry.avatar}
              </div>

              <div className="flex-1">
                <h3 className={`font-bold ${entry.id === 'user' ? 'text-cyan-300' : 'text-slate-200'}`}>
                  {entry.name}
                </h3>
                {entry.isFriend && entry.id !== 'user' && (
                   <span className="text-[10px] uppercase bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">Friend</span>
                )}
              </div>

              <div className="text-right">
                <span className="block text-xl font-mono font-bold text-white">
                  {entry.score.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 uppercase">Points</span>
              </div>
            </div>
          ))}
        </div>

        {currentScore !== undefined && currentScore > 0 && (
           <div className="p-4 bg-slate-900 text-center border-t border-slate-700">
             <p className="text-slate-400 text-sm">Great job! You scored <span className="text-white font-bold">{currentScore}</span> points this session.</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;