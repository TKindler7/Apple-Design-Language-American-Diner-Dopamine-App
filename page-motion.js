// Scroll follows the visitor: no pinned sections, scroll interception, or idle loop.
let disposeCurrentMotion;

const clamp = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (value) => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};
const segment = (progress, start, end) => smoothstep((progress - start) / (end - start));

export function setupPageMotion() {
  disposeCurrentMotion?.();
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  if (!window.CSS?.supports("translate", "0 0") || !window.CSS.supports("scale", "1")) return () => {};

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compact = window.matchMedia("(max-width: 760px)");
  const hero = document.querySelector(".hero");
  const meal = document.querySelector(".meal-art");
  const scenes = [
    hero && { element: hero, kind: "hero", inView: false },
    meal && { element: meal, kind: "meal", inView: false },
  ].filter(Boolean);
  let frame = 0;
  let forceUpdate = false;
  let disposed = false;
  let observer;
  let resizeObserver;

  const previousAttributes = new Map(scenes.map(({ element }) => [element, element.getAttribute("data-page-motion")]));
  const originalStyles = new Map();
  const sceneByElement = new Map(scenes.map((scene) => [scene.element, scene]));
  for (const scene of scenes) scene.element.dataset.pageMotion = scene.kind;

  // Keep the extra transforms independent of existing entrance animations and tilts.
  function setValue(element, property, value) {
    if (!originalStyles.has(element)) originalStyles.set(element, new Map());
    const styles = originalStyles.get(element);
    if (!styles.has(property)) styles.set(property, element.style.getPropertyValue(property));
    if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value);
  }

  function updateHero(bounds) {
    const progress = smoothstep(-bounds.top / Math.max(bounds.height * 0.85, 1));
    const amount = compact.matches ? 0.48 : 1;
    setValue(hero, "--page-hero-copy-y", `${(-40 * progress * amount).toFixed(2)}px`);
    setValue(hero, "--page-hero-photo-y", `${(-18 * progress * amount).toFixed(2)}px`);
    // Overscan keeps the photo inside its frame while the camera moves upward.
    setValue(hero, "--page-hero-photo-scale", (1.025 + 0.095 * progress * amount).toFixed(4));
  }

  function updateMeal(bounds, viewportHeight) {
    const start = viewportHeight * 0.96;
    const finish = Math.max(viewportHeight * 0.12, (viewportHeight - bounds.height) * 0.5);
    const progress = clamp((start - bounds.top) / Math.max(start - finish, 1));
    const amount = compact.matches ? 0.48 : 1;
    const parts = [
      { name: "burger", start: 0, end: 0.68, x: -48, y: 70, turn: -5, scale: 0.9 },
      { name: "fries", start: 0.14, end: 0.84, x: -88, y: 94, turn: -8, scale: 0.86 },
      { name: "shake", start: 0.28, end: 1, x: 84, y: 54, turn: 9, scale: 0.88 },
    ];

    for (const part of parts) {
      const arrival = segment(progress, part.start, part.end);
      const remaining = (1 - arrival) * amount;
      setValue(meal, `--page-${part.name}-x`, `${(part.x * remaining).toFixed(2)}px`);
      setValue(meal, `--page-${part.name}-y`, `${(part.y * remaining).toFixed(2)}px`);
      setValue(meal, `--page-${part.name}-turn`, `${(part.turn * remaining).toFixed(2)}deg`);
      setValue(meal, `--page-${part.name}-scale`, (1 - (1 - part.scale) * remaining).toFixed(4));
      setValue(meal, `--page-${part.name}-opacity`, segment(progress, part.start, part.start + 0.23).toFixed(3));
    }

    const orbit = segment(progress, 0.1, 0.9);
    setValue(meal, "--page-orbit-scale", (0.9 + orbit * 0.1).toFixed(4));
    setValue(meal, "--page-orbit-opacity", (0.2 + orbit * 0.8).toFixed(3));
  }

  function update() {
    frame = 0;
    if (disposed || reduceMotion.matches || document.hidden) return;
    const viewportHeight = window.innerHeight || root.clientHeight;
    const measureAll = forceUpdate;
    forceUpdate = false;

    // Read geometry together, before writing any animation values.
    const measurements = scenes
      .filter((scene) => measureAll || scene.inView)
      .map((scene) => ({ scene, bounds: scene.element.getBoundingClientRect() }));
    for (const { scene, bounds } of measurements) {
      scene.inView = bounds.bottom > 0 && bounds.top < viewportHeight;
      scene.element.classList.toggle("page-motion-in-view", scene.inView);
      if (scene.kind === "hero") updateHero(bounds);
      else updateMeal(bounds, viewportHeight);
    }
  }

  function requestUpdate(force = false) {
    if (disposed || reduceMotion.matches || document.hidden) return;
    forceUpdate ||= force;
    if (frame || (!forceUpdate && !scenes.some((scene) => scene.inView))) return;
    frame = window.requestAnimationFrame(update);
  }

  function onScroll() {
    // Without IntersectionObserver, measure both scenes on scroll as a fallback.
    requestUpdate(!observer);
  }
  function refresh() { requestUpdate(true); }
  function pause() {
    window.cancelAnimationFrame(frame);
    frame = 0;
    for (const scene of scenes) scene.element.classList.remove("page-motion-in-view");
  }
  function onVisibilityChange() {
    if (document.hidden) pause();
    else refresh();
  }
  function onMotionChange() {
    root.classList.toggle("page-motion-enabled", !reduceMotion.matches);
    if (reduceMotion.matches) pause();
    else {
      forceUpdate = true;
      update();
    }
  }

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const scene = sceneByElement.get(entry.target);
        scene.inView = entry.isIntersecting;
        scene.element.classList.toggle("page-motion-in-view", scene.inView && !document.hidden && !reduceMotion.matches);
      }
      requestUpdate(true);
    });
    for (const scene of scenes) observer.observe(scene.element);
  }

  if ("ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(refresh);
    // Menu category changes can move the meal section without resizing it.
    resizeObserver.observe(document.body);
    for (const scene of scenes) resizeObserver.observe(scene.element);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", refresh, { passive: true });
  window.addEventListener("pageshow", refresh);
  window.addEventListener("load", refresh);
  document.addEventListener("visibilitychange", onVisibilityChange);
  reduceMotion.addEventListener("change", onMotionChange);
  compact.addEventListener("change", refresh);
  // Read the restored scroll position immediately instead of replaying from zero.
  onMotionChange();

  function dispose() {
    if (disposed) return;
    disposed = true;
    pause();
    observer?.disconnect();
    resizeObserver?.disconnect();
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", refresh);
    window.removeEventListener("pageshow", refresh);
    window.removeEventListener("load", refresh);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    reduceMotion.removeEventListener("change", onMotionChange);
    compact.removeEventListener("change", refresh);
    root.classList.remove("page-motion-enabled");
    for (const [element, attributes] of previousAttributes) {
      if (attributes === null) element.removeAttribute("data-page-motion");
      else element.setAttribute("data-page-motion", attributes);
    }
    for (const [element, properties] of originalStyles) {
      for (const [name, value] of properties) {
        if (value) element.style.setProperty(name, value);
        else element.style.removeProperty(name);
      }
    }
    if (disposeCurrentMotion === dispose) disposeCurrentMotion = undefined;
  }

  disposeCurrentMotion = dispose;
  return dispose;
}
