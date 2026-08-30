/**
 * AI Function Director Tab UI Controller
 * Manages conversational chat interface, dynamic AI Mode Indicator (Local LLM vs. Fallback),
 * and centralized neural LLM configuration synchronization.
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

  const engine = deps.engine || new LLMDirectorEngine({
    currentSettings,
    saveSettingsFile,
    showSpeechBubble,
    callbacks
  });

  // DOM Elements - System Tab Configuration Card
  const enableToggle = document.getElementById('ai-director-enable');
  const contextRetrievalToggle = document.getElementById('ai-context-retrieval-enable');
  const endpointInput = document.getElementById('ai-endpoint-url');
  const modelInput = document.getElementById('ai-model-name');
  const providerSelect = document.getElementById('ai-provider-select');
  const retrieverPresetSelect = document.getElementById('ai-retriever-preset');
  const customRetrieverBox = document.getElementById('ai-custom-retriever-box');
  const retrieverEndpointInput = document.getElementById('ai-retriever-endpoint');
  const apiKeyInput = document.getElementById('ai-api-key');

  const statusBadge = document.getElementById('ai-connection-status-badge');
  const statusText = document.getElementById('ai-status-text');
  const btnPing = document.getElementById('btn-ai-ping-endpoint');

  // DOM Elements - AI Director Chat Tab
  const modeIndicator = document.getElementById('ai-mode-indicator');
  const chatMessages = document.getElementById('ai-chat-messages');
  const chatInput = document.getElementById('ai-chat-input');
  const btnSend = document.getElementById('btn-ai-send');
  const btnClearChat = document.getElementById('btn-ai-clear');

  // Update AI Mode Indicator Badge UI
  const setModeIndicatorState = (isNeural, modelName = '') => {
    if (!modeIndicator) return;
    if (isNeural) {
      modeIndicator.textContent = `🟢 Local LLM (${modelName || engine.modelName || 'Neural'})`;
      modeIndicator.style.background = 'rgba(16, 185, 129, 0.18)';
      modeIndicator.style.color = '#34d399';
      modeIndicator.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else {
      modeIndicator.textContent = '⚡ Fallback Mode';
      modeIndicator.style.background = 'rgba(245, 158, 11, 0.18)';
      modeIndicator.style.color = '#fbbf24';
      modeIndicator.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    }
  };

  // 1. Settings & Endpoint Controls
  if (enableToggle) {
    enableToggle.checked = currentSettings.aiDirectorEnabled !== false;
    enableToggle.addEventListener('change', () => {
      currentSettings.aiDirectorEnabled = enableToggle.checked;
      engine.isEnabled = enableToggle.checked;
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (contextRetrievalToggle) {
    contextRetrievalToggle.checked = currentSettings.aiContextRetrievalEnabled !== false;
    contextRetrievalToggle.addEventListener('change', () => {
      currentSettings.aiContextRetrievalEnabled = contextRetrievalToggle.checked;
      engine.isContextRetrievalEnabled = contextRetrievalToggle.checked;
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (endpointInput) {
    endpointInput.value = currentSettings.aiEndpointUrl || 'http://localhost:11434/v1';
    endpointInput.addEventListener('change', () => {
      currentSettings.aiEndpointUrl = endpointInput.value.trim();
      engine.endpointUrl = currentSettings.aiEndpointUrl;
      if (saveSettingsFile) saveSettingsFile();
      checkEndpointConnection();
    });
  }

  if (modelInput) {
    modelInput.value = currentSettings.aiModelName || 'llama3.2';
    modelInput.addEventListener('change', () => {
      currentSettings.aiModelName = modelInput.value.trim();
      engine.modelName = currentSettings.aiModelName;
      if (saveSettingsFile) saveSettingsFile();
      checkEndpointConnection();
    });
  }

  if (apiKeyInput) {
    apiKeyInput.value = currentSettings.aiApiKey || '';
    apiKeyInput.addEventListener('change', () => {
      currentSettings.aiApiKey = apiKeyInput.value.trim();
      engine.apiKey = currentSettings.aiApiKey;
      if (saveSettingsFile) saveSettingsFile();
      checkEndpointConnection();
    });
  }

  async function checkEndpointConnection() {
    if (statusText) statusText.textContent = '🔄 Testing connection to ' + (endpointInput ? endpointInput.value : 'endpoint') + '...';
    if (statusBadge) {
      statusBadge.style.background = 'rgba(148, 163, 184, 0.15)';
      statusBadge.style.borderColor = 'rgba(148, 163, 184, 0.35)';
      statusBadge.style.color = '#cbd5e1';
    }

    try {
      const ep = (endpointInput ? endpointInput.value : 'http://localhost:11434/v1').replace(/\/+$/, '') + '/chat/completions';
      const key = apiKeyInput ? apiKeyInput.value.trim() : '';
      const currentModel = modelInput ? modelInput.value.trim() : 'llama3.2';
      const headers = { 'Content-Type': 'application/json' };
      if (key) headers['Authorization'] = `Bearer ${key}`;

      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(ep, {
        method: 'POST',
        headers,
        signal: ctrl.signal,
        body: JSON.stringify({
          model: currentModel,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5
        })
      });
      clearTimeout(tid);

      if (res.ok || res.status === 400 || res.status === 422) {
        if (statusText) statusText.textContent = `🟢 Connected! Real Neural LLM is active (${currentModel})`;
        if (statusBadge) {
          statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
          statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          statusBadge.style.color = '#34d399';
        }
        setModeIndicatorState(true, currentModel);
      } else if (res.status === 404) {
        if (statusText) statusText.textContent = `⚠️ Model "${currentModel}" not found on server (404). Pull with: ollama run ${currentModel}`;
        if (statusBadge) {
          statusBadge.style.background = 'rgba(245, 158, 11, 0.12)';
          statusBadge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
          statusBadge.style.color = '#fbbf24';
        }
        setModeIndicatorState(false);
      } else if (res.status === 401 || res.status === 403) {
        if (statusText) statusText.textContent = `⚠️ Authentication Failed (${res.status}). Please check your API key in LLM Config.`;
        if (statusBadge) {
          statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
          statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          statusBadge.style.color = '#f87171';
        }
        setModeIndicatorState(false);
      } else {
        if (statusText) statusText.textContent = `⚠️ Endpoint returned HTTP ${res.status}. Falling back to offline rule engine.`;
        if (statusBadge) {
          statusBadge.style.background = 'rgba(245, 158, 11, 0.12)';
          statusBadge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
          statusBadge.style.color = '#fbbf24';
        }
        setModeIndicatorState(false);
      }
    } catch (e) {
      if (statusText) statusText.textContent = `⚡ Offline Fallback Mode (Cannot reach ${endpointInput ? endpointInput.value : 'endpoint'})`;
      if (statusBadge) {
        statusBadge.style.background = 'rgba(245, 158, 11, 0.12)';
        statusBadge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
        statusBadge.style.color = '#fbbf24';
      }
      setModeIndicatorState(false);
    }
  }

  if (btnPing) {
    btnPing.addEventListener('click', () => checkEndpointConnection());
  }

  // Initial connection check on startup
  setTimeout(checkEndpointConnection, 800);

  if (providerSelect) {
    if (currentSettings.aiProvider) {
      providerSelect.value = currentSettings.aiProvider;
    }
    providerSelect.addEventListener('change', () => {
      const p = providerSelect.value;
      currentSettings.aiProvider = p;
      if (p === 'ollama') {
        if (endpointInput) endpointInput.value = 'http://localhost:11434/v1';
        if (modelInput) modelInput.value = 'llama3.2';
      } else if (p === 'lmstudio') {
        if (endpointInput) endpointInput.value = 'http://localhost:1234/v1';
        if (modelInput) modelInput.value = 'qwen2.5-7b-instruct';
      } else if (p === 'groq') {
        if (endpointInput) endpointInput.value = 'https://api.groq.com/openai/v1';
        if (modelInput) modelInput.value = 'llama-3.3-70b-versatile';
      } else if (p === 'openrouter') {
        if (endpointInput) endpointInput.value = 'https://openrouter.ai/api/v1';
        if (modelInput) modelInput.value = 'meta-llama/llama-3.2-3b-instruct:free';
      } else if (p === 'deepseek') {
        if (endpointInput) endpointInput.value = 'https://api.deepseek.com/v1';
        if (modelInput) modelInput.value = 'deepseek-chat';
      } else if (p === 'openai') {
        if (endpointInput) endpointInput.value = 'https://api.openai.com/v1';
        if (modelInput) modelInput.value = 'gpt-4o-mini';
      } else if (p === 'custom') {
        if (endpointInput) endpointInput.value = 'http://localhost:8080/v1';
      }
      if (endpointInput) currentSettings.aiEndpointUrl = endpointInput.value;
      if (modelInput) currentSettings.aiModelName = modelInput.value;
      engine.endpointUrl = currentSettings.aiEndpointUrl;
      engine.modelName = currentSettings.aiModelName;
      if (saveSettingsFile) saveSettingsFile();
      checkEndpointConnection();
    });
  }

  if (retrieverPresetSelect) {
    retrieverPresetSelect.value = currentSettings.aiRetrieverPreset || 'builtin_rag';
    if (customRetrieverBox) {
      customRetrieverBox.style.display = retrieverPresetSelect.value === 'custom_endpoint' ? 'block' : 'none';
    }
    retrieverPresetSelect.addEventListener('change', () => {
      currentSettings.aiRetrieverPreset = retrieverPresetSelect.value;
      engine.contextRetrieverPreset = retrieverPresetSelect.value;
      if (customRetrieverBox) {
        customRetrieverBox.style.display = retrieverPresetSelect.value === 'custom_endpoint' ? 'block' : 'none';
      }
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (retrieverEndpointInput) {
    retrieverEndpointInput.value = currentSettings.aiRetrieverEndpoint || 'http://localhost:11434/v1';
    retrieverEndpointInput.addEventListener('change', () => {
      currentSettings.aiRetrieverEndpoint = retrieverEndpointInput.value.trim();
      engine.contextRetrieverEndpoint = currentSettings.aiRetrieverEndpoint;
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  // 2. Chat UI Helpers
  const scrollToBottom = () => {
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  };

  const appendMessage = (role, text, actions = []) => {
    if (!chatMessages) return;

    const msgEl = document.createElement('div');
    msgEl.className = `ai-msg-bubble ai-msg-${role === 'user' ? 'user' : 'bot'}`;

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
        setModeIndicatorState(response.isNeural, engine.modelName);
      }
    } catch (err) {
      removeTypingIndicator();
      appendMessage('assistant', `Error processing command: ${err.message}`);
      setModeIndicatorState(false);
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

  return engine;
}
