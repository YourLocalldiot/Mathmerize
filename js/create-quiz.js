import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

// State
let quizData = {
    title: "Untitled Quiz",
    questions: []
};
let quizId = null;

const DEFAULT_QUESTIONS = [
    { prompt: "Evaluate the equation", text: "1+2x3", answer: "7" }
];

// Elements
const titleInput = document.getElementById('quiz-title-input');
const questionsList = document.getElementById('questions-list');
const questionCountDisplay = document.getElementById('question-count-display');
const saveBtn = document.getElementById('save-btn');
const saveBtnText = document.getElementById('save-btn-text');
const saveSpinner = document.getElementById('save-spinner');
const toast = document.getElementById('toast');

// Utilities
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Render Authentication Section (same as library.js)
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
            window.location.href = '../index.html';
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

// Render Questions
function renderQuestions() {
    titleInput.value = quizData.title;
    questionCountDisplay.textContent = `${quizData.questions.length} Question${quizData.questions.length !== 1 ? 's' : ''}`;
    
    questionsList.innerHTML = '';
    
    quizData.questions.forEach((q, index) => {
        const qNumStr = String(index + 1).padStart(2, '0');
        const card = document.createElement('div');
        card.className = 'question-card';
        card.innerHTML = `
            <div class="drag-handle">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                    <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                    <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                </svg>
            </div>
            <div class="question-header">
                <div class="q-number-prompt">
                    <span class="q-number">${qNumStr}</span>
                    <span class="q-prompt">${q.prompt}</span>
                </div>
                <div class="q-actions">
                    <button class="icon-btn duplicate-btn" data-index="${index}" title="Duplicate">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    </button>
                    <button class="icon-btn delete-btn" data-index="${index}" title="Delete">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                    <button class="icon-btn" title="Edit">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        <span>Edit</span>
                    </button>
                </div>
            </div>
            <div class="q-equation" id="eq-disp-${index}"></div>
            <div class="q-answer">
                <span class="check-icon">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                </span>
                <span class="q-answer-text" id="ans-disp-${index}"></span>
            </div>
        `;
        questionsList.appendChild(card);

        // Render KaTeX for equation
        try {
            katex.render(q.text, document.getElementById(`eq-disp-${index}`), { throwOnError: false });
        } catch (e) {
            document.getElementById(`eq-disp-${index}`).textContent = q.text;
        }

        // Render KaTeX for answer
        try {
            katex.render(q.answer, document.getElementById(`ans-disp-${index}`), { throwOnError: false });
        } catch (e) {
            document.getElementById(`ans-disp-${index}`).textContent = q.answer;
        }
    });

    // Attach event listeners for actions
    document.querySelectorAll('.duplicate-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            duplicateQuestion(index);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            deleteQuestion(index);
        });
    });
}

// Logic functions
function duplicateQuestion(index) {
    const q = Object.assign({}, quizData.questions[index]);
    // Insert after current
    quizData.questions.splice(index + 1, 0, q);
    renderQuestions();
}

function deleteQuestion(index) {
    if (confirm("Are you sure you want to delete this question?")) {
        quizData.questions.splice(index, 1);
        renderQuestions();
    }
}

// Save logic
async function saveQuiz() {
    if (!auth.currentUser) {
        showToast("You must be logged in to save.");
        return;
    }
    const uid = auth.currentUser.uid;
    
    // Update state from input
    quizData.title = titleInput.value.trim() || "Untitled Quiz";

    // Set UI to loading state
    saveBtn.disabled = true;
    saveBtnText.classList.add('hidden');
    saveSpinner.classList.remove('hidden');

    try {
        const quizzesRef = doc(db, 'users', uid, 'quizzes', quizId);
        
        await updateDoc(quizzesRef, {
            title: quizData.title,
            questions: quizData.questions
        }).catch(async (error) => {
            // If it doesn't exist, create it (should rarely happen if we initialize properly)
            if (error.code === 'not-found') {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let code = '';
                for (let i = 0; i < 7; i++) code += chars[Math.floor(Math.random() * chars.length)];
                
                await setDoc(quizzesRef, {
                    title: quizData.title,
                    questions: quizData.questions,
                    code: code,
                    createdAt: serverTimestamp()
                });
            } else {
                throw error;
            }
        });

        showToast("Quiz saved successfully!");
    } catch (err) {
        console.error("Error saving quiz: ", err);
        showToast("Failed to save quiz.");
    } finally {
        saveBtn.disabled = false;
        saveBtnText.classList.remove('hidden');
        saveSpinner.classList.add('hidden');
    }
}

// Initializer
const params = new URLSearchParams(window.location.search);
const urlId = params.get('id');

onAuthStateChanged(auth, async (user) => {
    renderAuthSection(user);

    if (user) {
        if (urlId) {
            quizId = urlId;
            try {
                const quizDoc = await getDoc(doc(db, 'users', user.uid, 'quizzes', quizId));
                if (quizDoc.exists()) {
                    quizData = quizDoc.data();
                    renderQuestions();
                } else {
                    showToast('Quiz not found.');
                }
            } catch (err) {
                console.error(err);
                showToast('Failed to load quiz.');
            }
        } else {
            // Creating a new quiz from scratch
            quizId = generateId(); // Generate a temp ID
            quizData.questions = [...DEFAULT_QUESTIONS];
            
            // Auto-create doc in Firestore right away to establish it? Or just let 'not-found' handler create it on save.
            // Let's create it right away so we have a valid ID and createdAt.
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 7; i++) code += chars[Math.floor(Math.random() * chars.length)];
            
            try {
                await setDoc(doc(db, 'users', user.uid, 'quizzes', quizId), {
                    title: quizData.title,
                    questions: quizData.questions,
                    code: code,
                    createdAt: serverTimestamp()
                });
                
                // Update URL without reloading
                const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?id=' + quizId;
                window.history.pushState({path:newurl},'',newurl);

                renderQuestions();
            } catch (err) {
                console.error("Error creating draft:", err);
            }
        }
    } else {
        showToast('Please log in to create or edit quizzes.');
    }
});

// Event Listeners
saveBtn.addEventListener('click', saveQuiz);

document.getElementById('preview-btn').addEventListener('click', () => {
    showToast("Preview page will be created later.");
});

document.getElementById('create-q-btn').addEventListener('click', () => {
    showToast("Create question page will be created later.");
});

document.getElementById('add-q-btn').addEventListener('click', () => {
    showToast("Add question page will be created later.");
});

titleInput.addEventListener('change', () => {
    quizData.title = titleInput.value.trim() || "Untitled Quiz";
});
