/* AutoSync — MVP prototype (v2.0)
   Scope follows Jira epics AUTO-7 (diary), AUTO-9 (plan), AUTO-11 (repair request), AUTO-16 (admin).
   Everything beyond the MVP is shown as "Скоро" and listed on the "Що буде далі" screen.
   All data lives in memory: reload resets the demo. */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // ---------- helpers ----------
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const app = $('#app');
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const nf = new Intl.NumberFormat('uk-UA');
    const fmtNum = n => nf.format(n).replace(/[  ]/g, ' ');
    const fmtKm = n => fmtNum(n) + ' км';
    const fmtMoney = n => '₴ ' + fmtNum(n);
    const pad = n => String(n).padStart(2, '0');
    const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = () => iso(new Date());
    const fmtDate = s => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}.${m}.${y}`; };
    const addMonths = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setMonth(d.getMonth() + n); return d; };
    const daysUntil = d => Math.round((d - new Date(today() + 'T00:00:00')) / 86400000);
    const nextId = arr => arr.reduce((m, x) => Math.max(m, x.id), 0) + 1;
    const plural = (n, one, few, many) => {
        const a = Math.abs(n) % 100, b = a % 10;
        if (a > 10 && a < 20) return many;
        if (b > 1 && b < 5) return few;
        return b === 1 ? one : many;
    };

    // ---------- reference data ----------
    // Типові роботи з інтервалами за замовчуванням (AUTO-9, п.1)
    const TYPICAL = [
        { key: 'oil', name: 'Олива двигуна і фільтри', icon: 'ph-drop', km: 10000, months: 12, priority: 'high' },
        { key: 'coolant', name: 'Антифриз', icon: 'ph-thermometer-cold', km: 60000, months: 60, priority: 'med' },
        { key: 'battery', name: 'Акумулятор', icon: 'ph-battery-charging', km: 0, months: 48, priority: 'med' },
        { key: 'brakes', name: 'Гальмівні колодки', icon: 'ph-disc', km: 30000, months: 48, priority: 'high' },
        { key: 'tires', name: 'Шини (комплект)', icon: 'ph-tire', km: 50000, months: 72, priority: 'med' },
        { key: 'inspection', name: 'Загальний огляд', icon: 'ph-magnifying-glass', km: 15000, months: 12, priority: 'low' }
    ];
    const PRIORITY = { high: 'Високий', med: 'Середній', low: 'Низький' };
    const PRIORITY_W = { high: 3, med: 2, low: 1 };
    const STEPS = [
        { key: 'open', label: 'Відкрита' },
        { key: 'answered', label: 'СТО відповіла' },
        { key: 'approved', label: 'Погоджено' },
        { key: 'done', label: 'Виконано' },
        { key: 'resolved', label: 'Вирішено' }
    ];
    const STATUS_LABEL = { open: 'Відкрита', answered: 'СТО відповіла', approved: 'Погоджено', done: 'Виконано', resolved: 'Вирішено', closed: 'Закрито' };
    const STATUS_BADGE = { open: 'warning', answered: 'warning', approved: 'good', done: 'good', resolved: 'good', closed: 'danger' };

    // ---------- state (in memory) ----------
    const state = {
        user: { email: 'taras@example.com' },
        currentCarId: 1,
        cars: [
            { id: 1, make: 'Volkswagen', model: 'Golf VII', year: 2018, fuel: 'Бензин', mileage: 145000, vin: 'WVWZZZAUZJP123456' },
            { id: 2, make: 'Škoda', model: 'Octavia A7', year: 2015, fuel: 'Дизель', mileage: 212000, vin: 'TMBJJ7NE4F0123456' }
        ],
        entries: [
            { id: 1, carId: 1, date: '2026-05-12', mileage: 142500, work: 'Заміна оливи двигуна та фільтрів', price: 3200, author: 'sto', stoName: 'АвтоДок', files: 1, note: 'Мастило Motul 5W-30, фільтри Bosch.' },
            { id: 2, carId: 1, date: '2026-03-05', mileage: 138000, work: 'Загальний огляд і діагностика ходової', price: 800, author: 'sto', stoName: 'Офіційний дилер', files: 1, note: 'Рекомендовано заміну стійок стабілізатора.' },
            { id: 3, carId: 1, date: '2025-08-22', mileage: 128500, work: 'Новий акумулятор', price: 4100, author: 'me', files: 1, note: 'Varta Silver Dynamic 77Ah.' },
            { id: 4, carId: 1, date: '2023-03-15', mileage: 118500, work: 'Заміна гальмівних колодок', price: 4500, author: 'me', files: 2, note: 'Передні та задні колодки Brembo.' },
            { id: 5, carId: 2, date: '2026-08-01', mileage: 208000, work: 'Заміна оливи двигуна та фільтрів', price: 2900, author: 'me', files: 0, note: '' }
        ],
        plan: [
            { id: 1, carId: 1, key: 'oil', lastDate: '2026-05-12', lastKm: 142500, unknown: false, km: 10000, months: 12, priority: 'high' },
            { id: 2, carId: 1, key: 'coolant', lastDate: '', lastKm: null, unknown: true, km: 60000, months: 60, priority: 'med' },
            { id: 3, carId: 1, key: 'battery', lastDate: '2025-08-22', lastKm: 128500, unknown: false, km: 0, months: 48, priority: 'med' },
            { id: 4, carId: 1, key: 'brakes', lastDate: '2023-03-15', lastKm: 118500, unknown: false, km: 27000, months: 48, priority: 'high' },
            { id: 5, carId: 1, key: 'tires', lastDate: '2021-04-10', lastKm: 80000, unknown: false, km: 60000, months: 72, priority: 'med' },
            { id: 6, carId: 1, key: 'inspection', lastDate: '2026-03-05', lastKm: 138000, unknown: false, km: 15000, months: 12, priority: 'low' },
            { id: 7, carId: 2, key: 'oil', lastDate: '2026-08-01', lastKm: 208000, unknown: false, km: 10000, months: 12, priority: 'high' },
            { id: 8, carId: 2, key: 'inspection', lastDate: '', lastKm: null, unknown: true, km: 15000, months: 12, priority: 'low' }
        ],
        requests: [
            {
                id: 1, carId: 1, planKey: 'brakes', title: 'Гальмівні колодки', status: 'answered', createdAt: '2026-10-20',
                desc: 'Скрегіт при гальмуванні, педаль трохи вібрує. Колодки, схоже, на межі.', files: ['brake_noise.m4a', 'pads_1.jpg'],
                stoName: 'АвтоДок', visibility: 'all', expiresAt: '2026-11-03', declined: false, closedAt: null,
                response: { decision: 'take', price: 3800, findings: 'Передні колодки зношені на 90%, диски в межах норми. Потрібна заміна передніх колодок і датчика зносу.' },
                report: null
            },
            {
                id: 2, carId: 1, planKey: 'oil', title: 'Заміна оливи двигуна', status: 'resolved', createdAt: '2026-05-08',
                desc: 'Планова заміна оливи й фільтрів.', files: [], stoName: 'АвтоДок', visibility: 'all', expiresAt: '2026-05-22',
                declined: false, closedAt: null, response: { decision: 'take', price: 3200, findings: 'Олива в нормі, фільтри замінено.' }, report: { by: 'sto', article: 'Bosch F 026 407 006' }
            }
        ],
        users: [
            { email: 'olena.k@example.com', joined: '2026-09-02', cars: 1, requests: 3, blocked: false },
            { email: 'andrii.m@example.com', joined: '2026-09-11', cars: 2, requests: 5, blocked: false },
            { email: 'spam.bot@example.com', joined: '2026-10-01', cars: 0, requests: 14, blocked: false },
            { email: 'iryna.p@example.com', joined: '2026-10-03', cars: 1, requests: 0, blocked: false },
            { email: 'dmytro.s@example.com', joined: '2026-10-09', cars: 3, requests: 2, blocked: false }
        ]
    };
    const ui = { reqFilter: 'active', reqId: null, stoReqId: null, entryWarn: null, entryAck: false, mileWarn: null, mileAck: false, editPlanId: null, drafts: {}, shareDraft: { visibility: 'all', days: 7 } };

    const car = () => state.cars.find(c => c.id === state.currentCarId) || state.cars[0];
    const typical = key => TYPICAL.find(t => t.key === key);
    const workName = w => (typical(w.key) ? typical(w.key).name : w.key);
    const workIcon = w => (typical(w.key) ? typical(w.key).icon : 'ph-wrench');
    const carName = c => `${c.make} ${c.model}`;

    // ---------- plan status (AUTO-9, п.3): green / yellow / red ----------
    function workStatus(w, c) {
        if (w.unknown || (!w.lastDate && w.lastKm == null)) {
            return { level: 'yellow', rank: 1, text: 'Коли робили востаннє — невідомо', sort: 0 };
        }
        const parts = [];
        if (w.km > 0 && w.lastKm != null) {
            const rem = w.lastKm + w.km - c.mileage;
            const win = Math.max(1000, w.km * 0.1);
            parts.push({ rem, level: rem < 0 ? 'red' : rem <= win ? 'yellow' : 'green', label: rem < 0 ? `прострочено на ${fmtKm(-rem)}` : `через ${fmtKm(rem)}`, norm: rem / w.km });
        }
        if (w.months > 0 && w.lastDate) {
            const days = daysUntil(addMonths(w.lastDate, w.months));
            const mDays = w.months * 30;
            const span = n => n <= 60 ? `${n} ${plural(n, 'день', 'дні', 'днів')}` : `${Math.round(n / 30)} міс.`;
            parts.push({ rem: days, level: days < 0 ? 'red' : days <= 30 ? 'yellow' : 'green', label: days < 0 ? `прострочено на ${span(-days)}` : `через ${span(days)}`, norm: days / mDays });
        }
        if (!parts.length) return { level: 'yellow', rank: 1, text: 'Вкажіть інтервал або дату', sort: 0 };
        const rankOf = { red: 0, yellow: 1, green: 2 };
        parts.sort((a, b) => rankOf[a.level] - rankOf[b.level] || a.norm - b.norm);
        const worst = parts[0];
        const text = worst.level === 'green' ? 'Наступна ' + parts.map(p => p.label).join(' або ') : worst.label[0].toUpperCase() + worst.label.slice(1);
        return { level: worst.level, rank: rankOf[worst.level], text, sort: worst.norm };
    }
    const carPlan = c => state.plan.filter(w => w.carId === c.id).map(w => ({ w, s: workStatus(w, c) }))
        .sort((a, b) => a.s.rank - b.s.rank || PRIORITY_W[b.w.priority] - PRIORITY_W[a.w.priority] || a.s.sort - b.s.sort);

    // Індекс стану (AUTO-7 п.3): зважене середнє за пріоритетом
    function healthIndex(c) {
        const items = carPlan(c);
        if (!items.length) return null;
        const val = { green: 1, yellow: 0.6, red: 0 };
        let sum = 0, wsum = 0;
        items.forEach(({ w, s }) => { const k = PRIORITY_W[w.priority]; sum += k * val[s.level]; wsum += k; });
        const score = Math.round(100 * sum / wsum);
        const names = lvl => items.filter(i => i.s.level === lvl).map(i => workName(i.w).toLowerCase());
        const red = names('red'), yellow = names('yellow');
        let desc = 'Усі роботи плану ТО в нормі.';
        if (red.length) desc = 'Прострочено: ' + red.join(', ') + '.';
        else if (yellow.length) desc = 'У вікні ТО або потребують уточнення: ' + yellow.join(', ') + '.';
        return { score, level: score >= 85 ? 'good' : score >= 60 ? 'warning' : 'danger', desc };
    }

    // ---------- UI primitives ----------
    let toastTimer = null;
    function toast(text, action) {
        const t = $('#toast'), btn = $('#toast-action');
        $('#toast-text').textContent = text;
        if (action) { btn.hidden = false; btn.textContent = action.label; btn.onclick = () => { action.run(); t.classList.remove('show'); }; }
        else { btn.hidden = true; btn.onclick = null; }
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), action ? 6000 : 3200);
    }
    const soon = label => toast(`«${label}» — планується в наступних версіях.`, { label: 'Що ще буде', run: () => showView('roadmap-view') });

    const NAV_FOR = { 'request-view': 'requests-view', 'sto-view': 'requests-view', 'admin-view': 'profile-view' };
    function showView(id, opts = {}) {
        $$('.view').forEach(v => v.classList.toggle('active', v.id === id));
        app.dataset.view = id;
        const nav = NAV_FOR[id] || id;
        $$('.nav-item[data-target]').forEach(n => n.classList.toggle('active', n.dataset.target === nav));
        app.classList.toggle('hide-nav', id === 'sto-view' || !!opts.hideNav);
        window.scrollTo(0, 0);
    }
    const openModal = id => $('#' + id).classList.add('active');
    const closeModals = () => $$('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    const setErr = (el, msg) => { el.textContent = msg || ''; };
    const markInvalid = (input, bad) => input.classList.toggle('invalid', !!bad);

    // ---------- anomaly checks (AUTO-7 п.5) ----------
    function mileageAnomaly(carId, dateStr, km) {
        const list = state.entries.filter(e => e.carId === carId).sort((a, b) => a.date.localeCompare(b.date));
        const prev = [...list].reverse().find(e => e.date <= dateStr);
        const next = list.find(e => e.date > dateStr);
        if (prev && km < prev.mileage) return `Пробіг менший за попередній запис (${fmtKm(prev.mileage)}, ${fmtDate(prev.date)}). Перевірте значення.`;
        if (next && km > next.mileage) return `Пробіг більший за наступний запис (${fmtKm(next.mileage)}, ${fmtDate(next.date)}). Перевірте значення.`;
        if (prev && km - prev.mileage > 30000) return `Пробіг різко зріс: +${fmtKm(km - prev.mileage)} від попереднього запису. Перевірте значення.`;
        return null;
    }
    function currentMileageAnomaly(c, km) {
        if (km < c.mileage) return `Пробіг менший за поточний (${fmtKm(c.mileage)}). Перевірте значення.`;
        if (km - c.mileage > 20000) return `Пробіг різко зріс: +${fmtKm(km - c.mileage)}. Перевірте значення.`;
        return null;
    }

    // ---------- render: dashboard ----------
    function renderDash() {
        const c = car();
        $('#dash-car-name').textContent = carName(c);
        $('#dash-car-meta').textContent = `${c.year} • ${c.fuel} • VIN …${c.vin.slice(-6)}`;
        $('#dash-mileage').textContent = fmtKm(c.mileage);

        const h = healthIndex(c);
        const chart = $('#health-chart'), pct = $('#health-pct'), badge = $('#health-badge'), path = $('#health-circle-path');
        if (h) {
            chart.setAttribute('class', 'circular-chart ' + h.level);
            pct.textContent = h.score + '%';
            badge.className = 'status-badge ' + h.level;
            badge.textContent = h.level === 'good' ? 'Усе гаразд' : h.level === 'warning' ? 'Потребує уваги' : 'Критично';
            $('#health-desc').textContent = h.desc;
            requestAnimationFrame(() => setTimeout(() => { path.style.strokeDasharray = `${h.score}, 100`; }, 200));
        } else {
            chart.setAttribute('class', 'circular-chart');
            pct.textContent = '—'; badge.className = 'status-badge'; badge.textContent = 'Немає даних';
            $('#health-desc').textContent = 'Додайте роботи в план ТО, щоб побачити індекс стану.';
            path.style.strokeDasharray = '0, 100';
        }

        const works = carPlan(c).slice(0, 3);
        const cls = { red: 'alert', yellow: 'warning', green: 'ok' }, box = { red: 'red', yellow: 'orange', green: 'green' };
        $('#dash-works').innerHTML = works.length ? works.map(({ w, s }) => `
            <div class="reminder-card glass-panel ${cls[s.level]}">
                <div class="icon-box ${box[s.level]}"><i class="ph ${workIcon(w)}"></i></div>
                <div class="reminder-info"><h4>${esc(workName(w))}</h4><p>${esc(s.text)}</p></div>
                ${s.level !== 'green' ? `<button class="action-btn" data-act="req-from-plan" data-id="${w.id}">Запит</button>` : ''}
            </div>`).join('') : `<div class="empty glass-panel">План ТО порожній. <button class="link-btn" data-goto="plan-view">Додати роботи</button></div>`;

        const active = state.requests.find(r => r.carId === c.id && !['resolved', 'closed'].includes(r.status));
        $('#dash-request').innerHTML = active ? `
            <div class="section-header" style="margin-top:24px"><h3>Активний запит</h3></div>
            <div class="req-card glass-panel" data-act="open-req" data-id="${active.id}">
                <div class="req-head"><h4>${esc(active.title)}</h4><span class="status-badge ${STATUS_BADGE[active.status]}">${STATUS_LABEL[active.status]}</span></div>
                ${miniSteps(active)}
            </div>` : '';
    }

    // ---------- render: diary ----------
    function authorBadge(e) {
        return e.author === 'sto'
            ? `<span class="author-badge sto" title="Додала СТО"><i class="ph-fill ph-wrench"></i> СТО «${esc(e.stoName || '—')}»</span>`
            : `<span class="author-badge" title="Додав власник"><i class="ph-fill ph-user"></i> Я</span>`;
    }
    function renderDiary() {
        const c = car();
        const list = state.entries.filter(e => e.carId === c.id).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
        $('#diary-count').textContent = list.length;
        $('#diary-total').textContent = fmtMoney(list.reduce((s, e) => s + (e.price || 0), 0));
        $('#diary-list').innerHTML = list.length ? list.map(e => `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-content glass-panel">
                    <div class="timeline-meta">
                        <div><span class="date">${fmtDate(e.date)}</span> <span class="mileage">• ${fmtKm(e.mileage)}</span></div>
                        ${authorBadge(e)}
                    </div>
                    <h4 class="title">${esc(e.work)}</h4>
                    ${e.note ? `<p class="desc">${esc(e.note)}</p>` : ''}
                    <div class="price-row">
                        <div class="price">${e.price ? fmtMoney(e.price) : '—'}</div>
                        ${e.files ? `<div class="doc-attachment"><i class="ph ph-paperclip"></i> ${e.files} ${plural(e.files, 'файл', 'файли', 'файлів')}</div>` : ''}
                    </div>
                </div>
            </div>`).join('') : `<div class="empty glass-panel">Записів ще немає. Додайте перший.</div>`;
    }

    // ---------- render: plan ----------
    const LEVEL_BADGE = { green: ['good', 'Далеко'], yellow: ['warning', 'У вікні ТО'], red: ['danger', 'Прострочено'] };
    function renderPlan() {
        const c = car();
        const items = carPlan(c);
        $('#plan-list').innerHTML = items.length ? items.map(({ w, s }) => {
            const t = typical(w.key);
            const interval = [w.km ? fmtKm(w.km) : null, w.months ? `${w.months} ${plural(w.months, 'місяць', 'місяці', 'місяців')}` : null].filter(Boolean).join(' / ');
            const last = (w.unknown || (!w.lastDate && w.lastKm == null)) ? 'не знаю' : [w.lastDate ? fmtDate(w.lastDate) : null, w.lastKm != null ? fmtKm(w.lastKm) : null].filter(Boolean).join(' • ');
            return `
            <div class="plan-item glass-panel ${s.level}">
                <div class="plan-top">
                    <i class="status-dot ${s.level}" title="${LEVEL_BADGE[s.level][1]}"></i>
                    <div class="icon-box ${s.level === 'red' ? 'red' : s.level === 'yellow' ? 'orange' : 'green'}"><i class="ph ${t ? t.icon : 'ph-wrench'}"></i></div>
                    <div class="reminder-info"><h4>${esc(workName(w))}</h4><p>${esc(s.text)}</p></div>
                    <span class="status-badge ${LEVEL_BADGE[s.level][0]}">${LEVEL_BADGE[s.level][1]}</span>
                </div>
                <div class="plan-meta">
                    <span><i class="ph ph-arrows-clockwise"></i> Інтервал: ${esc(interval || '—')}</span>
                    <span><i class="ph ph-clock-counter-clockwise"></i> Востаннє: ${esc(last)}</span>
                    <span><i class="ph ph-flag"></i> Пріоритет: ${PRIORITY[w.priority]}</span>
                </div>
                <div class="plan-actions">
                    <button type="button" class="btn-ghost sm" data-act="plan-edit" data-id="${w.id}"><i class="ph ph-pencil-simple"></i> Змінити</button>
                    <button type="button" class="btn-ghost sm" data-act="req-from-plan" data-id="${w.id}"><i class="ph ph-wrench"></i> Створити запит</button>
                </div>
            </div>`;
        }).join('') : `<div class="empty glass-panel">План порожній. Додайте типові роботи й вкажіть, коли їх робили.</div>`;
    }

    // ---------- render: requests ----------
    function miniSteps(r) {
        const idx = STEPS.findIndex(s => s.key === (r.status === 'closed' ? (r.closedAt || 'open') : r.status));
        return `<div class="mini-steps">${STEPS.map((s, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('')}</div>`;
    }
    function renderRequests() {
        const c = car();
        $$('#req-filter .chip').forEach(b => b.classList.toggle('active', b.dataset.filter === ui.reqFilter));
        const list = state.requests.filter(r => r.carId === c.id && (ui.reqFilter === 'archive' ? ['resolved', 'closed'].includes(r.status) : !['resolved', 'closed'].includes(r.status)))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        $('#req-list').innerHTML = list.length ? list.map(r => `
            <div class="req-card glass-panel" data-act="open-req" data-id="${r.id}" role="button" tabindex="0">
                <div class="req-head"><h4>${esc(r.title)}</h4><span class="status-badge ${STATUS_BADGE[r.status]}">${STATUS_LABEL[r.status]}</span></div>
                <p class="req-sub">${esc(carName(c))} • ${fmtDate(r.createdAt)}${r.stoName ? ' • СТО «' + esc(r.stoName) + '»' : ''}</p>
                ${miniSteps(r)}
            </div>`).join('') : `<div class="empty glass-panel">${ui.reqFilter === 'archive' ? 'Архів порожній.' : 'Активних запитів немає. Створіть запит із плану ТО або з нуля.'}</div>`;
    }

    function stepperHtml(r) {
        const closed = r.status === 'closed';
        const idx = STEPS.findIndex(s => s.key === (closed ? (r.closedAt || 'open') : r.status));
        return `<div class="stepper">${STEPS.map((s, i) => {
            const cls = closed ? (i <= idx ? 'done' : 'skipped') : (r.status === 'resolved' || i < idx ? 'done' : i === idx ? 'current' : '');
            return `<div class="step ${cls}"><div class="dot">${cls === 'done' ? '<i class="ph-bold ph-check"></i>' : i + 1}</div><span>${s.label}</span></div>`;
        }).join('')}</div>`;
    }
    const filesHtml = files => files && files.length ? `<div class="attach-list">${files.map(f => `<span class="doc-attachment"><i class="ph ph-paperclip"></i> ${esc(f)}</span>`).join('')}</div>` : '<p class="form-hint">Вкладень немає.</p>';
    const SLOTS = [
        { key: 'odometer', label: 'Одометр', icon: 'ph-gauge' },
        { key: 'old', label: 'Стара деталь', icon: 'ph-wrench' },
        { key: 'new', label: 'Нова деталь', icon: 'ph-package' }
    ];
    function reportFormHtml(r, mode) {
        const d = ui.drafts[r.id] || {};
        return `
        <div class="photo-grid">${SLOTS.map(s => `
            <label class="photo-slot ${d[s.key] ? 'filled' : ''}" ${d[s.key] ? `style="background-image:url('${d[s.key]}')"` : ''}>
                <input type="file" accept="image/*" data-slot="${s.key}" data-req="${r.id}">
                <i class="ph ${s.icon}"></i><span>${s.label}</span>
            </label>`).join('')}
        </div>
        <div class="form-group" style="margin-top:12px"><label>Артикул нової деталі</label><input type="text" id="report-article-${mode}" value="${esc(d.article || '')}" placeholder="Наприклад, Brembo P 85 123"></div>
        <div class="field-error" id="report-error-${mode}"></div>
        <div class="action-row">
            <button type="button" class="btn-primary inline" data-act="report-submit" data-mode="${mode}" data-id="${r.id}">Надіслати фотозвіт</button>
            ${mode === 'sto' ? `<button type="button" class="link-btn" data-act="report-demo" data-id="${r.id}">демо: підставити зразки</button>` : ''}
        </div>`;
    }
    const reportViewHtml = r => {
        const rep = r.report || {};
        return `<div class="photo-grid">${SLOTS.map(s => `<div class="photo-slot ${rep[s.key] ? 'filled' : ''}" ${rep[s.key] ? `style="background-image:url('${rep[s.key]}')"` : ''}><i class="ph ${s.icon}"></i><span>${s.label}</span></div>`).join('')}</div>
        <p class="form-hint" style="margin-top:8px">Артикул нової деталі: <strong>${esc(rep.article || '—')}</strong> • Фотозвіт додав${rep.by === 'owner' ? ' власник' : 'ла СТО'}.</p>`;
    };

    function renderRequestDetail() {
        const r = state.requests.find(x => x.id === ui.reqId);
        if (!r) return;
        const c = state.cars.find(x => x.id === r.carId);
        const linkOn = !!r.stoName && r.status !== 'closed';
        const open = r.status === 'open';
        let html = `
        <div class="req-title-row"><h2>${esc(r.title)}</h2><span class="status-badge ${STATUS_BADGE[r.status]}">${STATUS_LABEL[r.status]}</span></div>
        <p class="req-sub">${esc(carName(c))} • створено ${fmtDate(r.createdAt)}</p>
        ${stepperHtml(r)}

        <div class="detail-card glass-panel"><h4>Проблема</h4><p>${esc(r.desc || '—')}</p>${filesHtml(r.files)}</div>`;

        if (r.status === 'closed') {
            html += `<div class="alert info"><i class="ph-fill ph-archive"></i><span>Запит закрито. Посилання для СТО тепер відкриває архівну сторінку.</span></div>`;
        }
        if (open) {
            if (r.declined) html += `<div class="alert warn"><i class="ph-fill ph-warning"></i><span>СТО «${esc(r.stoName)}» відмовилась від запиту. Створіть нове посилання для іншої СТО.</span></div>`;
            if (!linkOn || r.declined) {
                const d = ui.shareDraft;
                html += `
                <div class="detail-card glass-panel"><h4>Посилання для СТО</h4>
                    <div class="form-group"><label for="share-sto">Назва СТО</label><input type="text" id="share-sto" placeholder="Наприклад, АвтоДок"></div>
                    <label class="form-label-sm">Що бачить СТО з історії авто</label>
                    <div class="radio-row">
                        <label class="radio-card"><input type="radio" name="vis" value="all" ${d.visibility === 'all' ? 'checked' : ''}><span><i class="ph ph-notebook"></i> Усю історію</span></label>
                        <label class="radio-card"><input type="radio" name="vis" value="none" ${d.visibility === 'none' ? 'checked' : ''}><span><i class="ph ph-eye-slash"></i> Нічого</span></label>
                    </div>
                    <div class="form-group" style="margin-top:12px"><label for="share-days">Термін дії посилання</label>
                        <select id="share-days"><option value="1">1 день</option><option value="3">3 дні</option><option value="7" selected>7 днів</option><option value="14">14 днів</option></select></div>
                    <div class="field-error" id="share-error"></div>
                    <button type="button" class="btn-primary inline" data-act="share-create"><i class="ph ph-link"></i> Створити посилання</button>
                    <div class="soon-stack" style="margin-top:12px">
                        <button type="button" class="soon-btn" data-soon="Показати СТО лише вибрані записи історії"><i class="ph ph-list-checks"></i><span>Показати лише вибрані записи</span><em class="soon-chip">Скоро</em></button>
                        <button type="button" class="soon-btn" data-soon="Список СТО з OpenStreetMap"><i class="ph ph-map-trifold"></i><span>Обрати СТО зі списку на мапі</span><em class="soon-chip">Скоро</em></button>
                    </div>
                </div>`;
            } else {
                html += shareBoxHtml(r);
            }
        }
        if (r.status === 'answered') {
            html += `
            <div class="detail-card glass-panel sto-answer"><h4>Відповідь СТО «${esc(r.stoName)}»</h4>
                <div class="price-big">${fmtMoney(r.response.price)}</div>
                <p>${esc(r.response.findings || 'Знахідки не вказано.')}</p>
                <div class="action-row">
                    <button type="button" class="btn-primary inline" data-act="approve"><i class="ph ph-check"></i> Погодити знахідки й ціну</button>
                    <button type="button" class="btn-ghost" data-act="reject-answer">Відхилити</button>
                </div>
                <p class="form-hint">Ремонт почнеться лише після вашої згоди.</p>
            </div>${shareBoxHtml(r)}`;
        }
        if (r.status === 'approved') {
            html += `
            <div class="alert ok"><i class="ph-fill ph-check-circle"></i><span>Ви погодили ціну ${fmtMoney(r.response.price)}. Чекаємо фотозвіт від СТО.</span></div>
            ${shareBoxHtml(r)}
            <div class="detail-card glass-panel"><h4>Фотозвіт (якщо СТО не додала — додайте самі)</h4>${reportFormHtml(r, 'owner')}</div>`;
        }
        if (r.status === 'done') {
            html += `
            <div class="detail-card glass-panel"><h4>Фотозвіт</h4>${reportViewHtml(r)}
                <div class="action-row"><button type="button" class="btn-primary inline" data-act="resolve"><i class="ph ph-check-circle"></i> Позначити вирішеною</button></div>
                <p class="form-hint">Робота стане записом у щоденнику, а план ТО оновиться.</p>
            </div>`;
        }
        if (r.status === 'resolved') {
            html += `
            <div class="alert ok"><i class="ph-fill ph-check-circle"></i><span>Проблему вирішено. Запис додано до щоденника, план ТО оновлено.</span></div>
            ${r.report && r.report.odometer ? `<div class="detail-card glass-panel"><h4>Фотозвіт</h4>${reportViewHtml(r)}</div>` : ''}
            <div class="action-row"><button type="button" class="btn-ghost" data-goto="diary-view"><i class="ph ph-notebook"></i> Відкрити щоденник</button></div>`;
        }
        if (!['resolved', 'closed'].includes(r.status)) {
            html += `<div class="action-row"><button type="button" class="btn-ghost danger" data-act="close-req"><i class="ph ph-x-circle"></i> Закрити запит</button></div>
            <p class="form-hint">Закрити запит можна на будь-якому кроці.</p>`;
        }
        $('#req-detail').innerHTML = html;
    }
    // Демо-токен посилання (у продакшені — випадковий, невгадуваний)
    const linkToken = r => (r.id * 7919 + Array.from(r.stoName).reduce((n, ch) => n + ch.charCodeAt(0), 0) * 104729).toString(36).padStart(6, 'k') + 'x' + r.id;
    function shareBoxHtml(r) {
        if (!r.stoName) return '';
        return `
        <div class="detail-card glass-panel"><h4>Посилання для СТО</h4>
            <div class="link-field"><input type="text" readonly value="https://autosync/${linkToken(r)}"><button type="button" class="btn-ghost sm" data-act="copy-link"><i class="ph ph-copy"></i> Копіювати</button></div>
            <p class="form-hint" style="margin-top:8px">Для «${esc(r.stoName)}» • історія: ${r.visibility === 'all' ? 'уся' : 'не показується'} • діє до ${fmtDate(r.expiresAt)}</p>
            <div class="action-row"><button type="button" class="btn-ghost" data-act="open-sto" data-id="${r.id}"><i class="ph ph-storefront"></i> Відкрити як СТО (демо)</button></div>
        </div>`;
    }

    // ---------- render: STO page (за посиланням, без акаунта) ----------
    function renderSto() {
        const r = state.requests.find(x => x.id === ui.stoReqId);
        if (!r) return;
        const c = state.cars.find(x => x.id === r.carId);
        let html = `<div class="sto-banner"><i class="ph-fill ph-info"></i><span>Демо-перегляд сторінки, яку СТО отримує за посиланням. Реєстрація не потрібна.</span></div>`;
        const archived = ['resolved', 'closed'].includes(r.status);
        if (archived) {
            html += `<div class="detail-card glass-panel" style="text-align:center"><i class="ph-fill ph-archive" style="font-size:2.5rem;color:var(--text-muted)"></i>
                <h3 style="margin:8px 0">Запит закрито</h3><p class="form-hint">${r.status === 'resolved' ? 'Власник позначив проблему вирішеною. Дякуємо за роботу!' : 'Власник закрив цей запит. Сторінка доступна лише для перегляду.'}</p>
                <p style="margin-top:12px"><strong>${esc(r.title)}</strong> • ${esc(carName(c))}</p></div>`;
        } else {
            html += `
            <div class="detail-card glass-panel"><h4>Запит на ремонт</h4><h3 style="margin-bottom:4px">${esc(r.title)}</h3>
                <p class="form-hint">Для СТО «${esc(r.stoName)}» • посилання діє до ${fmtDate(r.expiresAt)}</p></div>
            <div class="detail-card glass-panel"><h4>Авто</h4>
                <div class="kv"><span>Марка, модель</span><strong>${esc(carName(c))}</strong></div>
                <div class="kv"><span>Рік • пальне</span><strong>${c.year} • ${esc(c.fuel)}</strong></div>
                <div class="kv"><span>Пробіг</span><strong>${fmtKm(c.mileage)}</strong></div>
                <div class="kv"><span>VIN</span><strong>${esc(c.vin)}</strong></div></div>
            <div class="detail-card glass-panel"><h4>Опис проблеми</h4><p>${esc(r.desc || '—')}</p>${filesHtml(r.files)}</div>`;
            if (r.visibility === 'all') {
                const hist = state.entries.filter(e => e.carId === c.id).sort((a, b) => b.date.localeCompare(a.date));
                html += `<div class="detail-card glass-panel"><h4>Історія обслуговування (лише перегляд)</h4>${hist.map(e => `
                    <div class="mini-row"><span>${fmtDate(e.date)} • ${fmtKm(e.mileage)}<br><strong>${esc(e.work)}</strong></span>${authorBadge(e)}</div>`).join('') || '<p class="form-hint">Записів немає.</p>'}</div>`;
            } else {
                html += `<div class="alert info"><i class="ph-fill ph-eye-slash"></i><span>Власник не відкрив історію авто для цього запиту.</span></div>`;
            }

            if (r.status === 'open' && !r.declined) {
                html += `
                <div class="detail-card glass-panel"><h4>Ваша відповідь</h4>
                    <div class="radio-row">
                        <label class="radio-card"><input type="radio" name="sto-decision" value="take" checked><span><i class="ph ph-check"></i> Беру</span></label>
                        <label class="radio-card"><input type="radio" name="sto-decision" value="no"><span><i class="ph ph-x"></i> Не беру</span></label>
                    </div>
                    <div id="sto-take-fields">
                        <div class="form-group" style="margin-top:12px"><label for="sto-price">Ціна роботи, ₴</label><input type="number" id="sto-price" inputmode="decimal" min="0" placeholder="0"></div>
                        <div class="form-group"><label for="sto-findings">Знахідки</label><textarea id="sto-findings" rows="3" placeholder="Що виявили, що потрібно замінити"></textarea></div>
                    </div>
                    <div class="field-error" id="sto-error"></div>
                    <button type="button" class="btn-primary inline" data-act="sto-answer">Надіслати відповідь</button>
                </div>`;
            } else if (r.status === 'open' && r.declined) {
                html += `<div class="alert info"><i class="ph-fill ph-info"></i><span>Ви відмовились від цього запиту. Дякуємо за відповідь.</span></div>`;
            } else if (r.status === 'answered') {
                html += `<div class="alert ok"><i class="ph-fill ph-check-circle"></i><span>Відповідь надіслано: ${fmtMoney(r.response.price)}. Очікуємо погодження власника.</span></div>`;
            } else if (r.status === 'approved') {
                html += `<div class="alert ok"><i class="ph-fill ph-check-circle"></i><span>Власник погодив знахідки й ціну ${fmtMoney(r.response.price)}. Після роботи додайте фотозвіт.</span></div>
                <div class="detail-card glass-panel"><h4>Фотозвіт</h4>${reportFormHtml(r, 'sto')}</div>`;
            } else if (r.status === 'done') {
                html += `<div class="alert ok"><i class="ph-fill ph-check-circle"></i><span>Фотозвіт надіслано. Власник підтвердить завершення.</span></div><div class="detail-card glass-panel"><h4>Фотозвіт</h4>${reportViewHtml(r)}</div>`;
            }
        }
        html += `<div class="soon-stack" style="margin-top:16px"><button type="button" class="soon-btn" data-soon="Кабінет СТО: збережені запити, клієнти та вільні слоти"><i class="ph ph-storefront"></i><span>Кабінет СТО</span><em class="soon-chip">Скоро</em></button></div>`;
        $('#sto-content').innerHTML = html;
    }

    // ---------- render: profile, garage, admin, roadmap ----------
    function carCardsHtml() {
        return state.cars.map(c => `
            <div class="car-card glass-panel ${c.id === state.currentCarId ? 'active-car' : ''}" data-act="pick-car" data-id="${c.id}" role="button" tabindex="0">
                <i class="ph-fill ph-car-simple"></i>
                <div class="car-info"><h4>${esc(carName(c))}</h4><p>${c.year} • ${esc(c.fuel)} • ${fmtKm(c.mileage)}</p></div>
                ${c.id === state.currentCarId ? '<i class="ph-fill ph-check-circle" style="color:var(--accent-primary);margin-left:auto"></i>' : ''}
            </div>`).join('');
    }
    function renderProfile() {
        const letter = (state.user.email[0] || 'A').toUpperCase();
        $('#profile-email').textContent = state.user.email;
        $('#profile-initial').textContent = letter;
        $('#header-avatar').textContent = letter;
        $('#stat-cars').textContent = state.cars.length;
        $('#stat-entries').textContent = state.entries.length;
        $('#profile-cars').innerHTML = carCardsHtml();
    }
    function renderAdmin() {
        $('#adm-users').textContent = state.users.length + 1;
        $('#adm-cars').textContent = state.users.reduce((s, u) => s + u.cars, 0) + state.cars.length;
        $('#adm-reqs').textContent = state.users.reduce((s, u) => s + u.requests, 0) + state.requests.length;
        const rows = [{ email: state.user.email + ' (ви)', joined: '2026-08-14', cars: state.cars.length, requests: state.requests.length, blocked: false, self: true }, ...state.users];
        $('#adm-table').innerHTML = `<thead><tr><th>Email</th><th>Реєстрація</th><th>Авто</th><th>Запити</th><th>Статус</th><th></th></tr></thead><tbody>${rows.map((u, i) => `
            <tr class="${u.blocked ? 'blocked' : ''}"><td>${esc(u.email)}</td><td>${fmtDate(u.joined)}</td><td>${u.cars}</td><td>${u.requests}</td>
            <td>${u.blocked ? '<span class="status-badge danger">Заблоковано</span>' : '<span class="status-badge good">Активний</span>'}</td>
            <td>${u.self ? '' : `<button type="button" class="btn-ghost sm ${u.blocked ? '' : 'danger'}" data-act="block-user" data-i="${i - 1}">${u.blocked ? 'Розблокувати' : 'Заблокувати'}</button>`}</td></tr>`).join('')}</tbody>`;
    }

    const ROADMAP = [
        { title: 'Найближчим часом', note: 'Візьмемо в роботу, якщо встигнемо до релізу.', tag: 'next', items: [
            ['ph-database', 'Дані авто за VIN', 'Введіть VIN — марка, модель, рік і пальне підтягнуться з реєстру МВС.'],
            ['ph-file-csv', 'Експорт історії в CSV', 'Власна копія всіх записів щоденника.'],
            ['ph-qr-code', 'QR-код авто з PIN', 'Наклейте код під капотом: СТО скануватиме його, вводитиме PIN із 4 цифр і бачитиме історію лише для читання. Після кількох хибних PIN доступ блокується на час.'],
            ['ph-alarm', 'Відкласти нагадування', 'Перенесіть нагадування на N днів або кілометрів.'],
            ['ph-calendar-plus', 'План ТО в календарі', 'Підписка на план у вашому календарі (ICS).'],
            ['ph-clock-countdown', 'Стрічка подій авто', 'Нагадування й події запитів в одній стрічці.'],
            ['ph-map-trifold', 'СТО зі списку на мапі', 'Обирайте СТО для запиту зі списку (дані OpenStreetMap).'],
            ['ph-list-checks', 'Частина історії для СТО', 'Показуйте СТО лише вибрані записи, а не всю історію.']
        ] },
        { title: 'Щоденник і доступ до авто', tag: 'later', items: [
            ['ph-device-mobile', 'Реєстрація за телефоном', 'Вхід за номером телефону поруч з email.'],
            ['ph-sliders-horizontal', 'Налаштування сповіщень', 'Вирішуйте, що й куди надходить.'],
            ['ph-file-pdf', 'Експорт у PDF', 'Історія обслуговування у вигляді документа.'],
            ['ph-flag-checkered', 'Чесний старт', 'Спеціальний режим початку ведення історії авто.'],
            ['ph-warning-octagon', 'Відкликання NHTSA', 'Повідомлення про відкликання авто за базою NHTSA.'],
            ['ph-stethoscope', 'Симптоми', 'Фіксуйте симптоми, щоб точніше описувати проблеми.'],
            ['ph-clock-counter-clockwise', 'Історія змін запису', 'Бачте, що й коли змінювалось у записі.'],
            ['ph-microphone', 'Голосове введення та розпізнавання', 'Диктуйте записи й розпізнавайте чеки з фото.'],
            ['ph-handshake', 'Передача авто покупцю', 'Передайте авто разом з історією новому власнику.'],
            ['ph-key', 'Кілька PIN-кодів для QR', 'Свій PIN для кожної СТО, з можливістю відкликання.'],
            ['ph-list-magnifying-glass', 'Журнал доступів', 'Хто й коли дивився історію вашого авто.']
        ] },
        { title: 'План ТО і нагадування', tag: 'later', items: [
            ['ph-books', 'Регламенти за моделями', 'Інтервали робіт саме для вашої моделі.'],
            ['ph-book-open-text', 'Розбір інструкцій виробника', 'Автоматичне читання сервісної книжки.'],
            ['ph-chart-line-up', 'Адаптивний прогноз', 'Прогноз строку робіт з інтервалом невизначеності.'],
            ['ph-user-gear', 'Персоналізація для кожного авто', 'План підлаштовується під стиль їзди та умови.'],
            ['ph-question', '«Чому зараз»', 'Пояснення, чому нагадування прийшло саме зараз.'],
            ['ph-bell-ringing', 'Push-сповіщення', 'Нагадування прямо на телефон.'],
            ['ph-snowflake', 'Сезонні нагадування', 'Підказки перед зимою й літом.']
        ] },
        { title: 'Запити на ремонт', tag: 'later', items: [
            ['ph-microphone-stage', 'Голос і фото на сторінці', 'Запис голосу й фото прямо в запиті.'],
            ['ph-users-three', 'Запит кільком СТО', 'Порівнюйте відповіді та ціни.'],
            ['ph-chat-circle-dots', 'Друга думка', 'Перевірте діагноз в іншої СТО.'],
            ['ph-clipboard-text', 'Огляд-чекап', 'Запит на комплексну перевірку авто.'],
            ['ph-chat-text', 'SMS від платформи', 'Повідомлення про відповіді СТО.'],
            ['ph-map-pin-area', 'Профіль СТО на мапі', 'Сторінка СТО з адресою й контактами.'],
            ['ph-star', 'Оцінки СТО', 'Відгуки власників про виконану роботу.'],
            ['ph-lightbulb', 'Підказка СТО під запит', 'Підбір СТО під ваш тип проблеми.']
        ] },
        { title: 'Довіра до записів', tag: 'later', items: [
            ['ph-seal-check', 'Рівень довіри запису', 'Оцінка за джерелом, фото й перевіркою пробігу.'],
            ['ph-storefront', 'Рівень «зареєстрована СТО»', 'Записи від перевірених станцій цінуються більше.'],
            ['ph-scales', 'Вага з оцінок СТО', 'Рейтинг СТО впливає на довіру до її записів.'],
            ['ph-fingerprint', 'Хеш, час і геомітка файлу', 'Підтвердження, що фото не підроблене.']
        ] },
        { title: 'Кабінет СТО (платний)', tag: 'later', items: [
            ['ph-identification-card', 'Реєстрація СТО', 'Власний акаунт станції.'],
            ['ph-floppy-disk', 'Збережені запити', 'Копія запису у кабінеті СТО.'],
            ['ph-users', 'Клієнти з датами ТО', 'Нагадування клієнтам про наступні роботи.'],
            ['ph-calendar-check', 'Вільні слоти', 'Запис клієнтів на зручний час.'],
            ['ph-chat-centered-text', 'Відповіді на відгуки', 'Спілкуйтесь з клієнтами публічно.']
        ] },
        { title: 'Адміністрування', tag: 'later', items: [
            ['ph-flag', 'Модерація скарг на оцінки', 'Розгляд спірних відгуків.'],
            ['ph-list-plus', 'Редагування списку робіт', 'Зміна типових робіт в інтерфейсі.']
        ] }
    ];
    function renderRoadmap() {
        $('#roadmap-body').innerHTML = ROADMAP.map(g => `
            <div class="roadmap-group">
                <div class="section-header"><h3>${esc(g.title)}</h3>${g.note ? `<span class="form-hint">${esc(g.note)}</span>` : ''}</div>
                <div class="roadmap-grid">${g.items.map(([icon, t, d]) => `
                    <div class="roadmap-item glass-panel">
                        <div class="icon-box purple"><i class="ph ${icon}"></i></div>
                        <div class="reminder-info"><h4>${esc(t)}</h4><p>${esc(d)}</p></div>
                        <em class="soon-chip ${g.tag === 'next' ? 'next' : ''}">${g.tag === 'next' ? 'Далі' : 'Планується'}</em>
                    </div>`).join('')}</div>
            </div>`).join('');
    }

    function renderAll() {
        renderDash(); renderDiary(); renderPlan(); renderRequests(); renderProfile(); renderAdmin();
        if (ui.reqId) renderRequestDetail();
        if (ui.stoReqId) renderSto();
    }

    // ---------- navigation ----------
    $$('.nav-item[data-target]').forEach(item => item.addEventListener('click', e => {
        e.preventDefault();
        showView(item.dataset.target);
    }));

    // ---------- global delegated clicks ----------
    document.addEventListener('click', e => {
        const t = e.target;
        const soonEl = t.closest('[data-soon]');
        if (soonEl) { e.preventDefault(); soon(soonEl.dataset.soon); return; }
        const goto = t.closest('[data-goto]');
        if (goto) { e.preventDefault(); showView(goto.dataset.goto); return; }
        if (t.closest('[data-close]')) { closeModals(); return; }
        if (t.classList.contains('modal-overlay')) { closeModals(); return; }
        const act = t.closest('[data-act]');
        if (act) handleAct(act, e);
    });
    document.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"],[role="switch"]')) { e.preventDefault(); e.target.click(); }
        if (e.key === 'Escape') closeModals();
    });

    function handleAct(el, e) {
        const id = Number(el.dataset.id);
        switch (el.dataset.act) {
            case 'req-from-plan': openRequestModal(id); break;
            case 'plan-edit': openPlanModal(id); break;
            case 'open-req': ui.reqId = id; renderRequestDetail(); showView('request-view'); break;
            case 'pick-car':
                state.currentCarId = id; closeModals(); renderAll();
                toast(`Активне авто: ${carName(car())}`); break;
            case 'share-create': shareCreate(); break;
            case 'copy-link': {
                const inp = el.closest('.link-field').querySelector('input');
                try { navigator.clipboard.writeText(inp.value); } catch (err) { inp.select(); }
                toast('Посилання скопійовано'); break;
            }
            case 'open-sto': ui.stoReqId = id; renderSto(); showView('sto-view'); break;
            case 'sto-answer': stoAnswer(); break;
            case 'approve': {
                const r = curReq(); r.status = 'approved'; renderAll(); toast('Знахідки й ціну погоджено. СТО може починати роботу.'); break;
            }
            case 'reject-answer': {
                const r = curReq(); r.status = 'open'; r.response = null; r.stoName = ''; r.declined = false; renderAll();
                toast('Відповідь відхилено. Створіть нове посилання.'); break;
            }
            case 'report-demo': demoReport(id); break;
            case 'report-submit': submitReport(id, el.dataset.mode); break;
            case 'resolve': resolveRequest(); break;
            case 'close-req': {
                if (!el.dataset.confirm) {
                    el.dataset.confirm = '1'; el.innerHTML = '<i class="ph ph-warning"></i> Натисніть ще раз, щоб закрити';
                    setTimeout(() => { if (el.isConnected) { delete el.dataset.confirm; el.innerHTML = '<i class="ph ph-x-circle"></i> Закрити запит'; } }, 4000);
                    break;
                }
                const r = curReq(); r.closedAt = r.status; r.status = 'closed'; renderAll(); toast('Запит закрито. Посилання для СТО тепер архівне.'); break;
            }
            case 'block-user': {
                const u = state.users[Number(el.dataset.i)]; u.blocked = !u.blocked; renderAdmin();
                toast(u.blocked ? `Акаунт ${u.email} заблоковано` : `Акаунт ${u.email} розблоковано`); break;
            }
        }
    }
    const curReq = () => state.requests.find(r => r.id === ui.reqId);

    // ---------- auth (email) ----------
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function setAuthTab(name) {
        ['login', 'register', 'recover'].forEach(n => { $('#form-' + n).hidden = n !== name; });
        $$('#auth-tabs button').forEach(b => b.classList.toggle('active', b.dataset.auth === name));
        $('#auth-tabs').hidden = name === 'recover';
    }
    $$('[data-auth]').forEach(b => b.addEventListener('click', () => setAuthTab(b.dataset.auth)));
    function fieldCheck(input, ok, msg) {
        markInvalid(input, !ok);
        setErr(input.parentElement.querySelector('.field-error'), ok ? '' : msg);
        return ok;
    }
    function login(email, btn, msg) {
        const label = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Зачекайте...';
        btn.disabled = true;
        setTimeout(() => {
            state.user.email = email;
            app.classList.remove('auth-mode');
            btn.innerHTML = label; btn.disabled = false;
            renderAll(); showView('dashboard-view');
            if (msg) toast(msg);
        }, 600);
    }
    $('#form-login').addEventListener('submit', e => {
        e.preventDefault();
        const em = $('#login-email'), pw = $('#login-pass');
        const a = fieldCheck(em, emailRe.test(em.value.trim()), 'Вкажіть коректний email');
        const b = fieldCheck(pw, pw.value.length >= 8, 'Пароль — щонайменше 8 символів');
        if (a && b) login(em.value.trim(), e.submitter || $('#form-login .btn-primary'));
    });
    $('#form-register').addEventListener('submit', e => {
        e.preventDefault();
        const em = $('#reg-email'), pw = $('#reg-pass'), p2 = $('#reg-pass2');
        const a = fieldCheck(em, emailRe.test(em.value.trim()), 'Вкажіть коректний email');
        const b = fieldCheck(pw, pw.value.length >= 8, 'Пароль — щонайменше 8 символів');
        const c = fieldCheck(p2, p2.value === pw.value && p2.value !== '', 'Паролі не збігаються');
        if (a && b && c) login(em.value.trim(), e.submitter || $('#form-register .btn-primary'), 'Акаунт створено. Додайте своє авто.');
    });
    $('#form-recover').addEventListener('submit', e => {
        e.preventDefault();
        const em = $('#rec-email');
        if (fieldCheck(em, emailRe.test(em.value.trim()), 'Вкажіть коректний email')) $('#recover-ok').hidden = false;
    });
    $('#logout-btn').addEventListener('click', () => {
        app.classList.add('auth-mode'); showView('login-view'); setAuthTab('login');
    });

    // ---------- header / profile / toggles ----------
    $('#header-profile-btn').addEventListener('click', () => showView('profile-view'));
    $$('.toggle').forEach(t => t.addEventListener('click', () => {
        const on = !t.classList.contains('active');
        $$('#toggle-email, #toggle-email-2').forEach(x => { x.classList.toggle('active', on); x.setAttribute('aria-checked', on); });
        toast(on ? 'Нагадування на email увімкнено' : 'Нагадування на email вимкнено');
    }));

    // ---------- mileage quick update (AUTO-7 п.3, п.5) ----------
    const mileForm = $('#mileage-form'), mileInput = $('#mileage-input');
    $('#mileage-toggle').addEventListener('click', () => {
        mileForm.hidden = !mileForm.hidden;
        if (!mileForm.hidden) { mileInput.value = car().mileage; mileInput.focus(); mileInput.select(); }
        $('#mileage-warning').hidden = true; ui.mileWarn = null; ui.mileAck = false; $('#mileage-save').textContent = 'Зберегти';
    });
    mileInput.addEventListener('input', () => {
        const v = Number(mileInput.value);
        ui.mileWarn = mileInput.value !== '' ? currentMileageAnomaly(car(), v) : null; ui.mileAck = false;
        $('#mileage-warning').hidden = !ui.mileWarn;
        if (ui.mileWarn) $('#mileage-warning span').textContent = ui.mileWarn;
        $('#mileage-save').textContent = 'Зберегти';
    });
    mileForm.addEventListener('submit', e => {
        e.preventDefault();
        const v = Number(mileInput.value);
        if (mileInput.value === '' || v < 0) { markInvalid(mileInput, true); return; }
        markInvalid(mileInput, false);
        if (ui.mileWarn && !ui.mileAck) { ui.mileAck = true; $('#mileage-save').textContent = 'Все одно зберегти'; return; }
        car().mileage = v; mileForm.hidden = true; ui.mileWarn = null; ui.mileAck = false;
        renderAll(); toast('Пробіг оновлено');
    });

    // ---------- cars (AUTO-7 п.2) ----------
    function openCarModal(addMode) {
        $('#car-list').innerHTML = carCardsHtml();
        $('#car-pick').hidden = !!addMode; $('#car-form').hidden = !addMode;
        $('#car-modal-title').textContent = addMode ? 'Нове авто' : 'Мої авто';
        setErr($('#car-error'), '');
        openModal('car-modal');
    }
    $('#car-selector').addEventListener('click', () => openCarModal(false));
    $('#profile-add-car').addEventListener('click', () => openCarModal(true));
    $('#car-add-btn').addEventListener('click', () => openCarModal(true));
    $('#car-back').addEventListener('click', () => openCarModal(false));
    $('#car-form').addEventListener('submit', e => {
        e.preventDefault();
        const f = id => $('#' + id);
        const make = f('car-make').value.trim(), model = f('car-model').value.trim(), year = Number(f('car-year').value), km = f('car-mileage').value, vin = f('car-vin').value.trim().toUpperCase();
        const yearMax = new Date().getFullYear() + 1;
        const bad = [];
        if (!make) bad.push(f('car-make')); if (!model) bad.push(f('car-model'));
        if (!(year >= 1950 && year <= yearMax)) bad.push(f('car-year'));
        if (km === '' || Number(km) < 0) bad.push(f('car-mileage'));
        if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) bad.push(f('car-vin'));
        ['car-make', 'car-model', 'car-year', 'car-mileage', 'car-vin'].forEach(id => markInvalid(f(id), bad.includes(f(id))));
        if (bad.length) { setErr($('#car-error'), 'Заповніть усі поля. VIN — 17 символів (латиниця й цифри, без I, O, Q).'); return; }
        const c = { id: nextId(state.cars), make, model, year, fuel: f('car-fuel').value, mileage: Number(km), vin };
        state.cars.push(c); state.currentCarId = c.id;
        e.target.reset(); closeModals(); renderAll(); toast(`Авто додано: ${carName(c)}. Тепер додайте роботи в план ТО.`);
    });

    // ---------- diary entry (AUTO-7 п.4) ----------
    $('#work-options').innerHTML = TYPICAL.map(t => `<option value="${esc(t.name)}">`).join('');
    function refreshEntryWarning() {
        const km = $('#entry-mileage').value, d = $('#entry-date').value;
        ui.entryWarn = km !== '' && d ? mileageAnomaly(car().id, d, Number(km)) : null; ui.entryAck = false;
        $('#entry-warning').hidden = !ui.entryWarn;
        if (ui.entryWarn) $('#entry-warning span').textContent = ui.entryWarn;
        $('#entry-save').textContent = 'Зберегти запис';
    }
    function openEntryModal() {
        $('#entry-form').reset();
        $('#entry-date').value = today(); $('#entry-mileage').value = car().mileage;
        $('#entry-files-label').textContent = 'Додати фото та файли';
        setErr($('#entry-error'), ''); refreshEntryWarning(); openModal('entry-modal');
    }
    $('#add-record-btn').addEventListener('click', openEntryModal);
    $('#diary-add-btn').addEventListener('click', openEntryModal);
    ['entry-date', 'entry-mileage'].forEach(id => $('#' + id).addEventListener('input', refreshEntryWarning));
    $('#entry-files').addEventListener('change', e => {
        const n = e.target.files.length; $('#entry-files-label').textContent = n ? `Додано: ${n} ${plural(n, 'файл', 'файли', 'файлів')}` : 'Додати фото та файли';
    });
    $('#entry-form').addEventListener('submit', e => {
        e.preventDefault();
        const date = $('#entry-date').value, km = $('#entry-mileage').value, work = $('#entry-work').value.trim();
        markInvalid($('#entry-date'), !date); markInvalid($('#entry-mileage'), km === ''); markInvalid($('#entry-work'), !work);
        if (!date || km === '' || !work) { setErr($('#entry-error'), 'Вкажіть дату, пробіг і роботу.'); return; }
        setErr($('#entry-error'), '');
        if (ui.entryWarn && !ui.entryAck) { ui.entryAck = true; $('#entry-save').textContent = 'Все одно зберегти'; return; }
        const c = car();
        state.entries.push({ id: nextId(state.entries), carId: c.id, date, mileage: Number(km), work, price: Number($('#entry-price').value) || 0, author: 'me', files: $('#entry-files').files.length, note: $('#entry-note').value.trim() });
        if (Number(km) > c.mileage) c.mileage = Number(km);
        closeModals(); renderAll(); toast('Запис додано до щоденника');
    });

    // ---------- plan (AUTO-9 п.1–2) ----------
    function openPlanModal(id) {
        const c = car();
        ui.editPlanId = id || null;
        const w = id ? state.plan.find(x => x.id === id) : null;
        const used = state.plan.filter(x => x.carId === c.id).map(x => x.key);
        const sel = $('#plan-work');
        sel.innerHTML = TYPICAL.filter(t => w ? t.key === w.key : !used.includes(t.key)).map(t => `<option value="${t.key}">${esc(t.name)}</option>`).join('');
        if (!sel.options.length) { toast('Усі типові роботи вже в плані. Змініть існуючу.'); return; }
        sel.disabled = !!w;
        $('#plan-modal-title').textContent = w ? 'Змінити роботу' : 'Додати роботу в план';
        const t = typical(sel.value);
        const src = w || { km: t.km, months: t.months, priority: t.priority, lastDate: '', lastKm: null, unknown: false };
        $('#plan-km').value = src.km; $('#plan-months').value = src.months; $('#plan-priority').value = src.priority;
        $('#plan-last-date').value = src.lastDate || ''; $('#plan-last-km').value = src.lastKm ?? ''; $('#plan-unknown').checked = !!src.unknown;
        syncUnknown(); setErr($('#plan-error'), ''); openModal('plan-modal');
    }
    function syncUnknown() {
        const u = $('#plan-unknown').checked;
        $('#plan-last-date').disabled = u; $('#plan-last-km').disabled = u;
    }
    $('#plan-unknown').addEventListener('change', syncUnknown);
    $('#plan-work').addEventListener('change', () => {
        if (ui.editPlanId) return;
        const t = typical($('#plan-work').value); $('#plan-km').value = t.km; $('#plan-months').value = t.months; $('#plan-priority').value = t.priority;
    });
    $('#plan-add-btn').addEventListener('click', () => openPlanModal(null));
    $('#plan-form').addEventListener('submit', e => {
        e.preventDefault();
        const km = Number($('#plan-km').value) || 0, months = Number($('#plan-months').value) || 0, unknown = $('#plan-unknown').checked;
        const lastDate = $('#plan-last-date').value, lastKm = $('#plan-last-km').value;
        if (!km && !months) { setErr($('#plan-error'), 'Вкажіть інтервал у кілометрах або місяцях.'); return; }
        if (!unknown && !lastDate && lastKm === '') { setErr($('#plan-error'), 'Вкажіть, коли робили востаннє, або позначте «Не знаю».'); return; }
        const data = { km, months, priority: $('#plan-priority').value, unknown, lastDate: unknown ? '' : lastDate, lastKm: unknown || lastKm === '' ? null : Number(lastKm) };
        if (ui.editPlanId) Object.assign(state.plan.find(x => x.id === ui.editPlanId), data);
        else state.plan.push({ id: nextId(state.plan), carId: car().id, key: $('#plan-work').value, ...data });
        closeModals(); renderAll(); toast('План ТО оновлено');
    });

    // ---------- repair requests (AUTO-11) ----------
    function openRequestModal(planId) {
        const c = car();
        $('#request-form').reset();
        const items = state.plan.filter(w => w.carId === c.id);
        $('#req-source').innerHTML = items.map(w => `<option value="${w.id}">${esc(workName(w))}</option>`).join('') + '<option value="other">Інша проблема (з нуля)</option>';
        $('#req-source').value = planId ? String(planId) : 'other';
        syncReqSource(); $('#req-files-label').textContent = 'Фото, файли, аудіо (як файл)'; setErr($('#req-error'), '');
        openModal('request-modal');
    }
    function syncReqSource() { $('#req-title-group').hidden = $('#req-source').value !== 'other'; }
    $('#req-source').addEventListener('change', syncReqSource);
    $('#req-files').addEventListener('change', e => {
        const n = e.target.files.length; $('#req-files-label').textContent = n ? `Додано: ${n} ${plural(n, 'файл', 'файли', 'файлів')}` : 'Фото, файли, аудіо (як файл)';
    });
    $('#req-add-btn').addEventListener('click', () => openRequestModal(null));
    $('#req-filter').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { ui.reqFilter = b.dataset.filter; renderRequests(); } });
    $('#request-form').addEventListener('submit', e => {
        e.preventDefault();
        const src = $('#req-source').value, other = src === 'other';
        const plan = other ? null : state.plan.find(w => w.id === Number(src));
        const title = other ? $('#req-title').value.trim() : workName(plan);
        const desc = $('#req-desc').value.trim();
        if (!title || !desc) { setErr($('#req-error'), other ? 'Вкажіть коротку назву й опис проблеми.' : 'Опишіть проблему, щоб СТО зрозуміла задачу без дзвінка.'); return; }
        const files = Array.from($('#req-files').files).map(f => f.name);
        const r = { id: nextId(state.requests), carId: car().id, planKey: plan ? plan.key : null, title, desc, files, status: 'open', createdAt: today(), stoName: '', visibility: 'all', expiresAt: '', declined: false, closedAt: null, response: null, report: null };
        state.requests.push(r); ui.reqId = r.id; ui.reqFilter = 'active';
        closeModals(); renderAll(); showView('request-view');
        toast('Запит створено. Тепер створіть посилання для СТО.');
    });

    function shareCreate() {
        const r = curReq(), name = $('#share-sto').value.trim();
        if (!name) { markInvalid($('#share-sto'), true); setErr($('#share-error'), 'Вкажіть назву СТО.'); return; }
        const vis = ($('input[name="vis"]:checked') || {}).value || 'all';
        const days = Number($('#share-days').value);
        const exp = new Date(); exp.setDate(exp.getDate() + days);
        Object.assign(r, { stoName: name, visibility: vis, expiresAt: iso(exp), declined: false });
        ui.shareDraft = { visibility: vis, days };
        renderRequestDetail(); toast('Посилання створено. Надішліть його СТО.');
    }
    function stoAnswer() {
        const r = state.requests.find(x => x.id === ui.stoReqId);
        const dec = $('input[name="sto-decision"]:checked').value;
        if (dec === 'no') { r.declined = true; renderAll(); toast('Відповідь надіслано: СТО не бере запит.'); return; }
        const price = $('#sto-price').value;
        if (price === '' || Number(price) <= 0) { markInvalid($('#sto-price'), true); setErr($('#sto-error'), 'Вкажіть ціну роботи.'); return; }
        r.response = { decision: 'take', price: Number(price), findings: $('#sto-findings').value.trim() };
        r.status = 'answered'; renderAll(); toast('Відповідь надіслано власнику.');
    }
    document.addEventListener('change', e => {
        if (e.target.matches('input[name="sto-decision"]')) $('#sto-take-fields').hidden = e.target.value === 'no';
        if (e.target.matches('input[data-slot]')) {
            const inp = e.target, f = inp.files[0]; if (!f) return;
            const rid = Number(inp.dataset.req), reader = new FileReader();
            reader.onload = () => {
                (ui.drafts[rid] = ui.drafts[rid] || {})[inp.dataset.slot] = reader.result;
                inp.parentElement.classList.add('filled'); inp.parentElement.style.backgroundImage = `url('${reader.result}')`;
            };
            reader.readAsDataURL(f);
        }
    });
    const svgThumb = (label, color) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="${color}"/><text x="60" y="66" font-size="14" font-family="sans-serif" fill="white" text-anchor="middle">${label}</text></svg>`);
    function demoReport(id) {
        ui.drafts[id] = { odometer: svgThumb('145 210 км', '#1e3a5f'), old: svgThumb('стара', '#7c2d12'), new: svgThumb('нова', '#14532d'), article: 'Brembo P 85 123' };
        renderSto();
    }
    function submitReport(id, mode) {
        const r = state.requests.find(x => x.id === id), d = ui.drafts[id] || {};
        const article = ($('#report-article-' + mode).value || '').trim();
        if (!d.odometer || !d.old || !d.new || !article) { setErr($('#report-error-' + mode), 'Додайте три фото (одометр, стара й нова деталь) та артикул нової деталі.'); return; }
        r.report = { odometer: d.odometer, old: d.old, new: d.new, article, by: mode === 'sto' ? 'sto' : 'owner' };
        r.status = 'done'; delete ui.drafts[id]; renderAll(); toast('Фотозвіт додано.');
    }
    function resolveRequest() {
        const r = curReq(), c = state.cars.find(x => x.id === r.carId);
        state.entries.push({ id: nextId(state.entries), carId: c.id, date: today(), mileage: c.mileage, work: r.title, price: r.response ? r.response.price : 0, author: r.stoName ? 'sto' : 'me', stoName: r.stoName, files: r.report ? 3 : 0, note: r.response ? r.response.findings : '' });
        const w = state.plan.find(x => x.carId === c.id && x.key === r.planKey);
        if (w) Object.assign(w, { lastDate: today(), lastKm: c.mileage, unknown: false });
        r.status = 'resolved'; renderAll();
        toast('Запис додано до щоденника, план ТО оновлено.', { label: 'Щоденник', run: () => showView('diary-view') });
    }
    $('#sto-back').addEventListener('click', () => { showView('request-view'); renderRequestDetail(); });

    // ---------- init ----------
    renderRoadmap();
    renderAll();
});
