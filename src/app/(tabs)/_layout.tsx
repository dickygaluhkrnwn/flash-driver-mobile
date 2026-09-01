import { Tabs } from 'expo-router';
import { BottomNav } from '@/components/BottomNav';
import { Header } from '@/components/Header';

export default function TabsLayout() {
  return (
    <Tabs 
      tabBar={(props: any) => <BottomNav {...props} />}
      screenOptions={{
        headerShown: true, 
        headerTransparent: true,
        header: ({ route, options }) => {
          let title = 'Portal Mitra';
          if (options.title) title = options.title;
          else if (route.name === 'dashboard') title = 'Beranda';
          else if (route.name === 'orders') title = 'Riwayat Order';
          else if (route.name === 'fleet') title = 'Armada Vendor';
          else if (route.name === 'radar') title = 'Radar Pesanan';
          else if (route.name === 'wallet') title = 'Dompet & Komisi';
          else if (route.name === 'profile') title = 'Akun Saya';

          return <Header title={title} />;
        }
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Beranda' }} />
      <Tabs.Screen name="orders" options={{ title: 'Riwayat' }} />
      <Tabs.Screen name="fleet" options={{ title: 'Armada' }} />
      <Tabs.Screen name="radar" options={{ title: 'Radar Pesanan', headerShown: false }} />
      <Tabs.Screen name="wallet" options={{ title: 'Dompet & Komisi', headerShown: false }} />
      <Tabs.Screen name="profile" options={{ title: 'Akun Saya', headerShown: false }} />
    </Tabs>
  );
}
