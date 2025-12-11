;(function () {
  if (window.__xrayInteractionInjected) return
  window.__xrayInteractionInjected = true
  
  let root
  let layoutLayer
  let traceLayer
  let ghostLayer
  let asciiLayer
  let traceSvg
  
  let cursorDot
  let lastTraceTime = 0
  let lastTracePoint = null
  
  let consoleBox
  const consoleLines = []
  const maxConsoleLines = 5
  
  let cursorX = window.innerWidth / 2
  let cursorY = window.innerHeight / 2
  
  const lastValues = new WeakMap()
  let activeInput = null
  let typingTimer = null
  
  let lastScrollY = window.scrollY
  let lastScrollTime = Date.now()
  let layoutTimer = null
  
  let idleTimer = null
  
  let video
  let canvas
  let ctx
  let asciiTimer = null
  
  function createRoot () {
  root = document.createElement('div')
  root.style.position = 'fixed'
  root.style.inset = '0'
  root.style.pointerEvents = 'none'
  root.style.zIndex = '2147483646'
  root.style.mixBlendMode = 'difference'
  
  layoutLayer = document.createElement('div')
  layoutLayer.style.position = 'absolute'
  layoutLayer.style.inset = '0'
  layoutLayer.style.pointerEvents = 'none'
  
  traceLayer = document.createElement('div')
  traceLayer.style.position = 'absolute'
  traceLayer.style.inset = '0'
  traceLayer.style.pointerEvents = 'none'
  
  ghostLayer = document.createElement('div')
  ghostLayer.style.position = 'absolute'
  ghostLayer.style.inset = '0'
  ghostLayer.style.pointerEvents = 'none'
  
  asciiLayer = document.createElement('pre')
  asciiLayer.style.position = 'absolute'
  asciiLayer.style.left = '50%'
  asciiLayer.style.top = '50%'
  asciiLayer.style.transform = 'translate(-50%, -50%)'
  asciiLayer.style.pointerEvents = 'none'
  asciiLayer.style.margin = '0'
  asciiLayer.style.fontFamily = 'monospace'
  asciiLayer.style.fontSize = '8px'
  asciiLayer.style.lineHeight = '8px'
  asciiLayer.style.color = 'rgba(255,255,255,0.7)'
  asciiLayer.style.textShadow = '0 0 4px rgba(255,255,255,1)'
  asciiLayer.style.whiteSpace = 'pre'
  asciiLayer.style.maxWidth = '90vw'
  asciiLayer.style.maxHeight = '70vh'
  asciiLayer.style.overflow = 'hidden'
  
  traceSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  traceSvg.setAttribute('width', '100%')
  traceSvg.setAttribute('height', '100%')
  traceSvg.style.position = 'absolute'
  traceSvg.style.left = '0'
  traceSvg.style.top = '0'
  traceSvg.style.pointerEvents = 'none'
  
  traceLayer.appendChild(traceSvg)
  
  root.appendChild(layoutLayer)
  root.appendChild(traceLayer)
  root.appendChild(ghostLayer)
  root.appendChild(asciiLayer)
  document.documentElement.appendChild(root)
  
  
  }
  
  function labelForTag (tag) {
  if (tag === 'img') return 'IMG'
  if (tag === 'p') return 'TEXT'
  if (tag === 'nav') return 'NAV'
  if (tag === 'header') return 'HEADER'
  if (tag === 'footer') return 'FOOTER'
  if (tag === 'section') return 'SECTION'
  if (tag === 'article') return 'ARTICLE'
  if (tag === 'main') return 'MAIN'
  return 'DIV'
  }
  
  function buildLayoutOverlay () {
  layoutLayer.innerHTML = ''
  
  const nodes = document.querySelectorAll('div, section, article, main, header, footer, nav, img, p')
  const maxNodes = 200
  const len = Math.min(nodes.length, maxNodes)
  
  for (let i = 0; i < len; i++) {
    const el = nodes[i]
    if (!el.getBoundingClientRect) continue
    const rect = el.getBoundingClientRect()
    if (rect.width < 40 || rect.height < 30) continue
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue
  
    const tag = el.tagName.toLowerCase()
    const box = document.createElement('div')
    box.style.position = 'absolute'
    box.style.left = rect.left + 'px'
    box.style.top = rect.top + 'px'
    box.style.width = rect.width + 'px'
    box.style.height = rect.height + 'px'
    box.style.borderRadius = '3px'
    box.style.boxSizing = 'border-box'
  
    let borderColor = 'rgba(255,255,255,0.7)'
    let bgColor = 'rgba(255,255,255,0.08)'
  
    if (tag === 'img') {
      borderColor = 'rgba(255,255,255,0.85)'
      bgColor = 'rgba(255,255,255,0.10)'
    } else if (tag === 'p') {
      borderColor = 'rgba(255,255,255,0.75)'
      bgColor = 'rgba(255,255,255,0.07)'
    } else if (tag === 'nav' || tag === 'header' || tag === 'footer') {
      borderColor = 'rgba(255,255,255,0.8)'
      bgColor = 'rgba(255,255,255,0.09)'
    }
  
    box.style.border = '1px solid ' + borderColor
    box.style.background = bgColor
    box.style.boxShadow = '0 0 6px rgba(255,255,255,0.45) inset'
  
    const label = document.createElement('div')
    label.textContent = labelForTag(tag)
    label.style.position = 'absolute'
    label.style.left = '4px'
    label.style.top = '2px'
    label.style.fontFamily = 'monospace'
    label.style.fontSize = '9px'
    label.style.color = 'rgba(255,255,255,0.95)'
    label.style.textShadow = '0 0 4px rgba(255,255,255,1)'
    label.style.pointerEvents = 'none'
  
    box.appendChild(label)
    layoutLayer.appendChild(box)
  }
  
  
  }
  
  function scheduleLayoutRebuild () {
  if (layoutTimer) clearTimeout(layoutTimer)
  layoutTimer = setTimeout(buildLayoutOverlay, 160)
  }
  
  function createCursorDot () {
  cursorDot = document.createElement('div')
  cursorDot.style.position = 'fixed'
  cursorDot.style.width = '14px'
  cursorDot.style.height = '14px'
  cursorDot.style.borderRadius = '999px'
  cursorDot.style.pointerEvents = 'none'
  cursorDot.style.transform = 'translate(-50%, -50%) scale(1)'
  cursorDot.style.transition = 'transform 0.15s ease-out'
  cursorDot.style.background = 'radial-gradient(circle, rgba(255,255,255,1) 0, rgba(255,255,255,0.6) 50%, rgba(0,0,0,0) 80%)'
  cursorDot.style.boxShadow = '0 0 12px rgba(255,255,255,1)'
  traceLayer.appendChild(cursorDot)
  }
  
  function setCursorDotPosition (x, y) {
  cursorDot.style.left = x + 'px'
  cursorDot.style.top = y + 'px'
  }
  
  function setCursorDotHoverState (hovering) {
  if (!cursorDot) return
  cursorDot.dataset.state = hovering ? 'hover' : 'normal'
  applyDotScale()
  }
  
  function setCursorDotIdleState (idle) {
  if (!cursorDot) return
  cursorDot.dataset.idle = idle ? '1' : '0'
  applyDotScale()
  }
  
  function applyDotScale () {
  if (!cursorDot) return
  const idle = cursorDot.dataset.idle === '1'
  const hover = cursorDot.dataset.state === 'hover'
  let scale = 1
  if (hover) scale = 1.9
  if (idle) scale = 2.3
  if (hover && idle) scale = 2.5
  cursorDot.style.transform = 'translate(-50%, -50%) scale(' + scale + ')'
  }
  
  function addTraceMark (x, y) {
  const now = Date.now()
  if (now - lastTraceTime < 30) return
  lastTraceTime = now
  
  if (!traceSvg) return
  
  const cx = x
  const cy = y
  
  if (lastTracePoint) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', String(lastTracePoint.x))
    line.setAttribute('y1', String(lastTracePoint.y))
    line.setAttribute('x2', String(cx))
    line.setAttribute('y2', String(cy))
    line.style.stroke = 'rgba(255,255,255,0.9)'
    line.style.strokeWidth = '1'
    traceSvg.appendChild(line)
  }
  
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', String(cx))
  circle.setAttribute('cy', String(cy))
  circle.setAttribute('r', '3')
  circle.style.fill = 'rgba(255,255,255,0.95)'
  traceSvg.appendChild(circle)
  
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  label.setAttribute('x', String(cx + 4))
  label.setAttribute('y', String(cy - 4))
  label.textContent = cx + ',' + cy
  label.style.fontFamily = 'monospace'
  label.style.fontSize = '8px'
  label.style.fill = 'rgba(255,255,255,0.95)'
  traceSvg.appendChild(label)
  
  lastTracePoint = { x: cx, y: cy }
  
  
  }
  
  function createConsoleBox () {
  consoleBox = document.createElement('div')
  consoleBox.style.position = 'fixed'
  consoleBox.style.pointerEvents = 'none'
  consoleBox.style.fontFamily = 'monospace'
  consoleBox.style.fontSize = '10px'
  consoleBox.style.color = 'rgba(255,255,255,0.95)'
  consoleBox.style.textShadow = '0 0 4px rgba(255,255,255,1)'
  consoleBox.style.maxWidth = '260px'
  consoleBox.style.lineHeight = '1.3'
  consoleBox.style.whiteSpace = 'normal'
  consoleBox.style.wordBreak = 'break-word'
  consoleBox.style.zIndex = '2147483647'
  document.documentElement.appendChild(consoleBox)
  updateConsoleBox()
  moveConsoleBox()
  }
  
  function moveConsoleBox () {
  if (!consoleBox) return
  let x = cursorX + 20
  let y = cursorY + 20
  const rect = consoleBox.getBoundingClientRect()
  if (x + rect.width > window.innerWidth - 8) x = cursorX - rect.width - 20
  if (y + rect.height > window.innerHeight - 8) y = cursorY - rect.height - 20
  if (x < 8) x = 8
  if (y < 8) y = 8
  consoleBox.style.left = x + 'px'
  consoleBox.style.top = y + 'px'
  }
  
  function addConsoleLine (text) {
  consoleLines.push(text)
  if (consoleLines.length > maxConsoleLines) {
  consoleLines.splice(0, consoleLines.length - maxConsoleLines)
  }
  updateConsoleBox()
  }
  
  function updateConsoleBox () {
  if (!consoleBox) return
  consoleBox.innerHTML = ''
  const title = document.createElement('div')
  title.textContent = '[CONSOLE]'
  title.style.opacity = '0.9'
  consoleBox.appendChild(title)
  for (let i = 0; i < consoleLines.length; i++) {
  const line = document.createElement('div')
  line.textContent = consoleLines[i]
  line.style.opacity = i === consoleLines.length - 1 ? '1' : '0.78'
  consoleBox.appendChild(line)
  }
  }
  
  function describeRole (el) {
  if (!el || !el.tagName) return 'target unknown'
  const t = el.tagName.toLowerCase()
  if (t === 'a') return 'link node'
  if (t === 'button') return 'button node'
  if (t === 'input') return 'field node'
  if (t === 'textarea') return 'text area'
  if (el.isContentEditable) return 'edit region'
  if (t === 'img') return 'image frame'
  return 'page block'
  }
  
  function logScrollObservation (dy, dt) {
  if (dt <= 0) {
  addConsoleLine('[SCROLL] frame held in place')
  return
  }
  const speed = Math.abs(dy) / dt
  if (dy > 0) {
  if (speed > 1) addConsoleLine('[SCROLL] fast downward sweep over content')
  else if (speed > 0.35) addConsoleLine('[SCROLL] steady move down the page')
  else addConsoleLine('[SCROLL] slow drift downward')
  } else if (dy < 0) {
  if (speed > 1) addConsoleLine('[SCROLL] fast upward return through content')
  else if (speed > 0.35) addConsoleLine('[SCROLL] steady move back up the page')
  else addConsoleLine('[SCROLL] slow drift upward')
  } else {
  addConsoleLine('[SCROLL] position unchanged')
  }
  }
  
  function logClickObservation (el, heldMs) {
  const role = describeRole(el)
  if (heldMs > 700) {
  addConsoleLine('[CLICK] long press on ' + role)
  return
  }
  if (!el || !el.tagName) {
  addConsoleLine('[CLICK] press on blank area')
  return
  }
  const t = el.tagName.toLowerCase()
  if (t === 'a') {
  const href = el.getAttribute('href') || ''
  if (href.startsWith('#')) {
  addConsoleLine('[CLICK] click on internal link node')
  } else {
  addConsoleLine('[CLICK] click on link that changes view')
  }
  return
  }
  if (t === 'button') {
  addConsoleLine('[CLICK] press on button node')
  return
  }
  if (t === 'input' || t === 'textarea' || el.isContentEditable) {
  addConsoleLine('[CLICK] focus moved into text field')
  return
  }
  addConsoleLine('[CLICK] interaction on ' + role)
  }
  
  function logHoverObservation (el, duration) {
  const role = describeRole(el)
  if (duration == null) {
  addConsoleLine('[HOVER] cursor passing over ' + role)
  return
  }
  if (duration > 2000) {
  addConsoleLine('[HOVER] cursor resting on ' + role + ' for a while')
  } else if (duration > 800) {
  addConsoleLine('[HOVER] cursor pausing on ' + role)
  } else {
  addConsoleLine('[HOVER] quick hover on ' + role)
  }
  }
  
  function classifyTypingObservation (value, roleText) {
  const v = value.trim()
  if (!v) return null
  const lower = v.toLowerCase()
  if (v.endsWith('?')) return '[TYPE] question is being formed in text'
  if (lower.startsWith('how ') || lower.startsWith('why ') || lower.startsWith('what ')) {
  return '[TYPE] query like sentence is appearing'
  }
  if (roleText === 'field node' && v.length < 20) {
  return '[TYPE] short field entry is filling in'
  }
  if (v.length > 100) return '[TYPE] long block of text is growing'
  if (v.length > 40) return '[TYPE] medium length text is taking shape'
  return '[TYPE] light text input is being tested'
  }
  
  function handleGhostErrors (el, oldVal, newVal) {
  if (typeof oldVal !== 'string' || typeof newVal !== 'string') return
  if (newVal.length >= oldVal.length) return
  const removed = oldVal.slice(newVal.length)
  if (!removed.trim()) return
  
  const rect = el.getBoundingClientRect()
  const ghost = document.createElement('div')
  ghost.textContent = removed
  ghost.style.position = 'absolute'
  ghost.style.left = rect.left + 'px'
  ghost.style.top = (rect.bottom + 2) + 'px'
  ghost.style.fontFamily = 'monospace'
  ghost.style.fontSize = '10px'
  ghost.style.color = 'rgba(255,255,255,0.25)'
  ghost.style.textShadow = '0 0 4px rgba(255,255,255,0.6)'
  ghost.style.pointerEvents = 'none'
  ghost.style.whiteSpace = 'pre'
  ghost.style.maxWidth = rect.width + 'px'
  ghost.style.overflow = 'hidden'
  ghost.style.textOverflow = 'ellipsis'
  
  ghostLayer.appendChild(ghost)
  addConsoleLine('[EDIT] removed text left behind as trace')
  
  
  }
  
  function onTypingChanged (el) {
  const value = el.value || ''
  const roleText = describeRole(el)
  const obs = classifyTypingObservation(value, roleText)
  if (obs) addConsoleLine(obs)
  }
  
  function initWebcamAscii () {
  try {
  video = document.createElement('video')
  video.autoplay = true
  video.muted = true
  video.playsInline = true
  video.style.display = 'none'
  document.documentElement.appendChild(video)
  
    canvas = document.createElement('canvas')
    canvas.width = 80
    canvas.height = 40
    ctx = canvas.getContext('2d')
  
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return
  
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(function (stream) {
        video.srcObject = stream
        video.onloadedmetadata = function () {
          video.play()
          startAsciiLoop()
        }
      })
      .catch(function () {
        asciiLayer.textContent = ''
      })
  } catch (e) {
    asciiLayer.textContent = ''
  }
  
  
  }
  
  function startAsciiLoop () {
  if (!ctx || !video) return
  if (asciiTimer) clearInterval(asciiTimer)
  asciiTimer = setInterval(function () {
  if (video.readyState < 2) return
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  let out = ''
  for (let y = 0; y < canvas.height; y++) {
  for (let x = 0; x < canvas.width; x++) {
  const idx = (y * canvas.width + x) * 4
  const r = data[idx]
  const g = data[idx + 1]
  const b = data[idx + 2]
  const bright = (r + g + b) / 3
  out += bright > 110 ? '/' : ' '
  }
  out += '\n'
  }
  asciiLayer.textContent = out
  }, 120)
  }
  
  document.addEventListener('mousemove', function (e) {
  cursorX = e.clientX
  cursorY = e.clientY
  setCursorDotPosition(cursorX, cursorY)
  addTraceMark(cursorX, cursorY)
  moveConsoleBox()
  setCursorDotIdleState(false)
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(function () {
  setCursorDotIdleState(true)
  }, 500)
  }, true)
  
  document.addEventListener('mouseover', function (e) {
  const t = e.target
  const tag = t && t.tagName ? t.tagName.toLowerCase() : ''
  const interactive = tag === 'a' || tag === 'button' || tag === 'input' ||
  tag === 'textarea' || (t && t.isContentEditable)
  setCursorDotHoverState(interactive)
  logHoverObservation(t, null)
  }, true)
  
  let hoverTarget = null
  let hoverStart = 0
  
  document.addEventListener('mouseenter', function (e) {
  hoverTarget = e.target
  hoverStart = Date.now()
  }, true)
  
  document.addEventListener('mouseleave', function (e) {
  if (e.target === hoverTarget && hoverStart) {
  const dur = Date.now() - hoverStart
  logHoverObservation(hoverTarget, dur)
  hoverTarget = null
  hoverStart = 0
  }
  }, true)
  
  let downTarget = null
  let downTime = 0
  
  document.addEventListener('mousedown', function (e) {
  downTarget = e.target
  downTime = Date.now()
  addConsoleLine('[MOUSE] button pressed down')
  }, true)
  
  document.addEventListener('mouseup', function (e) {
  const held = Date.now() - downTime
  logClickObservation(e.target, held)
  downTarget = null
  downTime = 0
  }, true)
  
  window.addEventListener('scroll', function () {
  scheduleLayoutRebuild()
  const now = Date.now()
  const dy = window.scrollY - lastScrollY
  const dt = now - lastScrollTime
  logScrollObservation(dy, dt)
  lastScrollY = window.scrollY
  lastScrollTime = now
  }, { passive: true })
  
  document.addEventListener('focusin', function (e) {
  const el = e.target
  if (!el.tagName) return
  const t = el.tagName.toLowerCase()
  if (t === 'input' || t === 'textarea' || el.isContentEditable) {
  activeInput = el
  lastValues.set(el, el.value || '')
  const role = describeRole(el)
  addConsoleLine('[FOCUS] focus moves into ' + role)
  }
  }, true)
  
  document.addEventListener('focusout', function (e) {
  if (activeInput === e.target) {
  addConsoleLine('[FOCUS] focus leaves current field')
  activeInput = null
  }
  }, true)
  
  document.addEventListener('input', function (e) {
  const el = e.target
  if (!el || !el.tagName) return
  const t = el.tagName.toLowerCase()
  if (!(t === 'input' || t === 'textarea' || el.isContentEditable)) return
  
  const oldVal = lastValues.get(el) || ''
  const newVal = el.value || ''
  handleGhostErrors(el, oldVal, newVal)
  lastValues.set(el, newVal)
  
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = setTimeout(function () {
    onTypingChanged(el)
  }, 420)
  
  
  }, true)
  
  document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') addConsoleLine('[KEY] enter key pressed on this state')
  if (e.key === 'Escape') addConsoleLine('[KEY] escape key pressed on this state')
  }, true)
  
  window.addEventListener('resize', scheduleLayoutRebuild)
  
  createRoot()
  createCursorDot()
  createConsoleBox()
  buildLayoutOverlay()
  moveConsoleBox()
  addConsoleLine('[SESSION] x ray overlay is watching this page')
  initWebcamAscii()
  })()