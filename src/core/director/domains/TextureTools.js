/**
 * Texture & Flag Domain Tools
 * Handles flag presets, cloth wave physics, wind speed, wave amplitude,
 * surface roughness, and metalness.
 */

export const TextureTools = {
  name: 'texture',
  tools: [
    {
      name: 'setTextureSettings',
      description: 'Configure flag texture preset, wind speed, wave intensity, roughness, and metalness.',
      parameters: {
        type: 'object',
        properties: {
          flagPreset: { type: 'string', description: 'Preset flag: "default", "world", "cyber", "star", "rainbow"' },
          flagWindSpeed: { type: 'number', description: 'Wind speed multiplier (0.5 to 10.0)' },
          flagWaveIntensity: { type: 'number', description: 'Wave amplitude (0.05 to 1.50)' },
          textureRoughness: { type: 'number', description: 'Surface roughness (0.0 to 1.0)' },
          textureMetalness: { type: 'number', description: 'Surface metalness (0.0 to 1.0)' }
        }
      },
      sanitize: (args, settings) => {
        const clamp = (v, min, max, def) => {
          const num = parseFloat(v);
          if (isNaN(num)) return def;
          return parseFloat(Math.max(min, Math.min(max, num)).toFixed(2));
        };
        const validPresets = ['default', 'world', 'cyber', 'star', 'rainbow'];
        const preset = args.flagPreset && validPresets.includes(args.flagPreset.toLowerCase()) ? args.flagPreset.toLowerCase() : undefined;
        return {
          flagPreset: preset,
          flagWindSpeed: args.flagWindSpeed !== undefined ? clamp(args.flagWindSpeed, 0.5, 10.0, settings.flagWindSpeed || 3.5) : undefined,
          flagWaveIntensity: args.flagWaveIntensity !== undefined ? clamp(args.flagWaveIntensity, 0.05, 1.5, settings.flagWaveIntensity || 0.35) : undefined,
          textureRoughness: args.textureRoughness !== undefined ? clamp(args.textureRoughness, 0.0, 1.0, settings.textureRoughness || 0.5) : undefined,
          textureMetalness: args.textureMetalness !== undefined ? clamp(args.textureMetalness, 0.0, 1.0, settings.textureMetalness || 0.05) : undefined
        };
      },
      execute: (args, ctx) => {
        const s = ctx.currentSettings;
        const actions = [];

        if (args.flagPreset !== undefined) {
          s.flagPreset = args.flagPreset;
          s.customTexturePath = null;
          actions.push(`Flag Preset: ${args.flagPreset}`);
          if (ctx.callbacks.applyFlagPreset) ctx.callbacks.applyFlagPreset(args.flagPreset);
        }
        if (args.flagWindSpeed !== undefined) {
          s.flagWindSpeed = args.flagWindSpeed;
          ctx.syncUI('flag-wind-speed', args.flagWindSpeed);
          const valEl = typeof document !== 'undefined' ? document.getElementById('val-flag-wind-speed') : null;
          if (valEl) valEl.innerText = args.flagWindSpeed.toFixed(1);
          actions.push(`Wind Speed: ${args.flagWindSpeed}x`);
        }
        if (args.flagWaveIntensity !== undefined) {
          s.flagWaveIntensity = args.flagWaveIntensity;
          ctx.syncUI('flag-wave-intensity', args.flagWaveIntensity);
          const valEl = typeof document !== 'undefined' ? document.getElementById('val-flag-wave-intensity') : null;
          if (valEl) valEl.innerText = args.flagWaveIntensity.toFixed(2);
          actions.push(`Wave Amp: ${args.flagWaveIntensity}x`);
        }
        if (args.textureRoughness !== undefined) {
          s.textureRoughness = args.textureRoughness;
          ctx.syncUI('texture-roughness', args.textureRoughness);
          const valEl = typeof document !== 'undefined' ? document.getElementById('val-texture-roughness') : null;
          if (valEl) valEl.innerText = args.textureRoughness.toFixed(2);
        }
        if (args.textureMetalness !== undefined) {
          s.textureMetalness = args.textureMetalness;
          ctx.syncUI('texture-metalness', args.textureMetalness);
          const valEl = typeof document !== 'undefined' ? document.getElementById('val-texture-metalness') : null;
          if (valEl) valEl.innerText = args.textureMetalness.toFixed(2);
        }

        if (ctx.callbacks.updateTextureShader) ctx.callbacks.updateTextureShader();

        return actions.length > 0 ? actions.join(', ') : 'Texture settings updated';
      }
    }
  ],

  parseIntent: (text, currentSettings, isChinese) => {
    const toolCalls = [];
    const actionsSummary = [];

    // 1. Preset Flag Styles
    let matchedPreset = null;
    let presetLabel = '';
    if (/\b(cyber|neon|cyber neon|赛博|霓虹)\b/i.test(text)) {
      matchedPreset = 'cyber';
      presetLabel = isChinese ? '赛博霓虹' : 'Cyber Neon';
    } else if (/\b(world|globe|地球|世界)\b/i.test(text)) {
      matchedPreset = 'world';
      presetLabel = isChinese ? '世界地球' : 'World Globe';
    } else if (/\b(star|royal star|星星|皇家之星)\b/i.test(text)) {
      matchedPreset = 'star';
      presetLabel = isChinese ? '皇家之星' : 'Royal Star';
    } else if (/\b(rainbow|pride|彩虹)\b/i.test(text)) {
      matchedPreset = 'rainbow';
      presetLabel = isChinese ? '彩虹' : 'Pride Rainbow';
    } else if (/\b(royal|tricolor|三色旗|皇家)\b/i.test(text) && !/\b(star)\b/i.test(text)) {
      matchedPreset = 'default';
      presetLabel = isChinese ? '皇家三色' : 'Royal Tricolor';
    }

    // 2. Wind Speed & Wave Physics
    const isWindTopic = /\b(wind|wave|cloth|breeze|flutter|ripples?)\b/i.test(text) ||
                        ['风速', '风力', '飘动', '波动', '旗帜波浪', '波纹'].some(w => text.includes(w));

    let windSpeed = undefined;
    let waveAmp = undefined;

    if (isWindTopic) {
      const curSpeed = currentSettings.flagWindSpeed || 3.5;
      const speedMatch = text.match(/wind\s*(?:speed)?\s*(?:to|=)?\s*([0-9]+(?:\.[0-9]+)?)/i) || text.match(/风速\s*([0-9]+(?:\.[0-9]+)?)/);
      if (speedMatch) {
        windSpeed = parseFloat(speedMatch[1]);
      } else if (/\b(increase|faster|more|stronger|high|up)\b/i.test(text) || ['加大', '变快', '变大', '大风', '快点', '增加'].some(w => text.includes(w))) {
        windSpeed = Math.min(10.0, curSpeed + 2.0);
      } else if (/\b(decrease|slower|less|gentle|calm|low|down)\b/i.test(text) || ['减小', '变慢', '微风', '慢点', '降低'].some(w => text.includes(w))) {
        windSpeed = Math.max(0.5, curSpeed - 1.5);
      }
    }

    if (matchedPreset || windSpeed !== undefined || waveAmp !== undefined) {
      toolCalls.push({
        name: 'setTextureSettings',
        args: {
          flagPreset: matchedPreset || undefined,
          flagWindSpeed: windSpeed !== undefined ? parseFloat(windSpeed.toFixed(1)) : undefined,
          flagWaveIntensity: waveAmp !== undefined ? parseFloat(waveAmp.toFixed(2)) : undefined
        }
      });

      if (matchedPreset) {
        actionsSummary.push(isChinese ? `应用了${presetLabel}旗帜样式` : `applied ${presetLabel} flag style`);
      }
      if (windSpeed !== undefined) {
        actionsSummary.push(isChinese ? `将旗帜风速调整为 ${windSpeed.toFixed(1)}x` : `set flag wind speed to ${windSpeed.toFixed(1)}x`);
      }
    }

    return { toolCalls, actionsSummary };
  }
};
