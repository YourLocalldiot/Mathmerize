import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import {
    collection, getDocs, addDoc, deleteDoc, doc,
    serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

/* -------------------------------------------------------
   DEFAULT QUIZ (seeded for new users)
   ------------------------------------------------------- */
const DEFAULT_QUIZ = {
    title: "Trigonometry Identities",
    questions: [
        { prompt: "Remove horizontal transformations", text: "\\sin(-x)", answer: "-\\sin(x)" },
        { prompt: "Remove horizontal transformations", text: "\\cos(-x)", answer: "\\cos(x)" },
        { prompt: "Remove horizontal transformations", text: "\\tan(-x)", answer: "-\\tan(x)" },
        { prompt: "Remove horizontal transformations", text: "\\csc(-x)", answer: "-\\csc(x)" },
        { prompt: "Remove horizontal transformations", text: "\\sec(-x)", answer: "\\sec(x)" },
        { prompt: "Remove horizontal transformations", text: "\\cot(-x)", answer: "-\\cot(x)" },
        { prompt: "Expand the expression", text: "\\sin(x+z)", answer: "\\sin(x)\\cos(z)+\\cos(x)\\sin(z)" },
        { prompt: "Expand the expression", text: "\\sin(x-z)", answer: "\\sin(x)\\cos(z)-\\cos(x)\\sin(z)" },
        { prompt: "Expand the expression", text: "\\cos(x+z)", answer: "\\cos(x)\\cos(z)+\\sin(x)\\sin(z)" },
        { prompt: "Expand the expression", text: "\\cos(x-z)", answer: "\\cos(x)\\cos(z)-\\sin(x)\\sin(z)" },
        { prompt: "Expand the expression", text: "\\tan(x+z)", answer: "\\frac{\\tan(x)+\\tan(z)}{1-\\tan(x)\\tan(z)}" },
        { prompt: "Expand the expression", text: "\\tan(x-z)", answer: "\\frac{\\tan(x)-\\tan(z)}{1+\\tan(x)\\tan(z)}" },
        { prompt: "Expand the expression", text: "\\cos(\\frac{\\pi}{2} - x)", answer: "\\sin(x)" },
        { prompt: "Expand the expression", text: "\\sin(\\frac{\\pi}{2} - x)", answer: "\\cos(x)" },
        { prompt: "Expand the expression", text: "\\tan(\\frac{\\pi}{2} - x)", answer: "\\cot(x)" },
        { prompt: "Expand the expression", text: "\\cot(\\frac{\\pi}{2} - x)", answer: "\\tan(x)" },
        { prompt: "Expand the expression", text: "\\sec(\\frac{\\pi}{2} - x)", answer: "\\csc(x)" },
        { prompt: "Expand the expression", text: "\\csc(\\frac{\\pi}{2} - x)", answer: "\\sec(x)" },
        { prompt: "Expand the expression", text: "\\sin(2x)", answer: "2\\sin(x)\\cos(x)" },
        { prompt: "Expand (all possible forms, separate with =)", text: "\\cos(2x)", answer: "\\cos^2(x)-\\sin^2(x)=2\\cos^2(x)-1=1-2\\sin^2(x)" },
        { prompt: "Expand the expression", text: "\\tan(2x)", answer: "\\frac{2\\tan(x)}{1-\\tan^2(x)}" },
        { prompt: "Type the sine rule (A, B, C)", text: "\\triangle ABC", answer: "\\frac{\\sin(A)}{a}=\\frac{\\sin(B)}{b}=\\frac{\\sin(C)}{c}" },
        { prompt: "Type the cosine rule for a²", text: "\\triangle ABC", answer: "a^2=b^2+c^2-2bc\\cos(A)" },
        { prompt: "Type the cosine rule for b²", text: "\\triangle ABC", answer: "b^2=a^2+c^2-2ac\\cos(B)" },
        { prompt: "Type the cosine rule for c²", text: "\\triangle ABC", answer: "c^2=a^2+b^2-2ab\\cos(C)" }
    ]
};

/* -------------------------------------------------------
   UTILITIES
   ------------------------------------------------------- */

/** Generate a random 7-character alphanumeric code */
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit confusable chars
    let code = '';
    for (let i = 0; i < 7; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

/** Convert a Firestore Timestamp (or Date) to a relative string */
function relativeTime(ts) {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

/* -------------------------------------------------------
   AUTH SECTION (sidebar)
   ------------------------------------------------------- */
function renderAuthSection(user) {
    const container = document.getElementById('auth-container');
    const skeleton = document.getElementById('auth-skeleton');
    if (skeleton) skeleton.remove();

    if (user) {
        const displayName = user.displayName || 'User';
        const initial = displayName.charAt(0).toUpperCase();
        const email = user.email || '';
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <div class="auth-user-info" style="display:flex;align-items:center;gap:10px;min-width:0;">
                    <div class="auth-avatar" style="width:38px;height:38px;border-radius:50%;background:#eef2ff;color:#4f46e5;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0;">
                        ${initial}
                    </div>
                    <div class="auth-user-text" style="min-width:0;overflow:hidden;">
                        <p style="font-size:0.875rem;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${displayName}</p>
                        <p style="font-size:0.75rem;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${email}">${email}</p>
                    </div>
                </div>
                <button id="logout-btn" title="Logout" style="background:none;border:none;cursor:pointer;color:#94a3b8;padding:4px;border-radius:6px;transition:color 0.15s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                </button>
            </div>
        `;
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await signOut(auth);
            window.location.reload();
        });
    } else {
        container.innerHTML = `
            <a href="auth.html" style="display:flex;justify-content:center;align-items:center;gap:8px;width:100%;padding:12px;background:linear-gradient(135deg,#6366f1,#9333ea);color:#fff;border-radius:12px;font-weight:600;text-decoration:none;transition:opacity 0.2s;font-size:0.875rem;" onmouseover="this.style.opacity='.9'" onmouseout="this.style.opacity='1'">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
                Login / Sign up
            </a>
        `;
    }
}

/* -------------------------------------------------------
   RENDER QUIZ LIST
   ------------------------------------------------------- */
function renderQuizList(quizzes) {
    const list = document.getElementById('quiz-list');
    const empty = document.getElementById('empty-state');
    const skeleton = document.getElementById('skeleton-list');

    skeleton.style.display = 'none';
    list.style.display = 'flex';

    if (quizzes.length === 0) {
        empty.style.display = 'block';
        return;
    }

    list.innerHTML = quizzes.map(q => `
        <div class="quiz-item" data-id="${q.id}">
            <!-- Icon -->
            <div class="quiz-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
            </div>

            <!-- Info -->
            <div class="quiz-info">
                <div class="quiz-name">${escapeHtml(q.title)}</div>
                <div class="quiz-meta">
                    <span>
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        ${q.questions ? q.questions.length : 0} Qs
                    </span>
                </div>
            </div>

            <!-- Code badge -->
            <div class="quiz-code">
                <span class="code-badge" title="Click to copy code" data-code="${q.code}" onclick="copyCode(this)">
                    ${q.code || '—'}
                </span>
            </div>

            <!-- Date -->
            <div class="quiz-date">${relativeTime(q.createdAt)}</div>

            <!-- Actions -->
            <div class="quiz-actions">
                <a href="quiz.html?id=${q.id}" class="btn-play">
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Play
                </a>
                <div class="dropdown">
                    <button class="btn-icon" onclick="toggleDropdown(this)" title="More options">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                        </svg>
                    </button>
                    <div class="dropdown-menu">
                        <a href="create-quiz.html?id=${q.id}" class="dropdown-item" style="text-decoration:none; color:inherit;">
                            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                            Edit
                        </a>
                        <button class="dropdown-item danger" onclick="deleteQuiz('${q.id}', this)">
                            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* -------------------------------------------------------
   GLOBAL HELPERS (called from inline onclick)
   ------------------------------------------------------- */
window.toggleDropdown = function(btn) {
    const menu = btn.nextElementSibling;
    document.querySelectorAll('.dropdown-menu.open').forEach(m => { if (m !== menu) m.classList.remove('open'); });
    menu.classList.toggle('open');
};

window.copyCode = function(el) {
    const code = el.dataset.code;
    navigator.clipboard.writeText(code).then(() => {
        el.textContent = 'Copied!';
        el.classList.add('copied');
        setTimeout(() => {
            el.textContent = code;
            el.classList.remove('copied');
        }, 1800);
    });
};

window.deleteQuiz = async function(quizId, btn) {
    if (!confirm('Delete this quiz? This cannot be undone.')) return;
    try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        await deleteDoc(doc(db, 'users', uid, 'quizzes', quizId));
        // Remove the item from DOM
        const item = btn.closest('.quiz-item');
        item.style.transition = 'opacity 0.3s';
        item.style.opacity = '0';
        setTimeout(() => {
            item.remove();
            const list = document.getElementById('quiz-list');
            if (list.children.length === 0) {
                document.getElementById('empty-state').style.display = 'block';
            }
        }, 300);
        showToast('Quiz deleted.');
    } catch (err) {
        console.error(err);
        showToast('Failed to delete quiz.');
    }
};

/* -------------------------------------------------------
   MAIN — auth state listener
   ------------------------------------------------------- */
onAuthStateChanged(auth, async (user) => {
    renderAuthSection(user);

    if (!user) {
        document.getElementById('login-prompt').style.display = 'block';
        document.getElementById('library-content').style.display = 'none';
        return;
    }

    // Show library area
    document.getElementById('login-prompt').style.display = 'none';
    document.getElementById('library-content').style.display = 'block';
    document.getElementById('new-quiz-btn').style.display = 'flex';

    const uid = user.uid;
    const quizzesRef = collection(db, 'users', uid, 'quizzes');

    try {
        const q = query(quizzesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        let quizzes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Seed default quiz for brand-new users
        if (quizzes.length === 0) {
            const newDocRef = await addDoc(quizzesRef, {
                title: DEFAULT_QUIZ.title,
                questions: DEFAULT_QUIZ.questions,
                code: generateCode(),
                createdAt: serverTimestamp()
            });
            // Re-fetch to get real timestamp
            const freshSnapshot = await getDocs(query(quizzesRef, orderBy('createdAt', 'desc')));
            quizzes = freshSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        renderQuizList(quizzes);

    } catch (err) {
        console.error('Firestore error:', err);
        document.getElementById('skeleton-list').style.display = 'none';
        document.getElementById('quiz-list').style.display = 'block';
        document.getElementById('quiz-list').innerHTML = `
            <div style="text-align:center;padding:40px;color:#ef4444;font-size:0.9rem;">
                Failed to load quizzes. Check your connection and try again.
            </div>`;
    }
});
