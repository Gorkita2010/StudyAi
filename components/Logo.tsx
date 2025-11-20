
import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12" }) => {
  return (
    <div className={`${className} relative rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center`}>
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent"></div>
      
      <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="brainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        
        {/* Open Book Base */}
        <path 
          d="M10 70 C 10 70, 30 80, 50 70 C 70 80, 90 70, 90 70 V 40 C 90 40, 70 50, 50 40 C 30 50, 10 40, 10 40 Z" 
          fill="#4f46e5" 
          opacity="0.8"
        />
        <path 
          d="M50 40 V 70" 
          stroke="#818cf8" 
          strokeWidth="2" 
        />
        
        {/* Circuit Lines / Knowledge Rays */}
        <path d="M50 40 L 50 15" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <path d="M50 40 L 25 20" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        <path d="M50 40 L 75 20" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        
        {/* Brain Shape */}
        <path 
          d="M30 50 C 20 40, 30 20, 50 25 C 70 20, 80 40, 70 50 C 75 60, 60 70, 50 65 C 40 70, 25 60, 30 50" 
          fill="url(#brainGrad)" 
          stroke="white" 
          strokeWidth="1.5"
        />
        
        {/* Brain Nodes */}
        <circle cx="35" cy="40" r="2" fill="white" />
        <circle cx="45" cy="30" r="2" fill="white" />
        <circle cx="60" cy="35" r="2" fill="white" />
        <circle cx="55" cy="50" r="2" fill="white" />
        <circle cx="40" cy="55" r="2" fill="white" />
        
        {/* Connections */}
        <path d="M35 40 L 45 30 L 60 35 L 55 50 L 40 55 L 35 40" stroke="white" strokeWidth="0.5" opacity="0.7" />

        {/* Text AI */}
        <text x="50" y="52" fontFamily="sans-serif" fontSize="20" fontWeight="bold" fill="white" textAnchor="middle" dominantBaseline="middle" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.3)' }}>
          Ai
        </text>
      </svg>
    </div>
  );
};

export default Logo;
