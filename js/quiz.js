/**
 * quiz.js — ES Module
 * - If URL has ?id=<quizId>, loads that quiz from Firestore (users/{uid}/quizzes/{id})
 * - Otherwise falls back to the built-in hard-coded question bank
 */

import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

/* -------------------------------------------------------
   FALLBACK QUESTION BANK
   ------------------------------------------------------- */
const FALLBACK_QUIZ = [
    // Horizontal Transformations
    { prompt: "Remove horizontal transformations", text: "\\sin(-x)", answer: "-\\sin(x)" },
    { prompt: "Remove horizontal transformations", text: "\\cos(-x)", answer: "\\cos(x)" },
    { prompt: "Remove horizontal transformations", text: "\\tan(-x)", answer: "-\\tan(x)" },
    { prompt: "Remove horizontal transformations", text: "\\csc(-x)", answer: "-\\csc(x)" },
    { prompt: "Remove horizontal transformations", text: "\\sec(-x)", answer: "\\sec(x)" },
    { prompt: "Remove horizontal transformations", text: "\\cot(-x)", answer: "-\\cot(x)" },
    // Angle Sum/Difference
    { prompt: "Expand the expression", text: "\\sin(x+z)", answer: "\\sin(x)\\cos(z)+\\cos(x)\\sin(z)" },
    { prompt: "Expand the expression", text: "\\sin(x-z)", answer: "\\sin(x)\\cos(z)-\\cos(x)\\sin(z)" },
    { prompt: "Expand the expression", text: "\\cos(x+z)", answer: "\\cos(x)\\cos(z)+\\sin(x)\\sin(z)" },
    { prompt: "Expand the expression", text: "\\cos(x-z)", answer: "\\cos(x)\\cos(z)-\\sin(x)\\sin(z)" },
    { prompt: "Expand the expression", text: "\\tan(x+z)", answer: "\\frac{\\tan(x)+\\tan(z)}{1-\\tan(x)\\tan(z)}" },
    { prompt: "Expand the expression", text: "\\tan(x-z)", answer: "\\frac{\\tan(x)-\\tan(z)}{1+\\tan(x)\\tan(z)}" },
    // Co-function Identities
    { prompt: "Expand the expression", text: "\\cos(\\frac{\\pi}{2} - x)", answer: "\\sin(x)" },
    { prompt: "Expand the expression", text: "\\sin(\\frac{\\pi}{2} - x)", answer: "\\cos(x)" },
    { prompt: "Expand the expression", text: "\\tan(\\frac{\\pi}{2} - x)", answer: "\\cot(x)" },
    { prompt: "Expand the expression", text: "\\cot(\\frac{\\pi}{2} - x)", answer: "\\tan(x)" },
    { prompt: "Expand the expression", text: "\\sec(\\frac{\\pi}{2} - x)", answer: "\\csc(x)" },
    { prompt: "Expand the expression", text: "\\csc(\\frac{\\pi}{2} - x)", answer: "\\sec(x)" },
    // Double Angle
    { prompt: "Expand the expression", text: "\\sin(2x)", answer: "2\\sin(x)\\cos(x)" },
    { prompt: "Expand (all possible forms, separate with =)", text: "\\cos(2x)", answer: "\\cos^2(x)-\\sin^2(x)=2\\cos^2(x)-1=1-2\\sin^2(x)" },
    { prompt: "Expand the expression", text: "\\tan(2x)", answer: "\\frac{2\\tan(x)}{1-\\tan^2(x)}" },
    // Rule Sets
    { prompt: "Type the sine rule (A, B, C)", text: "\\triangle ABC", answer: "\\frac{\\sin(A)}{a}=\\frac{\\sin(B)}{b}=\\frac{\\sin(C)}{c}" },
    { prompt: "Type the cosine rule for a²", text: "\\triangle ABC", answer: "a^2=b^2+c^2-2bc\\cos(A)" },
    { prompt: "Type the cosine rule for b²", text: "\\triangle ABC", answer: "b^2=a^2+c^2-2ac\\cos(B)" },
    { prompt: "Type the cosine rule for c²", text: "\\triangle ABC", answer: "c^2=a^2+b^2-2ab\\cos(C)" }
];

/* -------------------------------------------------------
   SIDEBAR AUTH
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
                <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                    <div style="width:38px;height:38px;border-radius:50%;background:#eef2ff;color:#4f46e5;display:flex;align-items:center;justify-content:justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0;">
                        ${initial}
                    </div>
                    <div style="min-width:0;overflow:hidden;">
                        <p style="font-size:0.875rem;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${displayName}</p>
                        <p style="font-size:0.75rem;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${email}</p>
                    </div>
                </div>
                <button id="logout-btn" title="Logout" style="background:none;border:none;cursor:pointer;color:#94a3b8;padding:4px;border-radius:6px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                </button>
            </div>`;
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await signOut(auth);
            window.location.href = '../index.html';
        });
    } else {
        container.innerHTML = `
            <a href="auth.html" style="display:flex;justify-content:center;align-items:center;gap:8px;width:100%;padding:12px;background:linear-gradient(135deg,#6366f1,#9333ea);color:#fff;border-radius:12px;font-weight:600;text-decoration:none;font-size:0.875rem;">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
                Login / Sign up
            </a>`;
    }
}

/* -------------------------------------------------------
   QUIZ LOGIC (jQuery-based, unchanged from original)
   ------------------------------------------------------- */
function initQuiz(quizData) {
    // Show quiz wrapper, hide loading
    document.getElementById('quiz-loading').style.display = 'none';
    document.getElementById('quiz-wrapper').style.display = 'block';

    function shuffle(array) {
        let ci = array.length, ri;
        while (ci !== 0) {
            ri = Math.floor(Math.random() * ci);
            ci--;
            [array[ci], array[ri]] = [array[ri], array[ci]];
        }
        return array;
    }

    shuffle(quizData);

    const MQ = MathQuill.getInterface(2);
    let score = 0;
    let currentIndex = 0;
    const totalQ = quizData.length;
    $('#total-q').text(totalQ);

    const mathField = MQ.MathField(document.getElementById('math-field'), {
        handlers: { enter: () => checkAnswer() },
        autoCommands: 'pi theta sqrt sum',
        autoParenthesizedFunctions: 'sin cos tan csc sec cot ln'
    });

    function loadQuestion() {
        if (currentIndex >= totalQ) { showResults(); return; }
        const q = quizData[currentIndex];
        $('#question-prompt').text(q.prompt);
        katex.render(q.text, document.getElementById('question-display'), { throwOnError: false });
        mathField.latex('');
        mathField.focus();
        $('#q-number').text(currentIndex + 1);
        updateProgressBar();
    }

    function normalizeLatex(str) {
        return str.replace(/ /g, '')
                  .replace(/\\-/g, '-')
                  .replace(/\\cdot/g, '')
                  .replace(/\\left/g, '')
                  .replace(/\\right/g, '')
                  .replace(/\(/g, '')
                  .replace(/\)/g, '')
                  .toLowerCase();
    }

    function checkAnswer() {
        let userInput = normalizeLatex(mathField.latex());
        let expected = normalizeLatex(quizData[currentIndex].answer);
        let expectedParts = expected.split('=');
        let isCorrect = false;

        if (expectedParts.length > 1) {
            isCorrect = expectedParts.every(p => userInput.includes(p)) || userInput === expected;
        } else {
            isCorrect = userInput === expected;
        }

        if (isCorrect) {
            score++;
            $('#feedback').text('Correct! 🎉').css('color', '#16a34a');
            $('#math-field').addClass('correct-glow');
            setTimeout(() => {
                $('#math-field').removeClass('correct-glow');
                currentIndex++;
                loadQuestion();
                $('#feedback').text('');
                $('#score').text(score);
            }, 800);
        } else {
            $('#feedback').text('Incorrect. Check notation or sign.').css('color', '#dc2626');
            $('#submit-btn').addClass('bg-red-500').removeClass('bg-indigo-600');
            setTimeout(() => $('#submit-btn').addClass('bg-indigo-600').removeClass('bg-red-500'), 500);
        }
    }

    function updateProgressBar() {
        $('#progress-bar').css('width', (currentIndex / totalQ) * 100 + '%');
    }

    function showResults() {
        $('.p-4.sm\\:p-6').html(`
            <div class="text-center py-8">
                <div class="text-4xl mb-3">🏅</div>
                <h2 class="text-2xl font-bold text-slate-800 mb-1">Quiz Complete!</h2>
                <p class="text-slate-500 mb-6">Final Score: <span class="font-bold text-indigo-600">${score}/${totalQ}</span></p>
                <div class="flex gap-3 justify-center">
                    <button onclick="location.reload()" class="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700">Restart Quiz</button>
                    <a href="library.html" class="bg-white border border-slate-200 text-slate-700 px-8 py-3 rounded-xl font-bold shadow-md hover:bg-slate-50">My Library</a>
                </div>
            </div>
        `);
        $('.keypad-container').hide();
        $('#progress-bar').css('width', '100%');
    }

    $('.keypad-btn').on('click touchstart', function(e) {
        e.preventDefault();
        const cmd = $(this).attr('data-cmd');
        if (!cmd) return;
        mathField.focus();
        if (cmd === '^2') { mathField.write('^2'); }
        else if (cmd === '^') { mathField.write('^'); }
        else if (cmd === '\\frac') { mathField.write('\\frac{ }{ }'); mathField.keystroke('Left'); mathField.keystroke('Left'); }
        else if (cmd === '\\sqrt') { mathField.write('\\sqrt{ }'); mathField.keystroke('Left'); }
        else if (['\\sin','\\cos','\\tan','\\csc','\\sec','\\cot','\\ln'].includes(cmd)) { mathField.write(cmd + '\\left(\\right)'); mathField.keystroke('Left'); }
        else if (cmd.includes('lim')) { mathField.write(cmd); mathField.keystroke('Left'); }
        else { mathField.write(cmd); }
    });

    $('#backspace-btn').on('click touchstart', function(e) {
        e.preventDefault();
        mathField.focus();
        mathField.keystroke('Backspace');
    });

    $('#submit-btn').on('click', checkAnswer);
    setTimeout(() => mathField.focus(), 500);
    loadQuestion();
}

/* -------------------------------------------------------
   BOOTSTRAP — detect ?id= param, then auth, then load
   ------------------------------------------------------- */
const params = new URLSearchParams(window.location.search);
const quizId = params.get('id');

// Show sidebar auth state immediately
onAuthStateChanged(auth, async (user) => {
    renderAuthSection(user);

    if (quizId && user) {
        // Load from Firestore
        document.getElementById('quiz-loading').style.display = 'flex';
        try {
            const quizDoc = await getDoc(doc(db, 'users', user.uid, 'quizzes', quizId));
            if (quizDoc.exists()) {
                const data = quizDoc.data();
                // Update page title with quiz name
                document.title = `${data.title} — Mathmerize`;
                // Update disclaimer with quiz code
                if (data.code) {
                    document.getElementById('quiz-disclaimer').textContent =
                        `Quiz code: ${data.code}  ·  Share this with others to let them play the same set!`;
                }
                // Wait for jQuery/MathQuill to be ready
                $(document).ready(() => initQuiz([...data.questions]));
            } else {
                showError('Quiz not found. It may have been deleted.');
            }
        } catch (err) {
            console.error(err);
            showError('Failed to load quiz. Check your connection.');
        }
    } else {
        // Fallback: use built-in question bank
        $(document).ready(() => initQuiz([...FALLBACK_QUIZ]));
    }
});

function showError(msg) {
    document.getElementById('quiz-loading').style.display = 'none';
    document.getElementById('quiz-wrapper').style.display = 'block';
    document.querySelector('.quiz-main').innerHTML += `
        <div style="text-align:center;padding:40px;color:#ef4444;font-size:0.9rem;max-width:400px;margin-top:24px;">
            <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin:0 auto 12px;color:#fca5a5;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <p>${msg}</p>
            <a href="library.html" style="display:inline-block;margin-top:16px;color:#6366f1;font-weight:600;">← Back to Library</a>
        </div>`;
    document.getElementById('quiz-wrapper').style.display = 'none';
}
