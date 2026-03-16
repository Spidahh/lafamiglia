// ============================================================
//  La Famiglia – Data Layer V4
// ============================================================

const DB_KEY = 'lafamiglia_v4_db';

const CATEGORIES = ['PISCINA', 'CASA 1', 'CASA 2', 'CASA 3', 'ALTRO'];

const STATUS_LABELS = {
  'todo':    'Da iniziare',
  'doing':   'In lavorazione',
  'waiting': 'In attesa',
  'done':    'Completato'
};

/*
  Struttura DB:
  {
    tasks: [{
      id, title, category, status,
      assignees: ['Nome1'],
      createdAt, startedAt, completedAt,
      logs: [{ id, date, text }]
    }],
    people: [{ name, phone, role }]
  }
*/

const DEFAULT_DATA = {
  people: [
    { name: 'Giuseppe', phone: '', role: 'Idraulico' },
    { name: 'Marco',    phone: '', role: '' }
  ],
  tasks: [
    {
      id: 't1', title: 'Manutenzione Piscina (pulizia pre-estate)', category: 'PISCINA',
      status: 'todo', assignees: ['Giuseppe'],
      createdAt: Date.now(), startedAt: null, completedAt: null,
      logs: [{ id: 'l1', date: Date.now() - 86400000, text: 'Chiamare Giuseppe per accordarci sui lavori pre-estivi.' }]
    },
    {
      id: 't2', title: 'Ripristino faretti piscina', category: 'PISCINA',
      status: 'todo', assignees: [],
      createdAt: Date.now(), startedAt: null, completedAt: null,
      logs: [{ id: 'l2', date: Date.now(), text: 'Aggiustare i faretti prima che inizino i bagni serali.' }]
    },
    {
      id: 't3', title: 'Ripristino fughe bordo piscina', category: 'PISCINA',
      status: 'todo', assignees: [],
      createdAt: Date.now(), startedAt: null, completedAt: null, logs: []
    },
    {
      id: 't4', title: 'Sistemare contatori casetta', category: 'CASA 1',
      status: 'todo', assignees: ['Marco'],
      createdAt: Date.now(), startedAt: null, completedAt: null, logs: []
    },
    {
      id: 't5', title: 'Manutenzione condizionatori', category: 'CASA 2',
      status: 'doing', assignees: ['Giuseppe'],
      createdAt: Date.now() - 200000000, startedAt: Date.now() - 100000000, completedAt: null,
      logs: [{ id: 'l5', date: Date.now() - 50000000, text: 'Prenotato tecnico per il 20.' }]
    },
    {
      id: 't6', title: 'Sistemare doccia in pietra (doccino guasto)', category: 'CASA 3',
      status: 'waiting', assignees: ['Marco'],
      createdAt: Date.now(), startedAt: null, completedAt: null,
      logs: [{ id: 'l6', date: Date.now(), text: 'In attesa del pezzo di ricambio.' }]
    },
    {
      id: 't7', title: 'Verifica impianto fotovoltaico', category: 'ALTRO',
      status: 'done', assignees: ['Marco'],
      createdAt: Date.now() - 500000000, startedAt: Date.now() - 400000000, completedAt: Date.now() - 300000000,
      logs: [{ id: 'l7', date: Date.now() - 300000000, text: 'Controllata app, l\'inverter produce correttamente. Tutto OK.' }]
    }
  ]
};

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return initDB();
    const db = JSON.parse(raw);

    // Migrazione people: da array di stringhe a array di oggetti
    if (Array.isArray(db.people) && typeof db.people[0] === 'string') {
      db.people = db.people.map(n => ({ name: n, phone: '', role: '' }));
    }
    if (!db.people) db.people = [];

    db.tasks = (db.tasks || []).map(t => ({
      ...t,
      assignees:   t.assignees   || [],
      startedAt:   t.startedAt   != null ? t.startedAt   : null,
      completedAt: t.completedAt != null ? t.completedAt : null,
      logs:        t.logs        || [],
      category:    CATEGORIES.includes(t.category) ? t.category : 'ALTRO',
      status:      t.status      || 'todo'
    }));
    // Rimuovi priority residua
    db.tasks = db.tasks.map(({ priority, ...rest }) => rest);

    return db;
  } catch {
    return initDB();
  }
}

function initDB() {
  const data = JSON.parse(JSON.stringify(DEFAULT_DATA));
  saveDB(data);
  return data;
}

function saveDB(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

// --- Tasks ---
function getTasks()  { return loadDB().tasks; }
function getTask(id) { return loadDB().tasks.find(t => t.id === id); }

function addTask(title, category, assignees) {
  const db = loadDB();
  const task = {
    id: 't' + Date.now(),
    title, category: category || 'ALTRO',
    status: 'todo',
    assignees: assignees || [],
    createdAt: Date.now(), startedAt: null, completedAt: null,
    logs: []
  };
  db.tasks.unshift(task);
  saveDB(db);
  return task;
}

function updateTaskStatus(id, newStatus) {
  const db  = loadDB();
  const idx = db.tasks.findIndex(t => t.id === id);
  if (idx === -1) return;
  const task = db.tasks[idx];
  task.status = newStatus;

  if (newStatus === 'todo')  { task.startedAt = null; task.completedAt = null; }
  if (newStatus === 'doing' && !task.startedAt) task.startedAt = Date.now();
  if (newStatus === 'done') {
    if (!task.startedAt) task.startedAt = task.createdAt;
    task.completedAt = Date.now();
  }
  if (newStatus !== 'done' && newStatus !== 'todo') task.completedAt = null;

  task.logs.push({
    id: 'auto' + Date.now(),
    date: Date.now(),
    text: '📌 Stato: ' + (STATUS_LABELS[newStatus] || newStatus)
  });
  saveDB(db);
}

function updateTaskDetails(id, fields) {
  const db  = loadDB();
  const idx = db.tasks.findIndex(t => t.id === id);
  if (idx > -1) {
    db.tasks[idx] = { ...db.tasks[idx], ...fields };
    saveDB(db);
  }
}

function deleteTask(id) {
  const db = loadDB();
  db.tasks = db.tasks.filter(t => t.id !== id);
  saveDB(db);
}

// --- Logs ---
function addLog(taskId, text) {
  const db  = loadDB();
  const idx = db.tasks.findIndex(t => t.id === taskId);
  if (idx > -1) {
    db.tasks[idx].logs.push({ id: 'l' + Date.now(), date: Date.now(), text });
    saveDB(db);
  }
}

function deleteLog(taskId, logId) {
  const db  = loadDB();
  const idx = db.tasks.findIndex(t => t.id === taskId);
  if (idx > -1) {
    db.tasks[idx].logs = db.tasks[idx].logs.filter(l => l.id !== logId);
    saveDB(db);
  }
}

// --- People ---
function getPeople() { return loadDB().people || []; }

function addPerson(name, phone, role) {
  const db = loadDB();
  if (!db.people) db.people = [];
  if (!db.people.find(p => p.name === name)) {
    db.people.push({ name, phone: phone || '', role: role || '' });
    saveDB(db);
  }
}

function updatePerson(oldName, fields) {
  const db  = loadDB();
  const idx = db.people.findIndex(p => p.name === oldName);
  if (idx === -1) return;
  const newName = fields.name && fields.name.trim() ? fields.name.trim() : oldName;
  db.people[idx] = { name: newName, phone: fields.phone || '', role: fields.role || '' };
  // Se il nome cambia, aggiorna i task assegnati
  if (newName !== oldName) {
    db.tasks = db.tasks.map(t => ({
      ...t,
      assignees: (t.assignees || []).map(a => a === oldName ? newName : a)
    }));
  }
  saveDB(db);
}

function deletePerson(name) {
  const db = loadDB();
  db.people = (db.people || []).filter(p => p.name !== name);
  db.tasks  = db.tasks.map(t => ({
    ...t,
    assignees: (t.assignees || []).filter(a => a !== name)
  }));
  saveDB(db);
}

// --- Export / Import ---
function exportData() {
  const db   = loadDB();
  const json = JSON.stringify(db, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'lafamiglia_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.tasks) throw new Error('File non valido');
      saveDB(data);
      location.reload();
    } catch {
      alert('File non valido o corrotto.');
    }
  };
  reader.readAsText(file);
}
