// Módulo de activación diferida de la vista de reservas.
export function activateBookingView(view) {
  view.classList.add("lazy-component-ready");
  view.setAttribute("aria-busy", "false");
  view.dispatchEvent(new CustomEvent("lazycomponent:ready", { bubbles: true }));
}
