(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const assetBase = new URL('assets/', base).href;
  const styleUrl = new URL('styles.css', base).href;
  const markup = `  <header class="site-header">
    <div class="wrap header-inner">
      <button class="brand" type="button" data-page="explore" aria-label="KeyCamp 首页"><span class="brand-symbol" aria-hidden="true"></span><span>Key<span>Camp</span></span></button>
      <nav class="nav" aria-label="主导航">
        <button type="button" data-page="explore" aria-current="page">探索</button>
        <button type="button" data-page="community">社区</button>
        <button type="button" data-page="orders">订单</button>
      </nav>
      <div class="header-actions">
        <button class="text-button guide-button" type="button" data-action="guide">演示路径</button>
        <button class="cart-button" type="button" data-action="cart">购物车 <span id="cart-count">0</span></button>
      </div>
    </div>
  </header>

  <section id="main" class="wrap" tabindex="-1"></section>

  <footer class="site-footer wrap">
    <div><strong>KeyCamp</strong><p>大学生创业竞赛项目 · CDKEY 交互原型</p></div>
    <div class="footer-actions"><span>商品、报价与交易均为演示数据</span><button type="button" class="text-button" data-action="reset">重置演示</button></div>
  </footer>


  <section id="layer" aria-labelledby="dialog-title" hidden>
    <div class="dialog-shell">
      <button class="close-dialog" type="button" data-action="close" aria-label="返回演示列表">‹</button>
      <div id="dialog-content"></div>
    </div>
  </section>
  <div id="toast" class="toast" role="status" hidden></div>`;

const games = [
  { id: 'ember', title: '余烬边境', english: 'Ember Frontier', category: '动作冒险', platform: 'Steam', image: 'ember.webp', original: 128, summary: '在被植被重新占领的工业城市中搜集物资、解锁新路线，循着信标寻找最后一座避难所。', offers: [
    { id: 'camp', store: '校友补给站', price: 49, region: '中国区', delivery: '即时发码' },
    { id: 'orbit', store: '轨道密钥铺', price: 56, region: '全球区', delivery: '即时发码' },
    { id: 'level', store: '升级商店', price: 62, region: '中国区', delivery: '预计 10 分钟' }
  ] },
  { id: 'orbit', title: '星环协议', english: 'Orbit Protocol', category: '策略模拟', platform: 'Steam', image: 'orbit.webp', original: 98, summary: '接管失去联系的轨道站，在资源有限的情况下修复舱段、协商航线，并决定空间站的下一站。', offers: [
    { id: 'orbit', store: '轨道密钥铺', price: 39, region: '全球区', delivery: '即时发码' },
    { id: 'level', store: '升级商店', price: 46, region: '中国区', delivery: '预计 10 分钟' }
  ] },
  { id: 'farm', title: '像素牧场', english: 'Pixel Pastures', category: '休闲建造', platform: 'Steam', image: 'farm.webp', original: 68, summary: '整理一块临河的旧农场，种花、钓鱼，与邻居交换种子。支持社区分享的外观类 MOD。', offers: [
    { id: 'camp', store: '校友补给站', price: 25, region: '中国区', delivery: '即时发码' },
    { id: 'orbit', store: '轨道密钥铺', price: 32, region: '全球区', delivery: '即时发码' }
  ] },
  { id: 'neon', title: '霓虹追迹', english: 'Neon Pursuit', category: '竞速', platform: 'Epic', image: 'neon.webp', original: 158, summary: '在雨夜的地下赛道中调校赛车，穿过高架、隧道和废弃工厂，争取下一站的入场券。', offers: [
    { id: 'level', store: '升级商店', price: 72, region: '中国区', delivery: '预计 10 分钟' },
    { id: 'orbit', store: '轨道密钥铺', price: 79, region: '全球区', delivery: '即时发码' }
  ] },
  { id: 'mist', title: '迷雾旅店', english: 'Mistside Inn', category: '动作冒险', platform: 'Epic', image: 'mist.webp', original: 76, summary: '一家湖畔旅店只在起雾时开放。整理客人的线索、还原他们的来路，逐间调查锁住的客房。', offers: [
    { id: 'orbit', store: '轨道密钥铺', price: 34, region: '全球区', delivery: '即时发码' },
    { id: 'camp', store: '校友补给站', price: 42, region: '中国区', delivery: '即时发码' }
  ] },
  { id: 'peak', title: '雪线同行', english: 'Above the Snowline', category: '休闲建造', platform: 'Steam', image: 'peak.webp', original: 88, summary: '和伙伴从山谷出发，搭建营地、规划补给，与变化的天气赛跑，在天黑前抵达安全点。', offers: [
    { id: 'camp', store: '校友补给站', price: 36, region: '中国区', delivery: '即时发码' },
    { id: 'level', store: '升级商店', price: 43, region: '全球区', delivery: '预计 10 分钟' }
  ] }
];

const threads = [
  { id: 'mods', tag: 'MOD', initials: '禾', tone: 'mint', title: '《像素牧场》第一次装 MOD，从这三个地方开始', author: '禾苗同学', game: 'farm', body: '先用一个独立存档试装外观类 MOD，确认游戏平台和当前游戏版本都匹配，再逐步加入功能类 MOD。保留原存档，出了问题可以快速回到原版。', likes: 12, replies: [{ author: '晚风', text: '先建独立存档这个提醒很实用，也方便比较装前装后的区别。' }] },
  { id: 'deals', tag: '优惠心得', initials: '星', tone: 'blue', title: '《余烬边境》有多个报价，便宜时也记得看激活区', author: '星图绘制员', game: 'ember', body: '比较报价时先确认平台和激活地区，再看最后的价格。遇到定位不清楚的版本，我会优先选地区写得清楚的报价。', likes: 8, replies: [{ author: '北门', text: '平台不一样也要留意，有些人会把 Epic 码当成 Steam 码。' }] },
  { id: 'coop', tag: '联机交流', initials: '北', tone: 'rose', title: '《雪线同行》双人开荒，想找周末一起玩的同学', author: '北门', game: 'peak', body: '准备从最短的路线开始，计划在第一个营地尝试分工：一个人标路线，一个人管理补给。欢迎分享你们的开荒分工。', likes: 6, replies: [] }
];

function mountKeyCamp(root) {
const main = root.querySelector('#main');
const dialog = root.querySelector('#layer');
const dialogContent = root.querySelector('#dialog-content');
const cartCount = root.querySelector('#cart-count');
const toast = root.querySelector('#toast');
const storageKey = 'keycamp-demo-v1';
const catalogDefaults = { query: '', category: '全部游戏', platform: '全部平台', sort: 'recommended', savedOnly: false };
const filters = { ...catalogDefaults };
const categories = ['全部游戏', ...new Set(games.map(game => game.category))];
const platforms = ['全部平台', ...new Set(games.map(game => game.platform))];
const threadTags = ['全部', ...new Set(threads.map(thread => thread.tag))];
const money = price => '¥' + price.toFixed(2);
const titleOf = id => games.find(game => game.id === id);
const threadOf = id => threads.find(thread => thread.id === id);
const state = loadState();
let page = 'explore';
let topic = '全部';
let layer;
let dialogStarter;
let toastTimer;

function loadState() {
  try {
    const previous = JSON.parse(localStorage.getItem(storageKey));
    if (previous && Array.isArray(previous.cart) && Array.isArray(previous.orders) &&
      Array.isArray(previous.saved) && Array.isArray(previous.likes) && previous.replies && typeof previous.replies === 'object') return previous;
  } catch { /* Local storage is optional in this prototype. */ }
  return { cart: [], orders: [], saved: [], likes: [], replies: {} };
}

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Keep the demo usable in memory. */ }
  cartCount.textContent = String(state.cart.length);
}

function escapeText(text) {
  return String(text).replace(/[&<>"']/g, character =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function cheapest(game) {
  return game.offers.reduce((best, offer) => offer.price < best.price ? offer : best);
}

function discount(game) {
  return 1 - cheapest(game).price / game.original;
}

function browserScroll() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
}

function catalogView() {
  return `
    <section class="hero" aria-labelledby="hero-title">
      <img class="hero-image" src="${assetBase}ember.webp" alt="">
      <div class="hero-copy">
        <p class="eyebrow">校园 CDKEY 游戏集市</p>
        <h1 id="hero-title">好游戏，<br><em>低价入手。</em></h1>
        <p>比较不同商家的价格、平台与激活区，再决定从哪一家入手。</p>
        <div class="hero-actions">
          <button class="primary" type="button" data-action="catalog">探索游戏 <span aria-hidden="true">↓</span></button>
          <button class="secondary" type="button" data-action="game" data-id="ember">查看余烬边境 <span aria-hidden="true">↗</span></button>
        </div>
      </div>
      <span class="hero-label">余烬边境 · ¥49.00 起</span>
    </section>
    <section id="catalog" aria-labelledby="catalog-title">
      <div class="section-heading"><div><h2 id="catalog-title" tabindex="-1">探索游戏</h2><p>从平台、玩法或价格出发，找到想玩的游戏。</p></div></div>
      <div class="catalog-controls">
        <label class="field search-field"><span aria-hidden="true">⌕</span><input id="query" type="search" placeholder="搜索游戏名，支持中英文" aria-label="搜索游戏名" value="${escapeText(filters.query)}"></label>
        <label class="field">平台 <select id="platform">${platforms.map(name => `<option${filters.platform === name ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
        <label class="field">排序 <select id="sort">
          <option value="recommended"${filters.sort === 'recommended' ? ' selected' : ''}>默认推荐</option>
          <option value="price"${filters.sort === 'price' ? ' selected' : ''}>价格从低到高</option>
          <option value="discount"${filters.sort === 'discount' ? ' selected' : ''}>折扣从高到低</option>
        </select></label>
      </div>
      <div class="filter-row">
        <div class="chips" aria-label="游戏类型">
          ${categories.map(name => `<button class="chip" type="button" data-action="category" data-id="${name}" aria-pressed="${filters.category === name}">${name}</button>`).join('')}
          <button class="chip" type="button" data-action="saved-filter" aria-pressed="${filters.savedOnly}">仅看已关注</button>
        </div>
        <span id="results-count" role="status"></span>
      </div>
      <div id="catalog-results"></div>
    </section>`;
}

function renderCatalog() {
  const target = root.querySelector('#catalog-results');
  if (!target) return;
  const query = filters.query.trim().toLowerCase();
  const results = games.filter(game =>
    (!query || `${game.title} ${game.english}`.toLowerCase().includes(query)) &&
    (filters.category === categories[0] || game.category === filters.category) &&
    (filters.platform === platforms[0] || game.platform === filters.platform) &&
    (!filters.savedOnly || state.saved.includes(game.id)));
  if (filters.sort === 'price') results.sort((a, b) => cheapest(a).price - cheapest(b).price);
  if (filters.sort === 'discount') results.sort((a, b) => discount(b) - discount(a));
  root.querySelector('#results-count').textContent = `共 ${results.length} 款游戏`;
  target.innerHTML = results.length ? `<div class="cards">${results.map(gameCard).join('')}</div>` :
    '<div class="empty">没有符合当前筛选的游戏。<br><button type="button" class="secondary mini-button" data-action="clear">清空筛选</button></div>';
}

function gameCard(game) {
  const saved = state.saved.includes(game.id);
  return `<article class="game-card">
    <img src="${assetBase}${game.image}" alt="">
    <button class="favorite" type="button" data-action="favorite" data-id="${game.id}" aria-label="关注${game.title}" aria-pressed="${saved}">${saved ? '♥' : '♡'}</button>
    <div class="game-body">
      <div class="game-meta"><span>${game.platform}</span><span>${game.category}</span></div>
      <h3>${game.title}</h3>
      <p class="game-seller">${game.offers.length} 家演示商家 · 较参考价省 ${Math.round(discount(game) * 100)}%</p>
      <div class="game-bottom">
        <div class="prices"><strong>${money(cheapest(game).price)}</strong><del>${money(game.original)}</del></div>
        <button type="button" class="secondary mini-button" data-action="game" data-id="${game.id}">比价 <span aria-hidden="true">↗</span></button>
      </div>
    </div>
  </article>`;
}

function replyCount(thread) {
  return thread.replies.length + (state.replies[thread.id] || []).length;
}

function communityView() {
  const matches = threads.filter(thread => topic === threadTags[0] || topic === thread.tag);
  return `<header class="page-heading"><h1>玩家社区</h1><p>讨论折扣、交流 MOD，或找同学一起玩。</p></header>
    <div class="chips" aria-label="讨论分类">${threadTags.map(tag => `<button class="chip" type="button" data-action="topic" data-id="${tag}" aria-pressed="${topic === tag}">${tag}</button>`).join('')}</div>
    <section class="thread-list" aria-label="讨论列表">${matches.map(thread => `<article class="thread-card">
      <span class="avatar ${thread.tone}" aria-hidden="true">${thread.initials}</span>
      <div><span class="thread-tag">${thread.tag}</span><h2>${thread.title}</h2><p>${thread.author} · ${replyCount(thread)} 条留言</p></div>
      <button type="button" class="secondary mini-button" data-action="post" data-id="${thread.id}">查看讨论 ↗</button>
    </article>`).join('')}</section>`;
}

function ordersView() {
  return `<header class="page-heading"><h1>我的订单</h1><p>这里显示当前浏览器生成的演示订单。</p></header>${
    state.orders.length ? `<section class="order-list" aria-label="订单列表">${state.orders.map(order => `
      <article class="order-card"><div><h2>${order.id}</h2><p>${order.items.map(item => item.title).join('、')} · ${money(order.total)}</p></div><div class="order-actions"><span class="status-label">已生成</span><button type="button" class="secondary mini-button" data-action="order" data-id="${order.id}">查看</button></div></article>`).join('')}</section>` :
      '<div class="empty">还没有演示订单。<br><button class="secondary mini-button" type="button" data-page="explore">逛逛游戏</button></div>'}`;
}

function renderMain() {
  main.innerHTML = page === 'explore' ? catalogView() : page === 'community' ? communityView() : ordersView();
  for (const link of root.querySelectorAll('.nav [data-page]')) {
    if (link.dataset.page === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (page === 'explore') renderCatalog();
}

function setPage(next) {
  if (!dialog.hidden) {
    dialogStarter = null;
    closePanel();
  }
  page = next;
  renderMain();
  main.focus({ preventScroll: true });
}

function stepper(current) {
  return `<div class="stepper" aria-label="订单步骤">${['购物车', '确认订单', '激活码'].map((name, i) =>
    `<span${current === i ? ' aria-current="step"' : ''}>${i + 1}. ${name}</span>`).join('<span aria-hidden="true">›</span>')}</div>`;
}

function dialogHeader(title, description = '', label = '') {
  return `<header class="dialog-header">${label ? `<p class="eyebrow">${label}</p>` : ''}<h2 id="dialog-title" tabindex="-1">${title}</h2>${description ? `<p>${description}</p>` : ''}</header>`;
}

function gameView(game) {
  return `${dialogHeader(game.title, game.summary, `${game.platform} / ${game.category}`)}
    <img class="dialog-image" src="${assetBase}${game.image}" alt="">
    <fieldset class="offers"><legend>比较商家报价</legend>
      ${game.offers.map(offer => `<label class="offer">
        <input type="radio" name="offer" value="${offer.id}"${layer.offer === offer.id ? ' checked' : ''}>
        <span><b>${offer.store}</b><small>${offer.region} · ${offer.delivery}</small></span><strong>${money(offer.price)}</strong>
      </label>`).join('')}
    </fieldset>
    <div class="dialog-actions">
      <button class="secondary" type="button" data-action="cart">打开购物车</button>
      <button class="primary" type="button" data-action="add">加入购物车</button>
    </div><p class="inline-toast" role="status" hidden></p>`;
}

function lineItems(items, removable = false) {
  return `<ul class="line-items">${items.map(item => `<li>
    <div><strong>${item.title}</strong><small>${item.platform} · ${item.region} · ${item.store}</small></div>
    <div class="item-actions"><b>${money(item.price)}</b>${removable ? `<button type="button" data-action="remove" data-id="${item.id}" aria-label="移除${item.title}">移除</button>` : ''}</div>
  </li>`).join('')}</ul>`;
}

function total(items) {
  return items.reduce((amount, item) => amount + item.price, 0);
}

function cartView() {
  if (!state.cart.length) return dialogHeader('购物车') + '<div class="empty">购物车还是空的。先选一款游戏，再比较商家报价。</div><div class="dialog-actions"><button type="button" class="primary" data-page="explore">探索游戏</button></div>';
  return `${dialogHeader('购物车')}${stepper(0)}${lineItems(state.cart, true)}
    <div class="total"><span>合计</span><strong>${money(total(state.cart))}</strong></div>
    <div class="dialog-actions"><button type="button" class="secondary" data-action="close">继续选购</button><button type="button" class="primary" data-action="checkout">去结算 ↗</button></div>`;
}

function checkoutView() {
  return `${dialogHeader('确认演示订单')}${stepper(1)}${lineItems(state.cart)}
    <div class="total"><span>演示金额</span><strong>${money(total(state.cart))}</strong></div>
    <p class="notice">这是模拟交易。提交后会生成演示订单和占位激活码，无需填写资料或支付。</p>
    <div class="dialog-actions"><button type="button" class="secondary" data-action="cart">返回购物车</button><button type="button" class="primary" data-action="submit-order">生成模拟订单</button></div>`;
}

function orderView(order) {
  return `${dialogHeader('演示订单已生成', order.id)}${stepper(2)}
    <ul class="line-items">${order.items.map((item, index) => `<li><div>
      <strong>${item.title}</strong><small>${item.platform} · ${item.region}</small>
      <div class="order-code"><code>${item.code}</code><button type="button" class="secondary mini-button" data-action="copy" data-id="${index}">复制</button></div>
    </div><b>${money(item.price)}</b></li>`).join('')}</ul>
    <p class="notice">以上激活码仅用于展示交付流程。</p>
    <div class="dialog-actions"><button type="button" class="primary" data-page="orders">查看我的订单</button></div>
    <p class="inline-toast" role="status" hidden></p>`;
}

function threadView(thread) {
  const likes = thread.likes + Number(state.likes.includes(thread.id));
  const replies = [...thread.replies, ...(state.replies[thread.id] || [])];
  return `${dialogHeader(thread.title, thread.author, thread.tag)}
    <p class="thread-body">${thread.body}</p>
    <div class="chips">
      <button type="button" class="chip" data-action="like" data-id="${thread.id}" aria-pressed="${state.likes.includes(thread.id)}">点赞 ${likes}</button>
      <button type="button" class="chip" data-action="game" data-id="${thread.game}">查看相关游戏 ↗</button>
    </div>
    <div class="replies"><strong>留言 · ${replies.length}</strong>${replies.map(reply =>
      `<div class="reply"><strong>${escapeText(reply.author)}</strong><p>${escapeText(reply.text)}</p></div>`).join('')}</div>
    <form class="comment-form">
      <label for="reply-text">发表留言</label>
      <textarea id="reply-text" name="reply" maxlength="200" required placeholder="说说你的体验（200 字以内）"></textarea>
      <button class="primary mini-button" type="submit">发布留言</button>
    </form>`;
}

function guideView() {
  return `${dialogHeader('演示路径', '沿着一次买游戏的流程，试试每个页面。')}
    <ol class="guide-steps">
      <li>在探索页筛选平台或游戏类型，打开一款游戏的比价页。</li>
      <li>对比商家、价格和激活区，选择报价加入购物车。</li>
      <li>结算并生成演示订单，在订单详情查看占位激活码。</li>
      <li>到社区打开一条讨论，试试点赞、留言和跳转相关游戏。</li>
    </ol>
    <div class="dialog-actions"><button type="button" class="secondary" data-page="community">体验社区</button><button type="button" class="primary" data-action="game" data-id="ember">开始比价</button></div>`;
}

function renderLayer(focus = true) {
  switch (layer.name) {
    case 'game': dialogContent.innerHTML = gameView(titleOf(layer.id)); break;
    case 'cart': dialogContent.innerHTML = cartView(); break;
    case 'checkout': dialogContent.innerHTML = checkoutView(); break;
    case 'order': dialogContent.innerHTML = orderView(state.orders.find(order => order.id === layer.id)); break;
    case 'post': dialogContent.innerHTML = threadView(threadOf(layer.id)); break;
    case 'guide': dialogContent.innerHTML = guideView(); break;
    case 'reset': dialogContent.innerHTML = dialogHeader('重置演示？', '将清空当前浏览器中的购物车、订单、关注和留言。') +
      '<div class="dialog-actions"><button class="secondary" type="button" data-action="close">取消</button><button class="primary" type="button" data-action="confirm-reset">重置</button></div>'; break;
  }
  if (focus) {
    dialogContent.querySelector('#dialog-title').focus();
  }
}

function openLayer(name, id, trigger) {
  layer = { name, id, offer: name === 'game' ? cheapest(titleOf(id)).id : null };
  if (dialog.hidden) {
    dialogStarter = trigger;
    renderLayer(false);
    dialog.hidden = false;
    main.hidden = true;
    dialogContent.querySelector('#dialog-title').focus();
  } else renderLayer();
}

function flash(message) {
  const inline = !dialog.hidden ? dialogContent.querySelector('.inline-toast') : null;
  if (inline) {
    inline.textContent = message;
    inline.hidden = false;
  } else {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2400);
  }
}

function addToCart() {
  const game = titleOf(layer.id);
  const offer = game.offers.find(entry => entry.id === layer.offer);
  const item = { id: game.id, title: game.title, platform: game.platform, store: offer.store, region: offer.region, price: offer.price };
  const index = state.cart.findIndex(existing => existing.id === game.id);
  if (index < 0) state.cart.push(item);
  else state.cart[index] = item;
  persist();
  flash(index < 0 ? '已加入购物车。' : '已更新购物车中的报价。');
}

function submitOrder() {
  if (!state.cart.length) return;
  const sequence = String(state.orders.length + 1).padStart(4, '0');
  const order = {
    id: 'KC-' + sequence,
    total: total(state.cart),
    items: state.cart.map((item, index) => ({ ...item, code: `DEMO-${sequence}-${String(index + 1).padStart(2, '0')}` }))
  };
  state.orders.unshift(order);
  state.cart = [];
  persist();
  if (page === 'orders') renderMain();
  openLayer('order', order.id);
}

function toggle(items, id) {
  const index = items.indexOf(id);
  if (index < 0) { items.push(id); return true; }
  items.splice(index, 1);
  return false;
}

const actions = {
  catalog() {
    root.querySelector('#catalog-title').focus({ preventScroll: true });
    root.querySelector('#catalog').scrollIntoView({ behavior: browserScroll(), block: 'start' });
  },
  category(button) {
    filters.category = button.dataset.id;
    for (const chip of root.querySelectorAll('[data-action="category"]')) chip.setAttribute('aria-pressed', String(chip === button));
    renderCatalog();
  },
  'saved-filter'(button) {
    filters.savedOnly = !filters.savedOnly;
    button.setAttribute('aria-pressed', String(filters.savedOnly));
    renderCatalog();
  },
  clear() { Object.assign(filters, catalogDefaults); renderMain(); root.querySelector('#query').focus(); },
  favorite(button) {
    const saved = toggle(state.saved, button.dataset.id);
    persist();
    if (filters.savedOnly) { renderCatalog(); root.querySelector('[data-action="saved-filter"]').focus(); }
    else { button.setAttribute('aria-pressed', String(saved)); button.textContent = saved ? '♥' : '♡'; }
    flash(saved ? '已加入关注。' : '已取消关注。');
  },
  game(button) { openLayer('game', button.dataset.id, button); },
  cart(button) { openLayer('cart', null, button); },
  guide(button) { openLayer('guide', null, button); },
  reset(button) { openLayer('reset', null, button); },
  post(button) { openLayer('post', button.dataset.id, button); },
  order(button) { openLayer('order', button.dataset.id, button); },
  close() { closePanel(); },
  add: addToCart,
  remove(button) {
    state.cart = state.cart.filter(item => item.id !== button.dataset.id);
    persist();
    renderLayer();
  },
  checkout() { if (state.cart.length) openLayer('checkout'); },
  'submit-order': submitOrder,
  async copy(button) {
    const order = state.orders.find(item => item.id === layer.id);
    try { await navigator.clipboard.writeText(order.items[Number(button.dataset.id)].code); flash('已复制演示激活码。'); }
    catch { flash('无法自动复制，可以选中激活码手动复制。'); }
  },
  topic(button) { topic = button.dataset.id; renderMain(); [...root.querySelectorAll('[data-action="topic"]')].find(chip => chip.dataset.id === topic)?.focus(); },
  like(button) {
    const liked = toggle(state.likes, button.dataset.id);
    persist();
    button.setAttribute('aria-pressed', String(liked));
    button.textContent = '点赞 ' + (threadOf(button.dataset.id).likes + Number(liked));
  },
  'confirm-reset'() {
    Object.assign(state, { cart: [], orders: [], saved: [], likes: [], replies: {} });
    Object.assign(filters, catalogDefaults);
    topic = '全部';
    persist();
    setPage('explore');
    flash('演示已重置。');
  }
};

root.addEventListener('click', event => {
  const button = event.target.closest('button[data-page], button[data-action]');
  if (!button) return;
  if (button.dataset.page) setPage(button.dataset.page);
  else actions[button.dataset.action]?.(button);
});
root.addEventListener('input', event => {
  if (event.target.id !== 'query') return;
  filters.query = event.target.value;
  renderCatalog();
});
root.addEventListener('change', event => {
  const target = event.target;
  if (target.id === 'platform' || target.id === 'sort') {
    filters[target.id] = target.value;
    renderCatalog();
  }
  if (target.name === 'offer' && layer?.name === 'game') layer.offer = target.value;
});
root.addEventListener('submit', event => {
  if (!event.target.matches('.comment-form') || layer?.name !== 'post') return;
  event.preventDefault();
  const text = new FormData(event.target).get('reply')?.trim();
  if (!text) return;
  (state.replies[layer.id] ||= []).push({ author: '我', text: text.slice(0, 200) });
  persist();
  renderMain();
  renderLayer(false);
  dialogContent.querySelector('#reply-text').focus();
});
function closePanel() {
  dialog.hidden = true;
  main.hidden = false;
  layer = null;
  if (dialogStarter?.isConnected) dialogStarter.focus({ preventScroll: true });
  else main.focus({ preventScroll: true });
  dialogStarter = null;
}

root.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !dialog.hidden) {
    event.preventDefault();
    event.stopPropagation();
    closePanel();
  }
});

persist();
renderMain();

}

  customElements.define('keycamp-demo', class extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const section = this.closest('details');
      const mount = () => {
        if (this.shadowRoot || (section && !section.open)) return;
        section?.removeEventListener('toggle', mount);
        const root = this.attachShadow({ mode: 'open' });
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = styleUrl;
        root.innerHTML = markup;
        root.prepend(style);
        mountKeyCamp(root);
      };
      if (section && !section.open) section.addEventListener('toggle', mount);
      else mount();
    }
  });
})();