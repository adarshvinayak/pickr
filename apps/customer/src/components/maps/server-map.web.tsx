import { useCallback, useEffect, useRef } from 'react';
import { BACKEND, getToken } from '@/lib/api';

export function ServerMap({ config, onPoint, onMoving }: any) {
  const frame = useRef<HTMLIFrameElement>(null);
  const callbacks = useRef({ onPoint, onMoving });
  const serialized = JSON.stringify({ ...config, token: getToken() });
  useEffect(() => { callbacks.current = { onPoint, onMoving }; }, [onPoint, onMoving]);
  const send = useCallback(() => {
    frame.current?.contentWindow?.postMessage(
      { type: 'pickr-map', config: JSON.parse(serialized) },
      new URL(BACKEND || location.origin).origin,
    );
  }, [serialized]);
  useEffect(() => {
    send();
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== new URL(BACKEND || location.origin).origin) return;
      if (event.data?.type === 'ready') send();
      if (event.data?.type === 'point') callbacks.current.onPoint?.(event.data.point);
      if (event.data?.type === 'moving') callbacks.current.onMoving?.(event.data.moving);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [send]);
  return <iframe ref={frame} onLoad={send} src={`${BACKEND}/map-embed`} title="PICKR live map" allow="geolocation" style={{ border: 0, width: '100%', height: '100%' }} />;
}
