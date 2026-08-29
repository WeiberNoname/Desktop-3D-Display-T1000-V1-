/**
 * Display & Model Domain Tools
 * Handles mascot scale, floating bobbing, continuous rotation/spin,
 * active model switching, frame rate targeting, and camera re-centering.
 */

export const DisplayTools = {
  name: 'display',
  tools: [
    {
      name: 'setModelScale',
      description: 'Set mascot size/scale multiplier between 0.2x and 3.0x.',
      parameters: {
        type: 'object',
        properties: {
          scale: { type: 'number', description: 'Scale multiplier (e.g. 1.0 is default, 1.5 is 150%, 0.8 is smaller)' }
        },
        required: ['scale']
      },
      sanitize: (args, settings) => {
        let val = parseFloat(args.scale);
        if (isNaN(val)) val = settings.scale || 1.0;
        // Auto-clamp guardrail between 0.2 and 3.0
        return { scale: parseFloat(Math.max(0.2, Math.min(3.0, val)).toFixed(2)) };
      },
      execute: (args, ctx) => {
        ctx.currentSettings.scale = args.scale;
        ctx.syncUI('setting-scale', args.scale);
        const valEl = typeof document !== 'undefined' ? document.getElementById('val-scale') : null;
        if (valEl) valEl.innerText = `${args.scale}x`;
        if (ctx.callbacks.updateScale) ctx.callbacks.updateScale(args.scale);
        return `Model Scale: ${args.scale}x`;
      }
    },
    {
      name: 'setBobbing',
      description: 'Enable or disable the gentle floating/bobbing up and down animation.',
      parameters: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', description: 'True to enable bobbing, false to disable.' }
        },
        required: ['enabled']
      },
      sanitize: (args) => ({ enabled: !!args.enabled }),
      execute: (args, ctx) => {
        ctx.currentSettings.bobbing = args.enabled;
        ctx.syncUI('setting-bobbing', args.enabled, true);
        return `Floating Bobbing: ${args.enabled ? 'ON' : 'OFF'}`;
      }
    },
    {
      name: 'setSpinRotation',
      description: 'Configure continuous 3D rotation/spinning across X, Y, and Z axes with speed multipliers.',
      parameters: {
        type: 'object',
        properties: {
          spinX: { type: 'boolean', description: 'Spin on X axis' },
          spinY: { type: 'boolean', description: 'Spin on Y axis (standard turntable)' },
          spinZ: { type: 'boolean', description: 'Spin on Z axis (barrel roll)' },
          speedX: { type: 'number', description: 'Speed multiplier for X (0.1 to 5.0)' },
          speedY: { type: 'number', description: 'Speed multiplier for Y (0.1 to 5.0)' },
          speedZ: { type: 'number', description: 'Speed multiplier for Z (0.1 to 5.0)' }
        }
      },
      sanitize: (args, settings) => {
        const clampSpeed = (v, def) => {
          const num = parseFloat(v);
          if (isNaN(num)) return def;
          return parseFloat(Math.max(0.1, Math.min(5.0, num)).toFixed(2));
        };
        return {
          spinX: args.spinX !== undefined ? !!args.spinX : settings.spinX,
          spinY: args.spinY !== undefined ? !!args.spinY : settings.spinY,
          spinZ: args.spinZ !== undefined ? !!args.spinZ : settings.spinZ,
          speedX: clampSpeed(args.speedX, settings.speedX || 1.0),
          speedY: clampSpeed(args.speedY, settings.speedY || 1.0),
          speedZ: clampSpeed(args.speedZ, settings.speedZ || 1.0)
        };
      },
      execute: (args, ctx) => {
        const s = ctx.currentSettings;
        if (args.spinX !== undefined) { s.spinX = args.spinX; ctx.syncUI('setting-spinX', args.spinX, true); }
        if (args.spinY !== undefined) { s.spinY = args.spinY; ctx.syncUI('setting-spinY', args.spinY, true); }
        if (args.spinZ !== undefined) { s.spinZ = args.spinZ; ctx.syncUI('setting-spinZ', args.spinZ, true); }
        if (args.speedX !== undefined) { s.speedX = args.speedX; ctx.syncUI('setting-speedX', args.speedX); }
        if (args.speedY !== undefined) { s.speedY = args.speedY; ctx.syncUI('setting-speedY', args.speedY); }
        if (args.speedZ !== undefined) { s.speedZ = args.speedZ; ctx.syncUI('setting-speedZ', args.speedZ); }
        return `Spin Rotation: X=${s.spinX}, Y=${s.spinY}, Z=${s.spinZ} (Speed Y=${s.speedY}x)`;
      }
    },
    {
      name: 'setActiveModel',
      description: 'Switch the active 3D mascot model (e.g. "procedural", "flag", or custom scanned asset).',
      parameters: {
        type: 'object',
        properties: {
          modelName: { type: 'string', description: 'Model name' }
        },
        required: ['modelName']
      },
      sanitize: (args) => ({ modelName: String(args.modelName || 'procedural').trim() }),
      execute: (args, ctx) => {
        ctx.currentSettings.activeModel = args.modelName;
        ctx.syncUI('setting-activeModel', args.modelName);
        if (ctx.callbacks.loadCustomModel) ctx.callbacks.loadCustomModel(args.modelName);
        return `Active Model: ${args.modelName}`;
      }
    },
    {
      name: 'setTargetFps',
      description: 'Set target frame rate limit (30, 60, 120, 144).',
      parameters: {
        type: 'object',
        properties: {
          targetFps: { type: 'number', description: 'Target FPS (30, 60, 120, 144)' }
        },
        required: ['targetFps']
      },
      sanitize: (args) => {
        const allowed = [30, 60, 120, 144];
        let val = parseInt(args.targetFps, 10);
        if (!allowed.includes(val)) val = 60;
        return { targetFps: val };
      },
      execute: (args, ctx) => {
        ctx.currentSettings.targetFps = args.targetFps;
        ctx.syncUI('setting-targetFps', args.targetFps);
        return `Target FPS: ${args.targetFps}`;
      }
    },
    {
      name: 'resetPosition',
      description: 'Reset mascot position and camera to the center of the screen.',
      parameters: {
        type: 'object',
        properties: {}
      },
      execute: (args, ctx) => {
        if (ctx.callbacks.resetCameraAndPosition) ctx.callbacks.resetCameraAndPosition();
        return `Reset Window & Camera Position`;
      }
    }
  ],

  parseIntent: (text, currentSettings, isChinese) => {
    const toolCalls = [];
    const actionsSummary = [];
    const hasAny = (...words) => words.some(w => text.includes(w.toLowerCase()));

    // 1. General "Stop All Animations"
    if (/\b(stop|disable|clear)\s+(?:all\s+)?animations?\b/i.test(text) || text.includes('停止所有动画') || text.includes('停止动画')) {
      toolCalls.push({ name: 'setSpinRotation', args: { spinX: false, spinY: false, spinZ: false } });
      toolCalls.push({ name: 'setBobbing', args: { enabled: false } });
      actionsSummary.push(isChinese ? '停止了所有旋转与浮动动画' : 'stopped all animations');
    }

    // 2. Scale Intent
    const isScaleTopic = /\b(scale|size|resize|zoom|bigger|larger|giant|huge|smaller|tiny|shrink|grow)\b/i.test(text) ||
                         ['放大', '缩小', '变大', '变小', '尺寸', '缩放', '调大', '调小', '大一点', '小一点', '大些', '小些', '倍'].some(w => text.includes(w));
    if (isScaleTopic) {
      // Look for explicit number with or without x (e.g. 100x, 2.5x, 0.8, 150%)
      const numMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:x|倍|\%)?/i);
      let targetScale = null;

      const isABit = /\b(a bit|a little|slightly|little bit)\b/i.test(text) || ['一点', '稍微', '些许', '小幅'].some(w => text.includes(w));
      const isSmaller = /\b(smaller|tiny|shrink)\b/i.test(text) || ['缩小', '变小', '调小', '小一点', '小些'].some(w => text.includes(w));
      const isBigger = /\b(bigger|larger|giant|huge|grow)\b/i.test(text) || ['放大', '变大', '调大', '大一点', '大些'].some(w => text.includes(w));

      if (numMatch && parseFloat(numMatch[1]) > 0) {
        let val = parseFloat(numMatch[1]);
        if (text.includes('%')) val = val / 100;
        targetScale = Math.max(0.2, Math.min(3.0, val));
      } else if (isSmaller) {
        const delta = isABit ? 0.2 : 0.4;
        targetScale = Math.max(0.3, (currentSettings.scale || 1.0) - delta);
      } else if (isBigger || isScaleTopic) {
        const delta = isABit ? 0.2 : 0.4;
        targetScale = Math.min(3.0, (currentSettings.scale || 1.0) + delta);
      }

      if (targetScale !== null) {
        targetScale = parseFloat(targetScale.toFixed(2));
        toolCalls.push({ name: 'setModelScale', args: { scale: targetScale } });
        actionsSummary.push(isChinese ? `将模型尺寸调整为 ${targetScale}x` : `scaled model to ${targetScale}x`);
      }
    }

    // 3. Bobbing Intent (Floating)
    const isBobbingTopic = /\b(bobbing|floating|float|hover|breathe)\b/i.test(text) ||
                           ['漂浮', '悬浮', '浮动', '上下浮动'].some(w => text.includes(w));
    if (isBobbingTopic) {
      const isStop = /\b(stop|disable|turn off|shut off|no)\s+(?:bobbing|floating|float)\b/i.test(text) ||
                     ['停止浮动', '关闭浮动', '关掉浮动', '别漂', '不要浮动'].some(w => text.includes(w));
      const enabled = !isStop;
      toolCalls.push({ name: 'setBobbing', args: { enabled } });
      actionsSummary.push(isChinese ? (enabled ? '开启了浮动动画' : '停止了浮动动画') : (enabled ? 'enabled gentle bobbing' : 'stopped bobbing'));
    }

    // 4. Spin Intent (Continuous Rotation)
    const isSpinTopic = /\b(spin|rotate|rotation|turntable|revolve|roll)\b/i.test(text) ||
                        ['旋转', '自转', '转动', '转圈', '转快', '转慢', '转起来'].some(w => text.includes(w));
    if (isSpinTopic) {
      const isStop = /\b(stop|disable|turn off|shut off|no)\s+(?:spin|rotation|rotating)\b/i.test(text) ||
                     ['停止旋转', '关闭旋转', '关掉旋转', '别转', '不要转', '停下'].some(w => text.includes(w));
      if (isStop) {
        toolCalls.push({ name: 'setSpinRotation', args: { spinX: false, spinY: false, spinZ: false } });
        actionsSummary.push(isChinese ? '停止了旋转' : 'stopped rotation');
      } else {
        const speedMatch = text.match(/(?:speed|faster|at|速度|倍速)\s*([0-9]+(?:\.[0-9]+)?)/i) || text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:x|倍速)/i);
        let speed = 1.0;
        if (speedMatch) speed = parseFloat(speedMatch[1]);
        else if (/\b(faster|fast|really fast)\b/i.test(text) || ['快点', '加速', '转快'].some(w => text.includes(w))) speed = 2.5;
        else if (/\b(slow|slower)\b/i.test(text) || ['慢点', '减速', '转慢'].some(w => text.includes(w))) speed = 0.5;

        const spinX = /\b(x axis|pitch)\b/i.test(text) || text.includes('x轴');
        const spinZ = /\b(z axis|barrel)\b/i.test(text) || text.includes('z轴');
        const spinY = /\b(y axis|yaw)\b/i.test(text) || text.includes('y轴') || (!spinX && !spinZ);

        toolCalls.push({
          name: 'setSpinRotation',
          args: { spinX, spinY, spinZ, speedX: speed, speedY: speed, speedZ: speed }
        });
        actionsSummary.push(isChinese ? `开启了旋转 (${speed}x)` : `set spin rotation to ${speed}x`);
      }
    }

    // 5. Model Switching Intent
    const isModelSwitch = (/\b(switch|change|load|use|set)\b/i.test(text) && /\b(model|procedural|flag)\b/i.test(text)) ||
                          ['切换模型', '换模型', '换角色', 'procedural model', 'flag model', '程序化模型'].some(w => text.includes(w));
    if (isModelSwitch) {
      const modelName = /\bflag\b/i.test(text) || text.includes('旗帜') ? 'flag' : 'procedural';
      toolCalls.push({ name: 'setActiveModel', args: { modelName } });
      actionsSummary.push(isChinese ? `切换模型为 ${modelName}` : `switched model to ${modelName}`);
    }

    // 6. FPS Target Intent
    const fpsMatch = text.match(/(?:fps|frame rate|帧率|帧数|刷新率)(?: to)?\s*(30|60|120|144)/i) ||
                     text.match(/(30|60|120|144)\s*(?:fps|帧)/i);
    if (fpsMatch) {
      const fps = parseInt(fpsMatch[1], 10);
      toolCalls.push({ name: 'setTargetFps', args: { targetFps: fps } });
      actionsSummary.push(isChinese ? `设置帧率为 ${fps} FPS` : `set target to ${fps} FPS`);
    }

    // 7. Reset Position Intent
    if (/\b(reset|center|home|re-center|back in the center|center position)\b/i.test(text) ||
        ['复位', '重置', '居中', '回到中心', '归位', '初始位置', '还原'].some(w => text.includes(w))) {
      toolCalls.push({ name: 'resetPosition', args: {} });
      actionsSummary.push(isChinese ? '将视角与位置居中复位' : 're-centered position & camera');
    }

    return { toolCalls, actionsSummary };
  }
};
