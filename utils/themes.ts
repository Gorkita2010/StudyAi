
import { Theme } from "../types";

export const themes: Record<string, Theme> = {
  serious: {
    id: 'serious',
    nameKey: 'themeSerious',
    bgApp: 'bg-slate-50',
    textMain: 'text-slate-800',
    textSecondary: 'text-slate-500',
    cardBg: 'bg-white shadow-xl',
    cardBorder: 'border border-slate-200',
    primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg',
    secondaryBtn: 'bg-slate-800 hover:bg-slate-700 text-white shadow-lg',
    inputBg: 'bg-slate-50 border-slate-300 focus:ring-blue-500 text-slate-800',
    accentColor: 'text-blue-600',
    font: 'font-sans',
    visualizerColor: '99, 102, 241' // Indigo
  },
  dark: {
    id: 'dark',
    nameKey: 'themeDark',
    bgApp: 'bg-slate-950',
    textMain: 'text-slate-100',
    textSecondary: 'text-slate-400',
    cardBg: 'bg-slate-900 shadow-2xl',
    cardBorder: 'border border-slate-800',
    primaryBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/50',
    secondaryBtn: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700',
    inputBg: 'bg-slate-950 border-slate-800 focus:ring-indigo-500 text-slate-200',
    accentColor: 'text-indigo-400',
    font: 'font-sans',
    visualizerColor: '129, 140, 248' // Indigo-400
  },
  neon: {
    id: 'neon',
    nameKey: 'themeNeon',
    bgApp: 'bg-black',
    textMain: 'text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500',
    textSecondary: 'text-cyan-300/80',
    cardBg: 'bg-black/80 backdrop-blur-md shadow-[0_0_30px_rgba(236,72,153,0.3)]',
    cardBorder: 'border border-pink-500/30',
    primaryBtn: 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.5)]',
    secondaryBtn: 'bg-black border border-cyan-500 text-cyan-400 hover:bg-cyan-900/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]',
    inputBg: 'bg-gray-900/50 border-pink-500/50 focus:ring-cyan-400 text-pink-100 placeholder-pink-900',
    accentColor: 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]',
    font: 'font-sans',
    visualizerColor: '236, 72, 153' // Pink
  },
  matrix: {
    id: 'matrix',
    nameKey: 'themeMatrix',
    bgApp: 'bg-black',
    textMain: 'text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]',
    textSecondary: 'text-green-700',
    cardBg: 'bg-black border-l-4 border-green-500 shadow-none',
    cardBorder: 'border border-green-900',
    primaryBtn: 'bg-green-900 hover:bg-green-800 text-green-100 border border-green-500 uppercase tracking-widest font-bold',
    secondaryBtn: 'bg-black border border-green-700 text-green-500 hover:bg-green-900/30',
    inputBg: 'bg-black border-green-800 focus:ring-green-500 text-green-400 font-mono',
    accentColor: 'text-green-500',
    font: 'font-mono',
    visualizerColor: '74, 222, 128' // Green-400
  },
  candy: {
    id: 'candy',
    nameKey: 'themeCandy',
    bgApp: 'bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-200',
    textMain: 'text-purple-900',
    textSecondary: 'text-purple-600',
    cardBg: 'bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl',
    cardBorder: 'border-4 border-white',
    primaryBtn: 'bg-gradient-to-r from-yellow-400 to-pink-500 hover:from-yellow-300 hover:to-pink-400 text-white rounded-full font-bold transform hover:scale-105 transition-transform shadow-lg',
    secondaryBtn: 'bg-purple-200 hover:bg-purple-300 text-purple-800 rounded-full font-bold',
    inputBg: 'bg-white border-2 border-pink-200 focus:ring-pink-400 text-purple-800 rounded-xl',
    accentColor: 'text-pink-500',
    font: 'font-[ui-rounded,system-ui,sans-serif]',
    visualizerColor: '236, 72, 153' // Pink
  }
};
