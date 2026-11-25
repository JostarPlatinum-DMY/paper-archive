const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const reader = document.querySelector('#reader');
const sheet = reader.querySelector('.reader-sheet');
const content = reader.querySelector('.reader-content');
const carrier = reader.querySelector('.reader-carrier');
const backLink = reader.querySelector('.reader-back');
const objects = new Map([...document.querySelectorAll('[data-object]')].map(
  button => [button.dataset.object, button]
));
const directoryLinks = new Map([...document.querySelectorAll('.directory nav a')].map(
  link => [link.hash.slice(1), link]
));
const projectCovers = document.querySelector('#project-covers');
const projectRoutes = new Set([...projectCovers.content.querySelectorAll('[data-cover]')].map(cover => cover.dataset.cover));
const routes = new Set([...objects.keys(), ...projectRoutes]);
const languageSelectors = [...document.querySelectorAll('.language-select')];
const descriptionMeta = document.querySelector('meta[name="description"]');
const sourceTitle = document.title;
const sourceDescription = descriptionMeta.content;
const originalText = new WeakMap();
const originalAttributes = new WeakMap();
const translatedAttributes = ['aria-label', 'alt', 'data-description'];
const languageStorageKey = 'paper-archive-language';
let language = 'zh-CN';
let refreshSelectedSkill;
const sunlight = document.querySelector('#sunlight');
const board = document.querySelector('.board');
sunlight.addEventListener('input', () => board.style.setProperty('--sun-strength', String(sunlight.valueAsNumber / 100)));
const easing = 'cubic-bezier(.22,.75,.23,1)';
const carrierOffsets = {
  works: 'translateX(8%)',
  skills: 'translateX(-6%)',
  about: 'translateY(18px)',
  letters: 'translateY(55px)'
};
let opener;
let openingEffects = [];
let activeBook;
let closing = false;
let backToSkills = false;
let selectedSkill = 2;

const mechanics = {
  works: { mass: 1.55, drag: 12, hover: 1.8 },
  skills: { mass: .82, drag: 29, hover: 5.6 },
  about: { mass: .95, drag: 23, hover: 3.8 },
  letters: { mass: .65, drag: 9, hover: 1.3 }
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function translate(source) {
  const selection = language === 'en' ? 1 : language === 'zh-Hant' ? 0 : -1;
  return translatedCopy[source]?.[selection] ?? source;
}

function localizeTree(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('script, style, option, [data-i18n-live]')) continue;
    const source = originalText.get(node) ?? node.data;
    const copy = source.trim();
    if (!Object.hasOwn(translatedCopy, copy)) continue;
    originalText.set(node, source);
    node.data = source.replace(copy, () => translate(copy));
  }

  for (const element of root.querySelectorAll('[aria-label], [alt], [data-description]')) {
    const originals = originalAttributes.get(element) ?? {};
    for (const attribute of translatedAttributes) {
      if (!element.hasAttribute(attribute)) continue;
      const source = originals[attribute] ?? element.getAttribute(attribute);
      originals[attribute] = source;
      element.setAttribute(attribute, translate(source));
    }
    originalAttributes.set(element, originals);
  }
}

function applyLanguage(next) {
  language = ['zh-CN', 'zh-Hant', 'en'].includes(next) ? next : 'zh-CN';
  document.documentElement.lang = language;
  document.title = translate(sourceTitle);
  descriptionMeta.content = translate(sourceDescription);
  localizeTree(document.body);
  languageSelectors.forEach(selector => { selector.value = language; });
  updateBackButton();
  refreshSelectedSkill?.();
  try { localStorage.setItem(languageStorageKey, language); } catch { /* A local file may not allow storage. */ }
}

for (const [name, button] of objects) {
  const { mass, drag, hover } = mechanics[name];
  const axes = {
    roll: { position: 0, velocity: 0, target: 0 },
    pitch: { position: 0, velocity: 0, target: 0 },
    yaw: { position: 0, velocity: 0, target: 0 },
    flap: { position: 0, velocity: 0, target: 0 }
  };
  let frame = 0;
  let lastTime;
  let grip;
  let ignoreClickUntil = 0;

  function paint(time) {
    const step = Math.min((time - lastTime) / 1000 || 1 / 60, 1 / 30);
    lastTime = time;
    let moving = false;
    for (const [key, axis] of Object.entries(axes)) {
      const stiffness = grip ? 250 : 115;
      const damping = grip ? 24 : 9;
      const acceleration = (stiffness * (axis.target - axis.position) - damping * axis.velocity) / mass;
      axis.velocity += acceleration * step;
      axis.position += axis.velocity * step;
      if (Math.abs(axis.position - axis.target) < .025 && Math.abs(axis.velocity) < .05) {
        axis.position = axis.target;
        axis.velocity = 0;
      } else {
        moving = true;
      }
      button.style.setProperty('--' + key, axis.position.toFixed(2) + 'deg');
    }
    button.style.setProperty('--shadow-shift', (axes.roll.position * .24).toFixed(2) + 'px');
    frame = moving ? requestAnimationFrame(paint) : 0;
  }

  function moveTo(roll, pitch, yaw, flap) {
    axes.roll.target = roll;
    axes.pitch.target = pitch;
    axes.yaw.target = yaw;
    axes.flap.target = flap;
    if (!frame) {
      lastTime = undefined;
      frame = requestAnimationFrame(paint);
    }
  }

  function reset() {
    moveTo(0, 0, 0, 0);
    button.style.removeProperty('--glint');
    button.style.removeProperty('--glint-x');
    button.style.removeProperty('--glint-y');
  }

  button.addEventListener('pointermove', event => {
    if (reducedMotion.matches) return;
    const rect = button.getBoundingClientRect();
    if (grip?.id === event.pointerId) {
      const dx = event.clientX - grip.x;
      const dy = event.clientY - grip.y;
      if (!grip.dragging && Math.hypot(dx, dy) < 6) return;
      if (!grip.dragging) {
        grip.dragging = true;
        button.setPointerCapture(event.pointerId);
        button.classList.add('is-held');
      }
      moveTo(clamp(-dx * .19, -drag, drag), clamp(dy * .13, -10, 10),
        clamp(dx * .08, -10, 10), name === 'letters' ? clamp(-dy * .65 + 12, 4, 48) : 0);
      return;
    }

    if (event.pointerType !== 'mouse' || event.buttons) return;
    const x = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
    const y = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
    moveTo(-x * hover, -y * hover, x * hover * .9, name === 'letters' ? 11 + x * 8 : 0);
    button.style.setProperty('--glint-x', (20 + x * 22) + '%');
    button.style.setProperty('--glint-y', (16 + y * 18) + '%');
    button.style.setProperty('--glint', '.86');
  });

  button.addEventListener('pointerdown', event => {
    if (event.button === 0 && event.pointerType === 'mouse' && !reducedMotion.matches) {
      grip = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
    }
  });

  function release(event) {
    if (grip?.id !== event.pointerId) return;
    if (grip.dragging) ignoreClickUntil = performance.now() + 90;
    grip = undefined;
    button.classList.remove('is-held');
    reset();
  }

  window.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('pointerleave', () => { if (!grip?.dragging) reset(); });
  button.addEventListener('click', event => {
    if (event.detail && performance.now() < ignoreClickUntil) return;
    openReader(name, button);
  });
}

function animate(element, frames, duration, delay = 0, curve = easing) {
  return element.animate(frames, { duration, delay, easing: curve, fill: 'both' });
}

async function playStartup() {
  if (reducedMotion.matches) return;
  const startup = document.querySelector('.startup');
  const shell = document.querySelector('.shell');
  const skip = startup.querySelector('.startup-skip');
  const sequence = ['works', 'skills', 'about', 'letters'];
  const animations = [];
  let skipped = false;
  function skipStartup() {
    skipped = true;
    for (const animation of animations) animation.cancel();
  }

  shell.inert = true;
  startup.hidden = false;
  skip.addEventListener('click', skipStartup);
  reducedMotion.addEventListener('change', skipStartup);
  try {
    const progress = animate(startup.querySelector('.startup-track span'),
      [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 1650, 0, 'linear');
    animations.push(progress);
    await progress.finished;

    const bottom = board.getBoundingClientRect().bottom;
    for (const name of sequence) {
      const object = objects.get(name);
      const distance = Math.ceil(bottom - object.getBoundingClientRect().top + 20);
      object.style.setProperty('--hang-rise', distance + 'px');
    }
    board.classList.add('is-hanging');
    const veil = animate(startup, [{ opacity: 1 }, { opacity: 0 }], 260);
    animations.push(veil);
    await veil.finished;
    startup.hidden = true;

    sequence.forEach((name, index) => {
      const object = objects.get(name);
      const rise = object.style.getPropertyValue('--hang-rise');
      const parts = object.querySelectorAll('.surface, .rig > :not(.hook)');
      for (const part of parts) {
        animations.push(animate(part, [
          { translate: '0 ' + rise, rotate: (index % 2 ? -5 : 5) + 'deg', easing: 'cubic-bezier(.3,.05,.28,1)' },
          { translate: '0 -9px', rotate: '-1deg', offset: .76 },
          { translate: '0 3px', rotate: '.7deg', offset: .88 },
          { translate: '0 0', rotate: '0deg' }
        ], 780, index * 105, 'linear'));
      }
    });
    await Promise.all(animations.map(animation => animation.finished));
  } catch (error) {
    if (!skipped) console.warn('Portfolio intro could not play.', error);
  } finally {
    board.classList.remove('is-hanging');
    for (const animation of animations) animation.cancel();
    for (const object of objects.values()) object.style.removeProperty('--hang-rise');
    startup.hidden = true;
    shell.inert = false;
    skip.removeEventListener('click', skipStartup);
    reducedMotion.removeEventListener('change', skipStartup);
    if (skipped && !getRoute()) directoryLinks.get('works').focus({ preventScroll: true });
  }
}

function selectPaper(tab) {
  const stack = tab.closest('[data-paper-stack]');
  if (tab.getAttribute('aria-pressed') === 'true') return;
  for (const button of stack.querySelectorAll('[data-paper-tab]')) {
    button.setAttribute('aria-pressed', String(button === tab));
  }
  for (const page of stack.querySelectorAll('[data-paper-leaf]')) {
    for (const effect of page.getAnimations()) effect.cancel();
    page.hidden = page.dataset.paperLeaf !== tab.dataset.paperTab;
    if (!page.hidden && !reducedMotion.matches) {
      const effect = animate(page, [
        { transform: 'translate(14px, 8px)', opacity: .44 },
        { transform: 'none', opacity: 1 }
      ], 380);
      effect.finished.then(() => effect.cancel(), () => {});
    }
  }
}

function updateBackButton() {
  backLink.hidden = !activeBook && !backToSkills;
  backLink.textContent = translate(backToSkills ? '← 返回技能' : '← 收回书本');
}

function foldBook(book, restoreFocus = false, motion = true) {
  const volume = book.closest('.book-volume');
  const front = volume.querySelector('.book-front');
  front.querySelector('video')?.pause();
  front.inert = true;
  book.setAttribute('aria-expanded', 'false');
  book.tabIndex = 0;
  const finish = () => {
    if (book === activeBook) return;
    volume.classList.remove('is-open', 'is-closing');
    if (restoreFocus && reader.open && !closing && !activeBook) book.focus({ preventScroll: true });
  };

  if (!motion || reducedMotion.matches) {
    finish();
  } else {
    volume.classList.add('is-closing');
    const folding = volume.getAnimations().find(effect => effect.animationName === 'volume-fold');
    if (folding) folding.finished.then(finish, () => {});
    else finish();
  }
}

function showBook(book) {
  if (book === activeBook) return;
  const previousBook = activeBook;
  activeBook = book;
  if (previousBook) foldBook(previousBook);
  const volume = book.closest('.book-volume');
  const front = volume.querySelector('.book-front');
  const project = book.dataset.project;
  if (!front.firstChild) {
    const template = document.querySelector('#view-' + project);
    const cover = projectCovers.content.querySelector('[data-cover="' + project + '"]');
    front.append(template.content.cloneNode(true));
    front.querySelector('.case-cover').append(cover.cloneNode(true));
    localizeTree(front);
    const video = front.querySelector('.case-film-player');
    if (video) {
      video.addEventListener('error', () => { front.querySelector('.case-film-error').hidden = false; });
    }
  }
  volume.classList.remove('is-closing');
  volume.classList.add('is-open');
  front.scrollTop = 0;
  front.inert = false;
  updateBackButton();
  book.setAttribute('aria-expanded', 'true');
  book.tabIndex = -1;
  front.querySelector('.project-title').focus({ preventScroll: true });
}

function filterBooks(filter) {
  const group = filter.dataset.workFilter;
  for (const button of content.querySelectorAll('[data-work-filter]')) {
    button.setAttribute('aria-pressed', String(button === filter));
  }
  if (activeBook && group !== 'all' && activeBook.closest('.book-volume').dataset.workGroup !== group) {
    const book = activeBook;
    activeBook = undefined;
    foldBook(book, false, false);
  }
  for (const volume of content.querySelectorAll('[data-work-group]')) {
    volume.hidden = group !== 'all' && volume.dataset.workGroup !== group;
  }
  updateBackButton();
}

function initSkillGallery() {
  const rail = content.querySelector('.skill-rail');
  const options = [...rail.querySelectorAll('.skill-option')];
  const summary = content.querySelector('.skill-summary');
  const prev = content.querySelector('.skill-prev');
  const next = content.querySelector('.skill-next');
  const evidence = content.querySelector('.skill-evidence');
  let selected = -1;
  let gesture;
  let settleTimer;
  let ignoreClickUntil = 0;
  let wheelAnchor;

  refreshSelectedSkill = () => {
    if (selected < 0) return;
    summary.querySelector('strong').textContent = options[selected].querySelector('.skill-name').textContent;
    summary.querySelector('p').textContent = options[selected].dataset.description;
  };

  function select(index) {
    if (index === selected) return;
    selected = index;
    selectedSkill = index;
    options.forEach((option, position) => option.setAttribute('aria-pressed', String(position === index)));
    refreshSelectedSkill();
    prev.disabled = index === 0;
    next.disabled = index === options.length - 1;
    evidence.dataset.evidenceTarget = options[index].dataset.evidence;
  }

  function position(index) {
    return options[index].offsetLeft - options[0].offsetLeft;
  }

  function nearest() {
    return options.reduce((best, _, index) => {
      const offset = position(index) - rail.scrollLeft;
      return Math.abs(offset) < Math.abs(position(best) - rail.scrollLeft) ? index : best;
    }, 0);
  }

  function go(index, smooth = true) {
    index = clamp(index, 0, options.length - 1);
    select(index);
    rail.scrollTo({ left: position(index), behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant' });
  }

  function finishSlide() {
    clearTimeout(settleTimer);
    let index = nearest();
    if (index === wheelAnchor) {
      const offset = rail.scrollLeft - position(index);
      if (Math.abs(offset) >= 18) index += Math.sign(offset);
    }
    wheelAnchor = undefined;
    rail.classList.remove('is-sliding');
    go(index);
  }

  rail.addEventListener('scroll', () => {
    if (wheelAnchor !== undefined || gesture?.dragging) return;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      if (rail.isConnected) select(nearest());
    }, 125);
  }, { passive: true });

  rail.addEventListener('wheel', event => {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    event.preventDefault();
    wheelAnchor ??= nearest();
    rail.classList.add('is-sliding');
    rail.scrollLeft += event.deltaY * (event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? rail.clientWidth : 1);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => { if (rail.isConnected) finishSlide(); }, 135);
  }, { passive: false });

  rail.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    gesture = { id: event.pointerId, x: event.clientX, left: rail.scrollLeft, dragging: false };
  });

  rail.addEventListener('pointermove', event => {
    if (gesture?.id !== event.pointerId) return;
    const offset = event.clientX - gesture.x;
    if (!gesture.dragging && Math.abs(offset) < 6) return;
    if (!gesture.dragging) {
      gesture.dragging = true;
      wheelAnchor = undefined;
      clearTimeout(settleTimer);
      rail.classList.add('is-sliding');
      rail.setPointerCapture(event.pointerId);
    }
    rail.scrollLeft = gesture.left - offset;
  });

  function release(event) {
    if (gesture?.id !== event.pointerId) return;
    const { dragging } = gesture;
    gesture = undefined;
    if (!dragging || !rail.isConnected) return;
    ignoreClickUntil = performance.now() + 120;
    finishSlide();
  }
  rail.addEventListener('pointerup', release);
  rail.addEventListener('pointercancel', release);
  rail.addEventListener('lostpointercapture', release);
  rail.addEventListener('pointerleave', () => { if (!gesture?.dragging) gesture = undefined; });

  rail.addEventListener('click', event => {
    const option = event.target.closest('.skill-option');
    if (option && (!event.detail || performance.now() >= ignoreClickUntil)) go(options.indexOf(option));
  });
  rail.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    go(selected + (event.key === 'ArrowLeft' ? -1 : 1));
    options[selected].focus({ preventScroll: true });
  });
  prev.addEventListener('click', () => go(selected - 1));
  next.addEventListener('click', () => go(selected + 1));
  go(selectedSkill, false);
}

function getRoute() {
  const hash = location.hash.slice(1);
  if (hash === 'index') return 'skills';
  if (hash === 'notes') return 'about';
  return routes.has(hash) ? hash : '';
}

function mountReader(view, project) {
  reader.dataset.view = view;
  carrier.dataset.material = view;
  activeBook = undefined;
  refreshSelectedSkill = undefined;
  content.querySelector('video')?.pause();
  content.replaceChildren(document.querySelector('#view-' + view).content.cloneNode(true));
  localizeTree(content);
  sheet.scrollTop = 0;
  if (!reader.open) reader.showModal();
  if (view === 'skills') initSkillGallery();
  updateBackButton();

  if (project) {
    showBook(content.querySelector('[data-project="' + project + '"]'));
  } else {
    content.querySelector('#reader-title').focus({ preventScroll: true });
  }
}

function trackOpening(effects) {
  openingEffects = effects;
  Promise.allSettled(effects.map(effect => effect.finished)).then(() => {
    effects.forEach(effect => effect.cancel());
    if (openingEffects === effects) openingEffects = [];
  });
}

function switchReader(view, project) {
  openingEffects.forEach(effect => effect.cancel());
  mountReader(view, project);
  if (!reducedMotion.matches) {
    trackOpening([animate(sheet, [{ opacity: .3, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'none' }], 300)]);
  }
}

function openReader(view, trigger, project) {
  if (reader.open) return;
  opener = trigger ?? objects.get(view);
  backToSkills = false;
  mountReader(view, project);

  if (!reducedMotion.matches) {
    const latch = objects.get(view).querySelector(view === 'letters' ? '.envelope-flap' : view === 'works' ? '.clip' : '.surface');
    const start = getComputedStyle(latch).transform;
    const transform = start === 'none' ? '' : start;
    const angle = view === 'letters' ? ' rotateX(-65deg)' : view === 'works' ? ' rotateX(-42deg)' : ' rotateY(-13deg)';
    trackOpening([
      animate(latch, [{ transform: start }, { transform: transform + angle }], 170),
      animate(sheet, [{ transform: 'translateY(16px) scale(.97)', opacity: 0 },
        { transform: 'none', opacity: 1 }], 400, 55),
      animate(carrier, [{ transform: carrierOffsets[view], opacity: .18 },
        { transform: 'none', opacity: 1 }], 455, 95)
    ]);
  }
}

async function closeReader() {
  if (!reader.open || closing) return;
  closing = true;
  content.inert = true;
  content.querySelector('video')?.pause();
  reader.classList.add('is-closing');
  const style = getComputedStyle(sheet);
  const opacity = style.opacity;
  const transform = style.transform;
  openingEffects.forEach(effect => effect.cancel());
  openingEffects = [];
  if (!reducedMotion.matches) {
    const exit = animate(sheet, [
      { transform, opacity },
      { transform: 'translateY(12px) scale(.97)', opacity: 0 }
    ], 360);
    await exit.finished;
    reader.close();
    exit.cancel();
  } else {
    reader.close();
  }
  reader.classList.remove('is-closing');
  content.replaceChildren();
  refreshSelectedSkill = undefined;
  content.inert = false;
  activeBook = undefined;
  closing = false;
  opener?.focus({ preventScroll: true });
  opener = undefined;
}

for (const [route, link] of directoryLinks) {
  link.addEventListener('click', event => {
    event.preventDefault();
    openReader(route, link);
  });
}

document.querySelectorAll('[data-open-project]').forEach(shortcut => {
  shortcut.addEventListener('click', () => openReader('works', shortcut, shortcut.dataset.openProject));
});

content.addEventListener('click', event => {
  const tab = event.target.closest('[data-paper-tab]');
  if (tab) selectPaper(tab);
  const book = event.target.closest('.book-link');
  if (book) showBook(book);
  const filter = event.target.closest('[data-work-filter]');
  if (filter) filterBooks(filter);
  const evidence = event.target.closest('[data-evidence-target]');
  if (evidence && !closing) {
    const target = evidence.dataset.evidenceTarget;
    backToSkills = true;
    if (target === 'research') switchReader('letters');
    else if (projectRoutes.has(target)) switchReader('works', target);
  }
});

backLink.addEventListener('click', () => {
  if (closing) return;
  if (backToSkills) {
    backToSkills = false;
    switchReader('skills');
    return;
  }
  if (!activeBook) return;
  const book = activeBook;
  activeBook = undefined;
  updateBackButton();
  foldBook(book, true);
});

reader.querySelector('.reader-close').addEventListener('click', closeReader);
reader.addEventListener('cancel', event => {
  event.preventDefault();
  closeReader();
});
reader.addEventListener('click', event => { if (event.target === reader) closeReader(); });

function initRecordPlayer() {
  const player = document.querySelector('.record-player');
  const audio = player.querySelector('audio');
  const toggle = player.querySelector('.record-toggle');
  const volume = player.querySelector('#record-volume');
  const level = player.querySelector('output');
  const error = player.querySelector('.record-error');

  function showPlaying(playing) {
    player.dataset.playing = String(playing);
    toggle.setAttribute('aria-pressed', String(playing));
  }

  function updateVolume() {
    audio.volume = volume.valueAsNumber / 100;
    level.value = volume.value + '%';
  }

  function showError() {
    error.hidden = false;
    showPlaying(false);
  }

  toggle.addEventListener('click', () => {
    if (!audio.paused) {
      audio.pause();
      return;
    }
    error.hidden = true;
    audio.play().catch(reason => { if (reason.name !== 'AbortError') showError(); });
  });
  audio.addEventListener('playing', () => showPlaying(true));
  audio.addEventListener('pause', () => showPlaying(false));
  audio.addEventListener('ended', () => showPlaying(false));
  audio.addEventListener('error', showError);
  volume.addEventListener('input', updateVolume);
  updateVolume();

  content.addEventListener('play', event => {
    if (event.target instanceof HTMLVideoElement) audio.pause();
  }, { capture: true });
}

let savedLanguage;
try { savedLanguage = localStorage.getItem(languageStorageKey); } catch { /* Use Simplified Chinese when storage is unavailable. */ }
applyLanguage(savedLanguage);
languageSelectors.forEach(selector => selector.addEventListener('change', () => applyLanguage(selector.value)));
initRecordPlayer();
window.portfolioTranslate = translate;
window.portfolioRoom.start({ bypass: Boolean(getRoute()) }).then(() => {
  const route = getRoute();
  if (projectRoutes.has(route)) openReader('works', undefined, route);
  else if (route) openReader(route);
});
