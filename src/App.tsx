/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { HorrorGameEngine, GameState, Difficulty, GameHUDData } from './game/engine';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { soundManager } from './game/audio';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HorrorGameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sensitivity, setSensitivity] = useState<number>(0.0022);
  const [hudData, setHudData] = useState<GameHUDData>({
    state: 'TITLE',
    battery: 100,
    isFlashlightOn: true,
    batteryNotification: null,
    batteriesCollected: 0,
    batteryLowWarning: false,
    isInDarkness: false,
    jumpscareActive: null,
    jumpscareMessage: null,
    stamina: 100,
    heartbeatBpm: 65,
    keysCollected: 0,
    totalKeys: 4,
    interactPrompt: null,
    scareIntensity: 0,
    isChased: false,
    survivedTime: 0,
    isMobile: false,
    isPointerLocked: false,
  });

  // Handle HUD data stream from the engine
  const handleHUDUpdate = useCallback((data: GameHUDData) => {
    setHudData(data);
    if (data.state !== gameState) {
      setGameState(data.state);
    }
  }, [gameState]);

  // Initialize Three.js Engine once on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new HorrorGameEngine(mountRef.current, handleHUDUpdate);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleHUDUpdate]);

  const handleStartGame = (diff: Difficulty) => {
    if (engineRef.current) {
      engineRef.current.startGame(diff);
      setGameState('PLAYING');
      window.focus();
      if (mountRef.current) {
        mountRef.current.focus();
      }
    }
  };

  const handlePause = () => {
    if (engineRef.current) {
      engineRef.current.pauseGame();
      setGameState('PAUSED');
    }
  };

  const handleResume = () => {
    if (engineRef.current) {
      engineRef.current.resumeGame();
      setGameState('PLAYING');
    }
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.restartGame();
      setGameState('PLAYING');
    }
  };

  const handleQuitToTitle = () => {
    if (engineRef.current) {
      engineRef.current.returnToTitle();
      setGameState('TITLE');
    }
  };

  const handleToggleFlashlight = () => {
    if (engineRef.current) {
      engineRef.current.toggleFlashlight();
    }
  };

  const handleInteract = () => {
    if (engineRef.current) {
      engineRef.current.interact();
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
    if (engineRef.current) {
      engineRef.current.isMuted = nextMuted;
    }
  };

  const handleSensitivityChange = (val: number) => {
    setSensitivity(val);
    if (engineRef.current) {
      engineRef.current.mouseSensitivity = val;
    }
  };

  const handleDifficultyChange = (diff: Difficulty) => {
    setDifficulty(diff);
    if (engineRef.current) {
      engineRef.current.difficulty = diff;
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans select-none touch-none">
      {/* 1. Isolated 3D WebGL Canvas Container */}
      <div ref={mountRef} tabIndex={0} className="absolute inset-0 w-full h-full cursor-crosshair outline-none" />

      {/* 2. Title Screen */}
      {gameState === 'TITLE' && (
        <TitleScreen
          onStart={handleStartGame}
          selectedDifficulty={difficulty}
          onDifficultyChange={handleDifficultyChange}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isMobile={hudData.isMobile}
        />
      )}

      {/* 3. In-Game Low-Occlusion HUD & Touch Controls */}
      {gameState === 'PLAYING' && engineRef.current && (
        <GameHUD
          hudData={hudData}
          touchController={engineRef.current.touchController}
          onPause={handlePause}
          onToggleFlashlight={handleToggleFlashlight}
          onInteract={handleInteract}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* 4. Pause Menu */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onQuit={handleQuitToTitle}
          difficulty={difficulty}
          onDifficultyChange={handleDifficultyChange}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          sensitivity={sensitivity}
          onSensitivityChange={handleSensitivityChange}
        />
      )}

      {/* 5. Game Over Modal */}
      {gameState === 'GAMEOVER' && (
        <GameOverModal
          survivedTime={hudData.survivedTime}
          keysCollected={hudData.keysCollected}
          totalKeys={hudData.totalKeys}
          onRestart={handleRestart}
          onQuit={handleQuitToTitle}
        />
      )}

      {/* 6. Victory Modal */}
      {gameState === 'VICTORY' && (
        <VictoryModal
          survivedTime={hudData.survivedTime}
          difficulty={difficulty}
          onRestart={handleRestart}
          onQuit={handleQuitToTitle}
        />
      )}
    </div>
  );
}
