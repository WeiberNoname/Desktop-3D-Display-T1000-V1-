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
  const contextRetrievalToggle = document.getElementById('ai-context-retrieval-enable');
  const endpointInput = document.getElementById('ai-endpoint-url');
  const modelInput = document.getElementById('ai-model-name');
  const providerSelect = document.getElementById('ai-provider-select');
  const retrieverPresetSelect = document.getElementById('ai-retriever-preset');
  const customRetrieverBox = document.getElementById('ai-custom-retriever-box');
  const retrieverEndpointInput = document.getElementById('ai-retriever-endpoint');
  const settingsAccordion = document.getElementById('ai-settings-panel');
  const btnToggleConfig = document.getElementById('btn-ai-toggle-config');

  const chatMessages = document.getElementById('ai-chat-messages');
  const chatInput = document.getElementById('ai-chat-input');
  const btnSend = document.getElementById('btn-ai-send');
  const btnClearChat = document.getElementById('btn-ai-clear');

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
    });
  }

  const apiKeyInput = document.getElementById('ai-api-key');
  if (apiKeyInput) {
    apiKeyInput.value = currentSettings.aiApiKey || '';
    apiKeyInput.addEventListener('change', () => {
      currentSettings.aiApiKey = apiKeyInput.value.trim();
      engine.apiKey = currentSettings.aiApiKey;
      if (saveSettingsFile) saveSettingsFile();
      checkEndpointConnection();
    });
  }

  const statusBadge = document.getElementById('ai-connection-status-badge');
  const statusText = document.getElementById('ai-status-text');
  const btnPing = document.getElementById('btn-ai-ping-endpoint');

  async function checkEndpointConnection() {
    if (!statusText || !statusBadge) return;
    statusText.textContent = '🔄 Testing connection to ' + (endpointInput ? endpointInput.value : 'endpoint') + '...';
    statusBadge.style.background = 'rgba(148, 163, 184, 0.15)';
    statusBadge.style.borderColor = 'rgba(148, 163, 184, 0.35)';
    statusBadge.style.color = '#cbd5e1';

    try {
      const ep = (endpointInput ? endpointInput.value : 'http://localhost:11434/v1').replace(/\/+$/, '') + '/chat/completions';
      const key = apiKeyInput ? apiKeyInput.value.trim() : '';
      const headers = { 'Content-Type': 'application/json' };
      if (key) headers['Authorization'] = `Bearer ${key}`;

      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch(ep, {
        method: 'POST',
        headers,
        signal: ctrl.signal,
        body: JSON.stringify({
          model: modelInput ? modelInput.value : 'llama3.2',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5
        })
      });
      clearTimeout(tid);

      if (res.ok || res.status === 400 || res.status === 422) {
        statusText.textContent = `🟢 Connected! Real Neural LLM is active (${modelInput ? modelInput.value : 'LLM'})`;
        statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        statusBadge.style.color = '#34d399';
      } else {
        statusText.textContent = `⚠️ Endpoint returned ${res.status}. Falling back to offline dictionary engine.`;
        statusBadge.style.background = 'rgba(245, 158, 11, 0.12)';
        statusBadge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
        statusBadge.style.color = '#fbbf24';
      }
    } catch (e) {
      statusText.textContent = `⚡ Offline Fallback Mode (No active LLM on ${endpointInput ? endpointInput.value : 'endpoint'})`;
      statusBadge.style.background = 'rgba(245, 158, 11, 0.12)';
      statusBadge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
      statusBadge.style.color = '#fbbf24';
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
        endpointInput.value = 'http://localhost:11434/v1';
        modelInput.value = 'llama3.2';
      } else if (p === 'lmstudio') {
        endpointInput.value = 'http://localhost:1234/v1';
        modelInput.value = 'qwen2.5-7b-instruct';
      } else if (p === 'groq') {
        endpointInput.value = 'https://api.groq.com/openai/v1';
        modelInput.value = 'llama-3.3-70b-versatile';
      } else if (p === 'openrouter') {
        endpointInput.value = 'https://openrouter.ai/api/v1';
        modelInput.value = 'meta-llama/llama-3.2-3b-instruct:free';
      } else if (p === 'deepseek') {
        endpointInput.value = 'https://api.deepseek.com/v1';
        modelInput.value = 'deepseek-chat';
      } else if (p === 'openai') {
        endpointInput.value = 'https://api.openai.com/v1';
        modelInput.value = 'gpt-4o-mini';
      } else if (p === 'custom') {
        endpointInput.value = 'http://localhost:8080/v1';
      }
      currentSettings.aiEndpointUrl = endpointInput.value;
      currentSettings.aiModelName = modelInput.value;
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

  // 4. Automated Batch Test Runner
  const DEFAULT_10_TEST_PROMPTS = [
    "scale up a bit and spin Y",
    "make the character twice as big",
    "turn on sakura sound at 30 percent",
    "I don't want to see sakura",
    "switch to waving flag with cyber neon preset",
    "increase wind speed to 5.5",
    "enable mouse click through mode",
    "make it peaceful for coding",
    "what is the current status",
    "reset all settings to default"
  ].join(' //test// ');

  const btnToggleBatch = document.getElementById('btn-ai-toggle-batch');
  const batchPanel = document.getElementById('ai-batch-test-panel');
  const batchInput = document.getElementById('ai-batch-prompts-input');
  const btnRunBatch = document.getElementById('btn-ai-run-batch-test');
  const btnResetBatch = document.getElementById('btn-ai-reset-batch-prompts');
  const batchProgress = document.getElementById('ai-batch-progress-bar');

  if (batchInput && !batchInput.value) {
    batchInput.value = DEFAULT_10_TEST_PROMPTS;
  }

  if (btnToggleBatch && batchPanel) {
    btnToggleBatch.addEventListener('click', () => {
      const isHidden = batchPanel.style.display === 'none';
      batchPanel.style.display = isHidden ? 'block' : 'none';
      btnToggleBatch.innerText = isHidden ? (t ? t('ai_btn_hide_batch', '🧪 Hide Auto Test') : '🧪 Hide Auto Test') : (t ? t('ai_btn_batch_test', '🧪 Auto Test') : '🧪 Auto Test');
    });
  }

  if (btnResetBatch && batchInput) {
    btnResetBatch.addEventListener('click', () => {
      batchInput.value = DEFAULT_10_TEST_PROMPTS;
      if (batchProgress) {
        batchProgress.style.display = 'none';
      }
    });
  }

  if (btnRunBatch) {
    btnRunBatch.addEventListener('click', async () => {
      const rawText = batchInput ? batchInput.value.trim() : '';
      if (!rawText) return;

      const prompts = rawText.split(/\/\/test\/\/|\r?\n/).map(p => p.trim()).filter(p => p.length > 0);
      if (prompts.length === 0) return;

      btnRunBatch.disabled = true;
      if (btnToggleBatch) btnToggleBatch.disabled = true;
      if (batchProgress) {
        batchProgress.style.display = 'block';
        batchProgress.innerText = `Starting batch test for ${prompts.length} prompts...`;
      }

      for (let i = 0; i < prompts.length; i++) {
        const p = prompts[i];
        if (batchProgress) {
          batchProgress.innerText = `⏳ Running [${i + 1}/${prompts.length}]: "${p}"...`;
        }
        await handleSendMessage(p);
        await new Promise(res => setTimeout(res, 280));
      }

      if (batchProgress) {
        batchProgress.innerText = `✅ Completed all ${prompts.length} prompts! Generating report...`;
      }

      // Automatically update & open the diagnostic report viewer
      const fullReport = engine.getFormattedReport();
      if (reportTextarea) {
        reportTextarea.value = fullReport;
      }
      if (reportBox) {
        reportBox.style.display = 'block';
      }
      if (btnToggleReport) {
        btnToggleReport.innerText = t ? t('ai_hide_log', '❌ Hide Log') : '❌ Hide Log';
      }

      // Automatically copy the report to clipboard
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(fullReport);
        } else if (reportTextarea) {
          reportTextarea.select();
          document.execCommand('copy');
        }
        if (batchProgress) {
          batchProgress.innerText = `🎉 All ${prompts.length} tests finished & full report COPIED to clipboard!`;
        }
        if (showSpeechBubble) {
          showSpeechBubble(`Automated Test Complete!\n${prompts.length} Prompts Log Copied! 📋`, 4000);
        }
      } catch (e) {
        console.warn('Clipboard write error:', e);
      }

      btnRunBatch.disabled = false;
      if (btnToggleBatch) btnToggleBatch.disabled = false;
    });
  }

  // 5. Diagnostic Report & Audit Logger
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

