import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * 프리미엄 브랜드 스플래시 (V2).
 * 시퀀스: ① 보험맵 로고 등장 → ② "대한민국 보험인의 지도 / 70만 보험인의 선택"(함께)
 *          → ③ "보험맵" 워드마크(피날레).
 * 로고/아이콘/스플래시 모두 동일 브랜드 아이덴티티(assets/icon.png)를 사용한다.
 * 이전의 원형 glow/이상한 배경은 전면 제거. Android/iOS 동일 동작(Animated + LinearGradient).
 */

// 아이콘(로열블루)보다 밝은 스카이블루 그라데이션 → 아이콘이 또렷하게 떠 보이게.
const GRADIENT = ['#7DB4FF', '#4A93F5', '#2E80F5'] as const;

export function AnimatedSplash({ visible, onHidden }: { visible: boolean; onHidden?: () => void }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.86)).current;
  const logoTranslateY = useRef(new Animated.Value(10)).current;
  const taglinesOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkScale = useRef(new Animated.Value(0.92)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const hasFadedOut = useRef(false);

  // ① 로고 → ② 태그라인(함께) → ③ 보험맵 워드마크.
  useEffect(() => {
    Animated.sequence([
      // ① 로고 등장
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 680, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(logoTranslateY, { toValue: 0, duration: 680, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      // ② 두 태그라인 함께 등장 + 잠시 유지
      Animated.timing(taglinesOpacity, { toValue: 1, duration: 460, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(700),
      // ③ 태그라인 사라지고 보험맵 워드마크 등장
      Animated.parallel([
        Animated.timing(taglinesOpacity, { toValue: 0, duration: 360, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(wordmarkOpacity, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(wordmarkScale, { toValue: 1, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, [logoOpacity, logoScale, logoTranslateY, taglinesOpacity, wordmarkOpacity, wordmarkScale]);

  // visible=false가 되면 오버레이만 부드럽게 사라진다.
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
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.fill, { opacity: overlayOpacity }]}
    >
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
        <View style={styles.center}>
          <Animated.Image
            source={require('../../assets/icon.png')}
            resizeMode="contain"
            style={[
              styles.logo,
              { opacity: logoOpacity, transform: [{ scale: logoScale }, { translateY: logoTranslateY }] },
            ]}
          />

          {/* 중앙 존: 태그라인(함께) ↔ 보험맵 워드마크가 교차. 레이아웃 흔들림 방지 위해 고정 높이. */}
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
      </LinearGradient>
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
    zIndex: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 132,
    height: 132,
  },
  midZone: {
    marginTop: 26,
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
