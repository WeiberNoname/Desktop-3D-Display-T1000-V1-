/**
 * Helper script to launch Steam Client Console and guide developer through resetting test stats/achievements.
 * Usage: node reset_steam_stats.js
 */

const { exec } = require('child_process');

console.log('================================================================================');
console.log('STEAM CLOUD STATS & ACHIEVEMENTS RESET UTILITY');
console.log('================================================================================\n');

console.log('Launching Steam Client Console via URI (steam://open/console)...');

exec('start steam://open/console', (error) => {
  if (error) {
    console.error('Failed to launch Steam console automatically:', error.message);
    console.log('\nManual Alternative:');
    console.log('1. Press Win + R to open Windows Run dialog.');
    console.log('2. Type: steam://open/console and press Enter.\n');
  } else {
    console.log('✓ Steam Console opened successfully in your Steam client!\n');
  }

  console.log('--------------------------------------------------------------------------------');
  console.log('INSTRUCTIONS TO RESET YOUR STEAM TEST ACCOUNT ACHIEVEMENTS:');
  console.log('--------------------------------------------------------------------------------');
  console.log('1. Switch to the newly opened "Console" tab inside your Steam Client window.');
  console.log('2. Type the following command and hit Enter:\n');
  console.log('     reset_all_stats 480\n');
  console.log('   (Replace 480 with your custom App ID if using a registered Steam app).\n');
  console.log('3. Restart your Steam client.');
  console.log('4. Verify that achievement progress on your Steam library page is reset to 0%!\n');
  console.log('================================================================================');
});
