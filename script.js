/* =========================================================
   Scroll-reveal — auto-tag section content and observe it
   ========================================================= */
(function initReveal() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const selectors = [
    '.section-head',
    '.phase-card',
    '.kpi-row li',
    '.gallery figure',
    '.dataflow-wrap',
    '.design-intro',
    '.detail-section',
    '.two-col .figure',
    '.placeholder',
    '.status-card',
    '.hero-text > *',
    '.carousel',
    '.compare-slider',
    '.orbit-scrubber'
  ];
  const els = [];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el) => {
      if (!el.hasAttribute('data-reveal')) {
        el.setAttribute('data-reveal', '');
        const idx = Array.prototype.indexOf.call(el.parentNode.children, el);
        el.setAttribute('data-delay', String(Math.min(idx, 4) * 70));
      }
      els.push(el);
    });
  });

  if (reduced) {
    els.forEach(el => el.classList.add('is-visible'));
    return;
  }
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px 25% 0px', threshold: 0 });
  els.forEach(el => io.observe(el));
})();

/* =========================================================
   Sticky-nav active section highlight
   ========================================================= */
const navLinks = Array.from(document.querySelectorAll('.nav a'));
const sections = navLinks
  .map(a => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

const setActive = (id) => {
  navLinks.forEach(a => {
    const match = a.getAttribute('href') === '#' + id;
    a.style.color = match ? 'var(--accent-deep)' : '';
    a.style.fontWeight = match ? '700' : '';
  });
};

if ('IntersectionObserver' in window && sections.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) setActive(e.target.id);
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
  sections.forEach(s => io.observe(s));
}

/* =========================================================
   Hero parallax — subtle vertical drift on scroll
   ========================================================= */
(function initHeroParallax() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const figure = document.querySelector('.hero .hero-figure');
  if (!figure || reduced) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (y < 800) figure.style.transform = `translateY(${y * -0.05}px)`;
      ticking = false;
    });
  }, { passive: true });
})();

/* =========================================================
   Slide carousels (hero + Results mask strip)
   ========================================================= */
(function initCarousels() {
  const allTracks = document.querySelectorAll('.carousel-track');
  if (!allTracks.length) return;

  allTracks.forEach(track => {
    const slides = Array.from(track.querySelectorAll('.carousel-slide'));
    const carousel = track.closest('.carousel');
    const dots = Array.from(carousel.querySelectorAll('.carousel-dot'));
    const prev = carousel.querySelector('.carousel-prev');
    const next = carousel.querySelector('.carousel-next');
    let i = 0;
    let timer = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const go = (n) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
      dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
    };

    const advance = () => go(i + 1);

    const start = () => {
      if (reducedMotion) return;
      stop();
      timer = setInterval(advance, 4500);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

    prev?.addEventListener('click', () => { go(i - 1); start(); });
    next?.addEventListener('click', () => { go(i + 1); start(); });
    dots.forEach((d) => d.addEventListener('click', () => {
      go(parseInt(d.dataset.i, 10));
      start();
    }));

    carousel?.addEventListener('mouseenter', stop);
    carousel?.addEventListener('mouseleave', start);
    carousel?.addEventListener('focusin', stop);
    carousel?.addEventListener('focusout', start);

    carousel?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  { go(i - 1); start(); }
      if (e.key === 'ArrowRight') { go(i + 1); start(); }
    });

    start();
  });
})();

/* =========================================================
   Shared: smooth-scroll to a #detail-<key> with flash
   ========================================================= */
function jumpToDetail(key) {
  const target = document.getElementById('detail-' + key);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelectorAll('.detail-section.is-flash').forEach(el => el.classList.remove('is-flash'));
  target.classList.add('is-flash');
  setTimeout(() => target.classList.remove('is-flash'), 1500);
}

/* =========================================================
   Layered dataflow diagram (architecture as swimlanes)
   ========================================================= */
const DATAFLOW_NODES = [
  // hardware row
  { key: 'camera',     title: 'RealSense Camera',    category: 'hardware',   layer: 'hardware',   col: 0, subrow: 0, summary: 'Wrist-mounted depth + RGB camera. Publishes the pointcloud everything else depends on.',     relatedIds: ['detection', 'pixel'] },
  { key: 'robot',      title: 'UR7e Arm + Gripper',  category: 'hardware',   layer: 'hardware',   col: 4, subrow: 0, summary: '6-DoF Universal Robots arm with parallel gripper, driven via FollowJointTrajectory.',         relatedIds: ['armcircler', 'main'] },
  // perception row
  { key: 'yolo',       title: 'YOLODetector',        category: 'perception', layer: 'perception', col: 0, subrow: 0, summary: 'Thin stateless wrapper around Ultralytics YOLOv8 inference.',                                  relatedIds: ['detection', 'yolo-model'] },
  { key: 'detection',  title: 'DetectionNode',       category: 'perception', layer: 'perception', col: 1, subrow: 0, summary: 'Pairs YOLO bounding boxes with depth points to publish base_link centroids.',                  relatedIds: ['camera', 'yolo', 'pixel', 'main'] },
  { key: 'pixel',      title: 'pixel_to_world',      category: 'perception', layer: 'perception', col: 2, subrow: 0, summary: 'Lifts 2D detections to 3D centroids in base_link using the depth cloud and TF.',               relatedIds: ['camera', 'detection'] },
  { key: 'yolo-model', title: 'Custom YOLO',         category: 'perception', layer: 'perception', col: 4, subrow: 0, summary: 'Custom-trained on ~800 images of 3D-printed food replicas. Drives every detection.',         relatedIds: ['detection', 'yolo'] },
  // planning row (two sub-rows)
  { key: 'armcircler', title: 'ArmCircler',          category: 'planning',   layer: 'planning',   col: 0, subrow: 0, summary: '41-waypoint orbit around the plate; saves captures + poses for the offline pipeline.',        relatedIds: ['robot', 'commander'] },
  { key: 'commander',  title: 'Commander',           category: 'planning',   layer: 'planning',   col: 1, subrow: 0, summary: 'Coordinator: orbit done → segment → 6D poses → trigger pick-and-place.',                       relatedIds: ['armcircler', 'poses', 'main'] },
  { key: 'poses',      title: '6D Poses',            category: 'planning',   layer: 'planning',   col: 2, subrow: 0, summary: 'Weighted DLT triangulation + RANSAC produces per-object positions (optionally orientation).', relatedIds: ['commander', 'main'] },
  { key: 'main',       title: 'UR7e_CubeGrasp',      category: 'planning',   layer: 'planning',   col: 3, subrow: 0, summary: 'Pick-and-place state machine: home → refine → hover → descend → grip → lift → place.',         relatedIds: ['detection', 'commander', 'poses', 'robot'] }
];

const CATEGORY_META = {
  hardware:   { label: 'Hardware',   tagClass: 'tag-hw'   },
  perception: { label: 'perception', tagClass: 'tag-perc' },
  planning:   { label: 'planning',   tagClass: 'tag-plan' },
  external:   { label: 'external',   tagClass: 'tag-plan' }
};

const DATAFLOW_GRID_COLS = 5;

(function initDataflow() {
  const stage = document.getElementById('dataflowStage');
  const card  = document.getElementById('dataflowCard');
  const links = document.getElementById('dataflowLinks');
  if (!stage || !card || !links) return;

  const byKey = Object.fromEntries(DATAFLOW_NODES.map(n => [n.key, n]));
  let activeKey = null;

  // Build node DOM, appending each into its row container
  const nodeEls = {};
  const rowContainers = {};
  stage.querySelectorAll('.dataflow-row-nodes').forEach(c => {
    rowContainers[c.dataset.layer] = c;
  });

  // Set row heights based on max subrow count
  Object.keys(rowContainers).forEach(layer => {
    const subrowCount = DATAFLOW_NODES
      .filter(n => n.layer === layer)
      .reduce((m, n) => Math.max(m, n.subrow + 1), 1);
    rowContainers[layer].style.setProperty('--subrows', subrowCount);
  });

  DATAFLOW_NODES.forEach((n) => {
    const el = document.createElement('button');
    el.className = `dataflow-node dataflow-cat-${n.category}`;
    el.dataset.key = n.key;
    el.type = 'button';
    el.setAttribute('aria-label', `${n.title}, ${CATEGORY_META[n.category].label}`);
    el.innerHTML = `
      <span class="dataflow-node-dot" aria-hidden="true"></span>
      <span class="dataflow-node-label">${n.title}</span>
    `;
    // Horizontal placement on the shared 5-column grid
    el.style.left = `${((n.col + 0.5) / DATAFLOW_GRID_COLS) * 100}%`;
    el.style.setProperty('--subrow', n.subrow);
    rowContainers[n.layer].appendChild(el);
    nodeEls[n.key] = el;
  });

  // Compute node centers relative to the stage (for SVG link endpoints)
  function getCenters() {
    const stageRect = stage.getBoundingClientRect();
    const centers = {};
    DATAFLOW_NODES.forEach(n => {
      const el = nodeEls[n.key];
      const dot = el.querySelector('.dataflow-node-dot');
      const r = dot.getBoundingClientRect();
      centers[n.key] = {
        x: r.left - stageRect.left + r.width / 2,
        y: r.top  - stageRect.top  + r.height / 2
      };
    });
    return centers;
  }

  // Build unique edge list (a < b lexically) once, then redraw on layout changes
  const ROW_ORDER = ['hardware', 'perception', 'planning', 'external'];
  const edges = [];
  const seen = new Set();
  DATAFLOW_NODES.forEach(n => {
    n.relatedIds.forEach(rk => {
      if (!byKey[rk]) return;
      const a = n.key < rk ? n.key : rk;
      const b = n.key < rk ? rk : n.key;
      const id = a + '|' + b;
      if (seen.has(id)) return;
      seen.add(id);
      edges.push({ a, b });
    });
  });

  // Group edges by which row-pair they span, so parallel runs through the same
  // gutter can be fanned out instead of stacking on top of each other.
  const groups = {};
  edges.forEach(edge => {
    const ra = ROW_ORDER.indexOf(byKey[edge.a].layer);
    const rb = ROW_ORDER.indexOf(byKey[edge.b].layer);
    const lo = Math.min(ra, rb), hi = Math.max(ra, rb);
    const k = `${lo}_${hi}`;
    (groups[k] = groups[k] || []).push(edge);
  });

  function drawLinks() {
    const centers = getCenters();
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    links.setAttribute('viewBox', `0 0 ${sw} ${sh}`);
    links.innerHTML = '';

    // Assign a within-group offset so parallel horizontal segments don't overlap.
    // Sort by mean X so the fan reads left-to-right.
    Object.values(groups).forEach(group => {
      group.sort((e1, e2) => {
        const m1 = (centers[e1.a].x + centers[e1.b].x) / 2;
        const m2 = (centers[e2.a].x + centers[e2.b].x) / 2;
        return m1 - m2;
      });
      const n = group.length;
      group.forEach((edge, i) => {
        edge._offset = n === 1 ? 0 : (i - (n - 1) / 2) * 7;
      });
    });

    edges.forEach(edge => {
      const pa = centers[edge.a];
      const pb = centers[edge.b];
      if (!pa || !pb) return;

      // Orient so src is the upper (or leftmost when equal) node
      let src = pa, dst = pb;
      if (pa.y > pb.y || (pa.y === pb.y && pa.x > pb.x)) { src = pb; dst = pa; }
      const dx = dst.x - src.x;
      const dy = dst.y - src.y;
      const offset = edge._offset || 0;

      let d;
      if (Math.abs(dy) < 4) {
        // Same-row link: shallow upward arc, height capped so it stays inside the row above's gutter
        const arcH = Math.min(22, 10 + Math.abs(dx) * 0.04);
        const cy = src.y - arcH;
        d = `M ${src.x} ${src.y} Q ${(src.x + dst.x) / 2} ${cy} ${dst.x} ${dst.y}`;
      } else if (Math.abs(dx) < 2) {
        // Straight vertical
        d = `M ${src.x} ${src.y} L ${dst.x} ${dst.y}`;
      } else {
        // Cross-row orthogonal H-V-H, quadratic-smoothed corners
        const midY = src.y + dy / 2 + offset;
        const r = Math.min(10, Math.abs(dx) / 2, dy / 3);
        const sgn = dx >= 0 ? 1 : -1;
        d = `M ${src.x} ${src.y} ` +
            `L ${src.x} ${midY - r} ` +
            `Q ${src.x} ${midY} ${src.x + r * sgn} ${midY} ` +
            `L ${dst.x - r * sgn} ${midY} ` +
            `Q ${dst.x} ${midY} ${dst.x} ${midY + r} ` +
            `L ${dst.x} ${dst.y}`;
      }

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'dataflow-link');
      path.setAttribute('data-a', edge.a);
      path.setAttribute('data-b', edge.b);
      links.appendChild(path);
    });

    applyHighlightState();
  }

  function applyHighlightState() {
    const related = activeKey ? new Set(byKey[activeKey].relatedIds) : null;

    DATAFLOW_NODES.forEach(n => {
      const el = nodeEls[n.key];
      const isActive  = activeKey === n.key;
      const isRelated = !!(related && related.has(n.key));
      const isDimmed  = !!(activeKey && !isActive && !isRelated);
      el.classList.toggle('is-active', isActive);
      el.classList.toggle('is-related', isRelated);
      el.classList.toggle('is-dimmed', isDimmed);
    });

    links.querySelectorAll('.dataflow-link').forEach(path => {
      const a = path.getAttribute('data-a');
      const b = path.getAttribute('data-b');
      const touches = activeKey && (a === activeKey || b === activeKey);
      path.classList.toggle('is-active', !!touches);
      path.classList.toggle('is-faded', !!(activeKey && !touches));
    });
  }

  function showCard(key) {
    const n = byKey[key];
    const meta = CATEGORY_META[n.category];
    card.dataset.activeKey = n.key;
    card.innerHTML = `
      <button type="button" class="dataflow-card-close" aria-label="Close">×</button>
      <span class="tag ${meta.tagClass}">${meta.label}</span>
      <h3>${n.title}</h3>
      <p>${n.summary}</p>
      <button type="button" class="btn btn-primary dataflow-card-cta">
        Read full details →
      </button>
    `;
    card.hidden = false;
    requestAnimationFrame(() => card.classList.add('is-visible'));
  }

  function hideCard() {
    card.classList.remove('is-visible');
    setTimeout(() => {
      if (!activeKey) {
        card.hidden = true;
        card.innerHTML = '';
        delete card.dataset.activeKey;
      }
    }, 240);
  }

  // Event delegation — attached ONCE so close/CTA can never race against innerHTML swaps
  card.addEventListener('click', (e) => {
    if (e.target.closest('.dataflow-card-close')) {
      e.stopPropagation();
      collapse();
    } else if (e.target.closest('.dataflow-card-cta')) {
      e.stopPropagation();
      const k = card.dataset.activeKey;
      if (k) jumpToDetail(k);
    }
  });

  function setActive(key) {
    if (activeKey === key) { collapse(); return; }
    activeKey = key;
    applyHighlightState();
    showCard(key);
  }

  function collapse() {
    activeKey = null;
    applyHighlightState();
    hideCard();
  }

  // Wire interaction
  DATAFLOW_NODES.forEach(n => {
    const el = nodeEls[n.key];
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      setActive(n.key);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { collapse(); }
    });
  });

  stage.addEventListener('click', (e) => {
    if (e.target === stage || e.target.classList.contains('dataflow-row') ||
        e.target.classList.contains('dataflow-row-nodes')) {
      collapse();
    }
  });

  // Layout / resize
  let resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(drawLinks, 80);
  });

  // Initial draw — wait one frame for layout to settle
  requestAnimationFrame(drawLinks);
})();

/* =========================================================
   Before / after plate slider (Results section)
   ========================================================= */
(function initCompareSlider() {
  const slider = document.querySelector('.compare-slider');
  if (!slider) return;
  const handle = slider.querySelector('.compare-handle');
  const clip   = slider.querySelector('.compare-clip');
  if (!handle || !clip) return;

  let value = 50;
  let dragging = false;

  function set(v) {
    value = Math.max(0, Math.min(100, v));
    clip.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
    handle.style.left = `${value}%`;
    handle.setAttribute('aria-valuenow', String(Math.round(value)));
  }

  function pointerToValue(clientX) {
    const r = slider.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 100;
  }

  slider.addEventListener('pointerdown', (e) => {
    dragging = true;
    slider.setPointerCapture?.(e.pointerId);
    set(pointerToValue(e.clientX));
  });
  slider.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    set(pointerToValue(e.clientX));
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => {
    slider.addEventListener(ev, () => { dragging = false; });
  });

  handle.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  { set(value - 2); e.preventDefault(); }
    if (e.key === 'ArrowRight') { set(value + 2); e.preventDefault(); }
    if (e.key === 'Home')       { set(0);  e.preventDefault(); }
    if (e.key === 'End')        { set(100); e.preventDefault(); }
  });

  set(50);
})();

/* =========================================================
   Orbit waypoint scrubber (inside #detail-armcircler)
   ========================================================= */
(function initOrbitScrubber() {
  const slider = document.getElementById('orbitSlider');
  const img    = document.getElementById('orbitImg');
  const label  = document.getElementById('orbitLabel');
  if (!slider || !img || !label) return;

  let pending = false;

  function update() {
    pending = false;
    const n = parseInt(slider.value, 10);
    if (!img.src.endsWith(`captured_${n}.jpg`)) {
      img.src = `assets/captured_${n}.jpg`;
      img.alt = `Captured orbit frame ${n}`;
    }
    label.textContent = `Frame ${n} / 41`;
  }

  slider.addEventListener('input', () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  });

  update();
})();
