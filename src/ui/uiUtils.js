/**
 * UI Utilities Module for Desktop Mascot Pet
 * Contains encapsulated DOM layout and control positioning helpers.
 */

/**
 * Updates the position of the settings gear icon and close button dynamically
 * based on the settingsLeft preference.
 * @param {Object} settings - The application settings object containing `settingsLeft`.
 */
export function updateGearPosition(settings) {
  const gearBtn = document.getElementById('settings-btn');
  const closeBtn = document.getElementById('app-close-btn');
  if (!gearBtn) return;

  const isLeft = Boolean(settings && settings.settingsLeft);

  if (isLeft) {
    gearBtn.style.left = '10px';
    gearBtn.style.right = 'auto';
    if (closeBtn) {
      closeBtn.style.left = '46px';
      closeBtn.style.right = 'auto';
    }
  } else {
    gearBtn.style.right = '46px';
    gearBtn.style.left = 'auto';
    if (closeBtn) {
      closeBtn.style.right = '10px';
      closeBtn.style.left = 'auto';
    }
  }
}

/**
 * Displays a speech bubble notification above the pet.
 * @param {string} text - Message text to display.
 * @param {number} duration - Duration in milliseconds before fading out (default: 2000ms).
 */
export function showSpeechBubble(text, duration = 2000) {
  let bubble = document.getElementById('speech-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'speech-bubble';
    bubble.className = 'speech-bubble hidden';
    document.body.appendChild(bubble);
  }

  bubble.innerText = text;
  bubble.classList.remove('hidden');
  bubble.style.opacity = '1.0';
  bubble.style.transition = 'opacity 0.2s ease';

  if (bubble.fadeTimeout) {
    clearTimeout(bubble.fadeTimeout);
  }

  bubble.fadeTimeout = setTimeout(() => {
    bubble.style.opacity = '0.0';
    setTimeout(() => {
      bubble.classList.add('hidden');
    }, 200);
  }, duration);
}
