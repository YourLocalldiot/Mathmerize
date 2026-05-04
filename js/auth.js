import { auth } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('show-login');
    const btnSignup = document.getElementById('show-signup');
    const formLogin = document.getElementById('login-form');
    const formSignup = document.getElementById('signup-form');

    btnLogin.addEventListener('click', () => {
        btnLogin.classList.add('active', 'text-indigo-600');
        btnLogin.classList.remove('text-slate-500');
        
        btnSignup.classList.remove('active', 'text-indigo-600');
        btnSignup.classList.add('text-slate-500');

        formLogin.classList.remove('hidden');
        formLogin.classList.add('block');
        formSignup.classList.remove('block');
        formSignup.classList.add('hidden');
    });

    btnSignup.addEventListener('click', () => {
        btnSignup.classList.add('active', 'text-indigo-600');
        btnSignup.classList.remove('text-slate-500');
        
        btnLogin.classList.remove('active', 'text-indigo-600');
        btnLogin.classList.add('text-slate-500');

        formSignup.classList.remove('hidden');
        formSignup.classList.add('block');
        formLogin.classList.remove('block');
        formLogin.classList.add('hidden');
    });

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        
        try {
            submitBtn.innerText = 'Signing In...';
            submitBtn.disabled = true;
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = '../index.html';
        } catch (error) {
            alert('Login failed: ' + error.message);
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });

    formSignup.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = e.target.querySelector('input[type="text"]').value;
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        
        try {
            submitBtn.innerText = 'Creating Account...';
            submitBtn.disabled = true;
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            window.location.href = '../index.html';
        } catch (error) {
            alert('Signup failed: ' + error.message);
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
});
