/**
 * CANCHAPLUS — OFFLINE FIRST (IndexedDB)
 * Almacenamiento local persistente para datos y operaciones pendientes.
 */
const OfflineDB = {
  dbName: 'canchaplus_offline',
  version: 1,
  db: null,

  open() {
    return new Promise((resolve, reject) => {
      if (this.db) { resolve(this.db); return; }
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('sports')) db.createObjectStore('sports', { keyPath: 'id_deporte' });
        if (!db.objectStoreNames.contains('courts')) db.createObjectStore('courts', { keyPath: 'id_cancha' });
        if (!db.objectStoreNames.contains('availability')) db.createObjectStore('availability', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('reservations')) db.createObjectStore('reservations', { keyPath: 'id_reserva' });
        if (!db.objectStoreNames.contains('pending')) db.createObjectStore('pending', { keyPath: 'opId', autoIncrement: false });
        if (!db.objectStoreNames.contains('prefs')) db.createObjectStore('prefs', { keyPath: 'key' });
      };
      req.onsuccess = (e) => { this.db = e.target.result; resolve(this.db); };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async put(store, value) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async get(store, key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async getAll(store) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async delete(store, key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async clear(store) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).clear();
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }
};

// --- Helpers de dominio ---
const OfflineStore = {
  async saveSports(sports) {
    if (!Array.isArray(sports)) return;
    for (const s of sports) await OfflineDB.put('sports', s);
  },
  async getSports() { return OfflineDB.getAll('sports'); },

  async saveCourts(courts) {
    if (!Array.isArray(courts)) return;
    for (const c of courts) await OfflineDB.put('courts', c);
  },
  async getCourts() { return OfflineDB.getAll('courts'); },

  async saveAvailability(courtId, date, slots) {
    await OfflineDB.put('availability', { key: `${courtId}_${date}`, courtId, date, slots, savedAt: Date.now() });
  },
  async getAvailability(courtId, date) {
    return OfflineDB.get('availability', `${courtId}_${date}`);
  },

  async saveReservation(reserva) {
    if (reserva && reserva.id_reserva) await OfflineDB.put('reservations', reserva);
  },
  async getReservations() { return OfflineDB.getAll('reservations'); },

  async addPending(op) {
    const opId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `op_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const record = { opId, createdAt: Date.now(), status: 'pending', ...op };
    await OfflineDB.put('pending', record);
    return record;
  },
  async getPending() { return OfflineDB.getAll('pending'); },
  async removePending(opId) { await OfflineDB.delete('pending', opId); },

  async setPref(key, value) { await OfflineDB.put('prefs', { key, value }); },
  async getPref(key) { const r = await OfflineDB.get('prefs', key); return r ? r.value : null; }
};

window.OfflineDB = OfflineDB;
window.OfflineStore = OfflineStore;
