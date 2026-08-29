const Logger = require('./Logger.js');

class MockSteamClient {
  constructor() {
    this.isInitialized = true;
    this.isMock = true;
    this.friends = {
      getPersonaName: () => "Guest Pet Owner 🐰"
    };
    this.userStats = {
      resetAllStats: (achievementsToo) => {
        console.log(`[Mock Steam] All stats and achievements reset on mock client (achievementsToo: ${achievementsToo})`);
        return true;
      },
      storeStats: () => {
        console.log(`[Mock Steam] Stats stored.`);
        return true;
      }
    };
  }
  on(event, callback) {
    console.log(`[Mock Steam] Event listener registered for ${event}`);
  }
  shutdown() {
    console.log(`[Mock Steam] Shutdown mock client.`);
  }
}

class SteamService {
  constructor() {
    this.steamClient = null;
    this.isOverlayActive = false;
  }

  async initialize(onOverlayChange) {
    Logger.logDiagnostic('Loading Steamworks module @skyatnpm/steamworks-js...');
    try {
      const { SteamClient } = require('@skyatnpm/steamworks-js');
      Logger.logDiagnostic('Steamworks module loaded successfully. Initializing against App ID 480...');
      const realClient = new SteamClient();
      const success = await realClient.init(480);
      if (success) {
        this.steamClient = realClient;
        Logger.logDiagnostic(`Steamworks API initialized successfully. Active user: ${this.steamClient.friends.getPersonaName()}`);

        if (this.steamClient.userStats && typeof this.steamClient.userStats.resetAllStats === 'function') {
          try {
            this.steamClient.userStats.resetAllStats(true);
            if (typeof this.steamClient.userStats.storeStats === 'function') {
              this.steamClient.userStats.storeStats();
            }
            Logger.logDiagnostic('[Steam Startup] Force-wiped AppID 480 testing stats on Steam Cloud.');
          } catch (e) {
            Logger.logDiagnostic(`[Steam Startup] Cloud stats reset skipped: ${e.message || e}`);
          }
        }

        this.steamClient.on('gameOverlayActivated', (active) => {
          Logger.logDiagnostic(`[Steam Event] Overlay activated state changed to: ${active}`);
          this.isOverlayActive = active;
          if (onOverlayChange) {
            onOverlayChange(active);
          }
        });
      } else {
        throw new Error('SteamClient.init returned false');
      }
    } catch (err) {
      Logger.logDiagnostic(`Steamworks initialization failed (${err.message}). Falling back to MockSteamClient.`);
      this.steamClient = new MockSteamClient();
    }
  }

  getClient() {
    return this.steamClient;
  }
}

module.exports = SteamService;
