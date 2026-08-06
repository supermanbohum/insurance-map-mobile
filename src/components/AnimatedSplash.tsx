import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * 프리미엄 브랜드 스플래시 (V2 리뉴얼).
 * 컨셉: 밝은 블루 그라데이션 → "보험맵" 등장 → 대한민국 보험인의 지도 → 70만 보험인의 선택.
 * 이전의 원형 glow/이상한 배경은 전면 제거. 앱 아이콘의 로열블루와 팔레트를 통일한다.
 */

// 앱 아이콘(로열블루 그라데이션)과 맞춘 색상.
const GRADIENT = ['#3E8BFF', '#2472EC', '#1553C4'] as const;

export function AnimatedSplash({ visible, onHidden }: { visible: boolean; onHidden?: () => void }) {
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.9)).current;
  const heroTranslateY = useRef(new Animated.Value(12)).current;
  const line1Opacity = useRef(new Animated.Value(0)).current;
  const line2Opacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const hasFadedOut = useRef(false);

  // 등장 시퀀스: 보험맵 → 대한민국 보험인의 지도 → 70만 보험인의 선택.
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(heroScale, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(heroTranslateY, { toValue: 0, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(line1Opacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(650),
      Animated.timing(line1Opacity, { toValue: 0, duration: 360, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(line2Opacity, { toValue: 1, duration: 460, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [heroOpacity, heroScale, heroTranslateY, line1Opacity, line2Opacity]);

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
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      >
        <View style={styles.center}>
          <Animated.Text
            style={[
              styles.brand,
              { opacity: heroOpacity, transform: [{ scale: heroScale }, { translateY: heroTranslateY }] },
            ]}
          >
            보험맵
          </Animated.Text>

          <View style={styles.taglineZone}>
            <Animated.Text style={[styles.tagline, { opacity: line1Opacity }]}>
              대한민국 보험인의 지도
            </Animated.Text>
            <Animated.Text style={[styles.tagline, styles.taglineOverlay, { opacity: line2Opacity }]}>
              70만 보험인의 선택
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
  brand: {
    fontSize: 46,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  taglineZone: {
    marginTop: 18,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.3,
  },
  taglineOverlay: {
    position: 'absolute',
  },
});
