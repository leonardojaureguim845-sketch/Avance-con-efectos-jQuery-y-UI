(() => {
  const status = document.getElementById("pwaStatus");
  const installButton = document.getElementById("pwaInstallButton");
  const mobileConnection = document.getElementById("mobileConnection");
  let installPrompt = null;

  function updateStatus() {
    const online = navigator.onLine;
    const label = online ? "En línea" : "Sin conexión · modo guardado";
    if (status) {
      status.textContent = label;
      status.classList.toggle("offline", !online);
    }
    if (mobileConnection) mobileConnection.textContent = online ? "● En línea" : "● Sin conexión";
  }
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
  updateStatus();

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.hidden = false;
  });

  if (installButton) {
    installButton.addEventListener("click", async () => {
      if (!installPrompt) {
        if (status) status.textContent = "Para instalar, abre DeporZone desde HTTPS";
        return;
      }
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      installButton.hidden = true;
    });
  }

  window.addEventListener("appinstalled", () => {
    if (installButton) installButton.hidden = true;
    if (status) status.textContent = "DeporZone instalada";
  });

  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("./service-worker.js");
        registration.update();
      } catch (error) {
        console.error("No se pudo registrar DeporZone PWA:", error);
        if (status) status.textContent = "No se pudo activar el modo PWA";
      }
    });
  }
})();
