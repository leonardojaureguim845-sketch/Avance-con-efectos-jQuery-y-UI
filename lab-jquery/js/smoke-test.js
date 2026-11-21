/**
 * CANCHAPLUS — PANEL Y VERIFICADOR DE SMOKE TESTING
 * Realiza pruebas rápidas automáticas en el navegador para comprobar integridad antes de despliegue
 */

const smokeTestModule = {
  init() {
    $('#btnRunSmokeTests').on('click', () => this.runAllTests());
  },

  async runAllTests() {
    const $results = $('#smokeTestResults');
    $results.html('<div class="c-loading-state">Ejecutando Smoke Tests del sistema...</div>');

    const tests = [
      {
        name: '1. Carga de jQuery 3.7.1',
        run: () => typeof window.jQuery !== 'undefined' && window.jQuery.fn.jquery.startsWith('3.')
      },
      {
        name: '2. Disponibilidad de DOMPurify',
        run: () => typeof window.DOMPurify !== 'undefined' && typeof window.DOMPurify.sanitize === 'function'
      },
      {
        name: '3. Existencia de Manifest.json',
        run: () => !!document.querySelector('link[rel="manifest"]')
      },
      {
        name: '4. Soporte y Registro de Service Worker',
        run: () => 'serviceWorker' in navigator
      },
      {
        name: '5. Almacenamiento Local (localStorage)',
        run: () => {
          try {
            localStorage.setItem('__test__', '1');
            localStorage.removeItem('__test__');
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: '6. Conexión Backend API (/api/health)',
        run: async () => {
          const res = await window.CanchaPlusAPI.health();
          return res && res.ok && res.status === 'online';
        }
      },
      {
        name: '7. Consulta a Base de Datos (/api/deportes)',
        run: async () => {
          const res = await window.CanchaPlusAPI.getDeportes();
          return res && res.ok && Array.isArray(res.data) && res.data.length >= 3;
        }
      },
      {
        name: '8. Disponibilidad Real de Canchas (/api/canchas)',
        run: async () => {
          const res = await window.CanchaPlusAPI.getCanchas();
          return res && res.ok && Array.isArray(res.data) && res.data.length >= 1;
        }
      },
      {
        name: '9. Cálculo de Horarios en BD (/api/disponibilidad)',
        run: async () => {
          const today = new Date().toISOString().slice(0, 10);
          const res = await window.CanchaPlusAPI.getDisponibilidad(1, today);
          return res && res.ok && Array.isArray(res.data.horarios) && res.data.horarios.length > 0;
        }
      },
      {
        name: '10. Accesibilidad: Formularios con labels válidos',
        run: () => {
          const inputs = document.querySelectorAll('#resName, #resPhone, #resDate, #resHours');
          return Array.from(inputs).every(inp => document.querySelector(`label[for="${inp.id}"]`));
        }
      }
    ];

    let passed = 0;
    let failed = 0;
    const itemsHtml = [];

    for (const t of tests) {
      let isOk = false;
      let detail = '';
      try {
        isOk = await t.run();
      } catch (err) {
        isOk = false;
        detail = `(${err.message})`;
      }

      if (isOk) passed++;
      else failed++;

      itemsHtml.push(`
        <li style="display:flex; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--color-border);">
          <span>${t.name} <small style="color:var(--color-danger);">${detail}</small></span>
          <b class="${isOk ? 'c-badge c-badge--success' : 'c-badge c-badge--danger'}">${isOk ? 'APROBADO' : 'FALLIDO'}</b>
        </li>
      `);
    }

    const summaryHtml = `
      <div style="margin-bottom:1rem; padding:1rem; border-radius:var(--radius-md); background:var(--color-surface-subtle); display:flex; justify-content:space-around;">
        <div style="text-align:center;">
          <small style="color:var(--color-text-muted);">TOTAL PRUEBAS</small>
          <b style="display:block; font-size:1.5rem;">${tests.length}</b>
        </div>
        <div style="text-align:center;">
          <small style="color:var(--color-success);">APROBADAS</small>
          <b style="display:block; font-size:1.5rem; color:var(--color-success);">${passed}</b>
        </div>
        <div style="text-align:center;">
          <small style="color:var(--color-danger);">FALLIDAS</small>
          <b style="display:block; font-size:1.5rem; color:var(--color-danger);">${failed}</b>
        </div>
      </div>
      <ul style="list-style:none; padding:0; margin:0;">
        ${itemsHtml.join('')}
      </ul>
    `;

    $results.html(summaryHtml);
    window.CanchaPlusComponents.showToast(`Smoke Tests finalizados: ${passed}/${tests.length} aprobados`, passed === tests.length ? 'success' : 'error');
    window.CanchaPlusApp.addLog(`Smoke Tests completados: ${passed} aprobados, ${failed} fallidos.`);
  }
};

window.CanchaPlusSmokeTest = smokeTestModule;
