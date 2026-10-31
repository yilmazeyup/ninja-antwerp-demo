import { AREAS, seatedAt, tableById, TABLES, type AreaId } from '@ninja/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { SeatStage } from '../components/SeatStage';
import { Screen } from '../components/Screen';
import { Button, Card, Chip, Kicker, Row, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useApp } from '../state/app';
import { C, R } from '../theme';

const ORDER: AreaId[] = ['fire', 'banquette', 'center', 'bar', 'window', 'terrace'];

/**
 * Where to sit, chosen in the room itself: the same model as the panel's, with the tables that are free right now
 * and fit the group. From the line it becomes her wish; when Noor calls her in, it is the table she gets.
 */
export default function Seat() {
  const params = useLocalSearchParams<{ table?: string }>();
  const { ev, minute, saved, update, line } = useApp();
  const fixed = params.table ?? line?.call?.table ?? null;
  const [selected, setSelected] = useState<string | null>(fixed);
  const taken = useMemo(() => new Set(seatedAt(ev, minute).map((g) => g.table ?? '')), [ev, minute]);
  const size = line?.joined.size ?? saved.size;
  const fits = (t: (typeof TABLES)[number]) => t.seats >= Math.min(size, 4) && t.seats <= size + 3 && (t.area !== 'fire' || size <= 2);
  const table = selected ? tableById(selected) : null;
  const free = TABLES.filter((t) => fits(t) && !taken.has(t.id));

  return (
    <Screen back title={fixed ? 'Je plaats' : 'Kies je plaats'} kicker="De zaal" serif={fixed ? 'Hier zit je straks.' : 'Wat nu vrij is en bij jullie past.'}>
      <View style={{ height: 380, borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.line2, backgroundColor: '#0E0907', justifyContent: 'center' }}>
        <SeatStage taken={fixed ? new Set(TABLES.filter((t) => t.id !== fixed).map((t) => t.id)) : taken} selected={selected} onSelect={fixed ? () => {} : setSelected} fits={fits} group={size} />
      </View>

      {!fixed ? (
        <View style={{ gap: 10 }}>
          <Kicker>{tr('{n} plaatsen vrij voor {size}').replace('{n}', String(free.length)).replace('{size}', String(size))}</Kicker>
          <Row gap={8} wrap>
            {ORDER.map((a) => {
              const count = free.filter((t) => t.area === a).length;
              return (
                <Chip
                  key={a}
                  small
                  label={`${tr(AREAS[a].label)} · ${count}`}
                  raw
                  on={table?.area === a}
                  onPress={() => {
                    const first = free.find((t) => t.area === a);
                    if (first) setSelected(first.id);
                  }}
                />
              );
            })}
          </Row>
        </View>
      ) : null}

      {table ? (
        <Card pad={20}>
          <Kicker color={C.amber}>{AREAS[table.area].label}</Kicker>
          <Txt v="display" style={{ marginTop: 8 }}>
            {table.label}
          </Txt>
          <Txt v="small" color={C.soft} style={{ marginTop: 4 }}>
            {AREAS[table.area].line}
          </Txt>
          <Txt v="num" size={11} color={C.muted} style={{ marginTop: 8 }} raw>
            {`${table.seats} ${tr(table.seats === 1 ? 'plaats' : 'plaatsen')}`}
          </Txt>
          {!fixed ? (
            <Button
              title={line ? 'Dit wordt mijn wens' : 'Hier wil ik zitten'}
              icon="seat"
              full
              style={{ marginTop: 16 }}
              onPress={() => {
                update({ seat: table.area });
                tap('success');
                if (!line) router.replace('/rij');
                else router.back();
              }}
            />
          ) : null}
        </Card>
      ) : (
        <Txt v="small" color={C.muted}>
          Tik op een lichte tafel: die is nu vrij en past bij jullie.
        </Txt>
      )}
      <View style={{ height: 4 }} />
    </Screen>
  );
}
