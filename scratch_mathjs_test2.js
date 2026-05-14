function latexToMathJS(str) {
    if (!str) return '0';
    let res = str;
    res = res.replace(/\\left/g, '');
    res = res.replace(/\\right/g, '');
    res = res.replace(/\\cdot/g, '*');
    res = res.replace(/\\times/g, '*');
    
    // Fractions
    while(res.includes('\\frac')) {
        let prev = res;
        res = extractAndReplaceFrac(res);
        if (res === prev) break;
    }
    
    // Trig powers
    res = res.replace(/\\(sin|cos|tan|csc|sec|cot)\^(\d+)\(([^)]+)\)/g, '($1($3))^$2');
    res = res.replace(/\\(sin|cos|tan|csc|sec|cot)\^(\d+)\{([^}]+)\}/g, '($1($3))^$2');
    
    // Trig functions
    res = res.replace(/\\(sin|cos|tan|csc|sec|cot)\(/g, '$1(');
    res = res.replace(/\\ln\(/g, 'log(');
    res = res.replace(/\\pi/g, 'pi');
    
    // Temporarily mask functions
    res = res.replace(/sin/g, 'F1');
    res = res.replace(/cos/g, 'F2');
    res = res.replace(/tan/g, 'F3');
    res = res.replace(/csc/g, 'F4');
    res = res.replace(/sec/g, 'F5');
    res = res.replace(/cot/g, 'F6');
    res = res.replace(/log/g, 'F7');
    res = res.replace(/pi/g, 'F8');
    
    // Add * between letters
    while(/(?:[a-zA-Z])(?:[a-zA-Z])/.test(res)) {
        res = res.replace(/([a-zA-Z])([a-zA-Z])/g, '$1*$2');
    }
    
    // Restore
    res = res.replace(/F\*1/g, 'sin');
    res = res.replace(/F\*2/g, 'cos');
    res = res.replace(/F\*3/g, 'tan');
    res = res.replace(/F\*4/g, 'csc');
    res = res.replace(/F\*5/g, 'sec');
    res = res.replace(/F\*6/g, 'cot');
    res = res.replace(/F\*7/g, 'log');
    res = res.replace(/F\*8/g, 'pi');
    
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

console.log(latexToMathJS('2bc\\cos(A)'));
console.log(latexToMathJS('\\cos^2(x)-\\sin^2(x)'));
console.log(latexToMathJS('\\frac{\\tan(x)+\\tan(z)}{1-\\tan(x)\\tan(z)}'));
