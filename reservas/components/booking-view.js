/**
 * CANCHAPLUS — COMPONENTE MODULAR DE RESERVAS
 * Encapsulamiento y activación diferida
 */

export function activateBookingView(viewElement) {
  if (!viewElement) return;
  viewElement.classList.add('lazy-component-ready');
  viewElement.setAttribute('aria-busy', 'false');
  viewElement.dispatchEvent(new CustomEvent('canchaplus:booking-ready', { bubbles: true }));
}

export default {
  activateBookingView
};
