// La vista de reservas permanece oculta hasta que el usuario elige un deporte.
// Su módulo de activación se descarga cuando la vista se muestra por primera vez.
let bookingModuleLoaded = false;
const bookingView = document.getElementById("bookingView");
if (bookingView && "MutationObserver" in window) {
  const observer = new MutationObserver(async () => {
    if (!bookingView.hasAttribute("hidden") && !bookingModuleLoaded) {
      bookingModuleLoaded = true;
      try {
        const module = await import("./components/booking-view.js");
        module.activateBookingView(bookingView);
      } catch (error) {
        bookingView.classList.add("lazy-component-ready");
        console.warn("No se pudo cargar el módulo diferido de reservas:", error);
      }
    }
  });
  observer.observe(bookingView, { attributes: true, attributeFilter: ["hidden"] });
}
