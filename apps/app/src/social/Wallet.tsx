import { View } from 'react-native';

import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';
import { Press, Row, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { C } from '../theme';
import { setSocial, useSocial } from './store';
import { t } from './util';

/** Add the card to a wallet (demo): a pass would be signed by Ninja's own Apple and Google accounts. */
export function WalletButtons() {
  const social = useSocial();
  const toast = useToast();
  const add = (which: string) => {
    setSocial({ wallet: true });
    tap('success');
    toast(t('In je {wallet}', { wallet: which }), { text: tr('Demo: in de echte app komt je Clan-kaart als pas in je wallet, met je rang en je Ki.'), icon: 'wallet' });
  };
  if (social.wallet)
    return (
      <Row gap={10} style={{ justifyContent: 'center', paddingVertical: 6 }}>
        <Icon name="check" size={15} color={C.ok} stroke={2} />
        <Txt v="small" color={C.soft}>
          Je kaart zit in je wallet.
        </Txt>
      </Row>
    );
  return (
    <Row gap={10}>
      <Press onPress={() => add('Apple Wallet')} accessibilityLabel="Apple Wallet" style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#000000', borderWidth: 1, borderColor: 'rgba(244,236,225,0.28)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon name="apple" size={18} color="#FFFFFF" stroke={1.6} />
        <View>
          <Txt v="small" size={9} color="rgba(255,255,255,0.75)" style={{ lineHeight: 10 }}>
            Toevoegen aan
          </Txt>
          <Txt v="h3" size={14} color="#FFFFFF" raw style={{ lineHeight: 16 }}>
            Apple Wallet
          </Txt>
        </View>
      </Press>
      <Press onPress={() => add('Google Wallet')} accessibilityLabel="Google Wallet" style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#1F1F1F', borderWidth: 1, borderColor: 'rgba(244,236,225,0.28)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon name="wallet" size={18} color="#FFFFFF" stroke={1.6} />
        <View>
          <Txt v="small" size={9} color="rgba(255,255,255,0.75)" style={{ lineHeight: 10 }}>
            Toevoegen aan
          </Txt>
          <Txt v="h3" size={14} color="#FFFFFF" raw style={{ lineHeight: 16 }}>
            Google Wallet
          </Txt>
        </View>
      </Press>
    </Row>
  );
}
