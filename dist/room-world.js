/* Shared geometry for the room renderer and movement checks. */
(function (global) {
  const obstacles = [
    { x: 0, y: 1, w: 1.7, h: 5.3 },
    { x: 1.1, y: 3.15, w: 1.25, h: 2.5 },
    { x: 0, y: 6.3, w: .9, h: 3.5 },
    { x: .7, y: 8.7, w: 1.25, h: 1.25 },
    { x: 3, y: .05, w: 3.5, h: 1.6 },
    { x: 7.1, y: .05, w: 2.75, h: 1.85 },
    { x: 3.3, y: 9.1, w: 2.1, h: .65 }
  ];
  const hotspots = [
    { id: 'board', x: 3.1, y: 2.6, label: '查看简历', box: [920, 90, 365, 395] },
    { id: 'desk', x: 2.9, y: 4.55, label: '点亮数字工作台', box: [445, 298, 354, 206] },
    { id: 'books', x: 1.9, y: 7.4, label: '翻阅书架', box: [215, 260, 228, 349] },
    { id: 'record', x: 5.05, y: 2.45, label: '播放或暂停唱片', box: [981, 397, 146, 103] },
    { id: 'sofa', x: 8, y: 2.8, label: '坐下休息', box: [1192, 488, 271, 234] }
  ];
  function project(x, y) { return { x: 835 + x * 63.3 - y * 63.5, y: 432 + x * 25.4 + y * 23.1 }; }
  function unproject(x, y) {
    x -= 835; y -= 432;
    const det = 63.3 * 23.1 + 63.5 * 25.4;
    return { x: (23.1 * x + 63.5 * y) / det, y: (-25.4 * x + 63.3 * y) / det };
  }
  function walkable(x, y) {
    const radius = .2;
    return x >= .28 && y >= .28 && x <= 9.7 && y <= 9.7 && !obstacles.some(box =>
      x > box.x - radius && x < box.x + box.w + radius && y > box.y - radius && y < box.y + box.h + radius);
  }
  function pathTo(start, target) {
    const cells = [];
    for (let x = 1; x < 20; x++) for (let y = 1; y < 20; y++) {
      if (walkable(x / 2, y / 2)) cells.push({ x: x / 2, y: y / 2, key: x + ',' + y });
    }
    const nearest = point => cells.reduce((best, cell) =>
      Math.hypot(point.x - cell.x, point.y - cell.y) < Math.hypot(point.x - best.x, point.y - best.y) ? cell : best);
    const from = nearest(start), to = nearest(target);
    const byKey = new Map(cells.map(cell => [cell.key, cell]));
    const queue = [from], visited = new Map([[from.key, null]]);
    for (let i = 0; i < queue.length && !visited.has(to.key); i++) {
      const cell = queue[i];
      for (const [dx, dy] of [[.5, 0], [-.5, 0], [0, .5], [0, -.5]]) {
        const next = byKey.get((cell.x + dx) * 2 + ',' + (cell.y + dy) * 2);
        if (!next || visited.has(next.key)) continue;
        visited.set(next.key, cell);
        queue.push(next);
      }
    }
    if (!visited.has(to.key)) return [];
    const path = [];
    for (let at = to; at; at = visited.get(at.key)) path.unshift({ x: at.x, y: at.y });
    // Keep only useful turns, with sampled clearance around furniture.
    const clear = (a, b) => {
      const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / .05);
      for (let i = 1; i <= steps; i++) if (!walkable(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps)) return false;
      return true;
    };
    const smooth = [];
    let anchor = start, index = 0;
    while (index < path.length) {
      let next = index;
      while (next + 1 < path.length && clear(anchor, path[next + 1])) next++;
      smooth.push(path[next]); anchor = path[next]; index = next + 1;
    }
    return smooth;
  }
  function moveActor(actor, screenX, screenY, path, elapsed) {
    const speed = 2.35;
    const start = { x: actor.x, y: actor.y };
    actor.vx ??= 0; actor.vy ??= 0;
    const manual = Boolean(screenX || screenY);
    const direction = manual ? unproject(835 + screenX * 65, 432 + screenY * 48) : null;
    const duration = Math.max(0, Math.min(elapsed, .05));
    const steps = Math.max(1, Math.ceil(duration * 120)), dt = duration / steps;
    let traveled = 0;
    for (let i = 0; i < steps; i++) {
      let tx = 0, ty = 0;
      if (manual) {
        const length = Math.hypot(direction.x, direction.y);
        tx = direction.x / length * speed; ty = direction.y / length * speed;
      } else if (path.length) {
        let target = path[0];
        let distance = Math.hypot(target.x - actor.x, target.y - actor.y);
        while (distance < .025 && path.length) {
          path.shift(); target = path[0];
          if (!target) break;
          distance = Math.hypot(target.x - actor.x, target.y - actor.y);
        }
        if (target) {
          const pace = path.length === 1 ? Math.min(speed, distance * 9) : speed;
          tx = (target.x - actor.x) / distance * pace;
          ty = (target.y - actor.y) / distance * pace;
        }
      }
      const easing = 1 - Math.exp(-(tx || ty ? 16 : 25) * dt);
      actor.vx += (tx - actor.vx) * easing; actor.vy += (ty - actor.vy) * easing;
      if (Math.hypot(actor.vx, actor.vy) < .015 && !tx && !ty) actor.vx = actor.vy = 0;
      const beforeX = actor.x, beforeY = actor.y;
      const dx = actor.vx * dt, dy = actor.vy * dt;
      if (walkable(actor.x + dx, actor.y)) actor.x += dx; else actor.vx = 0;
      if (walkable(actor.x, actor.y + dy)) actor.y += dy; else actor.vy = 0;
      traveled += Math.hypot(actor.x - beforeX, actor.y - beforeY);
    }
    const dx = actor.x - start.x, dy = actor.y - start.y;
    if (traveled > .0005) {
      const sx = dx * 63.3 - dy * 63.5, sy = dx * 25.4 + dy * 23.1;
      if (Math.hypot(sx, sy) > .08) actor.facing = Math.abs(sy) > Math.abs(sx) * .65 ? (sy < 0 ? 'up' : 'down') : (sx < 0 ? 'left' : 'right');
      actor.walk = (actor.walk || 0) + traveled * Math.PI * 2 / 1.65;
    }
    return traveled / Math.max(duration, .001);
  }
  const world = { obstacles, hotspots, project, unproject, walkable, pathTo, moveActor };
  if (typeof module !== 'undefined' && module.exports) module.exports = world;
  else global.RoomWorld = world;
})(globalThis);
