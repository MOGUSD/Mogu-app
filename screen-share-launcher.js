(() => {
  const addEntry = () => {
    const panel = document.querySelector(".parent-panel");
    if (!panel || panel.querySelector(".screen-share-entry")) return;
    const link = document.createElement("a");
    link.className = "method-entry screen-share-entry";
    link.href = "./screen-share.html";
    link.innerHTML = '📺 <span class="method-title">Трансляция экрана на телефон</span> →';
    panel.prepend(link);
  };
  const start = () => {
    addEntry();
    const root = document.getElementById("app-main");
    if (root) new MutationObserver(addEntry).observe(root, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();