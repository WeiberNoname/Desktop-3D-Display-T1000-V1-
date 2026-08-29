/**
 * Sound & Piano Domain Tools
 * Handles acoustic synthesizer volume, ambient audio, and piano controls.
 */

export const SoundTools = {
  name: 'sound',
  tools: [
    {
      name: 'setSoundVolume',
      description: 'Configure master sound and synthesizer volumes (0.0 to 1.0).',
      parameters: {
        type: 'object',
        properties: {
          pianoVolume: { type: 'number', description: 'Piano synthesizer volume (0.0 to 1.0)' },
          drumVolume: { type: 'number', description: 'Drum sound effects volume (0.0 to 1.0)' }
        }
      },
      sanitize: (args, settings) => {
        const clamp = (v, def) => {
          const num = parseFloat(v);
          if (isNaN(num)) return def;
          return parseFloat(Math.max(0, Math.min(1.0, num)).toFixed(2));
        };
        return {
          pianoVolume: args.pianoVolume !== undefined ? clamp(args.pianoVolume, settings.pianoVolume !== undefined ? settings.pianoVolume : 0.85) : undefined,
          drumVolume: args.drumVolume !== undefined ? clamp(args.drumVolume, settings.soundDrumVolume !== undefined ? settings.soundDrumVolume : 0.7) : undefined
        };
      },
      execute: (args, ctx) => {
        const s = ctx.currentSettings;
        if (args.pianoVolume !== undefined) {
          s.pianoVolume = args.pianoVolume;
          ctx.syncUI('piano-vol-slider', args.pianoVolume);
        }
        if (args.drumVolume !== undefined) {
          s.soundDrumVolume = args.drumVolume;
          ctx.syncUI('sound-drum-vol', args.drumVolume);
        }
        return `Sound: Piano Vol=${Math.round((s.pianoVolume !== undefined ? s.pianoVolume : 0.85) * 100)}%`;
      }
    }
  ],

  parseIntent: (text, currentSettings, isChinese) => {
    const toolCalls = [];
    const actionsSummary = [];

    const isSoundTopic = /\b(sound|volume|mute|louder|quieter|piano volume|turn down|turn up)\b/i.test(text) ||
                         ['音量', '声音', '静音', '大声点', '小声点', '调小音量', '调大音量', '钢琴音量'].some(w => text.includes(w));

    if (isSoundTopic) {
      let currentVol = currentSettings.pianoVolume !== undefined ? currentSettings.pianoVolume : 0.85;
      let newVol = currentVol;

      if (/\b(mute|shut up|silence)\b/i.test(text) || text.includes('静音') || text.includes('关掉声音')) {
        newVol = 0.0;
      } else if (/\b(turn up|louder|increase volume|up the volume)\b/i.test(text) || text.includes('大声') || text.includes('调大音量')) {
        newVol = Math.min(1.0, currentVol + 0.2);
      } else if (/\b(turn down|quieter|lower volume|down the volume|a little bit)\b/i.test(text) || text.includes('小声') || text.includes('调小音量')) {
        newVol = Math.max(0.1, currentVol - 0.2);
      }

      newVol = parseFloat(newVol.toFixed(2));
      toolCalls.push({ name: 'setSoundVolume', args: { pianoVolume: newVol } });
      actionsSummary.push(isChinese ? `调整钢琴音量为 ${Math.round(newVol * 100)}%` : `set piano volume to ${Math.round(newVol * 100)}%`);
    }

    return { toolCalls, actionsSummary };
  }
};
