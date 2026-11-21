(function () {
  'use strict';
  const STORAGE_KEY = 'vibraLog';
  function getLogs() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (error) { return []; }
  }
  window.renderLog = function () {
    const logs = getLogs().slice().reverse();
    const list = document.getElementById('logList');
    document.getElementById('logCount').textContent = logs.length + (logs.length === 1 ? ' acción registrada' : ' acciones registradas');
    list.innerHTML = '';
    if (!logs.length) {
      list.innerHTML = '<p class="empty-log">Todavía no hay acciones registradas.</p>';
      return;
    }
    logs.slice(0, 40).forEach(log => {
      const row = document.createElement('div');
      row.className = 'log-entry';
      const action = document.createElement('strong'); action.textContent = log.action;
      const detail = document.createElement('span'); detail.textContent = log.detail;
      const time = document.createElement('span'); time.textContent = new Date(log.timestamp).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'medium' });
      row.append(action, detail, time);
      list.appendChild(row);
    });
  };
  window.addLog = function (action, detail) {
    const logs = getLogs();
    logs.push({ action, detail, timestamp: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-100)));
    window.renderLog();
  };
  window.renderLog();
})();
