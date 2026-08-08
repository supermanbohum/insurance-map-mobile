import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

/**
 * 브랜드 스플래시 — SPEC-024(D-024) 구현.
 * 원칙: ① 로고 무단절 — 실루엣은 네이티브 스플래시부터 떠 있고 JS에서 **다시 fade-in 하지 않는다**
 *       (opacity 1 고정, 위치·크기 네이티브와 동일). ② 같은 자리 crossfade 금지 — 워드마크/태그라인은
 *       각자 자리에서 220ms 스태거로 순차 등장만 한다(반투명 겹침 순간 제거).
 * 배경 #2472EC 단색(런처 아이콘 배경과 동일 → 아이콘 탭→스플래시 연속). 전부 opacity·transform.
 */

const BG = '#2472EC'; // app.json splash.backgroundColor / adaptiveIcon.backgroundColor와 동일
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export function AnimatedSplash({ visible, onHidden }: { visible: boolean; onHidden?: () => void }) {
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordTranslateY = useRef(new Animated.Value(14)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const tagTranslateY = useRef(new Animated.Value(10)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const overlayScale = useRef(new Animated.Value(1)).current;
  const hasFadedOut = useRef(false);

  // 실루엣은 정적(네이티브에서 이어받음). 워드마크(200~650) → 태그라인(420~870, 220ms 스태거)만 등장.
  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(wordOpacity, { toValue: 1, duration: 450, easing: EASE, useNativeDriver: true }),
          Animated.timing(wordTranslateY, { toValue: 0, duration: 450, easing: EASE, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(420),
        Animated.parallel([
          Animated.timing(tagOpacity, { toValue: 0.85, duration: 450, easing: EASE, useNativeDriver: true }),
          Animated.timing(tagTranslateY, { toValue: 0, duration: 450, easing: EASE, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, [wordOpacity, wordTranslateY, tagOpacity, tagTranslateY]);

  // 앱 준비(visible=false) 시 전체 컨테이너 페이드아웃 + 살짝 확대(1→1.02)로 WebView에 전환.
  useEffect(() => {
    if (visible || hasFadedOut.current) return;
    hasFadedOut.current = true;
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(overlayScale, { toValue: 1.02, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onHidden?.();
    });
  }, [visible, overlayOpacity, overlayScale, onHidden]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.fill, { opacity: overlayOpacity, transform: [{ scale: overlayScale }] }]}
    >
      {/* 실루엣: 화면 중앙(네이티브와 동일 위치·크기). 애니메이션 없음. */}
      <View style={styles.center}>
        <Animated.Image
          source={require('../../assets/splash-icon.png')}
          resizeMode="contain"
          style={styles.logo}
        />
      </View>

      {/* 워드마크·태그라인: 중앙 아래에 절대 배치(실루엣 중심 위치를 흔들지 않음). */}
      <View style={styles.textBlock} pointerEvents="none">
        <Animated.Text
          style={[styles.wordmark, { opacity: wordOpacity, transform: [{ translateY: wordTranslateY }] }]}
        >
          보험맵
        </Animated.Text>
        <Animated.View style={{ opacity: tagOpacity, transform: [{ translateY: tagTranslateY }] }}>
          <Text style={styles.tagline}>대한민국 보험인의 지도</Text>
          <Text style={styles.tagline}>70만 보험인의 선택</Text>
        </Animated.View>
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
    backgroundColor: BG,
    zIndex: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
  // 실루엣(화면 중앙) 아래 24dp 지점부터 텍스트. top 50% + 실루엣 하단 여유(72).
  textBlock: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: 72,
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 19,
  },
});
