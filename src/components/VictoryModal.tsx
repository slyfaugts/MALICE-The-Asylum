import React from 'react';
import { Award, RotateCcw, Home, Clock, Sparkles } from 'lucide-react';

interface VictoryModalProps {
  survivedTime: number;
  difficulty: string;
  onRestart: () => void;
  onQuit: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  survivedTime,
  difficulty,
  onRestart,
  onQuit,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}m ${remSecs < 10 ? '0' : ''}${remSecs}s`;
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-4 select-none">
      <div className="w-full max-w-sm bg-neutral-950 border border-emerald-950/80 rounded-lg p-6 shadow-[0_0_50px_rgba(16,185,129,0.3)] flex flex-col items-center gap-5 text-neutral-200">
        <div className="w-16 h-16 rounded-full bg-emerald-950/40 border border-emerald-600/60 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
          <Award className="w-8 h-8" />
        </div>

        <div className="text-center">
          <h2 className="font-serif text-3xl font-black tracking-widest text-emerald-400">SURVIVED</h2>
          <p className="text-xs text-neutral-400 font-mono mt-1">YOU ESCAPED THE FACILITY ALIVE</p>
        </div>

        {/* Stats */}
        <div className="w-full grid grid-cols-2 gap-2 bg-neutral-900/60 border border-neutral-800 rounded p-3 text-xs font-mono">
          <div className="flex flex-col items-center justify-center p-2 rounded bg-black/40">
            <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>TIME</span>
            </div>
            <span className="font-bold text-sm text-neutral-100 tabular-nums">{formatTime(survivedTime)}</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded bg-black/40">
            <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>DIFFICULTY</span>
            </div>
            <span className="font-bold text-sm text-emerald-300">{difficulty}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-600 active:scale-98 text-white font-mono text-sm font-bold tracking-wider rounded border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
          </button>

          <button
            onClick={onQuit}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-neutral-400 hover:text-white font-mono text-xs font-semibold rounded border border-neutral-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
