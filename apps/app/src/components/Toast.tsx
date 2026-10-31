import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, fx, isWeb, MAX_WIDTH } from '../theme';
import { Icon, type IconName } from './Icon';
import { nativeDriver, Press, Txt } from './ui';

type Note = { id: number; title: string; text?: string; icon?: IconName; onPress?: () => void };
type Show = (title: string, options?: { text?: string; icon?: IconName; onPress?: () => void }) => void;

const Context = createContext<Show>(() => {});

/** Notifications slide down like a push message: black glass, an ember icon. */
export function ToastProvider({ children }: PropsWithChildren) {
  const [note, setNote] = useState<Note | null>(null);
  const queue = useRef<Note[]>([]);
  const y = useRef(new Animated.Value(-150)).current;
  const insets = useSafeAreaInsets();
  const id = useRef(0);

  const next = useCallback(() => {
    const n = queue.current.shift() ?? null;
    setNote(n);
    if (!n) return;
    y.setValue(-150);
    Animated.timing(y, { toValue: 0, duration: 420, useNativeDriver: nativeDriver }).start();
  }, [y]);

  const show = useCallback<Show>(
    (title, options) => {
      queue.current.push({ id: ++id.current, title, ...options });
      if (!note) next();
    },
    [note, next],
  );

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => {
      Animated.timing(y, { toValue: -150, duration: 280, useNativeDriver: nativeDriver }).start(() => next());
    }, 4200);
    return () => clearTimeout(t);
  }, [note, next, y]);

  return (
    <Context.Provider value={show}>
      {children}
      {note ? (
        <Animated.View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + (isWeb ? 10 : 4), left: 12, right: 12, alignItems: 'center', zIndex: 200, transform: [{ translateY: y }] }}>
          <Press
            onPress={() => {
              note.onPress?.();
              Animated.timing(y, { toValue: -150, duration: 220, useNativeDriver: nativeDriver }).start(() => next());
            }}
            fxNames="glass-strong"
            style={{ width: '100%', maxWidth: MAX_WIDTH - 24, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 22, borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass }}
          >
            <View {...fx('oxblood')} style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.oxblood, borderWidth: 1, borderColor: C.line2 }}>
              <Icon name={note.icon ?? 'fire'} size={18} color={C.flame} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3" size={14.5}>
                {note.title}
              </Txt>
              {note.text ? (
                <Txt v="small" color={C.soft} numberOfLines={2}>
                  {note.text}
                </Txt>
              ) : null}
            </View>
          </Press>
        </Animated.View>
      ) : null}
    </Context.Provider>
  );
}

export const useToast = () => useContext(Context);
