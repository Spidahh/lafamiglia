// ============================================================
//  La Famiglia V5 – App Logic (Data Table & Ricerca)
// ============================================================

let activeRootId = null;
let activeTaskId = null;

const STATUS_LABELS = {
  'todo': 'Da iniziare',
  'doing': 'In lavorazione',
  'waiting': 'In attesa',
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
      <div style="display:flex; align-items:center; gap:8px;">
        <span>${r.icon}</span>
        <span style="flex:1">${escHtml(r.name)}</span>
      </div>
      <button class="del-btn" title="Elimina casa" onclick="handleDeleteRoot('${r.id}', event)">✕</button>
    `;
    item.onclick = () => selectRoot(r.id);
    rootList.appendChild(item);
  });
}

function selectRoot(id) {
  activeRootId = id;
  document.getElementById('searchInput').value = '';
  document.getElementById('filterStatus').value = 'all';
  closeTaskPanel();
  renderSidebar();
  updateCategoryDropdown();
  renderMainBoard();
}

function updateCategoryDropdown() {
  if (!activeRootId) return;
  const tasks = getTasks(activeRootId);
  const cats = new Set();
  tasks.forEach(t => {
    if (t.category) cats.add(t.category.trim());
  });
  
  const sel = document.getElementById('filterCategory');
  const currentVal = sel.value;
  sel.innerHTML = '<option value="all">Tutte le categorie</option>';
  
  [...cats].sort().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
  
  // Ripristina valore se esiste ancora
  if (cats.has(currentVal)) {
    sel.value = currentVal;
  }
}

// ============================================================
//  MAIN BOARD (Filtri e Tabella)
// ============================================================
function applyFilters() {
  renderMainBoard();
}

function renderMainBoard() {
  const tbody = document.getElementById('tableBody');
  const title = document.getElementById('boardTitle');
  const noRes = document.getElementById('noResultsMsg');
  
  if (!activeRootId) {
    title.textContent = "Seleziona o crea una Proprietà";
    tbody.innerHTML = '';
    noRes.style.display = 'block';
    noRes.textContent = "Nessuna proprietà selezionata.";
    return;
  }

  const root = getRoots().find(r => r.id === activeRootId);
  title.textContent = `${root.icon} ${root.name}`;

  let tasks = getTasks(activeRootId);

  // --- APPLICAZIONE FILTRI ---
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  const fCat = document.getElementById('filterCategory').value;
  const fStat = document.getElementById('filterStatus').value;

  // 1. Categoria
  if (fCat !== 'all') {
    tasks = tasks.filter(t => t.category && t.category.trim() === fCat);
  }
  // 2. Stato
  if (fStat !== 'all') {
    tasks = tasks.filter(t => t.status === fStat);
  }
  // 3. Ricerca Globale (Titolo O Note interne)
  if (q) {
    tasks = tasks.filter(t => {
      const inTitle = t.title.toLowerCase().includes(q);
      const inCat = (t.category || '').toLowerCase().includes(q);
      const inLogs = t.logs.some(l => l.text.toLowerCase().includes(q));
      return inTitle || inCat || inLogs;
    });
  }

  // --- RENDERING TABELLA ---
  tbody.innerHTML = '';
  
  if (tasks.length === 0) {
    noRes.style.display = 'block';
    if(q || fCat!=='all' || fStat!=='all') {
      noRes.textContent = "Nessun progetto corrisponde ai criteri di ricerca.";
    } else {
      noRes.textContent = "Nessun progetto in questa casa. Creane uno per iniziare.";
    }
  } else {
    noRes.style.display = 'none';
    
    // Ordine di default: Non completati prima, più recenti in alto.
    tasks.sort((a,b) => {
      if(a.status === 'done' && b.status !== 'done') return 1;
      if(b.status === 'done' && a.status !== 'done') return -1;
      return b.createdAt - a.createdAt;
    });

    tasks.forEach(task => {
      const tr = document.createElement('tr');
      if (task.status === 'done') tr.style.opacity = '0.6';
      
      tr.onclick = () => openTaskPanel(task.id);

      // Priorità pill
      let prioHtml = '';
      if(task.priority === 'alta') prioHtml = `<span class="prio-pill pr-alta">Urgente</span>`;
      else if(task.priority === 'normale') prioHtml = `<span class="prio-pill pr-normale">—</span>`;
      else prioHtml = `<span class="prio-pill pr-bassa">Bassa</span>`;

      // Log display
      const hasLogs = task.logs && task.logs.length > 0;
      const logHtml = `
        <span class="log-indicator ${hasLogs ? 'has-logs' : ''}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          ${hasLogs ? task.logs.length : '0'}
        </span>
      `;

      tr.innerHTML = `
        <td style="text-align: center;"><span class="status-dot s-dot-${task.status}"></span></td>
        <td>
          <span class="row-title" style="${task.status==='done'?'text-decoration:line-through':''}">${escHtml(task.title)}</span>
          ${hasLogs ? `<span class="row-context">${escHtml(task.logs[task.logs.length-1].text).substring(0, 60)}...</span>` : ''}
        </td>
        <td><span class="cat-badge">${escHtml(task.category) || '-'}</span></td>
        <td><span class="status-pill sp-${task.status}">${STATUS_LABELS[task.status]}</span></td>
        <td style="text-align: center;">${prioHtml}</td>
        <td style="text-align: right;">${logHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// ============================================================
//  TASK PANEL (DIARIO / LOGBOOK)
// ============================================================
function openTaskPanel(taskId) {
  activeTaskId = taskId;
  const task = getTask(taskId);
  if (!task) return;

  const panel = document.getElementById('taskPanel');
  
  document.getElementById('tpTitle').textContent = task.title;
  document.getElementById('tpCategory').textContent = task.category || 'Generale';
  document.getElementById('tpStatusSelect').value = task.status;
  
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
  
  if (!task.logs || task.logs.length === 0) {
    container.innerHTML = `<div class="empty-logs">Diario storico vuoto per questo progetto.</div>`;
    return;
  }

  // Cronologico normale (vecchi sopra, nuovi sotto) è spesso meglio per i diari lunghi. Facciamo così.
  const sortedLogs = [...task.logs].sort((a, b) => a.date - b.date);

  sortedLogs.forEach(log => {
    const d = new Date(log.date);
    const dateStr = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

    const el = document.createElement('div');
    el.className = 'log-item';
    el.innerHTML = `
      <div class="log-dot">📌</div>
      <div class="log-content">
        <div class="log-date">
          <span>${dateStr}</span>
          <button class="log-del" title="Elimina nota" onclick="handleDeleteLog('${log.id}')">✕</button>
        </div>
        <div class="log-text">${escHtml(log.text)}</div>
      </div>
    `;
    container.appendChild(el);
  });
  
  // Scroll automatico in basso se ci sono tanti log
  setTimeout(() => {
    const pb = document.querySelector('.panel-body');
    if(pb) pb.scrollTop = pb.scrollHeight;
  }, 10);
}

function handleStatusChange(e) {
  if (!activeTaskId) return;
  updateTaskStatus(activeTaskId, e.target.value);
  applyFilters(); 
}

function handleSendLog() {
  if (!activeTaskId) return;
  const ta = document.getElementById('newLogText');
  const text = ta.value.trim();
  if (!text) return;
  
  addLog(activeTaskId, text);
  ta.value = '';
  
  applyFilters(); // Aggiorna riga e data
  openTaskPanel(activeTaskId); 
}

document.getElementById('newLogText').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSendLog();
});

function handleDeleteLog(logId) {
  if (!activeTaskId) return;
  if(!confirm("Sicuro di cancellare questa nota storica?")) return;
  deleteLog(activeTaskId, logId);
  applyFilters();
  openTaskPanel(activeTaskId);
}

function handleDeleteTaskProcess() {
  if (!activeTaskId) return;
  if (!confirm("Sei sicuro di voler eliminare interamente questo progetto e tutto il suo diario aziendale/familiare?")) return;
  deleteTask(activeTaskId);
  closeTaskPanel();
  updateCategoryDropdown();
  applyFilters();
}

// ============================================================
//  MODALS
// ============================================================
function openNewRootModal() {
  document.getElementById('inpRootName').value = '';
  document.getElementById('rootModal').classList.add('open');
}
function saveRootModal() {
  const name = document.getElementById('inpRootName').value.trim();
  if(!name) return;
  const root = addRoot(name, '🏠'); // Icona base fissa per ora
  document.getElementById('rootModal').classList.remove('open');
  selectRoot(root.id);
}
function handleDeleteRoot(id, e) {
  e.stopPropagation();
  if(!confirm("Eliminare questa casa e TUTTI i suoi progetti?")) return;
  deleteRoot(id);
  if(activeRootId === id) {
    const roots = getRoots();
    if(roots.length) selectRoot(roots[0].id);
    else { activeRootId = null; renderSidebar(); applyFilters(); }
  } else { renderSidebar(); }
}

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
  
  const task = addTask(activeRootId, title, prio, cat);
  document.getElementById('taskModal').classList.remove('open');
  updateCategoryDropdown();
  applyFilters();
  openTaskPanel(task.id);
}

document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => {
    if(e.target === ov) ov.classList.remove('open');
  });
});

function escHtml(str) {
  if (!str) return '';
  return str.toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
