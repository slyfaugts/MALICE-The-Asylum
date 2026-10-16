import React from 'react';
import { Flashlight, Zap, Heart, Key, Pause, Volume2, VolumeX, Hand, Footprints } from 'lucide-react';
import { GameHUDData } from '../game/engine';
import { TouchController } from '../game/touchControls';

interface GameHUDProps {
  hudData: GameHUDData;
  touchController: TouchController;
  onPause: () => void;
  onToggleFlashlight: () => void;
  onInteract: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hudData,
  touchController,
  onPause,
  onToggleFlashlight,
  onInteract,
  isMuted,
  onToggleMute,
}) => {
  const {
    battery,
    isFlashlightOn,
    batteryNotification,
    batteriesCollected,
    batteryLowWarning,
    stamina,
    heartbeatBpm,
    keysCollected,
    totalKeys,
    interactPrompt,
    scareIntensity,
    isChased,
    isMobile,
  } = hudData;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none select-none overflow-hidden">
      {/* 1. Psychological Horror Vignette & Aberration Overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          boxShadow: `inset 0 0 ${80 + scareIntensity * 120}px rgba(${
            isChased ? '140, 10, 10' : '0, 0, 0'
          }, ${0.5 + scareIntensity * 0.45})`,
          opacity: Math.max(0.2, scareIntensity * 1.2),
        }}
      />

      {/* Screen static & red flash when in mortal danger */}
      {isChased && (
        <div
          className="absolute inset-0 bg-red-950/20 mix-blend-color-dodge pointer-events-none animate-pulse"
          style={{ animationDuration: '0.4s' }}
        />
      )}

      {/* 2. Top-Left Status Cluster: Flashlight & Battery */}
      <div className="absolute top-5 left-5 pointer-events-auto flex flex-col gap-1.5">
        <div
          className={`flex items-center gap-3 bg-black/75 px-3 py-2 rounded text-neutral-200 border transition-all ${
            batteryLowWarning
              ? 'border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.35)]'
              : 'border-neutral-800/80'
          }`}
        >
          <div
            onClick={onToggleFlashlight}
            className={`p-1.5 rounded cursor-pointer transition-colors ${
              battery <= 0
                ? 'bg-red-950/60 text-red-500'
                : isFlashlightOn
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-neutral-800 text-neutral-500'
            }`}
            title="Toggle Flashlight (F / Space / Tap)"
          >
            <Flashlight className="w-4 h-4" />
          </div>

          <div className="flex flex-col gap-1 min-w-[95px]">
            <div className="flex items-center justify-between text-[11px] font-mono leading-none">
              <span className="text-neutral-400">BATTERY</span>
              <span
                className={`tabular-nums font-bold ${
                  battery <= 0
                    ? 'text-red-500 animate-pulse'
                    : battery < 20
                    ? 'text-red-400'
                    : battery < 50
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }`}
              >
                {battery <= 0 ? 'DEAD' : `${battery}%`}
              </span>
            </div>
            {/* Battery gauge bar */}
            <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
              <div
                className={`h-full transition-all duration-200 ${
                  battery <= 0
                    ? 'bg-red-700'
                    : battery < 20
                    ? 'bg-red-500'
                    : battery < 50
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${battery}%` }}
              />
            </div>
          </div>
        </div>

        {/* Batteries collected counter badge */}
        {batteriesCollected > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400/90 bg-black/60 border border-neutral-800 px-2.5 py-0.5 rounded w-fit">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>{batteriesCollected} CELLS RECOVERED</span>
          </div>
        )}
      </div>

      {/* Floating Battery Notification / Low Warning Banner */}
      {batteryNotification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <div
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider shadow-lg border animate-bounce ${
              batteryNotification.includes('DIED') || batteryNotification.includes('DEAD')
                ? 'bg-red-950/95 border-red-500 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                : 'bg-neutral-900/95 border-amber-400/80 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{batteryNotification}</span>
          </div>
        </div>
      )}

      {/* 3. Top-Center Controls: Pause & Audio */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={onPause}
          className="bg-black/70 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white p-2 rounded transition-colors"
          title="Pause (Esc)"
          aria-label="Pause"
        >
          <Pause className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleMute}
          className="bg-black/70 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white p-2 rounded transition-colors"
          title="Toggle Audio"
          aria-label="Toggle Audio"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* 4. Top-Right Cluster: Objective Tracker */}
      <div className="absolute top-5 right-5 pointer-events-auto">
        <div className="flex items-center gap-2.5 bg-black/70 border border-red-950/80 px-3.5 py-2 rounded text-neutral-200">
          <Key className={`w-4 h-4 ${keysCollected === totalKeys ? 'text-emerald-400' : 'text-red-400'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-neutral-400 leading-none">KEYCARDS</span>
            <span className="font-mono text-sm font-bold tabular-nums">
              <span className={keysCollected === totalKeys ? 'text-emerald-400' : 'text-red-300'}>
                {keysCollected}
              </span>
              <span className="text-neutral-500"> / {totalKeys}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 5. Center Dynamic Crosshair & Interaction Prompt */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {interactPrompt ? (
          <div
            onClick={onInteract}
            className="flex flex-col items-center gap-2 bg-black/85 border border-red-500/80 px-4 py-2.5 rounded shadow-[0_0_20px_rgba(220,38,38,0.4)] pointer-events-auto cursor-pointer animate-bounce"
            style={{ animationDuration: '1.2s' }}
          >
            <div className="flex items-center gap-2 text-red-300 font-mono text-xs font-bold tracking-wider">
              <Hand className="w-4 h-4 text-red-400" />
              <span>{isMobile ? '[TAP HERE]' : '[PRESS E]'}</span>
            </div>
            <span className="text-white font-mono text-xs font-semibold">{interactPrompt}</span>
          </div>
        ) : (
          <div className="w-2 h-2 rounded-full border border-white/40 bg-white/20" />
        )}
      </div>

      {/* Click to Lock Camera Hint for Desktop */}
      {!isMobile && !hudData.isPointerLocked && !interactPrompt && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <div className="bg-black/80 border border-neutral-700/80 px-3.5 py-1.5 rounded text-[11px] font-mono text-neutral-300 tracking-wider flex items-center gap-2 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span>CLICK TO LOCK CAMERA LOOK</span>
          </div>
        </div>
      )}

      {/* 6. Bottom-Left Cluster: Stamina & Heartbeat */}
      <div className="absolute bottom-6 left-6 pointer-events-auto flex flex-col gap-2">
        <div className="flex items-center gap-3 bg-black/70 border border-neutral-800/80 px-3 py-2 rounded text-neutral-200">
          {/* Heartbeat pulse */}
          <div className="flex items-center gap-1.5 text-red-400">
            <Heart
              className="w-4 h-4 fill-current transition-transform"
              style={{
                transform: `scale(${1 + (heartbeatBpm - 60) * 0.005})`,
              }}
            />
            <span className="font-mono text-xs font-bold tabular-nums">{heartbeatBpm} BPM</span>
          </div>

          <div className="h-4 w-px bg-neutral-800" />

          {/* Stamina bar */}
          <div className="flex flex-col gap-1 min-w-[85px]">
            <div className="flex items-center justify-between text-[10px] font-mono leading-none">
              <span className="text-neutral-400">STAMINA</span>
              <span className="tabular-nums font-semibold text-neutral-300">{stamina}%</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
              <div
                className={`h-full transition-all duration-150 ${
                  stamina < 25 ? 'bg-red-500' : 'bg-cyan-400'
                }`}
                style={{ width: `${stamina}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 7. Mobile Virtual Joystick Visual Indicator */}
      {isMobile && touchController.joystickActive && (
        <div
          className="fixed pointer-events-none rounded-full border-2 border-white/25 bg-white/10"
          style={{
            width: 100,
            height: 100,
            left: touchController.joystickBaseX - 50,
            top: touchController.joystickBaseY - 50,
          }}
        >
          <div
            className="absolute rounded-full bg-red-500/70 border border-red-300 shadow-lg"
            style={{
              width: 44,
              height: 44,
              left: touchController.joystickThumbX - touchController.joystickBaseX + 28,
              top: touchController.joystickThumbY - touchController.joystickBaseY + 28,
            }}
          />
        </div>
      )}

      {/* 8. Mobile On-Screen Action Buttons (Bottom-Right) */}
      {isMobile && (
        <div className="absolute bottom-6 right-6 flex items-end gap-3 pointer-events-auto">
          {/* Sprint Hold Button */}
          <button
            onTouchStart={() => touchController.setSprint(true)}
            onTouchEnd={() => touchController.setSprint(false)}
            onMouseDown={() => touchController.setSprint(true)}
            onMouseUp={() => touchController.setSprint(false)}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border font-mono text-[10px] font-bold shadow-lg transition-colors ${
              touchController.state.isSprinting
                ? 'bg-red-600 border-red-400 text-white'
                : 'bg-black/70 border-neutral-700 text-neutral-300'
            }`}
          >
            <Footprints className="w-5 h-5 mb-0.5" />
            <span>RUN</span>
          </button>

          {/* Flashlight Toggle Button with Battery Badge */}
          <button
            onClick={onToggleFlashlight}
            className={`relative w-14 h-14 rounded-full flex flex-col items-center justify-center border font-mono text-[10px] font-bold shadow-lg transition-colors ${
              battery <= 0
                ? 'bg-red-950 border-red-700 text-red-400'
                : isFlashlightOn
                ? 'bg-amber-600 border-amber-300 text-white'
                : 'bg-black/70 border-neutral-700 text-neutral-400'
            }`}
          >
            <Flashlight className="w-5 h-5 mb-0.5" />
            <span>LIGHT</span>
            <span
              className={`absolute -top-1 -right-1 text-[9px] px-1 rounded-full tabular-nums border font-mono ${
                battery <= 0
                  ? 'bg-red-900 border-red-500 text-red-200 animate-pulse'
                  : battery < 20
                  ? 'bg-red-950 border-red-600 text-red-300'
                  : 'bg-neutral-950 border-neutral-700 text-neutral-200'
              }`}
            >
              {battery}%
            </span>
          </button>

          {/* Action / Interact Button */}
          {interactPrompt && (
            <button
              onClick={onInteract}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 border-2 border-white flex flex-col items-center justify-center font-mono text-xs font-bold text-white shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse"
            >
              <Hand className="w-6 h-6 mb-0.5" />
              <span>USE</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
