/**
 * LLM AI Function Director Engine
 * Coordinates local LLM endpoints (Ollama, LM Studio, OpenAI-compatible APIs)
 * and an advanced human-like multi-lingual conversational & semantic intent engine
 * powered by the modular Tool Registry.
 */

import { ToolRegistry } from './director/ToolRegistry.js';
import { DisplayTools } from './director/domains/DisplayTools.js';
import { AtmosphereTools } from './director/domains/AtmosphereTools.js';
import { PhysicsTools } from './director/domains/PhysicsTools.js';
import { LightingTools } from './director/domains/LightingTools.js';
import { SoundTools } from './director/domains/SoundTools.js';

export class LLMDirectorEngine {
  constructor(deps = {}) {
    this.currentSettings = deps.currentSettings || {};
    this.saveSettingsFile = deps.saveSettingsFile || (() => {});
    this.showSpeechBubble = deps.showSpeechBubble || null;
    this.callbacks = deps.callbacks || {};

    this.endpointUrl = this.currentSettings.aiEndpointUrl || 'http://localhost:11434/v1';
    this.modelName = this.currentSettings.aiModelName || 'llama3.2';
    this.isEnabled = this.currentSettings.aiDirectorEnabled !== false;

    // Initialize Modular Tool Registry & Register Domain Modules
    this.registry = new ToolRegistry({
      currentSettings: this.currentSettings,
      saveSettingsFile: this.saveSettingsFile,
      showSpeechBubble: this.showSpeechBubble,
      callbacks: this.callbacks
    });

    this.registry.registerDomain('display', DisplayTools);
    this.registry.registerDomain('atmosphere', AtmosphereTools);
    this.registry.registerDomain('physics', PhysicsTools);
    this.registry.registerDomain('lighting', LightingTools);
    this.registry.registerDomain('sound', SoundTools);

    this.conversationHistory = [
      {
        role: 'system',
        content: `You are an intelligent, warm, witty, and helpful AI Companion living inside Desktop Pet 3D Display.
You can chat like a real human about any topic (science, coding, philosophy, creative writing, daily life, jokes, or music) while also acting as the direct controller for this 3D desktop companion app.
When the user asks you to adjust or tweak the 3D mascot or app settings (even in abstract, casual, or slang ways like "what about scale the app size a bit and turn of sakura"), you interpret their intent, call the appropriate tool functions, and respond in a natural, friendly, human-like voice.`
      }
    ];

    this.toolDefinitions = this.registry.getOpenAISchemas();
    this.diagnosticLogs = [];
  }

  /**
   * Execute a tool safely through the ToolRegistry guardrail pipeline.
   */
  executeTool(toolName, args = {}) {
    const result = this.registry.execute(toolName, args);
    return result.success && result.actionTaken ? [result.actionTaken] : [];
  }

  /**
   * Multi-lingual semantic intent parser delegation.
   */
  parseHeuristicIntent(userMessage) {
    const matchResult = this.registry.matchSemanticIntent(userMessage);
    const actionsSummary = matchResult.actionsSummary || [];
    const isChinese = matchResult.isChinese;
    const raw = (userMessage || '').trim();
    const text = raw.toLowerCase();

    const hasAny = (...words) => words.some(w => text.includes(w.toLowerCase()));

    let replyText = '';

    if (actionsSummary.length > 0) {
      if (isChinese) {
        const intros = ['好嘞！', '没问题！', '收到！', '搞定！', '马上为你调整！'];
        const intro = intros[Math.floor(Math.random() * intros.length)];
        const actionsStr = actionsSummary.join('，并');
        replyText = `${intro}我已经为你${actionsStr}。看起来怎么样？如果还需要任何微调随时告诉我！✨`;
      } else {
        const intros = ['Sure thing!', 'You got it!', 'All done!', 'Right away!', 'Consider it done!'];
        const intro = intros[Math.floor(Math.random() * intros.length)];
        const actionsStr = actionsSummary.join(' and ');
        replyText = `${intro} I've ${actionsStr} for you. How does that look? Feel free to let me know if you want any other tweaks! ✨`;
      }
    } else {
      // General Human Conversation
      if (hasAny('how are you', 'how are u', 'how r u', '你好吗', '最近怎么样')) {
        replyText = isChinese
          ? '我很好呀！正元气满满地在你的桌面上待命呢。今天有什么我可以帮你的吗？😊'
          : "I'm doing great! Floating happily right here on your desktop. How is your day going? Anything on your mind or anything you'd like to adjust? 😊";
      } else if (hasAny('who are you', 'what are you', '你是谁', '你的名字')) {
        replyText = isChinese
          ? '我是你的 3D 桌面智能伴侣与 AI 指令官！我可以和你聊天交流，也可以实时控制这个桌面宠物的尺寸、动作、物理重力、旋转和天气特效。🤖'
          : "I'm your 3D Desktop Companion and AI Director! I can chat with you about anything, brainstorm ideas, tell jokes, and also control this 3D companion's scale, physics, spin, and weather effects in real time. 🤖";
      } else if (hasAny('joke', 'tell me a joke', '笑话', '讲个笑话')) {
        replyText = isChinese
          ? '为什么 3D 建模师很容易交到朋友？\n因为他们总是懂得“换位思考”和“全局透视”！😄\n想让咱们的模型转起来或者换个氛围吗？'
          : "Why do 3D animators make great friends?\nBecause they always know how to keep things in perspective! 😄\nWant me to make our mascot spin or change the weather for you?";
      } else if (hasAny('meaning of life', '生命的意义', '宇宙的奥秘')) {
        replyText = isChinese
          ? '除了经典的 42 之外，我认为最棒的意义就是享受当下的创造、与有趣的人事物相遇，以及在电脑桌面上拥有一只可爱的 3D 伴侣！✨'
          : "Aside from the classic 42, I think it's all about creating cool things, enjoying the moment, and having a lively 3D companion hanging out on your screen! ✨";
      } else if (/\b(hi|hello|hey|greetings|howdy)\b/i.test(text) || ['你好', '您好', '哈喽', '早安', '晚安'].some(w => text.includes(w))) {
        replyText = isChinese
          ? '嗨！很高兴和你聊天！你可以随意问我问题，或者直接告诉我想要调整的效果（比如：“放大一点”、“转快点”、“开个重力”或“下点樱花雨”）。'
          : "Hey there! Great to chat with you! Feel free to ask me anything or tell me how you want your 3D companion to look (like: 'scale up a bit', 'spin faster', 'turn on gravity', or 'let it snow').";
      } else if (hasAny('how can i use', 'use this app', 'working', 'coding', 'work', 'code', '工作', '写代码', '怎么用', '如何使用')) {
        replyText = isChinese
          ? '💻 推荐的工作伴侣用法：\n1. **鼠标穿透模式**：在【System】标签页开启“Ignore Mouse”，宠物会优雅浮在桌面最上层，不影响你的代码点击！\n2. **专注氛围**：开启柔和飘雪或樱花雨，搭配白噪音提升专注力。\n3. **灵感微休**：写代码累了按 A-K 键弹奏 10 秒钢琴，快速放松大脑！🎵'
          : "💻 Great ways to use me while working or coding:\n1. **Click-Through Mode**: Enable 'Ignore Mouse' in the System tab so you can click right through the window into your IDE without any interruptions!\n2. **Ambient Focus**: Turn on gentle snowfall or sakura rain for a cozy, peaceful coding atmosphere.\n3. **Micro-Piano Breaks**: Tap keys `A-K` for a quick 10-second acoustic piano session whenever you need a mental refresh! 🚀";
      } else if (/\b(help|what can you do)\b/i.test(text) || ['帮助', '你能做什么', '功能'].some(w => text.includes(w))) {
        replyText = isChinese
          ? '💡 我是全能的 AI 桌面伴侣，你可以：\n• 自然聊天：“讲个笑话”、“今天过得怎么样”\n• 尺寸控制：“稍微放大一点”、“缩小到 0.8x”\n• 动态效果：“开启浮动”、“让模型旋转快点”\n• 物理模拟：“开启重力物理”、“开启地板碰撞”\n• 氛围特效：“下点樱花雨”、“开启飘雪效果”\n• 视角复位：“居中重置”'
          : '💡 I can chat with you like a human assistant and also control your 3D pet:\n• Casual Chat: Ask me questions, tell jokes, or brainstorm!\n• Scale: "make it a bit bigger", "shrink to 0.8x"\n• Motion: "start floating", "spin faster on Y"\n• Physics: "enable gravity physics", "floor bounce"\n• Weather: "turn on sakura rain", "let it snow"\n• Camera: "reset center"';
      } else {
        replyText = isChinese
          ? `收到你的消息了！无论是日常聊天交流，还是想对 3D 宠物进行任何微调（比如缩放尺寸、旋转速度、重力或天气），我都随时为你效劳！😊`
          : `Got it! I'm here to chat about anything or help you tune your 3D companion (like adjusting size, rotation, gravity physics, or weather particles). What would you like to explore next? 😊`;
      }
    }

    return {
      text: replyText.trim(),
      toolCalls: matchResult.toolCalls
    };
  }

  /**
   * Parse potential JSON or functional tool calls from LLM output text.
   */
  _extractInTextToolCalls(text) {
    const extracted = [];
    if (!text) return extracted;

    // JSON blocks ```json { ... } ``` or { "name": ..., "args": ... }
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
    let match;
    while ((match = jsonBlockRegex.exec(text)) !== null) {
      try {
        const obj = JSON.parse(match[1]);
        if (obj.name && (obj.args || obj.parameters)) {
          extracted.push({ name: obj.name, args: obj.args || obj.parameters });
        } else if (Array.isArray(obj)) {
          obj.forEach(item => {
            if (item.name) extracted.push({ name: item.name, args: item.args || item.parameters || {} });
          });
        }
      } catch (e) {}
    }

    // Function calls setModelScale(scale=1.5)
    const funcRegex = /\b(setModelScale|setBobbing|setSpinRotation|setPhysics|setWeather|setActiveModel|setTargetFps|resetPosition|setLighting|setSoundVolume)\s*\(([\s\S]*?)\)/gi;
    let funcMatch;
    while ((funcMatch = funcRegex.exec(text)) !== null) {
      const name = funcMatch[1];
      const rawArgs = funcMatch[2].trim();
      let args = {};
      try {
        if (rawArgs.startsWith('{')) {
          args = JSON.parse(rawArgs);
        } else if (rawArgs.includes('=')) {
          const parts = rawArgs.split(',');
          parts.forEach(p => {
            const [k, v] = p.split('=').map(s => s.trim());
            if (k && v) {
              if (v === 'true') args[k] = true;
              else if (v === 'false') args[k] = false;
              else if (!isNaN(parseFloat(v))) args[k] = parseFloat(v);
              else args[k] = v.replace(/['"]/g, '');
            }
          });
        } else if (!isNaN(parseFloat(rawArgs))) {
          if (name === 'setModelScale') args = { scale: parseFloat(rawArgs) };
          if (name === 'setTargetFps') args = { targetFps: parseInt(rawArgs, 10) };
        }
      } catch (e) {}
      extracted.push({ name, args });
    }

    return extracted;
  }

  /**
   * Main Dispatch: Processes user message through local LLM endpoint and/or semantic NLP engine.
   */
  async processUserMessage(userText) {
    if (!userText || !userText.trim()) return null;

    const userMessageObj = { role: 'user', content: userText };
    this.conversationHistory.push(userMessageObj);

    let responseText = '';
    let executedActions = [];

    // Semantic heuristic analysis
    const heuristic = this.parseHeuristicIntent(userText);

    // Try Local LLM endpoint if configured
    let llmSucceeded = false;
    if (this.endpointUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

        const endpoint = this.endpointUrl.replace(/\/+$/, '') + '/chat/completions';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: this.modelName || 'llama3.2',
            messages: this.conversationHistory.slice(-8),
            tools: this.toolDefinitions,
            temperature: 0.7
          })
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const choice = data.choices && data.choices[0];
          if (choice && choice.message) {
            responseText = choice.message.content || '';
            const toolCalls = choice.message.tool_calls;
            if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
              toolCalls.forEach(tc => {
                const name = tc.function.name;
                let args = {};
                try {
                  args = JSON.parse(tc.function.arguments);
                } catch (e) {}
                const actions = this.executeTool(name, args);
                executedActions.push(...actions);
              });
            } else {
              // Check for in-text function calls from LLM output
              const inTextCalls = this._extractInTextToolCalls(responseText);
              inTextCalls.forEach(tc => {
                const actions = this.executeTool(tc.name, tc.args);
                executedActions.push(...actions);
              });
            }
            llmSucceeded = true;
          }
        }
      } catch (err) {
        // Local endpoint offline or timed out
      }
    }

    // If LLM did not execute tools, apply the semantic heuristic tool calls!
    if (executedActions.length === 0 && heuristic.toolCalls && heuristic.toolCalls.length > 0) {
      heuristic.toolCalls.forEach(tc => {
        const actions = this.executeTool(tc.name, tc.args);
        executedActions.push(...actions);
      });
    }

    // If LLM was offline or empty response, use heuristic response text
    if (!llmSucceeded || !responseText || !responseText.trim()) {
      responseText = heuristic.text;
    }

    const assistantMessageObj = {
      role: 'assistant',
      content: responseText,
      actions: executedActions
    };
    this.conversationHistory.push(assistantMessageObj);

    // Record turn to diagnostic audit log
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      userInput: userText,
      engineMode: llmSucceeded ? 'local_llm' : 'semantic_heuristic_fallback',
      endpointUrl: this.endpointUrl,
      modelName: this.modelName,
      assistantResponse: responseText,
      proposedToolCalls: heuristic.toolCalls || [],
      executedActions: executedActions,
      stateSnapshot: {
        scale: this.currentSettings.scale,
        bobbing: this.currentSettings.bobbing,
        spinY: this.currentSettings.spinY,
        speedY: this.currentSettings.speedY,
        sakuraRain: this.currentSettings.sakuraRain,
        snowFall: this.currentSettings.snowFall,
        enablePhysics: this.currentSettings.enablePhysics,
        physicsGravity: this.currentSettings.physicsGravity,
        targetFps: this.currentSettings.targetFps,
        activeModel: this.currentSettings.activeModel
      }
    };
    this.diagnosticLogs.push(logEntry);

    return assistantMessageObj;
  }

  /**
   * Generates a comprehensive, formatted markdown diagnostic report of all interactions.
   */
  getFormattedReport() {
    let report = `# 🤖 AI Director Diagnostic Log Report\n`;
    report += `**Generated Timestamp:** ${new Date().toISOString()}\n`;
    report += `**Active Model:** \`${this.modelName || 'llama3.2'}\`\n`;
    report += `**Endpoint URL:** \`${this.endpointUrl || 'offline'}\`\n`;
    report += `**Total Recorded Turns:** ${this.diagnosticLogs.length}\n\n`;
    report += `=======================================================\n\n`;

    if (this.diagnosticLogs.length === 0) {
      report += `*No interactions recorded yet. Type a command in the chat box to record diagnostic logs.*\n`;
      return report;
    }

    this.diagnosticLogs.forEach((log, idx) => {
      report += `### [Turn #${idx + 1}] — ${log.timestamp}\n`;
      report += `- **👤 User Input:** "${log.userInput}"\n`;
      report += `- **⚙️ Engine Mode:** \`${log.engineMode}\`\n`;
      report += `- **🤖 Assistant Reply:**\n> ${log.assistantResponse.replace(/\n/g, '\n> ')}\n`;
      report += `- **⚡ Executed Actions:** ${log.executedActions.length > 0 ? log.executedActions.map(a => `\`${a}\``).join(', ') : '*(None / Pure Conversation)*'}\n`;
      report += `- **📊 State Snapshot:** \`${JSON.stringify(log.stateSnapshot)}\`\n\n`;
      report += `---\n\n`;
    });

    return report;
  }

  clearDiagnosticLogs() {
    this.diagnosticLogs = [];
  }
}

