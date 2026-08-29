/**
 * Mascot Reaction & Viewport Resizing Module (<70 lines)
 * Encapsulates mascot click reaction speech bubbles, animation cross-fades,
 * click count persistence, and Three.js camera aspect ratio viewport resizing.
 */

import { soundManager } from './SoundManager.js';

export function triggerInteraction(deps) {
  const {
    animationState,
    mixer,
    reactAction,
    idleAction,
    showSpeechBubble,
    currentSettings,
    saveSettingsFile
  } = deps;

  soundManager.resumeAudioContext();
  soundManager.playInteractionSfx();

  if (animationState.type === 'interact') return;

  animationState.type = 'interact';
  animationState.startTime = Date.now();

  if (mixer) {
    if (reactAction && idleAction) {
      reactAction.reset();
      idleAction.crossFadeTo(reactAction, 0.15, true);
      reactAction.play();
    } else if (idleAction) {
      idleAction.timeScale = 2.0;
    }
  }

  const reactions = [
    "Wheee! 🚀",
    "Hold on tight! 🌪️",
    "Double flip! 💫",
    "That tickles! 😄",
    "Look at me! ✨",
    "Yippee! 🎉"
  ];
  const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
  if (showSpeechBubble) showSpeechBubble(randomReaction, 2000);

  if (currentSettings) {
    currentSettings.clickCount = (currentSettings.clickCount || 0) + 1;
    if (saveSettingsFile) saveSettingsFile();
  }
}

export function onWindowResize(deps) {
  const { camera, renderer } = deps;
  const container = document.getElementById('container');
  if (container && camera && renderer) {
    const w = container.clientWidth || (window.innerWidth - 20);
    const h = container.clientHeight || (window.innerHeight - 20);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
}
