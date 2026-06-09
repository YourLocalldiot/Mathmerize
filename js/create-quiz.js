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
    } else {
        const q = quizData.questions[index];
        editQHeader.textContent = `QUESTION ${index + 1} / ${quizData.questions.length}`;
        editQPrompt.value = q.prompt ? q.prompt.replace(/\\ /g, ' ') : '';
        editEquationField.latex(q.text || '');
        editMathField.latex(q.answer || '');
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
        const quizzesRef = doc(db, 'users', uid, 'quizzes', quizId);
        
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
                    randomize: !!quizData.randomize,
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


document.getElementById('create-q-btn').addEventListener('click', () => {
    openEditView(-1);
});

document.getElementById('add-q-btn').addEventListener('click', () => {
    openEditView(-1);
});

cancelEditBtn.addEventListener('click', closeEditView);

saveQDetailBtn.addEventListener('click', () => {
    const promptText = editQPrompt.value.trim();
    const equationText = editEquationField.latex().trim();
    const answerLatex = editMathField.latex().trim();

    if (!promptText && !equationText && !answerLatex) {
        showToast("Please enter question details.");
        return;
    }

    const newQ = {
        prompt: promptText,
        text: equationText,
        answer: answerLatex
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

    $('#edit-question-view .keypad-btn').on('click touchstart', function(e) {
        e.preventDefault();
        const cmd = $(this).attr('data-cmd');
        if (!cmd || !activeMathField) return;
        activeMathField.focus();
        
        if (activeMathField === editQPrompt) {
            const start = activeMathField.selectionStart;
            const end = activeMathField.selectionEnd;
            const val = activeMathField.value;
            
            let insertText = cmd;
            if (cmd === '\\frac') insertText = '\\frac{}{}';
            else if (cmd === '\\sqrt') insertText = '\\sqrt{}';
            else if (['\\sin','\\cos','\\tan','\\csc','\\sec','\\cot','\\ln'].includes(cmd)) insertText = cmd + '()';
            
            activeMathField.value = val.substring(0, start) + insertText + val.substring(end);
            
            let newCursorPos = start + insertText.length;
            if (insertText.endsWith('{}')) newCursorPos -= 1;
            else if (insertText.endsWith('()')) newCursorPos -= 1;
            
            activeMathField.setSelectionRange(newCursorPos, newCursorPos);
        } else {
            if (cmd === '^2') { activeMathField.write('^2'); }
            else if (cmd === '^') { activeMathField.write('^'); }
            else if (cmd === '\\frac') { activeMathField.write('\\frac{ }{ }'); activeMathField.keystroke('Left'); activeMathField.keystroke('Left'); }
            else if (cmd === '\\sqrt') { activeMathField.write('\\sqrt{ }'); activeMathField.keystroke('Left'); }
            else if (['\\sin','\\cos','\\tan','\\csc','\\sec','\\cot','\\ln'].includes(cmd)) { activeMathField.write(cmd + '\\left(\\right)'); activeMathField.keystroke('Left'); }
            else if (cmd.includes('lim')) { activeMathField.write(cmd); activeMathField.keystroke('Left'); }
            else { activeMathField.write(cmd); }
            updateAllPlaceholders();
        }
    });

    $('#edit-backspace-btn').on('click touchstart', function(e) {
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
