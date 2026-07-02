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
let hasUnsavedChanges = false;

const DEFAULT_QUESTIONS = [];

// Elements
const titleInput = document.getElementById('quiz-title-input');
const questionsList = document.getElementById('questions-list');
const questionCountDisplay = document.getElementById('question-count-display');
const saveBtn = document.getElementById('save-btn');
const saveBtnText = document.getElementById('save-btn-text');
const saveSpinner = document.getElementById('save-spinner');
const randomizeSwitch = document.getElementById('randomize-switch');
const toast = document.getElementById('toast');

// Edit Question View Elements
const mainContentContainer = document.querySelector('.content-container:not(#edit-question-view)');
const editQuestionView = document.getElementById('edit-question-view');
const editQHeader = document.getElementById('edit-q-header');
const editQPrompt = document.getElementById('edit-q-prompt');
const editQPromptPlaceholder = document.getElementById('edit-q-prompt-placeholder');
const editQEquation = document.getElementById('edit-q-equation');
const editQEquationPlaceholder = document.getElementById('edit-q-equation-placeholder');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const saveQDetailBtn = document.getElementById('save-q-detail-btn');
const editMathFieldEl = document.getElementById('edit-math-field');
const editMathPlaceholder = document.getElementById('edit-math-placeholder');

const MQ = MathQuill.getInterface(2);
let editEquationField, editMathField;
let activeMathField = null;
let editingQuestionIndex = -1; // -1 means new question

// Drag and drop state
let dragStartIndex = null;

function handleDragStart(e) {
    dragStartIndex = parseInt(e.currentTarget.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
}
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}
function handleDragEnter(e) {
    const card = e.currentTarget.closest('.question-card');
    if (card) card.style.borderTop = '2px solid #6366f1';
}
function handleDragLeave(e) {
    const card = e.currentTarget.closest('.question-card');
    if (card) card.style.borderTop = '';
}
function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    document.querySelectorAll('.question-card').forEach(c => c.style.borderTop = '');
}
function handleDrop(e) {
    e.stopPropagation();
    const card = e.currentTarget.closest('.question-card');
    if (card) card.style.borderTop = '';
    const dragEndIndex = parseInt(card.dataset.index);
    
    if (dragStartIndex !== dragEndIndex && dragStartIndex !== null && !isNaN(dragEndIndex)) {
        const item = quizData.questions.splice(dragStartIndex, 1)[0];
        quizData.questions.splice(dragEndIndex, 0, item);
        hasUnsavedChanges = true;
        renderQuestions();
    }
    return false;
}

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
    titleInput.value = quizData.title || "Untitled Quiz";
    randomizeSwitch.checked = !!quizData.randomize;
    questionCountDisplay.textContent = `${quizData.questions.length} Question${quizData.questions.length !== 1 ? 's' : ''}`;
    
    questionsList.innerHTML = '';
    
    if (quizData.questions.length === 0) {
        questionsList.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px 20px;">
                <svg width="100" height="100" fill="none" stroke="url(#create-gradient)" viewBox="0 0 24 24" style="margin: 0 auto 20px; filter: drop-shadow(0 10px 15px rgba(99,102,241,0.2));">
                    <defs>
                        <linearGradient id="create-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#818cf8" />
                            <stop offset="100%" stop-color="#4f46e5" />
                        </linearGradient>
                    </defs>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/>
                </svg>
                <h3 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 8px;">No questions yet</h3>
                <p style="color: #64748b; font-size: 1rem; margin-bottom: 0;">Click <strong>Create question</strong> to add your first one.</p>
            </div>
        `;
        return;
    }

    quizData.questions.forEach((q, index) => {
        const qNumStr = String(index + 1).padStart(2, '0');
        const card = document.createElement('div');
        card.className = 'question-card transition-all duration-200';
        card.dataset.index = index;
        card.innerHTML = `
            <div class="drag-handle" title="Drag to reorder">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                    <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                    <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                </svg>
            </div>
            <div class="question-header">
                <div class="q-number-prompt">
                    <span class="q-number">${qNumStr}</span>
                    <span class="q-prompt">${q.prompt ? q.prompt.replace(/\\ /g, ' ') : ''}</span>
                </div>
                <div class="q-actions">
                    <button class="icon-btn duplicate-btn" data-index="${index}" title="Duplicate">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    </button>
                    <button class="icon-btn delete-btn" data-index="${index}" title="Delete">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                    <button class="icon-btn edit-btn" data-index="${index}" title="Edit">
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

        // Setup drag and drop
        const handle = card.querySelector('.drag-handle');
        handle.addEventListener('mousedown', () => { card.draggable = true; });
        handle.addEventListener('mouseup', () => { card.draggable = false; });
        handle.addEventListener('mouseleave', () => { card.draggable = false; });
        
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragleave', handleDragLeave);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragend', handleDragEnd);
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

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            openEditView(index);
        });
    });
}

// Logic functions
function duplicateQuestion(index) {
    const q = Object.assign({}, quizData.questions[index]);
    // Insert after current
    quizData.questions.splice(index + 1, 0, q);
    hasUnsavedChanges = true;
    renderQuestions();
}

function deleteQuestion(index) {
    if (confirm("Are you sure you want to delete this question?")) {
        quizData.questions.splice(index, 1);
        hasUnsavedChanges = true;
        renderQuestions();
    }
}

function openEditView(index = -1) {
    editingQuestionIndex = index;
    mainContentContainer.classList.add('hidden');
    editQuestionView.classList.remove('hidden');

    if (index === -1) {
        editQHeader.textContent = `QUESTION ${quizData.questions.length + 1} / NEW`;
        editQPrompt.value = '';
        editEquationField.latex('');
        editMathField.latex('');
        document.getElementById('edit-q-random-eval').checked = false;
        document.getElementById('edit-q-eval-variable-container').classList.add('hidden');
        document.getElementById('edit-q-eval-variable').value = '';
    } else {
        const q = quizData.questions[index];
        editQHeader.textContent = `QUESTION ${index + 1} / ${quizData.questions.length}`;
        editQPrompt.value = q.prompt ? q.prompt.replace(/\\ /g, ' ') : '';
        editEquationField.latex(q.text || '');
        editMathField.latex(q.answer || '');
        document.getElementById('edit-q-random-eval').checked = !!q.randomEval;
        if (q.randomEval) {
            document.getElementById('edit-q-eval-variable-container').classList.remove('hidden');
            document.getElementById('edit-q-eval-variable').value = q.evalVariable || '';
        } else {
            document.getElementById('edit-q-eval-variable-container').classList.add('hidden');
            document.getElementById('edit-q-eval-variable').value = '';
        }
    }
    updateAllPlaceholders();
    activeMathField = editQPrompt;
    setTimeout(() => activeMathField.focus(), 100);
}

function closeEditView() {
    mainContentContainer.classList.remove('hidden');
    editQuestionView.classList.add('hidden');
}

function updateAllPlaceholders() {
    updatePlaceholder(editEquationField, editQEquationPlaceholder);
    updatePlaceholder(editMathField, editMathPlaceholder);
}

function updatePlaceholder(field, placeholderEl) {
    if (field && field.latex().trim() !== '') {
        placeholderEl.classList.add('hidden');
    } else {
        placeholderEl.classList.remove('hidden');
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
        const quizzesRef = doc(db, 'quizzes', quizId);
        
        await updateDoc(quizzesRef, {
            title: quizData.title,
            questions: quizData.questions,
            randomize: !!quizData.randomize
        }).catch(async (error) => {
            // If it doesn't exist, create it (should rarely happen if we initialize properly)
            if (error.code === 'not-found') {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let code = '';
                for (let i = 0; i < 7; i++) code += chars[Math.floor(Math.random() * chars.length)];
                
                await setDoc(quizzesRef, {
                    ownerId: uid,
                    title: quizData.title,
                    questions: quizData.questions,
                    randomize: !!quizData.randomize,
                    code: code,
                    createdAt: serverTimestamp()
                });
            } else {
                throw error;
            }
        });

        showToast("Quiz saved successfully!");
        hasUnsavedChanges = false;
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
        // Hide login prompt
        const loginPrompt = document.getElementById('login-prompt');
        if (loginPrompt) loginPrompt.style.display = 'none';

        if (urlId) {
            quizId = urlId;
            try {
                const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
                if (quizDoc.exists()) {
                    const data = quizDoc.data();
                    if (data.ownerId && data.ownerId !== user.uid) {
                        showToast('Unauthorized: You do not own this quiz.');
                        window.location.href = 'library.html';
                        return;
                    }
                    quizData = data;
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
            
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 7; i++) code += chars[Math.floor(Math.random() * chars.length)];
            
            try {
                // Initialize doc
                await setDoc(doc(db, 'quizzes', quizId), {
                    ownerId: user.uid,
                    title: quizData.title || "Untitled Quiz",
                    questions: quizData.questions,
                    randomize: false,
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
        // Show login prompt instead of the creator interface
        const toolbar = document.getElementById('quiz-toolbar');
        const content = document.getElementById('quiz-content');
        const loginPrompt = document.getElementById('login-prompt');
        
        if (toolbar) toolbar.style.display = 'none';
        if (content) content.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
    }
});

// Event Listeners
saveBtn.addEventListener('click', saveQuiz);


const qTypeOverlay = document.getElementById('q-type-overlay');

function openQTypeSelection() {
    qTypeOverlay.classList.remove('hidden');
    // small delay to allow display:flex to apply before adding class for opacity transition
    setTimeout(() => qTypeOverlay.classList.add('show'), 10);
}

function closeQTypeSelection() {
    qTypeOverlay.classList.remove('show');
    setTimeout(() => qTypeOverlay.classList.add('hidden'), 300);
}

document.getElementById('create-q-btn').addEventListener('click', openQTypeSelection);
document.getElementById('add-q-btn').addEventListener('click', openQTypeSelection);
document.getElementById('close-q-type-btn').addEventListener('click', closeQTypeSelection);

document.querySelectorAll('.q-type-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.type;
        closeQTypeSelection();
        
        // Only equation is fully implemented right now
        if (type === 'equation') {
            setTimeout(() => openEditView(-1), 300);
        } else {
            // For now, treat others similarly or show a toast
            setTimeout(() => {
                showToast(`Selected type: ${type.replace('_', ' ')} (using equation view)`);
                openEditView(-1);
            }, 300);
        }
    });
});

cancelEditBtn.addEventListener('click', closeEditView);

document.getElementById('edit-q-random-eval').addEventListener('change', function() {
    const container = document.getElementById('edit-q-eval-variable-container');
    if (this.checked) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
});

saveQDetailBtn.addEventListener('click', () => {
    const promptText = editQPrompt.value.trim();
    const equationText = editEquationField.latex().trim();
    const answerLatex = editMathField.latex().trim();
    const randomEval = document.getElementById('edit-q-random-eval').checked;
    const evalVariable = document.getElementById('edit-q-eval-variable').value.trim();

    if (randomEval) {
        if (!evalVariable) {
            showToast("Please specify the variable for evaluation.");
            return;
        }
        if (!answerLatex.includes(evalVariable)) {
            showToast("Mismatch: The specified variable does not appear in the answer.");
            return;
        }
    }

    if (!promptText && !equationText && !answerLatex) {
        showToast("Please enter question details.");
        return;
    }

    const newQ = {
        prompt: promptText,
        text: equationText,
        answer: answerLatex,
        randomEval: randomEval,
        evalVariable: evalVariable
    };

    if (editingQuestionIndex === -1) {
        quizData.questions.push(newQ);
    } else {
        quizData.questions[editingQuestionIndex] = newQ;
    }

    hasUnsavedChanges = true;
    renderQuestions();
    closeEditView();
});

// Initialize Edit View functionality
$(document).ready(() => {
    const defaultOptions = {
        handlers: {
            edit: function() {
                updateAllPlaceholders();
            }
        },
        autoCommands: 'pi theta sqrt sum',
        autoParenthesizedFunctions: 'sin cos tan csc sec cot ln'
    };

    editEquationField = MQ.MathField(editQEquation, defaultOptions);
    editMathField = MQ.MathField(editMathFieldEl, defaultOptions);

    activeMathField = editMathField;

    $(editQPrompt).on('focus', () => activeMathField = editQPrompt);
    $(editQEquation).on('focusin', () => activeMathField = editEquationField);
    $(editMathFieldEl).on('focusin', () => activeMathField = editMathField);

    // ---- Keyboard helper ----
    function execMkCmd(cmd, field) {
        if (!field) return;

        if (field === editQPrompt) {
            // Plain text field
            const start = field.selectionStart;
            const end = field.selectionEnd;
            const val = field.value;
            let insertText = cmd.replace(/\\/g, '\\');
            if (cmd === '\\frac') insertText = '\\frac{}{}';
            else if (cmd === '\\sqrt') insertText = '\\sqrt{}';
            else if ([
                '\\sin','\\cos','\\tan','\\csc','\\sec','\\cot','\\ln',
                '\\arcsin','\\arccos','\\arctan','\\exp','\\log',
                '\\sinh','\\cosh','\\tanh','\\coth',
                '\\operatorname{arccsc}','\\operatorname{arcsec}','\\operatorname{arccot}',
                '\\operatorname{csch}','\\operatorname{sech}',
                '\\operatorname{lcm}','\\gcd','\\operatorname{mod}',
                '\\operatorname{round}','\\operatorname{sign}',
                '\\operatorname{nPr}','\\operatorname{nCr}'
            ].includes(cmd)) insertText = cmd + '()';
            field.value = val.substring(0, start) + insertText + val.substring(end);
            let pos = start + insertText.length;
            if (insertText.endsWith('{}')) pos -= 1;
            else if (insertText.endsWith('()')) pos -= 1;
            field.setSelectionRange(pos, pos);
            return;
        }

        // MathQuill field
        field.focus();
        if (cmd === '^2') { field.write('^2'); }
        else if (cmd === '^') { field.write('^'); }
        else if (cmd === '\\frac') { field.write('\\frac{ }{ }'); field.keystroke('Left'); field.keystroke('Left'); }
        else if (cmd === '\\sqrt') { field.write('\\sqrt{ }'); field.keystroke('Left'); }
        else if ([
            '\\sin','\\cos','\\tan','\\csc','\\sec','\\cot','\\ln',
            '\\arcsin','\\arccos','\\arctan','\\exp','\\log',
            '\\sinh','\\cosh','\\tanh','\\coth',
            '\\operatorname{arccsc}','\\operatorname{arcsec}','\\operatorname{arccot}',
            '\\operatorname{csch}','\\operatorname{sech}',
            '\\operatorname{lcm}','\\gcd','\\operatorname{mod}',
            '\\operatorname{round}','\\operatorname{sign}',
            '\\operatorname{nPr}','\\operatorname{nCr}'
        ].includes(cmd)) {
            field.write(cmd + '\\left(\\right)'); field.keystroke('Left');
        }
        else if (cmd === '\\lceil') { field.write('\\lceil\\rceil'); field.keystroke('Left'); }
        else if (cmd === '\\lfloor') { field.write('\\lfloor\\rfloor'); field.keystroke('Left'); }
        else if (cmd === '\\log_{}') { field.write('\\log_{ }\\left(\\right)'); field.keystroke('Left'); }
        else if (cmd === '\\frac{d}{dx}') { field.write('\\frac{d}{dx}\\left(\\right)'); field.keystroke('Left'); }
        else if (cmd === '\\sqrt[]{}') { field.write('\\sqrt[]{ }'); field.keystroke('Left'); }
        else if (cmd.includes('lim') || cmd.includes('sum') || cmd.includes('int') || cmd.includes('prod')) {
            field.write(cmd); field.keystroke('Left');
        }
        else { field.write(cmd); }
        updateAllPlaceholders();
    }

    // ---- Keyboard Toggles & State ----
    let isShifted = false;
    const abcKeyboard = document.getElementById('edit-abc-keyboard');
    const mainKeyboard = document.getElementById('edit-main-keyboard');

    document.querySelectorAll('#edit-question-view .mk-abc-toggle').forEach(btn => {
        const handler = (e) => { e.preventDefault(); mainKeyboard.classList.add('hidden'); abcKeyboard.classList.add('active'); };
        btn.addEventListener('click', handler); btn.addEventListener('touchstart', handler, { passive: false });
    });

    document.querySelectorAll('#edit-question-view .mk-num-toggle').forEach(btn => {
        const handler = (e) => { e.preventDefault(); abcKeyboard.classList.remove('active'); mainKeyboard.classList.remove('hidden'); };
        btn.addEventListener('click', handler); btn.addEventListener('touchstart', handler, { passive: false });
    });

    document.querySelectorAll('#edit-question-view .mk-shift-btn').forEach(btn => {
        const handler = (e) => { e.preventDefault(); isShifted = !isShifted; abcKeyboard.classList.toggle('shifted', isShifted); };
        btn.addEventListener('click', handler); btn.addEventListener('touchstart', handler, { passive: false });
    });

    document.querySelectorAll('#edit-question-view .mk-enter-btn').forEach(btn => {
        const handler = (e) => { e.preventDefault(); $('#save-q-detail-btn').click(); };
        btn.addEventListener('click', handler); btn.addEventListener('touchstart', handler, { passive: false });
    });

    // Wire new mk-btn buttons
    document.querySelectorAll('#edit-mk-wrapper [data-mk-cmd]').forEach(btn => {
        const handler = function(e) {
            e.preventDefault();
            if (!activeMathField) return;
            let cmd = this.getAttribute('data-mk-cmd');
            if (this.classList.contains('letter') && isShifted) {
                cmd = cmd.toUpperCase();
            }
            execMkCmd(cmd, activeMathField);
        };
        btn.addEventListener('click', handler);
        btn.addEventListener('touchstart', handler, { passive: false });
    });

    // Functions panel toggle
    const editFnToggle = document.getElementById('edit-fn-toggle');
    const editFnPanel = document.getElementById('edit-fn-panel');
    if (editFnToggle && editFnPanel) {
        editFnToggle.addEventListener('click', () => {
            const isOpen = editFnPanel.classList.toggle('open');
            editFnToggle.classList.toggle('active', isOpen);
        });
        document.addEventListener('click', (e) => {
            if (!editFnToggle.contains(e.target) && !editFnPanel.contains(e.target)) {
                editFnPanel.classList.remove('open');
                editFnToggle.classList.remove('active');
            }
        });
    }

    // Left / Right navigation
    const editLeftBtn = document.getElementById('edit-left-btn');
    const editRightBtn = document.getElementById('edit-right-btn');
    if (editLeftBtn) editLeftBtn.addEventListener('click', () => {
        if (activeMathField && activeMathField !== editQPrompt) { activeMathField.focus(); activeMathField.keystroke('Left'); }
    });
    if (editRightBtn) editRightBtn.addEventListener('click', () => {
        if (activeMathField && activeMathField !== editQPrompt) { activeMathField.focus(); activeMathField.keystroke('Right'); }
    });

    // Backspace
    $('#edit-backspace-btn, #edit-abc-keyboard .mk-backspace-btn').on('click touchstart', function(e) {
        e.preventDefault();
        if(!activeMathField) return;
        activeMathField.focus();
        
        if (activeMathField === editQPrompt) {
            const start = activeMathField.selectionStart;
            const end = activeMathField.selectionEnd;
            const val = activeMathField.value;
            
            if (start === end && start > 0) {
                activeMathField.value = val.substring(0, start - 1) + val.substring(end);
                activeMathField.setSelectionRange(start - 1, start - 1);
            } else if (start !== end) {
                activeMathField.value = val.substring(0, start) + val.substring(end);
                activeMathField.setSelectionRange(start, start);
            }
        } else {
            activeMathField.keystroke('Backspace');
            updateAllPlaceholders();
        }
    });
});

titleInput.addEventListener('change', () => {
    quizData.title = titleInput.value.trim() || "Untitled Quiz";
    hasUnsavedChanges = true;
});

randomizeSwitch.addEventListener('change', () => {
    quizData.randomize = randomizeSwitch.checked;
    hasUnsavedChanges = true;
});

window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});
