/**
 * Atmosphere Domain Tools
 * Handles ambient weather particle systems (cherry blossom sakura petals & winter snowfall).
 */

export const AtmosphereTools = {
  name: 'atmosphere',
  tools: [
    {
      name: 'setWeather',
      description: 'Configure ambient weather particle systems (sakura petals and snowfall).',
      parameters: {
        type: 'object',
        properties: {
          sakuraRain: { type: 'boolean', description: 'Enable falling cherry blossom sakura petals' },
          snowFall: { type: 'boolean', description: 'Enable snowfall winter particles' }
        }
      },
      sanitize: (args, settings) => ({
        sakuraRain: args.sakuraRain !== undefined ? !!args.sakuraRain : settings.sakuraRain,
        snowFall: args.snowFall !== undefined ? !!args.snowFall : settings.snowFall
      }),
      execute: (args, ctx) => {
        const s = ctx.currentSettings;
        if (args.sakuraRain !== undefined) {
          s.sakuraRain = args.sakuraRain;
          ctx.syncUI('setting-sakuraRain', args.sakuraRain, true);
        }
        if (args.snowFall !== undefined) {
          s.snowFall = args.snowFall;
          ctx.syncUI('setting-snowFall', args.snowFall, true);
        }
        return `Weather: Sakura=${s.sakuraRain ? 'ON' : 'OFF'}, Snow=${s.snowFall ? 'ON' : 'OFF'}`;
      }
    }
  ],

  parseIntent: (text, currentSettings, isChinese) => {
    const toolCalls = [];
    const actionsSummary = [];

    // Helper: word boundary matcher for English, substring for CJK
    const matchTopic = (regex, cjkWords) => regex.test(text) || cjkWords.some(w => text.includes(w));
    const matchNegation = (topicRegex, cjkStopWords) => {
      // Check for explicit "turn off / stop / disable / clear" associated with weather/topic
      const enNegation = new RegExp(`\\b(stop|disable|turn off|shut off|clear|remove)\\b.*${topicRegex.source}|${topicRegex.source}.*\\b(stop|off)\\b`, 'i');
      const cjkNegation = cjkStopWords.some(w => text.includes(w));
      return enNegation.test(text) || cjkNegation;
    };

    // 1. General Weather Turn Off ("turn off the weather", "clear weather", "关掉天气")
    const isGeneralWeatherClear = /\b(turn off|stop|disable|clear)\s+(?:all\s+)?(?:the\s+)?weather\b/i.test(text) || text.includes('关闭天气') || text.includes('关掉天气');
    if (isGeneralWeatherClear) {
      toolCalls.push({ name: 'setWeather', args: { sakuraRain: false, snowFall: false } });
      actionsSummary.push(isChinese ? '关闭了所有天气特效' : 'turned off weather effects');
      return { toolCalls, actionsSummary };
    }

    // 2. Sakura Cherry Blossoms
    const isSakuraTopic = matchTopic(/\b(sakura|cherry blossom|petals?)\b/i, ['樱花', '花瓣']);
    if (isSakuraTopic) {
      const isStop = matchNegation(/(sakura|cherry blossom|petals?)/, ['停止樱花', '关闭樱花', '关樱花', '关掉樱花', '别下樱花', '停樱花']) ||
                     /\b(turn off|stop|disable|clear|remove|no)\s+(?:the\s+)?(?:sakura|petals|cherry)\b/i.test(text);
      const enable = !isStop;
      toolCalls.push({ name: 'setWeather', args: { sakuraRain: enable } });
      actionsSummary.push(isChinese ? (enable ? '开启了樱花雨 🌸' : '关闭了樱花雨') : (enable ? 'turned on sakura petals 🌸' : 'turned off sakura petals'));
    }

    // 3. Snowfall
    const isSnowTopic = matchTopic(/\b(snow|snowfall|blizzard|winter)\b/i, ['雪', '下雪', '落雪', '雪花', '开下雪']);
    if (isSnowTopic) {
      const isStop = matchNegation(/(snow|snowfall|blizzard)/, ['停止下雪', '关闭下雪', '关雪', '关掉下雪', '别下雪', '停雪']) ||
                     /\b(turn off|stop|disable|clear|remove|no)\s+(?:the\s+)?snow\b/i.test(text);
      const enable = !isStop;
      toolCalls.push({ name: 'setWeather', args: { snowFall: enable } });
      actionsSummary.push(isChinese ? (enable ? '开启了飘雪效果 ❄️' : '关闭了飘雪效果') : (enable ? 'activated snowfall particles ❄️' : 'turned off snowfall'));
    }

    return { toolCalls, actionsSummary };
  }
};
