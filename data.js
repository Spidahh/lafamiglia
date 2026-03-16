// ============================================================
//  La Famiglia – Data Layer V3 (Timeline)
//  Gestione dati con localStorage
// ============================================================

const DB_KEY = 'lafamiglia_v3_db';

/*
  Struttura dati:
  {
    roots: [{ id, name, icon }],
    tasks: [{ 
      id, rootId, title, 
      status: 'todo' | 'doing' | 'waiting' | 'done',
      category: 'Piscina' | 'Casette' | 'Impianti' | '',
      createdAt,
      logs: [
        { id, date, text }
      ]
    }]
  }
*/

const DEFAULT_DATA = {
  roots: [
    { id: 'r1', name: 'Villa a Cozze', icon: '🏖️', createdAt: Date.now() }
  ],
  tasks: [
    // --- Piscina ---
    {
      id: 't1', rootId: 'r1', title: 'Manutenzione Piscina (Giuseppe)', status: 'todo', category: 'Piscina', createdAt: Date.now(),
      logs: [ { id: 'l1_1', date: Date.now() - 86400000, text: 'Chiamare Giuseppe per accordarci sui lavori pre-estivi.' } ]
    },
    {
      id: 't5', rootId: 'r1', title: 'Ripristino faretti piscina', status: 'todo', category: 'Piscina', createdAt: Date.now(),
      logs: [ { id: 'l5_1', date: Date.now(), text: 'Aggiustare i faretti prima che inizino i bagni serali.' } ]
    },
    {
      id: 't14', rootId: 'r1', title: 'Ripristino fughe bordo piscina', status: 'todo', category: 'Piscina', createdAt: Date.now(),
      logs: []
    },
    {
      id: 't15', rootId: 'r1', title: 'Pitturazione porta vano piscina', status: 'todo', category: 'Piscina', createdAt: Date.now(),
      logs: []
    },

    // --- Casette ---
    {
      id: 't6', rootId: 'r1', title: 'Sistemare contatori casette', status: 'todo', category: 'Casette', createdAt: Date.now(),
      logs: []
    },
    {
      id: 't7', rootId: 'r1', title: 'Manutenzione condizionatori casette', status: 'todo', category: 'Casette', createdAt: Date.now(),
      logs: []
    },
    {
      id: 't8', rootId: 'r1', title: 'Sistemare luci perimetrali casette (1 guasta)', status: 'todo', category: 'Casette', createdAt: Date.now(),
      logs: [ { id: 'l8_1', date: Date.now(), text: 'Una luce non funziona, controllare lampadina e contatti.' } ]
    },
    {
      id: 't10', rootId: 'r1', title: 'Sistemare doccia in pietra (doccino guasto)', status: 'todo', category: 'Casette', createdAt: Date.now(),
      logs: [ { id: 'l10_1', date: Date.now(), text: 'Non esce acqua dal doccino o rompegetto.' } ]
    },
    {
      id: 't11', rootId: 'r1', title: 'Sostituire rubinetto parcheggio', status: 'todo', category: 'Casette', createdAt: Date.now(),
      logs: []
    },
    {
      id: 't13', rootId: 'r1', title: 'Verificare docce esterne', status: 'todo', category: 'Casette', createdAt: Date.now(),
      logs: []
    },

    // --- Esterni / Orto ---
    {
      id: 't12', rootId: 'r1', title: 'Sostituire rubinetto + snodo orto', status: 'todo', category: 'Orto', createdAt: Date.now(),
      logs: []
    },
    {
      id: 't3', rootId: 'r1', title: 'Acquisto Cancelletti bambini (x7) e ombreggianti scala', status: 'todo', category: 'Esterni', createdAt: Date.now(),
      logs: [ { id: 'l3_1', date: Date.now(), text: 'Servono 7 cancelletti per sicurezza. Prendere misure.' } ]
    },

    // --- Impianti / Acquisti ---
    {
      id: 't2', rootId: 'r1', title: 'Comprare pompa di sentina', status: 'todo', category: 'Impianti', createdAt: Date.now(),
      logs: []
    },
    {
      id: 't4', rootId: 'r1', title: 'Comprare piano induzione', status: 'todo', category: 'Impianti', createdAt: Date.now(),
      logs: [ { id: 'l4_1', date: Date.now(), text: 'Cercare offerte su Amazon e Mediaworld.' } ]
    },
    {
      id: 't9', rootId: 'r1', title: 'Verifica pressione Acqua (forse aria)', status: 'todo', category: 'Impianti', createdAt: Date.now(),
      logs: [ { id: 'l9_1', date: Date.now(), text: 'C’è problema di pressione. Fare sfiatare impianto o chiamare idraulico.' } ]
    },
    {
      id: 't16', rootId: 'r1', title: 'Verifica impianto fotovoltaico', status: 'done', category: 'Impianti', createdAt: Date.now() - 500000000,
      logs: [ { id: 'l16_1', date: Date.now() - 10000, text: 'Controllata app, l\'inverter produce correttamente.' } ]
    }
  ]
};

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return initDB();
    const db = JSON.parse(raw);
    
    // Migrazione automatica se mancano campi nuovi a DB esistenti (safety net)
    db.tasks = db.tasks.map(t => ({
      ...t,
      status: t.status || (t.done ? 'done' : 'todo'),
      logs: t.logs || (t.note ? [{ id: 'old', date: t.createdAt, text: t.note }] : []),
      category: t.category || ''
    }));
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

// --- Roots --- //
function getRoots() { return loadDB().roots; }
function addRoot(name, icon) {
  const db = loadDB();
  const root = { id: 'r' + Date.now(), name, icon, createdAt: Date.now() };
  db.roots.push(root);
  saveDB(db);
  return root;
}
function deleteRoot(id) {
  const db = loadDB();
  db.roots = db.roots.filter(r => r.id !== id);
  db.tasks = db.tasks.filter(t => t.rootId !== id);
  saveDB(db);
}

// --- Tasks --- //
function getTasks(rootId) { return loadDB().tasks.filter(t => t.rootId === rootId); }
function getTask(id) { return loadDB().tasks.find(t => t.id === id); }

function addTask(rootId, title, category) {
  const db = loadDB();
  const task = { 
    id: 't' + Date.now(), rootId, title, 
    status: 'todo', category: category || '', 
    createdAt: Date.now(), logs: [] 
  };
  db.tasks.unshift(task); // in cima
  saveDB(db);
  return task;
}

function updateTaskStatus(id, newStatus) {
  const db = loadDB();
  const idx = db.tasks.findIndex(t => t.id === id);
  if (idx > -1) { 
    db.tasks[idx].status = newStatus;
    // Log automatico del cambio stato se passa a completed/waiting (opzionale)
    saveDB(db); 
  }
}

function updateTaskDetails(id, fields) {
  const db = loadDB();
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

// --- Logs / Diario --- //
function addLog(taskId, text) {
  const db = loadDB();
  const idx = db.tasks.findIndex(t => t.id === taskId);
  if (idx > -1) {
    db.tasks[idx].logs.push({
      id: 'l' + Date.now(),
      date: Date.now(),
      text
    });
    saveDB(db);
  }
}

function deleteLog(taskId, logId) {
  const db = loadDB();
  const idx = db.tasks.findIndex(t => t.id === taskId);
  if (idx > -1) {
    db.tasks[idx].logs = db.tasks[idx].logs.filter(l => l.id !== logId);
    saveDB(db);
  }
}
