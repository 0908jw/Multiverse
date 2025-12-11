;(function () {
  if (window.__panelTestInjected) return
  window.__panelTestInjected = true
  
  // loud proof that the script runs
  alert("XRAY TEST CONTENT SCRIPT LOADED")
  
  var panel = document.createElement("div")
  panel.textContent = "XRAY TEST PANEL"
  panel.style.position = "fixed"
  panel.style.top = "20px"
  panel.style.right = "20px"
  panel.style.zIndex = "2147483647"
  panel.style.padding = "20px 24px"
  panel.style.fontFamily = "monospace"
  panel.style.fontSize = "16px"
  panel.style.color = "#ffffff"
  panel.style.background = "#ff0000"
  panel.style.border = "3px solid #ffffff"
  panel.style.boxShadow = "0 0 20px rgba(0,0,0,0.9)"
  panel.style.pointerEvents = "auto"
  
  document.documentElement.appendChild(panel)
  })()