import { dateKey, decimal, emit, eventsOf, formatNo, INGREDIENTS, kmOf, MEATS, spitAt, type Passport } from '@ninja/shared';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { goBack } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Button, Field, IconButton, LiveDot, PopIn, Press, Row, Segments, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { BRAND, PHOTOS } from '../photos';
import { useApp } from '../state/app';
import { C, fx, isWeb, MAX_WIDTH, PAD, R, web } from '../theme';
import { nj } from '../social/css';
import { compose, fontsReady, gradeFlash, loadImage, stampOf, thumbOf, toBlob, toCanvas, type FlashData, type Format, type Overlay } from '../social/flashLook';
import { LIVE_GRADE, LiveCamera, pickImage, type CameraHandle, type CameraState, type Facing } from '../social/LiveCamera';
import { setSocial } from '../social/store';
import { assetUri, download, newRef, shareFile, t } from '../social/util';

/** Pictures from tonight for when there is no camera (a laptop, a headless browser): Ninja's own flash photos. */
const DEMO_SHOTS = ['room-table', 'flash-3', 'room-dips', 'flash-6', 'flash-1'];

/** Where the greens on this plate come from, the closest first: "Sla uit Sint-Katelijne-Waver · 19 km". */
function greensLine(p: Passport | undefined): string {
  const pickFrom = p ? p.lines : [];
  const order = ['lettuce', 'tomato', 'parsley', 'onion', 'cucumber'];
  const found = order.map((id) => pickFrom.find((l) => l.id === id)).find(Boolean);
  if (found) return t('{name} uit {place} · {km} km', { name: tr(found.name), place: found.place, km: found.km });
  const g = INGREDIENTS.lettuce;
  return t('{name} uit {place} · {km} km', { name: tr(g.name), place: g.place, km: kmOf('lettuce') });
}

/** A developed photo, with the numbers of the moment it was taken (they do not change afterwards). */
type Shot = { base: HTMLCanvasElement; from: 'camera' | 'demo' | 'library'; data: FlashData };

export default function Flash() {
  const { passports, ev, minute, now, update, bridge } = useApp();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const cam = useRef<CameraHandle>(null);
  const [facing, setFacing] = useState<Facing>('environment');
  const [camState, setCamState] = useState<CameraState>('idle');
  const [flashOn, setFlashOn] = useState(true);
  const [demo, setDemo] = useState(DEMO_SHOTS[0]);
  const [pop, setPop] = useState(0);
  const [shot, setShot] = useState<Shot | null>(null);
  const [overlay, setOverlay] = useState<Overlay>('live');
  const [format, setFormat] = useState<Format>('story');
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [posted, setPosted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const logo = useRef<HTMLImageElement | null>(null);
  const composed = useRef<HTMLCanvasElement | null>(null);
  const noCamera = camState === 'missing' || camState === 'denied' || camState === 'error' || !isWeb;

  const passport = passports.at(-1);
  const data = useMemo<FlashData>(() => {
    const place = t('Vlaamsekaai 52 · Antwerpen');
    const stamp = stampOf(now);
    if (passport) {
      const meat = passport.meat ? tr(MEATS[passport.meat].short) : '';
      const portion = passport.portion === '1,5x' ? tr('anderhalve portie') : tr('één portie');
      return {
        place,
        stamp,
        dish: passport.dishName,
        sub: meat ? `${meat} · ${portion}` : portion,
        stats: [
          { label: t('Bij de snede'), value: decimal(passport.core, 1), unit: '°C' },
          { label: t('Naar je tafel'), value: String(passport.secondsToTable), unit: 's' },
          { label: t('Paspoort'), value: formatNo(passport.no) },
        ],
        line: greensLine(passport),
      };
    }
    const r = spitAt(ev, 'rund', minute);
    return {
      place,
      stamp,
      dish: t('De spies, nu'),
      sub: tr('Rund, kalf en lam, boven eikenvuur'),
      stats: [
        { label: t('In de snijlaag'), value: decimal(r.core, 1), unit: '°C' },
        { label: t('Het vuur'), value: String(r.fire), unit: '°C' },
        { label: t('Aan de spies'), value: decimal(r.kg, 1), unit: 'kg' },
      ],
      line: greensLine(undefined),
    };
  }, [passport, ev, minute, now]);

  // The wordmark for the layers, and the faces they are set in.
  useEffect(() => {
    if (!isWeb) return;
    loadImage(assetUri(BRAND.logo))
      .then((img) => {
        logo.current = img;
      })
      .catch(() => {});
    fontsReady();
  }, []);

  // A new layer or format: the picture is composed again from the graded photo.
  useEffect(() => {
    if (!shot || !isWeb) return;
    let alive = true;
    (async () => {
      await fontsReady();
      if (!alive) return;
      const c = compose(shot.base, format, overlay, shot.data, logo.current);
      composed.current = c;
      setPreview(c.toDataURL('image/jpeg', 0.86));
    })();
    return () => {
      alive = false;
    };
  }, [shot, format, overlay]);

  const develop = async (source: CanvasImageSource, w: number, h: number, from: Shot['from']) => {
    const base = gradeFlash(toCanvas(source, w, h, 1600));
    setShot({ base, from, data });
    setCaption(passport ? t('{dish} van de spies, {core} °C', { dish: passport.dishName, core: decimal(passport.core, 1) }) : t('Vanavond bij Ninja'));
  };

  const shoot = async () => {
    if (busy) return;
    setBusy(true);
    tap('success');
    if (flashOn) setPop((n) => n + 1);
    try {
      const frame = cam.current?.capture();
      if (frame) await develop(frame, frame.width, frame.height, 'camera');
      else if (isWeb) {
        const img = await loadImage(assetUri(PHOTOS[demo]));
        await develop(img, img.naturalWidth, img.naturalHeight, 'demo');
      }
    } finally {
      setBusy(false);
    }
  };

  const choose = async () => {
    const d = await pickImage();
    if (!d) return;
    const img = await loadImage(d);
    await develop(img, img.naturalWidth, img.naturalHeight, 'library');
  };

  const fileName = () => `ninja-flash-${dateKey(now)}-${format}.jpg`;
  const share = async () => {
    if (!composed.current) return;
    const r = await shareFile(await toBlob(composed.current), fileName(), t('Vers van de spies bij Ninja, Vlaamsekaai 52.'));
    if (r === 'downloaded') toast(tr('Bewaard op je toestel'), { text: tr('Deel hem vanuit je foto’s op Instagram.'), icon: 'download' });
  };
  const save = async () => {
    if (!composed.current) return;
    download(await toBlob(composed.current), fileName());
    toast(tr('Bewaard op je toestel'), { icon: 'download' });
  };
  const toWall = () => {
    if (!shot || posted) return;
    const story = compose(shot.base, 'story', overlay, shot.data, logo.current);
    const thumb = thumbOf(story, 260);
    const ref = newRef('flash');
    emit({ kind: 'flash', ref, thumb, caption: caption.trim() || tr('Vanavond bij Ninja'), passport: passport?.no });
    update((s) => ({ flashCount: s.flashCount + 1 }));
    setSocial((s) => ({ shots: [...s.shots, { id: ref, at: Date.now(), thumb, caption: caption.trim(), overlay, passport: passport?.no, wall: ref }] }));
    setPosted(ref);
    tap('success');
  };
  const approved = posted ? eventsOf(bridge, 'wall').find((w) => w.ref === posted) : undefined;

  const retake = () => {
    setShot(null);
    setPreview(null);
    setPosted(null);
    composed.current = null;
  };

  // ----------------------------------------------------------------------------------------------- the darkroom
  if (shot) {
    const aspect = format === 'story' ? 9 / 16 : 4 / 5;
    return (
      <View style={{ flex: 1, backgroundColor: '#050302' }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30, paddingHorizontal: PAD, gap: 16, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <IconButton name="camera" label="Opnieuw" onPress={retake} />
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Txt v="label" size={10}>
                Je flitsfoto
              </Txt>
              <Txt v="num" size={10} color={C.muted} raw>
                {format === 'story' ? '1080 × 1920' : '1080 × 1350'}
              </Txt>
            </View>
            <IconButton name="close" label="Sluiten" onPress={goBack} />
          </Row>
          <View style={{ alignItems: 'center' }}>
            <View style={[{ width: format === 'story' ? '78%' : '100%', aspectRatio: aspect, borderRadius: 18, overflow: 'hidden', backgroundColor: C.bg2, borderWidth: 1, borderColor: C.line2 }, web({ boxShadow: '0 30px 70px -30px rgba(0,0,0,.95), 0 0 0 6px rgba(244,236,225,.03)' })]}>
              {preview ? <Image source={{ uri: preview }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
            </View>
          </View>
          <Segments<Overlay>
            value={overlay}
            onChange={setOverlay}
            options={[
              { id: 'live', label: 'Live', icon: 'thermo' },
              { id: 'ninja', label: 'Ninja', icon: 'fire' },
              { id: 'puur', label: 'Puur', icon: 'image' },
            ]}
          />
          <Txt v="small" size={12} color={C.muted} align="center">
            {overlay === 'live' ? (passport ? t('De cijfers van je bord: paspoort No. {no}.', { no: formatNo(passport.no) }) : tr('De spies op dit moment. Met een bestelling komen de cijfers van je eigen bord.')) : overlay === 'ninja' ? tr('Het lederen logo en de Vlaamsekaai.') : tr('Alleen de foto, met de datum van de wegwerpcamera.')}
          </Txt>
          <Segments<Format>
            value={format}
            onChange={setFormat}
            options={[
              { id: 'story', label: 'Story 9:16' },
              { id: 'post', label: 'Post 4:5' },
            ]}
          />
          <Row gap={10}>
            <Button title="Deel" kind="lacquer" size="lg" icon="share" style={{ flex: 1 }} onPress={share} />
            <Button title="Bewaar" kind="ghost" size="lg" icon="download" style={{ flex: 1 }} onPress={save} />
          </Row>
          <View {...fx('leather stitch')} style={{ borderRadius: R.lg, padding: 18, gap: 12, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line }}>
            <Row gap={10}>
              <Icon name="screen" size={18} color={C.amber} />
              <Txt v="h3" style={{ flex: 1 }}>
                Op de Wall, in de zaal
              </Txt>
            </Row>
            {posted ? (
              approved?.ok ? (
                <PopIn style={{ gap: 10 }}>
                  <Row gap={8}>
                    <Icon name="check" size={16} color={C.ok} stroke={2} />
                    <Txt v="small" color={C.soft} style={{ flex: 1 }}>
                      Goedgekeurd. Je foto staat op het scherm in de zaal en op de website.
                    </Txt>
                  </Row>
                  <Button title="Bekijk de Wall" kind="bone" size="sm" after="arrow" onPress={() => router.push('/wall')} />
                </PopIn>
              ) : (
                <Row gap={8}>
                  <LiveDot size={6} color={C.amber} />
                  <Txt v="small" color={C.soft} style={{ flex: 1 }}>
                    Bij de zaal. Noor keurt elke foto voor hij op het scherm komt.
                  </Txt>
                </Row>
              )
            ) : (
              <>
                <Txt v="small" color={C.muted}>
                  Je foto komt op het scherm aan de bar en op de website, na een blik van de zaal.
                </Txt>
                <Field value={caption} onChangeText={(v) => setCaption(v.slice(0, 60))} placeholder="Een onderschrift" maxLength={60} />
                <Button title="Op de Wall" kind="bone" icon="screen" full onPress={toWall} />
              </>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ----------------------------------------------------------------------------------------------- the camera
  return (
    <View style={{ flex: 1, backgroundColor: '#050302' }}>
      {isWeb && !noCamera ? <LiveCamera ref={cam} facing={facing} active onState={setCamState} style={{ position: 'absolute', inset: 0 } as ViewStyle} /> : null}
      {noCamera ? (
        <View style={{ position: 'absolute', inset: 0 } as ViewStyle}>
          <View style={[{ width: '100%', height: '100%' }, web({ filter: LIVE_GRADE })]}>
            <Image source={PHOTOS[demo]} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          </View>
        </View>
      ) : null}
      {/* the flash falling off, as the picture will */}
      <View pointerEvents="none" style={[{ position: 'absolute', inset: 0 } as ViewStyle, web({ backgroundImage: 'radial-gradient(120% 85% at 50% 44%, rgba(0,0,0,0) 45%, rgba(0,0,0,.55) 100%), linear-gradient(180deg, rgba(5,3,2,.55) 0%, rgba(5,3,2,0) 16%, rgba(5,3,2,0) 58%, rgba(5,3,2,.92) 100%)' })]} />
      <View pointerEvents="none" {...fx('grain')} style={{ position: 'absolute', inset: 0 } as ViewStyle} />
      {/* corner marks of the frame */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 28, right: 28, top: insets.top + 86, bottom: insets.bottom + 210 } as ViewStyle}>
        {(['tl', 'tr', 'bl', 'br'] as const).map((k) => (
          <View
            key={k}
            style={{
              position: 'absolute',
              width: 22,
              height: 22,
              borderColor: 'rgba(244,236,225,0.55)',
              ...(k[0] === 't' ? { top: 0, borderTopWidth: 1 } : { bottom: 0, borderBottomWidth: 1 }),
              ...(k[1] === 'l' ? { left: 0, borderLeftWidth: 1 } : { right: 0, borderRightWidth: 1 }),
            }}
          />
        ))}
      </View>
      <View style={{ position: 'absolute', top: insets.top + 12, left: PAD, right: PAD, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton name="close" label="Sluiten" onPress={goBack} />
        <View {...fx('glass')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 36, borderRadius: R.pill, borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass }}>
          <LiveDot size={6} color={noCamera ? C.amber : C.ember} />
          <Txt v="label" size={9.5}>
            Ninja Flash
          </Txt>
          <Txt v="num" size={10} color="#FF9A3C" raw>
            {stampOf(now)}
          </Txt>
        </View>
        <IconButton name={flashOn ? 'flash' : 'flashOff'} label={flashOn ? 'Flits aan' : 'Flits uit'} tint={flashOn ? C.amber : C.ink} onPress={() => setFlashOn((f) => !f)} />
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 26, gap: 18, alignItems: 'center' }}>
        {noCamera ? (
          <View style={{ gap: 10, width: '100%', maxWidth: MAX_WIDTH }}>
            <Txt v="small" size={12} color={C.soft} align="center">
              {camState === 'denied' ? 'Geen toegang tot de camera. Kies een foto van vanavond.' : 'Geen camera gevonden. Kies een foto van vanavond.'}
            </Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: PAD }}>
              {DEMO_SHOTS.map((k) => (
                <Press key={k} onPress={() => setDemo(k)} scaleTo={0.94} accessibilityLabel={k} style={{ width: 54, height: 72, borderRadius: 10, overflow: 'hidden', borderWidth: demo === k ? 2 : 1, borderColor: demo === k ? C.amber : C.line2 }}>
                  <Image source={PHOTOS[k]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </Press>
              ))}
            </ScrollView>
          </View>
        ) : null}
        <Row gap={44}>
          <Press onPress={choose} accessibilityLabel={tr('Kies een foto')} style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass }} fxNames="glass">
            <Icon name="image" size={20} color={C.ink} />
          </Press>
          <Press onPress={shoot} scaleTo={0.9} accessibilityLabel={tr('Foto maken')} style={{ width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' }}>
            <View {...fx('chrome-ring')} style={{ position: 'absolute', inset: 0, borderRadius: 42 } as ViewStyle} />
            <View style={{ position: 'absolute', inset: 4, borderRadius: 38, backgroundColor: '#050302' } as ViewStyle} />
            <View {...fx('lacquer-btn')} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.oxblood, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(244,236,225,0.3)' }}>
              <Icon name="flash" size={24} color={C.flame} stroke={1.6} />
            </View>
          </Press>
          <Press onPress={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} disabled={noCamera} accessibilityLabel={tr('Andere camera')} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass }} fxNames="glass">
            <Icon name="flip" size={20} color={C.ink} />
          </Press>
        </Row>
        <Txt v="label" size={8.5} color={C.muted}>
          {facing === 'user' ? 'Selfie · flitsfilm' : 'Je bord · flitsfilm'}
        </Txt>
      </View>
      {pop ? <View key={pop} {...nj('pop')} style={{ position: 'absolute', inset: 0, backgroundColor: '#FFFFFF' } as ViewStyle} /> : null}
    </View>
  );
}
