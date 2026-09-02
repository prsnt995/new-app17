import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, useWindowDimensions } from 'react-native';

export function ScreenLoader({ message = 'Loading...' }: { message?: string }) {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, { opacity: pulse }]}>
        <Text style={styles.icon}>⟳</Text>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={skel.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={[skel.card, { opacity: pulse }]}>
          <View style={skel.image} />
          <View style={skel.line} />
          <View style={[skel.line, skel.shortLine]} />
          <View style={skel.price} />
        </Animated.View>
      ))}
    </View>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={list.card}>
          <View style={list.avatar} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={list.line} />
            <View style={[list.line, { width: '60%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 28, paddingHorizontal: 32,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: '#EAE6DF',
  },
  icon: { fontSize: 28, marginBottom: 8, color: '#C88D2B' },
  message: { fontSize: 13, fontWeight: '700', color: '#706D65' },
});

const skel = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: '#EAE6DF', gap: 8 },
  image: { height: 110, borderRadius: 10, backgroundColor: '#F0ECE1' },
  line: { height: 12, borderRadius: 6, backgroundColor: '#F0ECE1' },
  shortLine: { width: '65%' },
  price: { height: 14, width: '45%', borderRadius: 6, backgroundColor: '#E8F5E9', marginTop: 4 },
});

const list = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EAE6DF' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0ECE1' },
  line: { height: 12, borderRadius: 6, backgroundColor: '#F0ECE1' },
});
