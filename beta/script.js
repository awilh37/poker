// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    updateProfile,
    signInAnonymously,
    signInWithCustomToken
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    collection,
    query,
    where,
    addDoc,
    getDocs,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    writeBatch,
    runTransaction,
    Timestamp,
    increment
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


// --- App Config ---

// --- THIS IS THE FIX ---
// The app was looking for 'default-app-id' instead of 'wps-3'
const appId = 'wps-3'; // Hard-coded for GitHub Pages, matches v3.1

// --- Hard-coded config provided by user ---
const firebaseConfig = {
    apiKey: "AIzaSyBefsHEBuiRyJ31NzF885ac3ugCefzngTU",
    authDomain: "wps-3-be723.firebaseapp.com",
    projectId: "wps-3-be723",
    storageBucket: "wps-3-be723.firebasestorage.app",
    messagingSenderId: "420146617877",
    appId: "1:420146617877:web:ea2e06a690732da76fb81c",
    measurementId: "G-H0Z4C2185Y"
};

// --- Super Admin UID (from v3.1) ---
// --- UPDATED to be a list ---
const SUPER_ADMIN_UIDS = [
    "Qr3XI0uNYrZ3AECim6XtRvp12MJ2",
    "M2Q55lfqYNawAKYinXsTbrXDuMw1"
];

// --- Global Variables ---
let db, auth;
let currentUserId = null;
let currentUserData = null;
let firebaseAuthReady = false;
let dataLoadedAndListenersSetup = false;
let isLoggingOut = false;
let isNewLogin = false; // <-- FIX FOR LOGOUT LOOP

let allFirebaseUsersData = []; // Stores all user profile docs
let allFirebaseRolesData = []; // Stores all user role docs
let firestoreActiveSessions = []; // This will be populated by FIRESTORE
let firestoreGameRooms = []; // Stores game room docs
let firestoreMessages = []; // Stores messages
let currentJoinedRoomId = null; // Stores the ID of the room the player is in

// Defined roles for the system
const ROLES = {
    PLAYER: 'player',
    ADMIN: 'admin',
    OWNER: 'owner'
};

// --- DOM Element Refs ---

// Panels
const mainContainer = document.getElementById('mainContainer');
const loginButtonsContainer = document.getElementById('loginButtonsContainer');
const mainActionButtons = document.getElementById('mainActionButtons');
const accountManagementPanel = document.getElementById('accountManagementPanel');
const adminPanel = document.getElementById('adminPanel');
const userManagementPanel = document.getElementById('userManagementPanel');
const gameRoomManagementPanel = document.getElementById('gameRoomManagementPanel');
const gameRoomViewPanel = document.getElementById('gameRoomViewPanel');
const userDirectoryPanel = document.getElementById('userDirectoryPanel');
const createGroupPanel = document.getElementById('createGroupPanel');
// NEW: Lobby Panel
const playerJoinRoomPanel = document.getElementById('playerJoinRoomPanel');

// Buttons
const googleLoginButton = document.getElementById('googleLoginButton');
const messageBox = document.getElementById('messageBox');
const loadingIndicator = document.getElementById('loadingIndicator');

// Main action buttons
const openAccountManagementButton = document.getElementById('openAccountManagementButton');
const viewUserDirectoryButton = document.getElementById('viewUserDirectoryButton');
const openAdminPanelButton = document.getElementById('openAdminPanelButton');
const joinGameButton = document.getElementById('joinGameButton');

// --- NEW Header & Sidebar Elements ---
const hamburgerButton = document.getElementById('hamburgerButton');
const accountButton = document.getElementById('accountButton');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const accountDropdown = document.getElementById('accountDropdown');

// Sidebar links
const sidebarJoinGame = document.getElementById('sidebarJoinGame');
const sidebarUserDirectory = document.getElementById('sidebarUserDirectory');

// Dropdown links
const dropdownAccountLink = document.getElementById('dropdownAccountLink');
const dropdownAdminLink = document.getElementById('dropdownAdminLink');
const dropdownLogoutLink = document.getElementById('dropdownLogoutLink');
// --- END NEW Header & Sidebar Elements ---

// --- NEW Standings Sidebar & Modal Elements ---
const standingsList = document.getElementById('standingsList');
const userInfoModal = document.getElementById('userInfoModal');
const userInfoModalContent = document.getElementById('userInfoModalContent');
// --- END NEW Standings Sidebar & Modal Elements ---

// Admin Panel
const backToMenuFromAdmin = document.getElementById('backToMenuFromAdmin');
const openUserManagement = document.getElementById('openUserManagement');
const openGameRoomManagement = document.getElementById('openGameRoomManagement');
const openCreateGroup = document.getElementById('openCreateGroup');
const openInvestments = document.getElementById('openInvestments');

// Account Management
const backToMenuFromAccount = document.getElementById('backToMenuFromAccount');
const displayNameInput = document.getElementById('displayNameInput');
const updateDisplayNameButton = document.getElementById('updateDisplayNameButton');

// User Management
const userRolesTable = document.getElementById('userRolesTable');
const backToAdminFromUser = document.getElementById('backToAdminFromUser');

// Game Room Management
const backToAdminFromGame = document.getElementById('backToAdminFromGame');
const newRoomName = document.getElementById('newRoomName');
const createGameRoomButton = document.getElementById('createGameRoomButton');
const gameRoomList = document.getElementById('gameRoomList');

// NEW: Lobby Panel
const backToMenuFromLobby = document.getElementById('backToMenuFromLobby');
const availableRoomsListContainer = document.getElementById('availableRoomsListContainer');

// Game Room View
const leaveGameRoomButton = document.getElementById('leaveGameRoomButton');
const gameRoomName = document.getElementById('gameRoomName');
const gameRoomContent = document.getElementById('gameRoomContent');

// User Directory
const backToMenuFromDirectory = document.getElementById('backToMenuFromDirectory');
const userDirectoryTable = document.getElementById('userDirectoryTable');

// Create Group
const backToAdminFromGroup = document.getElementById('backToAdminFromGroup');
const groupNameInput = document.getElementById('groupNameInput');
const groupUserChecklist = document.getElementById('groupUserChecklist');
const finalizeGroupButton = document.getElementById('finalizeGroupButton');

// Group Chat Modal
const groupChatModal = document.getElementById('groupChatModal');
const groupChatTitle = document.getElementById('groupChatTitle');
const groupChatMessages = document.getElementById('groupChatMessages');
const groupPlayerList = document.getElementById('groupPlayerList');
const groupMessageInput = document.getElementById('groupMessageInput');
const sendGroupMessageButton = document.getElementById('sendGroupMessageButton');
const closeGroupChatButton = document.getElementById('closeGroupChatButton');


// --- Firebase Init ---
try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully (Firestore-only).");
} catch (e) {
    console.error("Firebase initialization failed:", e);
    showMessage("Error: Could not connect to the application services. Please refresh.", "error");
}


// --- Auth State Change Listener ---

/**
 * Main listener for authentication changes.
 * Triggers when user logs in, logs out, or page loads.
 */
if (auth) {
    onAuthStateChanged(auth, async (user) => {
        console.log("onAuthStateChanged: Auth state changed. User:", user ? user.uid : "null");

        // --- NEW: Stale Session Logout ---
        // Check if this is a "remembered" session in a new tab
        const isLoggedInThisTab = sessionStorage.getItem('isLoggedInThisTab');

        // --- LOGOUT LOOP FIX ---
        // Added check for `!isNewLogin`
        if (user && !isLoggedInThisTab && !isLoggingOut && !isNewLogin) {
            console.warn("onAuthStateChanged: Stale session detected (user exists but tab flag is not set). Forcing logout to clean up.");
            await handleLogout(); // This will clear the user and show login
            showMessage("Your previous session was cleared. Please log in again.", "info");
            return; // Stop further processing
        }
        // --- END NEW ---

        if (user) {
            currentUserId = user.uid;
            firebaseAuthReady = true;

            if (!isLoggingOut && !dataLoadedAndListenersSetup) {
                console.log("onAuthStateChanged: User present, triggering handleLoginSuccess.");
                await handleLoginSuccess(user);
                // NEW: Show/hide admin link in dropdown based on role
                if (hasAdminAccess(user.uid)) {
                    dropdownAdminLink.classList.remove('hidden');
                } else {
                    dropdownAdminLink.classList.add('hidden');
                }
            } else if (isLoggingOut) {
                console.log("onAuthStateChanged: isLoggingOut is true, skipping login success logic.");
            } else if (dataLoadedAndListenersSetup) {
                console.log("onAuthStateChanged: Data listeners already setup, skipping login success logic.");
            }
        } else {
            // User is signed out or not yet signed in
            currentUserId = null;
            currentUserData = null;
            firebaseAuthReady = true;
            dataLoadedAndListenersSetup = false; // Reset listener flag

            // --- NEW: Clear session storage flag on logout ---
            sessionStorage.removeItem('isLoggedInThisTab');

            if (isLoggingOut) {
                // User just logged out, show message and login options
                console.log("Firebase: User logged out.");
                isLoggingOut = false; // Reset flag
                showPanel(loginButtonsContainer);
                showMessage("You have been successfully logged out.", "success");
                // NEW: Hide admin link on logout
                dropdownAdminLink.classList.add('hidden');
            } else if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                // We have a custom token, let's try to sign in
                console.log("Firebase: No user, trying custom token auth.");
                try {
                    await signInWithCustomToken(auth, __initial_auth_token);
                    console.log("Firebase: Custom token sign-in successful.");
                } catch (error) {
                    console.error("Firebase: Custom token sign-in failed:", error);
                    // Fallback to anonymous
                    await signInAnonymously(auth);
                }
            } else if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
                // This is our case: hard-coded config, no user. Show login.
                console.log("Firebase: No user, config present. Showing login options.");
                showPanel(loginButtonsContainer);
                loadingIndicator.classList.add('hidden');
            } else {
                // Regular web or after logout
                console.log("Firebase: Displaying login options.");
                // NEW: Hide admin link on logout
                dropdownAdminLink.classList.add('hidden');
                showPanel(loginButtonsContainer);
                loadingIndicator.classList.add('hidden');
            }
        }
    });

    // --- NEW Header/Sidebar UI Event Listeners ---

    // Function to toggle the sidebar
    function toggleSidebar(show) {
        if (show) {
            sidebar.classList.add('show');
            sidebarOverlay.classList.add('show');
        } else {
            sidebar.classList.remove('show');
            sidebarOverlay.classList.remove('show');
        }
    }

    // Function to toggle the account dropdown
    function toggleAccountDropdown(show) {
        if (show) {
            accountDropdown.classList.remove('hidden');
        } else {
            accountDropdown.classList.add('hidden');
        }
    }

    // Hamburger button click
    hamburgerButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent body click from closing it immediately
        const isVisible = sidebar.classList.contains('show');
        toggleSidebar(!isVisible);
        if (!isVisible) {
            toggleAccountDropdown(false); // Close dropdown if opening sidebar
        }
    });

    // Account button click
    accountButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent body click from closing it immediately
        const isVisible = !accountDropdown.classList.contains('hidden');
        toggleAccountDropdown(!isVisible);
        if (!isVisible) {
            toggleSidebar(false); // Close sidebar if opening dropdown
        }
    });

    // Click-away listener (to close menus)
    document.body.addEventListener('click', () => {
        toggleSidebar(false);
        toggleAccountDropdown(false);
    });

    // Stop propagation on menus themselves to prevent body click from closing them
    sidebar.addEventListener('click', (e) => e.stopPropagation());
    accountDropdown.addEventListener('click', (e) => e.stopPropagation());
    // Overlay click closes sidebar
    sidebarOverlay.addEventListener('click', () => toggleSidebar(false));


    // --- Wire up menu links ---

    // Sidebar links
    sidebarJoinGame.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSidebar(false);
        joinGameButton.click(); // Trigger existing logic
    });

    sidebarUserDirectory.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSidebar(false);
        viewUserDirectoryButton.click(); // Trigger existing logic
    });

    // Dropdown links
    dropdownAccountLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAccountDropdown(false);
        openAccountManagementButton.click(); // Trigger existing logic
    });

    dropdownAdminLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAccountDropdown(false);
        openAdminPanelButton.click(); // Trigger existing logic
    });

    dropdownLogoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAccountDropdown(false);
        handleLogout(); // Call existing logout function
    });

    // --- END NEW Header/Sidebar UI Event Listeners ---


    // --- NEW Standings Modal Event Listeners ---

    function hideUserInfoModal() {
        userInfoModal.classList.add('hidden');
    }

    // Close modal if overlay is clicked
    userInfoModal.addEventListener('click', (e) => {
        if (e.target === userInfoModal) {
            hideUserInfoModal();
        }
    });

    // Close modal button (event delegation, since button is dynamic)
    userInfoModal.addEventListener('click', (e) => {
        if (e.target.id === 'closeUserInfoModalButton') {
            hideUserInfoModal();
        }
    });

    // --- END NEW Standings Modal Event Listeners ---

    // --- NEW: Smart Status Listeners ---

    // 1. Listen for tab visibility changes (Idle status)
    document.addEventListener('visibilitychange', () => {
        if (!currentUserId || !db) return; // Not logged in or db not ready

        // --- PATHS FIXED to v3.1 ---
        const activeSessionRef = doc(db, "artifacts", appId, "public/data/active_sessions", currentUserId);

        if (document.hidden) {
            // User switched tabs, mark as idle
            updateDoc(activeSessionRef, { status: 'idle' }).catch(console.warn);
        } else {
            // User came back, mark as online
            updateDoc(activeSessionRef, { status: 'online' }).catch(console.warn);
        }
    });

    // 2. Listen for tab/browser close (Logout)
    // --- UPDATED: Use 'pagehide' for better reliability ---
    window.addEventListener('pagehide', () => {
        // Only run if user is logged in and NOT in the process of logging out
        if (!currentUserId || !db || isLoggingOut) return;

        // This is a "fire-and-forget" delete. We can't wait for it to finish.
        // This instantly removes the user from "active_sessions"
        // --- PATHS FIXED to v3.1 ---
        const activeSessionRef = doc(db, "artifacts", appId, "public/data/active_sessions", currentUserId);
        deleteDoc(activeSessionRef).catch(console.warn);
    });
    // --- END NEW Smart Status Listeners ---

}

// --- Main Event Listeners ---

/** Runs when the page content is loaded */
document.addEventListener('DOMContentLoaded', () => {
    // This check ensures Firebase is initialized before adding listeners
    if (!auth) {
        console.error("DOM Loaded, but Firebase auth is not available.");
        return;
    }

    // --- Auth Buttons ---
    googleLoginButton.addEventListener('click', async () => {
        isNewLogin = true; // <-- FIX FOR LOGOUT LOOP
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // onAuthStateChanged will handle the rest
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            showMessage(`Google Sign-In Error: ${error.message}`, "error");
            isNewLogin = false; // <-- Reset on error
        }
    });

    // --- Main Menu Navigation ---
    openAccountManagementButton.addEventListener('click', () => {
        displayNameInput.value = auth.currentUser.displayName || '';
        showPanel(accountManagementPanel);
    });

    viewUserDirectoryButton.addEventListener('click', () => {
        renderUserDirectoryTable();
        showPanel(userDirectoryPanel);
    });

    openAdminPanelButton.addEventListener('click', () => showPanel(adminPanel));

    joinGameButton.addEventListener('click', () => {
        // --- UPDATED: Show Lobby Panel ---
        renderAvailableRoomsList(); // New function
        showPanel(playerJoinRoomPanel); // Show the new lobby panel
    });

    // --- Panel Navigation (Back Buttons) ---
    backToMenuFromAccount.addEventListener('click', () => showPanel(mainActionButtons));
    backToMenuFromAdmin.addEventListener('click', () => showPanel(mainActionButtons));
    backToMenuFromDirectory.addEventListener('click', () => showPanel(mainActionButtons));
    backToAdminFromUser.addEventListener('click', () => showPanel(adminPanel));
    backToAdminFromGame.addEventListener('click', () => showPanel(adminPanel));
    backToAdminFromGroup.addEventListener('click', () => showPanel(adminPanel));
    leaveGameRoomButton.addEventListener('click', leaveGameRoom);
    // NEW: Lobby back button
    backToMenuFromLobby.addEventListener('click', () => showPanel(mainActionButtons));


    // --- Account Management ---
    updateDisplayNameButton.addEventListener('click', async () => {
        const newName = displayNameInput.value.trim();
        if (newName.length < 3) {
            showMessage("Display name must be at least 3 characters.", "error");
            return;
        }
        try {
            // Update Firebase Auth profile
            await updateProfile(auth.currentUser, { displayName: newName });

            // --- PATHS FIXED to v3.1 ---
            const userProfileRef = doc(db, "artifacts", appId, "public/data/user_profiles", currentUserId);
            await updateDoc(userProfileRef, { display_name: newName });

            showMessage("Display name updated successfully!", "success");
            showPanel(mainActionButtons);
        } catch (error) {
            console.error("Error updating display name:", error);
            showMessage(`Error: ${error.message}`, "error");
        }
    });

    // --- Admin Panel ---
    openUserManagement.addEventListener('click', () => {
        renderUserRolesTable();
        showPanel(userManagementPanel);
    });

    openGameRoomManagement.addEventListener('click', () => {
        renderGameRoomList();
        showPanel(gameRoomManagementPanel);
    });

    openCreateGroup.addEventListener('click', () => {
        populateUserChecklist();
        showPanel(createGroupPanel);
    });

    // Game Room Management
    createGameRoomButton.addEventListener('click', async () => {
        const name = newRoomName.value.trim();
        if (!name) {
            showMessage("Please enter a room name.", "error");
            return;
        }
        try {
            // --- PATHS FIXED to v3.1 ---
            const roomCollectionRef = collection(db, "artifacts", appId, "public/data/game_rooms");
            await addDoc(roomCollectionRef, {
                name: name,
                createdAt: serverTimestamp(),
                hostId: currentUserId,
                players: [], // Array of UIDs
                dealerPosition: 0, // NEW: Add dealer position
                gameState: {
                    status: 'waiting',
                    bets: {}, // Map of uid -> bet amount
                    status: {} // Map of uid -> 'ready', 'folded', etc.
                }
            });
            showMessage(`Room '${name}' created!`, "success");
            newRoomName.value = '';
            // The onSnapshot listener will auto-update the list
        } catch (error) {
            console.error("Error creating game room:", error);
            showMessage(`Error: ${error.message}`, "error");
        }
    });

    // Create Group
    finalizeGroupButton.addEventListener('click', async () => {
        const groupName = groupNameInput.value.trim();
        if (!groupName) {
            showMessage("Please enter a group name.", "error");
            return;
        }
        const selectedUsers = Array.from(groupUserChecklist.querySelectorAll('input:checked'))
            .map(input => input.value);

        if (selectedUsers.length < 1) { // Need at least one other member
            showMessage("Please select at least one member for the group.", "error");
            return;
        }

        // Add the creator to the group
        if (!selectedUsers.includes(currentUserId)) {
            selectedUsers.push(currentUserId);
        }

        try {
            // --- PATHS FIXED to v3.1 (assuming chat_groups) ---
            const groupCollectionRef = collection(db, "artifacts", appId, "public/data/chat_groups");
            await addDoc(groupCollectionRef, {
                name: groupName,
                members: selectedUsers,
                createdAt: serverTimestamp(),
                createdBy: currentUserId
            });
            showMessage(`Group '${groupName}' created!`, "success");
            groupNameInput.value = '';
            showPanel(adminPanel);
        } catch (error) {
            console.error("Error creating group:", error);
            showMessage(`Error: ${error.message}`, "error");
        }
    });

    // Group Chat
    sendGroupMessageButton.addEventListener('click', sendGroupMessage);
    groupMessageInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') sendGroupMessage();
    });
    closeGroupChatButton.addEventListener('click', () => groupChatModal.classList.add('hidden'));

}); // End DOMContentLoaded

// --- Core Functions ---

/**
 * Runs after a successful login.
 * Creates user profile, sets up presence, and attaches data listeners.
 */
async function handleLoginSuccess(user) {
    console.log("handleLoginSuccess: Setting up for user:", user.uid);
    loadingIndicator.classList.remove('hidden');

    // --- NEW: Set session storage flag ---
    sessionStorage.setItem('isLoggedInThisTab', 'true');
    isNewLogin = false; // <-- FIX FOR LOGOUT LOOP

    try {
        // Setup profile first, as presence might need role data
        await setupUserProfile(user);

        // --- NEW PRESENCE (Firestore) ---
        // Write to Firestore active_sessions collection
        console.log("handleLoginSuccess: Setting up FIRESTORE presence for:", user.uid);
        // --- PATHS FIXED to v3.1 ---
        const activeSessionRef = doc(db, "artifacts", appId, "public/data/active_sessions", user.uid);

        // Get role *after* setupUserProfile has run
        const role = await getCurrentUserRole(user.uid);

        await setDoc(activeSessionRef, {
            email: user.email || 'N/A',
            role: role,
            loginTime: serverTimestamp(),
            status: 'online' // <-- NEW: Set initial status to 'online'
        }, { merge: true });
        console.log("handleLoginSuccess: FIRESTORE presence set.");
        // --- END NEW PRESENCE ---

        // Set up global data listeners
        if (!dataLoadedAndListenersSetup) {
            console.log("handleLoginSuccess: Setting up data listeners.");
            await setupDataListeners();
            dataLoadedAndListenersSetup = true;
            console.log("handleLoginSuccess: Data listeners setup complete.");
        } else {
            console.log("handleLoginSuccess: Data listeners already setup, skipping.");
        }

        // Update UI
        currentUserData = allFirebaseUsersData.find(u => u.uid === user.uid);
        if (hasAdminAccess(user.uid)) {
            openAdminPanelButton.classList.remove('hidden');
        } else {
            openAdminPanelButton.classList.add('hidden');
        }

        showPanel(mainActionButtons);
        showMessage(`Welcome, ${formatDisplayName(currentUserData)}!`, "success");

    } catch (error) {
        console.error("Error during login success handling:", error);
        showMessage(`Error on login: ${error.message}`, "error");
        showPanel(loginButtonsContainer); // Go back to login
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

/**
 * Logs out the current user.
 */
async function handleLogout() {
    console.log("handleLogout: Initiating logout for:", currentUserId);
    isLoggingOut = true;

    // --- NEW: Remove from Firestore active_sessions ---
    if (db && currentUserId) {
        // --- PATHS FIXED to v3.1 ---
        const activeSessionRef = doc(db, "artifacts", appId, "public/data/active_sessions", currentUserId);
        try {
            await deleteDoc(activeSessionRef);
            console.log("handleLogout: Removed Firestore session.");
        } catch (error) {
            console.error("handleLogout: Error removing Firestore session:", error);
        }
    }

    // 2. Sign out from Firebase Auth
    try {
        await signOut(auth);
        console.log("handleLogout: Firebase signOut() complete.");
        // onAuthStateChanged will handle the UI reset
    } catch (error) {
        console.error("handleLogout: Error during signOut:", error);
        isLoggingOut = false; // Reset flag on error
        showMessage(`Logout Error: ${error.message}`, "error");
    }
    // --- NEW: Session flag is cleared in onAuthStateChanged (when user is null) ---
}

/**
 * Checks or creates user profile and role in Firestore.
 */
async function setupUserProfile(user) {
    const { uid, email, displayName } = user;
    console.log("setupUserProfile: Setting up profile for:", uid);

    const batch = writeBatch(db);

    // --- PATHS FIXED to v3.1 ---
    // 1. User Role
    const roleRef = doc(db, "artifacts", appId, "public/data/user_roles", uid);
    const roleDoc = await getDoc(roleRef);

    let userRole = ROLES.PLAYER; // Default
    // --- UPDATED to use list ---
    if (SUPER_ADMIN_UIDS.includes(uid)) {
        userRole = ROLES.OWNER; // Super admin is always owner
    }

    if (!roleDoc.exists()) {
        console.log(`setupUserProfile: No role found, creating '${userRole}' role.`);
        batch.set(roleRef, {
            uid: uid,
            email: email,
            role: userRole,
            createdAt: serverTimestamp()
        });
    } else {
        console.log("setupUserProfile: Role doc already exists.");
        // If user is super admin but doc says otherwise, fix it
        // --- UPDATED to use list ---
        if (SUPER_ADMIN_UIDS.includes(uid) && roleDoc.data().role !== ROLES.OWNER) {
            console.warn("setupUserProfile: Correcting SUPER_ADMIN role in Firestore.");
            batch.update(roleRef, { role: ROLES.OWNER });
        }
    }

    // 2. User Profile
    const profileRef = doc(db, "artifacts", appId, "public/data/user_profiles", uid);
    const profileDoc = await getDoc(profileRef);
    if (!profileDoc.exists()) {
        console.log("setupUserProfile: No profile found, creating profile.");
        batch.set(profileRef, {
            uid: uid,
            email: email,
            // *** NAME FIX: Use "New User" or Auth name, never email ***
            display_name: displayName || "New User",
            photo_url: user.photoURL || null,
            created_at: serverTimestamp(),
            last_login: serverTimestamp(),
            chip_count: 1000, // Starting chips
            current_room: null
        });
    } else {
        console.log("setupUserProfile: Profile doc exists, updating last_login.");
        // *** NAME FIX: Only update display_name if it's new from Google/Auth ***
        const updateData = { last_login: serverTimestamp() };
        if (displayName && profileDoc.data().display_name !== displayName) {
            updateData.display_name = displayName;
        }
        batch.update(profileRef, updateData);
    }

    // Commit the batch
    await batch.commit();
    console.log("setupUserProfile: Profile setup complete.");
}

/**
 * (REMOVED) setupPresence(uid) function
 * Its logic is now in handleLoginSuccess (for writing)
 * and handleLogout (for deleting).
 */

/**
 * Attaches all global Firestore listeners.
 * Returns a promise that resolves when all initial data is loaded.
 */
function setupDataListeners() {
    console.log("setupDataListeners: Attaching listeners...");
    // --- PATHS FIXED to v3.1 ---
    // Base collection paths
    const rolesCollectionRef = collection(db, "artifacts", appId, "public/data/user_roles");
    const profilesCollectionRef = collection(db, "artifacts", appId, "public/data/user_profiles");
    const gameRoomsCollectionRef = collection(db, "artifacts", appId, "public/data/game_rooms");
    const investmentsCollectionRef = collection(db, "artifacts", appId, "public/data/investments"); // Feature hidden
    const chatGroupsCollectionRef = collection(db, "artifacts", appId, "public/data/chat_groups");

    // --- NEW: Firestore active_sessions collection ---
    const activeSessionsCollectionRef = collection(db, "artifacts", appId, "public/data/active_sessions");

    // --- Promise-based listeners for initial load ---

    // Promise for User Roles
    const rolesPromise = new Promise((resolve, reject) => {
        let initialLoad = true;
        onSnapshot(rolesCollectionRef, (snapshot) => {
            allFirebaseRolesData = snapshot.docs.map(doc => doc.data());
            console.log("Firestore: User Roles snapshot. Count:", allFirebaseRolesData.length);
            if (!userManagementPanel.classList.contains('hidden')) renderUserRolesTable();

            if (initialLoad) { initialLoad = false; resolve(); }
        }, (error) => { console.error("Firestore: Error listening to user roles:", error); reject(error); });
    });

    // Promise for User Profiles
    const profilesPromise = new Promise((resolve, reject) => {
        let initialLoad = true;
        onSnapshot(profilesCollectionRef, (snapshot) => {
            allFirebaseUsersData = snapshot.docs.map(doc => doc.data());
            console.log("Firestore: User Profiles snapshot. Count:", allFirebaseUsersData.length);
            if (!userManagementPanel.classList.contains('hidden')) renderUserRolesTable();
            if (!userDirectoryPanel.classList.contains('hidden')) renderUserDirectoryTable();
            if (currentJoinedRoomId && !gameRoomViewPanel.classList.contains('hidden')) renderGameRoomView(currentJoinedRoomId);
            renderStandingsSidebar(); // NEW: Update standings on profile change
            // if (!investmentsPanel.classList.contains('hidden')) populateInvestmentPlayerSelect(); // Feature hidden

            if (initialLoad) { initialLoad = false; resolve(); }
        }, (error) => { console.error("Firestore: Error listening to user profiles:", error); reject(error); });
    });

    // --- REPLACED: Promise for Active Sessions (FIRESTORE) ---
    const activeSessionsPromise = new Promise((resolve, reject) => {
        let initialLoad = true;
        onSnapshot(activeSessionsCollectionRef, (snapshot) => {
            // --- UPDATED: Now stores the full session object ---
            firestoreActiveSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Firestore: Active Sessions snapshot. Count:", firestoreActiveSessions.length);

            if (!userDirectoryPanel.classList.contains('hidden')) renderUserDirectoryTable();
            if (!userManagementPanel.classList.contains('hidden')) renderUserRolesTable();
            renderStandingsSidebar(); // NEW: Update standings on session change

            if (initialLoad) { initialLoad = false; resolve(); }
        }, (error) => { console.error("Firestore: Error listening to active sessions:", error); reject(error); });
    });

    // Promise for Game Rooms
    const gameRoomsPromise = new Promise((resolve, reject) => {
        let initialLoad = true;
        onSnapshot(gameRoomsCollectionRef, (snapshot) => {
            firestoreGameRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Firestore: Game Rooms snapshot. Count:", firestoreGameRooms.length);
            if (!gameRoomManagementPanel.classList.contains('hidden')) renderGameRoomList();
            // NEW: Update lobby if visible
            if (!playerJoinRoomPanel.classList.contains('hidden')) renderAvailableRoomsList();

            // --- NEW: Update game room if user is in it ---
            if (currentJoinedRoomId && !gameRoomViewPanel.classList.contains('hidden')) {
                renderGameRoomView(currentJoinedRoomId);
            }

            if (initialLoad) { initialLoad = false; resolve(); }
        }, (error) => { console.error("Firestore: Error listening to game rooms:", error); reject(error); });
    });

    // Promise for Investments (Feature hidden)
    const investmentsPromise = new Promise((resolve, reject) => {
        let initialLoad = true;
        onSnapshot(investmentsCollectionRef, (snapshot) => {
            // investmentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // if (!investmentsPanel.classList.contains('hidden')) renderInvestments();
            if (initialLoad) { initialLoad = false; resolve(); }
        }, (error) => { console.error("Firestore: Error listening to investments:", error); reject(error); });
    });

    // --- Promise.all UPDATED ---
    return Promise.all([rolesPromise, profilesPromise, activeSessionsPromise, gameRoomsPromise, investmentsPromise]);
}

// --- NEW Standings Sidebar Functions ---

/** Renders the right-hand standings sidebar */
function renderStandingsSidebar() {
    if (!standingsList) return;
    standingsList.innerHTML = ''; // Clear old list

    if (allFirebaseUsersData.length === 0) {
        standingsList.innerHTML = '<li><p>No users found.</p></li>';
        return;
    }

    // --- UPDATED: Get full session info, not just IDs ---
    const onlineUserSessions = new Map(firestoreActiveSessions.map(session => [session.id, session]));

    // Sort users by chip count, descending
    const sortedUsers = [...allFirebaseUsersData].sort((a, b) => (b.chip_count || 0) - (a.chip_count || 0));

    sortedUsers.forEach(user => {
        // --- UPDATED: Check for 'online' or 'idle' status ---
        const session = onlineUserSessions.get(user.uid);
        const isOnline = session && session.status === 'online';
        const isIdle = session && session.status === 'idle';

        const li = document.createElement('li');
        li.className = 'standings-item';
        li.setAttribute('data-uid', user.uid);

        li.innerHTML = `
            <span class="name">
                <!-- UPDATED: Logic now includes 'idle' class -->
                <span class="status-dot ${isOnline ? 'online' : (isIdle ? 'idle' : '')}"></span>
                ${formatDisplayName(user)}
            </span>
            <span class="chips">${user.chip_count || 0} 💎</span>
        `;

        // Add click listener to show the modal
        li.addEventListener('click', () => showUserInfoModal(user.uid));
        standingsList.appendChild(li);
    });
}

/** Shows the pop-up modal with a user's info */
function showUserInfoModal(uid) {
    const user = allFirebaseUsersData.find(u => u.uid === uid);
    if (!user) return;

    // --- UPDATED: Use list ---
    const userRole = getCurrentUserRole(uid);
    // --- UPDATED: Get full session status ---
    const session = firestoreActiveSessions.find(s => s.id === uid);
    const status = session ? (session.status || 'online') : 'offline'; // Default to 'online' if session exists but no status

    let statusText = 'Offline';
    let statusClass = 'offline';
    if (status === 'online') {
        statusText = 'Online';
        statusClass = 'online';
    } else if (status === 'idle') {
        statusText = 'Idle';
        statusClass = 'idle';
    }

    // *** NAME FIX: Removed Email line ***
    userInfoModalContent.innerHTML = `
        <h3 style="text-align: left;">${formatDisplayName(user)}</h3>
        <p classCSS="text-left"><strong>Role:</strong> ${userRole}</p>
        <p classCSS="text-left"><strong>Chips:</strong> ${user.chip_count || 0} 💎</p>
        <!-- UPDATED: Show styled status text -->
        <p classCSS="text-left"><strong>Status:</strong> <span class="status-text ${statusClass}">${statusText}</span></p>
        <button id="closeUserInfoModalButton" class="btn btn-gray btn-half" style="margin-top: 1rem;">Close</button>
    `;

    // Make modal text left-aligned
    userInfoModalContent.querySelectorAll('p').forEach(p => {
        p.style.textAlign = 'left';
    });

    userInfoModal.classList.remove('hidden');
}

// --- END NEW Standings Sidebar Functions ---

// --- Admin: User Management Functions ---

/** Renders the table in the User Management panel */
function renderUserRolesTable() {
    if (!userRolesTable) return;

    // Combine data: profiles, roles, and online status
    const combinedData = allFirebaseUsersData.map(user => {
        const roleData = allFirebaseRolesData.find(r => r.uid === user.uid) || {};
        // --- UPDATED: Get full session object ---
        const session = firestoreActiveSessions.find(s => s.id === user.uid);
        return {
            ...user,
            role: getCurrentUserRole(user.uid), // Use helper
            session: session // Pass the whole session object
        };
    });

    // *** NAME FIX: Removed Email header ***
    userRolesTable.innerHTML = `
        <thead>
            <tr>
                <th>User</th>
                <th>Role</th>
                <th>Chips</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            <!-- Rows will be inserted here -->
        </tbody>
    `;

    const tbody = userRolesTable.querySelector('tbody');
    if (combinedData.length === 0) {
        // *** NAME FIX: Updated colspan ***
        tbody.innerHTML = '<tr><td colspan="5">No users found.</td></tr>';
        return;
    }

    // Create Table Rows
    combinedData.forEach(user => {
        const tr = document.createElement('tr');

        // --- UPDATED: Show 'Idle' status ---
        let statusText = 'Offline';
        if (user.session && user.session.status === 'online') {
            statusText = 'Online';
        } else if (user.session && user.session.status === 'idle') {
            statusText = 'Idle';
        }

        // *** NAME FIX: Removed Email cell ***
        tr.innerHTML = `
            <td>${formatDisplayName(user)}</td>
            <td>
                <select class="form-select user-role-select" data-uid="${user.uid}" ${user.role === ROLES.OWNER ? 'disabled' : ''}>
                    <option value="player" ${user.role === ROLES.PLAYER ? 'selected' : ''}>Player</option>
                    <option value="admin" ${user.role === ROLES.ADMIN ? 'selected' : ''}>Admin</option>
                    <option value="owner" ${user.role === ROLES.OWNER ? 'selected' : ''}>Owner</option>
                </select>
            </td>
            <td>
                <input type="number" class="form-input user-chip-input" data-uid="${user.uid}" value="${user.chip_count || 0}" style="width: 100px;">
            </td>
            <td>${statusText}</td>
            <td>
                <button class="btn btn-blue btn-sm update-user-btn" data-uid="${user.uid}">Save</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add event listeners to buttons and inputs
    tbody.querySelectorAll('.update-user-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const uid = e.target.dataset.uid;
            const row = e.target.closest('tr');
            const newRole = row.querySelector('.user-role-select').value;
            const newChips = parseInt(row.querySelector('.user-chip-input').value, 10);
            updateUserRoleAndChips(uid, newRole, newChips);
        });
    });
}

/** Updates a user's role and chip count (Admin action) */
async function updateUserRoleAndChips(uid, newRole, newChips) {
    console.log(`Updating user ${uid}: Role=${newRole}, Chips=${newChips}`);
    if (isNaN(newChips) || newChips < 0) {
        showMessage("Invalid chip count. Must be a positive number.", "error");
        return;
    }

    try {
        const batch = writeBatch(db);

        // --- PATHS FIXED to v3.1 ---
        // Update Role
        const roleRef = doc(db, "artifacts", appId, "public/data/user_roles", uid);
        batch.update(roleRef, { role: newRole });

        // Update Profile (Chips)
        const profileRef = doc(db, "artifacts", appId, "public/data/user_profiles", uid);
        batch.update(profileRef, { chip_count: newChips });

        await batch.commit();
        showMessage("User updated successfully!", "success");
    } catch (error) {
        console.error("Error updating user:", error);
        showMessage(`Error: ${error.message}`, "error");
        // Note: Listeners will refresh the table, no manual refresh needed
    }
}

// --- Admin: Game Room Management Functions ---

/** Renders the list of active game rooms */
function renderGameRoomList() {
    if (!gameRoomList) return;
    gameRoomList.innerHTML = ''; // Clear list

    if (firestoreGameRooms.length === 0) {
        gameRoomList.innerHTML = '<p>No active game rooms.</p>';
        return;
    }

    firestoreGameRooms.forEach(room => {
        const li = document.createElement('div');
        li.className = 'list-item';
        li.innerHTML = `
            <div class="list-item-content">
                <strong>${room.name}</strong>
                <small> (ID: ${room.id.substring(0, 5)})</small>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-green btn-sm join-room-btn" data-roomid="${room.id}">Join</button>
                <button class="btn btn-red btn-sm delete-room-btn" data-roomid="${room.id}">Delete</button>
            </div>
        `;
        gameRoomList.appendChild(li);
    });

    // Add event listeners
    gameRoomList.querySelectorAll('.join-room-btn').forEach(btn => {
        btn.addEventListener('click', (e) => joinGameRoom(e.target.dataset.roomid));
    });
    gameRoomList.querySelectorAll('.delete-room-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteGameRoom(e.target.dataset.roomid));
    });
}

/** Deletes a game room (Admin action) */
async function deleteGameRoom(roomId) {
    // --- Replaced confirm() with a simple console log/action ---
    console.log(`Attempting to delete room: ${roomId}`);
    // if (!confirm("Are you sure you want to delete this game room? This cannot be undone.")) {
    //     return;
    // }
    try {
        // --- PATHS FIXED to v3.1 ---
        const roomRef = doc(db, "artifacts", appId, "public/data/game_rooms", roomId);
        await deleteDoc(roomRef);
        showMessage("Room deleted successfully.", "success");
    } catch (error) {
        console.error("Error deleting room:", error);
        showMessage(`Error: ${error.message}`, "error");
    }
}

// --- Admin: Create Group Functions ---

/** Populates the checklist of users for creating a group */
function populateUserChecklist() {
    groupUserChecklist.innerHTML = '';
    allFirebaseUsersData.forEach(user => {
        // Don't let users add themselves (they are added automatically)
        if (user.uid === currentUserId) return;

        const div = document.createElement('div');
        div.innerHTML = `
            <label>
                <input type="checkbox" value="${user.uid}">
                ${formatDisplayName(user)}
            </label>
        `;
        groupUserChecklist.appendChild(div);
    });
}

// --- Game Room Functions ---

/** Joins a game room */
async function joinGameRoom(roomId) {
    console.log(`User ${currentUserId} attempting to join room ${roomId}`);
    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room) {
        showMessage("Room not found.", "error");
        return;
    }

    // --- UPDATED Data Structure ---
    // Add player to room's player list (array of UIDs)
    const roomRef = doc(db, "artifacts", appId, "public/data/game_rooms", roomId);

    try {
        // Use a transaction to safely add player and set initial state
        await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) {
                throw "Room no longer exists.";
            }

            const roomData = roomDoc.data();
            const players = roomData.players || [];

            if (players.includes(currentUserId)) {
                console.log("User already in room, skipping join logic.");
                // Just show the room
            } else {
                // Add player
                const newPlayers = [...players, currentUserId];

                // Set initial game state for this player
                const newGameState = {
                    ...roomData.gameState,
                    bets: {
                        ...roomData.gameState.bets,
                        [currentUserId]: 0 // Initial bet
                    },
                    status: {
                        ...roomData.gameState.status,
                        [currentUserId]: 'pending' // Initial status
                    }
                };

                transaction.update(roomRef, {
                    players: newPlayers,
                    gameState: newGameState
                });
            }
        });

        // --- PATHS FIXED to v3.1 ---
        // Set user's current room
        const profileRef = doc(db, "artifacts", appId, "public/data/user_profiles", currentUserId);
        await updateDoc(profileRef, { current_room: roomId });

        currentJoinedRoomId = roomId;
        renderGameRoomView(roomId);
        showPanel(gameRoomViewPanel);
    } catch (error) {
        console.error("Error joining room:", error);
        showMessage(`Error joining room: ${error.message}`, "error");
    }
}

/** Leaves the current game room */
async function leaveGameRoom() {
    if (!currentJoinedRoomId) return;

    const roomId = currentJoinedRoomId;
    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room) {
        console.error("Currently in a room that doesn't exist:", roomId);
        return;
    }

    // --- UPDATED Data Structure ---
    // Remove player from array of UIDs
    // We also need to remove them from the gameState maps

    try {
        const roomRef = doc(db, "artifacts", appId, "public/data/game_rooms", roomId);

        // Use a transaction to safely remove player and their state
        await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) {
                // Room is already gone, nothing to do
                return;
            }

            const roomData = roomDoc.data();

            // Remove from players array
            const newPlayers = (roomData.players || []).filter(uid => uid !== currentUserId);

            // Remove from gameState maps
            const newGameState = { ...roomData.gameState };
            if (newGameState.bets) delete newGameState.bets[currentUserId];
            if (newGameState.status) delete newGameState.status[currentUserId];

            transaction.update(roomRef, {
                players: newPlayers,
                gameState: newGameState
            });
        });

        // --- PATHS FIXED to v3.1 ---
        // Clear user's current room
        const profileRef = doc(db, "artifacts", appId, "public/data/user_profiles", currentUserId);
        await updateDoc(profileRef, { current_room: null });

        currentJoinedRoomId = null;
        // --- UPDATED: Go back to lobby ---
    showPanel(playerJoinRoomPanel);
    renderAvailableRoomsList(); // Refresh lobby list

    } catch (error) {
        console.error("Error leaving room:", error);
        showMessage(`Error leaving room: ${error.message}`, "error");
    }
}

// --- NEW: Render Available Rooms (Lobby) ---
/** Renders the list of available game rooms for the lobby panel */
function renderAvailableRoomsList() {
    if (!availableRoomsListContainer) return;
    availableRoomsListContainer.innerHTML = ''; // Clear old list

    const openRooms = firestoreGameRooms.filter(room => room.status !== 'closed'); // Show all non-closed rooms

    if (openRooms.length === 0) {
        availableRoomsListContainer.innerHTML = '<p class="text-center text-gray-500 py-4">No game rooms are currently available.</p>';
        return;
    }

    openRooms.forEach(room => {
        const div = document.createElement('div');
        div.className = 'room-list-item';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'room-list-info';
        infoDiv.innerHTML = `
            <div class="room-list-name">${room.name}</div>
            <div class="room-list-players">Players: ${room.players?.length || 0}</div>
        `;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'room-list-actions';

        const joinBtn = document.createElement('button');
        joinBtn.className = 'btn btn-green btn-sm';
        joinBtn.textContent = 'Join Room';
        joinBtn.onclick = () => handleJoinRoom(room.id);

        // Check if user is already in *any* room
        const userInARoom = allFirebaseUsersData.find(u => u.uid === currentUserId)?.current_room;
        if (userInARoom) {
            if (userInARoom === room.id) {
                joinBtn.textContent = 'Re-enter';
                joinBtn.className = 'btn btn-blue btn-sm';
            } else {
                joinBtn.disabled = true;
                joinBtn.title = "You are already in another room";
            }
        }

        actionsDiv.appendChild(joinBtn);
        div.appendChild(infoDiv);
        div.appendChild(actionsDiv);
        availableRoomsListContainer.appendChild(div);
    });
}

// --- NEW: Handle Join Room ---
/** Handles the logic for a player to join a room */
async function handleJoinRoom(roomId) {
    if (!currentUserId) return;

    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room) {
        showMessage("That room no longer exists.", "error");
        renderAvailableRoomsList();
        return;
    }

    // Check if user is already in another room
    const userProfile = allFirebaseUsersData.find(u => u.uid === currentUserId);
    if (userProfile.current_room && userProfile.current_room !== roomId) {
        showMessage("You must leave your current room before joining another.", "error");
        return;
    }

    console.log(`User ${currentUserId} joining room ${roomId}`);
    const roomRef = doc(db, "artifacts", appId, "public/data/game_rooms", roomId);
    const profileRef = doc(db, "artifacts", appId, "public/data/user_profiles", currentUserId);

    try {
        // Use a transaction to safely add player
        await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) throw "Room not found.";

            const roomData = roomDoc.data();
            const players = roomData.players || [];
            if (players.includes(currentUserId)) {
                // User is already in this room, just update their profile
                transaction.update(profileRef, { current_room: roomId });
            } else {
                // Add user to room and update profile
                const newPlayers = [...players, currentUserId];
                const newGameState = {
                    ...roomData.gameState,
                    bets: { ...roomData.gameState.bets, [currentUserId]: 0 },
                    status: { ...roomData.gameState.status, [currentUserId]: 'pending' }
                };
                transaction.update(roomRef, {
                    players: newPlayers,
                    gameState: newGameState
                });
                transaction.update(profileRef, { current_room: roomId });
            }
        });

        currentJoinedRoomId = roomId;
        renderGameRoomView(roomId);
        showPanel(gameRoomViewPanel);

    } catch (error) {
        console.error("Error joining room:", error);
        showMessage(`Error joining room: ${error.message}`, "error");
    }
}


/** Renders the main game room view */
function renderGameRoomView(roomId) {
    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room) {
        console.warn("RenderGameRoomView: Room not found, leaving.");
        leaveGameRoom(); // Room might have been deleted
        return;
    }

    // Set the panel title
    gameRoomName.textContent = room.name;

    // --- Calculate Game State ---
    const roomPlayers = room.players || [];
    const roomBets = room.gameState.bets || {};
    const roomStatus = room.gameState.status || {};
    // NEW: Get current user's profile and admin status
    const currentUserProfile = allFirebaseUsersData.find(p => p.uid === currentUserId);
    const currentUserChips = currentUserProfile?.chip_count || 0;
    const currentUserIsAdmin = hasAdminAccess(currentUserId);

    // Calculate total pot
    let totalPot = 0;
    for (const uid in roomBets) {
        totalPot += (roomBets[uid] || 0);
    }
    // NEW: Calculate highest bet to call
    const highestBet = Object.values(roomBets).reduce((max, bet) => Math.max(max, bet), 0);
    const currentUserBet = roomBets[currentUserId] || 0;
    const amountToCall = highestBet - currentUserBet;

    // --- 0. Build Admin Controls (if admin) ---
    let adminControlsHtml = '';
    if (currentUserIsAdmin) {
        // NOTE: This HTML is now placed in the 'actions' column
        adminControlsHtml = `
            <div class="game-admin-controls">
                <h4>Admin Controls</h4>
                <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                    <button id="adminRoomResetButton" class="btn btn-purple btn-sm">Room Reset</button>
                    <button id="adminUpdateChipsButton" class="btn btn-blue btn-sm">Update Chips</button>
                    <!-- NEW: Post Blinds Button -->
                    <button id="adminPostBlindsButton" class="btn btn-purple btn-sm" style="margin-top: 0.5rem;">Post Blinds</button>
                </div>
            </div>
            <!-- Hidden Update Chips Panel -->
            <div id="updateChipsPanel" class="update-chips-panel hidden">
                <h4>Update Player Chips (After Hand)</h4>
                <div id="updateChipsPlayerList" class="update-chips-list">
                    <!-- JS will populate this -->
                </div>
                <div class="update-chips-actions">
                    <button id="cancelChipUpdate" class="btn btn-gray btn-sm">Cancel</button>
                    <button id="submitChipUpdate" class="btn btn-green btn-sm">Submit & Reset</button>
                </div>
            </div>
        `;
    }

    // --- 1. Build the info column (Pot & Cards) ---
    let infoColumnHtml = `
        <div class="gr-box gr-info-box">
            <h4>Game Info</h4>
            <div class="pot-display">
                Total Pot
                <div class="pot-display-amount">${totalPot} 💎</div>
            </div>
            <!-- REMOVED: Community Cards Div -->
            <div style="margin-top: 1rem; font-size: 0.9rem; color: #4b5563;">
                <strong>Highest Bet:</strong> ${highestBet} 💎
            </div>
        </div>
    `;

    // --- 2. Build the player list column ---
    let playerColumnHtml = '<div class="gr-box"><h4 style="margin-bottom: 0.75rem;">Players</h4><div class="game-players-column">';
    // NEW: Get dealer position
    const dealerPosition = room.dealerPosition || 0;

    roomPlayers.forEach((uid, index) => {
        const player = allFirebaseUsersData.find(u => u.uid === uid);
        if (!player) return; // Skip if profile isn't loaded

        const isCurrentUser = (uid === currentUserId);
        const bet = roomBets[uid] || 0;
        const dbStatus = roomStatus[uid] || 'pending'; // 'pending', 'ready', 'folded', 'all-in'

        // --- NEW: Smart Status Logic ---
        // If player is 'ready' but their bet is less than the highest, show 'pending'
        let finalStatus = dbStatus;
        if (finalStatus !== 'folded' && finalStatus !== 'all-in' && bet < highestBet) {
            finalStatus = 'pending';
        }
        const statusClass = finalStatus.replace('_', '-');
        // --- END Smart Status ---

        // NEW: Check if this player is the dealer
        const isDealer = (index === dealerPosition);
        let dealerBadgeHtml = isDealer ? '<div class="gr-dealer-badge">D</div>' : '';

        // NEW: Admin Menu for player card
        let adminMenuHtml = '';
        if (currentUserIsAdmin) {
            const targetStatus = roomStatus[uid] || 'pending';
            const canAct = targetStatus !== 'folded' && targetStatus !== 'all-in';
            const notSelf = uid !== currentUserId;

            adminMenuHtml = `
                <button class="player-admin-menu-btn" data-uid="${uid}">⋮</button>
                <div id="admin-menu-${uid}" class="player-admin-menu hidden">
                    <button class="remove-player-btn" data-uid="${uid}" ${!notSelf ? 'disabled title="Cannot remove self"' : ''}>Remove Player</button>
                    <button class="force-fold-btn" data-uid="${uid}" ${(!notSelf || !canAct) ? 'disabled title="Cannot fold self or inactive player"' : ''}>Force Fold</button>
                    <button class="place-bet-for-player-btn" data-uid="${uid}" ${!canAct ? 'disabled title="Cannot bet for inactive player"' : ''}>Place Bet for...</button>
                </div>
            `;
        }

        playerColumnHtml += `
            <div class="gr-player-card ${isCurrentUser ? 'is-current-user' : ''}" data-uid="${uid}">
                ${dealerBadgeHtml} <!-- NEW: Show dealer badge -->
                ${adminMenuHtml}
                <h5>${formatDisplayName(player)}</h5>
                <div class="chips"><span>${player.chip_count || 0} 💎</span></div>
                <div class="bet-status">
                    <div class="bet">Bet: ${bet}</div>
                    <div class="status ${statusClass}">${finalStatus}</div> <!-- UPDATED: Use finalStatus -->
                </div>
            </div>
        `;
    });
    playerColumnHtml += '</div></div>'; // Close game-players-column and gr-box

    // --- 3. Build the action bar column ---
    const currentUserDbStatus = roomStatus[currentUserId] || 'pending';

    // --- NEW: Use Smart Status for canPlayerAct ---
    let currentUserFinalStatus = currentUserDbStatus;
    if (currentUserFinalStatus !== 'folded' && currentUserFinalStatus !== 'all-in' && currentUserBet < highestBet) {
        currentUserFinalStatus = 'pending';
    }
    const canPlayerAct = currentUserFinalStatus !== 'folded' && currentUserFinalStatus !== 'all-in';
    // --- END NEW ---

    let actionColumnHtml = '';
    if (canPlayerAct) {
        actionColumnHtml = `
            <div class="gr-box gr-action-box">
                <h4>Your Action</h4>
                <div class="form-group">
                    <label class="form-label" for="betAmountInput">Bet Amount (Max: ${currentUserChips})</label>
                    <input type="number" id="betAmountInput" class="form-input" placeholder="0" min="0" max="${currentUserChips}">
                </div>
                <div class="action-buttons">
                    <button id="placeBetButton" class="btn btn-blue btn-sm">Bet/Raise</button>
                    <button id="callButton" class="btn btn-green btn-sm">
                        ${amountToCall > 0 ? `Call (${amountToCall})` : 'Check'}
                    </button>
                    <button id="allInButton" class="btn btn-purple btn-sm btn-full-span">All-In (${currentUserChips})</button>
                    <button id="foldButton" class="btn btn-red btn-sm btn-full-span">Fold</button>
                </div>
            </div>
        `;
    } else {
        actionColumnHtml = `
            <div class="gr-box gr-action-box">
                <h4>Your Action</h4>
                <p class="text-center font-semibold text-lg">You are ${currentUserFinalStatus}</p> <!-- UPDATED: Use finalStatus -->
            </div>
        `;
    }

    // --- 4. Combine all parts into the game room content ---
    gameRoomContent.innerHTML = `
        <div class="game-room-layout">
            <div class="game-players-column">
                ${playerColumnHtml}
            </div>
            <div class="game-info-column">
                ${infoColumnHtml}
            </div>
            <div class="game-actions-column">
                ${actionColumnHtml}
                ${adminControlsHtml}
            </div>
        </div>
    `;

    // --- 5. Add event listeners for the new buttons ---
    // NEW: Add listeners for v3.1 actions
    if (canPlayerAct) {
        gameRoomContent.querySelector('#placeBetButton').addEventListener('click', () => {
            const amount = parseInt(gameRoomContent.querySelector('#betAmountInput').value, 10);
            handlePlaceBet(roomId, amount);
        });
        gameRoomContent.querySelector('#callButton').addEventListener('click', () => handleCallBet(roomId));
        gameRoomContent.querySelector('#foldButton').addEventListener('click', () => handleFold(roomId));
        gameRoomContent.querySelector('#allInButton').addEventListener('click', () => handleAllIn(roomId));
    }

    // NEW: Add listeners for Admin controls
    if (currentUserIsAdmin) {
        gameRoomContent.querySelector('#adminRoomResetButton').addEventListener('click', () => adminRoomReset(roomId));
        gameRoomContent.querySelector('#adminUpdateChipsButton').addEventListener('click', () => toggleUpdateChipsPanel(roomId, true));
        gameRoomContent.querySelector('#cancelChipUpdate').addEventListener('click', () => toggleUpdateChipsPanel(roomId, false));
        gameRoomContent.querySelector('#submitChipUpdate').addEventListener('click', () => handleSubmitChipUpdate(roomId));
        // NEW: Add listener for Post Blinds
        gameRoomContent.querySelector('#adminPostBlindsButton').addEventListener('click', () => adminPostBlinds(roomId));

        // Listeners for player card admin menus (using event delegation)
        gameRoomContent.addEventListener('click', (e) => {
            const target = e.target;
            // Toggle menu visibility
            if (target.classList.contains('player-admin-menu-btn')) {
                const uid = target.dataset.uid;
                const menu = gameRoomContent.querySelector(`#admin-menu-${uid}`);
                if (menu) {
                    menu.classList.toggle('hidden');
                }
            }
            // Handle menu actions
            else if (target.classList.contains('remove-player-btn')) {
                const player = allFirebaseUsersData.find(p => p.uid === target.dataset.uid);
                adminRemovePlayer(roomId, target.dataset.uid, formatDisplayName(player));
            } else if (target.classList.contains('force-fold-btn')) {
                const player = allFirebaseUsersData.find(p => p.uid === target.dataset.uid);
                adminForceFoldPlayer(roomId, target.dataset.uid, formatDisplayName(player));
            } else if (target.classList.contains('place-bet-for-player-btn')) {
                const player = allFirebaseUsersData.find(p => p.uid === target.dataset.uid);
                adminPlaceBetForPlayer(roomId, target.dataset.uid, formatDisplayName(player), player?.chip_count || 0);
            }
            // Hide menus if clicking elsewhere
            else if (!target.closest('.player-admin-menu') && !target.classList.contains('player-admin-menu-btn')) {
                gameRoomContent.querySelectorAll('.player-admin-menu').forEach(menu => menu.classList.add('hidden'));
            }
        });
    }
}

/** (Admin) Posts blinds for SB/BB and rotates the dealer button */
async function adminPostBlinds(roomId) {
    if (!hasAdminAccess(currentUserId)) return showMessage("Permission denied.", "error");

    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room || !room.players || room.players.length < 2) {
        return showMessage("Not enough players to post blinds.", "info");
    }

    console.log("Admin posting blinds...");
    const roomRef = doc(db, "artifacts", appId, "public/data/game_rooms", roomId);
    const players = room.players;
    const pCount = players.length;
    const currentDealerPos = room.dealerPosition || 0;

    // Determine SB and BB
    const sbIndex = (currentDealerPos + 1) % pCount;
    const bbIndex = (currentDealerPos + 2) % pCount;
    const sbPlayerId = players[sbIndex];
    const bbPlayerId = players[bbIndex];

    // Define blind amounts
    const sbAmount = 1;
    const bbAmount = 2;

    // Rotate dealer for the *next* hand
    const newDealerPosition = (currentDealerPos + 1) % pCount;

    try {
        await updateDoc(roomRef, {
            "dealerPosition": newDealerPosition,
            [`gameState.bets.${sbPlayerId}`]: sbAmount,
            [`gameState.bets.${bbPlayerId}`]: bbAmount,
            [`gameState.status.${sbPlayerId}`]: 'ready',
            [`gameState.status.${bbPlayerId}`]: 'ready'
        });
        showMessage("Blinds posted and dealer button rotated.", "success");
    } catch (error) {
        console.error("Error posting blinds:", error);
        showMessage(`Error: ${error.message}`, "error");
    }
}


/** (Admin) Removes a player from the game room */
async function adminRemovePlayer(roomId, targetPlayerId, targetPlayerName) {
    if (!hasAdminAccess(currentUserId)) return showMessage("Permission denied.", "error");
    if (targetPlayerId === currentUserId) return showMessage("Cannot remove self.", "error");

    console.log(`Admin removing ${targetPlayerName} from room ${roomId}`);

    const roomRef = doc(db, "artifacts", appId, "public/data/game_rooms", roomId);
    const profileRef = doc(db, "artifacts", appId, "public/data/user_profiles", targetPlayerId);

    try {
        await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) throw "Room not found.";

            const roomData = roomDoc.data();
            const newPlayers = (roomData.players || []).filter(uid => uid !== targetPlayerId);
            const newGameState = { ...roomData.gameState };
            if (newGameState.bets) delete newGameState.bets[targetPlayerId];
            if (newGameState.status) delete newGameState.status[targetPlayerId];

            transaction.update(roomRef, {
                players: newPlayers,
                gameState: newGameState
            });
            transaction.update(profileRef, { current_room: null });
        });
        showMessage(`${targetPlayerName} has been removed from the room.`, "success");
    } catch (error) {
        console.error("Error removing player:", error);
        showMessage(`Error removing player: ${error.message}`, "error");
    }
}

/** (Admin) Forces a player to fold */
async function adminForceFoldPlayer(roomId, targetPlayerId, targetPlayerName) {
    if (!hasAdminAccess(currentUserId)) return showMessage("Permission denied.", "error");
    console.log(`Admin forcing fold for ${targetPlayerName}`);
    const roomRef = doc(db, "artifacts", appId, "public/data/game_rooms", roomId);
    try {
        await updateDoc(roomRef, {
            [`gameState.status.${targetPlayerId}`]: 'folded'
        });
        showMessage(`${targetPlayerName} has been folded.`, "success");
    } catch (error) {
        console.error("Error forcing fold:", error);
        showMessage(`Error: ${error.message}`, "error");
    }
}

/** (Admin) Places a bet for a player */
async function adminPlaceBetForPlayer(roomId, targetPlayerId, targetPlayerName, playerChips) {
    if (!hasAdminAccess(currentUserId)) return showMessage("Permission denied.", "error");
    
    const betAmountStr = prompt(`Enter bet for ${targetPlayerName} (has ${playerChips} chips):`);
    if (!betAmountStr) return; // User cancelled

    const betAmount = parseInt(betAmountStr, 10);
    if (isNaN(betAmount) || betAmount < 0) return showMessage("Invalid amount.", "error");
    if (betAmount > playerChips) return showMessage("Amount exceeds player's chips.", "error");
    
    console.log(`Admin betting ${betAmount} for ${targetPlayerName}`);
    const roomRef = doc(db, "artifacts", appId, "public/data/game_rooms", roomId);
    try {
        const newStatus = (betAmount === playerChips) ? 'all-in' : 'ready';
        await updateDoc(roomRef, {
            [`gameState.bets.${targetPlayerId}`]: betAmount,
            [`gameState.status.${targetPlayerId}`]: newStatus
        });
        showMessage(`Bet of ${betAmount} placed for ${targetPlayerName}.`, "success");
    } catch (error) {
        console.error("Error placing bet for player:", error);
        showMessage(`Error: ${error.message}`, "error");
    }
}

/** (Admin) Resets all bets and statuses in the room */
async function adminRoomReset(roomId) {
    if (!hasAdminAccess(currentUserId)) return showMessage("Permission denied.", "error");
    console.log(`Admin resetting room ${roomId}`);

    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room) return showMessage("Room not found.", "error");

    const roomRef = doc(db, "artifacts", appId, "public/data/game_rooms", roomId);
    try {
        const newBets = {};
        const newStatus = {};
        for (const uid of room.players) {
            newBets[uid] = 0;
            newStatus[uid] = 'pending';
        }
        await updateDoc(roomRef, {
            "gameState.bets": newBets,
            "gameState.status": newStatus,
            // Add other game state resets here (e.g., community cards, pot)
        });
        showMessage("Room has been reset.", "success");
    } catch (error) {
        console.error("Error resetting room:", error);
        showMessage(`Error: ${error.message}`, "error");
    }
}

/** (Admin) Toggles the Update Chips panel */
function toggleUpdateChipsPanel(roomId, show) {
    const panel = gameRoomContent.querySelector('#updateChipsPanel');
    if (!panel) return;

    if (show) {
        populateUpdateChipsPanel(roomId);
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('hidden');
    }
}

/** (Admin) Populates the Update Chips panel with players */
function populateUpdateChipsPanel(roomId) {
    const listEl = gameRoomContent.querySelector('#updateChipsPlayerList');
    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!listEl || !room) return;

    listEl.innerHTML = '';
    const roomStatus = room.gameState.status || {};

    room.players.forEach(uid => {
        const player = allFirebaseUsersData.find(p => p.uid === uid);
        const status = roomStatus[uid] || 'pending';
        
        // Only add non-folded players
        if (status !== 'folded') {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'update-chips-item';
            itemDiv.innerHTML = `
                <span>${formatDisplayName(player)}</span>
                <select class="form-select" data-uid="${uid}" style="width: auto;">
                    <option value="0">No Win / Lose</option>
                    <option value="1">1st Place</option>
                    <option value="2">2nd Place</option>
                    <option value="3">3rd Place</option>
                </select>
            `;
            listEl.appendChild(itemDiv);
        }
    });
}

/** (Admin) Handles submission of chip updates and pot distribution */
async function handleSubmitChipUpdate(roomId) {
    console.log("Submitting chip update...");
    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room) return showMessage("Room data not found.", "error");

    const listEl = gameRoomContent.querySelector('#updateChipsPlayerList');
    const selects = listEl.querySelectorAll('select[data-uid]');
    
    const players = [];
    let totalPot = 0;
    const roomBets = room.gameState.bets || {};
    
    room.players.forEach(uid => {
        const playerProfile = allFirebaseUsersData.find(p => p.uid === uid);
        const bet = roomBets[uid] || 0;
        totalPot += bet;

        players.push({
            id: uid,
            bet: bet,
            chips: playerProfile?.chip_count || 0,
            status: room.gameState.status[uid] || 'pending',
            winnings: 0
        });
    });

    // Get rankings from UI
    const rankings = [];
    selects.forEach(s => {
        rankings.push({ id: s.dataset.uid, rank: parseInt(s.value, 10) });
    });

    // Simple distribution: 1st place gets all.
    // This is a placeholder for the complex v3.1 logic.
    const winners = rankings.filter(r => r.rank === 1);
    if (winners.length > 0) {
        const share = totalPot / winners.length;
        winners.forEach(winner => {
            const player = players.find(p => p.id === winner.id);
            if (player) {
                player.winnings = share;
            }
        });
    }
    // Note: This simple logic doesn't handle side pots or complex betting.

    // 7. If available_pot is not 0 (in this simple case, it always is)
    // We'll skip the error check for this placeholder.

    // 8. Update Firestore
    const batch = writeBatch(db);
    players.forEach(player => {
        const playerProfileRef = doc(db, "artifacts", appId, "public/data/user_profiles", player.id);
        // Player's new chips = current chips - their bet + their winnings
        const newChipCount = player.chips - player.bet + player.winnings;
        batch.update(playerProfileRef, { chip_count: newChipCount });
    });
    
    try {
        await batch.commit();
        showMessage("Chips updated and pot distributed!", "success");
        adminRoomReset(roomId); // Reset the room for the next hand
        toggleUpdateChipsPanel(roomId, false); // Hide the panel
    } catch (error) {
        console.error("Error updating chips:", error);
        showMessage(`Error: ${error.message}`, "error");
    }
}

/** (Player) Handles placing a bet or raise */
async function handlePlaceBet(roomId, amount) {
    if (isNaN(amount) || amount <= 0) return showMessage("Invalid bet amount.", "error");

    const playerProfile = allFirebaseUsersData.find(p => p.uid === currentUserId);
    const playerChips = playerProfile?.chip_count || 0;
    if (amount > playerChips) return showMessage("You don't have enough chips.", "error");

    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room) return showMessage("Room not found.", "error");

    const roomRef = doc(db, "artifacts", appId, "public/data/game_rooms", roomId);
    const newStatus = (amount === playerChips) ? 'all-in' : 'ready';

    try {
        await updateDoc(roomRef, {
            [`gameState.bets.${currentUserId}`]: amount,
            [`gameState.status.${currentUserId}`]: newStatus
        });
        showMessage(`You bet ${amount}.`, "success");
    } catch (error) {
        console.error("Error placing bet:", error);
        showMessage(`Error: ${error.message}`, "error");
    }
}

/** (Player) Handles calling the current highest bet */
async function handleCallBet(roomId) {
    const playerProfile = allFirebaseUsersData.find(p => p.uid === currentUserId);
    const playerChips = playerProfile?.chip_count || 0;
    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room) return showMessage("Room not found.", "error");

    const roomBets = room.gameState.bets || {};
    const highestBet = Object.values(roomBets).reduce((max, bet) => Math.max(max, bet), 0);
    const currentUserBet = roomBets[currentUserId] || 0;
    const amountToCall = highestBet - currentUserBet;

    if (amountToCall === 0) { // This is a "Check"
        showMessage("You checked.", "success");
        return; // No DB update needed if status is already 'ready'
    }

    if (playerChips < amountToCall) { // Not enough chips to call, go all-in
        return handleAllIn(roomId);
    }

    const roomRef = doc(db, "artifacts", appId, "public/data/game_rooms", roomId);
    try {
        await updateDoc(roomRef, {
            [`gameState.bets.${currentUserId}`]: highestBet, // Call by matching the highest bet
            [`gameState.status.${currentUserId}`]: 'ready'
        });
        showMessage(`You called ${highestBet}.`, "success");
    } catch (error) {
        console.error("Error calling bet:", error);
        showMessage(`Error: ${error.message}`, "error");
    }
}

/** (Player) Handles folding the hand */
async function handleFold(roomId) {
    const roomRef = doc(db, "artifacts", appId, "public/data/game_rooms", roomId);
    try {
        await updateDoc(roomRef, {
            [`gameState.status.${currentUserId}`]: 'folded'
        });
        showMessage("You folded.", "success");
    } catch (error) {
        console.error("Error folding:", error);
        showMessage(`Error: ${error.message}`, "error");
    }
}

/** (Player) Handles going all-in */
async function handleAllIn(roomId) {
    const playerProfile = allFirebaseUsersData.find(p => p.uid === currentUserId);
    const playerChips = playerProfile?.chip_count || 0;
    
    const roomRef = doc(db, "artifacts", appId, "public/data/game_rooms", roomId);
    try {
        await updateDoc(roomRef, {
            [`gameState.bets.${currentUserId}`]: playerChips, // Bet all chips
            [`gameState.status.${currentUserId}`]: 'all-in'
        });
        showMessage(`You are All-In with ${playerChips}!`, "success");
    } catch (error) {
        console.error("Error going all-in:", error);
        showMessage(`Error: ${error.message}`, "error");
    }
}


// --- User Directory Functions ---

/** Renders the main user directory table */
function renderUserDirectoryTable() {
    if (!userDirectoryTable) return;

    // Combine data: profiles and online status
    const combinedData = allFirebaseUsersData.map(user => {
        // --- UPDATED: Get full session object ---
        const session = firestoreActiveSessions.find(s => s.id === user.uid);
        return {
            ...user,
            session: session
        };
    });

    // Sort by online status first, then by name
    combinedData.sort((a, b) => {
        const aOnline = a.session && (a.session.status === 'online' || a.session.status === 'idle');
        const bOnline = b.session && (b.session.status === 'online' || b.session.status === 'idle');
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
        return (a.display_name || '').localeCompare(b.display_name || '');
    });

    // *** NAME FIX: Removed Email header ***
    userDirectoryTable.innerHTML = `
        <thead>
            <tr>
                <th>User</th>
                <th>Chip Count</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            <!-- Rows will be inserted here -->
        </tbody>
    `;

    const tbody = userDirectoryTable.querySelector('tbody');
    if (combinedData.length === 0) {
        // *** NAME FIX: Updated colspan ***
        tbody.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
        return;
    }

    // Create Table Rows
    combinedData.forEach(user => {
        const tr = document.createElement('tr');

        // --- UPDATED: Show 'Idle' status ---
        let statusText = 'Offline';
        if (user.session && user.session.status === 'online') {
            statusText = 'Online';
        } else if (user.session && user.session.status === 'idle') {
            statusText = 'Idle';
        }

        // *** NAME FIX: Removed Email cell ***
        tr.innerHTML = `
            <td>${formatDisplayName(user)}</td>
            <td>${user.chip_count || 0}</td>
            <td>${statusText}</td>
            <td>
                <button class="btn btn-blue btn-sm open-chat-btn" data-uid="${user.uid}" ${user.uid === currentUserId ? 'disabled' : ''}>
                    Chat
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add listeners
    tbody.querySelectorAll('.open-chat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openDirectMessage(e.target.dataset.uid));
    });
}

// --- Chat Functions ---

/** Opens a direct message (1-on-1 group) with a user */
async function openDirectMessage(otherUserId) {
    const otherUser = allFirebaseUsersData.find(u => u.uid === otherUserId);
    if (!otherUser) return;

    const members = [currentUserId, otherUserId].sort(); // Sort UIDs to create a consistent group ID
    const groupId = `dm_${members[0]}_${members[1]}`;
    const groupName = `DM: ${formatDisplayName(otherUser)}`;

    try {
        // Check if this DM group already exists
        // --- PATHS FIXED to v3.1 ---
        const groupRef = doc(db, "artifacts", appId, "public/data/chat_groups", groupId);
        const groupDoc = await getDoc(groupRef);

        if (!groupDoc.exists()) {
            // Create the DM group
            await setDoc(groupRef, {
                id: groupId,
                name: groupName,
                members: members,
                isDM: true,
                createdAt: serverTimestamp(),
                createdBy: currentUserId
            });
        }

        // Open the chat modal
        openGroupChat(groupId, groupName);

    } catch (error) {
        console.error("Error opening direct message:", error);
        showMessage(`Error: ${error.message}`, "error");
    }
}

/** Opens the group chat modal and loads messages */
function openGroupChat(groupId, groupName) {
    groupChatTitle.textContent = groupName;
    groupChatModal.dataset.currentGroupId = groupId;
    groupChatMessages.innerHTML = '<p>Loading messages...</p>';

    // Clear message input
    groupMessageInput.value = '';

    // Show modal
    groupChatModal.classList.remove('hidden');

    // --- Attach message listener ---
    // --- PATHS FIXED to v3.1 ---
    const messagesCollectionRef = collection(db, "artifacts", appId, "public/data/chat_groups", groupId, "messages");
    const q = query(messagesCollectionRef); // Add orderBy('timestamp') here if you add it

    onSnapshot(q, (snapshot) => {
        firestoreMessages = snapshot.docs.map(doc => doc.data());
        renderGroupChatMessages();
    }, (error) => {
        console.error("Error listening to messages:", error);
        groupChatMessages.innerHTML = '<p>Error loading messages.</p>';
    });
}

/** Renders messages in the chat modal */
function renderGroupChatMessages() {
    groupChatMessages.innerHTML = '';
    if (firestoreMessages.length === 0) {
        groupChatMessages.innerHTML = '<p>No messages yet. Say hi!</p>';
        return;
    }

    // Sort by timestamp (assuming it exists)
    firestoreMessages.sort((a, b) => a.timestamp - b.timestamp);

    firestoreMessages.forEach(msg => {
        const div = document.createElement('div');
        const user = allFirebaseUsersData.find(u => u.uid === msg.senderId);
        const senderName = user ? formatDisplayName(user) : 'Unknown';

        div.innerHTML = `
            <strong>${senderName}:</strong>
            <p style="margin: 0;">${msg.text}</p>
            <small style="font-size: 0.7rem; color: #888;">${new Date(msg.timestamp?.toDate()).toLocaleTimeString()}</small>
        `;
        div.style.marginBottom = '10px';
        groupChatMessages.appendChild(div);
    });

    // Scroll to bottom
    groupChatMessages.scrollTop = groupChatMessages.scrollHeight;
}

/** Sends a message to the currently open group */
async function sendGroupMessage() {
    const text = groupMessageInput.value.trim();
    const groupId = groupChatModal.dataset.currentGroupId;

    if (!text || !groupId) return;

    // --- PATHS FIXED to v3.1 ---
    const messagesCollectionRef = collection(db, "artifacts", appId, "public/data/chat_groups", groupId, "messages");

    try {
        await addDoc(messagesCollectionRef, {
            text: text,
            senderId: currentUserId,
            timestamp: serverTimestamp()
        });
        groupMessageInput.value = ''; // Clear input
    } catch (error) {
        console.error("Error sending message:", error);
        showMessage("Error sending message.", "error");
    }
}


// --- Utility & UI Functions ---

/**
 * Shows a specific panel and hides all others.
 * @param {HTMLElement} panelToShow - The DOM element of the panel to show.
 */
function showPanel(panelToShow) {
    // List of all panels
    const allPanels = [
        loginButtonsContainer,
        mainActionButtons,
        accountManagementPanel,
        adminPanel,
        userManagementPanel,
        gameRoomManagementPanel,
        gameRoomViewPanel,
        userDirectoryPanel,
        createGroupPanel,
        playerJoinRoomPanel // NEW: Add lobby panel
    ];

    // Hide all panels
    allPanels.forEach(panel => {
        if (panel) panel.classList.add('hidden');
    });

    // Hide loading and message
    loadingIndicator.classList.add('hidden');
    messageBox.classList.add('hidden');

    // Show the target panel
    if (panelToShow) {
        panelToShow.classList.remove('hidden');
        console.log("showPanel: Showing:", panelToShow.id);
    } else {
        console.warn("showPanel: panelToShow was null or undefined.");
    }
}

/**
 * Displays a message to the user.
 * @param {string} message - The text to display.
 * @param {string} type - 'success', 'error', or 'info'.
 */
function showMessage(message, type = "info") {
    messageBox.textContent = message;
    messageBox.className = 'message-box'; // Reset classes

    // Map simple types to style classes
    if (type === 'success') {
        messageBox.classList.add('success');
    } else if (type === 'error') {
        messageBox.classList.add('error');
    } else {
        messageBox.classList.add('info');
    }

    messageBox.classList.remove('hidden');
}

/**
 * Formats a user's name for display.
 * @param {object} userData - A user profile object.
 * @returns {string} The formatted name.
 */
function formatDisplayName(userData) {
    // *** NAME FIX: Never fall back to email ***
    if (!userData) return "Unknown User";
    return userData.display_name || "New User";
}

/**
 * Checks if a user has Admin or Owner role.
 * @param {string} uid - The user's ID.
 * @returns {boolean} True if user is Admin or Owner.
 */
function hasAdminAccess(uid) {
    // --- UPDATED to use list ---
    if (SUPER_ADMIN_UIDS.includes(uid)) return true; // Super admin always has access
    const roleData = allFirebaseRolesData.find(r => r.uid === uid);
    if (!roleData) return false;
    return roleData.role === ROLES.ADMIN || roleData.role === ROLES.OWNER;
}

/**
 * Gets the current role string for a user.
 * @param {string} uid - The user's ID.
 * @returns {string} The user's role.
 */
async function getCurrentUserRole(uid) {
    // --- UPDATED to use list ---
    if (SUPER_ADMIN_UIDS.includes(uid)) return ROLES.OWNER; // Super admin is always owner

    // This function might be called before the listener is ready,
    // so we check the local array first, but fall back to a direct fetch if needed.
    const roleData = allFirebaseRolesData.find(r => r.uid === uid);
    if (roleData) {
        return roleData.role;
    }

    // Fallback for the very first login, before listeners are set
    console.warn("getCurrentUserRole: Role not in local cache, fetching doc.");
    const roleRef = doc(db, "artifacts", appId, "public/data/user_roles", uid);

    try {
        const docSnap = await getDoc(roleRef);
        if (docSnap.exists()) {
            return docSnap.data().role;
        } else {
            return ROLES.PLAYER; // Default if no doc
        }
    } catch (error) {
        console.error("getCurrentUserRole: Error fetching doc:", error);
        return ROLES.PLAYER; // Default on error
    }
}