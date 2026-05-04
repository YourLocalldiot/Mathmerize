$(document).ready(function() {
    /**
     * -----------------------------------------------------------------
     * QUESTION BANK (Synced from your Google Doc)
     * -----------------------------------------------------------------
     */
    const quizData = [
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
        // Double Angle Identities
        { prompt: "Expand the expression", text: "\\sin(2x)", answer: "2\\sin(x)\\cos(x)" },
        { prompt: "Expand (all possible forms, separate with =)", text: "\\cos(2x)", answer: "\\cos^2(x)-\\sin^2(x)=2\\cos^2(x)-1=1-2\\sin^2(x)" },
        { prompt: "Expand the expression", text: "\\tan(2x)", answer: "\\frac{2\\tan(x)}{1-\\tan^2(x)}" },
        // Rule Sets
        { prompt: "Type the sine rule (A, B, C)", text: "\\triangle ABC", answer: "\\frac{\\sin(A)}{a}=\\frac{\\sin(B)}{b}=\\frac{\\sin(C)}{c}" },
        { prompt: "Type the cosine rule for a²", text: "\\triangle ABC", answer: "a^2=b^2+c^2-2bc\\cos(A)" },
        { prompt: "Type the cosine rule for b²", text: "\\triangle ABC", answer: "b^2=a^2+c^2-2ac\\cos(B)" },
        { prompt: "Type the cosine rule for c²", text: "\\triangle ABC", answer: "c^2=a^2+b^2-2ab\\cos(C)" }
    ];

    function shuffle(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
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
        if (currentIndex >= totalQ) {
            showResults();
            return;
        }
        const q = quizData[currentIndex];
        $('#question-prompt').text(q.prompt);
        katex.render(q.text, document.getElementById('question-display'), { throwOnError: false });
        mathField.latex('');
        mathField.focus();
        $('#q-number').text(currentIndex + 1);
        updateProgressBar();
    }

    function normalizeLatex(str) {
        // Remove spaces, backslashes from simple signs, and force lowercase for comparison
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
        
        // Handle multi-part answers (like cos 2x)
        let expectedParts = expected.split('=');
        let isCorrect = false;

        if (expectedParts.length > 1) {
            // Check if user input contains all parts or matches the specific chained string
            isCorrect = expectedParts.every(part => userInput.includes(part)) || userInput === expected;
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
                <button onclick="location.reload()" class="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700">Restart Quiz</button>
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

        if (cmd === '^2') {
            mathField.write('^2');
        } else if (cmd === '^') {
            mathField.write('^');
        } else if (cmd === '\\frac') {
            mathField.write('\\frac{ }{ }');
            mathField.keystroke('Left');
            mathField.keystroke('Left');
        } else if (cmd === '\\sqrt') {
            mathField.write('\\sqrt{ }');
            mathField.keystroke('Left');
        } else if (['\\sin', '\\cos', '\\tan', '\\csc', '\\sec', '\\cot', '\\ln'].includes(cmd)) {
            mathField.write(cmd + '\\left(\\right)');
            mathField.keystroke('Left');
        } else if (cmd.includes('lim')) {
            mathField.write(cmd);
            mathField.keystroke('Left');
        } else {
            mathField.write(cmd);
        }
    });

    $('#backspace-btn').on('click touchstart', function(e) {
        e.preventDefault();
        mathField.focus();
        mathField.keystroke('Backspace');
    });

    $('#submit-btn').on('click', checkAnswer);
    
    setTimeout(() => mathField.focus(), 500);
    loadQuestion();
});
