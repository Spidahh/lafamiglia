// ============================================================
//  La Famiglia – Data Layer V5 (Firebase Firestore)
// ============================================================

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
  people: [],
  tasks:  []
};

// ── In-memory cache ──────────────────────────────────────────
let _db    = null;   // cache locale
let _dbRef = null;   // riferimento documento Firestore
let _onRenderCallback = null;
let _ignoreNextSnapshot = false; // evita re-render subito dopo scrittura locale

// ── Firebase init ─────────────────────────────────────────────
async function initFirebase(onReady) {
  _onRenderCallback = onReady;

  // Se la config non è stata compilata, fallback a localStorage
  if (!FIREBASE_CONFIG || FIREBASE_CONFIG.projectId === 'INSERISCI_QUI') {
    console.warn('Firebase non configurato — uso localStorage locale');
    _db = _loadFromLocalStorage();
    onReady();
    return;
  }

  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    const firestore = firebase.firestore();
    _dbRef = firestore.collection('lafamiglia').doc('main');

    // Prima lettura
    const snap = await _dbRef.get();
    if (snap.exists) {
      _db = migrateDB(snap.data());
    } else {
      // Primo avvio: prova a caricare eventuali dati locali, altrimenti vuoto
      const local = _loadFromLocalStorage();
      _db = local.tasks.length > 0 ? local : JSON.parse(JSON.stringify(DEFAULT_DATA));
      await _dbRef.set(_db);
    }

    // Listener real-time
    _dbRef.onSnapshot(snap => {
      if (_ignoreNextSnapshot) { _ignoreNextSnapshot = false; return; }
      if (snap.exists) {
        _db = migrateDB(snap.data());
        if (_onRenderCallback) _onRenderCallback();
      }
    });

    onReady();

  } catch (err) {
    console.error('Errore Firebase:', err);
    _db = _loadFromLocalStorage();
    onReady();
  }
}

// ── Lettura / Scrittura ───────────────────────────────────────
function loadDB() {
  return _db || { tasks: [], people: [] };
}

function saveDB(data) {
  _db = data;
  if (_dbRef) {
    _ignoreNextSnapshot = true;
    _dbRef.set(data).catch(err => {
      console.error('Errore salvataggio Firestore:', err);
      _ignoreNextSnapshot = false;
    });
  }
}

// ── Migrazione / normalizzazione dati ────────────────────────
function migrateDB(db) {
  // Migrazione people: da array di stringhe a array di oggetti
  if (Array.isArray(db.people) && db.people.length > 0 && typeof db.people[0] === 'string') {
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
  db.tasks = db.tasks.map(({ priority, ...rest }) => rest);

  return db;
}

function _loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('lafamiglia_v4_db');
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DATA));
    return migrateDB(JSON.parse(raw));
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

// ── Tasks ─────────────────────────────────────────────────────
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

// ── Logs ──────────────────────────────────────────────────────
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

// ── People ────────────────────────────────────────────────────
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

// ── Export / Import ───────────────────────────────────────────
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
