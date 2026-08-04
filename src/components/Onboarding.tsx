import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PAGES = [
  {
    emoji: '🗺️',
    title: '내 주변 GA를 한눈에',
    body: '지도에서 가까운 보험 GA 지점을 바로 찾아보세요.',
  },
  {
    emoji: '🔍',
    title: '지역별, 회사별로 검색',
    body: '원하는 지역과 GA사를 골라 빠르게 비교해보세요.',
  },
  {
    emoji: '🏢',
    title: '내 지점을 직접 등록하세요',
    body: 'GA 소속이라면 내 지점을 무료로 등록하고 홍보할 수 있어요.',
  },
];

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastPage = activeIndex === PAGES.length - 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== activeIndex) setActiveIndex(index);
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isLastPage) {
      onFinish();
      return;
    }
    scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * (activeIndex + 1), animated: true });
  };

  const handleSkip = () => {
    Haptics.selectionAsync().catch(() => {});
    onFinish();
  };

  const handleBack = () => {
    Haptics.selectionAsync().catch(() => {});
    if (activeIndex > 0) {
      scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * (activeIndex - 1), animated: true });
      return;
    }
    // 첫 페이지에서 뒤로가기 - 앱을 바로 종료시키기보다 온보딩을 건너뛰고 본 화면으로 보낸다.
    onFinish();
  };

  // 온보딩이 떠 있는 동안은 이 핸들러가 App.tsx의 기본 뒤로가기 처리보다 먼저 잡는다
  // (React Native BackHandler는 나중에 등록된 리스너를 먼저 호출한다).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [activeIndex]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.skip, { top: insets.top + 12 }]}
        onPress={handleSkip}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.skipText}>건너뛰기</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.scroll}
      >
        {PAGES.map((page) => (
          <View key={page.title} style={[styles.page, { width: SCREEN_WIDTH }]}>
            <Text style={styles.emoji}>{page.emoji}</Text>
            <Text style={styles.title}>{page.title}</Text>
            <Text style={styles.body}>{page.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots}>
          {PAGES.map((page, i) => (
            <View key={page.title} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextButtonText}>{isLastPage ? '시작하기' : '다음'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  skip: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textDisabled,
  },
  scroll: {
    flex: 1,
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSub,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: 20,
    paddingTop: 8,
    paddingHorizontal: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.primary,
  },
  nextButton: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  nextButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
