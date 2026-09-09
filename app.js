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
});
