/* ==========================================================================
   ACHIE Main Application Engine - Modular Component Architecture
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    /* --- Guard System Verification --- */
    const isLoggedIn = localStorage.getItem('achie_is_logged_in');
    const storedName = localStorage.getItem('achie_username');
    
    if (!isLoggedIn) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('student-name').innerText = storedName || "Student";

    /* --- App State Trackers --- */
    // Global metrics history trackers
    let totalTasksAddedHistory = 4; // Initial baseline array size
    let totalTasksCompletedHistory = 0;
    let totalDeferredInterventions = 0; // State-calculated metric derived from array status
    let totalCompletedPomodoros = 0; // Increments automatically when your countdown hits zero
    let currentXP = 0;
    let currentEnergyState = 'medium'; 
    let globalTasksDatabase = [
        { id: 1, text: "Outline methodology section for Research Thesis", intensity: "heavy", completed: false },
        { id: 2, text: "Review chapter 4 math proofs before seminar", intensity: "heavy", completed: false },
        { id: 3, text: "Organize raw citations into shared bibliography folder", intensity: "light", completed: false },
        { id: 4, text: "Draft reply emails to project teammates", intensity: "light", completed: false }
    ];

// Global mascot & functional tracker configurations
    let isTalking = false;
    let pomoTimerInterval = null;
    let pomoSecondsRemaining = 25 * 60; // Default 25-minute baseline session track
    let homeClockInterval = null; // Background loop engine for date & time

    // PERSISTENT POMODORO STATES
    let pomoCurrentMode = 'work';       // 'work', 'short-break', 'long-break'
    let pomoCompletedCycles = 0;        // Tracks completed cycles globally
    const POMO_DURATIONS = {
        'work': 25 * 60,
        'short-break': 5 * 60,
        'long-break': 15 * 60
    };


    /* ==========================================================================
       I. SIDEBAR COLLAPSE & PERSISTENCE MECHANISM
       ========================================================================== */
    const sidebar = document.getElementById('main-sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');

    // Restore user layout configuration memory baseline on boot execution
    if (localStorage.getItem('sidebar_collapsed') === 'true') {
        if (sidebar) sidebar.classList.add('collapsed');
    }

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            
            // Persist layout preferences across reload boundaries
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebar_collapsed', isCollapsed);
        });
    }


    /* ==========================================================================
       II. DYNAMIC SECTION LAYER LOADER (Asynchronous Engine)
       ========================================================================== */
    const contentRoot = document.getElementById('dynamic-content-root');
    const menuItems = document.querySelectorAll('.menu-item');

    async function loadSection(sectionName) {
        try {
            // REMOVED: clearInterval(pomoTimerInterval) so the timer keeps ticking!

            const response = await fetch(`sections/${sectionName}.html`);
            if (!response.ok) throw new Error(`Could not load section: ${sectionName}`);
            
            const htmlContent = await response.text();
            contentRoot.innerHTML = htmlContent;

            if (sectionName === 'home') initHomeMascot();
            if (sectionName === 'scheduler') initAdaptiveScheduler();
            if (sectionName === 'analytics') initAnalyticsDashboard();
            if (sectionName === 'support') initSupportModalHooks();
            if (sectionName === 'folder') initResourceFolder();

        } catch (error) {
            console.error("Component initialization mapping error:", error);
            contentRoot.innerHTML = `<div class="section-card"><h3>Error</h3><p>Failed to load view window space.</p></div>`;
        }
    }

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(menu => menu.classList.remove('active'));
            item.classList.add('active');
            
            const targetSection = item.getAttribute('data-target');
            loadSection(targetSection);
        });
    });

    function startGlobalPomoTicker() {
        // Prevent duplicate loops from spawning
        if (pomoTimerInterval) return;

        pomoTimerInterval = setInterval(() => {
            if (pomoSecondsRemaining > 0) {
                pomoSecondsRemaining--;
                
                // Real-time Update: If the student is actively viewing the scheduler, refresh the digits live
                const timerDisplayField = document.getElementById('pomo-timer-display');
                if (timerDisplayField) {
                    const minutes = Math.floor(pomoSecondsRemaining / 60);
                    const seconds = pomoSecondsRemaining % 60;
                    timerDisplayField.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            } else {
                // If it hits zero, trigger the completion handler
                handleGlobalSessionCompletion();
            }
        }, 1000);
    }

    function startGlobalHomeClock() {
        // Stop any old loops from running to prevent ticking duplicates
        if (homeClockInterval) clearInterval(homeClockInterval);

        function refreshTimeLayout() {
            const clockField = document.getElementById('home-clock-display');
            const dateField = document.getElementById('home-date-display');
            const greetingField = document.getElementById('home-greeting-title');
            
            // If the element isn't currently loaded on screen, don't waste system processing power
            if (!clockField && !dateField) return;

            const now = new Date();

            // 1. Calculate Standard 12-Hour Time string with seconds
            let hours = now.getHours();
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            
            hours = hours % 12;
            hours = hours ? hours : 12; // Change '0' string to '12'
            const formattedHours = hours.toString().padStart(2, '0');

            if (clockField) {
                clockField.innerText = `${formattedHours}:${minutes}:${seconds} ${ampm}`;
            }

            // 2. Generate Readable Calendar Date String
            if (dateField) {
                const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
                dateField.innerText = now.toLocaleDateString('en-US', options);
            }

            // 3. Dynamic contextual student greeting text modification
            if (greetingField) {
                const currentHour = now.getHours();
                if (currentHour < 12) {
                    greetingField.innerText = "Good Morning, Student!";
                } else if (currentHour < 18) {
                    greetingField.innerText = "Good Afternoon, Student!";
                } else {
                    greetingField.innerText = "Good Evening, Student!";
                }
            }
        }

        // Fire instantly on load so there is zero layout blink delay
        refreshTimeLayout();
        homeClockInterval = setInterval(refreshTimeLayout, 1000);
    }

    function handleGlobalSessionCompletion() {
        clearInterval(pomoTimerInterval);
        pomoTimerInterval = null;

        if (pomoCurrentMode === 'work') {
            pomoCompletedCycles++;
            totalCompletedPomodoros++; 
            currentXP += 50;           
            
            const pointsDisplay = document.getElementById('rewards-points');
            if (pointsDisplay) pointsDisplay.innerText = currentXP;

            if (pomoCompletedCycles % 4 === 0) {
                pomoCurrentMode = 'long-break';
                alert("4 Focus Sessions Complete! Take a well-deserved 15-minute long break.");
            } else {
                pomoCurrentMode = 'short-break';
                alert("Focus session complete! Time for a quick 5-minute stretch break.");
            }
        } else {
            if (pomoCurrentMode === 'long-break') {
                pomoCompletedCycles = 0; 
            }
            pomoCurrentMode = 'work';
            alert("Break is over! Ready to lock back in for your next focus track?");
        }

        pomoSecondsRemaining = POMO_DURATIONS[pomoCurrentMode];
        
        // If they are on the scheduler page right now, update the fresh UI structure completely
        if (document.getElementById('pomo-timer-display')) {
            initPomodoroEngine();
        }
    }


    /* ==========================================================================
       III. COMPONENT INITIALIZERS (Bound post-injection)
       ========================================================================== */

    function initHomeMascot() {
        startGlobalHomeClock();
        const mascotBtn = document.getElementById('achie-mascot-trigger');
        const mascotImg = document.getElementById('achie-mascot-img');
        const quoteDisplay = document.getElementById('achie-quote');

        const achieQuotes = [
            "Take a deep breath. Let's tackle your schedule one small thing at a time!",
            "Great work syncing up today! Remember to rest your eyes and stretch between focus tracks.",
            "Academics are important, but your mental health is invaluable. You've got this!",
            "If things are feeling a little too heavy right now, remember our counselor link is always open.",
            "Progress is progress, no matter how small. Be proud of the effort you are putting in!",
            "Don't stress over what you can't control. Let's focus on what we can do right now.",
            "Drink a glass of water, adjust your shoulders, and let's conquer the next task together!",
            "You are much more than your grades or exam scores. Take care of yourself first today."
        ];

        if (mascotBtn) {
            mascotBtn.addEventListener('click', () => {
                if (isTalking) return;
                isTalking = true;

                mascotBtn.classList.add('talking');
                mascotImg.src = 'img/achie-full-body-smiling.png';
                
                const randomIndex = Math.floor(Math.random() * achieQuotes.length);
                quoteDisplay.innerText = `"${achieQuotes[randomIndex]}"`;
                
                setTimeout(() => {
                    mascotBtn.classList.remove('talking');
                    mascotImg.src = 'img/achie-full-body.png';
                    isTalking = false;
                }, 2000);
            });
        }
    }

    function initAdaptiveScheduler() {
        const energyButtons = document.querySelectorAll('.btn-energy');
        const taskForm = document.getElementById('task-form');
        
        const checkConfirmationOverlay = document.getElementById('achie-energy-modal');
        const confirmEnergyActionBtn = document.getElementById('btn-confirm-energy');
        const cancelEnergyActionBtn = document.getElementById('btn-cancel-energy');
        const customPromptTextField = document.getElementById('achie-confirmation-text');
        let stagedPendingState = null;

        const energyWeights = { 'low': 1, 'medium': 2, 'high': 3 };

        function processStateAdaptation(chosenState) {
            currentEnergyState = chosenState;
            
            energyButtons.forEach(btn => btn.classList.remove('active'));
            const targetBtn = document.querySelector(`.btn-energy[data-energy="${chosenState}"]`);
            if (targetBtn) targetBtn.classList.add('active');

            const plannerTitle = document.getElementById('adaptive-planner-title');
            const plannerDesc = document.getElementById('adaptive-planner-desc');
            const currentBadge = document.getElementById('current-energy-badge');

            if (chosenState === 'high') {
                if (plannerTitle) plannerTitle.innerText = "High-Energy Focus";
                if (plannerDesc) plannerDesc.innerText = "Your brainpower is at its peak. Perfect time to crush your hardest tasks.";
                if (currentBadge) { currentBadge.className = "energy-badge state-high"; currentBadge.innerText = "Fully Charged"; }
            } else if (chosenState === 'medium') {
                if (plannerTitle) plannerTitle.innerText = "Steady Progress";
                if (plannerDesc) plannerDesc.innerText = "Good, steady energy. Perfect for knocking out routine assignments.";
                if (currentBadge) { currentBadge.className = "energy-badge state-medium"; currentBadge.innerText = "Balanced"; }
            } else if (chosenState === 'low') {
                if (plannerTitle) plannerTitle.innerText = "Rest & Recovery";
                if (plannerDesc) plannerDesc.innerText = "Energy is running low. Hard tasks are paused so you can rest and avoid burnout.";
                if (currentBadge) { currentBadge.className = "energy-badge state-low"; currentBadge.innerText = "Recharging"; }
            }

            renderTasks();
        }

        energyButtons.forEach(button => {
            button.addEventListener('click', () => {
                const incomingState = button.getAttribute('data-energy');
                const currentWeight = energyWeights[currentEnergyState];
                const incomingWeight = energyWeights[incomingState];

                if (incomingWeight > currentWeight) {
                    stagedPendingState = incomingState;
                    
                    if (incomingState === 'high') {
                        customPromptTextField.innerText = `"Moving all the way up to High Focus requires a lot of fuel! Are you certain your mind is ready for heavy, critical thinking assignments right now?"`;
                    } else {
                        customPromptTextField.innerText = `"Stepping up your work baseline to a Medium State? Let's verify you feel completely up to handling your normal routine assignments right now."`;
                    }

                    if (checkConfirmationOverlay) checkConfirmationOverlay.classList.remove('hidden');
                } else {
                    processStateAdaptation(incomingState);
                }
            });
        });

        if (confirmEnergyActionBtn) {
            confirmEnergyActionBtn.addEventListener('click', () => {
                if (stagedPendingState) processStateAdaptation(stagedPendingState);
                if (checkConfirmationOverlay) checkConfirmationOverlay.classList.add('hidden');
                stagedPendingState = null;
            });
        }

        if (cancelEnergyActionBtn) {
            cancelEnergyActionBtn.addEventListener('click', () => {
                if (checkConfirmationOverlay) checkConfirmationOverlay.classList.add('hidden');
                stagedPendingState = null;
                processStateAdaptation(currentEnergyState);
            });
        }

        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const taskInput = document.getElementById('task-input');
                const taskIntensity = document.getElementById('task-intensity-tag');
                const textValue = taskInput.value.trim();
                if (!textValue) return;

                globalTasksDatabase.push({
                    id: Date.now(),
                    text: textValue,
                    intensity: taskIntensity.value,
                    completed: false
                });

                totalTasksAddedHistory++; 
                taskInput.value = '';
                renderTasks();
            });
        }

        initPomodoroEngine();
        processStateAdaptation(currentEnergyState);
    }

    function renderTasks() {
        const taskContainer = document.getElementById('task-list-container');
        const pointsDisplay = document.getElementById('rewards-points');
        if (!taskContainer) return;

        if (currentEnergyState === 'low') {
            totalDeferredInterventions = globalTasksDatabase.filter(task => task.intensity === 'heavy' && !task.completed).length;
        } else {
            totalDeferredInterventions = 0;
        }

        const activeDeferredField = document.getElementById('metric-deferred-count');
        if (activeDeferredField) activeDeferredField.innerText = totalDeferredInterventions;

        taskContainer.innerHTML = '';

        globalTasksDatabase.forEach(task => {
            const li = document.createElement('li');
            const isHeavyInterruption = currentEnergyState === 'low' && task.intensity === 'heavy';
            li.className = 'task-item';
            
            let intensityMarkup = '';
            if (task.intensity === 'heavy') intensityMarkup = '<span class="item-tag tag-heavy">Heavy Focus</span>';
            if (task.intensity === 'medium') intensityMarkup = '<span class="item-tag tag-medium">Moderate</span>';
            if (task.intensity === 'light') intensityMarkup = '<span class="item-tag tag-light">Low Friction</span>';

            let adaptationNotice = '';
            let isItemLockEnabled = false;

            if (isHeavyInterruption) {
                li.classList.add('deferred-faded');
                adaptationNotice = '<span class="defer-notice">⏳ Shifted Forward</span>';
                isItemLockEnabled = true; 
            }

            li.innerHTML = `
                <div class="task-item-left">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} ${isItemLockEnabled ? 'disabled style="cursor: not-allowed;"' : ''}>
                    <span class="task-text" style="${task.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
                        ${task.text} ${intensityMarkup}
                    </span>
                </div>
                ${adaptationNotice}
                <button class="btn-delete-task" data-id="${task.id}">&times;</button>
            `;

            li.querySelector('.task-checkbox').addEventListener('change', (e) => {
                if (currentEnergyState === 'low' && task.intensity === 'heavy') {
                    e.target.checked = false; 
                    return;
                }
                
                task.completed = e.target.checked;
                
                if (task.completed) {
                    totalTasksCompletedHistory++;
                    currentXP += 15;
                } else {
                    totalTasksCompletedHistory = Math.max(0, totalTasksCompletedHistory - 1);
                    currentXP -= 15;
                }

                if (currentXP < 0) currentXP = 0;
                if (pointsDisplay) pointsDisplay.innerText = currentXP;
                renderTasks();
            });

            li.querySelector('.btn-delete-task').addEventListener('click', () => {
                globalTasksDatabase = globalTasksDatabase.filter(t => t.id !== task.id);
                renderTasks();
            });

            taskContainer.appendChild(li);
        });
    }

/* ==========================================================================
       IV. POMODORO TIMER CORE CONTROLLER ENGINE (UI Linker Edition)
       ========================================================================== */
    function initPomodoroEngine() {
        const timerToggleBtn = document.getElementById('btn-timer-toggle');
        const timerResetBtn = document.getElementById('btn-timer-reset');
        const timerDisplayField = document.getElementById('pomo-timer-display');
        const timerStatusLabel = document.getElementById('pomo-timer-status'); 

        function translateDisplayDigits() {
            const minutes = Math.floor(pomoSecondsRemaining / 60);
            const seconds = pomoSecondsRemaining % 60;
            if (timerDisplayField) {
                timerDisplayField.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            updateStatusUI();
        }

        function updateStatusUI() {
            if (!timerStatusLabel) return;
            
            if (pomoCurrentMode === 'work') {
                timerStatusLabel.innerText = `Focus Session (${pomoCompletedCycles + 1}/4)`;
                timerStatusLabel.style.color = "var(--color-primary)";
            } else if (pomoCurrentMode === 'short-break') {
                timerStatusLabel.innerText = "Short Break";
                timerStatusLabel.style.color = "var(--color-mint-green)";
            } else if (pomoCurrentMode === 'long-break') {
                timerStatusLabel.innerText = "Great Job! Long Break Time";
                timerStatusLabel.style.color = "#3b82f6";
            }
        }

        // Match UI Button Appearance immediately depending on background state execution
        if (timerToggleBtn) {
            if (pomoTimerInterval) {
                timerToggleBtn.innerText = "Pause";
                timerToggleBtn.style.backgroundColor = "#e11d48";
            } else {
                timerToggleBtn.innerText = "Start";
                timerToggleBtn.style.backgroundColor = "var(--color-mint-green)";
            }
        }

        // Wire Up Start / Pause Toggle Button
        if (timerToggleBtn) {
            timerToggleBtn.replaceWith(timerToggleBtn.cloneNode(true));
            const freshToggleBtn = document.getElementById('btn-timer-toggle');

            freshToggleBtn.addEventListener('click', () => {
                if (pomoTimerInterval) {
                    // Stop tracking
                    clearInterval(pomoTimerInterval);
                    pomoTimerInterval = null;
                    freshToggleBtn.innerText = "Start";
                    freshToggleBtn.style.backgroundColor = "var(--color-mint-green)";
                } else {
                    // Launch background engine tracker loop
                    freshToggleBtn.innerText = "Pause";
                    freshToggleBtn.style.backgroundColor = "#e11d48"; 
                    startGlobalPomoTicker();
                }
            });
        }

        // Wire Up Manual Reset Button
        if (timerResetBtn) {
            timerResetBtn.replaceWith(timerResetBtn.cloneNode(true));
            const freshResetBtn = document.getElementById('btn-timer-reset');

            freshResetBtn.addEventListener('click', () => {
                if (confirm("Are you sure you want to reset the current session? Your progress count for this loop will restart.")) {
                    clearInterval(pomoTimerInterval);
                    pomoTimerInterval = null;
                    pomoCurrentMode = 'work';
                    pomoCompletedCycles = 0;
                    pomoSecondsRemaining = POMO_DURATIONS[pomoCurrentMode];
                    
                    translateDisplayDigits();
                    
                    const freshToggleBtn = document.getElementById('btn-timer-toggle');
                    if (freshToggleBtn) {
                        freshToggleBtn.innerText = "Start";
                        freshToggleBtn.style.backgroundColor = "var(--color-mint-green)";
                    }
                }
            });
        }

        // Render snapshots immediately on entry point
        translateDisplayDigits();
    }

    /* ==========================================================================
       V. ACADEMIC RESOURCE FOLDER (Dynamic Binders & Openable Previews)
       ========================================================================== */
function initResourceFolder() {
        const subjectSelect = document.getElementById('folder-subject-select');
        const activeBadge = document.getElementById('active-subject-badge');
        const notesArea = document.getElementById('folder-notes-input');
        const saveNotesBtn = document.getElementById('btn-save-notes');
        const fileInput = document.getElementById('folder-file-uploader');
        const dropZone = document.querySelector('.file-drop-zone');
        const filesList = document.getElementById('uploaded-files-list');
        const fileCountLabel = document.getElementById('file-count');

        const triggerAddBtn = document.getElementById('btn-trigger-add-subject');
        const modalFormRow = document.getElementById('add-subject-modal-row');
        const newSubjectNameInput = document.getElementById('new-subject-name-input');
        const saveNewSubjectBtn = document.getElementById('btn-save-new-subject');
        const cancelNewSubjectBtn = document.getElementById('btn-cancel-new-subject');
        const deleteSubjectBtn = document.getElementById('btn-delete-current-subject');

        // NEW: Multi-Notebook DOM targets
        const notebookSelect = document.getElementById('notebook-select');
        const addNotebookBtn = document.getElementById('btn-add-notebook');
        const deleteNotebookBtn = document.getElementById('btn-delete-notebook');

        const defaultSubjects = [
            { id: "research", name: "Research Thesis" },
            { id: "mobile-web", name: "Mobile & Web Applications" },
            { id: "database", name: "Database Systems & SQL" }
        ];

        let customSubjectsList = JSON.parse(localStorage.getItem('achie_custom_subject_modules')) || defaultSubjects;
        let activeSubject = localStorage.getItem('achie_active_selected_subject') || customSubjectsList[0].id;

        function populateSubjectDropdown() {
            if (!subjectSelect) return;
            subjectSelect.innerHTML = '';
            
            customSubjectsList.forEach(subj => {
                const opt = document.createElement('option');
                opt.value = subj.id;
                opt.text = subj.name;
                if (subj.id === activeSubject) opt.selected = true;
                subjectSelect.appendChild(opt);
            });
            syncWorkspaceView();
        }

        function syncWorkspaceView() {
            if (!subjectSelect) return;
            activeSubject = subjectSelect.value;
            localStorage.setItem('achie_active_selected_subject', activeSubject);

            if (activeBadge && subjectSelect.selectedIndex !== -1) {
                activeBadge.innerText = subjectSelect.options[subjectSelect.selectedIndex].text;
            }

            // Sync dynamic notebooks and standalone module file listings
            renderNotebookDropdown();
            renderUploadedFiles();
        }

        // --- NEW: Multi-Notebook Engines Management ---
        function renderNotebookDropdown() {
            if (!notebookSelect) return;
            notebookSelect.innerHTML = '';

            // Retrieve note arrays mapped uniquely to the active component module
            let notesList = JSON.parse(localStorage.getItem(`achie_notebooks_list_${activeSubject}`)) || [
                { id: "default", title: "Main Notes Summary" }
            ];
            let activeNoteId = localStorage.getItem(`achie_active_note_${activeSubject}`) || notesList[0].id;

            // Handle fallback checks if an item was deleted
            if (!notesList.some(n => n.id === activeNoteId)) {
                activeNoteId = notesList[0].id;
            }

            notesList.forEach(note => {
                const opt = document.createElement('option');
                opt.value = note.id;
                opt.text = note.title;
                if (note.id === activeNoteId) opt.selected = true;
                notebookSelect.appendChild(opt);
            });

            localStorage.setItem(`achie_active_note_${activeSubject}`, activeNoteId);
            
            if (notesArea) {
                notesArea.value = localStorage.getItem(`achie_note_body_${activeSubject}_${activeNoteId}`) || "";
            }
        }

        if (notebookSelect) {
            notebookSelect.addEventListener('change', () => {
                localStorage.setItem(`achie_active_note_${activeSubject}`, notebookSelect.value);
                if (notesArea) {
                    notesArea.value = localStorage.getItem(`achie_note_body_${activeSubject}_${notebookSelect.value}`) || "";
                }
            });
        }

        if (addNotebookBtn) {
            addNotebookBtn.addEventListener('click', () => {
                const title = prompt("Enter a title for this new notebook section:");
                if (!title || !title.trim()) return;

                let notesList = JSON.parse(localStorage.getItem(`achie_notebooks_list_${activeSubject}`)) || [
                    { id: "default", title: "Main Notes Summary" }
                ];
                
                const newNoteId = "note_" + Date.now();
                notesList.push({ id: newNoteId, title: title.trim() });
                
                localStorage.setItem(`achie_notebooks_list_${activeSubject}`, JSON.stringify(notesList));
                localStorage.setItem(`achie_active_note_${activeSubject}`, newNoteId);
                
                renderNotebookDropdown();
            });
        }

        if (deleteNotebookBtn) {
            deleteNotebookBtn.addEventListener('click', () => {
                let notesList = JSON.parse(localStorage.getItem(`achie_notebooks_list_${activeSubject}`)) || [
                    { id: "default", title: "Main Notes Summary" }
                ];

                if (notesList.length <= 1) {
                    alert("Your academic module must retain at least one operational notebook.");
                    return;
                }

                if (confirm("Are you sure you want to permanently delete this notebook note?")) {
                    const currentNoteId = notebookSelect.value;
                    
                    localStorage.removeItem(`achie_note_body_${activeSubject}_${currentNoteId}`);
                    notesList = notesList.filter(n => n.id !== currentNoteId);
                    
                    localStorage.setItem(`achie_notebooks_list_${activeSubject}`, JSON.stringify(notesList));
                    localStorage.setItem(`achie_active_note_${activeSubject}`, notesList[0].id);
                    
                    renderNotebookDropdown();
                }
            });
        }

        // --- 💾 AUTO-SAVE ENGINE & MANUAL SAVE BACKUP ---
        if (notesArea && notebookSelect) {
            // 1. REAL-TIME AUTO-SAVE: Saves every keystroke immediately
            notesArea.addEventListener('input', () => {
                const currentNoteId = notebookSelect.value;
                if (currentNoteId) {
                    localStorage.setItem(`achie_note_body_${activeSubject}_${currentNoteId}`, notesArea.value);
                }
            });

            // 2. MANUAL SAVE BUTTON (Kept for user peace of mind & UI feedback)
            if (saveNotesBtn) {
                saveNotesBtn.addEventListener('click', () => {
                    const currentNoteId = notebookSelect.value;
                    localStorage.setItem(`achie_note_body_${activeSubject}_${currentNoteId}`, notesArea.value);
                    
                    const nativeText = saveNotesBtn.innerText;
                    saveNotesBtn.innerText = "✓ Saved Successfully!";
                    saveNotesBtn.style.backgroundColor = "var(--color-mint-green)";
                    
                    setTimeout(() => {
                        saveNotesBtn.innerText = nativeText;
                        saveNotesBtn.style.backgroundColor = "";
                    }, 1500);
                });
            }
        }
        // --- Core Module Selection Logic Event Wire-Ups ---
        if (subjectSelect) subjectSelect.addEventListener('change', syncWorkspaceView);

        if (triggerAddBtn && modalFormRow) {
            triggerAddBtn.addEventListener('click', () => {
                modalFormRow.classList.remove('hidden');
                if (newSubjectNameInput) newSubjectNameInput.focus();
            });
        }

        if (cancelNewSubjectBtn && modalFormRow) {
            cancelNewSubjectBtn.addEventListener('click', () => {
                modalFormRow.classList.add('hidden');
                if (newSubjectNameInput) newSubjectNameInput.value = '';
            });
        }

        if (saveNewSubjectBtn && newSubjectNameInput) {
            saveNewSubjectBtn.addEventListener('click', () => {
                const titleText = newSubjectNameInput.value.trim();
                if (!titleText) return;

                const generatedId = "subj_" + Date.now();
                customSubjectsList.push({ id: generatedId, name: titleText });
                
                localStorage.setItem('achie_custom_subject_modules', JSON.stringify(customSubjectsList));
                activeSubject = generatedId; 

                populateSubjectDropdown();
                modalFormRow.classList.add('hidden');
                newSubjectNameInput.value = '';
            });
        }

        if (deleteSubjectBtn) {
            deleteSubjectBtn.addEventListener('click', () => {
                if (customSubjectsList.length <= 1) {
                    alert("You must keep at least one academic module active.");
                    return;
                }

                const currentOptionText = subjectSelect.options[subjectSelect.selectedIndex].text;
                if (confirm(`Permanently delete "${currentOptionText}"? This completely cleans out all linked notebooks and repository documents!`)) {
                    
                    // Comprehensive clear matching storage arrays keys
                    let notesList = JSON.parse(localStorage.getItem(`achie_notebooks_list_${activeSubject}`)) || [];
                    notesList.forEach(n => localStorage.removeItem(`achie_note_body_${activeSubject}_${n.id}`));
                    
                    localStorage.removeItem(`achie_notebooks_list_${activeSubject}`);
                    localStorage.removeItem(`achie_active_note_${activeSubject}`);
                    localStorage.removeItem(`achie_files_${activeSubject}`);

                    customSubjectsList = customSubjectsList.filter(subj => subj.id !== activeSubject);
                    localStorage.setItem('achie_custom_subject_modules', JSON.stringify(customSubjectsList));
                    
                    activeSubject = customSubjectsList[0].id;
                    localStorage.setItem('achie_active_selected_subject', activeSubject);

                    populateSubjectDropdown();
                }
            });
        }

        // --- Mapped File Streams Processing ---
        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => handleFileRegistration(e.target.files));
        }

        function handleFileRegistration(filesListArray) {
            let mockUploadedFiles = JSON.parse(localStorage.getItem(`achie_files_${activeSubject}`)) || [];
            let loadedCount = 0;

            for (let i = 0; i < filesListArray.length; i++) {
                const file = filesListArray[i];
                const reader = new FileReader();
                
                reader.onload = function(event) {
                    mockUploadedFiles.push({
                        id: Date.now() + i + Math.random(),
                        name: file.name,
                        size: (file.size / 1024).toFixed(1) + " KB",
                        type: file.type,
                        dataUrl: event.target.result 
                    });
                    
                    loadedCount++;
                    if (loadedCount === filesListArray.length) {
                        localStorage.setItem(`achie_files_${activeSubject}`, JSON.stringify(mockUploadedFiles));
                        renderUploadedFiles();
                    }
                };
                reader.readAsDataURL(file);
            }
        }

        function renderUploadedFiles() {
            if (!filesList || !fileCountLabel) return;
            
            let mockUploadedFiles = JSON.parse(localStorage.getItem(`achie_files_${activeSubject}`)) || [];
            filesList.innerHTML = '';
            fileCountLabel.innerText = mockUploadedFiles.length;

            if (mockUploadedFiles.length === 0) {
                filesList.innerHTML = `<li style="color: #64748b; font-style: italic; font-size: 0.9rem; padding: 0.5rem 0;">No context reference files attached to this module.</li>`;
                return;
            }

            mockUploadedFiles.forEach(file => {
                const li = document.createElement('li');
                li.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 0.5rem; margin-bottom: 0.5rem; border-radius: 4px; font-size: 0.9rem;";
                
                li.innerHTML = `
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%; cursor: pointer; color: #3b82f6;" class="file-download-link">📄 ${file.name} (${file.size})</span>
                    <button class="btn-delete-file" style="background: transparent; color: #ef4444; border: none; font-size: 1.1rem; cursor: pointer;">&times;</button>
                `;

                li.querySelector('.file-download-link').addEventListener('click', () => {
                    const newTab = window.open();
                    if(newTab) {
                        newTab.document.write(`<iframe src="${file.dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                        newTab.document.title = file.name;
                    }
                });

                li.querySelector('.btn-delete-file').addEventListener('click', () => {
                    mockUploadedFiles = mockUploadedFiles.filter(f => f.id !== file.id);
                    localStorage.setItem(`achie_files_${activeSubject}`, JSON.stringify(mockUploadedFiles));
                    renderUploadedFiles();
                });

                filesList.appendChild(li);
            });
        }

        populateSubjectDropdown();
    }

    /* ==========================================================================
       VI. ANALYTICS & PROGRESS METRICS CONTROLLER
       ========================================================================== */
    function initAnalyticsDashboard() {
        if (currentEnergyState === 'low') {
            totalDeferredInterventions = globalTasksDatabase.filter(t => t.intensity === 'heavy' && !t.completed).length;
        } else {
            totalDeferredInterventions = 0;
        }

        document.getElementById('analytics-points-display').innerText = currentXP;
        document.getElementById('metric-deferred-count').innerText = totalDeferredInterventions;
        document.getElementById('metric-pomo-count').innerText = totalCompletedPomodoros;

        const rateField = document.getElementById('metric-completion-rate');
        if (totalTasksAddedHistory > 0) {
            const completionRate = Math.round((totalTasksCompletedHistory / totalTasksAddedHistory) * 100);
            rateField.innerText = `${completionRate}%`;
        } else {
            rateField.innerText = "0%";
        }

        const heavyCount = globalTasksDatabase.filter(t => t.intensity === 'heavy').length;
        const mediumCount = globalTasksDatabase.filter(t => t.intensity === 'medium').length;
        const lightCount = globalTasksDatabase.filter(t => t.intensity === 'light').length;
        const totalActiveItems = globalTasksDatabase.length;

        document.getElementById('legend-count-heavy').innerText = heavyCount;
        document.getElementById('legend-count-medium').innerText = mediumCount;
        document.getElementById('legend-count-light').innerText = lightCount;

        const heavyBar = document.getElementById('dist-bar-heavy');
        const mediumBar = document.getElementById('dist-bar-medium');
        const lightBar = document.getElementById('dist-bar-light');

        if (totalActiveItems > 0) {
            heavyBar.style.width = `${(heavyCount / totalActiveItems) * 100}%`;
            mediumBar.style.width = `${(mediumCount / totalActiveItems) * 100}%`;
            lightBar.style.width = `${(lightCount / totalActiveItems) * 100}%`;
        } else {
            heavyBar.style.width = "0%";
            mediumBar.style.width = "0%";
            lightBar.style.width = "0%";
        }

        const insightField = document.getElementById('analytics-insight-text');
        if (heavyCount > (mediumCount + lightCount)) {
            insightField.innerText = `"Your task backlog looks skewed heavily toward deep focus items. Consider breaking some of those large tasks down into low-friction steps so you don't burn out!"`;
        } else if (totalTasksCompletedHistory > 5) {
            insightField.innerText = `"Wow! Look at that execution speed. You're doing an amazing job protecting your energy reserves while making consistent progress."`;
        } else {
            insightField.innerText = `"Your distribution looks remarkably balanced right now. Remember to check in with your energy baseline before diving into work windows!"`;
        }
    }

    function initSupportModalHooks() {
        const openModalBtn = document.getElementById('btn-open-modal');
        const bookingFormWrapper = document.getElementById('counseling-booking-form-wrapper');
        const appointmentForm = document.getElementById('appointment-booking-form');
        const cancelBookingBtn = document.getElementById('btn-cancel-booking');
        
        const courseSelect = document.getElementById('book-course');
        const otherCourseWrapper = document.getElementById('course-other-wrapper');
        const otherCourseInput = document.getElementById('book-course-other');

        // Modal / Verification Room Elements (Targeting your existing overlay structure)
        const modalOverlay = document.getElementById('counselor-modal');
        const loadingState = document.getElementById('modal-loading-state');
        const successState = document.getElementById('modal-success-state');

        // 1. Reveal Form Wrapper on baseline click
        if (openModalBtn) {
            openModalBtn.addEventListener('click', () => {
                bookingFormWrapper.classList.remove('hidden');
                openModalBtn.classList.add('hidden'); // Optional: Hides button once form is open
                bookingFormWrapper.scrollIntoView({ behavior: 'smooth' });
            });
        }

        // 2. Dynamic Toggle for "Other" Program input field
        if (courseSelect && otherCourseWrapper) {
            courseSelect.addEventListener('change', () => {
                if (courseSelect.value === 'other') {
                    otherCourseWrapper.classList.remove('hidden');
                    if (otherCourseInput) otherCourseInput.required = true;
                } else {
                    otherCourseWrapper.classList.add('hidden');
                    if (otherCourseInput) {
                        otherCourseInput.required = false;
                        otherCourseInput.value = '';
                    }
                }
            });
        }

        // 3. Handle Cancel Button actions
        if (cancelBookingBtn && bookingFormWrapper && openModalBtn) {
            cancelBookingBtn.addEventListener('click', () => {
                appointmentForm.reset();
                if (otherCourseWrapper) otherCourseWrapper.classList.add('hidden');
                bookingFormWrapper.classList.add('hidden');
                openModalBtn.classList.remove('hidden');
            });
        }

        // 4. Form Submission: Process inputs, then run your room validation sequences
        if (appointmentForm) {
            appointmentForm.addEventListener('submit', (e) => {
                e.preventDefault();

                // Extract checked values for areas of concern
                const checkedConcerns = [];
                const concernCheckboxes = document.querySelectorAll('input[name="concern"]:checked');
                concernCheckboxes.forEach(cb => {
                    checkedConcerns.push(cb.value);
                });

                // Validation safeguard check for checkboxes
                if (checkedConcerns.length === 0) {
                    alert("Please select at least one primary area of concern.");
                    return;
                }

                // Compile structured payload (Ready if you connect this to a backend/database later)
                const bookingData = {
                    lastName: document.getElementById('book-last-name').value.trim(),
                    firstName: document.getElementById('book-first-name').value.trim(),
                    middleName: document.getElementById('book-middle-name').value.trim(),
                    course: courseSelect.value === 'other' ? otherCourseInput.value.trim() : courseSelect.value,
                    yearLevel: document.getElementById('book-year').value,
                    email: document.getElementById('book-email').value.trim(),
                    daysAvailable: document.getElementById('book-days').value.trim(),
                    timesAvailable: document.getElementById('book-times').value.trim(),
                    concerns: checkedConcerns,
                    reason: document.getElementById('book-reason').value.trim()
                };

                console.log("Secure Booking Payload Dispatched: ", bookingData);

                // Open overlay and fire secure loading animation sequences
                if (modalOverlay) {
                    modalOverlay.classList.remove('hidden');
                    if (loadingState) loadingState.classList.remove('hidden');
                    if (successState) successState.classList.add('hidden');

                    // Simulate verifying room parameters match securely
                    setTimeout(() => {
                        if (loadingState) loadingState.classList.add('hidden');
                        if (successState) successState.classList.remove('hidden');
                        
                        // Clear out form inputs post verification completion 
                        appointmentForm.reset();
                        if (otherCourseWrapper) otherCourseWrapper.classList.add('hidden');
                        if (bookingFormWrapper) bookingFormWrapper.classList.add('hidden');
                        if (openModalBtn) openModalBtn.classList.remove('hidden');
                    }, 2000);
                }
            });
        }
    }

    /* ==========================================================================
       VII. GLOBAL OVERLAY TERMINATIONS & INITIALIZATION BOOT
       ========================================================================== */
    const closeModalBtn = document.getElementById('btn-close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            document.getElementById('counselor-modal').classList.add('hidden');
        });
    }

    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    loadSection('home');
});