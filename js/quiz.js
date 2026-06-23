/**
 * quiz.js — ES Module
 * - If URL has ?id=<quizId>, loads that quiz from Firestore (users/{uid}/quizzes/{id})
 * - Otherwise falls back to the built-in hard-coded question bank
 */

import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
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
    { prompt: "Expand the expression", text: "\\cos(x+z)", answer: "\\cos(x)\\cos(z)-\\sin(x)\\sin(z)" },
    { prompt: "Expand the expression", text: "\\cos(x-z)", answer: "\\cos(x)\\cos(z)+\\sin(x)\\sin(z)" },
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
                <div class="auth-user-info" style="display:flex;align-items:center;gap:10px;min-width:0;">
                    <div class="auth-avatar" style="width:38px;height:38px;border-radius:50%;background:#eef2ff;color:#4f46e5;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0;">
                        ${initial}
                    </div>
                    <div class="auth-user-text" style="min-width:0;overflow:hidden;">
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
function initQuiz(quizData, isRandomize) {
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

    if (isRandomize) {
        shuffle(quizData);
    }

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

    function latexToMathJS(str) {
        if (!str) return '0';
        let res = str;
        res = res.replace(/\\left/g, '');
        res = res.replace(/\\right/g, '');
        res = res.replace(/\\cdot/g, '*');
        res = res.replace(/\\times/g, '*');
        
        while(res.includes('\\frac')) {
            let prev = res;
            res = extractAndReplaceFrac(res);
            if (res === prev) break;
        }
        
        res = res.replace(/\\(sin|cos|tan|csc|sec|cot)\^(\d+)\(([^)]+)\)/g, '($1($3))^$2');
        res = res.replace(/\\(sin|cos|tan|csc|sec|cot)\^(\d+)\{([^}]+)\}/g, '($1($3))^$2');
        
        res = res.replace(/\\(sin|cos|tan|csc|sec|cot)\(/g, '$1(');
        res = res.replace(/\\ln\(/g, 'log(');
        res = res.replace(/\\pi/g, 'pi');
        
        res = res.replace(/sin/g, 'F1');
        res = res.replace(/cos/g, 'F2');
        res = res.replace(/tan/g, 'F3');
        res = res.replace(/csc/g, 'F4');
        res = res.replace(/sec/g, 'F5');
        res = res.replace(/cot/g, 'F6');
        res = res.replace(/log/g, 'F7');
        res = res.replace(/pi/g, 'F8');
        
        while(/(?:[a-zA-Z])(?:[a-zA-Z])/.test(res)) {
            res = res.replace(/([a-zA-Z])([a-zA-Z])/g, '$1*$2');
        }
        
        res = res.replace(/F\*1/g, 'sin');
        res = res.replace(/F\*2/g, 'cos');
        res = res.replace(/F\*3/g, 'tan');
        res = res.replace(/F\*4/g, 'csc');
        res = res.replace(/F\*5/g, 'sec');
        res = res.replace(/F\*6/g, 'cot');
        res = res.replace(/F\*7/g, 'log');
        res = res.replace(/F\*8/g, 'pi');
        
        res = res.replace(/\\/g, '');

        return res;
    }

    function extractAndReplaceFrac(str) {
        let idx = str.indexOf('\\frac');
        if (idx === -1) return str;
        
        function getGroup(start) {
            let count = 0;
            let i = start;
            let val = "";
            if (str[i] !== '{') return null;
            for (; i < str.length; i++) {
                if (str[i] === '{') count++;
                else if (str[i] === '}') count--;
                val += str[i];
                if (count === 0) break;
            }
            return { val, end: i };
        }
        
        let num = getGroup(idx + 5);
        if (!num) return str.replace('\\frac', 'frac');
        let den = getGroup(num.end + 1);
        if (!den) return str.replace('\\frac', 'frac');
        
        let before = str.substring(0, idx);
        let after = str.substring(den.end + 1);
        
        let nStr = num.val.substring(1, num.val.length - 1);
        let dStr = den.val.substring(1, den.val.length - 1);
        
        return before + '(' + nStr + ')/(' + dStr + ')' + after;
    }

    function areEquivalent(latex1, latex2) {
        let expr1 = latexToMathJS(latex1);
        let expr2 = latexToMathJS(latex2);
        try {
            for(let i=0; i<3; i++) {
                let scope = {
                    x: Math.random() * 2 + 1, z: Math.random() * 2 + 1,
                    A: Math.random() * 2 + 1, B: Math.random() * 2 + 1, C: Math.random() * 2 + 1,
                    a: Math.random() * 2 + 1, b: Math.random() * 2 + 1, c: Math.random() * 2 + 1
                };
                let val1 = math.evaluate(expr1, scope);
                let val2 = math.evaluate(expr2, scope);
                if (Math.abs(val1 - val2) > 1e-6) return false;
            }
            return true;
        } catch(e) { return false; }
    }

    function checkAnswer() {
        let userInput = mathField.latex();
        let expected = quizData[currentIndex].answer;
        
        let userParts = userInput.split('=');
        let expectedParts = expected.split('=');
        let isCorrect = false;

        if (expectedParts.length === 1) {
            if (userParts.length === 1) {
                isCorrect = areEquivalent(userParts[0], expectedParts[0]);
            }
        } else if (expectedParts.length === 2) {
            let isIdentity = areEquivalent(expectedParts[0], expectedParts[1]);
            if (isIdentity) {
                isCorrect = userParts.every(up => areEquivalent(up, expectedParts[0])) && userParts.length >= 1;
            } else {
                if (userParts.length === 2) {
                    let L1 = expectedParts[0], R1 = expectedParts[1];
                    let L2 = userParts[0], R2 = userParts[1];
                    let exprExpected = `(${latexToMathJS(L1)})-(${latexToMathJS(R1)})`;
                    let exprUser = `(${latexToMathJS(L2)})-(${latexToMathJS(R2)})`;
                    let eqMatch = true;
                    try {
                        for(let i=0; i<3; i++) {
                            let scope = {
                                x: Math.random() * 2 + 1, z: Math.random() * 2 + 1,
                                A: Math.random() * 2 + 1, B: Math.random() * 2 + 1, C: Math.random() * 2 + 1,
                                a: Math.random() * 2 + 1, b: Math.random() * 2 + 1, c: Math.random() * 2 + 1
                            };
                            let valE = math.evaluate(exprExpected, scope);
                            let valU = math.evaluate(exprUser, scope);
                            if (Math.abs(valE - valU) > 1e-6 && Math.abs(valE + valU) > 1e-6) {
                                eqMatch = false; break;
                            }
                        }
                        isCorrect = eqMatch;
                    } catch(e) { isCorrect = false; }
                }
            }
        } else if (expectedParts.length > 2) {
            let isIdentity = areEquivalent(expectedParts[0], expectedParts[1]);
            if (isIdentity) {
                let allEquiv = userParts.every(up => areEquivalent(up, expectedParts[0]));
                isCorrect = allEquiv && userParts.length >= expectedParts.length;
            }
        }

        if (!isCorrect) {
            let uStr = normalizeLatex(userInput);
            let eStr = normalizeLatex(expected);
            if (expectedParts.length > 1) {
                isCorrect = expectedParts.every(p => uStr.includes(normalizeLatex(p))) || uStr === eStr;
            } else {
                isCorrect = uStr === eStr;
            }
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

    function revealAnswer() {
        const answerLatex = quizData[currentIndex].answer;
        const feedbackEl = document.getElementById('feedback');
        feedbackEl.style.color = '#b45309';
        feedbackEl.style.height = 'auto';
        feedbackEl.innerHTML = 'Answer: <span id="reveal-katex"></span>';
        try {
            katex.render(answerLatex, document.getElementById('reveal-katex'), { throwOnError: false });
        } catch(e) {
            document.getElementById('reveal-katex').textContent = answerLatex;
        }
        // Clear the field so the student types the answer themselves
        mathField.latex('');
        mathField.focus();
    }

    function updateProgressBar() {
        $('#progress-bar').css('width', (currentIndex / totalQ) * 100 + '%');
    }

    function showResults() {
        const isGuest = !auth.currentUser;
        const actionBtn = isGuest 
            ? `<a href="auth.html" class="bg-white border border-slate-200 text-slate-700 px-8 py-3 rounded-xl font-bold shadow-md hover:bg-slate-50">Log in</a>`
            : `<a href="library.html" class="bg-white border border-slate-200 text-slate-700 px-8 py-3 rounded-xl font-bold shadow-md hover:bg-slate-50">My Library</a>`;

        $('.p-4.sm\\:p-6').html(`
            <div class="text-center py-8">
                <div class="text-4xl mb-3">🏅</div>
                <h2 class="text-2xl font-bold text-slate-800 mb-1">Quiz Complete!</h2>
                <p class="text-slate-500 mb-6">Final Score: <span class="font-bold text-indigo-600">${score}/${totalQ}</span></p>
                <div class="flex gap-3 justify-center">
                    <button onclick="location.reload()" class="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700">Restart Quiz</button>
                    ${actionBtn}
                </div>
            </div>
        `);
        $('.mk-wrapper, .keypad-container').hide();
        $('#progress-bar').css('width', '100%');
    }

    // ---- Keyboard helper ----
    function execMkCmd(cmd, field) {
        if (!field) return;
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
    }

    // ---- Keyboard Toggles & State ----
    let isShifted = false;
    const abcKeyboard = document.getElementById('quiz-abc-keyboard');
    const mainKeyboard = document.getElementById('quiz-main-keyboard');

    document.querySelectorAll('.mk-abc-toggle').forEach(btn => {
        const handler = (e) => { e.preventDefault(); mainKeyboard.classList.add('hidden'); abcKeyboard.classList.add('active'); };
        btn.addEventListener('click', handler); btn.addEventListener('touchstart', handler, { passive: false });
    });

    document.querySelectorAll('.mk-num-toggle').forEach(btn => {
        const handler = (e) => { e.preventDefault(); abcKeyboard.classList.remove('active'); mainKeyboard.classList.remove('hidden'); };
        btn.addEventListener('click', handler); btn.addEventListener('touchstart', handler, { passive: false });
    });

    document.querySelectorAll('.mk-shift-btn').forEach(btn => {
        const handler = (e) => { e.preventDefault(); isShifted = !isShifted; abcKeyboard.classList.toggle('shifted', isShifted); };
        btn.addEventListener('click', handler); btn.addEventListener('touchstart', handler, { passive: false });
    });

    document.querySelectorAll('.mk-enter-btn').forEach(btn => {
        const handler = (e) => { e.preventDefault(); checkAnswer(); };
        btn.addEventListener('click', handler); btn.addEventListener('touchstart', handler, { passive: false });
    });

    // ---- Wire new mk-btn buttons ----
    document.querySelectorAll('#quiz-mk-wrapper [data-mk-cmd]').forEach(btn => {
        const handler = function(e) {
            e.preventDefault();
            let cmd = this.getAttribute('data-mk-cmd');
            if (this.classList.contains('letter') && isShifted) {
                cmd = cmd.toUpperCase();
            }
            execMkCmd(cmd, mathField);
        };
        btn.addEventListener('click', handler);
        btn.addEventListener('touchstart', handler, { passive: false });
    });

    // ---- Functions panel toggle ----
    const fnToggle = document.getElementById('quiz-fn-toggle');
    const fnPanel = document.getElementById('quiz-fn-panel');
    if (fnToggle && fnPanel) {
        fnToggle.addEventListener('click', () => {
            const isOpen = fnPanel.classList.toggle('open');
            fnToggle.classList.toggle('active', isOpen);
        });
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!fnToggle.contains(e.target) && !fnPanel.contains(e.target)) {
                fnPanel.classList.remove('open');
                fnToggle.classList.remove('active');
            }
        });
    }

    // ---- Left / Right navigation ----
    const leftBtn = document.getElementById('quiz-left-btn');
    const rightBtn = document.getElementById('quiz-right-btn');
    if (leftBtn) leftBtn.addEventListener('click', () => { mathField.focus(); mathField.keystroke('Left'); });
    if (rightBtn) rightBtn.addEventListener('click', () => { mathField.focus(); mathField.keystroke('Right'); });

    // ---- Backspace ----
    $('#backspace-btn, #quiz-abc-keyboard .mk-backspace-btn').on('click touchstart', function(e) {
        e.preventDefault();
        mathField.focus();
        mathField.keystroke('Backspace');
    });

    $('#submit-btn').on('click', checkAnswer);
    $('#reveal-btn').on('click', revealAnswer);
    setTimeout(() => mathField.focus(), 500);
    loadQuestion();
}

/* -------------------------------------------------------
   BOOTSTRAP — detect ?id= param, then auth, then load
   ------------------------------------------------------- */
const params = new URLSearchParams(window.location.search);
const quizId = params.get('id');
const urlCode = params.get('code');

// Show sidebar auth state immediately
onAuthStateChanged(auth, async (user) => {
    renderAuthSection(user);

    if (urlCode) {
        document.getElementById('quiz-loading').style.display = 'flex';
        try {
            const q = query(collection(db, 'quizzes'), where('code', '==', urlCode));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const quizDoc = querySnapshot.docs[0];
                const data = quizDoc.data();
                
                document.title = `${data.title} — Mathmerize`;
                const titleDisplay = document.getElementById('quiz-title-display');
                if (titleDisplay) titleDisplay.textContent = data.title;

                if (data.code) {
                    const codeDisplay = document.getElementById('quiz-code-display');
                    const codeBox = document.getElementById('quiz-code-box-display');
                    if (codeDisplay && codeBox) {
                        codeDisplay.textContent = data.code;
                        codeBox.classList.remove('hidden');
                    }
                }
                $(document).ready(() => initQuiz([...data.questions], data.randomize));
            } else {
                showError('Quiz not found. Check your code.');
            }
        } catch (err) {
            console.error(err);
            showError('Failed to load quiz. Check your connection.');
        }
    } else if (quizId) {
        // Load from Firestore using ID
        document.getElementById('quiz-loading').style.display = 'flex';
        try {
            const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
            if (quizDoc.exists()) {
                const data = quizDoc.data();
                // Update page title with quiz name
                document.title = `${data.title} — Mathmerize`;
                const titleDisplay = document.getElementById('quiz-title-display');
                if (titleDisplay) titleDisplay.textContent = data.title;

                // Update quiz code
                if (data.code) {
                    const codeDisplay = document.getElementById('quiz-code-display');
                    const codeBox = document.getElementById('quiz-code-box-display');
                    if (codeDisplay && codeBox) {
                        codeDisplay.textContent = data.code;
                        codeBox.classList.remove('hidden');
                    }
                }
                // Wait for jQuery/MathQuill to be ready
                $(document).ready(() => initQuiz([...data.questions], data.randomize));
            } else {
                showError('Quiz not found. It may have been deleted.');
            }
        } catch (err) {
            console.error(err);
            showError('Failed to load quiz. Check your connection.');
        }
    } else {
        // Fallback: use built-in question bank
        $(document).ready(() => initQuiz([...FALLBACK_QUIZ], true));
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
