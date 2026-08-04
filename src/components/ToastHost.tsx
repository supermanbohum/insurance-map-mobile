import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../config/theme';
import { toast } from '../utils/toast';

const VISIBLE_MS = 2500;

/**
 * 인앱 토스트 오버레이 - iOS/Android 동일한 UX. toast.show()를 구독해 하단에
 * 잠깐 떠올랐다 사라진다. 여러 번 호출되면 타이머를 리셋해 최신 메시지를 보여준다.
 */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = toast.subscribe((msg) => {
      setMessage(msg);
      if (hideTimer.current) clearTimeout(hideTimer.current);

      opacity.setValue(0);
      translateY.setValue(8);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();

      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }).start(
          ({ finished }) => {
            if (finished) setMessage(null);
          }
        );
      }, VISIBLE_MS);
    });

    return () => {
      unsubscribe();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [opacity, translateY]);

  if (message === null) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { bottom: insets.bottom + 28, opacity, transform: [{ translateY }] }]}
    >
      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 32,
    right: 32,
    alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.92)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    zIndex: 40,
  },
  text: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
