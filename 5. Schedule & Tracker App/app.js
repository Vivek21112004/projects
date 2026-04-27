'use strict';

/* ── Constants ───────────────────────────────────────────────── */
const STORAGE_KEY = 'vivek_planner_v1';
const START_HOUR  = 5;
const END_HOUR    = 23;
const HOURS       = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);
const COLORS      = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
const MS_PER_DAY  = 864e5; // milliseconds in one day
const DAYS        = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── Default data ────────────────────────────────────────────── */
const DEFAULT_DATA = {
  schedule: {},
  checklists: [
    {
      id: 'subjects', name: '📚 Subjects', color: '#6366f1', open: true,
      items: [
        { id: 's1', text: 'Digital Signal Processing', done: false },
        { id: 's2', text: 'VLSI Design',               done: false },
        { id: 's3', text: 'Embedded Systems',           done: false },
        { id: 's4', text: 'Wireless Communications',    done: false },
        { id: 's5', text: 'Control Systems',            done: false },
      ]
    },
    {
      id: 'fitness', name: '🏃 Fitness', color: '#10b981', open: false,
      items: [
        { id: 'f1', text: 'Morning Jog (5 km)', done: false },
        { id: 'f2', text: 'Evening Walk',        done: false },
        { id: 'f3', text: 'Workout / Gym',       done: false },
        { id: 'f4', text: 'Stretching / Yoga',   done: false },
      ]
    },
    {
      id: 'personal', name: '🎯 Personal', color: '#f59e0b', open: false,
      items: [
        { id: 'p1', text: 'Read 30 minutes',    done: false },
        { id: 'p2', text: 'Review daily notes', done: false },
        { id: 'p3', text: 'IEEE project work',  done: false },
      ]
    }
  ]
};

/* ── State ───────────────────────────────────────────────────── */
const state = {
  currentDate: new Date(),
  data:        loadData(),
  activeTab:   'schedule',
};

/* ── Persistence ─────────────────────────────────────────────── */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        schedule:   parsed.schedule   || {},
        checklists: parsed.checklists || JSON.parse(JSON.stringify(DEFAULT_DATA.checklists)),
      };
    }
  } catch (_) { /* ignore */ }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data)); } catch (_) { /* ignore */ }
}

/* ── Utilities ───────────────────────────────────────────────── */
function dateKey(d) {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function formatHour(h) {
  if (h === 0)   return '12 AM';
  if (h < 12)    return `${h} AM`;
  if (h === 12)  return '12 PM';
  return `${h - 12} PM`;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function isToday(d) {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

/** Escape HTML special characters to prevent XSS */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* ── Render: Header ──────────────────────────────────────────── */
function renderHeader() {
  const t = new Date();
  document.getElementById('headerDate').textContent =
    `${DAYS[t.getDay()]}, ${t.getDate()} ${MONTHS[t.getMonth()]}`;
}

/* ── Render: Schedule ────────────────────────────────────────── */
function renderSchedule() {
  const d        = state.currentDate;
  const dKey     = dateKey(d);
  const dayData  = state.data.schedule[dKey] || {};
  const nowHour  = new Date().getHours();

  document.getElementById('currentDayName').textContent =
    isToday(d) ? '📅 Today' : DAYS[d.getDay()];
  document.getElementById('currentDateFull').textContent =
    `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

  const grid = document.getElementById('scheduleGrid');
  grid.innerHTML = '';

  HOURS.forEach(h => {
    const slotKey = `${String(h).padStart(2, '0')}:00`;
    const task    = dayData[slotKey];
    const isCurrent = isToday(d) && h === nowHour;

    const row = document.createElement('div');
    row.className = 'time-slot';
    row.innerHTML = `
      <div class="time-label">${esc(formatHour(h))}</div>
      <div class="slot-card ${task ? 'filled' : ''} ${isCurrent ? 'current-hour' : ''}"
           data-slot="${esc(slotKey)}"
           style="${task ? `border-left-color:${esc(task.color || COLORS[0])}` : ''}">
        ${task
          ? `<div class="slot-task-name">${esc(task.task)}</div>
             ${task.notes ? `<div class="slot-task-notes">${esc(task.notes)}</div>` : ''}`
          : `<div class="slot-empty">Tap to add…</div>`
        }
      </div>`;
    grid.appendChild(row);
  });

  // Scroll to 7 AM on first open so user sees useful hours
  if (!grid.dataset.scrolled) {
    grid.dataset.scrolled = '1';
    setTimeout(() => {
      const cards = grid.querySelectorAll('.slot-card');
      const idx   = HOURS.indexOf(7);
      if (idx >= 0 && cards[idx]) cards[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }
}

/* ── Render: Checklist ───────────────────────────────────────── */
function renderChecklist() {
  const container = document.getElementById('checklistContainer');
  container.innerHTML = '';

  if (state.data.checklists.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);text-align:center;margin-top:40px">No categories yet. Tap "+ Category" to add one.</p>';
    return;
  }

  state.data.checklists.forEach(cat => {
    const done  = cat.items.filter(i => i.done).length;
    const total = cat.items.length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

    const el = document.createElement('div');
    el.className    = 'checklist-category';
    el.dataset.catId = cat.id;

    el.innerHTML = `
      <div class="category-header" data-action="toggle-cat" data-id="${esc(cat.id)}">
        <div class="category-color-dot" style="background:${esc(cat.color)}"></div>
        <div class="category-name">${esc(cat.name)}</div>
        <div class="category-count">${done}/${total}</div>
        <div class="category-chevron ${cat.open ? 'open' : ''}">▾</div>
      </div>
      <div class="category-prog-bar">
        <div class="category-prog-fill" style="width:${pct}%;background:${esc(cat.color)}"></div>
      </div>
      <div class="category-body ${cat.open ? 'open' : ''}">
        ${cat.items.map(item => `
          <div class="checklist-item" data-item-id="${esc(item.id)}">
            <div class="item-checkbox ${item.done ? 'checked' : ''}"
                 data-action="toggle-item"
                 data-cat="${esc(cat.id)}"
                 data-item="${esc(item.id)}"
                 role="checkbox"
                 aria-checked="${item.done}"
                 tabindex="0"></div>
            <div class="item-text ${item.done ? 'done' : ''}">${esc(item.text)}</div>
            <button class="item-delete"
                    data-action="delete-item"
                    data-cat="${esc(cat.id)}"
                    data-item="${esc(item.id)}"
                    aria-label="Delete item">✕</button>
          </div>`).join('')}
        <div class="add-item-row">
          <input class="add-item-input"
                 type="text"
                 placeholder="Add item…"
                 data-cat="${esc(cat.id)}"
                 maxlength="100"
                 aria-label="New item text" />
          <button class="btn-sm"
                  data-action="add-item"
                  data-cat="${esc(cat.id)}">Add</button>
        </div>
        <div class="cat-actions">
          <button class="btn-outline-danger"
                  data-action="delete-cat"
                  data-id="${esc(cat.id)}">🗑 Delete Category</button>
        </div>
      </div>`;
    container.appendChild(el);
  });
}

/* ── Render: Progress ────────────────────────────────────────── */
function renderProgress() {
  const lists      = state.data.checklists;
  const totalDone  = lists.reduce((s, c) => s + c.items.filter(i => i.done).length, 0);
  const totalItems = lists.reduce((s, c) => s + c.items.length, 0);
  const overallPct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

  const todayData       = state.data.schedule[dateKey(new Date())] || {};
  const scheduledToday  = Object.keys(todayData).length;

  document.getElementById('progressOverview').innerHTML = `
    <div class="overall-card">
      <div class="overall-label">Overall Checklist Progress</div>
      <div class="overall-pct">${overallPct}%</div>
      <div class="overall-bar-bg">
        <div class="overall-bar-fill" style="width:${overallPct}%"></div>
      </div>
      <div class="overall-sub">${totalDone} of ${totalItems} tasks completed</div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${totalItems}</div>
        <div class="stat-label">Total Tasks</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalDone}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${scheduledToday}</div>
        <div class="stat-label">Scheduled Today</div>
      </div>
    </div>

    ${lists.map(cat => {
      const done  = cat.items.filter(i => i.done).length;
      const total = cat.items.length;
      const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
      return `
        <div class="prog-card">
          <div class="prog-card-header">
            <div class="prog-card-name">
              <div class="prog-dot" style="background:${esc(cat.color)}"></div>
              ${esc(cat.name)}
            </div>
            <div class="prog-pct">${pct}%</div>
          </div>
          <div class="prog-bar-bg">
            <div class="prog-bar-fill" style="width:${pct}%;background:${esc(cat.color)}"></div>
          </div>
          <div class="prog-stats">${done} of ${total} completed</div>
        </div>`;
    }).join('')}

    ${totalItems > 0 ? `
    <div class="reset-btn-row">
      <button class="btn-outline" id="resetAllBtn">↺ Reset All Checklists</button>
    </div>` : ''}`;

  const resetBtn = document.getElementById('resetAllBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (!confirm('Reset all checklist items to unchecked?')) return;
      state.data.checklists.forEach(cat => cat.items.forEach(item => { item.done = false; }));
      saveData();
      renderProgress();
      if (state.activeTab === 'checklist') renderChecklist();
    });
  }
}

/* ── Modals ──────────────────────────────────────────────────── */
function openModal(html) {
  document.getElementById('modal').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function colorSwatches(selectedColor) {
  return COLORS.map((c, i) =>
    `<div class="color-swatch ${(selectedColor ? c === selectedColor : i === 0) ? 'selected' : ''}"
          style="background:${esc(c)}"
          data-color="${esc(c)}"
          role="radio"
          aria-checked="${(selectedColor ? c === selectedColor : i === 0)}"
          tabindex="0"></div>`
  ).join('');
}

function showSlotModal(dKey, slotKey, task) {
  const h     = parseInt(slotKey, 10);
  const title = task ? `Edit — ${esc(formatHour(h))}` : `Add Task — ${esc(formatHour(h))}`;
  openModal(`
    <div class="modal-title">${title}</div>
    <div class="modal-field">
      <label class="modal-label" for="slotTask">Task / Activity</label>
      <input class="modal-input" id="slotTask" type="text"
             value="${task ? esc(task.task) : ''}"
             placeholder="e.g. DSP Study, Morning Jog…"
             maxlength="80" autocomplete="off" />
    </div>
    <div class="modal-field">
      <label class="modal-label" for="slotNotes">Notes (optional)</label>
      <textarea class="modal-textarea" id="slotNotes"
                placeholder="Any details…">${task ? esc(task.notes || '') : ''}</textarea>
    </div>
    <div class="modal-field">
      <label class="modal-label">Colour</label>
      <div class="color-row" id="colorPicker" role="radiogroup">${colorSwatches(task?.color)}</div>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" id="modalCancel">Cancel</button>
      ${task ? `<button class="btn-danger" id="modalDelete">Delete</button>` : ''}
      <button class="btn-primary" id="modalSave">Save</button>
    </div>`);

  setTimeout(() => document.getElementById('slotTask')?.focus(), 80);

  document.getElementById('modalCancel').onclick = closeModal;
  if (task) {
    document.getElementById('modalDelete').onclick = () => {
      deleteSlot(dKey, slotKey);
    };
  }
  document.getElementById('modalSave').onclick = () => saveSlot(dKey, slotKey);
}

function showAddCategoryModal() {
  openModal(`
    <div class="modal-title">New Checklist Category</div>
    <div class="modal-field">
      <label class="modal-label" for="catName">Name</label>
      <input class="modal-input" id="catName" type="text"
             placeholder="e.g. 📖 Projects, 💪 Fitness…"
             maxlength="50" autocomplete="off" />
    </div>
    <div class="modal-field">
      <label class="modal-label">Colour</label>
      <div class="color-row" id="colorPicker" role="radiogroup">${colorSwatches(null)}</div>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" id="modalCancel">Cancel</button>
      <button class="btn-primary" id="modalSave">Create</button>
    </div>`);

  setTimeout(() => document.getElementById('catName')?.focus(), 80);
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('modalSave').onclick   = saveCategory;
}

/* ── Actions ─────────────────────────────────────────────────── */
function getPickedColor() {
  const sel = document.querySelector('#colorPicker .color-swatch.selected');
  return sel ? sel.dataset.color : COLORS[0];
}

function saveSlot(dKey, slotKey) {
  const taskEl  = document.getElementById('slotTask');
  const taskVal = taskEl ? taskEl.value.trim() : '';
  if (!taskVal) { taskEl?.focus(); return; }

  const notes = (document.getElementById('slotNotes')?.value || '').trim();
  const color = getPickedColor();

  if (!state.data.schedule[dKey]) state.data.schedule[dKey] = {};
  state.data.schedule[dKey][slotKey] = { task: taskVal, notes, color };

  saveData();
  closeModal();
  renderSchedule();
}

function deleteSlot(dKey, slotKey) {
  const day = state.data.schedule[dKey];
  if (day) {
    delete day[slotKey];
    if (Object.keys(day).length === 0) delete state.data.schedule[dKey];
  }
  saveData();
  closeModal();
  renderSchedule();
}

function saveCategory() {
  const nameEl  = document.getElementById('catName');
  const nameVal = nameEl ? nameEl.value.trim() : '';
  if (!nameVal) { nameEl?.focus(); return; }

  state.data.checklists.push({
    id: uid(), name: nameVal, color: getPickedColor(), open: true, items: []
  });
  saveData();
  closeModal();
  renderChecklist();
}

function toggleCategory(id) {
  const cat = state.data.checklists.find(c => c.id === id);
  if (cat) { cat.open = !cat.open; saveData(); renderChecklist(); }
}

function toggleItem(catId, itemId) {
  const cat  = state.data.checklists.find(c => c.id === catId);
  const item = cat?.items.find(i => i.id === itemId);
  if (item) { item.done = !item.done; saveData(); renderChecklist(); }
  if (state.activeTab === 'progress') renderProgress();
}

function deleteItem(catId, itemId) {
  const cat = state.data.checklists.find(c => c.id === catId);
  if (cat) { cat.items = cat.items.filter(i => i.id !== itemId); saveData(); renderChecklist(); }
}

function addItem(catId, text) {
  const val = text.trim();
  if (!val) return;
  const cat = state.data.checklists.find(c => c.id === catId);
  if (cat) { cat.items.push({ id: uid(), text: val, done: false }); saveData(); renderChecklist(); }
}

function deleteCategory(id) {
  if (!confirm('Delete this category and all its items?')) return;
  state.data.checklists = state.data.checklists.filter(c => c.id !== id);
  saveData();
  renderChecklist();
}

function switchTab(name) {
  state.activeTab = name;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.querySelector(`.nav-item[data-tab="${name}"]`).classList.add('active');
  if (name === 'schedule')  renderSchedule();
  if (name === 'checklist') renderChecklist();
  if (name === 'progress')  renderProgress();
}

/* ── Global event delegation ─────────────────────────────────── */
document.addEventListener('click', e => {
  const t = e.target;

  // Bottom nav
  const navBtn = t.closest('.nav-item');
  if (navBtn && navBtn.dataset.tab) { switchTab(navBtn.dataset.tab); return; }

  // Schedule slot
  const slotCard = t.closest('.slot-card');
  if (slotCard) {
    const slotKey = slotCard.dataset.slot;
    const dKey    = dateKey(state.currentDate);
    showSlotModal(dKey, slotKey, state.data.schedule[dKey]?.[slotKey] ?? null);
    return;
  }

  // Prev / next / today
  if (t.id === 'prevDay')  { state.currentDate = new Date(state.currentDate - MS_PER_DAY); renderSchedule(); return; }
  if (t.id === 'nextDay')  { state.currentDate = new Date(+state.currentDate + MS_PER_DAY); renderSchedule(); return; }
  if (t.id === 'todayBtn') { state.currentDate = new Date(); renderSchedule(); return; }

  // Add category button
  if (t.id === 'addCategoryBtn') { showAddCategoryModal(); return; }

  // Colour swatch picker
  if (t.classList.contains('color-swatch')) {
    document.querySelectorAll('.color-swatch').forEach(s => { s.classList.remove('selected'); s.setAttribute('aria-checked', 'false'); });
    t.classList.add('selected');
    t.setAttribute('aria-checked', 'true');
    return;
  }

  // Checklist delegated actions
  const el     = t.closest('[data-action]');
  const action = el?.dataset.action;
  if (!action) {
    // Close modal when clicking overlay backdrop
    if (t.id === 'modal-overlay') { closeModal(); }
    return;
  }

  switch (action) {
    case 'toggle-cat':   toggleCategory(el.dataset.id);  break;
    case 'toggle-item':  toggleItem(el.dataset.cat, el.dataset.item); break;
    case 'delete-item':  deleteItem(el.dataset.cat, el.dataset.item); break;
    case 'add-item': {
      const inp = document.querySelector(`.add-item-input[data-cat="${el.dataset.cat}"]`);
      if (inp) { addItem(el.dataset.cat, inp.value); inp.value = ''; inp.focus(); }
      break;
    }
    case 'delete-cat': deleteCategory(el.dataset.id); break;
  }
});

// Keyboard: Enter on add-item input submits; Space/Enter on checkbox / color swatch
document.addEventListener('keydown', e => {
  const t = e.target;

  if (e.key === 'Enter' && t.classList.contains('add-item-input')) {
    const catId = t.dataset.cat;
    addItem(catId, t.value);
    t.value = '';
    return;
  }

  if ((e.key === 'Enter' || e.key === ' ') && t.classList.contains('item-checkbox')) {
    e.preventDefault();
    toggleItem(t.dataset.cat, t.dataset.item);
    return;
  }

  if ((e.key === 'Enter' || e.key === ' ') && t.classList.contains('color-swatch')) {
    e.preventDefault();
    document.querySelectorAll('.color-swatch').forEach(s => { s.classList.remove('selected'); s.setAttribute('aria-checked', 'false'); });
    t.classList.add('selected');
    t.setAttribute('aria-checked', 'true');
    return;
  }

  // Escape closes modal
  if (e.key === 'Escape') closeModal();
});

/* ── Service Worker registration ─────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => { /* offline install not critical */ });
  });
}

/* ── Init ────────────────────────────────────────────────────── */
renderHeader();
renderSchedule();
