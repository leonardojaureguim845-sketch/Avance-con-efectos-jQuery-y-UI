/**
 * CANCHAPLUS — ACCESIBILIDAD WEB (A11Y) Y AUDITORÍA SEMÁNTICA
 */

const a11yModule = {
  init() {
    this.restoreTheme();
    this.bindThemeToggle();
    this.bindContrastToggle();
    this.bindSemanticAudit();
  },

  restoreTheme() {
    try {
      const saved = localStorage.getItem('canchaplus_theme');
      if (saved === 'dark') {
        $('body').addClass('dz-night-mode');
        $('#btnToggleTheme').html('☀️').attr('aria-label', 'Cambiar a modo claro').attr('aria-pressed', 'true');
      }
    } catch {}
  },

  bindThemeToggle() {
    $('#btnToggleTheme').on('click', function() {
      const isDark = $('body').toggleClass('dz-night-mode').hasClass('dz-night-mode');
      $(this).html(isDark ? '☀️' : '🌙')
             .attr('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro')
             .attr('aria-pressed', String(isDark));
      try {
        localStorage.setItem('canchaplus_theme', isDark ? 'dark' : 'light');
      } catch {}
      window.CanchaPlusComponents.showToast(`Modo ${isDark ? 'oscuro' : 'claro'} activado`);
    });
  },

  bindContrastToggle() {
    $('#btnToggleContrast').on('click', function() {
      const isHighContrast = $('body').toggleClass('high-contrast').hasClass('high-contrast');
      $(this).attr('aria-pressed', String(isHighContrast));
      window.CanchaPlusComponents.showToast(
        isHighContrast ? 'Modo de alto contraste activado' : 'Alto contraste desactivado'
      );
    });
  },

  bindSemanticAudit() {
    $('#btnRunSemanticAudit').on('click', () => {
      this.runAudit();
    });
  },

  runAudit() {
    // 1. Imágenes sin atributo alt
    const images = Array.from(document.querySelectorAll('img'));
    const missingAlt = images.filter(img => !img.hasAttribute('alt') || img.getAttribute('alt').trim() === '').length;

    // 2. Enlaces vacíos o sin texto accesible
    const links = Array.from(document.querySelectorAll('a'));
    const emptyLinks = links.filter(a => {
      const href = a.getAttribute('href');
      const text = a.textContent.trim();
      const hasImg = a.querySelector('img[alt]');
      return !href || (!text && !hasImg);
    }).length;

    // 3. Botones sin nombre accesible (sin texto y sin aria-label)
    const buttons = Array.from(document.querySelectorAll('button'));
    const unnamedButtons = buttons.filter(b => {
      const text = b.textContent.trim();
      const ariaLabel = b.getAttribute('aria-label');
      return !text && !ariaLabel;
    }).length;

    // 4. Inputs sin label o sin aria-label
    const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
    const unlabelledInputs = inputs.filter(inp => {
      const id = inp.id;
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const hasAria = inp.getAttribute('aria-label') || inp.getAttribute('aria-labelledby');
      return !hasLabel && !hasAria;
    }).length;

    // 5. Conteo de etiquetas semánticas HTML5
    const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'footer'];
    const semanticCount = semanticTags.reduce((sum, tag) => sum + document.querySelectorAll(tag).length, 0);

    const reportText = `Auditoría Semántica completada: ${semanticCount} etiquetas HTML5 semánticas identificadas · ${missingAlt} imágenes sin alt · ${emptyLinks} enlaces vacíos · ${unnamedButtons} botones sin nombre · ${unlabelledInputs} inputs sin label.`;

    $('#auditResultDisplay').text(reportText);
    window.CanchaPlusComponents.showToast('Auditoría semántica ejecutada con éxito', 'success');
    window.CanchaPlusApp.addLog(reportText);

    return {
      semanticCount,
      missingAlt,
      emptyLinks,
      unnamedButtons,
      unlabelledInputs
    };
  }
};

window.CanchaPlusA11y = a11yModule;
