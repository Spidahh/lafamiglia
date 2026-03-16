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

// Mobile menu toggle
function toggleMobileMenu() {
  document.body.classList.toggle('sidebar-open');
}

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
  
  // Close mobile sidebar if open
  document.body.classList.remove('sidebar-open');
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

// Optional sorting state
let currentSortCol = 'default';
let sortDirection = 1;

function setSort(col) {
  if (currentSortCol === col) sortDirection *= -1;
  else { currentSortCol = col; sortDirection = 1; }
  renderMainBoard();
}

function renderMainBoard() {
  const tbody = document.getElementById('tableBody');
  const title = document.getElementById('boardTitle');
  const noRes = document.getElementById('noResultsMsg');
  
  if (!activeRootId) {
    title.textContent = "Seleziona o crea una Proprietà";
    tbody.innerHTML = '';
    noRes.style.display = 'flex';
    noRes.style.flexDirection = 'column';
    noRes.style.alignItems = 'center';
    noRes.style.gap = '16px';
    noRes.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
      <div style="color:var(--text-muted); font-size:1.1rem;">Nessuna proprietà selezionata.</div>
    `;
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
    noRes.style.display = 'flex';
    noRes.style.flexDirection = 'column';
    noRes.style.alignItems = 'center';
    noRes.style.gap = '16px';
    
    if(q || fCat!=='all' || fStat!=='all') {
      noRes.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <div style="color:var(--text-muted); font-size:1.1rem;">Nessun progetto corrisponde ai criteri di ricerca.</div>
      `;
    } else {
      noRes.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
        <div style="color:var(--text-muted); font-size:1.1rem;">Nessun progetto in questa casa. Creane uno per iniziare.</div>
      `;
    }
  } else {
    noRes.style.display = 'none';
    
    // Sort logic
    if (currentSortCol === 'title') {
      tasks.sort((a,b) => a.title.localeCompare(b.title) * sortDirection);
    } else if (currentSortCol === 'status') {
      const w = { 'todo': 1, 'doing': 2, 'waiting': 3, 'done': 4 };
      tasks.sort((a,b) => (w[a.status] - w[b.status]) * sortDirection);
    } else {
      // Ordine di default: Non completati prima, più recenti in alto.
      tasks.sort((a,b) => {
        if(a.status === 'done' && b.status !== 'done') return 1;
        if(b.status === 'done' && a.status !== 'done') return -1;
        return b.createdAt - a.createdAt;
      });
    }

    tasks.forEach(task => {
      const tr = document.createElement('tr');
      if (task.status === 'done') tr.style.opacity = '0.6';
      
      tr.onclick = () => openTaskPanel(task.id);

      // Log display
      const hasLogs = task.logs && task.logs.length > 0;
      const logHtml = `
        <span class="log-indicator ${hasLogs ? 'has-logs' : ''}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          ${hasLogs ? task.logs.length : '0'}
        </span>
      `;
      
      // Highlight search text helper
      const hl = (txt) => {
        if (!q) return escHtml(txt);
        const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return escHtml(txt).replace(regex, '<mark style="background:#FEF08A; padding:0 2px; border-radius:2px;">$1</mark>');
      };

      tr.innerHTML = `
        <td style="text-align: center;"><span class="status-dot s-dot-${task.status}"></span></td>
        <td>
          <div style="display:flex; flex-direction:column; gap:2px;">
             ${task.category ? `<span class="cat-badge" style="font-size: 0.75rem; text-transform:uppercase; color:var(--text-muted);">${hl(task.category)}</span>` : ''}
             <span class="row-title" style="${task.status==='done'?'text-decoration:line-through':''}">${hl(task.title)}</span>
          </div>
          ${hasLogs ? `<span class="row-context">${hl(task.logs[task.logs.length-1].text).substring(0, 80)}${task.logs[task.logs.length-1].text.length > 80 ? '...' : ''}</span>` : ''}
        </td>
        <td><span class="cat-badge">${hl(task.category) || '-'}</span></td>
        <td><span class="status-pill sp-${task.status}">${STATUS_LABELS[task.status]}</span></td>
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
    const dateStr = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year:'numeric' });
    const timeStr = d.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });

    const el = document.createElement('div');
    el.className = 'log-item';
    el.innerHTML = `
      <div class="log-dot">📝</div>
      <div class="log-content">
        <div class="log-date">
          <span><strong style="color:var(--text-main); font-weight:700;">${dateStr}</strong> &bull; ${timeStr}</span>
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
  document.getElementById('taskModal').classList.add('open');
}
function saveTaskModal() {
  const title = document.getElementById('inpTaskTitle').value.trim();
  let cat = document.getElementById('inpTaskCat').value.trim();
  if(!title) return;
  
  const task = addTask(activeRootId, title, cat);
  document.getElementById('taskModal').classList.remove('open');
  updateCategoryDropdown();
  applyFilters();
  openTaskPanel(task.id);
}

function openEditTaskModal() {
  if (!activeTaskId) return;
  const task = getTask(activeTaskId);
  if (!task) return;

  document.getElementById('inpEditTaskTitle').value = task.title;
  document.getElementById('inpEditTaskCat').value = task.category || '';
  
  document.getElementById('editTaskModal').classList.add('open');
}

function saveEditTaskModal() {
  if (!activeTaskId) return;
  const title = document.getElementById('inpEditTaskTitle').value.trim();
  const cat = document.getElementById('inpEditTaskCat').value.trim();
  
  if(!title) return;
  
  updateTaskDetails(activeTaskId, {
    title: title,
    category: cat
  });
  
  document.getElementById('editTaskModal').classList.remove('open');
  updateCategoryDropdown();
  applyFilters();
  openTaskPanel(activeTaskId); // Refresh the currently open panel
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
