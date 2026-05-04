import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC8XmVmjxeS85WWS0Q2dcGqexkzepHVh0Y",
  authDomain: "mathmerize-b4085.firebaseapp.com",
  projectId: "mathmerize-b4085",
  storageBucket: "mathmerize-b4085.firebasestorage.app",
  messagingSenderId: "950467286415",
  appId: "1:950467286415:web:af25f597192cc58b7f27fa",
  measurementId: "G-C63XJ82CM9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
