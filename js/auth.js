/* ==========================================================================
   ACHIE Authentication, Routing & Dashboard Happy Path Interactivity
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    /* ----------------------------------------------------------------------
       1. FORM SWITCHING & AUTH ENGINE (Scoping Element Targets Safely)
       ---------------------------------------------------------------------- */
    const loginBox = document.getElementById('login-box');
    const signupBox = document.getElementById('signup-box');
    const linkToSignup = document.getElementById('link-to-signup');
    const linkToLogin = document.getElementById('link-to-login');
    const formLogin = document.getElementById('form-login');
    const formSignup = document.getElementById('form-signup');

    // Run auth handlers only if elements are present on the current layout page
    if (linkToSignup && linkToLogin) {
        linkToSignup.addEventListener('click', (e) => {
            e.preventDefault();
            loginBox.classList.add('hidden');
            signupBox.classList.remove('hidden');
            window.location.hash = 'signup'; 
        });

        linkToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            signupBox.classList.add('hidden');
            loginBox.classList.remove('hidden');
            window.location.hash = 'login';
        });

        // Hash check alignment for incoming landing page cross-transfers
        if (window.location.hash === '#signup') {
            loginBox.classList.add('hidden');
            signupBox.classList.remove('hidden');
        }
    }

    // Login Form Processing Workflow
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault(); 
            
            const email = document.getElementById('login-email').value.trim();
            const loginBtn = document.getElementById('btn-login');

            if (!email) return; 

            const studentName = email.split('@')[0];

            loginBtn.innerText = "Syncing with ACHIE...";
            loginBtn.style.backgroundColor = "var(--color-slate-light)";
            loginBtn.disabled = true;

            setTimeout(() => {
                localStorage.setItem('achie_username', studentName);
                localStorage.setItem('achie_is_logged_in', 'true');
                window.location.href = 'dashboard.html';
            }, 1200);
        });
    }

    // Signup Form Processing Workflow
    if (formSignup) {
        formSignup.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('signup-name').value.trim();
            const signupBtn = document.getElementById('btn-signup');

            if (!name) return;

            signupBtn.innerText = "Creating Profile...";
            signupBtn.style.backgroundColor = "var(--color-slate-light)";
            signupBtn.disabled = true;

            setTimeout(() => {
                localStorage.setItem('achie_username', name);
                localStorage.setItem('achie_is_logged_in', 'true');

                signupBtn.innerText = "Account Created! Redirecting...";
                signupBtn.style.backgroundColor = "var(--color-mint-dark)";

                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 800);

            }, 1200);
        });
    }

    /* ----------------------------------------------------------------------
       2. DASHBOARD SCHEDULER & TIMER ENGINE (Strictly Happy Path)
       ---------------------------------------------------------------------- */
    const timerDisplay = document.getElementById('timer-display');
    const timerToggleBtn = document.getElementById('btn-timer-toggle');
    const timerResetBtn = document.getElementById('btn-timer-reset');
    const addBlockBtn = document.getElementById('btn-add-block');
    const timelineList = document.getElementById('timeline-list');

    let timerInterval = null;
    let totalSeconds = 25 * 60; // Standard 25 Minutes Focus Duration Block
    let isRunning = false;

    function updateTimerUI() {
        if (!timerDisplay) return;
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        timerDisplay.innerText = `${minutes}:${seconds}`;
    }

    // Timer Running States Hook
    if (timerToggleBtn) {
        timerToggleBtn.addEventListener('click', () => {
            if (!isRunning) {
                isRunning = true;
                timerToggleBtn.innerText = "Pause Session";
                timerToggleBtn.style.backgroundColor = "var(--color-slate-dark)";
                
                timerInterval = setInterval(() => {
                    if (totalSeconds > 0) {
                        totalSeconds--;
                        updateTimerUI();
                    } else {
                        clearInterval(timerInterval);
                        isRunning = false;
                        timerToggleBtn.innerText = "Session Done";
                        timerToggleBtn.disabled = true;
                    }
                }, 1000);
            } else {
                isRunning = false;
                clearInterval(timerInterval);
                timerToggleBtn.innerText = "Resume Session";
                timerToggleBtn.style.backgroundColor = "var(--color-mint-green)";
            }
        });
    }

    // Timer Counter Reset Hook
    if (timerResetBtn) {
        timerResetBtn.addEventListener('click', () => {
            clearInterval(timerInterval);
            isRunning = false;
            totalSeconds = 25 * 60;
            updateTimerUI();
            if (timerToggleBtn) {
                timerToggleBtn.disabled = false;
                timerToggleBtn.innerText = "Start Focus Block";
                timerToggleBtn.style.backgroundColor = "var(--color-mint-green)";
            }
        });
    }

    // Schedule Block Dynamic Insertion Hook
    if (addBlockBtn && timelineList) {
        addBlockBtn.addEventListener('click', () => {
            const newBlock = document.createElement('div');
            newBlock.className = 'timeline-item';
            newBlock.innerHTML = `
                <span class="time-tag">03:30 PM</span>
                <p class="task-desc">Figma Interactive Prototyping Sandbox</p>
            `;
            timelineList.appendChild(newBlock);
            
            addBlockBtn.innerText = "Slot Allocated";
            addBlockBtn.disabled = true;
            addBlockBtn.style.opacity = "0.6";
            addBlockBtn.style.cursor = "default";
        });
    }

    /* ----------------------------------------------------------------------
       3. USER GREETER INTEGRATION HANDSHAKE
       ---------------------------------------------------------------------- */
    const greetingElement = document.getElementById('user-greeting');
    if (greetingElement) {
        const savedUsername = localStorage.getItem('achie_username') || 'Student';
        greetingElement.innerText = savedUsername;
    }
});