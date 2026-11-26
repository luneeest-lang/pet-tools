(async () => {
  const $ = id => document.getElementById(id);
  async function render() {
    const { settings, text } = await window.settingsApi.get();
    document.title = text.title;
    $("title").textContent = text.title; $("sizeLabel").textContent = text.size;
    $("s2").textContent = text.size2; $("s3").textContent = text.size3; $("s4").textContent = text.size4;
    $("startupLabel").textContent = text.startup; $("langLabel").textContent = text.language; $("close").textContent = text.close;
    $("scale" + settings.scale).checked = true;
    $("startup").checked = !!settings.launchAtStartup;
    $("language").value = settings.language;
  }
  document.querySelectorAll("input[name=scale]").forEach(r => r.addEventListener("change", () => window.settingsApi.set({ scale: Number(r.value) })));
  $("startup").addEventListener("change", e => window.settingsApi.set({ launchAtStartup: e.target.checked }));
  $("language").addEventListener("change", async e => { await window.settingsApi.set({ language: e.target.value }); render(); });
  $("close").addEventListener("click", () => window.settingsApi.close());
  render();
})();
