// ============================================================
//  La Famiglia V4 – App Logic (Kanban Visuale)
// ============================================================

let activeRootId = null;
let activeTaskId = null;

const STATUS_LABELS = {
  'todo': 'Da iniziare',
  'doing': 'In lavorazione',
  'waiting': 'In attesa (di risposte o pezzi)',
  'done': 'Completato'
};

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();
  const roots = getRoots();
  if (roots.length) selectRoot(roots[0].id);
  else renderMainBoard();
});

// ============================================================
//  SIDEBAR
// ============================================================
function renderSidebar() {
  const rootList = document.getElementById('rootList');
  rootList.innerHTML = '';
  const roots = getRoots();
  roots.forEach(r => {
    const item = document.createElement('div');
    item.className = 'root-item' + (r.id === activeRootId ? ' active' : '');
    item.innerHTML = `
      <span>${r.icon}</span>
      <span style="flex:1">${escHtml(r.name)}</span>
      <button class="del-btn" onclick="handleDeleteRoot('${r.id}', event)">✕</button>
    `;
    item.onclick = () => selectRoot(r.id);
    rootList.appendChild(item);
  });
}

function selectRoot(id) {
  activeRootId = id;
  closeTaskPanel();
  renderSidebar();
  renderMainBoard();
}

// ============================================================
//  MAIN BOARD (Kanban Rendering)
// ============================================================
function renderMainBoard() {
  const container = document.getElementById('mainBoard');
  
  if (!activeRootId) {
    container.innerHTML = `
      <div class="no-root-state">
        <h2>Seleziona o crea una casa</h2>
      </div>`;
    return;
  }

  const root = getRoots().find(r => r.id === activeRootId);
  const tasks = getTasks(activeRootId);
  const doneCount = tasks.filter(t => t.status === 'done').length;

  // Header 
  container.innerHTML = `
    <div class="board-header">
      <div>
        <h2>${root.icon} ${escHtml(root.name)}</h2>
        <p>${tasks.length} progetti gestiti &bull; ${doneCount} completati</p>
      </div>
      <button class="btn-primary" onclick="openNewTaskModal()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Nuovo Progetto
      </button>
    </div>
    
    <div class="kanban-container" id="kanbanBoard">
      <!-- Colonne riempite da JS -->
    </div>
  `;

  // Raggruppa per Categoria. Se un task non ha categoria, finisce in "Generale"
  const gruppi = {};
  tasks.forEach(t => {
    const c = t.category ? t.category.trim() : 'Generale';
    if (!gruppi[c]) gruppi[c] = [];
    gruppi[c].push(t);
  });

  const board = document.getElementById('kanbanBoard');

  // Per ogni categoria, crea una colonna (Swimlane)
  Object.keys(gruppi).sort().forEach(catName => {
    const tasksInCat = gruppi[catName];
    
    const colObj = document.createElement('div');
    colObj.className = 'kanban-column';
    colObj.innerHTML = `
      <div class="col-header">
        <span>${escHtml(catName)}</span>
        <span class="col-count">${tasksInCat.length}</span>
      </div>
      <div class="col-cards" id="col-${catName.replace(/\s+/g, '-')}"></div>
    `;
    board.appendChild(colObj);
    
    // Inserisci le Card nella colonna
    const colBody = colObj.querySelector('.col-cards');
    tasksInCat.forEach(t => {
      colBody.appendChild(createGiantCard(t));
    });
  });

  if(tasks.length === 0) {
    board.innerHTML = `<div style="padding-top:40px; font-size:1.2rem;	font-weight:500; color:var(--text-muted)">Nessun progetto in questa casa. Creane uno per iniziare.</div>`;
  }
}

function createGiantCard(task) {
  const card = document.createElement('div');
  card.className = 'giant-card' + (task.status === 'done' ? ' status-done' : '');
  card.onclick = () => openTaskPanel(task.id);

  // Trova ultimo log in ordine di tempo
  let lastLogHtml = `<div class="card-latest-log"><div class="cl-empty">Nessuna nota nel diario. Clicca per aggiungere.</div></div>`;
  
  if (task.logs && task.logs.length > 0) {
    // Sort x trovare il più recente (data maggiore)
    const sorted = [...task.logs].sort((a,b) => b.date - a.date);
    const last = sorted[0];
    const d = new Date(last.date);
    const dateStr = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    
    lastLogHtml = `
      <div class="card-latest-log">
        <div class="cl-date">Ultimo aggiornamento &bull; ${dateStr}</div>
        <div class="cl-text">${escHtml(last.text)}</div>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="card-header">
      <div class="status-badge s-bg-${task.status}">${STATUS_LABELS[task.status]}</div>
      <div class="prio-chip prio-${task.priority}">${task.priority === 'alta' ? '🚨 Urgente' : ''}</div>
    </div>
    <div class="card-title">${escHtml(task.title)}</div>
    ${lastLogHtml}
    <div class="card-footer-meta">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      ${task.logs ? task.logs.length : 0} Annotazioni
    </div>
  `;
  return card;
}

// ============================================================
//  TASK PANEL (DIARY / LOGBOOK)
// ============================================================
function openTaskPanel(taskId) {
  activeTaskId = taskId;
  const task = getTask(taskId);
  if (!task) return;

  const panel = document.getElementById('taskPanel');
  
  // Header
  document.getElementById('tpTitle').textContent = task.title;
  document.getElementById('tpStatusSelect').value = task.status;
  
  // Body (Logs Timeline)
  renderPanelTimeline(task);

  panel.classList.add('open');
}

function closeTaskPanel() {
  activeTaskId = null;
  document.getElementById('taskPanel').classList.remove('open');
}

function renderPanelTimeline(task) {
  const container = document.getElementById('tpTimeline');
  container.innerHTML = '';
  
  if (task.logs.length === 0) {
    container.innerHTML = `<div class="empty-logs">Diario vuoto.<br>Usa il box qui sotto per il tuo primo appunto!</div>`;
    return;
  }

  // Recenti in alto
  const sortedLogs = [...task.logs].sort((a, b) => b.date - a.date);

  sortedLogs.forEach(log => {
    const d = new Date(log.date);
    const dateStr = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour:'2-digit', minute:'2-digit' });

    const el = document.createElement('div');
    el.className = 'log-item';
    el.innerHTML = `
      <div class="log-dot">📝</div>
      <div class="log-content">
        <div class="log-date">
          <span>${dateStr}</span>
          <button class="log-del" title="Elimina questo appunto" onclick="handleDeleteLog('${log.id}')">✕</button>
        </div>
        <div class="log-text">${escHtml(log.text)}</div>
      </div>
    `;
    container.appendChild(el);
  });
}

function handleStatusChange(e) {
  if (!activeTaskId) return;
  const newStatus = e.target.value;
  updateTaskStatus(activeTaskId, newStatus);
  renderMainBoard(); // aggiorna card
}

function handleSendLog() {
  if (!activeTaskId) return;
  const ta = document.getElementById('newLogText');
  const text = ta.value.trim();
  if (!text) return;
  
  addLog(activeTaskId, text);
  ta.value = '';
  
  renderMainBoard(); // Ridisegna la card fuori per mostrare l'ultimo log!
  openTaskPanel(activeTaskId); 
}

document.getElementById('newLogText').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSendLog();
});

function handleDeleteLog(logId) {
  if (!activeTaskId) return;
  if(!confirm("Sicuro di cancellare?")) return;
  deleteLog(activeTaskId, logId);
  renderMainBoard();
  openTaskPanel(activeTaskId);
}

function handleDeleteTaskProcess() {
  if (!activeTaskId) return;
  if (!confirm("Sei PERFETTAMENTE SICURO di voler eliminare interamente questo progetto?")) return;
  deleteTask(activeTaskId);
  closeTaskPanel();
  renderMainBoard();
}

// ============================================================
//  MODALS
// ============================================================
// --- Nuova Root --- //
function openNewRootModal() {
  document.getElementById('inpRootName').value = '';
  document.getElementById('inpRootIcon').value = '🏠';
  document.getElementById('rootModal').classList.add('open');
}
function saveRootModal() {
  const name = document.getElementById('inpRootName').value.trim();
  const icon = document.getElementById('inpRootIcon').value.trim();
  if(!name) return;
  const root = addRoot(name, icon);
  document.getElementById('rootModal').classList.remove('open');
  selectRoot(root.id);
}
function handleDeleteRoot(id, e) {
  e.stopPropagation();
  if(!confirm("Eliminare questa casa e TUTTI i suoi progetti? Questa operazione è distruttiva.")) return;
  deleteRoot(id);
  if(activeRootId === id) {
    const roots = getRoots();
    if(roots.length) selectRoot(roots[0].id);
    else { activeRootId = null; renderSidebar(); renderMainBoard(); }
  } else { renderSidebar(); }
}

// --- Nuovo Task --- //
function openNewTaskModal() {
  document.getElementById('inpTaskTitle').value = '';
  document.getElementById('inpTaskCat').value = '';
  document.getElementById('inpTaskPrio').value = 'normale';
  document.getElementById('taskModal').classList.add('open');
}
function saveTaskModal() {
  const title = document.getElementById('inpTaskTitle').value.trim();
  let cat = document.getElementById('inpTaskCat').value.trim();
  const prio = document.getElementById('inpTaskPrio').value;
  if(!title) return;
  
  if(!cat) cat = "Generale"; // Default fallaback
  
  const task = addTask(activeRootId, title, prio, cat);
  document.getElementById('taskModal').classList.remove('open');
  renderSidebar();
  renderMainBoard();
  openTaskPanel(task.id);
}

document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => {
    if(e.target === ov) ov.classList.remove('open');
  });
});

// utils
function escHtml(str) {
  if (!str) return '';
  return str.toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
