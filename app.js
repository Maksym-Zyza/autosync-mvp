document.addEventListener('DOMContentLoaded', () => {
    
    // --- Navigation Logic (SPA Tab Switching) ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            if (!targetId) return;

            // Update Nav Icons
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update Views
            views.forEach(view => {
                view.classList.remove('active');
                if(view.id === targetId) {
                    view.classList.add('active');
                }
            });
        });
    });

    // --- Modal Logic ---
    const addBtn = document.getElementById('add-record-btn');
    const modal = document.getElementById('add-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const saveBtn = document.getElementById('save-record-btn');

    const openModal = () => modal.classList.add('active');
    const closeModal = () => modal.classList.remove('active');

    if (addBtn) addBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking on overlay (outside the content)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            // Simulate saving
            saveBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Зберігаємо...';
            setTimeout(() => {
                closeModal();
                saveBtn.innerHTML = 'Зберегти запис';
            }, 800);
        });
    }

    // --- Health Score Animation ---
    const circlePath = document.getElementById('health-circle-path');
    if (circlePath) {
        // Delay animation slightly for effect after load
        setTimeout(() => {
            circlePath.style.strokeDasharray = '75, 100';
        }, 500);
    }

    // --- Share View Logic ---
    const shareBtnAction = document.getElementById('share-btn-action');
    const backToHistoryBtn = document.getElementById('back-to-history-btn');
    const appContainer = document.querySelector('.app-container');
    const sharedView = document.getElementById('shared-view');

    if (shareBtnAction && backToHistoryBtn && sharedView) {
        shareBtnAction.addEventListener('click', () => {
            // Hide all current views
            views.forEach(view => view.classList.remove('active'));
            // Show shared view
            sharedView.classList.add('active');
            // Hide bottom nav and FAB
            appContainer.classList.add('hide-nav');
        });

        backToHistoryBtn.addEventListener('click', () => {
            // Hide shared view
            sharedView.classList.remove('active');
            // Show history view again
            document.getElementById('history-view').classList.add('active');
            // Show bottom nav and FAB
            appContainer.classList.remove('hide-nav');
        });
    }

    // --- Services Filtering Logic ---
    const serviceChips = document.querySelectorAll('.chip');
    const serviceCards = document.querySelectorAll('.service-card');

    serviceChips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Remove active from all chips
            serviceChips.forEach(c => c.classList.remove('active'));
            // Add active to clicked
            chip.classList.add('active');
            
            const category = chip.textContent.trim();
            
            // Filter cards
            serviceCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');
                if (category === 'Всі' || category === cardCategory) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // --- Dynamic Reminders & Sorting ---
    const remindersData = [
        {
            title: "ОСЦПВ (Страховка)",
            desc: "Дійсна ще 4 місяці",
            icon: "ph-shield-check",
            colorClass: "normal",
            iconClass: "blue",
            priority: 3, // 1 = highest, 3 = lowest
            daysLeft: 120
        },
        {
            title: "Моторне мастило",
            desc: "Заміна через 2 300 км",
            icon: "ph-drop",
            colorClass: "warning",
            iconClass: "orange",
            priority: 2,
            daysLeft: 45
        },
        {
            title: "Гальмівні колодки",
            desc: "Заміна через 500 км",
            icon: "ph-wrench",
            colorClass: "alert",
            iconClass: "red",
            priority: 1,
            daysLeft: 7,
            hasAction: true
        }
    ];

    const remindersContainer = document.getElementById('reminders-container');
    
    function renderReminders() {
        if (!remindersContainer) return;
        
        // Dynamic Sorting (Priority 1 first)
        remindersData.sort((a, b) => a.priority - b.priority);
        
        remindersContainer.innerHTML = '';
        
        remindersData.forEach(reminder => {
            const btnHtml = reminder.hasAction ? `<button class="action-btn">Записатись</button>` : '';
            
            const cardHtml = `
                <div class="reminder-card glass-panel ${reminder.colorClass}">
                    <div class="icon-box ${reminder.iconClass}">
                        <i class="ph ${reminder.icon}"></i>
                    </div>
                    <div class="reminder-info">
                        <h4>${reminder.title}</h4>
                        <p>${reminder.desc}</p>
                    </div>
                    ${btnHtml}
                </div>
            `;
            remindersContainer.insertAdjacentHTML('beforeend', cardHtml);
        });
    }

    renderReminders();

    // --- Web Notifications API (Proactive Push) ---
    const notifyBtn = document.getElementById('enable-notifications-btn');
    if (notifyBtn) {
        notifyBtn.addEventListener('click', () => {
            if (!("Notification" in window)) {
                alert("Ваш браузер не підтримує системні сповіщення.");
                return;
            }

            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    notifyBtn.style.color = "var(--accent-green)"; // Change icon color
                    
                    // Trigger a demo notification
                    const notification = new Notification("AutoSync", {
                        body: "Увага! Гальмівні колодки потребують заміни через 500 км.",
                        icon: "https://cdn-icons-png.flaticon.com/512/3204/3204364.png" // Car icon
                    });
                    
                    notification.onclick = function() {
                        window.focus();
                        this.close();
                    };
                }
            });
        });
    }

    // --- Auth Logic ---
    const appContainer = document.querySelector('.app-container');
    const loginDiiaBtn = document.getElementById('login-diia-btn');
    const loginGoogleBtn = document.getElementById('login-google-btn');
    const logoutBtn = document.getElementById('logout-btn');

    function login() {
        appContainer.classList.remove('auth-mode');
        document.getElementById('login-view').classList.remove('active');
        
        // Reset nav and view to dashboard
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const dashboardNav = document.querySelector('.nav-item[data-target="dashboard-view"]');
        if (dashboardNav) dashboardNav.classList.add('active');
        
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('dashboard-view').classList.add('active');
    }

    function logout() {
        appContainer.classList.add('auth-mode');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('login-view').classList.add('active');
    }

    if (loginDiiaBtn) loginDiiaBtn.addEventListener('click', login);
    if (loginGoogleBtn) loginGoogleBtn.addEventListener('click', login);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
});
