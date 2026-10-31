import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';

import { TabBar } from '../../components/TabBar';
import { C } from '../../theme';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg }, animation: 'fade' }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="menu" />
        <Tabs.Screen name="match" />
        <Tabs.Screen name="clan" />
      </Tabs>
    </View>
  );
}
