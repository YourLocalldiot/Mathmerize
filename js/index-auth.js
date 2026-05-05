import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            const displayName = user.displayName || 'User';
            const initial = displayName.charAt(0).toUpperCase();
            const email = user.email || '';

            authContainer.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="auth-user-info flex items-center gap-3">
                        <div class="auth-avatar w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                            ${initial}
                        </div>
                        <div class="auth-user-text overflow-hidden">
                            <p class="text-sm font-semibold text-slate-800 truncate">${displayName}</p>
                            <p class="text-xs text-slate-500 truncate" title="${email}">${email}</p>
                        </div>
                    </div>
                    <button id="logout-btn" class="p-2 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer" title="Logout">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
            `;

            document.getElementById('logout-btn').addEventListener('click', async () => {
                try {
                    await signOut(auth);
                } catch (error) {
                    console.error('Error signing out:', error);
                }
            });
        } else {
            // User is signed out
            authContainer.innerHTML = `
                <a href="pages/auth.html" class="flex justify-center items-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                    Login / Sign up
                </a>
            `;
        }
    });
});
