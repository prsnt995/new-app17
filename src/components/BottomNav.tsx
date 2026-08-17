import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useApp } from '@/context/AppContext';

export type NavTab = 'home' | 'orders' | 'cart' | 'wishlist' | 'profile';

interface BottomNavProps {
  currentTab?: NavTab;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { cartCount, wishlist, t, isDarkMode } = useApp();

  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  const getActiveTab = (): NavTab => {
    if (currentTab) return currentTab;
    if (pathname === '/orders') return 'orders';
    if (pathname === '/cart') return 'cart';
    if (pathname === '/wishlist') return 'wishlist';
    if (pathname === '/profile') return 'profile';
    return 'home';
  };

  const active = getActiveTab();

  const handleNavigate = (tab: NavTab) => {
    if (tab === active) return;
    switch (tab) {
      case 'home':
        router.replace('/');
        break;
      case 'orders':
        router.replace('/orders');
        break;
      case 'cart':
        router.replace('/cart');
        break;
      case 'wishlist':
        router.replace('/wishlist');
        break;
      case 'profile':
        router.replace('/profile');
        break;
    }
  };

  return (
    <View style={styles.bottomNav}>
      {/* Home */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.8}
        onPress={() => handleNavigate('home')}
      >
        <View style={active === 'home' ? styles.activeNav : styles.navIconWrapper}>
          <Text style={active === 'home' ? styles.activeNavIcon : styles.navIconInactive}>
            ⌂
          </Text>
        </View>
        <Text style={active === 'home' ? styles.activeNavText : styles.navText}>{t('navHome')}</Text>
      </TouchableOpacity>

      {/* Orders */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.8}
        onPress={() => handleNavigate('orders')}
      >
        <View style={active === 'orders' ? styles.activeNav : styles.navIconWrapper}>
          <Text style={active === 'orders' ? styles.activeNavIcon : styles.navIconInactive}>
            📦
          </Text>
        </View>
        <Text style={active === 'orders' ? styles.activeNavText : styles.navText}>{t('navOrders')}</Text>
      </TouchableOpacity>

      {/* Cart */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.8}
        onPress={() => handleNavigate('cart')}
      >
        <View style={active === 'cart' ? styles.activeNav : styles.navIconWrapper}>
          <Text style={active === 'cart' ? styles.activeNavIcon : styles.navIconInactive}>
            🛒
          </Text>
          {cartCount > 0 && (
            <View style={styles.navBadge}>
              <Text style={styles.navBadgeText}>{cartCount}</Text>
            </View>
          )}
        </View>
        <Text style={active === 'cart' ? styles.activeNavText : styles.navText}>{t('navCart')}</Text>
      </TouchableOpacity>

      {/* Wishlist */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.8}
        onPress={() => handleNavigate('wishlist')}
      >
        <View style={active === 'wishlist' ? styles.activeNav : styles.navIconWrapper}>
          <Text style={active === 'wishlist' ? styles.activeNavIcon : styles.navIconInactive}>
            ♥
          </Text>
          {wishlist.length > 0 && (
            <View style={styles.navBadgeWishlist}>
              <Text style={styles.navBadgeText}>{wishlist.length}</Text>
            </View>
          )}
        </View>
        <Text style={active === 'wishlist' ? styles.activeNavText : styles.navText}>
          {t('navWishlist')}
        </Text>
      </TouchableOpacity>

      {/* Profile */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.8}
        onPress={() => handleNavigate('profile')}
      >
        <View style={active === 'profile' ? styles.activeNav : styles.navIconWrapper}>
          <Text style={active === 'profile' ? styles.activeNavIcon : styles.navIconInactive}>
            👤
          </Text>
        </View>
        <Text style={active === 'profile' ? styles.activeNavText : styles.navText}>
          {t('navProfile')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const getStyles = (isDark: boolean) => {
  const bg = isDark ? '#1E1E1E' : '#FFFFFF';
  const border = isDark ? '#333333' : '#EFEBE4';
  const textSub = isDark ? '#A0A0A0' : '#8A857A';
  const activeTint = isDark ? '#D4AF37' : '#C88D2B';

  return StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIconWrapper: {
    position: 'relative',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNav: {
    position: 'relative',
    backgroundColor: activeTint,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNavIcon: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  navIconInactive: {
    fontSize: 20,
    color: textSub,
  },
  activeNavText: {
    fontSize: 10,
    fontWeight: '800',
    color: activeTint,
    marginTop: 2,
  },
  navText: {
    fontSize: 10,
    color: textSub,
    fontWeight: '600',
    marginTop: 2,
  },
  navBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: activeTint,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: bg,
  },
  navBadgeWishlist: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#E53935',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: bg,
  },
  navBadgeText: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
};
