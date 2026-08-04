import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../config/theme';

/**
 * WebView 상단 로딩 진행바 - onLoadProgress(0~1)를 받아 채우고,
 * 로딩이 끝나면(visible=false) 자연스럽게 페이드아웃된 뒤 폭을 리셋한다.
 */
export function LoadingBar({ progress, visible }: { progress: number; visible: boolean }) {
  const insets = useSafeAreaInsets();
  const widthAnim = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [progress, widthAnim]);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? 120 : 260,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) widthAnim.setValue(0);
    });
  }, [visible, opacity, widthAnim]);

  const width = widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View pointerEvents="none" style={[styles.track, { top: insets.top, opacity }]}>
      <Animated.View style={[styles.bar, { width }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'transparent',
    zIndex: 6,
  },
  bar: {
    height: 3,
    backgroundColor: colors.primary,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
});
