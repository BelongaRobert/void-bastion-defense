// Void Bastion Defense — Cloud Save & Auth System (Supabase)
// Requires SUPABASE_URL and SUPABASE_ANON_KEY from environment or config

console.log('AUTH.JS LOADING...');

// ── Configuration ──────────────────────────────────────────
const SUPABASE_URL = window.SUPABASE_URL || null;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || null;

let sbClient = null;
let currentUser = null;
let cloudSaveEnabled = false;

// ── Initialization ────────────────────────────────────────
function initAuth() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.log('[Auth] Supabase not configured — using localStorage only');
        updateAuthUI(); // Still wire up UI so user can see the auth screen
        return;
    }

    try {
        sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        });

        // Check existing session
        sbClient.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                currentUser = session.user;
                cloudSaveEnabled = true;
                console.log('[Auth] Restored session for', currentUser.email);
                updateAuthUI();
                // Load cloud save on login
                loadCloudSave().then(cloudData => {
                    if (cloudData) {
                        mergeCloudSave(cloudData);
                    }
                });
            }
        });

        // Listen for auth changes
        sbClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                currentUser = session.user;
                cloudSaveEnabled = true;
                console.log('[Auth] Signed in as', currentUser.email);
                updateAuthUI();
                loadCloudSave().then(cloudData => {
                    if (cloudData) mergeCloudSave(cloudData);
                });
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                cloudSaveEnabled = false;
                console.log('[Auth] Signed out');
                updateAuthUI();
            }
        });

        console.log('[Auth] Supabase initialized');
    } catch (e) {
        console.error('[Auth] Failed to initialize Supabase:', e.message);
    }
}

// ── UI Helpers ────────────────────────────────────────────
function updateAuthUI() {
    const authStatus = document.getElementById('authStatus');
    const authBtn = document.getElementById('authBtn');
    const cloudIndicator = document.getElementById('cloudIndicator');

    if (!authStatus || !authBtn) return;

    if (currentUser) {
        const email = currentUser.email || 'Player';
        authStatus.textContent = `Logged in as ${email}`;
        authBtn.textContent = '🚪 LOGOUT';
        authBtn.onclick = signOut;
        if (cloudIndicator) cloudIndicator.style.display = 'inline';
    } else {
        authStatus.textContent = 'Play offline or log in to sync';
        authBtn.textContent = '🔑 LOGIN / SIGN UP';
        authBtn.onclick = showAuthScreen;
        if (cloudIndicator) cloudIndicator.style.display = 'none';
    }
}

function showAuthScreen() {
    // Hide all menu screens
    const menus = ['mainMenu', 'pauseMenu', 'settingsMenu', 'helpMenu',
                   'leaderboardScreen', 'arsenalScreen', 'bastionScreen',
                   'endlessScreen', 'gameOverScreen'];
    menus.forEach(id => document.getElementById(id)?.classList.add('hidden'));
    document.getElementById('gameUI')?.classList.remove('active');

    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('authEmail').focus();
}

function hideAuthScreen() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
}

function showAuthMessage(msg, isError = false) {
    const el = document.getElementById('authMessage');
    if (!el) return;
    el.textContent = msg;
    el.className = 'auth-message ' + (isError ? 'error' : 'success');
}

// ── Auth Actions ──────────────────────────────────────────
async function signUp() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    if (!email || !password) {
        showAuthMessage('Enter email and password.', true);
        return;
    }
    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters.', true);
        return;
    }

    showAuthMessage('Creating account...');
    const { data, error } = await sbClient.auth.signUp({ email, password });

    if (error) {
        showAuthMessage(error.message, true);
        return;
    }

    showAuthMessage('Account created! Check your email to confirm, or play now.');
    currentUser = data.user;
    cloudSaveEnabled = true;

    // Immediately save current local progress to cloud
    await saveCloudSave();
    setTimeout(() => {
        hideAuthScreen();
        updateAuthUI();
    }, 1500);
}

async function signIn() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    if (!email || !password) {
        showAuthMessage('Enter email and password.', true);
        return;
    }

    showAuthMessage('Signing in...');
    const { data, error } = await sbClient.auth.signInWithPassword({ email, password });

    if (error) {
        showAuthMessage(error.message, true);
        return;
    }

    showAuthMessage('Signed in successfully!');
    currentUser = data.user;
    cloudSaveEnabled = true;

    // Load cloud save, merge with local
    const cloudData = await loadCloudSave();
    if (cloudData) {
        mergeCloudSave(cloudData);
    } else {
        // No cloud save yet — push local to cloud
        await saveCloudSave();
    }

    setTimeout(() => {
        hideAuthScreen();
        updateAuthUI();
    }, 1000);
}

async function signOut() {
    if (!sbClient) return;
    await sbClient.auth.signOut();
    currentUser = null;
    cloudSaveEnabled = false;
    updateAuthUI();
}

// ── Save / Load ───────────────────────────────────────────
function getSavePayload() {
    return {
        weaponOwnership,
        weaponUpgrades,
        credits,
        highScore,
        gameSettings,
        fortressUpgrades,
        savedAt: Date.now()
    };
}

async function saveCloudSave() {
    if (!cloudSaveEnabled || !currentUser || !sbClient) return false;

    const payload = getSavePayload();
    try {
        const { error } = await sbClient
            .from('saves')
            .upsert({
                user_id: currentUser.id,
                save_data: payload,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) {
            console.warn('[Auth] Cloud save failed:', error.message);
            return false;
        }
        console.log('[Auth] Cloud save successful');
        return true;
    } catch (e) {
        console.warn('[Auth] Cloud save exception:', e.message);
        return false;
    }
}

async function loadCloudSave() {
    if (!currentUser || !sbClient) return null;

    try {
        const { data, error } = await sbClient
            .from('saves')
            .select('save_data')
            .eq('user_id', currentUser.id)
            .single();

        if (error) {
            if (error.code !== 'PGRST116') { // not "no rows" error
                console.warn('[Auth] Cloud load failed:', error.message);
            }
            return null;
        }
        console.log('[Auth] Cloud save loaded');
        return data?.save_data || null;
    } catch (e) {
        console.warn('[Auth] Cloud load exception:', e.message);
        return null;
    }
}

function mergeCloudSave(cloudData) {
    // Merge strategy: keep higher credits, higher highScore, newer timestamp wins for most fields
    const localData = getSavePayload();

    if (cloudData.credits > credits) credits = cloudData.credits;
    if (cloudData.highScore > highScore) highScore = cloudData.highScore;

    if (cloudData.weaponOwnership) {
        for (let i = 0; i < weaponOwnership.length; i++) {
            if (cloudData.weaponOwnership[i]) weaponOwnership[i] = true;
        }
    }
    if (cloudData.fortressUpgrades) {
        for (const key of Object.keys(fortressUpgrades)) {
            if (cloudData.fortressUpgrades[key]?.level > fortressUpgrades[key].level) {
                fortressUpgrades[key].level = cloudData.fortressUpgrades[key].level;
            }
        }
    }
    if (cloudData.weaponUpgrades) {
        weaponUpgrades = cloudData.weaponUpgrades;
    }
    if (cloudData.gameSettings) {
        Object.assign(gameSettings, cloudData.gameSettings);
    }

    // Persist merged result locally
    saveGame();
    console.log('[Auth] Merged cloud save with local progress');
}

// ── Patched save/load wrappers ────────────────────────────
// These override the localStorage-only versions in game.js
function cloudAwareSaveGame() {
    // Always save locally
    const data = {
        weaponOwnership,
        weaponUpgrades,
        credits,
        highScore,
        gameSettings,
        fortressUpgrades,
        savedAt: Date.now()
    };
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save locally:', e.message);
    }

    // Fire-and-forget cloud save (don't block UI)
    if (cloudSaveEnabled) {
        saveCloudSave().catch(() => {});
    }
}

// Override the original saveGame after DOM ready
function patchSaveGame() {
    if (typeof saveGame === 'function') {
        const _originalSave = saveGame;
        saveGame = function() {
            cloudAwareSaveGame();
        };
        console.log('[Auth] Patched saveGame to support cloud saves');
    }
}

// ── Setup ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    patchSaveGame();
});

console.log('AUTH.JS LOADED');
