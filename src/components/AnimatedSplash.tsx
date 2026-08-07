import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

/**
 * 브랜드 스플래시 (A-012 이중 스플래시/타일경계 해결).
 * - 네이티브 스플래시(expo-splash-screen)는 로고 없이 **단색 파랑**만 → 겹침(이중 로고) 제거.
 * - JS 스플래시는 같은 단색 파랑 위에 **흰 한반도(투명 배경 에셋)**를 애니메이션 → 파란 사각형
 *   타일 경계 소멸(오너 지적 #2/#4). 배경/색은 네이티브와 정확히 일치.
 * - 시퀀스: 흰 한반도 등장 → "대한민국 보험인의 지도 / 70만 보험인의 선택"(함께) → "보험맵".
 * ⚠️ 최종 애니메이션/색/에셋은 디자인 스펙(D-024) 확정 시 교체. 현재는 구조 결함 해결 + 임시 톤.
 */

// 네이티브 스플래시 backgroundColor(app.json #2E80F5)와 **동일**해야 핸드오프가 안 보인다.
const BG = '#2E80F5';

export function AnimatedSplash({ visible, onHidden }: { visible: boolean; onHidden?: () => void }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoTranslateY = useRef(new Animated.Value(10)).current;
  const taglinesOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkScale = useRef(new Animated.Value(0.92)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const hasFadedOut = useRef(false);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 680, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(logoTranslateY, { toValue: 0, duration: 680, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(taglinesOpacity, { toValue: 1, duration: 460, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(700),
      Animated.parallel([
        Animated.timing(taglinesOpacity, { toValue: 0, duration: 360, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(wordmarkOpacity, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(wordmarkScale, { toValue: 1, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, [logoOpacity, logoScale, logoTranslateY, taglinesOpacity, wordmarkOpacity, wordmarkScale]);

  useEffect(() => {
    if (visible || hasFadedOut.current) return;
    hasFadedOut.current = true;
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onHidden?.();
    });
  }, [visible, overlayOpacity, onHidden]);

  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.fill, { opacity: overlayOpacity }]}>
      <View style={styles.center}>
        <Animated.Image
          source={require('../../assets/android-icon-foreground.png')}
          resizeMode="contain"
          style={[
            styles.logo,
            { opacity: logoOpacity, transform: [{ scale: logoScale }, { translateY: logoTranslateY }] },
          ]}
        />
        <View style={styles.midZone}>
          <Animated.View style={[styles.midItem, { opacity: taglinesOpacity }]}>
            <Text style={styles.tagline}>대한민국 보험인의 지도</Text>
            <Text style={styles.tagline}>70만 보험인의 선택</Text>
          </Animated.View>
          <Animated.Text
            style={[styles.wordmark, { opacity: wordmarkOpacity, transform: [{ scale: wordmarkScale }] }]}
          >
            보험맵
          </Animated.Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BG, // 네이티브 스플래시와 동일 단색
    zIndex: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 340,
    height: 340,
  },
  midZone: {
    marginTop: 8,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  midItem: {
    position: 'absolute',
    alignItems: 'center',
  },
  tagline: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.3,
    lineHeight: 22,
  },
  wordmark: {
    position: 'absolute',
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
