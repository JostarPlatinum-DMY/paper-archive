(() => {
  const studio = document.querySelector('#studio');
  const shell = document.querySelector('.shell');
  const canvas = document.querySelector('#studio-canvas');
  const context = canvas.getContext('2d');
  const prompt = studio.querySelector('.studio-interact');
  const message = studio.querySelector('.studio-message');
  const loading = studio.querySelector('.studio-loading');
  const audio = document.querySelector('.record-player audio');
  const sound = studio.querySelector('.studio-sound');
  const world = RoomWorld;
  const image = new Image();
  const walking = new Image(), resting = new Image();
  let walkAtlas, idleAtlas;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const held = new Set();
  const person = { x: 6.6, y: 6.7, facing: 'up', walk: 0, vx: 0, vy: 0 };
  let ready = false, visible = false, entering = false, frame = 0, previousTime;
  let path = [], queuedInteraction, closest, complete, messageTimer, sitting = false;
  let zoom = 1, blend = 1, deskLit = false;
  const masks = [
    { depth: 7.6, points: [[444, 463], [795, 383], [797, 538], [529, 610], [443, 575]] },
    { depth: 7.8, points: [[628, 450], [737, 425], [748, 551], [629, 585], [601, 549]] },
    { depth: 9.4, points: [[214, 314], [441, 249], [445, 581], [214, 653]] },
    { depth: 7.7, points: [[968, 482], [1209, 531], [1218, 609], [968, 555]] },
    { depth: 11.5, points: [[1193, 583], [1300, 488], [1447, 555], [1448, 708], [1281, 733], [1192, 652]] }
  ];

  function say(text) {
    clearTimeout(messageTimer);
    message.textContent = copy(text);
    message.hidden = false;
    messageTimer = setTimeout(() => { message.hidden = true; }, 4200);
  }
  function copy(text) { return window.portfolioTranslate?.(text) ?? text; }

  function rect(x, y, w, h, color) { context.fillStyle = color; context.fillRect(Math.round(x), Math.round(y), w, h); }

  function prepareAtlas(source, columns, rows, standingCount) {
    const sheet = document.createElement('canvas');
    sheet.width = source.naturalWidth; sheet.height = source.naturalHeight;
    const painter = sheet.getContext('2d', { willReadFrequently: true });
    painter.drawImage(source, 0, 0);
    const pixels = painter.getImageData(0, 0, sheet.width, sheet.height);
    // Discard near-transparent matte residue, preserving the illustrated edge.
    for (let i = 3; i < pixels.data.length; i += 4) if (pixels.data[i] < 32) pixels.data[i] = 0;
    painter.putImageData(pixels, 0, 0);
    const frames = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const left = Math.round(col * sheet.width / columns), right = Math.round((col + 1) * sheet.width / columns);
      const top = Math.round(row * sheet.height / rows), bottom = Math.round((row + 1) * sheet.height / rows);
      let x0 = right, y0 = bottom, x1 = left, y1 = top;
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        if (pixels.data[(y * sheet.width + x) * 4 + 3] < 80) continue;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      if (x0 > x1) throw new Error('Empty character frame');
      // Align the torso rather than the swinging shoes to prevent sideways jitter.
      let upperLeft = right, upperRight = left;
      for (let y = y0 + Math.round((y1 - y0) * .17); y < y0 + (y1 - y0) * .43; y++) for (let x = x0; x <= x1; x++) {
        if (pixels.data[(y * sheet.width + x) * 4 + 3] < 128) continue;
        upperLeft = Math.min(upperLeft, x); upperRight = Math.max(upperRight, x);
      }
      frames.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, anchor: (upperLeft + upperRight) / 2 - x0 });
    }
    const height = frames.slice(0, standingCount).reduce((sum, frame) => sum + frame.h, 0) / standingCount;
    return { sheet, frames, scale: 236 / height };
  }

  function drawPerson(time, moving) {
    const point = sitting ? { x: 1330, y: 672 } : world.project(person.x, person.y);
    context.save();
    context.translate(point.x, point.y);
    context.fillStyle = '#4f352d3b';
    context.beginPath(); context.ellipse(5, -1, 23, 8, .12, 0, Math.PI * 2); context.fill();
    const atlas = (!moving || sitting || reduced.matches) && idleAtlas ? idleAtlas : walkAtlas;
    if (atlas) {
      const direction = { up: 0, right: 1, down: 2, left: 3 }[person.facing];
      const pose = atlas === idleAtlas ? (sitting ? 4 : direction) : direction * 6 + (moving && !reduced.matches ? Math.floor(person.walk / (Math.PI * 2) * 6) % 6 : 1);
      const sprite = atlas.frames[pose], scale = atlas.scale;
      const breath = !moving && !reduced.matches ? Math.sin(time / 1250) * .003 : 0;
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
      context.drawImage(atlas.sheet, sprite.x, sprite.y, sprite.w, sprite.h,
        -sprite.anchor * scale, -sprite.h * scale * (1 + breath) - 2,
        sprite.w * scale, sprite.h * scale * (1 + breath));
      context.restore();
      return;
    }
    // Compact fallback while the detailed sprite textures load.
    const scale = 3;
    const bob = !reduced.matches && moving ? Math.round(Math.sin(person.walk) * 1) : 0;
    context.scale(scale, scale);
    context.translate(-10, -43 - bob + (sitting ? 4 : 0));
    const step = moving && !reduced.matches ? Math.round(Math.sin(person.walk) * 2) : 0;
    const back = person.facing === 'up';
    const left = person.facing === 'left';
    // Low-resolution paper, skin and fabric blocks keep the sprite legible while moving.
    rect(5, 25, 5, (sitting ? 10 : 15) + step, '#485843'); rect(11, 25, 5, (sitting ? 10 : 15) - step, '#65745a');
    rect(5, (sitting ? 33 : 38) + step, 5, 3, '#644733'); rect(11, (sitting ? 33 : 38) - step, 7, 3, '#513725');
    rect(5, 13, 11, 15, '#997e5e'); rect(6, 14, 9, 12, '#f1e4c7');
    rect(6, 16, 3, 9, '#fff0d5'); rect(13, 15, 2, 11, '#cdb493');
    rect(3, 15 - step, 3, 10, '#d6c09c'); rect(15, 15 + step, 3, 10, '#e7d5af');
    rect(3, 24 - step, 3, 3, '#ba8a67'); rect(15, 24 + step, 3, 3, '#d2a17c');
    rect(7, 10, 7, 5, '#cb9974');
    rect(5, 3, 12, 10, '#66442c'); rect(4, 4, 14, 7, '#352b22');
    rect(6, 1, 9, 3, '#463126'); rect(3, 6, 3, 4, '#332a23');
    rect(7, 2, 3, 2, '#735139'); rect(11, 4, 5, 2, '#5c3f2b');
    if (!back) {
      rect(left ? 4 : 7, 8, 9, 5, '#d7a17b');
      rect(left ? 5 : 14, 9, 1, 2, '#34291f');
      rect(left ? 3 : 16, 10, 2, 2, '#e1b18a');
    } else {
      rect(5, 9, 3, 3, '#483024'); rect(12, 7, 4, 4, '#473226');
    }
    context.restore();
  }

  function render(time, moving) {
    context.clearRect(0, 0, 1672, 941);
    if (!ready) return;
    context.save();
    context.translate(836, 470);
    context.scale(zoom, zoom);
    context.translate(-836 - (zoom - 1) / zoom * 367, -470 + (zoom - 1) / zoom * 263);
    context.globalAlpha = blend;
    context.drawImage(image, 0, 0, 1672, 941);
    if (deskLit) {
      context.save(); context.fillStyle = '#c9e7b833'; context.shadowColor = '#e6ffc1'; context.shadowBlur = 12;
      context.beginPath(); context.moveTo(544, 354); context.lineTo(654, 307); context.lineTo(654, 389); context.lineTo(544, 428); context.closePath(); context.fill(); context.restore();
    }
    if (!audio.paused && !reduced.matches) {
      context.save(); context.translate(1042, 451); context.scale(1, .4); context.rotate(time / 1100);
      context.strokeStyle = '#cbaa777a'; context.lineWidth = 2;
      context.beginPath(); context.arc(0, 0, 31, -.4, .3); context.stroke();
      context.restore();
    }
    if (closest?.id === 'board' && !entering) {
      context.strokeStyle = '#ffeec1'; context.lineWidth = 3;
      context.shadowColor = '#ffda80'; context.shadowBlur = 14;
      context.beginPath(); context.moveTo(922, 95); context.lineTo(1283, 233); context.lineTo(1283, 483); context.lineTo(922, 344); context.closePath(); context.stroke();
      context.shadowBlur = 0;
    }
    drawPerson(time, moving);
    for (const mask of masks) {
      if (sitting || person.x + person.y >= mask.depth) continue;
      context.save(); context.beginPath();
      mask.points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
      context.closePath(); context.clip(); context.drawImage(image, 0, 0, 1672, 941); context.restore();
    }
    if (!reduced.matches && !entering) {
      for (let i = 0; i < 12; i++) {
        const x = 450 + ((i * 71 + time * .004) % 360);
        const y = 200 + ((i * 43 + time * .002) % 430);
        rect(x, y, 2, 2, '#ffe9b85c');
      }
    }
    context.restore();
  }

  function updatePrompt() {
    prompt.hidden = !closest || entering;
    if (!closest) return;
    prompt.querySelector('span').textContent = copy(closest.label);
    const point = sitting ? { x: 1330, y: 672 } : world.project(person.x, person.y);
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(bounds.width / 1672, bounds.height / 941);
    prompt.style.left = (bounds.width - 1672 * scale) / 2 + point.x * scale + 'px';
    prompt.style.top = (bounds.height - 941 * scale) / 2 + (point.y - (sitting ? 220 : 254)) * scale + 'px';
  }

  function tick(time) {
    if (!visible) { frame = 0; return; }
    const dt = Math.min((time - previousTime) / 1000 || .016, .035);
    previousTime = time;
    const screenX = Number(held.has('right')) - Number(held.has('left'));
    const screenY = Number(held.has('down')) - Number(held.has('up'));
    if (!entering && (screenX || screenY)) {
      path = []; queuedInteraction = undefined; sitting = false;
    }
    const pace = !entering && !sitting ? world.moveActor(person, screenX, screenY, path, dt) : 0;
    const moving = pace > .08;
    closest = world.hotspots.filter(item => Math.hypot(item.x - person.x, item.y - person.y) < 1.15)
      .sort((a, b) => Math.hypot(a.x - person.x, a.y - person.y) - Math.hypot(b.x - person.x, b.y - person.y))[0];
    if (!path.length && queuedInteraction && !entering) {
      const action = queuedInteraction;
      queuedInteraction = undefined;
      if (closest?.id === action.id) interact(action);
    }
    updatePrompt(); render(time, moving);
    frame = requestAnimationFrame(tick);
  }

  function music() {
    if (audio.paused) audio.play().catch(() => say('点击唱片机开启音乐'));
    else audio.pause();
  }
  function interact(item = closest) {
    if (!item || entering) return;
    path = []; held.clear(); person.vx = person.vy = 0;
    person.facing = 'up';
    if (item.id === 'board') enter(true);
    if (item.id === 'record') music();
    if (item.id === 'desk') { deskLit = !deskLit; say('脚本、分镜与 AI 工作流，都收在洞洞板的项目说明里。'); }
    if (item.id === 'books') say('法律、商业与技术。去洞洞板翻开项目，继续阅读。');
    if (item.id === 'sofa') { sitting = !sitting; say(sitting ? '坐一会儿。准备好了，去洞洞板看看。' : '继续探索房间吧。'); }
  }

  async function enter(animateBoard) {
    if (entering || !visible) return;
    entering = true; held.clear(); path = []; queuedInteraction = undefined;
    studio.classList.add('is-entering');
    clearTimeout(messageTimer); message.hidden = true;
    if (!reduced.matches) {
      const begin = performance.now(), duration = animateBoard && ready ? 1350 : 350;
      await new Promise(resolve => {
        function transition(now) {
          const t = Math.min(1, (now - begin) / duration);
          const eased = t * t * (3 - 2 * t);
          zoom = animateBoard ? 1 + eased * 2.6 : 1;
          studio.style.opacity = String(1 - Math.max(0, (t - .66) / .34));
          if (t < 1) requestAnimationFrame(transition); else resolve();
        }
        requestAnimationFrame(transition);
      });
    }
    visible = false; studio.hidden = true; shell.inert = false;
    cancelAnimationFrame(frame); frame = 0;
    try { sessionStorage.setItem('paper-studio-seen', 'yes'); } catch { /* Session storage is optional. */ }
    complete?.(); complete = undefined;
    document.querySelector('.studio-return').focus({ preventScroll: true });
  }

  function show() {
    if (visible) return;
    visible = true; entering = false; zoom = 1; blend = 1; path = []; held.clear();
    person.vx = person.vy = 0; queuedInteraction = undefined;
    studio.classList.remove('is-entering'); studio.style.opacity = '1';
    studio.hidden = false; shell.inert = true;
    loading.hidden = ready;
    previousTime = undefined;
    if (!frame) frame = requestAnimationFrame(tick);
    canvas.focus({ preventScroll: true });
  }

  image.addEventListener('load', () => { ready = true; loading.hidden = true; if (visible) say('走到洞洞板前，按 E 打开简历。'); });
  image.addEventListener('error', () => { loading.textContent = copy('房间暂时无法加载，请直接查看简历。'); });
  image.src = 'assets/studio/room.webp';
  walking.addEventListener('load', () => { try { walkAtlas = prepareAtlas(walking, 6, 4, 24); } catch (error) { console.warn('Character walk atlas unavailable', error); } });
  resting.addEventListener('load', () => { try { idleAtlas = prepareAtlas(resting, 3, 2, 4); } catch (error) { console.warn('Character idle atlas unavailable', error); } });
  walking.src = 'assets/studio/character-walk-v2.webp';
  resting.src = 'assets/studio/character-idle-v2.webp';
  window.addEventListener('keydown', event => {
    if (!visible || entering || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('button, input, select')) return;
    const direction = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[event.code];
    if (direction) { event.preventDefault(); held.add(direction); }
    if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); interact(); }
  });
  window.addEventListener('keyup', event => {
    const direction = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[event.code];
    if (direction) held.delete(direction);
  });
  window.addEventListener('blur', () => held.clear());
  document.addEventListener('visibilitychange', () => { if (document.hidden) held.clear(); });
  canvas.addEventListener('pointerdown', event => {
    if (!ready || entering) return;
    canvas.focus({ preventScroll: true });
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(bounds.width / 1672, bounds.height / 941);
    const x = (event.clientX - bounds.left - (bounds.width - 1672 * scale) / 2) / scale;
    const y = (event.clientY - bounds.top - (bounds.height - 941 * scale) / 2) / scale;
    const object = world.hotspots.find(item => x >= item.box[0] && x <= item.box[0] + item.box[2] && y >= item.box[1] && y <= item.box[1] + item.box[3]);
    const target = object ?? world.unproject(x, y);
    if (!object && (target.x < 0 || target.x > 10 || target.y < 0 || target.y > 10)) return;
    sitting = false; held.clear(); queuedInteraction = object;
    path = world.pathTo(person, target);
  });
  for (const button of studio.querySelectorAll('[data-direction]')) {
    button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); path = []; queuedInteraction = undefined; sitting = false; held.add(button.dataset.direction); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => held.delete(button.dataset.direction));
    button.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') held.add(button.dataset.direction); });
    button.addEventListener('keyup', () => held.delete(button.dataset.direction));
    button.addEventListener('blur', () => held.delete(button.dataset.direction));
  }
  prompt.addEventListener('click', () => { interact(); canvas.focus({ preventScroll: true }); });
  studio.querySelector('.studio-skip').addEventListener('click', () => enter(false));
  document.querySelector('.studio-return').addEventListener('click', show);
  sound.addEventListener('click', music);
  const syncSound = () => sound.setAttribute('aria-pressed', String(!audio.paused));
  audio.addEventListener('play', syncSound); audio.addEventListener('pause', syncSound);
  window.portfolioRoom = {
    start({ bypass = false } = {}) {
      let seen = false;
      try { seen = sessionStorage.getItem('paper-studio-seen') === 'yes'; } catch { /* Session storage is optional. */ }
      if (bypass || seen || reduced.matches) return Promise.resolve();
      return new Promise(resolve => { complete = resolve; show(); });
    }
  };
})();
