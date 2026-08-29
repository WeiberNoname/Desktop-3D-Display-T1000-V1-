/**
 * AI Function Director Tab UI Controller
 * Manages chat interface, local LLM endpoint configurations, prompt chips,
 * and live visual feedback for executed Display & Model functions.
 */

import { LLMDirectorEngine } from '../core/LLMDirectorEngine.js';

export function setupAIDirectorTabUI(deps) {
  const {
    currentSettings,
    saveSettingsFile,
    t,
    showSpeechBubble,
    callbacks = {}
  } = deps;

  const engine = new LLMDirectorEngine({
    currentSettings,
    saveSettingsFile,
    showSpeechBubble,
    callbacks
  });

  // DOM Elements
  const enableToggle = document.getElementById('ai-director-enable');
  const endpointInput = document.getElementById('ai-endpoint-url');
  const modelInput = document.getElementById('ai-model-name');
  const providerSelect = document.getElementById('ai-provider-select');
  const settingsAccordion = document.getElementById('ai-settings-panel');
  const btnToggleConfig = document.getElementById('btn-ai-toggle-config');

  const chatMessages = document.getElementById('ai-chat-messages');
  const chatInput = document.getElementById('ai-chat-input');
  const btnSend = document.getElementById('btn-ai-send');
  const btnClearChat = document.getElementById('btn-ai-clear');
  const promptChips = document.querySelectorAll('.ai-prompt-chip');

  // 1. Settings & Endpoint Controls
  if (enableToggle) {
    enableToggle.checked = currentSettings.aiDirectorEnabled !== false;
    enableToggle.addEventListener('change', () => {
      currentSettings.aiDirectorEnabled = enableToggle.checked;
      engine.isEnabled = enableToggle.checked;
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (endpointInput) {
    endpointInput.value = currentSettings.aiEndpointUrl || 'http://localhost:11434/v1';
    endpointInput.addEventListener('change', () => {
      currentSettings.aiEndpointUrl = endpointInput.value.trim();
      engine.endpointUrl = currentSettings.aiEndpointUrl;
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (modelInput) {
    modelInput.value = currentSettings.aiModelName || 'llama3.2';
    modelInput.addEventListener('change', () => {
      currentSettings.aiModelName = modelInput.value.trim();
      engine.modelName = currentSettings.aiModelName;
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (providerSelect) {
    providerSelect.addEventListener('change', () => {
      const p = providerSelect.value;
      if (p === 'ollama') {
        endpointInput.value = 'http://localhost:11434/v1';
        modelInput.value = 'llama3.2';
      } else if (p === 'lmstudio') {
        endpointInput.value = 'http://localhost:1234/v1';
        modelInput.value = 'qwen2.5-7b-instruct';
      } else if (p === 'custom') {
        endpointInput.value = 'http://localhost:8080/v1';
      }
      currentSettings.aiEndpointUrl = endpointInput.value;
      currentSettings.aiModelName = modelInput.value;
      engine.endpointUrl = currentSettings.aiEndpointUrl;
      engine.modelName = currentSettings.aiModelName;
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (btnToggleConfig && settingsAccordion) {
    btnToggleConfig.addEventListener('click', () => {
      const isHidden = settingsAccordion.style.display === 'none';
      settingsAccordion.style.display = isHidden ? 'block' : 'none';
      btnToggleConfig.innerText = isHidden ? (t ? t('ai_hide_config', '⚙️ Hide Config') : '⚙️ Hide Config') : (t ? t('ai_config', '⚙️ LLM Config') : '⚙️ LLM Config');
    });
  }

  // 2. Chat Rendering Helpers
  const scrollToBottom = () => {
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  };

  const appendMessage = (role, text, actions = []) => {
    if (!chatMessages) return;

    const msgEl = document.createElement('div');
    msgEl.className = role === 'user' ? 'ai-msg-bubble ai-msg-user' : 'ai-msg-bubble ai-msg-bot';

    const avatar = document.createElement('span');
    avatar.className = 'ai-msg-avatar';
    avatar.innerText = role === 'user' ? '👤' : '🤖';

    const body = document.createElement('div');
    body.className = 'ai-msg-body';

    const textEl = document.createElement('div');
    textEl.className = 'ai-msg-text';
    textEl.innerText = text;
    body.appendChild(textEl);

    // Render action badges if functions were executed
    if (actions && actions.length > 0) {
      const actionsWrapper = document.createElement('div');
      actionsWrapper.className = 'ai-actions-container';
      actions.forEach(act => {
        const badge = document.createElement('span');
        badge.className = 'ai-action-badge';
        badge.innerHTML = `⚡ <strong>${act}</strong>`;
        actionsWrapper.appendChild(badge);
      });
      body.appendChild(actionsWrapper);
    }

    msgEl.appendChild(avatar);
    msgEl.appendChild(body);
    chatMessages.appendChild(msgEl);
    scrollToBottom();
  };

  const showTypingIndicator = () => {
    if (!chatMessages) return null;
    const indicator = document.createElement('div');
    indicator.className = 'ai-msg-bubble ai-msg-bot ai-typing-indicator';
    indicator.id = 'ai-typing-temp';
    indicator.innerHTML = `
      <span class="ai-msg-avatar">🤖</span>
      <div class="ai-msg-body">
        <div class="ai-typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    chatMessages.appendChild(indicator);
    scrollToBottom();
    return indicator;
  };

  const removeTypingIndicator = () => {
    const el = document.getElementById('ai-typing-temp');
    if (el) el.remove();
  };

  // 3. Send Message Handler
  const handleSendMessage = async (customText = null) => {
    const text = customText || (chatInput ? chatInput.value.trim() : '');
    if (!text) return;

    if (chatInput) chatInput.value = '';

    appendMessage('user', text);
    showTypingIndicator();

    if (btnSend) btnSend.disabled = true;

    try {
      const response = await engine.processUserMessage(text);
      removeTypingIndicator();
      if (response) {
        appendMessage('assistant', response.content, response.actions);
      }
    } catch (err) {
      removeTypingIndicator();
      appendMessage('assistant', `Error processing command: ${err.message}`);
    } finally {
      if (btnSend) btnSend.disabled = false;
      if (chatInput) chatInput.focus();
    }
  };

  if (btnSend) {
    btnSend.addEventListener('click', () => handleSendMessage());
  }

  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }

  // Quick Prompt Chips
  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt || chip.innerText.trim();
      handleSendMessage(prompt);
    });
  });

  if (btnClearChat) {
    btnClearChat.addEventListener('click', () => {
      if (chatMessages) {
        chatMessages.innerHTML = `
          <div class="ai-msg-bubble ai-msg-bot">
            <span class="ai-msg-avatar">🤖</span>
            <div class="ai-msg-body">
              <div class="ai-msg-text" data-i18n="ai_welcome_msg">
                Hello! I am your AI Function Director. Tell me what you'd like to adjust (scale, rotation, physics, sakura rain, model, or camera) and I'll execute it for you!
              </div>
            </div>
          </div>
        `;
      }
      engine.clearDiagnosticLogs();
    });
  }

  // 4. Diagnostic Report & Audit Logger
  const btnCopyReport = document.getElementById('btn-ai-copy-report');
  const btnToggleReport = document.getElementById('btn-ai-toggle-report');
  const reportBox = document.getElementById('ai-report-viewer-box');
  const reportTextarea = document.getElementById('ai-report-viewer');

  if (btnCopyReport) {
    btnCopyReport.addEventListener('click', async () => {
      const report = engine.getFormattedReport();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(report);
        } else if (reportTextarea) {
          reportTextarea.value = report;
          reportTextarea.select();
          document.execCommand('copy');
        }
        btnCopyReport.innerText = t ? t('ai_report_copied', 'Copied to Clipboard! ✅') : 'Copied to Clipboard! ✅';
        if (showSpeechBubble) {
          showSpeechBubble('AI Report Copied!\nPaste it here to optimize! 📋', 3500);
        }
        setTimeout(() => {
          btnCopyReport.innerText = t ? t('ai_btn_copy_report', '📋 Copy Diagnostic Report') : '📋 Copy Diagnostic Report';
        }, 2500);
      } catch (err) {
        console.warn('Clipboard write failed:', err);
      }
    });
  }

  if (btnToggleReport && reportBox) {
    btnToggleReport.addEventListener('click', () => {
      const isHidden = reportBox.style.display === 'none';
      reportBox.style.display = isHidden ? 'block' : 'none';
      if (isHidden && reportTextarea) {
        reportTextarea.value = engine.getFormattedReport();
      }
      btnToggleReport.innerText = isHidden ? (t ? t('ai_hide_log', '❌ Hide Log') : '❌ Hide Log') : (t ? t('ai_btn_view_report', '🔍 View Log') : '🔍 View Log');
    });
  }
}

