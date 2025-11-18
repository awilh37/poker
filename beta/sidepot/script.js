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
let loadTimestamp; // NEW: For chat message listeners
let groupMessageListeners = new Map(); // NEW: Stores chat listener unsubscribe functions

let allFirebaseUsersData = []; // Stores all user profile docs
let allFirebaseRolesData = []; // Stores all user role docs
let firestoreActiveSessions = []; // This will be populated by FIRESTORE
let firestoreGameRooms = []; // Stores game room docs
let firestoreMessages = []; // Stores messages
let currentJoinedRoomId = null; // Stores the ID of the room the player is in

// NEW: Dashboard Content
let currentNewsContent = ""; // Stores the raw markdown
let currentLinksData = []; // Stores the array of link objects

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
// NEW: Update Chips Modal
const updateChipsModal = document.getElementById('updateChipsModal');
// NEW: Set Order Modal
const setOrderModal = document.getElementById('setOrderModal');
const setOrderModalContent = document.getElementById('setOrderModalContent');

// NEW: Spectator List Modal
const spectatorListModal = document.getElementById('spectatorListModal');
const spectatorList = document.getElementById('spectatorList');
const closeSpectatorListModalButton = document.getElementById('closeSpectatorListModalButton');
const spectatorInfo = document.getElementById('spectatorInfo');
const spectatorCount = document.getElementById('spectatorCount');

// Buttons
const googleLoginButton = document.getElementById('googleLoginButton');
// REMOVED: messageBox
const loadingIndicator = document.getElementById('loadingIndicator');

// Main action buttons (These are now hidden, but clicked by menus)
const openAccountManagementButton = document.getElementById('openAccountManagementButton');
const viewUserDirectoryButton = document.getElementById('viewUserDirectoryButton');
const openAdminPanelButton = document.getElementById('openAdminPanelButton');
const joinGameButton = document.getElementById('joinGameButton');

// --- NEW Dashboard Elements ---
const editNewsButton = document.getElementById('editNewsButton');
const addLinkButton = document.getElementById('addLinkButton');
const newsContent = document.getElementById('newsContent');
const linksContent = document.getElementById('linksContent');

// NEW: Dashboard Modals
const editNewsModal = document.getElementById('editNewsModal');
const cancelEditNews = document.getElementById('cancelEditNews');
const saveEditNews = document.getElementById('saveEditNews');
const newsMarkdownInput = document.getElementById('newsMarkdownInput');

const editLinkModal = document.getElementById('editLinkModal');
const cancelEditLink = document.getElementById('cancelEditLink');
const saveEditLink = document.getElementById('saveEditLink');
const deleteLinkButton = document.getElementById('deleteLinkButton');
const editLinkId = document.getElementById('editLinkId');
const linkLabel = document.getElementById('linkLabel');
const linkTextInput = document.getElementById('linkTextInput');
const linkUrlInput = document.getElementById('linkUrlInput');
const linkColorInput = document.getElementById('linkColorInput');
// --- END NEW Dashboard Elements ---


// --- NEW Header & Sidebar Elements ---
const headerTitle = document.getElementById('headerTitle');
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
    db = getFirestore(app, 'sidepot');
    console.log("Firebase initialized successfully (Firestore-only).");
} catch (e) {
    console.error("Firebase initialization failed:", e);
    showNotification("Error: Could not connect to the application services. Please refresh.", "error", { autoClose: 0 });
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
            showNotification("Your previous session was cleared. Please log in again.", "info");
            return; // Stop further processing
        }
        // --- END NEW ---

        if (user) {
            currentUserId = user.uid;
            firebaseAuthReady = true;

            // NEW: Set timestamp for message listeners
            // This ensures we only get *new* messages after login
            loadTimestamp = Timestamp.now();

            if (!isLoggingOut && !dataLoadedAndListenersSetup) {
                console.log("onAuthStateChanged: User present, triggering handleLoginSuccess.");
                await handleLoginSuccess(user);
                // MOVED: Admin link visibility is now handled in handleLoginSuccess
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
                showNotification("You have been successfully logged out.", "success");
                // MOVED: Admin link visibility is now handled in handleLogout
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
                // MOVED: Admin link visibility is now handled in handleLogout
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

        // --- PATHS FIXED ---
        const activeSessionRef = doc(db, "artifacts", appId, "public", "data", "active_sessions", currentUserId);

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
        // --- PATHS FIXED ---
        const activeSessionRef = doc(db, "artifacts", appId, "public", "data", "active_sessions", currentUserId);
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
            showNotification(`Google Sign-In Error: ${error.message}`, "error");
            isNewLogin = false; // <-- Reset on error
        }
    });

    // --- Main Menu Navigation ---
    // These buttons are now hidden, but their listeners are
    // triggered by the sidebar/dropdown links.
    openAccountManagementButton.addEventListener('click', () => {
        displayNameInput.value = auth.currentUser.displayName || '';
        showPanel(accountManagementPanel);
    });

    viewUserDirectoryButton.addEventListener('click', () => {
        renderUserDirectoryTable();
        showPanel(userDirectoryPanel);
    });

    openAdminPanelButton.addEventListener('click', () => showPanel(adminPanel));

    headerTitle.addEventListener('click', () => {
        if (currentUserId) {
            showPanel(mainActionButtons);
        }
    });

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
            showNotification("Display name must be at least 3 characters.", "error");
            return;
        }
        try {
            // Update Firebase Auth profile
            await updateProfile(auth.currentUser, { displayName: newName });

            // --- PATHS FIXED ---
            const userProfileRef = doc(db, "artifacts", appId, "public", "data", "user_profiles", currentUserId);
            await updateDoc(userProfileRef, { display_name: newName });

            showNotification("Display name updated successfully!", "success");
            showPanel(mainActionButtons);
        } catch (error) {
            console.error("Error updating display name:", error);
            showNotification(`Error: ${error.message}`, "error");
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
            showNotification("Please enter a room name.", "error");
            return;
        }
        try {
            // --- PATHS FIXED ---
            const roomCollectionRef = collection(db, "artifacts", appId, "public", "data", "game_rooms");
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
            showNotification(`Room '${name}' created!`, "success");
            newRoomName.value = '';
            // The onSnapshot listener will auto-update the list
        } catch (error) {
            console.error("Error creating game room:", error);
            showNotification(`Error: ${error.message}`, "error");
        }
    });

    // Create Group
    finalizeGroupButton.addEventListener('click', async () => {
        const groupName = groupNameInput.value.trim();
        if (!groupName) {
            showNotification("Please enter a group name.", "error");
            return;
        }
        const selectedUsers = Array.from(groupUserChecklist.querySelectorAll('input:checked'))
            .map(input => input.value);

        if (selectedUsers.length < 1) { // Need at least one other member
            showNotification("Please select at least one member for the group.", "error");
            return;
        }

        // Add the creator to the group
        if (!selectedUsers.includes(currentUserId)) {
            selectedUsers.push(currentUserId);
        }

        try {
            // --- PATHS FIXED ---
            const groupCollectionRef = collection(db, "artifacts", appId, "public", "data", "chat_groups");
            await addDoc(groupCollectionRef, {
                name: groupName,
                members: selectedUsers,
                createdAt: serverTimestamp(),
                createdBy: currentUserId
            });
            showNotification(`Group '${groupName}' created!`, "success");
            groupNameInput.value = '';
            showPanel(adminPanel);
        } catch (error) {
            console.error("Error creating group:", error);
            showNotification(`Error: ${error.message}`, "error");
        }
    });

    // Group Chat
    sendGroupMessageButton.addEventListener('click', sendGroupMessage);
    groupMessageInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') sendGroupMessage();
    });
    closeGroupChatButton.addEventListener('click', () => groupChatModal.classList.add('hidden'));

    // --- *** FIX ***: Set Order Modal Button Listeners ---
    // These were incorrectly placed inside the gameRoomViewPanel delegation.
    // We attach them directly to the modal's buttons.
    const setOrderSaveButton = document.getElementById('saveSetOrder');
    const setOrderCancelButton = document.getElementById('cancelSetOrder');

    if (setOrderSaveButton) {
        setOrderSaveButton.addEventListener('click', () => {
            // We get the roomId from the global variable
            if (currentJoinedRoomId) {
                handleSavePlayerOrder(currentJoinedRoomId);
            } else {
                console.warn("Save Order clicked, but no room ID is set.");
            }
        });
    }

    if (setOrderCancelButton) {
        setOrderCancelButton.addEventListener('click', () => {
            if (setOrderModal) {
                setOrderModal.classList.add('hidden');
            }
        });
    }
    // --- *** END FIX *** ---

    // --- NEW: Attach all delegated game room listeners ---
    attachGameRoomListeners();

    // --- NEW: Dashboard Admin Listeners ---
    if (editNewsButton) {
        editNewsButton.addEventListener('click', openEditNewsModal);
    }
    if (cancelEditNews) {
        cancelEditNews.addEventListener('click', () => editNewsModal.classList.add('hidden'));
    }
    if (saveEditNews) {
        saveEditNews.addEventListener('click', handleSaveNews);
    }

    if (addLinkButton) {
        addLinkButton.addEventListener('click', () => openEditLinkModal(null));
    }
    if (cancelEditLink) {
        cancelEditLink.addEventListener('click', () => editLinkModal.classList.add('hidden'));
    }
    if (saveEditLink) {
        saveEditLink.addEventListener('click', handleSaveLink);
    }
    if (deleteLinkButton) {
        deleteLinkButton.addEventListener('click', handleDeleteLink);
    }

    // Delegated listener for editing existing links
    if (linksContent) {
        linksContent.addEventListener('click', (e) => {
            const editButton = e.target.closest('.edit-link-btn');
            if (editButton) {
                const linkId = editButton.dataset.linkId;
                openEditLinkModal(linkId);
            }
        });
    }
    // --- END NEW: Dashboard Admin Listeners ---

}); // End DOMContentLoaded


/**
 * Attaches all event listeners for the game room panel.
 * Uses event delegation to avoid listeners being lost on re-render.
 */
function attachGameRoomListeners() {
    gameRoomViewPanel.addEventListener('click', (e) => {
        // Get the current room ID from the global variable
        const roomId = currentJoinedRoomId;
        if (!roomId) return; // Don't do anything if not in a room

        const target = e.target;
        const targetId = target.id;
        const targetClassList = target.classList;

        // --- Player Actions ---
        if (targetId === 'placeBetButton') {
            const amountInput = gameRoomContent.querySelector('#betAmountInput');
            const amount = amountInput ? parseInt(amountInput.value, 10) : 0;
            handlePlaceBet(roomId, amount);
        } else if (targetId === 'callButton') {
            handleCallBet(roomId);
        } else if (targetId === 'foldButton') {
            handleFold(roomId);
        } else if (targetId === 'allInButton') {
            handleAllIn(roomId);
        }

        // --- Admin Panel Actions ---
        else if (targetId === 'adminRoomResetButton') {
            adminRoomReset(roomId);
        } else if (targetId === 'adminUpdateChipsButton') {
            toggleUpdateChipsPanel(roomId, true);
        } else if (targetId === 'adminPostBlindsButton') {
            adminPostBlinds(roomId);
        }
        // NEW: Set Order Button
        else if (targetId === 'adminSetOrderButton') {
            openSetOrderModal(roomId);
        }

        // --- Update Chips Modal Actions ---
        else if (targetId === 'cancelChipUpdate') {
            toggleUpdateChipsPanel(roomId, false);
        } else if (targetId === 'submitChipUpdate') {
            handleSubmitChipUpdate(roomId);
        }

        // --- *** FIX ***: Removed Set Order Modal Actions ---
        // The listeners for 'cancelSetOrder' and 'saveSetOrder' have been
        // moved to DOMContentLoaded for direct attachment, as they are
        // outside this delegated listener's scope (gameRoomViewPanel).

        // --- Player Card Admin Menu ---
        else if (targetClassList.contains('player-admin-menu-btn')) {
            const uid = target.dataset.uid;
            const menu = gameRoomContent.querySelector(`#admin-menu-${uid}`);
            if (menu) {
                // Hide all other menus
                gameRoomContent.querySelectorAll('.player-admin-menu').forEach(m => {
                    if (m !== menu) m.classList.add('hidden');
                });
                // Toggle this one
                menu.classList.toggle('hidden');
            }
        } else if (targetClassList.contains('remove-player-btn')) {
            const player = allFirebaseUsersData.find(p => p.uid === target.dataset.uid);
            adminRemovePlayer(roomId, target.dataset.uid, formatDisplayName(player));
        } else if (targetClassList.contains('force-fold-btn')) {
            const player = allFirebaseUsersData.find(p => p.uid === target.dataset.uid);
            adminForceFoldPlayer(roomId, target.dataset.uid, formatDisplayName(player));
        } else if (targetClassList.contains('place-bet-for-player-btn')) {
            const player = allFirebaseUsersData.find(p => p.uid === target.dataset.uid);
            adminPlaceBetForPlayer(roomId, target.dataset.uid, formatDisplayName(player), player?.chip_count || 0);
        }

        // --- Click-away to close player menus ---
        else if (!target.closest('.player-admin-menu') && !target.classList.contains('player-admin-menu-btn')) {
            gameRoomContent.querySelectorAll('.player-admin-menu').forEach(menu => menu.classList.add('hidden'));
        }
    });

    // Also handle closing the modal if the overlay is clicked
    if (updateChipsModal) {
        updateChipsModal.addEventListener('click', (e) => {
            if (e.target === updateChipsModal) {
                toggleUpdateChipsPanel(null, false);
            }
        });
    }
    // NEW: Also handle closing the set order modal
    if (setOrderModal) {
        setOrderModal.addEventListener('click', (e) => {
            if (e.target === setOrderModal) {
                setOrderModal.classList.add('hidden');
            }
        });
    }
}

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

    // NEW: Set timestamp for message listeners
    loadTimestamp = Timestamp.now();

    try {
        // Setup profile first, as presence might need role data
        await setupUserProfile(user);

        // --- NEW PRESENCE (Firestore) ---
        // Write to Firestore active_sessions collection
        console.log("handleLoginSuccess: Setting up FIRESTORE presence for:", user.uid);
        // --- PATHS FIXED ---
        const activeSessionRef = doc(db, "artifacts", appId, "public", "data", "active_sessions", user.uid);

        // Get role *after* setupUserProfile has run
        const userRole = await getCurrentUserRole(user.uid); // Use async helper

        await setDoc(activeSessionRef, {
            email: user.email || 'N/A',
            role: userRole,
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

        // --- NEW: Consolidated Admin UI Logic ---
        if (hasAdminAccess(user.uid)) {
            // Main Menu button (hidden, for click() )
            openAdminPanelButton.classList.remove('hidden');
            // Dropdown link
            dropdownAdminLink.classList.remove('hidden');
            // Dashboard buttons
            if (editNewsButton) editNewsButton.classList.remove('hidden');
            if (addLinkButton) addLinkButton.classList.remove('hidden');
        } else {
            // Main Menu button (hidden)
            openAdminPanelButton.classList.add('hidden');
            // Dropdown link
            dropdownAdminLink.classList.add('hidden');
            // Dashboard buttons
            if (editNewsButton) editNewsButton.classList.add('hidden');
            if (addLinkButton) addLinkButton.classList.add('hidden');
        }
        // --- END NEW ---

        showPanel(mainActionButtons);
        showNotification(`Welcome, ${formatDisplayName(currentUserData)}!`, "success");

    } catch (error) {
        console.error("Error during login success handling:", error);
        showNotification(`Error on login: ${error.message}`, "error");
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
        // --- PATHS FIXED ---
        const activeSessionRef = doc(db, "artifacts", appId, "public", "data", "active_sessions", currentUserId);
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
        showNotification(`Logout Error: ${error.message}`, "error");
    }

    // --- NEW: Hide Admin UI on logout ---
    dropdownAdminLink.classList.add('hidden');
    if (editNewsButton) editNewsButton.classList.add('hidden');
    if (addLinkButton) addLinkButton.classList.add('hidden');
    // --- END NEW ---
}

/**
 * Checks or creates user profile and role in Firestore.
 */
async function setupUserProfile(user) {
    const { uid, email, displayName } = user;
    console.log("setupUserProfile: Setting up profile for:", uid);

    const batch = writeBatch(db);

    // --- PATHS FIXED ---
    // 1. User Role
    const roleRef = doc(db, "artifacts", appId, "public", "data", "user_roles", uid);
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
    const profileRef = doc(db, "artifacts", appId, "public", "data", "user_profiles", uid);
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
            chip_count: 0, // Starting chips
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
    // --- PATHS FIXED ---
    // Base collection paths
    const rolesCollectionRef = collection(db, "artifacts", appId, "public", "data", "user_roles");
    const profilesCollectionRef = collection(db, "artifacts", appId, "public", "data", "user_profiles");
    const gameRoomsCollectionRef = collection(db, "artifacts", appId, "public", "data", "game_rooms");
    const investmentsCollectionRef = collection(db, "artifacts", appId, "public", "data", "investments"); // Feature hidden
    const chatGroupsCollectionRef = collection(db, "artifacts", appId, "public", "data", "chat_groups");

    // --- NEW: Firestore active_sessions collection ---
    const activeSessionsCollectionRef = collection(db, "artifacts", appId, "public", "data", "active_sessions");

    // --- NEW: Dashboard Content Refs (PATHS FIXED) ---
    const newsDocRef = doc(db, "artifacts", appId, "public", "data", "site_content", "news");
    // --- FIX: Moved 'links' to be its own collection under 'data' ---
    const linksCollectionRef = collection(db, "artifacts", appId, "public", "data", "links");


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

    // --- NEW: Dashboard Content Listeners ---
    const newsPromise = new Promise((resolve, reject) => {
        onSnapshot(newsDocRef, (docSnap) => {
            console.log("Firestore: News snapshot received.");
            renderNewsContent(docSnap);
            resolve();
        }, (error) => { console.error("Firestore: Error listening to news:", error); reject(error); });
    });

    const linksPromise = new Promise((resolve, reject) => {
        onSnapshot(linksCollectionRef, (snapshot) => {
            console.log("Firestore: Links snapshot received.");
            renderLinksGrid(snapshot);
            resolve();
        }, (error) => { console.error("Firestore: Error listening to links:", error); reject(error); });
    });
    // --- END NEW ---


    // --- NEW: Start chat listeners ---
    listenForChatGroups();

    // --- Promise.all UPDATED ---
    return Promise.all([
        rolesPromise,
        profilesPromise,
        activeSessionsPromise,
        gameRoomsPromise,
        investmentsPromise,
        newsPromise, // NEW
        linksPromise  // NEW
    ]);
}

// --- NEW: Chat Notification Listeners ---

/**
 * Attaches listeners to all chat groups the user is a member of.
 * Listens for new messages and triggers notifications.
 */
function listenForChatGroups() {
    if (!db || !currentUserId || !loadTimestamp) return;

    console.log("Attaching chat group listeners...");
    // --- PATHS FIXED ---
    const q = query(collection(db, "artifacts", appId, "public", "data", "chat_groups"), where('members', 'array-contains', currentUserId));

    onSnapshot(q, (groupsSnapshot) => {
        groupsSnapshot.docChanges().forEach(async (change) => {
            const groupDoc = change.doc;
            const groupId = groupDoc.id;
            const groupData = groupDoc.data();
            const groupName = groupData.name;

            if (change.type === 'added') {
                if (groupMessageListeners.has(groupId)) return; // Already listening

                console.log(`Adding message listener for group: ${groupName}`);
                // --- PATHS FIXED ---
                const messagesRef = collection(db, "artifacts", appId, "public", "data", "chat_groups", groupId, "messages");
                // Listen for messages *after* the app loaded
                const messagesQuery = query(messagesRef, where('timestamp', '>', loadTimestamp));

                const unsubscribe = onSnapshot(messagesQuery, (messagesSnapshot) => {
                    handleNewMessages(messagesSnapshot, groupId, groupName, groupData);
                }, (error) => {
                    console.error(`Error listening to messages for group ${groupId}:`, error);
                });
                groupMessageListeners.set(groupId, unsubscribe);
            }

            if (change.type === 'removed') {
                console.log(`Removing message listener for group: ${groupName}`);
                const unsubscribe = groupMessageListeners.get(groupId);
                if (unsubscribe) {
                    unsubscribe();
                    groupMessageListeners.delete(groupId);
                }
            }
        });
    }, (error) => {
        console.error("Error listening to chat groups:", error);
    });
}

/**
 * Processes new messages from a snapshot and shows notifications.
 */
function handleNewMessages(messagesSnapshot, groupId, groupName, groupData) {
    messagesSnapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
            const msg = change.doc.data();
            if (!msg.timestamp) return; // Ignore malformed

            // Don't notify for own messages
            if (msg.senderId === currentUserId) return;

            // Don't notify if chat modal is already open to this group
            const modalIsOpen = !groupChatModal.classList.contains('hidden');
            const currentChatId = groupChatModal.dataset.currentGroupId;
            if (modalIsOpen && currentChatId === groupId) {
                return;
            }

            // Get sender name
            const sender = allFirebaseUsersData.find(u => u.uid === msg.senderId);
            const senderName = sender ? formatDisplayName(sender) : 'Someone';

            // For DMs, show the sender's name as the title
            let finalGroupName = groupName;
            if (groupData.isDM) {
                finalGroupName = `DM: ${senderName}`;
            }

            // Show notification
            showNotification(
                `<strong>${senderName}:</strong> ${msg.text.substring(0, 50)}...`,
                'chat',
                {
                    autoClose: 10000, // 10 seconds
                    onClick: () => {
                        // Click handler
                        openGroupChat(groupId, finalGroupName);
                        // The `openGroupChat` function already shows the modal.
                        // No need to call showPanel.
                    }
                }
            );
        }
    });
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
async function showUserInfoModal(uid) {
    const user = allFirebaseUsersData.find(u => u.uid === uid);
    if (!user) return;

    // --- UPDATED: Use helper ---
    const userRole = await getCurrentUserRole(uid);
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

// --- NEW: Dashboard Admin Functions ---

/** Renders the news content from Firestore data */
function renderNewsContent(docSnap) {
    if (docSnap && docSnap.exists()) {
        currentNewsContent = docSnap.data().markdown || "";
        // Simple newline-to-break-tag conversion
        newsContent.innerHTML = currentNewsContent.replace(/\n/g, '<br>');
    } else {
        currentNewsContent = "";
        newsContent.innerHTML = "<p>Welcome! No news has been set by an admin yet.</p>";
    }
}

/** Renders the links grid from Firestore data */
function renderLinksGrid(snapshot) {
    currentLinksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    linksContent.innerHTML = ''; // Clear old links

    const isAdmin = hasAdminAccess(currentUserId);

    if (currentLinksData.length === 0) {
        linksContent.innerHTML = '<p style="margin-top: 0;">No quick links have been added yet.</p>';
        return;
    }

    currentLinksData.forEach(link => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'dashboard-link-item';

        itemDiv.innerHTML = `
            <a href="${link.url}" class="btn ${link.color} btn-full" target="_blank" rel="noopener noreferrer">${link.text}</a>
            ${isAdmin ? `
                <button class="btn btn-icon btn-sm edit-link-btn" data-link-id="${link.id}" title="Edit Link">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 1.25rem; height: 1.25rem; margin: 0;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                </button>
            ` : ''}
        `;
        linksContent.appendChild(itemDiv);
    });
}

/** Opens the edit news modal */
function openEditNewsModal() {
    newsMarkdownInput.value = currentNewsContent;
    editNewsModal.classList.remove('hidden');
}

/** Saves the news content to Firestore */
async function handleSaveNews() {
    const newMarkdown = newsMarkdownInput.value;
    // --- PATHS FIXED ---
    const newsDocRef = doc(db, "artifacts", appId, "public", "data", "site_content", "news");
    try {
        await setDoc(newsDocRef, { markdown: newMarkdown });
        showNotification("News updated successfully!", "success");
        editNewsModal.classList.add('hidden');
    } catch (error) {
        console.error("Error saving news:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
}

/** Opens the add/edit link modal */
function openEditLinkModal(linkId) {
    if (linkId) {
        // Edit existing link
        const link = currentLinksData.find(l => l.id === linkId);
        if (!link) return;

        linkLabel.textContent = 'Edit Link';
        editLinkId.value = linkId;
        linkTextInput.value = link.text;
        linkUrlInput.value = link.url;
        linkColorInput.value = link.color;
        deleteLinkButton.classList.remove('hidden');
    } else {
        // Add new link
        linkLabel.textContent = 'Add New Link';
        editLinkId.value = '';
        linkTextInput.value = '';
        linkUrlInput.value = '';
        linkColorInput.value = 'btn-blue';
        deleteLinkButton.classList.add('hidden');
    }
    editLinkModal.classList.remove('hidden');
}

/** Saves the link (new or update) to Firestore */
async function handleSaveLink() {
    const linkId = editLinkId.value;
    const linkData = {
        text: linkTextInput.value.trim(),
        url: linkUrlInput.value.trim(),
        color: linkColorInput.value
    };

    if (!linkData.text || !linkData.url) {
        return showNotification("Please fill out both text and URL.", "error");
    }

    try {
        if (linkId) {
            // Update existing
            // --- PATHS FIXED ---
            const linkDocRef = doc(db, "artifacts", appId, "public", "data", "links", linkId);
            await updateDoc(linkDocRef, linkData);
        } else {
            // Add new
            // --- PATHS FIXED ---
            const linksCollectionRef = collection(db, "artifacts", appId, "public", "data", "links");
            await addDoc(linksCollectionRef, linkData);
        }
        showNotification("Link saved successfully!", "success");
        editLinkModal.classList.add('hidden');
    } catch (error) {
        console.error("Error saving link:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
}

/** Deletes a link from Firestore */
async function handleDeleteLink() {
    const linkId = editLinkId.value;
    if (!linkId) return;

    // We can't use a nice modal, so we'll just log it for now
    console.log(`Asking to delete link ${linkId}. In a real app, use a modal!`);

    try {
        // --- PATHS FIXED ---
        const linkDocRef = doc(db, "artifacts", appId, "public", "data", "links", linkId);
        await deleteDoc(linkDocRef);
        showNotification("Link deleted successfully.", "success");
        editLinkModal.classList.add('hidden');
    } catch (error) {
        console.error("Error deleting link:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
}

// --- END NEW: Dashboard Admin Functions ---


// --- Admin: User Management Functions ---

/** Renders the table in the User Management panel */
async function renderUserRolesTable() {
    if (!userRolesTable) return;

    // Combine data: profiles, roles, and online status
    const combinedDataPromises = allFirebaseUsersData.map(async (user) => {
        const role = await getCurrentUserRole(user.uid); // Use async helper
        const session = firestoreActiveSessions.find(s => s.id === user.uid);
        return {
            ...user,
            role: role,
            session: session
        };
    });

    const combinedData = await Promise.all(combinedDataPromises);

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
        showNotification("Invalid chip count. Must be a positive number.", "error");
        return;
    }

    try {
        const batch = writeBatch(db);

        // --- PATHS FIXED ---
        // Update Role
        const roleRef = doc(db, "artifacts", appId, "public", "data", "user_roles", uid);
        batch.update(roleRef, { role: newRole });

        // Update Profile (Chips)
        const profileRef = doc(db, "artifacts", appId, "public", "data", "user_profiles", uid);
        batch.update(profileRef, { chip_count: newChips });

        await batch.commit();
        showNotification("User updated successfully!", "success");
    } catch (error) {
        console.error("Error updating user:", error);
        showNotification(`Error: ${error.message}`, "error");
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
        // --- PATHS FIXED ---
        const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);
        await deleteDoc(roomRef);
        showNotification("Room deleted successfully.", "success");
    } catch (error) {
        console.error("Error deleting room:", error);
        showNotification(`Error: ${error.message}`, "error");
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
        showNotification("Room not found.", "error");
        return;
    }

    // --- UPDATED Data Structure ---
    // Add player to room's player list (array of UIDs)
    // --- PATHS FIXED ---
    const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);

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

        // --- PATHS FIXED ---
        // Set user's current room
        const profileRef = doc(db, "artifacts", appId, "public", "data", "user_profiles", currentUserId);
        await updateDoc(profileRef, { current_room: roomId });

        currentJoinedRoomId = roomId;
        renderGameRoomView(roomId);
        showPanel(gameRoomViewPanel);
    } catch (error) {
        console.error("Error joining room:", error);
        showNotification(`Error joining room: ${error.message}`, "error");
    }
}

/** Joins a game room as a spectator */
async function spectateGameRoom(roomId) {
    console.log(`User ${currentUserId} attempting to spectate room ${roomId}`);
    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room) {
        showNotification("Room not found.", "error");
        return;
    }

    const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);
    try {
        await updateDoc(roomRef, {
            spectators: arrayUnion(currentUserId)
        });

        const profileRef = doc(db, "artifacts", appId, "public", "data", "user_profiles", currentUserId);
        await updateDoc(profileRef, { current_room: roomId });

        currentJoinedRoomId = roomId;
        renderGameRoomView(roomId);
        showPanel(gameRoomViewPanel);
    } catch (error) {
        console.error("Error spectating room:", error);
        showNotification(`Error spectating room: ${error.message}`, "error");
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
        // --- PATHS FIXED ---
        const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);

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

            // NEW: Remove from spectators array
            const newSpectators = (roomData.spectators || []).filter(uid => uid !== currentUserId);

            // Remove from gameState maps
            const newGameState = { ...roomData.gameState };
            if (newGameState.bets) delete newGameState.bets[currentUserId];
            if (newGameState.status) delete newGameState.status[currentUserId];

            transaction.update(roomRef, {
                players: newPlayers,
                spectators: newSpectators,
                gameState: newGameState
            });
        });

        // --- PATHS FIXED ---
        // Clear user's current room
        const profileRef = doc(db, "artifacts", appId, "public", "data", "user_profiles", currentUserId);
        await updateDoc(profileRef, { current_room: null });

        currentJoinedRoomId = null;
        // --- UPDATED: Go back to lobby ---
        showPanel(playerJoinRoomPanel);
        renderAvailableRoomsList(); // Refresh lobby list

    } catch (error) {
        console.error("Error leaving room:", error);
        showNotification(`Error leaving room: ${error.message}`, "error");
    }
}

/**
 * Removes a user as a spectator from a room.
 * This is a background task when a spectator navigates away.
 */
async function removeSpectator(roomId, userId) {
    console.log(`Auto-removing spectator ${userId} from room ${roomId}`);
    try {
        const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);
        const profileRef = doc(db, "artifacts", appId, "public", "data", "user_profiles", userId);

        // Use a batch to perform both updates atomically
        const batch = writeBatch(db);

        batch.update(roomRef, {
            spectators: arrayRemove(userId)
        });
        batch.update(profileRef, {
            current_room: null
        });

        await batch.commit();
        console.log(`Spectator ${userId} removed successfully.`);
    } catch (error) {
        console.error(`Error auto-removing spectator ${userId}:`, error);
        // No user-facing notification needed for this background task
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

        const spectateBtn = document.createElement('button');
        spectateBtn.className = 'btn btn-gray btn-sm';
        spectateBtn.textContent = 'Spectate';
        spectateBtn.onclick = () => spectateGameRoom(room.id);

        // Check if user is already in *any* room
        const userInARoom = allFirebaseUsersData.find(u => u.uid === currentUserId)?.current_room;
        if (userInARoom) {
            if (userInARoom === room.id) {
                joinBtn.textContent = 'Re-enter';
                joinBtn.className = 'btn btn-blue btn-sm';
                spectateBtn.disabled = true;
            } else {
                joinBtn.disabled = true;
                joinBtn.title = "You are already in another room";
                spectateBtn.disabled = true;
                spectateBtn.title = "You are already in another room";
            }
        }

        actionsDiv.appendChild(joinBtn);
        actionsDiv.appendChild(spectateBtn);
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
        showNotification("That room no longer exists.", "error");
        renderAvailableRoomsList();
        return;
    }

    // Check if user is already in another room
    const userProfile = allFirebaseUsersData.find(u => u.uid === currentUserId);
    if (userProfile.current_room && userProfile.current_room !== roomId) {
        showNotification("You must leave your current room before joining another.", "error");
        return;
    }

    console.log(`User ${currentUserId} joining room ${roomId}`);
    // --- PATHS FIXED ---
    const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);
    const profileRef = doc(db, "artifacts", appId, "public", "data", "user_profiles", currentUserId);

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
        showNotification(`Error joining room: ${error.message}`, "error");
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
    const roomSpectators = room.spectators || [];
    const roomBets = room.gameState.bets || {};
    const roomStatus = room.gameState.status || {};

    const currentUserProfile = allFirebaseUsersData.find(p => p.uid === currentUserId);
    const currentUserChips = currentUserProfile?.chip_count || 0;
    const currentUserIsAdmin = hasAdminAccess(currentUserId);
    const currentUserIsSpectator = roomSpectators.includes(currentUserId);

    // Update spectator count
    spectatorCount.textContent = roomSpectators.length;

    // Populate and manage spectator modal
    spectatorList.innerHTML = '';
    if (roomSpectators.length > 0) {
        roomSpectators.forEach(uid => {
            const spectator = allFirebaseUsersData.find(u => u.uid === uid);
            const li = document.createElement('div');
            li.className = 'spectator-list-item';
            li.textContent = spectator ? formatDisplayName(spectator) : 'Loading...';
            spectatorList.appendChild(li);
        });
    } else {
        spectatorList.innerHTML = '<p>No spectators yet.</p>';
    }

    // Attach listener to show/hide the modal
    spectatorInfo.onclick = () => spectatorListModal.classList.remove('hidden');
    closeSpectatorListModalButton.onclick = () => spectatorListModal.classList.add('hidden');
    spectatorListModal.onclick = (e) => {
        if (e.target === spectatorListModal) {
            spectatorListModal.classList.add('hidden');
        }
    };


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
                    <!-- NEW: Set Order Button -->
                    <button id="adminSetOrderButton" class="btn btn-blue btn-sm" style="margin-top: 0.5rem;">Set Player Order</button>
                    <!-- NEW: Post Blinds Button -->
                    <button id="adminPostBlindsButton" class="btn btn-purple btn-sm" style="margin-top: 0.5rem;">Post Blinds</button>
                </div>
            </div>
            <!-- REMOVED: Hidden Update Chips Panel HTML -->
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
    const canPlayerAct = !currentUserIsSpectator && currentUserFinalStatus !== 'folded' && currentUserFinalStatus !== 'all-in';

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
                <p class="text-center font-semibold text-lg">${currentUserIsSpectator ? 'Spectating...' : `You are ${currentUserFinalStatus}`}</p>
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
    // ALL LISTENERS REMOVED (Moved to attachGameRoomListeners)
}

/** (Admin) Posts blinds for SB/BB and rotates the dealer button */
async function adminPostBlinds(roomId) {
    if (!hasAdminAccess(currentUserId)) return showNotification("Permission denied.", "error");

    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room || !room.players || room.players.length < 2) {
        return showNotification("Not enough players to post blinds.", "info");
    }

    console.log("Admin posting blinds...");
    // --- PATHS FIXED ---
    const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);
    const players = room.players;
    const pCount = players.length;
    const currentDealerPos = room.dealerPosition || 0;

    // Determine SB and BB
    const sbIndex = (currentDealerPos + 2) % pCount;
    const bbIndex = (currentDealerPos + 3) % pCount;
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
        showNotification("Blinds posted and dealer button rotated.", "success");
    } catch (error) {
        console.error("Error posting blinds:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
}

/** (Admin) Opens the modal to set player order */
function openSetOrderModal(roomId) {
    if (!hasAdminAccess(currentUserId)) return;
    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room) return;

    const listEl = setOrderModal.querySelector('#setOrderPlayerList');
    listEl.innerHTML = ''; // Clear old list

    // Use playerOrder if it exists, otherwise use the current players array
    const playerOrder = room.playerOrder && room.playerOrder.length === room.players.length ?
        room.playerOrder :
        [...room.players];

    playerOrder.forEach((uid, index) => {
        const player = allFirebaseUsersData.find(u => u.uid === uid);
        const item = document.createElement('div');
        item.className = 'order-item';
        item.setAttribute('draggable', 'true');
        item.setAttribute('data-uid', uid);
        item.innerHTML = `
            <span class="drag-handle">☰</span>
            <span>${formatDisplayName(player)}</span>
        `;
        listEl.appendChild(item);
    });

    // Add drag/drop listeners
    let draggedItem = null;

    // Use named functions for adding/removing listeners
    function handleDragStart(e) {
        draggedItem = e.target;
        setTimeout(() => e.target.classList.add('dragging'), 0);
    }

    function handleDragEnd() {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
        }
        draggedItem = null;
    }

    function handleDragOver(e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(listEl, e.clientY);
        const dragging = listEl.querySelector('.dragging');
        if (dragging) {
            if (afterElement == null) {
                listEl.appendChild(dragging);
            } else {
                listEl.insertBefore(dragging, afterElement);
            }
        }
    }

    // Clean up old listeners before adding new ones
    listEl.removeEventListener('dragstart', handleDragStart);
    listEl.removeEventListener('dragend', handleDragEnd);
    listEl.removeEventListener('dragover', handleDragOver);

    listEl.addEventListener('dragstart', handleDragStart);
    listEl.addEventListener('dragend', handleDragEnd);
    listEl.addEventListener('dragover', handleDragOver);

    // --- NEW: Touch Event Listeners for Mobile ---
    let touchY = 0;

    function handleTouchStart(e) {
        // Find the .order-item element from the touch target
        const targetItem = e.target.closest('.order-item');
        if (!targetItem) {
            draggedItem = null;
            return;
        }
        draggedItem = targetItem;
        touchY = e.touches[0].clientY;
        setTimeout(() => {
            if (draggedItem) draggedItem.classList.add('dragging');
        }, 0);
    }

    function handleTouchMove(e) {
        if (!draggedItem) return;
        e.preventDefault(); // Prevent page scrolling
        touchY = e.touches[0].clientY;
        const afterElement = getDragAfterElement(listEl, touchY);
        const dragging = listEl.querySelector('.dragging');
        if (dragging) {
            if (afterElement == null) {
                listEl.appendChild(dragging);
            } else {
                listEl.insertBefore(dragging, afterElement);
            }
        }
    }

    function handleTouchEnd() {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
        }
        draggedItem = null;
    }

    // Clean up old touch listeners
    listEl.removeEventListener('touchstart', handleTouchStart);
    listEl.removeEventListener('touchmove', handleTouchMove);
    listEl.removeEventListener('touchend', handleTouchEnd);

    // Add new touch listeners
    listEl.addEventListener('touchstart', handleTouchStart, { passive: false });
    listEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    listEl.addEventListener('touchend', handleTouchEnd, { passive: false });
    // --- END NEW: Touch Events ---


    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.order-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    setOrderModal.classList.remove('hidden');
}

/** (Admin) Saves the new player order from the modal */
async function handleSavePlayerOrder(roomId) {
    if (!hasAdminAccess(currentUserId)) return;
    const listEl = setOrderModal.querySelector('#setOrderPlayerList');
    const newOrder = [...listEl.querySelectorAll('.order-item')].map(item => item.dataset.uid);

    if (newOrder.length === 0) return;

    // --- NEW: Create reset state based on the new order ---
    const newBets = {};
    const newStatus = {};
    newOrder.forEach(uid => {
        newBets[uid] = 0;
        newStatus[uid] = 'pending';
    });

    // --- PATHS FIXED ---
    const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);
    try {
        // --- UPDATED: Also reset the room and update the main 'players' array ---
        await updateDoc(roomRef, {
            playerOrder: newOrder,
            players: newOrder, // <-- Syncs the players array to the new order
            dealerPosition: 0, // <-- Sets dealer to the top player
            "gameState.bets": newBets, // <-- Resets bets
            "gameState.status": newStatus // <-- Resets statuses
        });
        showNotification("Player order saved and room has been reset.", "success");
        setOrderModal.classList.add('hidden');
    } catch (error) {
        console.error("Error saving player order:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
}

/** (Admin) Removes a player from the game room */
async function adminRemovePlayer(roomId, targetPlayerId, targetPlayerName) {
    if (!hasAdminAccess(currentUserId)) return showNotification("Permission denied.", "error");
    if (targetPlayerId === currentUserId) return showNotification("Cannot remove self.", "error");

    console.log(`Admin removing ${targetPlayerName} from room ${roomId}`);

    // --- PATHS FIXED ---
    const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);
    const profileRef = doc(db, "artifacts", appId, "public", "data", "user_profiles", targetPlayerId);

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
        showNotification(`${targetPlayerName} has been removed from the room.`, "success");
    } catch (error) {
        console.error("Error removing player:", error);
        showNotification(`Error removing player: ${error.message}`, "error");
    }
}

/** (Admin) Forces a player to fold */
async function adminForceFoldPlayer(roomId, targetPlayerId, targetPlayerName) {
    if (!hasAdminAccess(currentUserId)) return showNotification("Permission denied.", "error");
    console.log(`Admin forcing fold for ${targetPlayerName}`);
    // --- PATHS FIXED ---
    const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);
    try {
        await updateDoc(roomRef, {
            [`gameState.status.${targetPlayerId}`]: 'folded'
        });
        showNotification(`${targetPlayerName} has been folded.`, "success");
    } catch (error) {
        console.error("Error forcing fold:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
}

/** (Admin) Places a bet for a player */
async function adminPlaceBetForPlayer(roomId, targetPlayerId, targetPlayerName, playerChips) {
    if (!hasAdminAccess(currentUserId)) return showNotification("Permission denied.", "error");

    const betAmountStr = prompt(`Enter bet for ${targetPlayerName} (has ${playerChips} chips):`);
    if (!betAmountStr) return; // User cancelled

    const betAmount = parseInt(betAmountStr, 10);
    if (isNaN(betAmount) || betAmount < 0) return showNotification("Invalid amount.", "error");
    if (betAmount > playerChips) return showNotification("Amount exceeds player's chips.", "error");

    console.log(`Admin betting ${betAmount} for ${targetPlayerName}`);
    // --- PATHS FIXED ---
    const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);
    try {
        const newStatus = (betAmount === playerChips) ? 'all-in' : 'ready';
        await updateDoc(roomRef, {
            [`gameState.bets.${targetPlayerId}`]: betAmount,
            [`gameState.status.${targetPlayerId}`]: newStatus
        });
        showNotification(`Bet of ${betAmount} placed for ${targetPlayerName}.`, "success");
    } catch (error) {
        console.error("Error placing bet for player:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
}

/** (Admin) Resets all bets and statuses in the room */
async function adminRoomReset(roomId) {
    if (!hasAdminAccess(currentUserId)) return showNotification("Permission denied.", "error");
    console.log(`Admin resetting room ${roomId}`);

    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room) return showNotification("Room not found.", "error");

    // --- PATHS FIXED ---
    const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);
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
        showNotification("Room has been reset.", "success");
    } catch (error) {
        console.error("Error resetting room:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
}

/** (Admin) Toggles the Update Chips panel */
function toggleUpdateChipsPanel(roomId, show) {
    // UPDATED: Target the modal instead of an inline panel
    if (!updateChipsModal) return;

    if (show) {
        populateUpdateChipsPanel(roomId);
        updateChipsModal.classList.remove('hidden');
    } else {
        updateChipsModal.classList.add('hidden');
    }
}

/** (Admin) Populates the Update Chips panel with players */
function populateUpdateChipsPanel(roomId) {
    // UPDATED: Target the list inside the modal
    const listEl = updateChipsModal.querySelector('#updateChipsPlayerList');
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
    if (!room) return showNotification("Room data not found.", "error");

    // UPDATED: Target the list inside the modal
    const listEl = updateChipsModal.querySelector('#updateChipsPlayerList');
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
        // --- PATHS FIXED ---
        const playerProfileRef = doc(db, "artifacts", appId, "public", "data", "user_profiles", player.id);
        // Player's new chips = current chips - their bet + their winnings
        const newChipCount = player.chips - player.bet + player.winnings;
        batch.update(playerProfileRef, { chip_count: newChipCount });
    });

    try {
        await batch.commit();
        showNotification("Chips updated and pot distributed!", "success");
        adminRoomReset(roomId); // Reset the room for the next hand
        toggleUpdateChipsPanel(roomId, false); // Hide the panel
    } catch (error) {
        console.error("Error updating chips:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
}

/** (Player) Handles placing a bet or raise */
async function handlePlaceBet(roomId, amount) {
    if (isNaN(amount) || amount <= 0) return showNotification("Invalid bet amount.", "error");

    const playerProfile = allFirebaseUsersData.find(p => p.uid === currentUserId);
    const playerChips = playerProfile?.chip_count || 0;
    if (amount > playerChips) return showNotification("You don't have enough chips.", "error");

    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room) return showNotification("Room not found.", "error");

    // --- PATHS FIXED ---
    const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);
    const newStatus = (amount === playerChips) ? 'all-in' : 'ready';

    try {
        await updateDoc(roomRef, {
            [`gameState.bets.${currentUserId}`]: amount,
            [`gameState.status.${currentUserId}`]: newStatus
        });
        showNotification(`You bet ${amount}.`, "success");
    } catch (error) {
        console.error("Error placing bet:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
}

/** (Player) Handles calling the current highest bet */
async function handleCallBet(roomId) {
    const playerProfile = allFirebaseUsersData.find(p => p.uid === currentUserId);
    const playerChips = playerProfile?.chip_count || 0;
    const room = firestoreGameRooms.find(r => r.id === roomId);
    if (!room) return showNotification("Room not found.", "error");

    const roomBets = room.gameState.bets || {};
    const highestBet = Object.values(roomBets).reduce((max, bet) => Math.max(max, bet), 0);
    const currentUserBet = roomBets[currentUserId] || 0;
    const amountToCall = highestBet - currentUserBet;

    if (amountToCall === 0) { // This is a "Check"
        showNotification("You checked.", "success");
        return; // No DB update needed if status is already 'ready'
    }

    if (playerChips < amountToCall) { // Not enough chips to call, go all-in
        return handleAllIn(roomId);
    }

    // --- PATHS FIXED ---
    const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);
    try {
        await updateDoc(roomRef, {
            [`gameState.bets.${currentUserId}`]: highestBet, // Call by matching the highest bet
            [`gameState.status.${currentUserId}`]: 'ready'
        });
        showNotification(`You called ${highestBet}.`, "success");
    } catch (error) {
        console.error("Error calling bet:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
}

/** (Player) Handles folding the hand */
async function handleFold(roomId) {
    // --- PATHS FIXED ---
    const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);
    try {
        await updateDoc(roomRef, {
            [`gameState.status.${currentUserId}`]: 'folded'
        });
        showNotification("You folded.", "success");
    } catch (error) {
        console.error("Error folding:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
}

/** (Player) Handles going all-in */
async function handleAllIn(roomId) {
    const playerProfile = allFirebaseUsersData.find(p => p.uid === currentUserId);
    const playerChips = playerProfile?.chip_count || 0;

    // --- PATHS FIXED ---
    const roomRef = doc(db, "artifacts", appId, "public", "data", "game_rooms", roomId);
    try {
        await updateDoc(roomRef, {
            [`gameState.bets.${currentUserId}`]: playerChips, // Bet all chips
            [`gameState.status.${currentUserId}`]: 'all-in'
        });
        showNotification(`You are All-In with ${playerChips}!`, "success");
    } catch (error) {
        console.error("Error going all-in:", error);
        showNotification(`Error: ${error.message}`, "error");
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
        // --- PATHS FIXED ---
        const groupRef = doc(db, "artifacts", appId, "public", "data", "chat_groups", groupId);
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
        showNotification(`Error: ${error.message}`, "error");
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
    // --- PATHS FIXED ---
    const messagesCollectionRef = collection(db, "artifacts", appId, "public", "data", "chat_groups", groupId, "messages");
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

    // --- PATHS FIXED ---
    const messagesCollectionRef = collection(db, "artifacts", appId, "public", "data", "chat_groups", groupId, "messages");

    try {
        await addDoc(messagesCollectionRef, {
            text: text,
            senderId: currentUserId,
            timestamp: serverTimestamp()
        });
        groupMessageInput.value = ''; // Clear input
    } catch (error) {
        console.error("Error sending message:", error);
        showNotification("Error sending message.", "error");
    }
}


// --- Utility & UI Functions ---

/**
 * Checks and shows the "re-join" notification if needed.
 */
function checkAndShowRejoinNotification() {
    const currentUserProfile = allFirebaseUsersData.find(u => u.uid === currentUserId);
    const reJoinNotification = document.querySelector('.rejoin-notification');
    const room = firestoreGameRooms.find(r => r.id === currentUserProfile?.current_room);
    const isSpectator = room?.spectators?.includes(currentUserId);

    if (currentUserProfile && currentUserProfile.current_room && gameRoomViewPanel.classList.contains('hidden') && !isSpectator) {
        if (!reJoinNotification) {
            const roomName = room ? room.name : 'a room';
            showNotification(
                `You are still in the room "${roomName}". Click to re-join.`,
                'info',
                {
                    autoClose: 0,
                    customClass: 'rejoin-notification',
                    onClick: () => {
                        joinGameRoom(currentUserProfile.current_room);
                    }
                }
            );
        }
    } else {
        if (reJoinNotification) {
            reJoinNotification.remove();
        }
    }
}

/**
 * Shows a specific panel and hides all others.
 * @param {HTMLElement} panelToShow - The DOM element of the panel to show.
 */
function showPanel(panelToShow) {
    // --- NEW: Auto-remove spectator on navigation ---
    // Check if the user is a spectator and is navigating *away* from the game room
    const currentUserProfile = allFirebaseUsersData.find(u => u.uid === currentUserId);
    if (currentUserProfile && currentUserProfile.current_room) {
        const room = firestoreGameRooms.find(r => r.id === currentUserProfile.current_room);
        const isSpectator = room?.spectators?.includes(currentUserId);
        const isLeavingGameView = !gameRoomViewPanel.classList.contains('hidden') && panelToShow !== gameRoomViewPanel;

        if (isSpectator && isLeavingGameView) {
            // Call the function but don't wait for it to complete
            removeSpectator(currentUserProfile.current_room, currentUserId);
        }
    }
    // --- END NEW ---


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

    // Hide loading
    loadingIndicator.classList.add('hidden');
    // REMOVED: messageBox.classList.add('hidden');

    // Show the target panel
    if (panelToShow) {
        panelToShow.classList.remove('hidden');
        console.log("showPanel: Showing:", panelToShow.id);
    } else {
        console.warn("showPanel: panelToShow was null or undefined.");
    }
    checkAndShowRejoinNotification();
}

/**
 * Displays a notification toast to the user.
 * @param {string} message - The text (or HTML) to display.
 * @param {string} type - 'success', 'error', 'info', or 'chat'.
 * @param {object} options - Optional settings: { autoClose: 5000, onClick: null }
 */
function showNotification(message, type = "info", options = {}) {
    // Set default options
    const { autoClose = 5000, onClick = null, customClass = '' } = options;

    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.error("Notification container not found!");
        return;
    }

    // Create the toast element
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type} ${customClass}`;

    // Create message content
    const messageEl = document.createElement('div');
    messageEl.className = 'notification-message';
    messageEl.innerHTML = message; // Allow HTML for bolding sender, etc.
    toast.appendChild(messageEl);

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.innerHTML = '&times;'; // 'x' icon
    closeBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent click-through to toast's onClick
        removeToast();
    };
    toast.appendChild(closeBtn);

    // Add to DOM
    container.appendChild(toast);

    // Animate in
    // We use a tiny timeout to allow the browser to paint the element
    // before applying the 'show' class for the transition.
    setTimeout(() => toast.classList.add('show'), 10);

    let autoCloseTimer;

    // Click handler
    if (onClick) {
        toast.classList.add('clickable');
        toast.onclick = () => {
            onClick();
            removeToast(); // Close toast when clicked
        };
    }

    // Auto-close timer
    if (autoClose > 0) {
        autoCloseTimer = setTimeout(removeToast, autoClose);
    }

    // Function to remove the toast
    function removeToast() {
        clearTimeout(autoCloseTimer);
        toast.classList.remove('show');

        // Wait for the slide-out animation to finish before removing
        // from the DOM to prevent it from just vanishing.
        toast.addEventListener('transitionend', () => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        });
    }
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
    // --- PATHS FIXED ---
    const roleRef = doc(db, "artifacts", appId, "public", "data", "user_roles", uid);

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