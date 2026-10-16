import React from 'react';
import { Volume2, VolumeX, ShieldAlert, Sparkles, Smartphone, Monitor } from 'lucide-react';
import { Difficulty } from '../game/engine';

interface TitleScreenProps {
  onStart: (difficulty: Difficulty) => void;
  selectedDifficulty: Difficulty;
  onDifficultyChange: (diff: Difficulty) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isMobile: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  selectedDifficulty,
  onDifficultyChange,
  isMuted,
  onToggleMute,
  isMobile,
}) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 pointer-events-none select-none">
      {/* Top Bar with Audio & Headphone hint */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2.5 bg-black/60 border border-red-950/60 px-3.5 py-1.5 rounded text-xs text-red-200/80 font-mono tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-red-400" />
          <span>HEADPHONES RECOMMENDED FOR 3D AUDIO</span>
        </div>

        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          className="flex items-center gap-2 bg-black/60 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white px-3.5 py-1.5 rounded text-xs font-mono transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          <span className="hidden sm:inline">{isMuted ? 'MUTED' : 'AUDIO ON'}</span>
        </button>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup with 30-40% Negative Space */}
      <div className="max-w-2xl mx-auto text-center flex flex-col items-center">
        {/* Bespoke inline SVG Title Lockup */}
        <div className="w-full max-w-lg mb-2">
          <svg
            viewBox="0 0 540 110"
            className="w-full drop-shadow-[0_10px_20px_rgba(200,10,10,0.35)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="bloodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#7f1d1d" />
              </linearGradient>
              <filter id="distort">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>

            {/* Sub-label */}
            <text
              x="270"
              y="22"
              textAnchor="middle"
              className="fill-red-500/70 font-mono text-[11px] font-bold tracking-[0.45em]"
            >
              PSYCHOLOGICAL SURVIVAL HORROR
            </text>

            {/* Main distressed title: MALICE */}
            <text
              x="270"
              y="74"
              textAnchor="middle"
              filter="url(#distort)"
              className="font-serif font-black text-[58px] tracking-[0.25em]"
              fill="url(#bloodGrad)"
              stroke="#450a0a"
              strokeWidth="1.5"
            >
              MALICE
            </text>

            {/* Subtitle lockup */}
            <text
              x="270"
              y="98"
              textAnchor="middle"
              className="fill-neutral-400 font-mono text-[12px] font-semibold tracking-[0.55em]"
            >
              THE ASYLUM
            </text>
          </svg>
        </div>

        <p className="text-neutral-400 text-xs sm:text-sm font-sans max-w-md mb-6 leading-relaxed">
          Trapped inside Ward B. Find 4 scattered Keycards to disengage the Emergency Blast Door. Conserve your flashlight battery. Do not let the Shade catch you.
        </p>

        {/* Difficulty Selection */}
        <div className="flex items-center gap-2 mb-6 pointer-events-auto">
          {(['EASY', 'NORMAL', 'NIGHTMARE'] as Difficulty[]).map((diff) => {
            const active = selectedDifficulty === diff;
            return (
              <button
                key={diff}
                onClick={() => onDifficultyChange(diff)}
                className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all ${
                  active
                    ? 'bg-red-950/80 text-red-200 border border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                    : 'bg-black/60 text-neutral-400 border border-neutral-800 hover:bg-neutral-900 hover:text-neutral-200'
                }`}
              >
                {diff === 'EASY' && 'CASUAL'}
                {diff === 'NORMAL' && 'SURVIVOR'}
                {diff === 'NIGHTMARE' && 'NIGHTMARE'}
              </button>
            );
          })}
        </div>

        {/* Primary Start CTA Button */}
        <div className="pointer-events-auto w-full max-w-xs">
          <button
            onClick={() => onStart(selectedDifficulty)}
            className="w-full group relative overflow-hidden bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-serif tracking-[0.2em] font-bold text-base py-3.5 px-8 rounded border border-red-400/40 shadow-[0_4px_25px_rgba(220,38,38,0.4)] active:scale-98 transition-transform"
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-200 group-hover:scale-110 transition-transform" />
              <span>ENTER FACILITY</span>
            </div>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>

      {/* Flat Control-Hint Line & Device Indicator */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-neutral-400/80 pointer-events-auto">
        <div className="flex items-center gap-2">
          {isMobile ? (
            <div className="flex items-center gap-1.5 bg-black/60 border border-neutral-800 px-2.5 py-1 rounded text-neutral-300">
              <Smartphone className="w-3.5 h-3.5 text-red-400" />
              <span>TOUCH MODE ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-black/60 border border-neutral-800 px-2.5 py-1 rounded text-neutral-300">
              <Monitor className="w-3.5 h-3.5 text-neutral-400" />
              <span>DESKTOP POINTER LOCK</span>
            </div>
          )}
        </div>

        <div className="text-center sm:text-right text-neutral-400">
          {isMobile
            ? 'Left Screen: Virtual Joystick · Right Screen: Camera Look · Buttons: Flashlight, Sprint, Interact'
            : 'WASD Move · Mouse Look · F Flashlight · Shift Sprint · E Interact · Esc Pause'}
        </div>
      </div>
    </div>
  );
};
