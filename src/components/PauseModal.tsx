import React from 'react';
import { Play, RotateCcw, Home, Sliders, Volume2, VolumeX } from 'lucide-react';
import { Difficulty } from '../game/engine';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  difficulty: Difficulty;
  onDifficultyChange: (diff: Difficulty) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  sensitivity: number;
  onSensitivityChange: (val: number) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onQuit,
  difficulty,
  onDifficultyChange,
  isMuted,
  onToggleMute,
  sensitivity,
  onSensitivityChange,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4 select-none">
      <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-lg p-6 shadow-2xl flex flex-col gap-5 text-neutral-200">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-bold tracking-widest text-red-500">PAUSED</h2>
          <p className="text-xs text-neutral-400 font-mono mt-1">THE ENTITY IS WAITING</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-red-800 hover:bg-red-700 active:scale-98 text-white font-mono text-sm font-semibold rounded border border-red-500/40 transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>RESUME</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-neutral-300 font-mono text-xs font-semibold rounded border border-neutral-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-neutral-400" />
            <span>RESTART LEVEL</span>
          </button>

          <button
            onClick={onQuit}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-neutral-300 font-mono text-xs font-semibold rounded border border-neutral-800 transition-colors"
          >
            <Home className="w-4 h-4 text-neutral-400" />
            <span>MAIN MENU</span>
          </button>
        </div>

        {/* Settings */}
        <div className="border-t border-neutral-800 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-400">AUDIO</span>
            <button
              onClick={onToggleMute}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isMuted ? 'MUTED' : 'ENABLED'}</span>
            </button>
          </div>

          <div className="flex flex-col gap-1.5 text-xs font-mono">
            <div className="flex justify-between text-neutral-400">
              <span>LOOK SENSITIVITY</span>
              <span className="text-neutral-300">{Math.round(sensitivity * 1000)}</span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.005"
              step="0.0005"
              value={sensitivity}
              onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-400">DIFFICULTY</span>
            <div className="flex gap-1">
              {(['EASY', 'NORMAL', 'NIGHTMARE'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onDifficultyChange(d)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    difficulty === d
                      ? 'bg-red-950 text-red-300 border border-red-700'
                      : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {d[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
