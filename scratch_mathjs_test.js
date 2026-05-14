const math = require('mathjs');

const tests = [
    "2 * sin(x) * cos(x)",
    "2sin(x)cos(x)", // implicit
    "sin(x)cos(z)",
    "2 * b * c * cos(A)",
    "2bc cos(A)",
    "(sin(x))^2 - (cos(x))^2"
];

tests.forEach(t => {
    try {
        console.log(t, "=>", math.evaluate(t, {x: 1, z: 2, A: 1.5, b: 2, c: 3}));
    } catch(e) {
        console.log(t, "=> ERROR", e.message);
    }
});
