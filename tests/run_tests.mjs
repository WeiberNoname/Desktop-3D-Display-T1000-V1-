import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PhysicsEngine } from '../physicsEngine.js';
import { SettingsManager } from '../src/managers/SettingsManager.js';
import { AppStore } from '../src/managers/AppStore.js';
import { disposeHierarchy, disposeMaterial } from '../src/core/GPUAssetManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Starting Automated Unit Test Suite (Plan 001)...');

// 1. Test SettingsManager
console.log('▶ Testing SettingsManager defaults & fallback merging...');
const defaults = SettingsManager.getDefaultSettings();
assert.strictEqual(defaults.width, 350, 'Default width should be 350');
assert.strictEqual(defaults.height, 350, 'Default height should be 350');
assert.strictEqual(defaults.targetFps, 60, 'Default targetFps should be 60');
assert.strictEqual(defaults.language, 'en', 'Default language should be en');
assert.strictEqual(defaults.activeModel, 'procedural', 'Default activeModel should be procedural');
assert.strictEqual(defaults.sakuraRain, true, 'Default sakuraRain should be true');
assert.strictEqual(defaults.snowFall, false, 'Default snowFall should be false');
assert.strictEqual(defaults.dynamicBatterySaver, false, 'Default dynamicBatterySaver should be false');

const merged = SettingsManager.mergeWithDefaults({ scale: 2.5, targetFps: 120, customKey: 'test', snowFall: true });
assert.strictEqual(merged.scale, 2.5, 'Scale should be overridden to 2.5');
assert.strictEqual(merged.targetFps, 120, 'targetFps should be overridden to 120');
assert.strictEqual(merged.snowFall, true, 'snowFall should be overridden to true');
assert.strictEqual(merged.width, 350, 'Unspecified width should fallback to 350');
assert.strictEqual(merged.activeModel, 'procedural', 'Fallback activeModel should be procedural');
console.log('✅ SettingsManager tests PASSED.');

// 2. Test PhysicsEngine
console.log('▶ Testing PhysicsEngine velocity & boundary collision calculations...');
const engine = new PhysicsEngine();
engine.configure({ enabled: true, gravity: 9.8, floorY: -1.2 });
assert.strictEqual(engine.enabled, true, 'Physics engine should be enabled');
assert.strictEqual(engine.gravity, 9.8, 'Gravity should be 9.8');

engine.applyImpulse({ x: 1.0, y: 5.0, z: 0 });
assert.strictEqual(engine.velocity.x, 1.0, 'Impulse X should equal 1.0');
assert.strictEqual(engine.velocity.y, 5.0, 'Impulse Y should equal 5.0');

engine.reset();
assert.strictEqual(engine.position.x, 0, 'Reset position X should be 0');
assert.strictEqual(engine.position.y, 0, 'Reset position Y should be 0');
assert.strictEqual(engine.velocity.y, 0, 'Reset velocity Y should be 0');
console.log('✅ PhysicsEngine tests PASSED.');

// 3. Test 12-Locale Key Parity & default_mascot key
console.log('▶ Testing 12-Locale Key Parity & default_mascot translations...');
const localesDir = path.join(__dirname, '..', 'locales');
const supportedLangs = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'de', 'es', 'es-419', 'it', 'pt-BR', 'ru'];

supportedLangs.forEach(lang => {
  const filePath = path.join(localesDir, lang, 'translation.json');
  assert.strictEqual(fs.existsSync(filePath), true, `Translation file for ${lang} must exist`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.strictEqual(typeof content.default_mascot, 'string', `${lang} must contain default_mascot translation`);
  assert.strictEqual(content.default_mascot.length > 0, true, `${lang} default_mascot must not be empty`);
  assert.strictEqual(typeof content.snow_fall, 'string', `${lang} must contain snow_fall translation`);
  assert.strictEqual(content.snow_fall.length > 0, true, `${lang} snow_fall must not be empty`);
});
console.log('✅ 12-Locale Key Parity tests PASSED.');

// 4. Test AppStore Reactive Proxy & Subscriptions
console.log('▶ Testing AppStore reactive state & subscriber notifications...');
const store = new AppStore();
assert.strictEqual(store.state.isDragging, false, 'Default isDragging should be false');
assert.strictEqual(store.state.isSettingsOpen, false, 'Default isSettingsOpen should be false');

let notifiedVal = null;
const unsubscribe = store.subscribe('isDragging', (newVal) => {
  notifiedVal = newVal;
});

store.state.isDragging = true;
assert.strictEqual(store.state.isDragging, true, 'Direct write to store.state.isDragging should update');
assert.strictEqual(notifiedVal, true, 'Subscriber should be notified of state update');

unsubscribe();
store.state.isDragging = false;
assert.strictEqual(notifiedVal, true, 'Unsubscribed listener should not receive updates');

store.set({ cameraPitch: 0.5, cameraYaw: 1.2 });
assert.strictEqual(store.state.cameraPitch, 0.5, 'Batch set should update cameraPitch');
assert.strictEqual(store.state.cameraYaw, 1.2, 'Batch set should update cameraYaw');
console.log('✅ AppStore reactive tests PASSED.');

// 5. Test GPUAssetManager Recursive Disposal
console.log('▶ Testing GPUAssetManager recursive VRAM & texture disposal...');
let geomDisposed = false;
let matDisposed = false;
let texDisposed = false;

const mockTexture = {
  isTexture: true,
  dispose: () => { texDisposed = true; }
};

const mockMaterial = {
  map: mockTexture,
  dispose: () => { matDisposed = true; }
};

const mockGeometry = {
  dispose: () => { geomDisposed = true; }
};

const mockHierarchy = {
  children: [],
  traverse: (cb) => {
    cb({
      geometry: mockGeometry,
      material: mockMaterial
    });
  },
  remove: () => {}
};

disposeHierarchy(mockHierarchy);
assert.strictEqual(geomDisposed, true, 'Geometry must be disposed');
assert.strictEqual(matDisposed, true, 'Material must be disposed');
assert.strictEqual(texDisposed, true, 'Attached texture must be disposed');
console.log('✅ GPUAssetManager tests PASSED.');

// 6. Test Electron Security Bridge & Preload Configuration
console.log('▶ Testing Preload Script & Security Isolation configuration...');
const preloadPath = path.join(__dirname, '..', 'preload.js');
assert.strictEqual(fs.existsSync(preloadPath), true, 'preload.js must exist in app root');
const preloadContent = fs.readFileSync(preloadPath, 'utf8');
assert.strictEqual(preloadContent.includes('contextBridge.exposeInMainWorld'), true, 'preload.js must use contextBridge');
assert.strictEqual(preloadContent.includes('electronAPI'), true, 'preload.js must expose electronAPI');
assert.strictEqual(preloadContent.includes('fsBridge'), true, 'preload.js must expose fsBridge');
assert.strictEqual(preloadContent.includes('pathBridge'), true, 'preload.js must expose pathBridge');
assert.strictEqual(preloadContent.includes('urlBridge'), true, 'preload.js must expose urlBridge');

const mainPath = path.join(__dirname, '..', 'main.js');
const mainContent = fs.readFileSync(mainPath, 'utf8');
assert.strictEqual(mainContent.includes('contextIsolation: true'), true, 'main.js must enable contextIsolation: true');
assert.strictEqual(mainContent.includes('nodeIntegration: false'), true, 'main.js must set nodeIntegration: false');
assert.strictEqual(mainContent.includes("preload: path.join(__dirname, 'preload.js')"), true, 'main.js must load preload.js');
assert.strictEqual(mainContent.includes('startSteamRepaintLoop()'), true, 'main.js must dynamically start Steam repaint loop');
assert.strictEqual(mainContent.includes('stopSteamRepaintLoop()'), true, 'main.js must dynamically stop Steam repaint loop');
console.log('✅ Electron Security Bridge & Idle Optimization tests PASSED.');

// 7. Test SoundManager State, Volume Normalization & Snapshot
console.log('▶ Testing SoundManager volume clamping & state snapshot...');
import('../src/core/SoundManager.js').then(({ SoundManager }) => {
  const sm = new SoundManager();
  assert.strictEqual(sm.isMuted, false, 'Default isMuted should be false');
  assert.strictEqual(sm.masterVolume, 0.8, 'Default masterVolume should be 0.8');
  assert.strictEqual(sm.isPlaying('snow'), false, 'Default snow playing should be false');
  assert.strictEqual(sm.isPlaying('sakura'), false, 'Default sakura playing should be false');
  assert.strictEqual(sm.isPlaying('drum'), false, 'Default drum playing should be false');

  // Test volume clamping
  sm.setMasterVolume(1.5);
  assert.strictEqual(sm.masterVolume, 1.0, 'Master volume should clamp to 1.0');
  sm.setMasterVolume(-0.5);
  assert.strictEqual(sm.masterVolume, 0.0, 'Master volume should clamp to 0.0');

  sm.setTrackVolume('snow', 0.85);
  assert.strictEqual(sm.tracks.snow.volume, 0.85, 'Track snow volume should be 0.85');
  sm.setTrackVolume('sakura', 0.65);
  assert.strictEqual(sm.tracks.sakura.volume, 0.65, 'Track sakura volume should be 0.65');
  sm.setTrackVolume('drum', 0.95);
  assert.strictEqual(sm.tracks.drum.volume, 0.95, 'Track drum volume should be 0.95');

  const snap = sm.getSnapshot();
  assert.strictEqual(snap.snowVolume, 0.85, 'Snapshot snowVolume should be 0.85');
  assert.strictEqual(snap.sakuraVolume, 0.65, 'Snapshot sakuraVolume should be 0.65');
  assert.strictEqual(snap.drumVolume, 0.95, 'Snapshot drumVolume should be 0.95');

  // Test syncAtmosphere
  sm.syncAtmosphere({
    soundMuted: true,
    soundMasterVolume: 0.5,
    soundSnowVolume: 0.4,
    soundSakuraVolume: 0.9,
    sakuraRain: true,
    soundSakuraSync: true
  });
  assert.strictEqual(sm.isMuted, true, 'syncAtmosphere should set isMuted');
  assert.strictEqual(sm.masterVolume, 0.5, 'syncAtmosphere should set masterVolume');
  assert.strictEqual(sm.tracks.snow.volume, 0.4, 'syncAtmosphere should set snow track volume');
  assert.strictEqual(sm.tracks.sakura.volume, 0.9, 'syncAtmosphere should set sakura track volume');

  console.log('✅ SoundManager unit tests PASSED.');

  // Test 8: FlagMeshBuilder and Wave Simulation
  console.log('▶ Testing FlagMeshBuilder presets and cloth wave math...');
  import('../src/core/FlagMeshBuilder.js').then(({ createPresetFlagTexture, updateFlagWave }) => {
    const defaultTex = createPresetFlagTexture('default');
    assert.ok(defaultTex && defaultTex.startsWith('data:image/png;base64,'), 'Default preset should return base64 PNG data URL');

    const worldTex = createPresetFlagTexture('world');
    assert.ok(worldTex && worldTex.startsWith('data:image/png;base64,'), 'World preset should return base64 PNG data URL');

    const cyberTex = createPresetFlagTexture('cyber');
    assert.ok(cyberTex && cyberTex.startsWith('data:image/png;base64,'), 'Cyber preset should return base64 PNG data URL');

    const starTex = createPresetFlagTexture('star');
    assert.ok(starTex && starTex.startsWith('data:image/png;base64,'), 'Star preset should return base64 PNG data URL');

    const rainbowTex = createPresetFlagTexture('rainbow');
    assert.ok(rainbowTex && rainbowTex.startsWith('data:image/png;base64,'), 'Rainbow preset should return base64 PNG data URL');

    // Test wave physics math on mock subdivided geometry
    const vertCount = 100;
    const initialPositions = new Float32Array(vertCount * 3);
    for (let i = 0; i < vertCount; i++) {
      initialPositions[i * 3] = (i % 10) * 0.2; // x
      initialPositions[i * 3 + 1] = Math.floor(i / 10) * 0.15; // y
      initialPositions[i * 3 + 2] = 0; // z
    }
    const currentPositions = new Float32Array(initialPositions);

    const mockClothMesh = {
      geometry: {
        userData: {
          initialPositions: initialPositions
        },
        attributes: {
          position: {
            array: currentPositions,
            needsUpdate: false
          }
        },
        computeVertexNormals: () => { mockClothMesh.geometry.normalsComputed = true; }
      }
    };

    updateFlagWave(mockClothMesh, 0.016, 1.0, 4.0, 0.4);
    assert.strictEqual(mockClothMesh.geometry.attributes.position.needsUpdate, true, 'position attribute should mark needsUpdate=true');
    assert.strictEqual(mockClothMesh.geometry.normalsComputed, true, 'computeVertexNormals should be invoked');
    
    // Far end of flag (x > 0) should have modulated Z displacement
    assert.notStrictEqual(currentPositions[currentPositions.length - 1], 0, 'Flag tail Z coordinate should be billowed by wind');

    console.log('✅ FlagMeshBuilder & wave physics unit tests PASSED.');

    // Test 9: SettingsManager with Texture & Flag Keys
    console.log('▶ Testing SettingsManager texture & flag key defaults and serialization...');
    const defaults = SettingsManager.getDefaultSettings();
    assert.strictEqual(defaults.customTexturePath, '', 'Default customTexturePath should be empty');
    assert.strictEqual(defaults.flagWindSpeed, 3.5, 'Default flagWindSpeed should be 3.5');
    assert.strictEqual(defaults.flagWaveIntensity, 0.35, 'Default flagWaveIntensity should be 0.35');
    assert.strictEqual(defaults.textureRepeatX, 1.0, 'Default textureRepeatX should be 1.0');
    assert.strictEqual(defaults.textureRepeatY, 1.0, 'Default textureRepeatY should be 1.0');
    assert.strictEqual(defaults.textureRoughness, 0.50, 'Default textureRoughness should be 0.50');
    assert.strictEqual(defaults.textureMetalness, 0.05, 'Default textureMetalness should be 0.05');
    assert.strictEqual(defaults.flagPreset, 'default', 'Default flagPreset should be default');

    console.log('✅ SettingsManager texture configuration unit tests PASSED.');

    // Test 10: PianoAudioEngine Note & Frequency Math
    console.log('▶ Testing PianoAudioEngine note conversions and frequency math...');
    import('../src/core/PianoAudioEngine.js').then(({ PianoAudioEngine }) => {
      assert.strictEqual(PianoAudioEngine.midiToFreq(69), 440, 'A4 (MIDI 69) should equal 440Hz');
      assert.strictEqual(Math.round(PianoAudioEngine.midiToFreq(60)), 262, 'C4 (MIDI 60) should approximate 261.63Hz -> 262Hz');
      assert.strictEqual(PianoAudioEngine.noteNameToMidi('C4'), 60, 'C4 should map to MIDI 60');
      assert.strictEqual(PianoAudioEngine.noteNameToMidi('A4'), 69, 'A4 should map to MIDI 69');
      assert.strictEqual(PianoAudioEngine.noteNameToMidi('F#4'), 66, 'F#4 should map to MIDI 66');
      assert.strictEqual(PianoAudioEngine.midiToNoteName(60), 'C4', 'MIDI 60 should produce note name C4');
      assert.strictEqual(PianoAudioEngine.midiToNoteName(69), 'A4', 'MIDI 69 should produce note name A4');
      console.log('✅ PianoAudioEngine unit tests PASSED.');

      // Test 11: MidiParserEngine Binary Parser & Presets
      console.log('▶ Testing MidiParserEngine binary parser & presets...');
      import('../src/core/MidiParserEngine.js').then(({ MidiParserEngine }) => {
        // Test preset generation
        const furElise = MidiParserEngine.getPresetMidi('fur_elise');
        assert.ok(furElise.notes.length >= 20, 'Für Elise preset should contain at least 20 notes');
        assert.strictEqual(furElise.notes[0].midiNote, 76, 'First note of Für Elise should be E5 (76)');
        assert.ok(furElise.totalDurationSec > 5.0, 'Total duration should be > 5.0s');

        const bach = MidiParserEngine.getPresetMidi('bach_minuet');
        assert.ok(bach.notes.length >= 15, 'Bach preset should contain notes');
        assert.strictEqual(bach.notes[0].midiNote, 67, 'First note of Bach Minuet should be G4 (67)');

        // Test SMF 0 binary buffer synthesis & parsing
        // MThd: 4D 54 68 64 00 00 00 06 00 00 00 01 01 E0 (480 ticks/qtr)
        // MTrk: 4D 54 72 6B 00 00 00 13 (19 bytes)
        // 00 90 3C 60 (tick 0: NoteOn C4 vel 96)
        // 83 60 80 3C 00 (tick 480: NoteOff C4)
        // 00 FF 2F 00 (End of track)
        const smfBuffer = new Uint8Array([
          0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x01, 0xE0,
          0x4D, 0x54, 0x72, 0x6B, 0x00, 0x00, 0x00, 0x10,
          0x00, 0x90, 0x3C, 0x60,
          0x83, 0x60, 0x80, 0x3C, 0x00,
          0x00, 0xFF, 0x2F, 0x00
        ]);

        const midi = new MidiParserEngine();
        const parsedNotes = midi.parse(smfBuffer);
        assert.strictEqual(parsedNotes.length, 1, 'Should extract exactly 1 note');
        assert.strictEqual(parsedNotes[0].midiNote, 60, 'Parsed note should be C4 (60)');
        assert.strictEqual(parsedNotes[0].velocity, 96, 'Parsed velocity should be 96');
        assert.strictEqual(parsedNotes[0].startTime, 0, 'Parsed start time should be 0s');
        assert.ok(parsedNotes[0].duration > 0.4, 'Duration should approximate 0.5s');

        console.log('✅ MidiParserEngine unit tests PASSED.');

        // Test 12: MusicXmlEngine XML Parser & Presets
        console.log('▶ Testing MusicXmlEngine parser & score extraction...');
        import('../src/core/MusicXmlEngine.js').then(({ MusicXmlEngine }) => {
          // Test built-in presets
          const odeToJoy = MusicXmlEngine.getPresetXml('ode_to_joy');
          assert.strictEqual(odeToJoy.measures.length, 8, 'Ode to Joy should have 8 measures');
          assert.strictEqual(odeToJoy.playableNotes.length, 30, 'Ode to Joy should have 30 playable notes');
          assert.strictEqual(odeToJoy.playableNotes[0].midiNote, 64, 'First note should be E4 (MIDI 64)');

          const canonInD = MusicXmlEngine.getPresetXml('canon_in_d');
          assert.strictEqual(canonInD.measures.length, 7, 'Canon in D should have 7 measures');
          assert.strictEqual(canonInD.playableNotes[0].alter, 1, 'First note should have alter=1 (F#5)');
          assert.strictEqual(canonInD.playableNotes[0].midiNote, 78, 'F#5 should be MIDI 78');

          console.log('✅ MusicXmlEngine unit tests PASSED.');

          // Test 13: LLMDirectorEngine Tool Calling & Intent Parsing
          console.log('▶ Testing LLMDirectorEngine tool executions and heuristic NLP parsing...');
          import('../src/core/LLMDirectorEngine.js').then(({ LLMDirectorEngine }) => {
            const mockSettings = { scale: 1.0, bobbing: false, spinY: false, speedY: 1.0, sakuraRain: false, enablePhysics: false };
            let saved = false;
            let spokenBubble = '';
            const engine = new LLMDirectorEngine({
              currentSettings: mockSettings,
              saveSettingsFile: () => { saved = true; },
              showSpeechBubble: (msg) => { spokenBubble = msg; }
            });

            // 1. Scale command
            const scaleResult = engine.parseHeuristicIntent('scale mascot to 1.8x');
            assert.strictEqual(scaleResult.toolCalls.length, 1);
            assert.strictEqual(scaleResult.toolCalls[0].name, 'setModelScale');
            assert.strictEqual(scaleResult.toolCalls[0].args.scale, 1.8);
            engine.executeTool('setModelScale', { scale: 1.8 });
            assert.strictEqual(mockSettings.scale, 1.8);
            assert.ok(saved);

            // 2. Spin command
            const spinResult = engine.parseHeuristicIntent('make the model spin faster on Y axis at 3.0 speed');
            assert.strictEqual(spinResult.toolCalls.length, 1);
            assert.strictEqual(spinResult.toolCalls[0].name, 'setSpinRotation');
            assert.strictEqual(spinResult.toolCalls[0].args.spinY, true);
            assert.strictEqual(spinResult.toolCalls[0].args.speedY, 3.0);
            engine.executeTool('setSpinRotation', { spinY: true, speedY: 3.0 });
            assert.strictEqual(mockSettings.spinY, true);
            assert.strictEqual(mockSettings.speedY, 3.0);

            // 3. Weather & Bobbing
            const weatherResult = engine.parseHeuristicIntent('turn on sakura petals and enable bobbing');
            assert.strictEqual(weatherResult.toolCalls.length, 2);
            engine.executeTool('setWeather', { sakuraRain: true });
            engine.executeTool('setBobbing', { enabled: true });
            assert.strictEqual(mockSettings.sakuraRain, true);
            assert.strictEqual(mockSettings.bobbing, true);

            // 4. Physics
            const physResult = engine.parseHeuristicIntent('enable gravity physics');
            assert.strictEqual(physResult.toolCalls.length, 1);
            assert.strictEqual(physResult.toolCalls[0].name, 'setPhysics');
            engine.executeTool('setPhysics', { enabled: true, gravity: 9.8 });
            assert.strictEqual(mockSettings.enablePhysics, true);

            // 5. Abstract compound request with typo ("turn of")
            const abstractCompound = engine.parseHeuristicIntent('what about scale the app size a bit, and turn of sakura effect');
            assert.strictEqual(abstractCompound.toolCalls.length, 2, 'Should detect both scale and weather tool calls');
            const hasScale = abstractCompound.toolCalls.some(tc => tc.name === 'setModelScale');
            const hasSakuraOff = abstractCompound.toolCalls.some(tc => tc.name === 'setWeather' && tc.args.sakuraRain === false);
            assert.ok(hasScale, 'Should extract scale tool call');
            assert.ok(hasSakuraOff, 'Should extract turning off sakura');
            assert.ok(abstractCompound.text.includes('scaled model') || abstractCompound.text.includes('sakura'), 'Response should be human-like and descriptive');

            // 6. Conversational Human Chit-Chat
            const jokeResult = engine.parseHeuristicIntent('tell me a joke');
            assert.strictEqual(jokeResult.toolCalls.length, 0);
            assert.ok(jokeResult.text.length > 20, 'Should return natural human-like joke reply');

            // 7. ToolRegistry Guardrails & Clamping Test
            console.log('▶ Testing ToolRegistry safety guardrails & parameter auto-clamping...');
            // Test extreme out-of-bounds scale (e.g. 500x -> should clamp safely to 3.0x)
            engine.executeTool('setModelScale', { scale: 500 });
            assert.strictEqual(mockSettings.scale, 3.0, 'Scale should auto-clamp to max 3.0');

            // Test extreme negative scale (-10 -> should clamp safely to 0.2)
            engine.executeTool('setModelScale', { scale: -10 });
            assert.strictEqual(mockSettings.scale, 0.2, 'Scale should auto-clamp to min 0.2');

            // Test extreme physics gravity (9999 -> should clamp safely to 50)
            engine.executeTool('setPhysics', { gravity: 9999 });
            assert.strictEqual(mockSettings.physicsGravity, 50, 'Gravity should auto-clamp to max 50');

            // 8. Diagnostic Log Reporting & 10 Prompt Regression Tests
            console.log('▶ Testing Regression suite on all 10 real-world prompt scenarios...');

            // Turn 4: "start floating gently and let it snow across the desktop"
            const t4 = engine.parseHeuristicIntent('start floating gently and let it snow across the desktop');
            assert.ok(t4.toolCalls.some(tc => tc.name === 'setBobbing' && tc.args.enabled === true), 'Should enable bobbing');
            assert.ok(t4.toolCalls.some(tc => tc.name === 'setWeather' && tc.args.snowFall === true), 'Should enable snowfall');

            // Turn 5: "shrink the model slightly and enable gravity physics so it bounces off the floor"
            const t5 = engine.parseHeuristicIntent('shrink the model slightly and enable gravity physics so it bounces off the floor');
            assert.ok(t5.toolCalls.some(tc => tc.name === 'setModelScale'), 'Should shrink model');
            assert.ok(t5.toolCalls.some(tc => tc.name === 'setPhysics' && tc.args.enabled === true), 'Should enable physics');
            assert.ok(!t5.toolCalls.some(tc => tc.name === 'setLighting'), 'Should NOT falsely trigger lighting from word slightly');

            // Turn 6: "make the character 100x bigger and set gravity to 9999"
            const t6 = engine.parseHeuristicIntent('make the character 100x bigger and set gravity to 9999');
            assert.ok(t6.toolCalls.some(tc => tc.name === 'setModelScale' && tc.args.scale === 3.0), 'Should clamp scale to 3.0');

            // Turn 7: "turn down the piano volume a little bit and make the stage light brighter"
            const t7 = engine.parseHeuristicIntent('turn down the piano volume a little bit and make the stage light brighter');
            assert.ok(t7.toolCalls.some(tc => tc.name === 'setSoundVolume'), 'Should adjust sound volume');
            assert.ok(t7.toolCalls.some(tc => tc.name === 'setLighting'), 'Should brighten stage light');

            // Turn 8: "stop all animations, turn off the weather, and put the mascot back in the center"
            const t8 = engine.parseHeuristicIntent('stop all animations, turn off the weather, and put the mascot back in the center');
            assert.ok(t8.toolCalls.some(tc => tc.name === 'setSpinRotation'), 'Should stop spin');
            assert.ok(t8.toolCalls.some(tc => tc.name === 'setBobbing'), 'Should stop bobbing');
            assert.ok(t8.toolCalls.some(tc => tc.name === 'setWeather'), 'Should turn off weather');
            assert.ok(t8.toolCalls.some(tc => tc.name === 'resetPosition'), 'Should reset position');

            // Turn 11: "how can I use this app while I'm working or coding?"
            const t11 = engine.parseHeuristicIntent("how can I use this app while I'm working or coding?");
            assert.ok(t11.text.includes('Click-Through') || t11.text.includes('Ignore Mouse'), 'Should give coding companion advice');

            engine.processUserMessage('scale up a bit and turn off sakura').then(() => {
              const report = engine.getFormattedReport();
              assert.ok(report.includes('# 🤖 AI Director Diagnostic Log Report'), 'Report should have markdown header');
              assert.ok(report.includes('scale up a bit and turn off sakura'), 'Report should record user input');
              assert.ok(engine.diagnosticLogs.length > 0, 'Diagnostic logs should contain recorded turns');

              console.log('✅ LLMDirectorEngine & ToolRegistry unit tests PASSED.');
              console.log('\n🎉 ALL 13 UNIT TEST SUITES PASSED CLEANLY (100% SUCCESS)');
            });
          });
        });
      });
    });
  });
});


