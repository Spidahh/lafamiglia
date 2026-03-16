// ============================================================
//  La Famiglia V6 – App Logic
// ============================================================

let activeTab      = 'active';
let activeCategory = 'all';
let activeTaskId   = null;
let activePersona  = null;
let sortCol        = 'default';
let sortDir        = 1;

document.addEventListener('DOMContentLoaded', () => {
  renderCategoryChips();
  populateCategorySelects();
  render();
});

// ============================================================
//  NAVIGAZIONE
// ============================================================

function switchTab(tab) {
  activeTab      = tab;
  activeCategory = 'all';
  closeTaskPanel();

  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tab)
  );
  document.querySelectorAll('.tab-content').forEach(el =>
    el.classList.toggle('active', el.id === 'tab-' + tab)
  );

  const isPersona = tab === 'persona';
  document.getElementById('catChipsBar').style.display   = isPersona ? 'none' : '';
  document.getElementById('searchBarWrap').style.display = isPersona ? 'none' : '';

  document.querySelectorAll('.cat-chip').forEach(c =>
    c.classList.toggle('active', c.dataset.cat === 'all')
  );

  render();
}

// Cambia tab senza chiudere il pannello laterale
function setTabUI(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tab)
  );
  document.querySelectorAll('.tab-content').forEach(el =>
    el.classList.toggle('active', el.id === 'tab-' + tab)
  );
  const isPersona = tab === 'persona';
  document.getElementById('catChipsBar').style.display   = isPersona ? 'none' : '';
  document.getElementById('searchBarWrap').style.display = isPersona ? 'none' : '';
  activeCategory = 'all';
  document.querySelectorAll('.cat-chip').forEach(c =>
    c.classList.toggle('active', c.dataset.cat === 'all')
  );
}

function selectCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.cat-chip').forEach(c =>
    c.classList.toggle('active', c.dataset.cat === cat)
  );
  render();
}

function applyFilters() {
  const q = getQ();
  document.getElementById('searchClear').style.display = q ? '' : 'none';
  render();
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  render();
}

function setSort(col) {
  if (sortCol === col) sortDir *= -1;
  else { sortCol = col; sortDir = 1; }
  render();
}

function updateSortHeaders() {
  const cols = { title: 'col-title', category: 'col-cat', status: 'col-status' };
  const labels = { title: 'Lavoro', category: 'Categoria', status: 'Stato' };
  Object.entries(cols).forEach(([col, cls]) => {
    const th = document.querySelector(`#dataTable thead .${cls}`);
    if (!th) return;
    const arrow = sortCol === col ? (sortDir === 1 ? ' ↑' : ' ↓') : ' ↕';
    th.textContent = labels[col] + arrow;
    th.style.cursor = 'pointer';
  });
}

// ============================================================
//  RENDER PRINCIPALE
// ============================================================

function render() {
  updateTabCounts();
  if      (activeTab === 'active')  renderActiveTab();
  else if (activeTab === 'archive') renderArchiveTab();
  else if (activeTab === 'persona') renderPersonaTab();
}

function updateTabCounts() {
  const tasks  = getTasks();
  const active = tasks.filter(t => t.status !== 'done').length;
  const done   = tasks.filter(t => t.status === 'done').length;
  document.getElementById('countActive').textContent  = active;
  document.getElementById('countArchive').textContent = done;
}

// ============================================================
//  TAB: LAVORI ATTIVI
// ============================================================

function renderActiveTab() {
  let tasks = getTasks().filter(t => t.status !== 'done');
  tasks = applyFilterLogic(tasks);
  sortTasks(tasks);

  const tbody = document.getElementById('tableBody');
  const noRes = document.getElementById('noResultsMsg');

  if (tasks.length === 0) {
    tbody.innerHTML = '';
    noRes.style.display = 'flex';
    noRes.innerHTML = emptyHtml(
      getQ() || activeCategory !== 'all'
        ? 'Nessun lavoro trovato con questi filtri.'
        : 'Nessun lavoro attivo. Crea il primo!'
    );
    return;
  }
  noRes.style.display = 'none';
  tbody.innerHTML = '';
  const q = getQ();
  tasks.forEach(t => tbody.appendChild(buildRow(t, q, false)));
  updateSortHeaders();
}

// ============================================================
//  TAB: ARCHIVIO
// ============================================================

function renderArchiveTab() {
  let tasks = getTasks().filter(t => t.status === 'done');
  tasks = applyFilterLogic(tasks);
  tasks.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  const tbody = document.getElementById('archiveBody');
  const noRes = document.getElementById('noResultsArchive');

  if (tasks.length === 0) {
    tbody.innerHTML = '';
    noRes.style.display = 'flex';
    noRes.innerHTML = emptyHtml('Nessun lavoro completato ancora.');
    return;
  }
  noRes.style.display = 'none';
  tbody.innerHTML = '';
  const q = getQ();
  tasks.forEach(t => tbody.appendChild(buildRow(t, q, true)));
}

// ============================================================
//  TAB: PER PERSONA
// ============================================================

function renderPersonaTab() {
  const people   = getPeople();
  const allTasks = getTasks().filter(t => t.status !== 'done');
  const container = document.getElementById('personaView');

  if (people.length === 0) {
    container.innerHTML = `
      <div class="empty-persona">
        <div class="empty-icon">👤</div>
        <p>Nessuna persona aggiunta.</p>
        <button class="btn-primary" onclick="openPeopleModal()">+ Aggiungi Persone</button>
      </div>`;
    return;
  }

  // Barra filtro: mostra ruolo sotto il nome
  let html = `<div class="persona-filter-bar">
    <button class="persona-btn ${!activePersona ? 'active' : ''}" onclick="setPersonaFilter(null)">Tutti</button>
    ${people.map(p => `
      <button class="persona-btn ${activePersona === p.name ? 'active' : ''}" onclick="setPersonaFilter('${jsStr(p.name)}')">
        <span class="pf-avatar">${p.name.charAt(0).toUpperCase()}</span>
        <span class="pf-info">
          <span>${escHtml(p.name)}</span>
          ${p.role ? `<span class="pf-role">${escHtml(p.role)}</span>` : ''}
        </span>
      </button>`).join('')}
    <button class="btn-manage-people" onclick="openPeopleModal()">⚙️ Gestisci</button>
  </div>`;

  if (activePersona) {
    // Vista persona singola: mostra solo quella
    const person = people.find(p => p.name === activePersona);
    if (person) {
      const pTasks = allTasks.filter(t => (t.assignees || []).includes(person.name));
      html += buildPersonaCard(person, pTasks);
    }
  } else {
    // Vista "Tutti": raggruppa per mansione
    // Raccogli ruoli unici, ordine alfabetico; persone senza ruolo in fondo
    const roles      = [...new Set(people.map(p => p.role || ''))].sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    });

    roles.forEach(role => {
      const group = people.filter(p => (p.role || '') === role);
      if (group.length === 0) return;

      // Intestazione sezione mansione
      if (role) {
        html += `<div class="role-section-header">
          <span class="role-section-badge">${escHtml(role.toUpperCase())}</span>
        </div>`;
      } else {
        html += `<div class="role-section-header">
          <span class="role-section-badge no-role">Senza mansione</span>
        </div>`;
      }

      group.forEach(person => {
        const pTasks = allTasks.filter(t => (t.assignees || []).includes(person.name));
        html += buildPersonaCard(person, pTasks);
      });
    });

    // Non assegnati
    const unassigned = allTasks.filter(t => !t.assignees || t.assignees.length === 0);
    if (unassigned.length > 0) {
      html += `<div class="role-section-header">
        <span class="role-section-badge no-role">Non assegnati</span>
      </div>`;
      html += buildPersonaCard({ name: 'Non assegnati', phone: '', role: '' }, unassigned, true);
    }
  }

  container.innerHTML = html;
}

function buildPersonaCard(person, tasks, isUnassigned = false) {
  const initial     = isUnassigned ? '?' : person.name.charAt(0).toUpperCase();
  const avatarStyle = isUnassigned ? 'style="background:#94A3B8;"' : '';

  // Badge mansione + telefono cliccabile
  const contactHtml = !isUnassigned ? `
    <div class="persona-contact">
      ${person.role  ? `<span class="role-badge">${escHtml(person.role)}</span>` : ''}
      ${person.phone ? `<a class="contact-phone" href="tel:${escHtml(person.phone)}">📞 ${escHtml(person.phone)}</a>` : ''}
    </div>` : '';

  let inner = '';
  if (tasks.length === 0) {
    inner = '<div class="persona-empty-msg">Nessun lavoro aperto assegnato.</div>';
  } else {
    const byCat = {};
    CATEGORIES.forEach(c => { byCat[c] = []; });
    tasks.forEach(t => {
      const cat = CATEGORIES.includes(t.category) ? t.category : 'ALTRO';
      byCat[cat].push(t);
    });

    inner = '<div class="persona-tasks">';
    CATEGORIES.forEach(cat => {
      if (byCat[cat].length === 0) return;
      inner += `<div class="persona-cat-group">
        <div class="persona-cat-label">${cat}</div>
        ${byCat[cat].map(t => {
          // Ultima nota (non auto-log)
          const manualLogs = (t.logs || []).filter(l => !l.text.startsWith('📌'));
          const lastNote   = manualLogs.length > 0 ? manualLogs[manualLogs.length - 1] : null;
          return `
          <div class="persona-task-row" onclick="openTaskPanel('${t.id}')">
            <div class="persona-task-main">
              <span class="status-dot s-dot-${t.status}"></span>
              <div class="persona-task-info">
                <span class="persona-task-title">${escHtml(t.title)}</span>
                ${lastNote ? `<span class="persona-task-note">💬 ${escHtml(lastNote.text.substring(0, 80))}${lastNote.text.length > 80 ? '…' : ''}</span>` : ''}
              </div>
              <span class="status-pill sp-${t.status === 'waiting' ? 'wait' : t.status}">${STATUS_LABELS[t.status]}</span>
            </div>
          </div>`;
        }).join('')}
      </div>`;
    });
    inner += '</div>';
  }

  return `<div class="persona-card">
    <div class="persona-card-header">
      <span class="persona-avatar" ${avatarStyle}>${initial}</span>
      <div class="persona-info">
        <span class="persona-name">${escHtml(person.name)}</span>
        ${contactHtml}
      </div>
      <span class="persona-count">${tasks.length} lavori</span>
    </div>
    ${inner}
  </div>`;
}

function setPersonaFilter(p) {
  activePersona = p;
  renderPersonaTab();
}

// ============================================================
//  BUILDER RIGA TABELLA
// ============================================================

function buildRow(task, q, isArchive) {
  const tr = document.createElement('tr');
  if (isArchive) tr.classList.add('archived-row');
  tr.onclick = () => openTaskPanel(task.id);

  const hl   = makeHL(q);
  const logs = task.logs || [];
  const last = logs.length > 0 ? logs[logs.length - 1] : null;

  const allPeople  = getPeople();
  const peopleHtml = (task.assignees || []).length > 0
    ? task.assignees.map(a => {
        const p    = allPeople.find(x => x.name === a);
        const role = p?.role || '';
        return `<span class="person-chip">
          <span class="person-chip-av">${a.charAt(0).toUpperCase()}</span>
          <span class="person-chip-info">
            <span class="person-chip-name">${escHtml(a)}</span>
            ${role ? `<span class="person-chip-role">${escHtml(role)}</span>` : ''}
          </span>
        </span>`;
      }).join('')
    : '<span class="no-person">—</span>';

  const logHtml = `<span class="log-ind ${logs.length ? 'has-logs' : ''}">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    ${logs.length || ''}
  </span>`;

  if (isArchive) {
    const dateStr = task.completedAt
      ? new Date(task.completedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })
      : '—';
    tr.innerHTML = `
      <td class="col-dot"><span class="check-done">✓</span></td>
      <td class="col-title">
        <div class="row-title done-title">${hl(task.title)}</div>
        ${last ? `<span class="row-context">${hl(last.text.substring(0, 75))}${last.text.length > 75 ? '…' : ''}</span>` : ''}
      </td>
      <td class="col-cat"><span class="cat-pill ${catClass(task.category)}">${task.category}</span></td>
      <td class="col-people">${peopleHtml}</td>
      <td class="col-date"><span class="date-str">${dateStr}</span></td>
      <td class="col-log">${logHtml}</td>`;
  } else {
    tr.innerHTML = `
      <td class="col-dot"><span class="status-dot s-dot-${task.status}"></span></td>
      <td class="col-title">
        <div class="row-title">${hl(task.title)}</div>
        ${last ? `<span class="row-context">${hl(last.text.substring(0, 75))}${last.text.length > 75 ? '…' : ''}</span>` : ''}
      </td>
      <td class="col-cat"><span class="cat-pill ${catClass(task.category)}">${task.category}</span></td>
      <td class="col-people">${peopleHtml}</td>
      <td class="col-status"><span class="status-pill sp-${task.status === 'waiting' ? 'wait' : task.status}">${STATUS_LABELS[task.status]}</span></td>
      <td class="col-log">${logHtml}</td>`;
  }
  return tr;
}

function catClass(cat) {
  const map = { 'PISCINA': 'cat-piscina', 'CASA 1': 'cat-casa1', 'CASA 2': 'cat-casa2', 'CASA 3': 'cat-casa3', 'ALTRO': 'cat-altro' };
  return map[cat] || 'cat-altro';
}

// ============================================================
//  HELPERS FILTRI / SORT
// ============================================================

function applyFilterLogic(tasks) {
  const q = getQ();
  if (activeCategory !== 'all') tasks = tasks.filter(t => t.category === activeCategory);
  if (q) {
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.assignees || []).some(a => a.toLowerCase().includes(q)) ||
      (t.logs || []).some(l => l.text.toLowerCase().includes(q))
    );
  }
  return tasks;
}

function sortTasks(tasks) {
  if (sortCol === 'title') {
    tasks.sort((a, b) => a.title.localeCompare(b.title) * sortDir);
  } else if (sortCol === 'status') {
    const w = { todo: 1, doing: 2, waiting: 3, done: 4 };
    tasks.sort((a, b) => ((w[a.status] || 0) - (w[b.status] || 0)) * sortDir);
  } else if (sortCol === 'category') {
    tasks.sort((a, b) => a.category.localeCompare(b.category) * sortDir);
  } else {
    tasks.sort((a, b) => b.createdAt - a.createdAt);
  }
}

function getQ() {
  return (document.getElementById('searchInput').value || '').toLowerCase().trim();
}

function makeHL(q) {
  return (txt) => {
    if (!q || !txt) return escHtml(txt || '');
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escHtml(txt).replace(re, '<mark>$1</mark>');
  };
}

function emptyHtml(msg) {
  return `<div class="empty-state"><div class="empty-icon-lg">📋</div><p>${msg}</p></div>`;
}

function escHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Safe string for use inside single-quoted JS onclick attributes
function jsStr(str) {
  if (!str) return '';
  return str.toString().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ============================================================
//  PANNELLO LATERALE
// ============================================================

function openTaskPanel(taskId) {
  activeTaskId = taskId;
  const task = getTask(taskId);
  if (!task) return;

  document.getElementById('tpTitleInput').value     = task.title;
  document.getElementById('tpCatSelect').value      = task.category;
  document.getElementById('tpStatusSelect').value   = task.status;
  renderPanelAssigneePicker(task.assignees || []);

  // Auto-save: title on blur, category on change
  document.getElementById('tpTitleInput').onblur  = () => { if (activeTaskId) savePanelTask(); };
  document.getElementById('tpCatSelect').onchange = () => { if (activeTaskId) savePanelTask(); };

  const meta = [];
  if (task.createdAt)   meta.push(`📅 Creato: ${fmtDate(task.createdAt)}`);
  if (task.startedAt)   meta.push(`🔨 Iniziato: ${fmtDate(task.startedAt)}`);
  if (task.completedAt) meta.push(`✅ Finito: ${fmtDate(task.completedAt)}`);
  document.getElementById('tpMeta').innerHTML =
    meta.map(m => `<span class="meta-chip">${m}</span>`).join('');

  renderTimeline(task);
  document.getElementById('taskPanel').classList.add('open');
  document.getElementById('panelOverlay').classList.add('open');
}

function closeTaskPanel() {
  activeTaskId = null;
  document.getElementById('taskPanel').classList.remove('open');
  document.getElementById('panelOverlay').classList.remove('open');
}

function renderTimeline(task) {
  const container = document.getElementById('tpTimeline');
  if (!task.logs || task.logs.length === 0) {
    container.innerHTML = `<div class="empty-logs">Diario vuoto. Aggiungi la prima nota!</div>`;
    return;
  }

  const sorted = [...task.logs].sort((a, b) => a.date - b.date);
  container.innerHTML = '';

  sorted.forEach(log => {
    const isAuto = log.text.startsWith('📌');
    const el = document.createElement('div');
    el.className = 'log-item' + (isAuto ? ' log-auto' : '');
    el.innerHTML = `
      <div class="log-dot">${isAuto ? '📌' : '📝'}</div>
      <div class="log-content">
        <div class="log-date">
          <span>${fmtDateFull(log.date)}</span>
          ${!isAuto ? `<button class="log-del" onclick="handleDeleteLog('${log.id}')">✕</button>` : ''}
        </div>
        <div class="log-text ${isAuto ? 'log-auto-text' : ''}">${escHtml(log.text)}</div>
      </div>`;
    container.appendChild(el);
  });

  setTimeout(() => {
    const pb = document.querySelector('.panel-body');
    if (pb) pb.scrollTop = pb.scrollHeight;
  }, 10);
}

function handleStatusChange(e) {
  if (!activeTaskId) return;
  const newStatus = e.target.value;
  const taskId    = activeTaskId;

  updateTaskStatus(taskId, newStatus);

  if (activeTab === 'archive' && newStatus !== 'done') {
    setTabUI('active');
  } else if (activeTab === 'active' && newStatus === 'done') {
    setTabUI('archive');
  }

  render();
  activeTaskId = taskId;
  openTaskPanel(taskId);
}

function handleSendLog() {
  if (!activeTaskId) return;
  const ta   = document.getElementById('newLogText');
  const text = ta.value.trim();
  if (!text) return;
  addLog(activeTaskId, text);
  ta.value = '';
  render();
  openTaskPanel(activeTaskId);
}

document.getElementById('newLogText').addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSendLog();
});

function handleDeleteLog(logId) {
  if (!activeTaskId || !confirm('Eliminare questa nota?')) return;
  deleteLog(activeTaskId, logId);
  render();
  openTaskPanel(activeTaskId);
}

function handleDeleteTaskProcess() {
  if (!activeTaskId || !confirm('Eliminare questo lavoro e tutto il suo storico?')) return;
  deleteTask(activeTaskId);
  closeTaskPanel();
  render();
}

// ============================================================
//  MODALS: NUOVO / MODIFICA LAVORO
// ============================================================

function renderCategoryChips() {
  const bar = document.getElementById('catChipsBar');
  bar.innerHTML = `<button class="cat-chip active" data-cat="all" onclick="selectCategory('all')">Tutte</button>`;
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className   = 'cat-chip';
    btn.dataset.cat = cat;
    btn.textContent = cat;
    btn.onclick     = () => selectCategory(cat);
    bar.appendChild(btn);
  });
}

function populateCategorySelects() {
  ['inpTaskCat', 'tpCatSelect'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) sel.innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  });
}

function openNewTaskModal() {
  document.getElementById('inpTaskTitle').value = '';
  document.getElementById('inpTaskCat').value   = CATEGORIES[0];
  renderAssigneePicker('newTaskAssignees', []);
  document.getElementById('taskModal').classList.add('open');
  setTimeout(() => document.getElementById('inpTaskTitle').focus(), 100);
}

function saveTaskModal() {
  const title = document.getElementById('inpTaskTitle').value.trim();
  if (!title) { document.getElementById('inpTaskTitle').focus(); return; }
  const cat       = document.getElementById('inpTaskCat').value;
  const assignees = getCheckedAssignees('newTaskAssignees');
  const task = addTask(title, cat, assignees);
  closeModal('taskModal');
  render();
  openTaskPanel(task.id);
}

function savePanelTask() {
  if (!activeTaskId) return;
  const title = document.getElementById('tpTitleInput').value.trim();
  if (!title) { document.getElementById('tpTitleInput').focus(); return; }
  updateTaskDetails(activeTaskId, {
    title,
    category:  document.getElementById('tpCatSelect').value,
    assignees: getCheckedAssignees('tpAssignees')
  });
  render();
  // Refresh meta dates without fully reopening (preserve focus)
  const task = getTask(activeTaskId);
  if (task) {
    const meta = [];
    if (task.createdAt)   meta.push(`📅 Creato: ${fmtDate(task.createdAt)}`);
    if (task.startedAt)   meta.push(`🔨 Iniziato: ${fmtDate(task.startedAt)}`);
    if (task.completedAt) meta.push(`✅ Finito: ${fmtDate(task.completedAt)}`);
    document.getElementById('tpMeta').innerHTML =
      meta.map(m => `<span class="meta-chip">${m}</span>`).join('');
  }
}

function renderPanelAssigneePicker(selected) {
  const container = document.getElementById('tpAssignees');
  if (!container) return;
  const people = getPeople();
  if (people.length === 0) {
    container.innerHTML = `<span class="no-people-hint">
      Nessuna persona. <button class="link-btn" onclick="openPeopleModal()">Aggiungi</button>
    </span>`;
    return;
  }
  container.innerHTML = people.map(p => `
    <label class="assignee-toggle ${selected.includes(p.name) ? 'sel' : ''}">
      <input type="checkbox" value="${escHtml(p.name)}" ${selected.includes(p.name) ? 'checked' : ''}
             onchange="this.closest('.assignee-toggle').classList.toggle('sel', this.checked); savePanelTask();">
      <span class="at-avatar">${p.name.charAt(0).toUpperCase()}</span>
      <span class="at-info">
        <span class="at-name">${escHtml(p.name)}</span>
        ${p.role ? `<span class="at-role">${escHtml(p.role)}</span>` : ''}
      </span>
    </label>
  `).join('') + `<button class="btn-add-person-inline" onclick="openPeopleModal()">+ Persona</button>`;
}

// ============================================================
//  ASSIGNEE PICKER
// ============================================================

function renderAssigneePicker(containerId, selected) {
  const container = document.getElementById(containerId);
  const people    = getPeople();
  if (people.length === 0) {
    container.innerHTML = `<span class="no-people-hint">
      Nessuna persona. <button class="link-btn" onclick="openPeopleModal()">Aggiungi</button>
    </span>`;
    return;
  }
  container.innerHTML = people.map(p => `
    <label class="assignee-toggle ${selected.includes(p.name) ? 'sel' : ''}">
      <input type="checkbox" value="${escHtml(p.name)}" ${selected.includes(p.name) ? 'checked' : ''}
             onchange="this.closest('.assignee-toggle').classList.toggle('sel', this.checked)">
      <span class="at-avatar">${p.name.charAt(0).toUpperCase()}</span>
      <span class="at-info">
        <span class="at-name">${escHtml(p.name)}</span>
        ${p.role ? `<span class="at-role">${escHtml(p.role)}</span>` : ''}
      </span>
    </label>
  `).join('') + `<button class="btn-add-person-inline" onclick="openPeopleModal()">+ Persona</button>`;
}

function getCheckedAssignees(containerId) {
  return Array.from(
    document.getElementById(containerId).querySelectorAll('input[type="checkbox"]:checked')
  ).map(c => c.value);
}

// ============================================================
//  MODAL: PERSONE
// ============================================================

function openPeopleModal() {
  renderPeopleList();
  document.getElementById('inpNewPerson').value = '';
  document.getElementById('inpNewPhone').value  = '';
  document.getElementById('inpNewRole').value   = '';
  document.getElementById('peopleModal').classList.add('open');
}

function renderPeopleList() {
  const people = getPeople();
  const el     = document.getElementById('peopleList');
  if (people.length === 0) {
    el.innerHTML = '<div class="no-people-hint">Nessuna persona aggiunta.</div>';
    return;
  }
  el.innerHTML = people.map(p => `
    <div class="person-card" id="pcard-${escHtml(p.name)}">
      <div class="person-card-row">
        <span class="persona-avatar">${p.name.charAt(0).toUpperCase()}</span>
        <div class="person-card-info">
          <span class="person-name">${escHtml(p.name)}</span>
          <div class="person-details">
            ${p.role  ? `<span>🔧 ${escHtml(p.role)}</span>`  : ''}
            ${p.phone ? `<a href="tel:${escHtml(p.phone)}">📞 ${escHtml(p.phone)}</a>` : ''}
          </div>
        </div>
        <button class="btn-icon-sm" onclick="togglePersonEdit('${jsStr(p.name)}')" title="Modifica">✏️</button>
        <button class="btn-icon-sm danger" onclick="handleDeletePerson('${jsStr(p.name)}')" title="Rimuovi">✕</button>
      </div>
      <div class="person-edit-form" id="pedit-${escHtml(p.name)}">
        <div class="person-edit-fields">
          <div class="frm-group">
            <label>Nome</label>
            <input type="text" id="pname-${escHtml(p.name)}" value="${escHtml(p.name)}">
          </div>
          <div class="frm-group">
            <label>Telefono</label>
            <input type="tel" id="pphone-${escHtml(p.name)}" value="${escHtml(p.phone)}" placeholder="+39 320 ...">
          </div>
          <div class="frm-group">
            <label>Mansione</label>
            <input type="text" id="prole-${escHtml(p.name)}" value="${escHtml(p.role)}" placeholder="Es. Idraulico">
          </div>
        </div>
        <button class="btn-save-person" onclick="handleSavePerson('${jsStr(p.name)}')">💾 Salva</button>
      </div>
    </div>
  `).join('');
}

function togglePersonEdit(name) {
  document.querySelectorAll('.person-edit-form').forEach(f => {
    if (f.id !== 'pedit-' + name) f.classList.remove('open');
  });
  const form = document.getElementById('pedit-' + name);
  if (form) form.classList.toggle('open');
}

function handleSavePerson(oldName) {
  const newName = (document.getElementById('pname-'  + oldName)?.value || '').trim();
  const phone   = (document.getElementById('pphone-' + oldName)?.value || '').trim();
  const role    = (document.getElementById('prole-'  + oldName)?.value || '').trim();
  if (!newName) return;
  updatePerson(oldName, { name: newName, phone, role });
  renderPeopleList();
  render();
  const np = document.getElementById('newTaskAssignees');
  if (np && np.children.length) renderAssigneePicker('newTaskAssignees', getCheckedAssignees('newTaskAssignees'));
  if (activeTaskId) renderPanelAssigneePicker(getCheckedAssignees('tpAssignees'));
}

function handleAddPerson() {
  const name  = document.getElementById('inpNewPerson').value.trim();
  const phone = document.getElementById('inpNewPhone').value.trim();
  const role  = document.getElementById('inpNewRole').value.trim();
  if (!name) { document.getElementById('inpNewPerson').focus(); return; }
  addPerson(name, phone, role);
  document.getElementById('inpNewPerson').value = '';
  document.getElementById('inpNewPhone').value  = '';
  document.getElementById('inpNewRole').value   = '';
  renderPeopleList();
  const np = document.getElementById('newTaskAssignees');
  if (np && np.children.length) renderAssigneePicker('newTaskAssignees', getCheckedAssignees('newTaskAssignees'));
  if (activeTaskId) renderPanelAssigneePicker(getCheckedAssignees('tpAssignees'));
}

function handleDeletePerson(name) {
  if (!confirm(`Rimuovere "${name}" da tutte le task?`)) return;
  deletePerson(name);
  renderPeopleList();
  render();
}

document.getElementById('inpNewPerson').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAddPerson();
});

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.overlay').forEach(ov =>
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); })
);

// ============================================================
//  IMPORT FILE
// ============================================================

function handleImportFile(e) {
  const file = e.target.files[0];
  if (file) importData(file);
  e.target.value = '';
}

// ============================================================
//  DATE HELPERS
// ============================================================

function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateFull(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}
