import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export type Facing = 'user' | 'environment';
export type CameraState = 'idle' | 'starting' | 'live' | 'denied' | 'missing' | 'error';
export type CameraHandle = {
  /** The frame on screen as a canvas, mirrored like the preview when it is the front camera. */
  capture: () => HTMLCanvasElement | null;
};

type Props = {
  ref?: Ref<CameraHandle>;
  facing: Facing;
  /** Starts the camera when true; stops it (and frees it) when false. */
  active: boolean;
  onState?: (state: CameraState) => void;
  /** The warm flash-film grade on the live picture. */
  grade?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** The look of the live picture: warm tungsten, a little contrast, the reds a little richer. */
export const LIVE_GRADE = 'sepia(.2) saturate(1.16) contrast(1.07) brightness(1.03) hue-rotate(-6deg)';

/**
 * The phone's camera in the browser (getUserMedia): a live picture that fills its box. It reports whether it runs,
 * was refused or is missing, so the screen can offer a picture instead; headless browsers have no camera at all.
 */
export function LiveCamera({ ref, facing, active, onState, grade = true, style }: Props) {
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const report = useRef(onState);
  report.current = onState;

  useImperativeHandle(ref, () => ({
    capture: () => {
      const v = video.current;
      if (!v || !v.videoWidth) return null;
      const c = document.createElement('canvas');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const g = c.getContext('2d');
      if (!g) return null;
      if (facing === 'user') {
        g.translate(c.width, 0);
        g.scale(-1, 1);
      }
      g.drawImage(v, 0, 0, c.width, c.height);
      return c;
    },
  }));

  useEffect(() => {
    let cancelled = false;
    const stop = () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      setLive(false);
    };
    if (!active) {
      stop();
      report.current?.('idle');
      return;
    }
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        report.current?.('missing');
        return;
      }
      report.current?.('starting');
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stop();
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
        }
        setLive(true);
        report.current?.('live');
      } catch (e) {
        const name = (e as { name?: string }).name ?? '';
        report.current?.(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError' ? 'missing' : 'error');
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [active, facing]);

  return (
    <View style={[{ overflow: 'hidden', backgroundColor: '#050302' }, style]}>
      <video
        ref={video}
        playsInline
        muted
        autoPlay
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: facing === 'user' ? 'scaleX(-1)' : undefined,
          filter: grade ? LIVE_GRADE : undefined,
          opacity: live ? 1 : 0,
          transition: 'opacity .5s ease',
        }}
      />
    </View>
  );
}

/** Lets her choose a picture from the phone; resolves with a data URL, or null when she cancels. */
export function pickImage(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    document.body.appendChild(input);
    input.click();
  });
}
