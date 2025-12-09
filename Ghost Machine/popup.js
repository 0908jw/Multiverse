// function setText(id, text) {
//     const el = document.getElementById(id);
//     if (el) el.textContent = text;
//     }
    
//     chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
//     const tab = tabs && tabs[0];
//     if (!tab || !tab.id) {
//     setText("host", "no active tab");
//     return;
//     }
    
//     chrome.tabs.sendMessage(
//     tab.id,
//     { type: "ghost_stats" },
//     response => {
//     if (!response) {
//     setText("host", "no data from this page");
//     return;
//     }
    
//       const host = response.host || "(unknown host)";
//       setText("host", host);
    
//       const e = response.events || { moves: 0, clicks: 0, scrolls: 0 };
//       const sessionText =
//         "moves " + e.moves +
//         "\nclicks " + e.clicks +
//         "\nscrolls " + e.scrolls;
//       setText("session", sessionText);
    
//       const ghostCount = response.ghostCount || 0;
//       const ghostText =
//         ghostCount > 0
//           ? ghostCount + " stored traces shaping the faint map"
//           : "no stored traces yet";
//       setText("ghost", ghostText);
//     }
    
    
//     );
//     });