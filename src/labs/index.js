/**
 * Labs are lazy. Nobody pays for code they never scroll to.
 */
export function initLabs() {
  const section = document.getElementById('labs');
  if (!section) return;

  let mounted = false;

  const mount = async () => {
    if (mounted) return;
    mounted = true;
    const [{ initStylometry }, { initPhishing }] = await Promise.all([
      import('./stylometry.js'),
      import('./phishing.js'),
    ]);
    initStylometry();
    initPhishing();
  };

  const obs = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        obs.disconnect();
        mount();
      }
    },
    { rootMargin: '400px 0px' }
  );
  obs.observe(section);
}
