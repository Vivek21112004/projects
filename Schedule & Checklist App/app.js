/* ════════════════════════════════════════════════════════════
   My Planner – app.js
   ════════════════════════════════════════════════════════════ */

/* ── Service Worker ────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

/* ── Constants ─────────────────────────────────────────────── */
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const SLOT_COLORS = ['#7c3aed','#2563eb','#0891b2','#059669','#d97706','#dc2626','#db2777'];
const STORAGE_KEY_SCHEDULE  = 'planner_schedule';
const STORAGE_KEY_CHECKLIST = 'planner_checklist';
const STORAGE_KEY_STREAK    = 'planner_streak';

const TODAY_DAY = new Date().getDay();

/* ── State ─────────────────────────────────────────────────── */
let state = {
  schedule:  loadJSON(STORAGE_KEY_SCHEDULE,  defaultSchedule()),
  checklist: loadJSON(STORAGE_KEY_CHECKLIST, defaultChecklist()),
  streak:    loadJSON(STORAGE_KEY_STREAK,    { count: 0, lastDate: '' }),
  activeDay: DAYS[TODAY_DAY === 0 ? 6 : TODAY_DAY - 1],
  editingSlot: null,   // { dayIndex, slotId } | null
};

/* ── Helpers ────────────────────────────────────────────────── */
function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}
function save() {
  localStorage.setItem(STORAGE_KEY_SCHEDULE,  JSON.stringify(state.schedule));
  localStorage.setItem(STORAGE_KEY_CHECKLIST, JSON.stringify(state.checklist));
  localStorage.setItem(STORAGE_KEY_STREAK,    JSON.stringify(state.streak));
}
function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function defaultSchedule() {
  return DAYS.map(day => ({ day, slots: [] }));
}
function defaultChecklist() {
  return [
    { id: uid(), name: 'Fitness',  emoji: '🏃', items: [
        { id: uid(), text: 'Morning Jog',   done: false },
        { id: uid(), text: 'Evening Walk',  done: false },
    ]},
    { id: uid(), name: 'Academics', emoji: '📚', items: [] },
  ];
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

/* ── Date display ───────────────────────────────────────────── */
(function updateDate() {
  const d = new Date();
  document.getElementById('dateDisplay').textContent =
    d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' });
})();

/* ── Streak tracking ────────────────────────────────────────── */
function updateStreak() {
  const today = new Date().toISOString().slice(0,10);
  const s = state.streak;
  if (s.lastDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  s.count = (s.lastDate === yesterday) ? s.count + 1 : 1;
  s.lastDate = today;
  save();
}
updateStreak();

/* ════════════════════════════════════════════════════════════
   TAB SWITCHING
   ════════════════════════════════════════════════════════════ */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'progress') renderProgress();
  });
});

/* ════════════════════════════════════════════════════════════
   SCHEDULE TAB
   ════════════════════════════════════════════════════════════ */
function renderDaySelector() {
  const container = document.getElementById('daySelector');
  container.innerHTML = '';
  DAYS.forEach(day => {
    const btn = document.createElement('button');
    btn.className = 'day-chip' + (day === state.activeDay ? ' active' : '');
    const dayData = state.schedule.find(d => d.day === day);
    if (dayData && dayData.slots.length) btn.classList.add('has-items');
    btn.textContent = day.slice(0,3);
    btn.addEventListener('click', () => { state.activeDay = day; renderSchedule(); });
    container.appendChild(btn);
  });
}

function renderSchedule() {
  renderDaySelector();
  document.getElementById('scheduleDayTitle').textContent = state.activeDay;
  const dayData = state.schedule.find(d => d.day === state.activeDay);
  const list    = document.getElementById('slotList');
  const noSlots = document.getElementById('noSlots');
  list.innerHTML = '';

  if (!dayData || !dayData.slots.length) {
    noSlots.style.display = 'block';
    return;
  }
  noSlots.style.display = 'none';

  dayData.slots.forEach(slot => {
    const el = document.createElement('div');
    el.className = 'schedule-slot' + (slot.done ? ' completed' : '');
    el.style.borderLeftColor = slot.color || 'var(--accent)';

    el.innerHTML = `
      <div class="slot-time">${escHtml(slot.time)}</div>
      <div class="slot-body">
        <div class="slot-title">${escHtml(slot.title)}</div>
        ${slot.note ? `<div class="slot-note">${escHtml(slot.note)}</div>` : ''}
      </div>
      <div class="slot-actions">
        <button class="btn-icon" title="${slot.done ? 'Mark pending' : 'Mark done'}"
          data-action="toggle" data-id="${slot.id}">${slot.done ? '↩️' : '✅'}</button>
        <button class="btn-icon" title="Edit" data-action="edit" data-id="${slot.id}">✏️</button>
        <button class="btn-icon" title="Delete" data-action="delete" data-id="${slot.id}">🗑️</button>
      </div>`;
    list.appendChild(el);
  });

  list.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleSlotAction(btn.dataset.action, btn.dataset.id));
  });
}

function handleSlotAction(action, id) {
  const dayData = state.schedule.find(d => d.day === state.activeDay);
  if (!dayData) return;
  const slot = dayData.slots.find(s => s.id === id);
  if (!slot) return;

  if (action === 'toggle') {
    slot.done = !slot.done;
    save();
    toast(slot.done ? '✅ Marked done!' : '↩ Marked pending');
    renderSchedule();
  } else if (action === 'delete') {
    dayData.slots = dayData.slots.filter(s => s.id !== id);
    save();
    toast('🗑 Slot removed');
    renderSchedule();
  } else if (action === 'edit') {
    openSlotModal(slot);
  }
}

/* ── Slot Modal ─────────────────────────────────────────────── */
let selectedSlotColor = SLOT_COLORS[0];

function buildColorPicker() {
  const cp = document.getElementById('colorPicker');
  cp.innerHTML = '';
  SLOT_COLORS.forEach(c => {
    const dot = document.createElement('button');
    dot.style.cssText = `width:26px;height:26px;border-radius:50%;background:${c};border:3px solid transparent;cursor:pointer;`;
    dot.title = c;
    dot.addEventListener('click', () => {
      selectedSlotColor = c;
      cp.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
      dot.style.borderColor = '#fff';
    });
    if (c === selectedSlotColor) dot.style.borderColor = '#fff';
    cp.appendChild(dot);
  });
}

function openSlotModal(existingSlot = null) {
  state.editingSlot = existingSlot;
  document.getElementById('slotModalTitle').textContent = existingSlot ? 'Edit Slot' : 'Add Schedule Slot';
  document.getElementById('slotTimeInput').value  = existingSlot?.time  || '';
  document.getElementById('slotTitleInput').value = existingSlot?.title || '';
  document.getElementById('slotNoteInput').value  = existingSlot?.note  || '';
  selectedSlotColor = existingSlot?.color || SLOT_COLORS[0];
  buildColorPicker();
  openModal('slotModal');
}

document.getElementById('addSlotBtn').addEventListener('click', () => openSlotModal());
document.getElementById('slotCancelBtn').addEventListener('click', () => closeModal('slotModal'));
document.getElementById('slotSaveBtn').addEventListener('click', () => {
  const time  = document.getElementById('slotTimeInput').value.trim();
  const title = document.getElementById('slotTitleInput').value.trim();
  const note  = document.getElementById('slotNoteInput').value.trim();
  if (!title) { toast('⚠️ Title is required'); return; }

  const dayData = state.schedule.find(d => d.day === state.activeDay);
  if (!dayData) return;

  if (state.editingSlot) {
    const slot = dayData.slots.find(s => s.id === state.editingSlot.id);
    if (slot) { slot.time = time; slot.title = title; slot.note = note; slot.color = selectedSlotColor; }
    toast('✏️ Slot updated');
  } else {
    dayData.slots.push({ id: uid(), time, title, note, color: selectedSlotColor, done: false });
    toast('🎉 Slot added');
  }
  save();
  closeModal('slotModal');
  renderSchedule();
});

/* ════════════════════════════════════════════════════════════
   CHECKLIST TAB
   ════════════════════════════════════════════════════════════ */
function renderChecklist() {
  const container = document.getElementById('categoryList');
  container.innerHTML = '';

  state.checklist.forEach(cat => {
    const total   = cat.items.length;
    const done    = cat.items.filter(i => i.done).length;
    const pct     = total ? Math.round(done / total * 100) : 0;

    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.padding = '.75rem';
    wrap.innerHTML = `
      <div class="category-header" data-cat="${cat.id}">
        <span class="cat-title">${escHtml(cat.emoji)} ${escHtml(cat.name)}</span>
        <div style="display:flex;align-items:center;gap:.5rem">
          <span class="cat-progress">${done}/${total}</span>
          <button class="btn-icon" data-del-cat="${cat.id}" title="Delete category" style="color:var(--danger)">🗑</button>
        </div>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
      <div class="category-items" id="items-${cat.id}">
        ${cat.items.map(item => renderItemHTML(item)).join('')}
        <div class="add-form" style="margin-top:.5rem">
          <input class="inline-input" placeholder="Add item…" id="newItem-${cat.id}" style="margin-bottom:0"/>
          <button class="btn btn-success btn-sm" data-add-item="${cat.id}">Add</button>
        </div>
      </div>`;

    container.appendChild(wrap);

    /* toggle collapse */
    wrap.querySelector('.category-header').addEventListener('click', e => {
      if (e.target.closest('[data-del-cat]')) return;
      wrap.querySelector('.category-items').classList.toggle('collapsed');
    });

    /* delete category */
    wrap.querySelector('[data-del-cat]').addEventListener('click', () => {
      if (!confirm(`Delete category "${cat.name}"?`)) return;
      state.checklist = state.checklist.filter(c => c.id !== cat.id);
      save(); renderChecklist();
      toast('🗑 Category deleted');
    });

    /* check/uncheck items */
    wrap.querySelectorAll('.check-box').forEach(box => {
      box.addEventListener('click', () => {
        const item = cat.items.find(i => i.id === box.dataset.item);
        if (!item) return;
        item.done = !item.done;
        save(); renderChecklist();
        toast(item.done ? '✅ Done!' : '↩ Unchecked');
      });
    });

    /* delete items */
    wrap.querySelectorAll('[data-del-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        cat.items = cat.items.filter(i => i.id !== btn.dataset.delItem);
        save(); renderChecklist();
      });
    });

    /* edit item label inline */
    wrap.querySelectorAll('[data-edit-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id   = btn.dataset.editItem;
        const item = cat.items.find(i => i.id === id);
        if (!item) return;
        const label = wrap.querySelector(`[data-label="${id}"]`);
        const inp = document.createElement('input');
        inp.className = 'inline-input';
        inp.value = item.text;
        inp.style.marginBottom = '0';
        label.replaceWith(inp);
        inp.focus();
        inp.select();
        const commit = () => {
          const v = inp.value.trim();
          if (v) { item.text = v; save(); }
          renderChecklist();
        };
        inp.addEventListener('blur', commit);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
      });
    });

    /* add item via enter key in input */
    const newItemInput = wrap.querySelector(`#newItem-${cat.id}`);
    const addItemFn = () => {
      const text = newItemInput.value.trim();
      if (!text) return;
      cat.items.push({ id: uid(), text, done: false });
      save(); renderChecklist();
      toast('📝 Item added');
    };
    newItemInput.addEventListener('keydown', e => { if (e.key === 'Enter') addItemFn(); });
    wrap.querySelector(`[data-add-item="${cat.id}"]`).addEventListener('click', addItemFn);
  });
}

function renderItemHTML(item) {
  return `
    <div class="checklist-item">
      <div class="check-box ${item.done ? 'checked' : ''}" data-item="${item.id}">
        ${item.done ? '✓' : ''}
      </div>
      <span class="item-label ${item.done ? 'done' : ''}" data-label="${item.id}">${escHtml(item.text)}</span>
      <button class="btn-icon" data-edit-item="${item.id}" title="Edit">✏️</button>
      <button class="btn-icon" data-del-item="${item.id}" title="Delete">🗑️</button>
    </div>`;
}

/* ── Category Modal ─────────────────────────────────────────── */
document.getElementById('addCategoryBtn').addEventListener('click', () => openModal('categoryModal'));
document.getElementById('catCancelBtn').addEventListener('click', () => closeModal('categoryModal'));
document.getElementById('catSaveBtn').addEventListener('click', () => {
  const name  = document.getElementById('catNameInput').value.trim();
  const emoji = document.getElementById('catEmojiInput').value.trim() || '📋';
  if (!name) { toast('⚠️ Name is required'); return; }
  state.checklist.push({ id: uid(), name, emoji, items: [] });
  save(); renderChecklist();
  closeModal('categoryModal');
  toast('📂 Category added');
});

/* ════════════════════════════════════════════════════════════
   PROGRESS TAB
   ════════════════════════════════════════════════════════════ */
function renderProgress() {
  /* streak */
  document.getElementById('streakText').textContent =
    `${state.streak.count} day${state.streak.count !== 1 ? 's' : ''} streak 🔥`;

  /* stats */
  const totalItems = state.checklist.reduce((a, c) => a + c.items.length, 0);
  const doneItems  = state.checklist.reduce((a, c) => a + c.items.filter(i => i.done).length, 0);
  const totalSlots = state.schedule.reduce((a, d) => a + d.slots.length, 0);
  const doneSlots  = state.schedule.reduce((a, d) => a + d.slots.filter(s => s.done).length, 0);

  document.getElementById('statGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-number">${doneItems}</div>
      <div class="stat-label">Topics done</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${totalItems - doneItems}</div>
      <div class="stat-label">Topics left</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${doneSlots}</div>
      <div class="stat-label">Slots done</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${totalSlots}</div>
      <div class="stat-label">Total slots</div>
    </div>`;

  /* per-category progress */
  const pc = document.getElementById('progressCategories');
  pc.innerHTML = '';
  state.checklist.forEach(cat => {
    const total = cat.items.length;
    const done  = cat.items.filter(i => i.done).length;
    const pct   = total ? Math.round(done / total * 100) : 0;
    pc.innerHTML += `
      <div class="card" style="padding:.85rem">
        <div style="display:flex;justify-content:space-between;margin-bottom:.5rem">
          <span style="font-weight:700">${escHtml(cat.emoji)} ${escHtml(cat.name)}</span>
          <span style="font-size:.8rem;color:var(--muted)">${pct}% — ${done}/${total}</span>
        </div>
        <div class="progress-bar-wrap" style="height:10px">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  });

  /* weekly schedule completion */
  pc.innerHTML += `<div class="card" style="padding:.85rem">
    <div style="font-weight:700;margin-bottom:.75rem">📅 Weekly Schedule</div>
    ${DAYS.map(day => {
      const d = state.schedule.find(x => x.day === day) || { slots: [] };
      const t = d.slots.length;
      const dn = d.slots.filter(s => s.done).length;
      const p = t ? Math.round(dn / t * 100) : 0;
      return `
        <div style="margin-bottom:.6rem">
          <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:.25rem">
            <span>${day}</span>
            <span style="color:var(--muted)">${dn}/${t}</span>
          </div>
          <div class="progress-bar-wrap" style="height:7px">
            <div class="progress-bar-fill" style="width:${p}%"></div>
          </div>
        </div>`;
    }).join('')}
  </div>`;
}

/* ════════════════════════════════════════════════════════════
   MODAL HELPERS
   ════════════════════════════════════════════════════════════ */
function openModal(id) {
  const m = document.getElementById(id);
  m.classList.add('open');
  setTimeout(() => m.querySelector('input')?.focus(), 250);
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
/* close modal on backdrop click */
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

/* ── Escape HTML ────────────────────────────────────────────── */
const HTML_ENTITIES = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
function escHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => HTML_ENTITIES[c]);
}

/* ════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════ */
renderSchedule();
renderChecklist();
