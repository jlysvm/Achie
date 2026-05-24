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
            // Drop current intervals immediately when exiting target panel space to avoid drift execution leaks
            clearInterval(pomoTimerInterval);
            pomoTimerInterval = null;

            const response = await fetch(`sections/${sectionName}.html`);
            if (!response.ok) throw new Error(`Could not load section: ${sectionName}`);
            
            const htmlContent = await response.text();
            contentRoot.innerHTML = htmlContent;

            if (sectionName === 'home') initHomeMascot();
            if (sectionName === 'scheduler') initAdaptiveScheduler();
            if (sectionName === 'analytics') initAnalyticsDashboard();
            if (sectionName === 'support') initSupportModalHooks();
            if (sectionName === 'folder') initResourceFolder(); // Triggers updated resource folder engine logic

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


    /* ==========================================================================
       III. COMPONENT INITIALIZERS (Bound post-injection)
       ========================================================================== */

    function initHomeMascot() {
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
                if (plannerTitle) plannerTitle.innerText = "Deep-Focus Accelerator Stream";
                if (plannerDesc) plannerDesc.innerText = "High-octane mental baseline detected. Perfect time to crush intensive tasks.";
                if (currentBadge) { currentBadge.className = "energy-badge state-high"; currentBadge.innerText = "High Focus Active"; }
            } else if (chosenState === 'medium') {
                if (plannerTitle) plannerTitle.innerText = "Balanced Standard Path";
                if (plannerDesc) plannerDesc.innerText = "Steady progress environment. Balancing routine assignments.";
                if (currentBadge) { currentBadge.className = "energy-badge state-medium"; currentBadge.innerText = "Medium State"; }
            } else if (chosenState === 'low') {
                if (plannerTitle) plannerTitle.innerText = "Low-Friction Rest & Support Track";
                if (plannerDesc) plannerDesc.innerText = "Energy reserve is low. Heavy items are systematically deferred to preserve health.";
                if (currentBadge) { currentBadge.className = "energy-badge state-low"; currentBadge.innerText = "Tactical Rest Enabled"; }
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
       IV. POMODORO TIMER CORE CONTROLLER ENGINE
       ========================================================================== */
    function initPomodoroEngine() {
        const timerToggleBtn = document.getElementById('btn-timer-toggle');
        const timerResetBtn = document.getElementById('btn-timer-reset');
        const timerDisplayField = document.getElementById('pomo-timer-display');

        function translateDisplayDigits() {
            const minutes = Math.floor(pomoSecondsRemaining / 60);
            const seconds = pomoSecondsRemaining % 60;
            if (timerDisplayField) {
                timerDisplayField.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }

        if (timerToggleBtn) {
            timerToggleBtn.replaceWith(timerToggleBtn.cloneNode(true));
            const freshToggleBtn = document.getElementById('btn-timer-toggle');

            freshToggleBtn.addEventListener('click', () => {
                if (pomoTimerInterval) {
                    clearInterval(pomoTimerInterval);
                    pomoTimerInterval = null;
                    freshToggleBtn.innerText = "Start";
                    freshToggleBtn.style.backgroundColor = "var(--color-mint-green)";
                } else {
                    freshToggleBtn.innerText = "Pause";
                    freshToggleBtn.style.backgroundColor = "#e11d48"; 

                    pomoTimerInterval = setInterval(() => {
                        if (pomoSecondsRemaining > 0) {
                            pomoSecondsRemaining--;
                            translateDisplayDigits();
                        } else {
                            clearInterval(pomoTimerInterval);
                            pomoTimerInterval = null;
                            freshToggleBtn.innerText = "Start";
                            freshToggleBtn.style.backgroundColor = "var(--color-mint-green)";
                            pomoSecondsRemaining = 25 * 60; 
                            translateDisplayDigits();
                            
                            totalCompletedPomodoros++; 
                            currentXP += 50; 
                            
                            const pointsDisplay = document.getElementById('rewards-points');
                            if (pointsDisplay) pointsDisplay.innerText = currentXP;
                            
                            alert("Session Complete! Take a quick rest break, you earned it!");
                        }
                    }, 1000);
                }
            });
        }

        if (timerResetBtn) {
            timerResetBtn.replaceWith(timerResetBtn.cloneNode(true));
            const freshResetBtn = document.getElementById('btn-timer-reset');

            freshResetBtn.addEventListener('click', () => {
                clearInterval(pomoTimerInterval);
                pomoTimerInterval = null;
                pomoSecondsRemaining = 25 * 60; 
                translateDisplayDigits();
                
                const toggleActionLink = document.getElementById('btn-timer-toggle');
                if (toggleActionLink) {
                    toggleActionLink.innerText = "Start";
                    toggleActionLink.style.backgroundColor = "var(--color-mint-green)";
                }
            });
        }

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

        // Subject Adder Form DOM Elements
        const triggerAddBtn = document.getElementById('btn-trigger-add-subject');
        const modalFormRow = document.getElementById('add-subject-modal-row');
        const newSubjectNameInput = document.getElementById('new-subject-name-input');
        const saveNewSubjectBtn = document.getElementById('btn-save-new-subject');
        const cancelNewSubjectBtn = document.getElementById('btn-cancel-new-subject');

        // Baseline Default System Profiles
        const defaultSubjects = [
            { id: "research", name: "Research Thesis" },
            { id: "mobile-web", name: "Mobile & Web Applications" },
            { id: "database", name: "Database Systems & SQL" }
        ];

        // Track array state dynamically in storage
        let customSubjectsList = JSON.parse(localStorage.getItem('achie_custom_subject_modules')) || defaultSubjects;
        let activeSubject = localStorage.getItem('achie_active_selected_subject') || customSubjectsList[0].id;

        // --- Render Option Lists ---
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

        // --- Toggle Active Subjects View Panels ---
        function syncWorkspaceView() {
            if (!subjectSelect) return;
            activeSubject = subjectSelect.value;
            localStorage.setItem('achie_active_selected_subject', activeSubject);

            if (activeBadge) {
                activeBadge.innerText = subjectSelect.options[subjectSelect.selectedIndex].text;
            }

            // Sync Notebook Target Key Instantly
            if (notesArea) {
                notesArea.value = localStorage.getItem(`achie_notebook_text_${activeSubject}`) || "";
            }

            renderUploadedFiles();
        }

        if (subjectSelect) {
            subjectSelect.addEventListener('change', syncWorkspaceView);
        }

        // --- Create Custom Subjects ---
        if (triggerAddBtn && modalFormRow) {
            triggerAddBtn.addEventListener('click', () => {
                modalFormRow.classList.remove('hidden');
                newSubjectNameInput.focus();
            });
        }

        if (cancelNewSubjectBtn && modalFormRow) {
            cancelNewSubjectBtn.addEventListener('click', () => {
                modalFormRow.classList.add('hidden');
                newSubjectNameInput.value = '';
            });
        }

        if (saveNewSubjectBtn && newSubjectNameInput) {
            saveNewSubjectBtn.addEventListener('click', () => {
                const titleText = newSubjectNameInput.value.trim();
                if (!titleText) return;

                const generatedId = "subj_" + Date.now();
                customSubjectsList.push({ id: generatedId, name: titleText });
                
                localStorage.setItem('achie_custom_subject_modules', JSON.stringify(customSubjectsList));
                activeSubject = generatedId; // Switch selection directly to new custom binder

                populateSubjectDropdown();
                modalFormRow.classList.add('hidden');
                newSubjectNameInput.value = '';
            });
        }

        // --- Save Unique Content to Notebook ---
        if (saveNotesBtn && notesArea) {
            saveNotesBtn.addEventListener('click', () => {
                localStorage.setItem(`achie_notebook_text_${activeSubject}`, notesArea.value);
                
                const nativeText = saveNotesBtn.innerText;
                saveNotesBtn.innerText = "✓ Notebook Content Saved!";
                saveNotesBtn.style.backgroundColor = "var(--color-mint-green)";
                
                setTimeout(() => {
                    saveNotesBtn.innerText = nativeText;
                    saveNotesBtn.style.backgroundColor = "";
                }, 1500);
            });
        }

        // --- Process File Stream Uploads ---
        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => handleFileRegistration(e.target.files));
        }

        function handleFileRegistration(filesListArray) {
            let mockUploadedFiles = JSON.parse(localStorage.getItem(`achie_files_${activeSubject}`)) || [];
            
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
                    
                    localStorage.setItem(`achie_files_${activeSubject}`, JSON.stringify(mockUploadedFiles));
                    renderUploadedFiles();
                };
                reader.readAsDataURL(file);
            }
        }

        // --- Render List View and File Actions ---
        function renderUploadedFiles() {
            if (!filesList || !fileCountLabel) return;
            
            let mockUploadedFiles = JSON.parse(localStorage.getItem(`achie_files_${activeSubject}`)) || [];
            filesList.innerHTML = '';
            fileCountLabel.innerText = mockUploadedFiles.length;

            if (mockUploadedFiles.length === 0) {
                filesList.innerHTML = `<li style="color: #64748b; font-style: italic; font-size: 0.9rem; padding: 0.5rem 0;">No reference files attached to this module.</li>`;
                return;
            }

            mockUploadedFiles.forEach(file => {
                const li = document.createElement('li');
                li.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 0.5rem; margin-bottom: 0.5rem; border-radius: 4px; font-size: 0.9rem;";
                
                li.innerHTML = `
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%; cursor: pointer; color: #3b82f6;" class="file-download-link" title="Click to open file">📄 ${file.name} (${file.size})</span>
                    <button class="btn-delete-file" style="background: transparent; color: #ef4444; border: none; font-size: 1.1rem; cursor: pointer;">&times;</button>
                `;

                // File Open Action Trigger Hook
                li.querySelector('.file-download-link').addEventListener('click', () => {
                    if (!file.dataUrl) {
                        alert("File signature missing.");
                        return;
                    }
                    
                    const newTab = window.open();
                    if(newTab) {
                        newTab.document.write(`<iframe src="${file.dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                        newTab.document.title = file.name;
                    } else {
                        alert("Pop-up blocked! Enable permissions to preview documents.");
                    }
                });

                // Delete file logic
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
        const modalOverlay = document.getElementById('counselor-modal');
        const loadingState = document.getElementById('modal-loading-state');
        const successState = document.getElementById('modal-success-state');

        if (openModalBtn) {
            openModalBtn.addEventListener('click', () => {
                modalOverlay.classList.remove('hidden');
                loadingState.classList.remove('hidden');
                successState.classList.add('hidden');

                setTimeout(() => {
                    loadingState.classList.add('hidden');
                    successState.classList.remove('hidden');
                }, 2000);
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