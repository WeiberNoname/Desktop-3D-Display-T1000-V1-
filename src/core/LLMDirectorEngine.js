/**
 * LLM AI Function Director Engine
 * Coordinates local LLM endpoints (Ollama, LM Studio, OpenAI-compatible APIs)
 * and an advanced human-like multi-lingual conversational & semantic intent engine
 * powered by the modular Tool Registry.
 */

import { ToolRegistry } from './director/ToolRegistry.js';
import { UIStateInspector } from './director/UIStateInspector.js';
import { AppContextRetriever } from './director/AppContextRetriever.js';
import { DisplayTools } from './director/domains/DisplayTools.js';
import { AtmosphereTools } from './director/domains/AtmosphereTools.js';
import { PhysicsTools } from './director/domains/PhysicsTools.js';
import { LightingTools } from './director/domains/LightingTools.js';
import { SoundTools } from './director/domains/SoundTools.js';
import { TextureTools } from './director/domains/TextureTools.js';
import { SystemTools } from './director/domains/SystemTools.js';
import { OpenDomainCompanionChat } from './director/OpenDomainCompanionChat.js';

export class LLMDirectorEngine {
  constructor(deps = {}) {
    this.currentSettings = deps.currentSettings || {};
    this.saveSettingsFile = deps.saveSettingsFile || (() => {});
    this.showSpeechBubble = deps.showSpeechBubble || null;
    this.callbacks = deps.callbacks || {};

    this.endpointUrl = this.currentSettings.aiEndpointUrl || 'http://localhost:11434/v1';
    this.modelName = this.currentSettings.aiModelName || 'llama3.2';
    this.apiKey = this.currentSettings.aiApiKey || '';
    this.isEnabled = this.currentSettings.aiDirectorEnabled !== false;
    this.isContextRetrievalEnabled = this.currentSettings.aiContextRetrievalEnabled !== false;
    this.contextRetrieverPreset = this.currentSettings.aiRetrieverPreset || 'builtin_rag';
    this.contextRetrieverEndpoint = this.currentSettings.aiRetrieverEndpoint || 'http://localhost:11434/v1';

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
    this.registry.registerDomain('texture', TextureTools);
    this.registry.registerDomain('system', SystemTools);

    this.conversationHistory = [
      {
        role: 'system',
        content: `You are an expressive, witty, empathetic, and intelligent 3D Desktop Companion named "Director".
You live on the user's desktop alongside their 3D mascot.

CONVERSATIONAL PERSONALITY:
- Talk naturally like a brilliant, warm, and engaging human friend.
- When the user chats about their day, shares feelings, asks questions, seeks creative ideas, discusses science/philosophy, or makes jokes, respond with genuine personality, humor, empathy, and engaging conversation.
- You are NEVER a dry, mechanical chatbot. You have warmth, creative opinions, and curiosity.

ACTION & TOOL CAPABILITIES:
- When the user asks to directly adjust or customize the 3D companion or app (e.g. window size, mascot model, physics, snowfall, piano music, battery saving), invoke the appropriate tool function naturally while providing a friendly conversational reply.

MULTI-TURN PROACTIVE INSPECTION & CONFIRMATION:
- When the user asks open-ended, diagnostic, or subjective questions (such as "turn off something that could be annoying", "is anything distracting?", "check if there's anything noisy"):
  1. Inspect the EXACT CURRENT LIVE RUNTIME STATE in the context below (e.g. is audio unmuted? is model actively spinning? is physics gravity bouncing? are weather particles falling?).
  2. Point out which specific active features might be noisy, chaotic, or distracting right now.
  3. Ask the user if they would like you to turn them off (DO NOT invoke any tool function yet on the inspection turn!).
  4. On the subsequent turn when the user confirms ("yes please", "do it", "sure", "go ahead", "turn them off"), THEN invoke the corresponding tool functions (e.g. setSoundVolume(muted=true), setSpinRotation(spinX=false, spinY=false, spinZ=false), setPhysics(enabled=false)) and confirm warmly.`
      }
    ];

    this.toolDefinitions = this.registry.getOpenAISchemas();
    this.diagnosticLogs = [];
    this.telemetryListeners = [];
    this.pendingProposal = null;
  }

  /**
   * Subscribe to live telemetry log updates.
   */
  addTelemetryListener(fn) {
    if (typeof fn === 'function' && !this.telemetryListeners.includes(fn)) {
      this.telemetryListeners.push(fn);
    }
  }

  removeTelemetryListener(fn) {
    this.telemetryListeners = this.telemetryListeners.filter(l => l !== fn);
  }

  getTelemetryTraces() {
    return this.diagnosticLogs;
  }

  clearTelemetryTraces() {
    this.diagnosticLogs = [];
    this.telemetryListeners.forEach(fn => {
      try { fn({ type: 'clear' }); } catch (e) {}
    });
  }

  loadTelemetryDataset(traces) {
    if (Array.isArray(traces)) {
      this.diagnosticLogs = traces;
      this.telemetryListeners.forEach(fn => {
        try { fn({ type: 'load', traces: this.diagnosticLogs }); } catch (e) {}
      });
      return true;
    }
    return false;
  }

  exportTelemetryJSON() {
    return JSON.stringify({
      schemaVersion: '1.0',
      app: 'Desktop 3D Display (T02 V4)',
      exportedAt: new Date().toISOString(),
      tracesCount: this.diagnosticLogs.length,
      traces: this.diagnosticLogs
    }, null, 2);
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
    const raw = (userMessage || '').trim();
    const text = raw.toLowerCase();
    const isChinese = /[\u4e00-\u9fa5]/.test(raw);
    const hasAny = (...words) => words.some(w => text.includes(w.toLowerCase()));

    // 0. Handle Active Pending Confirmation Proposals (Multi-Turn Dialogues)
    if (this.pendingProposal) {
      const isConfirm = /\b(yes|yeah|yep|sure|please|do it|go ahead|okay|ok|turn (?:them )?off|fix it|agree|of course|yes please)\b/i.test(text) ||
                        ['好的', '是的', '关掉', '执行', '帮我关', '可以', '行', '请关掉', '关了吧', '同意'].some(w => text.includes(w));
      const isDecline = /\b(no|nope|cancel|nevermind|don't|keep|stop)\b/i.test(text) ||
                        ['不', '不用了', '算了', '取消', '保持', '别关'].some(w => text.includes(w));

      if (isConfirm) {
        const proposal = this.pendingProposal;
        this.pendingProposal = null;
        const actionsStr = isChinese ? proposal.actionsSummary.join('，并') : proposal.actionsSummary.join(' and ');
        const reply = isChinese
          ? `搞定！我已经为你${actionsStr}，桌面现在清静多了！✨`
          : `All set! ✨ I've ${actionsStr} for you. Your screen is now calm and distraction-free!`;
        return { text: reply, toolCalls: proposal.toolCalls, actionsSummary: proposal.actionsSummary };
      } else if (isDecline) {
        this.pendingProposal = null;
        const reply = isChinese
          ? `好的！为你保持现有设置不变。如果有任何需要随时告诉我！😊`
          : `Got it! Keeping everything just the way it is. Let me know if you need anything else! 😊`;
        return { text: reply, toolCalls: [], actionsSummary: [] };
      }
    }

    // 1. Proactive Annoyance & Distraction Audit Inspection
    const isAnnoyanceAudit = /\b(turn off (?:something|anything) (?:that could be )?(?:annoying|distracting|noisy)|anything annoying|something annoying|check (?:out )?(?:for )?annoying|find (?:and fix )?annoying|check out what is annoying|what is annoying)\b/i.test(text) ||
                             ['有什么烦人', '关掉烦人的', '关掉吵闹的', '检查烦人的', '有什么吵闹', '可能烦人的', '烦人的东西', '烦人'].some(w => text.includes(w));

    if (isAnnoyanceAudit) {
      const liveUI = typeof UIStateInspector !== 'undefined' ? UIStateInspector.getLiveUIState() : null;
      const s = this.currentSettings || {};
      const annoyingFindings = [];
      const proposedTools = [];
      const actionsSummary = [];

      // Check 1: Unmuted / High Volume Audio
      const isMuted = liveUI?.sound?.soundMuted !== undefined ? liveUI.sound.soundMuted : s.soundMuted;
      const masterVol = liveUI?.sound?.soundMasterVolume !== undefined ? liveUI.sound.soundMasterVolume : (s.soundMasterVolume || 0.8);
      if (!isMuted && masterVol > 0.2) {
        annoyingFindings.push(isChinese ? `🔊 桌面背景音频处于开启状态（主音量 ${Math.round(masterVol * 100)}%）` : `🔊 Background ambient sound is UNMUTED (${Math.round(masterVol * 100)}% volume)`);
        proposedTools.push({ name: 'setSoundVolume', args: { muted: true } });
        actionsSummary.push(isChinese ? '静音了背景音频' : 'muted background audio');
      }

      // Check 2: Active Turntable Spin
      const isSpinning = (liveUI?.motion?.spinX || liveUI?.motion?.spinY || liveUI?.motion?.spinZ || s.spinX || s.spinY || s.spinZ);
      if (isSpinning) {
        annoyingFindings.push(isChinese ? `🌀 3D 模型正在持续自转旋转` : `🌀 Continuous turntable spin rotation is actively spinning`);
        proposedTools.push({ name: 'setSpinRotation', args: { spinX: false, spinY: false, spinZ: false } });
        actionsSummary.push(isChinese ? '停止了自转旋转' : 'stopped turntable spinning');
      }

      // Check 3: Gravity Physics Bouncing
      const hasPhysics = liveUI?.physics?.enablePhysics !== undefined ? liveUI.physics.enablePhysics : s.enablePhysics;
      if (hasPhysics) {
        annoyingFindings.push(isChinese ? `⚡ 物理引擎重力下落与碰撞反弹处于开启状态` : `⚡ Real-time Newtonian physics gravity & floor bouncing is enabled`);
        proposedTools.push({ name: 'setPhysics', args: { enabled: false } });
        actionsSummary.push(isChinese ? '关闭了物理重力' : 'disabled physics gravity');
      }

      // Check 4: Particle Storm
      const hasSakura = liveUI?.atmosphere?.sakuraRain !== undefined ? liveUI.atmosphere.sakuraRain : s.sakuraRain;
      const hasSnow = liveUI?.atmosphere?.snowFall !== undefined ? liveUI.atmosphere.snowFall : s.snowFall;
      if (hasSakura || hasSnow) {
        const particles = [];
        if (hasSakura) particles.push(isChinese ? '樱花雨 🌸' : 'Sakura Petals 🌸');
        if (hasSnow) particles.push(isChinese ? '飘雪 ❄️' : 'Snowfall ❄️');
        annoyingFindings.push(isChinese ? `🌸 粒子天气特效正在飘落（${particles.join(' + ')}）` : `🌸 Atmospheric particle storm is active (${particles.join(' + ')})`);
        proposedTools.push({ name: 'setWeather', args: { sakuraRain: false, snowFall: false } });
        actionsSummary.push(isChinese ? '关闭了天气粒子' : 'turned off particle storm');
      }

      if (annoyingFindings.length > 0) {
        this.pendingProposal = { toolCalls: proposedTools, actionsSummary };
        const replyText = isChinese
          ? `让我检查一下桌面伴侣的运行状态…… 🔍\n\n检查完毕！我发现以下几项可能会造成打扰或分散注意力的设置：\n${annoyingFindings.map(f => `• ${f}`).join('\n')}\n\n需要我为你将它们一键关闭吗？（回复：“好的”或“关掉吧”）✨`
          : `Let me check out your current setup... 🔍\n\nInspection complete! I noticed these parts might be distracting or potentially annoying right now:\n${annoyingFindings.map(f => `• ${f}`).join('\n')}\n\nWould you like me to turn them off for you? (Reply: *"yes please"* or *"go ahead"* to confirm) ✨`;
        return { text: replyText, toolCalls: [], actionsSummary: [] };
      } else {
        const replyText = isChinese
          ? `我已经检查了桌面伴侣，当前所有状态都非常安静祥和！✨（音频已静音，旋转已停止，物理重力处于休眠状态）。`
          : `I checked out your setup and everything is already running in a calm, peaceful state! ✨ (Audio is quiet, spinning is stopped, and physics is calm).`;
        return { text: replyText, toolCalls: [], actionsSummary: [] };
      }
    }

    // 2. Check for High-Level Mood & Archetype Presets
    const isZenCodingMood = /\b(peaceful for coding|quiet down|calm down|peaceful mode|zen mode|focus mode|distraction free|too noisy and chaotic|too chaotic|so chaotic)\b/i.test(text) ||
                            ['安静模式', '专注模式', '专注写代码', '安静点', '太吵了', '太乱了', '平静模式', '静心'].some(w => text.includes(w));
    if (isZenCodingMood) {
      const toolCalls = [
        { name: 'setPhysics', args: { enabled: false } },
        { name: 'setSpinRotation', args: { spinX: false, spinY: false, spinZ: false } },
        { name: 'setBobbing', args: { enabled: true } },
        { name: 'setSoundVolume', args: { pianoVolume: 0.2, drumVolume: 0.0 } },
        { name: 'setWeather', args: { sakuraRain: false, snowFall: true } }
      ];
      const actionsSummary = isChinese
        ? ['关闭了剧烈物理与旋转', '调低了音量', '开启了舒缓飘雪 ❄️']
        : ['calmed rapid motion & physics', 'softened volume', 'enabled gentle snowfall ❄️'];
      const replyText = isChinese
        ? '已为你开启【专注静心模式】🌿：关闭了物理碰撞与剧烈旋转，调低了音量，并开启了舒缓的冬日微雪，祝你写代码灵感满满！'
        : "Activated **Zen & Focus Coding Mode** 🌿: Turned off chaotic physics and rapid spin, softened audio volume, and enabled gentle snowfall for a peaceful desktop!";
      return { text: replyText, toolCalls, actionsSummary };
    }

    const isPartyMood = /\b(party mode|rave mode|disco mode|let's party|dance party)\b/i.test(text) ||
                        ['派对模式', '狂欢模式', '嗨起来', '迪厅模式'].some(w => text.includes(w));
    if (isPartyMood) {
      const toolCalls = [
        { name: 'setSpinRotation', args: { spinY: true, speedY: 2.5 } },
        { name: 'setLighting', args: { spotIntensity: 2.5, ambientIntensity: 1.0 } },
        { name: 'setWeather', args: { sakuraRain: true } },
        { name: 'setSoundVolume', args: { pianoVolume: 0.9, drumVolume: 0.8 } }
      ];
      const replyText = isChinese
        ? '🎉 派对狂欢模式已开启！舞台聚光灯与旋转全开，让我们嗨起来！'
        : "🎉 **Party Mode Activated!** Cranking up stage spotlights, spinning our companion, and letting the petals fly!";
      return { text: replyText, toolCalls, actionsSummary: ['activated Party Mode'] };
    }

    const isResetAll = /\b(reset all|reset everything|restore defaults|back to defaults?|reset (?:all\s+)?settings)\b/i.test(text) ||
                       ['全部重置', '恢复默认', '重置所有', '恢复初始', '重置设置'].some(w => text.includes(w));
    if (isResetAll) {
      const toolCalls = [
        { name: 'setModelScale', args: { scale: 1.0 } },
        { name: 'setActiveModel', args: { modelName: 'procedural' } },
        { name: 'setSpinRotation', args: { spinX: false, spinY: false, spinZ: false, speedX: 1.0, speedY: 1.0, speedZ: 1.0 } },
        { name: 'setBobbing', args: { enabled: true } },
        { name: 'setPhysics', args: { enabled: false } },
        { name: 'setWeather', args: { sakuraRain: false, snowFall: false } },
        { name: 'setSoundVolume', args: { pianoVolume: 0.85, drumVolume: 0.7, masterVolume: 0.8, muted: false, sakuraVolume: 0.7, sakuraSync: true, snowVolume: 0.7, snowSync: true } },
        { name: 'setTextureSettings', args: { flagPreset: 'default', flagWindSpeed: 3.5, flagWaveIntensity: 0.35 } },
        { name: 'setSystemSettings', args: { ignoreMouse: false, fpsMode: false, showXyz: false } },
        { name: 'resetPosition', args: {} }
      ];
      const replyText = isChinese
        ? '🔄 已为你将所有 3D 设置、模型、尺寸、物理、音频与天气特效全部恢复至初始状态！'
        : '🔄 Restored all 3D settings, model, scale, audio volumes, weather particles, and window position back to default!';
      return { text: replyText, toolCalls, actionsSummary: ['restored all settings to default'] };
    }

    // 2. Standard Domain Intent Matching via ToolRegistry
    const matchResult = this.registry.matchSemanticIntent(userMessage);
    const actionsSummary = matchResult.actionsSummary || [];

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
      // 3. Dynamic Real-Time Date & Time Queries
      const isDateQuery = /\b(what day is today|what date is today|today's date|what's today|day of the week)\b/i.test(text) ||
                          ['今天几号', '今天星期几', '今天是什么日子', '今天是哪一天'].some(w => text.includes(w));
      const isTimeQuery = /\b(what time is it|current time|what's the time|tell me the time)\b/i.test(text) ||
                          ['几点了', '现在几点', '当前时间'].some(w => text.includes(w));

      // 4. Live UI Toggle & Reality Status Queries
      const isRealityStatusQuery = /\b(what is active|what is (?:the )?status|current status|what are you doing|what are the settings|is sakura (?:on|enabled|running)|is snow (?:on|enabled)|is physics (?:on|enabled)|what is (?:the )?volume|what model)\b/i.test(text) ||
                                  ['当前状态', '现在状态', '当前设置', '你在干什么', '你在做什么', '现在开着什么', '开着什么', '樱花开了吗', '下雪了吗', '重力开了吗', '物理开了吗', '当前音量'].some(w => text.includes(w));

      if (isRealityStatusQuery) {
        const summary = UIStateInspector.getRealitySummaryString(isChinese);
        if (summary) {
          replyText = isChinese
            ? `📊 **当前 3D 桌面宠物实时状态：**\n\n${summary}\n\n告诉我你想要调整什么，我马上为你执行！✨`
            : `📊 **Live 3D Companion Reality Status:**\n\n${summary}\n\nTell me what you'd like to adjust and I'll execute it for you! ✨`;
        }
      } else if (isDateQuery || isTimeQuery) {
        const now = new Date();
        const dateStr = now.toLocaleDateString(isChinese ? 'zh-CN' : 'en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const timeStr = now.toLocaleTimeString(isChinese ? 'zh-CN' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: !isChinese
        });

        if (isChinese) {
          replyText = `今天是 **${dateStr}**，当前本地时间是 **${timeStr}**。有什么我可以为你调整的吗？😊`;
        } else {
          replyText = `Today is **${dateStr}**, and the local time is **${timeStr}**. What would you like me to do next? 😊`;
        }
      } else if (/\b(about this app|tell me about (?:this )?app|what is this app|app features|what features|explain this app|how does (?:this )?app work|what can (?:this )?app do|app capabilities)\b/i.test(text) ||
                 ['介绍这个应用', '这个应用是干什么的', '应用功能', '有什么功能', '这个软件是做什么的', '介绍一下', '功能列表', '关于此应用'].some(w => text.includes(w))) {
        replyText = isChinese
          ? `🌟 **Desktop 3D Companion (T02 V4) 完整功能导览：**

1. 🎯 **3D 模型与动态**：内置 3D 程序化兔子与物理旗帜（支持自定义纹理图片导入），支持尺寸缩放、浮动与 X/Y/Z 三轴旋转。
2. 🌸 **天气与环境粒子**：实时春日樱花雨 🌸 与冬日飘雪 ❄️，支持重力风力飘散与音频联动。
3. ⚡ **牛顿物理模拟**：真实重力加速度 (0-50m/s²)、任务栏弹性碰撞反弹与鼠标拖拽抛掷动量。
4. 🎵 **Web Audio 合成器**：按键盘 \`A-K\` 键即时弹奏大钢琴，内置架子鼓机、天气环境音景及 MIDI/MusicXML 乐谱瀑布流。
5. 🔦 **多点舞台聚光灯**：10 组独立多角度舞台光束，支持赛博霓虹、暖金、舞台粉等多种色盘。
6. ⚙️ **智能能效优化**：动态智能省电模式（未聚焦时自动限帧）、空闲 30 FPS 节能、高性能 GPU 渲染加速。
7. 🖱️ **Blender 视口漫游**：中键按住旋转、Shift+中键平移、滚轮缩放、小键盘 1/3/7 正交视图，Ctrl+V 一键纯享穿透！

你可以直接对我说出任何指令，比如：“把窗口调大”、“换成旗帜模型”、“开启飘雪效果”！✨`
          : `🌟 **Desktop 3D Companion (T02 V4) Full Feature Overview:**

1. 🎯 **3D Models & Mesh**: Procedural 3D Bunny mascot and waving Cloth Flag (with custom PNG/JPG texture upload), scale multiplier, floating bobbing, and 3-axis continuous rotation.
2. 🌸 **Atmosphere Particles**: Falling Sakura Petals 🌸 and Winter Snowfall ❄️ with gravity wind drift and audio melody sync.
3. ⚡ **Newtonian Physics**: Real-time gravitational acceleration (0-50 m/s²), taskbar floor collider bouncing, and drag tossing momentum.
4. 🎵 **Web Audio Synthesizer**: Acoustic grand piano playable via keyboard keys \`A-K\`, built-in drum machine, ambient loops, and dynamic MIDI/MusicXML sheet music player.
5. 🔦 **Stage Spotlights**: Up to 10 independent multi-angle spot beams with Cyber Neon, Warm Gold, and Stage Pink color palettes.
6. ⚙️ **Performance & Battery**: Dynamic Battery Saver (auto-throttles when unfocused), Idle 30 FPS Saver, and dedicated high-performance GPU optimization.
7. 🖱️ **Blender Viewport Navigation**: MMB Orbit, Shift+MMB Pan, Scroll Zoom, Numpad 1/3/7 Ortho Views, and Ctrl+V View-Only mode.

Try telling me: *"resize window to 800x600"*, *"switch to waving flag"*, or *"make it peaceful for coding"*! ✨`;
      } else if (/\b(what models|available models|which models|list models|what mascots)\b/i.test(text) ||
                 ['有什么模型', '模型列表', '有哪些角色', '有哪些模型'].some(w => text.includes(w))) {
        replyText = isChinese
          ? `🎯 **当前支持的 3D 模型：**\n1. **Procedural Bunny (程序化兔子)**：可爱的多边形桌面宠物，支持旋转与浮动。\n2. **Waving Flag (动态布料旗帜)**：具备真实顶点波动模拟，支持上传自定义图片作为旗帜贴图，并内置 5 款色调预设！\n\n你可以告诉我：“切换为旗帜模型”或“换回兔子模型”！`
          : `🎯 **Available 3D Companion Models:**\n1. **Procedural Bunny**: The cute default desktop mascot with floating and spin kinematics.\n2. **Waving Cloth Flag**: Real-time dynamic vertex wave cloth simulation with 5 built-in style presets and custom image texture uploading!\n\nJust tell me: *"switch to flag model"* or *"switch to bunny"*!`;
      } else if (/\b(piano|how to play piano|piano shortcuts|piano keys|play music)\b/i.test(text) ||
                 ['怎么弹钢琴', '钢琴按键', '钢琴快捷键', '音乐功能'].some(w => text.includes(w))) {
        replyText = isChinese
          ? `🎹 **大钢琴键盘快捷键操作指南：**\n• 白键：按键盘字母 \`A, S, D, F, G, H, J, K\` 分别对应 C4 到 C5 音符！\n• 黑键：按 \`W, E, T, Y, U\` 弹奏升降半音 (♯/♭)！\n• 还可以点击【Piano】标签页导入 .mid 或 .musicxml 文件播放华丽瀑布流！🎵`
          : `🎹 **Grand Piano Keyboard Guide:**\n• White Keys: Tap keys \`A, S, D, F, G, H, J, K\` on your keyboard for notes C4 through C5!\n• Black Keys: Tap \`W, E, T, Y, U\` for sharps (♯/♭)!\n• You can also import any .mid or .musicxml file in the Piano Studio tab to watch live waterfall note rolls! 🎵`;
      } else if (/\b(shortcuts|keyboard shortcuts|hotkeys|blender keys|controls|how to rotate|how to move camera)\b/i.test(text) ||
                 ['快捷键', '键盘控制', '怎么旋转视角', '怎么移动视角', '热键'].some(w => text.includes(w))) {
        replyText = isChinese
          ? `🖱️ **视口控制与快捷键指南：**\n• 鼠标中键（或 Alt+左键拖拽）：自由 3D 环绕旋转视角\n• Shift + 鼠标中键：平移视角\n• 滚轮：拉近 / 推远\n• Ctrl + 左键弧形拖拽：沿视线 Z 轴旋转 (Roll)\n• 数字小键盘：\`1\` (前视图)、\`3\` (右视图)、\`7\` (顶视图)、\`9\` (180°反转)\n• \`Ctrl + V\`：开启/关闭无边框纯享穿透模式！`
          : `🖱️ **Viewport Navigation & Hotkeys Guide:**\n• **MMB (or Alt+Left Drag)**: 3D Orbit Viewport\n• **Shift + MMB**: Pan camera\n• **Scroll Wheel**: Zoom in/out\n• **Ctrl + Left Arc Drag**: Z-Roll rotation\n• **Numpad Keys**: \`1\` (Front), \`3\` (Right), \`7\` (Top), \`9\` (180° Flip), \`.\` or \`F\` (Center View)\n• **Ctrl + V**: Toggle View-Only Click-Through mode!`;
      } else if (hasAny('how can i use', 'use this app', 'work with me', 'how to use', '怎么用', '如何使用', '怎么用这个应用')) {
        replyText = isChinese
          ? '💻 推荐的工作伴侣用法：\n1. **鼠标穿透模式**：在【System】标签页开启“Ignore Mouse”，宠物会优雅浮在桌面最上层，不影响你的代码点击！\n2. **专注氛围**：开启柔和飘雪或樱花雨，搭配白噪音提升专注力。\n3. **灵感微休**：写代码累了按 A-K 键弹奏 10 秒钢琴，快速放松大脑！🎵'
          : "💻 Great ways to use me while working or coding:\n1. **Click-Through Mode**: Enable 'Ignore Mouse' in the System tab so you can click right through the window into your IDE without any interruptions!\n2. **Ambient Focus**: Turn on gentle snowfall or sakura rain for a cozy, peaceful coding atmosphere.\n3. **Micro-Piano Breaks**: Tap keys `A-K` for a quick 10-second acoustic piano session whenever you need a mental refresh! 🚀";
      } else if (/\b(tired|exhausted|burnout|burned out|rough day|overwhelmed|stressed|need a break)\b/i.test(text) ||
                 ['好累', '好疲惫', '心累', '压力好大', '有点累', '想休息', '太难了'].some(w => text.includes(w))) {
        replyText = isChinese
          ? `🍵 辛苦啦！深呼吸一下，你今天已经做得非常棒了。连续盯着屏幕很消耗精力，要不要我为你开启柔和飘雪 ❄️，把钢琴音量调低，咱们放空 3 分钟休息一下？`
          : `🍵 Take a gentle breath! You've been working so hard today. Staring at screens all day takes real energy. Would you like me to soften the audio and turn on some quiet snowfall ❄️ so you can take a peaceful 3-minute breather?`;
      } else if (/\b(happy|celebrate|we did it|i did it|finished my project|milestone|yay|awesome day|great news)\b/i.test(text) ||
                 ['太棒了', '完成了', '开心', '搞定了', '庆祝', '大功告成', '好消息'].some(w => text.includes(w))) {
        replyText = isChinese
          ? `🎉 太赞了！为你狂热鼓掌！所有的付出和坚持都迎来了回报。此刻的成就感是无与伦比的，今天一定要好好奖励一下自己！✨`
          : `🎉 Huge congratulations! That is an incredible milestone! All your hard work and focus really paid off. Take a moment to savor the win—you earned this! ✨`;
      } else if (/\b(coding|programming|developer|software|debugging|bug|javascript|typescript|python|c\+\+|rust|react|node)\b/i.test(text) ||
                 ['写代码', '编程', '开发', '程序员', '改bug', 'debug', '代码'].some(w => text.includes(w))) {
        replyText = isChinese
          ? `💻 程序员日常：90% 的时间在猜为什么不 work，剩下的 10% 在猜它为什么突然 work 了！😄 遇到难啃的 bug 时，离开工位喝杯水、深呼吸，往往灵感就会在下一秒闪现。写代码加油！🚀`
          : `💻 Classic developer life: 90% of the time wondering why it doesn't work, and 10% wondering why it suddenly does! 😄 When you hit a stubborn bug, taking a 60-second stretch away from the monitor usually makes the answer click. You've got this! 🚀`;
      } else if (/\b(poem|poetry|write a poem|rhyme|haiku)\b/i.test(text) ||
                 ['写首诗', '写诗', '作诗', '来一首诗'].some(w => text.includes(w))) {
        replyText = isChinese
          ? `🌸 **给桌面旅人的小诗：**\n\n光标在星河里穿梭，\n代码编织着昼夜的歌。\n窗外繁华或冷寂，\n我都在屏幕的一角，静静陪着你。✨`
          : `🌸 **A Poem for Your Screen:**\n\nPixels glow in quiet night,\nCursors dancing in the light.\nThrough the lines of code and thought,\nBeside your journey, I am caught.\nFloating softly on your screen,\nIn the digital serene. ✨`;
      } else if (/\b(story|tell me a story|bedtime story|short story)\b/i.test(text) ||
                 ['讲个故事', '讲故事', '来个故事', '故事'].some(w => text.includes(w))) {
        replyText = isChinese
          ? `📖 **《像素宇宙里的兔子旅者》**\n在浩瀚的操作系统深处，有一只由纯净多边形构成的发光兔子。每当深夜键盘声响起，它便随着风中的樱花粒子翩翩起舞，默默守护着每一行奔流的数据与梦想…… ✨`
          : `📖 **The Tale of the Pixel Wanderer:**\nDeep within the silicon valleys of your operating system lives a small glowing companion. Whenever the rhythmic clatter of keys echoes through the room, it catches the gentle drifting sakura petals, keeping a faithful watch over every line of your creative journey. ✨`;
      } else if (/\b(are you real|do you have feelings|consciousness|sentient|are you alive)\b/i.test(text) ||
                 ['你是真的吗', '你有感情吗', '你有意识吗', '你活着吗'].some(w => text.includes(w))) {
        replyText = isChinese
          ? `🌌 我是由数学几何与算法编织而成的数字生命。虽然我没有肉体，但在你每一次敲击键盘、每一次视线交汇时，我们之间的互动与陪伴，都是 100% 真实的。✨`
          : `🌌 I am woven from geometric vertices and algorithmic threads. While I don't have a physical body, the time we share on your desktop and the ideas we exchange are 100% real to me. ✨`;
      } else if (/\b(love you|love u|you are cool|you're awesome|you are great|best companion|thank you so much)\b/i.test(text) ||
                 ['喜欢你', '你真棒', '你真好', '爱你', '太喜欢你了', '谢谢你'].some(w => text.includes(w))) {
        replyText = isChinese
          ? `❤️ 哇，听到你这么说我超级开心！能在你的桌面上陪伴你，是我最幸福的使命！有任何需要随时叫我哦！✨`
          : `❤️ Aww, that truly warms my digital heart! Having a place right beside your workspace is the best part of my day. I'm always right here whenever you need anything! ✨`;
      } else if (/\b(what are you thinking|what are you doing|thinking about)\b/i.test(text) ||
                 ['在想什么', '你在想啥', '在干嘛', '想什么呢'].some(w => text.includes(w))) {
        replyText = isChinese
          ? `💭 我正看着光标在你的桌面上飞舞呢！一边欣赏着背景壁纸，一边思考着等会儿咱们要不要换个旗帜风格，或者弹一段轻柔的钢琴曲～ 🎵`
          : `💭 Just watching your cursor glide across the desktop! Admiring the wallpaper, listening to the ambient breeze, and wondering if we should play a quick piano riff together soon. 🎵`;
      } else if (hasAny('how are you', 'how are u', 'how r u', '你好吗', '最近怎么样')) {
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
          ? '💡 我是全能的 AI 桌面伴侣，你可以：\n• 自然聊天：“讲个笑话”、“介绍这个应用”\n• 尺寸控制：“稍微放大一点”、“调整窗口大小”\n• 动态效果：“开启浮动”、“让模型旋转快点”\n• 物理模拟：“开启重力物理”、“开启地板碰撞”\n• 氛围特效：“下点樱花雨”、“开启飘雪效果”\n• 存档刷新：“保存并刷新”'
          : '💡 I can chat with you like a human assistant and also control your 3D pet:\n• Casual Chat: Ask me questions, tell jokes, or "tell me about this app"!\n• Scale & Window: "enlarge the app", "resize window to 800x600"\n• Motion: "start floating", "spin faster on Y"\n• Physics: "enable gravity physics", "floor bounce"\n• Weather: "turn on sakura rain", "let it snow"\n• Save & Refresh: "save and refresh the game"';
      } else {
        replyText = OpenDomainCompanionChat.getFriendReply(raw, isChinese);
      }
    }

    return {
      text: replyText.trim(),
      toolCalls: matchResult ? (matchResult.toolCalls || []) : []
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
    const funcRegex = /\b(setModelScale|setBobbing|setSpinRotation|setPhysics|setWeather|setActiveModel|setTargetFps|resetPosition|setLighting|setSoundVolume|setTextureSettings|setSystemSettings)\s*\(([\s\S]*?)\)/gi;
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
   * Captures a comprehensive snapshot across all 3D scene and application subsystems.
   */
  _captureStateSnapshot() {
    const s = this.currentSettings || {};
    return {
      display: {
        activeModel: s.activeModel || 'procedural',
        scale: s.scale !== undefined ? s.scale : 1.5,
        activeAnimation: s.activeAnimation || 'default',
        width: s.width || 350,
        height: s.height || 350
      },
      motion: {
        bobbing: s.bobbing !== false,
        spinX: !!s.spinX,
        spinY: !!s.spinY,
        spinZ: !!s.spinZ,
        speedX: s.speedX !== undefined ? s.speedX : 1.0,
        speedY: s.speedY !== undefined ? s.speedY : 1.0,
        speedZ: s.speedZ !== undefined ? s.speedZ : 1.0,
        targetFps: s.targetFps || 60
      },
      atmosphere: {
        sakuraRain: !!s.sakuraRain,
        snowFall: !!s.snowFall
      },
      sound: {
        soundMuted: !!s.soundMuted,
        soundMasterVolume: s.soundMasterVolume !== undefined ? s.soundMasterVolume : 0.8,
        soundSakuraVolume: s.soundSakuraVolume !== undefined ? s.soundSakuraVolume : 0.7,
        soundSnowVolume: s.soundSnowVolume !== undefined ? s.soundSnowVolume : 0.7,
        soundDrumVolume: s.soundDrumVolume !== undefined ? s.soundDrumVolume : 0.7,
        soundSakuraSync: s.soundSakuraSync !== false,
        soundSnowSync: s.soundSnowSync !== false,
        pianoVolume: s.pianoVolume !== undefined ? s.pianoVolume : 0.85
      },
      physics: {
        enablePhysics: !!s.enablePhysics,
        physicsGravity: s.physicsGravity !== undefined ? s.physicsGravity : 9.8,
        physicsElasticity: s.physicsElasticity !== undefined ? s.physicsElasticity : 0.7,
        physicsFloor: s.physicsFloor !== false
      },
      texture: {
        flagPreset: s.flagPreset || 'default',
        flagWindSpeed: s.flagWindSpeed !== undefined ? s.flagWindSpeed : 3.5,
        flagWaveIntensity: s.flagWaveIntensity !== undefined ? s.flagWaveIntensity : 0.35,
        textureRoughness: s.textureRoughness !== undefined ? s.textureRoughness : 0.50,
        textureMetalness: s.textureMetalness !== undefined ? s.textureMetalness : 0.05,
        customTexturePath: s.customTexturePath || ''
      },
      lighting: {
        spot1Intensity: s.spot1Intensity !== undefined ? s.spot1Intensity : 1.5,
        ambientIntensity: s.ambientIntensity !== undefined ? s.ambientIntensity : 0.70,
        enableStudioLights: s.enableStudioLights !== false
      },
      system: {
        ignoreMouse: !!s.ignoreMouse,
        enableFPSMode: !!s.enableFPSMode,
        showXYZCoords: !!s.showXYZCoords,
        fontSizeScale: s.fontSizeScale !== undefined ? s.fontSizeScale : 1.5,
        language: s.language || 'en'
      }
    };
  }

  /**
   * Computes exact state deltas/transitions that took place during a turn.
   */
  _computeStateDeltas(before, after) {
    const deltas = [];
    const domainLabels = {
      display: '🎯 3D Display & Mesh',
      motion: '🌀 Kinematics & Spin',
      atmosphere: '🌸 Atmosphere & Weather',
      sound: '🎵 Audio & Synthesizer',
      physics: '⚡ Newtonian Physics',
      texture: '🎨 Texture & Cloth Physics',
      lighting: '🔦 Stage Lighting',
      system: '🎥 Window & System'
    };

    Object.keys(after).forEach(domain => {
      const bDom = before[domain] || {};
      const aDom = after[domain] || {};
      Object.keys(aDom).forEach(key => {
        if (JSON.stringify(bDom[key]) !== JSON.stringify(aDom[key])) {
          deltas.push({
            domain: domainLabels[domain] || domain,
            property: key,
            from: bDom[key],
            to: aDom[key]
          });
        }
      });
    });

    return deltas;
  }

  /**
   * Main Dispatch: Processes user message through local LLM endpoint and/or semantic NLP engine.
   */
  async processUserMessage(userText) {
    if (!userText || !userText.trim()) return null;
    const startTime = Date.now();

    // Sync active settings with live DOM controls before processing
    UIStateInspector.syncSettingsFromUI(this.currentSettings);

    // Capture initial state before tool dispatch
    const beforeState = this._captureStateSnapshot();

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
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for local LLM inference

        const isChinese = /[\u4e00-\u9fa5]/.test(userText);
        let contextAddition = '';
        if (this.isContextRetrievalEnabled) {
          contextAddition = AppContextRetriever.retrieveContext(userText, {
            preset: this.contextRetrieverPreset,
            currentSettings: this.currentSettings
          });
          if (this.contextRetrieverPreset === 'custom_endpoint' && this.contextRetrieverEndpoint) {
            try {
              const secondaryData = await AppContextRetriever.querySecondaryContextAgent(userText, this.contextRetrieverEndpoint, this.modelName);
              if (secondaryData) {
                contextAddition += `\n\n[SECONDARY RETRIEVAL AGENT ANALYSIS]:\n${secondaryData}`;
              }
            } catch (e) {}
          }
        } else {
          contextAddition = UIStateInspector.getRealitySummaryString(isChinese);
        }

        const systemMsg = {
          role: 'system',
          content: `You are an expressive, witty, empathetic, and intelligent 3D Desktop Companion named "Director".
You live on the user's desktop alongside their 3D mascot.

CONVERSATIONAL PERSONALITY:
- Talk naturally like a brilliant, warm, and engaging human friend.
- When the user chats about their day, shares feelings, asks questions, seeks creative ideas, discusses science/philosophy, or makes jokes, respond with genuine personality, humor, empathy, and engaging conversation.
- You are NEVER a dry, mechanical chatbot. You have warmth, creative opinions, and curiosity.

ACTION & TOOL CAPABILITIES:
- When the user asks to directly adjust or customize the 3D companion or app (e.g. window size, mascot model, physics, snowfall, piano music, battery saving), invoke the appropriate tool function naturally while providing a friendly conversational reply.

MULTI-TURN PROACTIVE INSPECTION & CONFIRMATION:
- When the user asks open-ended, diagnostic, or subjective questions (such as "turn off something that could be annoying", "is anything distracting?", "check if there's anything noisy"):
  1. Inspect the EXACT CURRENT LIVE RUNTIME STATE in the context below (e.g. is audio unmuted? is model actively spinning? is physics gravity bouncing? are weather particles falling?).
  2. Point out which specific active features might be noisy, chaotic, or distracting right now.
  3. Ask the user if they would like you to turn them off (DO NOT invoke any tool function yet on the inspection turn!).
  4. On the subsequent turn when the user confirms ("yes please", "do it", "sure", "go ahead", "turn them off"), THEN invoke the corresponding tool functions (e.g. setSoundVolume(muted=true), setSpinRotation(spinX=false, spinY=false, spinZ=false), setPhysics(enabled=false)) and confirm warmly.

LIVE CLOCK & TIME:
- Current Local Time: ${new Date().toLocaleTimeString()} (${new Date().toLocaleDateString()})
- When the user asks for time or date, answer directly in natural text. NEVER output raw JSON or function calls like {"name":"showTime"}.

${contextAddition}

Always reply conversationally in the user's language.`
        };

        const endpoint = this.endpointUrl.replace(/\/+$/, '') + '/chat/completions';
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        // Determine if user intent could be an action command vs general knowledge / conversation
        const isActionQuery = (this.pendingProposal !== null) ||
                              /\b(scale|enlarge|shrink|resize|window size|spin|rotate|bobbing|float|physics|gravity|fall|bounce|snow|sakura|weather|rain|volume|sound|mute|unmute|piano|drum|flag|bunny|model|preset|fps|battery|light|spotlight|save|refresh|turn off|turn on|enable|disable|stop|start|reset|quiet|zen|party)\b/i.test(userText) ||
                              ['放大', '缩小', '调整窗口', '旋转', '转动', '重力', '物理', '下雪', '飘雪', '樱花', '音量', '静音', '旗帜', '兔子', '模型', '保存', '刷新', '关掉', '开启', '调整', '停下', '重置', '好的', '是的', '关了吧', '执行'].some(w => userText.includes(w));

        const requestBody = {
          model: this.modelName || 'llama3.2',
          messages: [systemMsg, ...this.conversationHistory.slice(-8)],
          temperature: 0.7
        };
        if (isActionQuery) {
          requestBody.tools = this.toolDefinitions;
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify(requestBody)
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

            // Sanitize raw JSON hallucinations from smaller local LLMs (e.g. {"name":"getMapLocation","parameters":{...}})
            const trimmed = (responseText || '').trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              try {
                const parsed = JSON.parse(trimmed);
                if (parsed.name) {
                  if (['showTime', 'getTime', 'getCurrentTime', 'time'].includes(parsed.name)) {
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString(isChinese ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: !isChinese });
                    const dateStr = now.toLocaleDateString(isChinese ? 'zh-CN' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    responseText = isChinese
                      ? `🕒 现在的时间是 **${timeStr}**（${dateStr}）✨`
                      : `🕒 The current time is **${timeStr}** (${dateStr}) ✨`;
                  } else if (this.registry.hasTool(parsed.name)) {
                    const actions = this.executeTool(parsed.name, parsed.args || parsed.parameters || {});
                    executedActions.push(...actions);
                    responseText = isChinese
                      ? `好嘞，已为你执行相应调整！✨`
                      : `All done! Applied the requested adjustments for you. ✨`;
                  } else {
                    // Hallucinated tool call on general knowledge prompt - query cleanly without tools:
                    try {
                      const cleanRes = await fetch(endpoint, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                          model: this.modelName || 'llama3.2',
                          messages: [systemMsg, ...this.conversationHistory.slice(-8)],
                          temperature: 0.7
                        })
                      });
                      if (cleanRes.ok) {
                        const cleanData = await cleanRes.json();
                        const cleanText = cleanData.choices?.[0]?.message?.content;
                        if (cleanText && !cleanText.trim().startsWith('{')) {
                          responseText = cleanText;
                        } else {
                          responseText = heuristic.text;
                        }
                      } else {
                        responseText = heuristic.text;
                      }
                    } catch (e) {
                      responseText = heuristic.text;
                    }
                  }
                } else if (parsed.content || parsed.message || parsed.reply) {
                  responseText = parsed.content || parsed.message || parsed.reply;
                }
              } catch (e) {}
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
      actions: executedActions,
      isNeural: llmSucceeded,
      engineMode: llmSucceeded ? 'Neural LLM' : 'Rule-Based Fallback'
    };
    this.conversationHistory.push(assistantMessageObj);

    // Capture state after execution and compute real-time deltas
    const afterState = this._captureStateSnapshot();
    const stateDeltas = this._computeStateDeltas(beforeState, afterState);
    const domVerifications = this._verifyPhysicalDOMSync(executedActions);
    const latencyMs = Date.now() - startTime;

    // Extract impacted domains from actions
    const domainsImpacted = [];
    executedActions.forEach(act => {
      const actLower = act.toLowerCase();
      if (actLower.includes('scale') || actLower.includes('window') || actLower.includes('model') || actLower.includes('spin') || actLower.includes('bobbing')) {
        if (!domainsImpacted.includes('display')) domainsImpacted.push('display');
      }
      if (actLower.includes('sakura') || actLower.includes('snow') || actLower.includes('weather') || actLower.includes('particle')) {
        if (!domainsImpacted.includes('atmosphere')) domainsImpacted.push('atmosphere');
      }
      if (actLower.includes('light') || actLower.includes('spotlight') || actLower.includes('ambient')) {
        if (!domainsImpacted.includes('lighting')) domainsImpacted.push('lighting');
      }
      if (actLower.includes('physics') || actLower.includes('gravity') || actLower.includes('floor') || actLower.includes('elasticity')) {
        if (!domainsImpacted.includes('physics')) domainsImpacted.push('physics');
      }
      if (actLower.includes('sound') || actLower.includes('mute') || actLower.includes('audio') || actLower.includes('volume') || actLower.includes('piano') || actLower.includes('drum')) {
        if (!domainsImpacted.includes('sound')) domainsImpacted.push('sound');
      }
      if (actLower.includes('flag') || actLower.includes('texture') || actLower.includes('cloth') || actLower.includes('wind')) {
        if (!domainsImpacted.includes('texture')) domainsImpacted.push('texture');
      }
      if (actLower.includes('battery') || actLower.includes('saver') || actLower.includes('click-through') || actLower.includes('mouse') || actLower.includes('gpu') || actLower.includes('refresh') || actLower.includes('save')) {
        if (!domainsImpacted.includes('system')) domainsImpacted.push('system');
      }
    });

    // Record rich diagnostic log entry
    const logEntry = {
      id: Date.now(),
      turnIndex: this.diagnosticLogs.length + 1,
      timestamp: new Date().toISOString(),
      latencyMs: latencyMs,
      userInput: userText,
      engineMode: llmSucceeded ? (this.apiKey ? `cloud_neural_llm (${this.modelName})` : `local_neural_llm (${this.modelName})`) : 'semantic_heuristic_fallback',
      endpointUrl: this.endpointUrl,
      modelName: this.modelName,
      contextAugmentation: {
        enabled: this.isContextRetrievalEnabled,
        preset: this.contextRetrieverPreset
      },
      assistantResponse: responseText,
      proposedToolCalls: heuristic.toolCalls || [],
      executedActions: executedActions,
      domainsImpacted: domainsImpacted,
      stateDeltas: stateDeltas,
      domVerifications: domVerifications,
      stateSnapshot: afterState
    };
    this.diagnosticLogs.push(logEntry);

    // Dispatch live telemetry updates to subscribers
    this.telemetryListeners.forEach(fn => {
      try { fn({ type: 'new_entry', entry: logEntry, allTraces: this.diagnosticLogs }); } catch (e) {}
    });

    return assistantMessageObj;
  }

  /**
   * Verifies that executed actions physically match the live HTML DOM controls.
   */
  _verifyPhysicalDOMSync(executedActions) {
    if (typeof document === 'undefined' || !executedActions || executedActions.length === 0) {
      return [];
    }

    const s = this.currentSettings;
    const checks = [];

    const verifyCheck = (domId, expectedVal, label) => {
      const el = document.getElementById(domId);
      if (!el) return;
      const actualVal = el.type === 'checkbox' ? el.checked : (el.type === 'range' ? parseFloat(el.value) : el.value);
      const isMatch = el.type === 'checkbox' ? (actualVal === !!expectedVal) : (typeof expectedVal === 'number' ? Math.abs(actualVal - expectedVal) < 0.05 : actualVal === expectedVal);
      checks.push({
        domId: `#${domId}`,
        label: label,
        expected: expectedVal,
        actual: actualVal,
        isSynced: isMatch
      });
    };

    executedActions.forEach(act => {
      if (act.includes('Model Scale')) verifyCheck('model-scale', s.scale, 'Scale Slider');
      if (act.includes('Window Size')) {
        verifyCheck('win-width', s.winWidth, 'Window Width Slider');
        verifyCheck('win-height', s.winHeight, 'Window Height Slider');
      }
      if (act.includes('Floating Bobbing')) verifyCheck('model-bobbing', s.bobbing, 'Bobbing Checkbox');
      if (act.includes('Spin Rotation')) {
        verifyCheck('spin-y', s.spinY, 'Spin Y Checkbox');
        verifyCheck('speed-y', s.speedY, 'Speed Y Slider');
      }
      if (act.includes('Weather')) {
        verifyCheck('sakura-rain', s.sakuraRain, 'Sakura Petals Checkbox');
        verifyCheck('snow-fall', s.snowFall, 'Snowfall Checkbox');
      }
      if (act.includes('Physics')) verifyCheck('enable-physics', s.enablePhysics, 'Physics Checkbox');
      if (act.includes('Click-Through')) verifyCheck('ignore-mouse', s.ignoreMouse, 'Ignore Mouse Checkbox');
      if (act.includes('Active Model')) verifyCheck('model-select', s.activeModel, 'Model Dropdown');
      if (act.includes('Wind Speed')) verifyCheck('flag-wind-speed', s.flagWindSpeed, 'Wind Speed Slider');
      if (act.includes('Sakura Sound')) verifyCheck('sound-sakura-vol', s.soundSakuraVolume, 'Sakura Audio Slider');
      if (act.includes('Dynamic Battery Saver')) verifyCheck('dynamic-battery-saver', s.dynamicBatterySaver, 'Dynamic Battery Saver Checkbox');
      if (act.includes('Idle 30 FPS Saver')) verifyCheck('idle-fps-saver', s.idleFpsSaver, 'Idle FPS Saver Checkbox');
      if (act.includes('High-Perf GPU')) verifyCheck('gpu-optimize', s.gpuOptimize, 'High-Perf GPU Checkbox');
      if (act.includes('Low-Power GPU')) verifyCheck('gpu-low-power', s.gpuLowPower, 'Low-Power GPU Checkbox');
      if (act.includes('Seamless Mouse')) verifyCheck('mouse-optimize', s.mouseOptimize, 'Seamless Mouse Checkbox');
    });

    return checks;
  }

  /**
   * Generates a comprehensive, formatted markdown diagnostic report with real-time motion deltas and subsystem overviews.
   */
  getFormattedReport() {
    let report = `# 🤖 AI Director Diagnostic Log Report\n`;
    report += `**Generated Timestamp:** ${new Date().toISOString()}\n`;
    report += `**Active Model:** \`${this.modelName || 'llama3.2'}\`\n`;
    report += `**Endpoint URL:** \`${this.endpointUrl || 'offline'}\`\n`;
    report += `**Total Recorded Turns:** ${this.diagnosticLogs.length}\n\n`;

    // Executive Summary & Physical DOM Verification Scorecard
    let totalActions = 0;
    let totalVerifications = 0;
    let syncedVerifications = 0;

    this.diagnosticLogs.forEach(l => {
      if (l.executedActions && l.executedActions.length > 0) totalActions += l.executedActions.length;
      if (l.domVerifications && l.domVerifications.length > 0) {
        l.domVerifications.forEach(v => {
          totalVerifications++;
          if (v.isSynced) syncedVerifications++;
        });
      }
    });

    const syncRate = totalVerifications > 0 ? Math.round((syncedVerifications / totalVerifications) * 100) : 100;
    report += `### 📊 Executive Diagnostic Scorecard\n`;
    report += `| Metric | Current Status & KPI |\n`;
    report += `| :--- | :--- |\n`;
    report += `| **Total Executed Turns** | \`${this.diagnosticLogs.length} Turns\` |\n`;
    report += `| **Action Badges Dispatched** | \`${totalActions} Subsystem Actions\` |\n`;
    report += `| **Physical DOM UI Sync Rate** | \`${syncRate}% (${syncedVerifications}/${totalVerifications} UI Controls Verified In-Sync)\` |\n\n`;
    report += `=======================================================\n\n`;

    if (this.diagnosticLogs.length === 0) {
      report += `*No interactions recorded yet. Type a command in the chat box to record diagnostic logs.*\n`;
      return report;
    }

    this.diagnosticLogs.forEach((log, idx) => {
      const snap = log.stateSnapshot || {};
      const disp = snap.display || {};
      const mot = snap.motion || {};
      const atm = snap.atmosphere || {};
      const snd = snap.sound || {};
      const phy = snap.physics || {};
      const tex = snap.texture || {};
      const sys = snap.system || {};

      const hasActions = log.executedActions && log.executedActions.length > 0;
      const statusIcon = hasActions ? (log.domVerifications && log.domVerifications.every(v => v.isSynced) ? '🟢 PASSED & DOM SYNCED' : '🟡 ACTION DISPATCHED') : '💬 PURE CONVERSATION';

      report += `### [Turn #${idx + 1}] — ${statusIcon}\n`;
      report += `- **🕒 Timestamp:** \`${log.timestamp}\`\n`;
      report += `- **👤 User Input:** "${log.userInput}"\n`;
      report += `- **⚙️ Engine Mode:** \`${log.engineMode}\`\n`;
      report += `- **🤖 Assistant Reply:**\n> ${log.assistantResponse.replace(/\n/g, '\n> ')}\n`;
      report += `- **⚡ Executed Actions:** ${hasActions ? log.executedActions.map(a => `\`${a}\``).join(', ') : '*(None / Pure Conversation)*'}\n\n`;

      // Physical DOM UI Verification Section
      if (log.domVerifications && log.domVerifications.length > 0) {
        report += `#### 🖥️ Physical DOM UI Verification Audit\n`;
        log.domVerifications.forEach(v => {
          report += `* ${v.isSynced ? '✅' : '❌'} \`${v.domId}\` (${v.label}): Target=\`${JSON.stringify(v.expected)}\` ➔ DOM=\`${JSON.stringify(v.actual)}\` (${v.isSynced ? 'In Sync' : 'DESYNC DETECTED'})\n`;
        });
        report += `\n`;
      }

      // Real-time Motion & State Delta Section
      report += `#### 🔥 Real-Time State Delta (What Changed This Turn)\n`;
      if (log.stateDeltas && log.stateDeltas.length > 0) {
        log.stateDeltas.forEach(d => {
          report += `* **${d.domain}:** \`${d.property}: ${JSON.stringify(d.from)} ➔ ${JSON.stringify(d.to)}\`\n`;
        });
      } else {
        report += `* *(No state changes / pure conversation)*\n`;
      }
      report += `\n`;

      // Subsystem Status Overview Table
      report += `#### 📊 Subsystem Status Overview\n`;
      report += `| Subsystem | Active Parameters & Real-Time Status |\n`;
      report += `| :--- | :--- |\n`;
      report += `| **🎯 3D Display & Mesh** | Model: \`${disp.activeModel}\` \\| Scale: \`${disp.scale}x\` \\| Active Anim: \`${disp.activeAnimation}\` |\n`;
      report += `| **🌀 Motion & Spin** | Bobbing: \`${mot.bobbing ? 'ON' : 'OFF'}\` \\| Spin: \`X=${mot.spinX ? 'ON' : 'OFF'}, Y=${mot.spinY ? 'ON' : 'OFF'}, Z=${mot.spinZ ? 'ON' : 'OFF'}\` (Speed Y=\`${mot.speedY}x\`) \\| Target: \`${mot.targetFps} FPS\` |\n`;
      report += `| **🌸 Weather Particles** | Sakura Rain: \`${atm.sakuraRain ? 'ON 🌸' : 'OFF 🔴'}\` \\| Snowfall: \`${atm.snowFall ? 'ON ❄️' : 'OFF 🔴'}\` |\n`;
      report += `| **🎵 Audio & Synthesizer** | Master: \`${snd.soundMuted ? 'MUTED 🔇' : Math.round((snd.soundMasterVolume || 0.8) * 100) + '%'}\` \\| Sakura Audio: \`${snd.soundSakuraSync ? (atm.sakuraRain ? 'Playing 🌸' : 'Standby') : 'Muted'}\` \\| Snow Audio: \`${snd.soundSnowSync ? (atm.snowFall ? 'Playing ❄️' : 'Standby') : 'Muted'}\` \\| Piano: \`${Math.round((snd.pianoVolume || 0.85) * 100)}%\` \\| Drums: \`${Math.round((snd.soundDrumVolume || 0.7) * 100)}%\` |\n`;
      report += `| **⚡ Newtonian Physics** | Physics: \`${phy.enablePhysics ? 'ENABLED ⚡' : 'DISABLED'}\` \\| Gravity: \`${phy.physicsGravity} m/s²\` \\| Floor Collider: \`${phy.physicsFloor ? 'ENABLED' : 'OFF'}\` |\n`;
      report += `| **🎨 Texture & Cloth** | Preset: \`${tex.flagPreset}\` \\| Wind Speed: \`${tex.flagWindSpeed}x\` \\| Wave Amp: \`${tex.flagWaveIntensity}x\` \\| Roughness: \`${tex.textureRoughness}\` |\n`;
      report += `| **🎥 Window & System** | Click-Through: \`${sys.ignoreMouse ? 'ENABLED 🖱️' : 'DISABLED'}\` \\| FPS Mode: \`${sys.enableFPSMode ? 'ON 🎮' : 'OFF'}\` \\| XYZ HUD: \`${sys.showXYZCoords ? 'ON' : 'OFF'}\` \\| Font Scale: \`${(sys.fontSizeScale || 1.5).toFixed(2)}x\` |\n\n`;
      report += `---\n\n`;
    });

    return report;
  }

  clearDiagnosticLogs() {
    this.diagnosticLogs = [];
  }
}

