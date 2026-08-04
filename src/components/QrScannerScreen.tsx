import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../config/theme';

/**
 * 네이티브 QR 스캐너 오버레이. 웹의 open-qr-scanner 요청으로 열리고,
 * 코드를 인식하면 onResult(값), 닫으면 onCancel을 호출한다(한 번만).
 */
export function QrScannerScreen({
  onResult,
  onCancel,
}: {
  onResult: (value: string) => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const handledRef = useRef(false);

  // 권한이 없고 다시 물어볼 수 있으면 자동 요청.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleScanned = (result: BarcodeScanningResult) => {
    if (handledRef.current || !result.data) return;
    handledRef.current = true;
    onResult(result.data);
  };

  return (
    <View style={styles.overlay}>
      {permission?.granted ? (
        <>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScanned}
          />
          <View pointerEvents="none" style={styles.frameWrap}>
            <View style={styles.frame} />
            <Text style={styles.hint}>QR 코드를 사각형 안에 맞춰주세요</Text>
          </View>
        </>
      ) : (
        <View style={styles.center}>
          <Text style={styles.msg}>QR 스캔을 위해 카메라 권한이 필요합니다.</Text>
          {permission && !permission.granted && permission.canAskAgain && (
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.85}>
              <Text style={styles.permBtnText}>권한 허용</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.close, { top: insets.top + 12 }]}
        onPress={onCancel}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.closeText}>닫기</Text>
      </TouchableOpacity>
    </View>
  );
}

const FRAME = 240;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 30,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  msg: {
    color: colors.white,
    fontSize: 15,
    textAlign: 'center',
  },
  permBtn: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  permBtnText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  frameWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME,
    height: FRAME,
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  hint: {
    marginTop: 20,
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  close: {
    position: 'absolute',
    right: 20,
    padding: 8,
  },
  closeText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
