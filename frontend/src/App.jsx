import { useEffect, useRef } from 'react';
import { mountPortal } from './legacy/portal';

export default function App() {
  const portalRoot = useRef(null);

  useEffect(() => {
    mountPortal(portalRoot.current);
  }, []);

  return (
    <>
      <div id="app" ref={portalRoot}>
        <div className="boot">
          <div className="seal">CTU</div>
          <span>Loading CTU Portal…</span>
        </div>
      </div>
      <div id="toast" aria-live="polite" />
    </>
  );
}
