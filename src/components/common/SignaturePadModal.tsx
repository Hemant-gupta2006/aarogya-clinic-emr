import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  LayoutChangeEvent,
  StatusBar,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { X, RotateCcw, Undo2, Check, PenTool } from 'lucide-react-native';

interface Point {
  x: number;
  y: number;
}

interface SignaturePadModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
  initialSignature?: string | null;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  visible,
  onClose,
  onSave,
  initialSignature,
}) => {
  const insets = useSafeAreaInsets();
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [canvasLayout, setCanvasLayout] = useState<{ width: number; height: number }>({
    width: 360,
    height: 280,
  });

  const activeStrokeRef = useRef<Point[]>([]);

  // Pre-load existing vector strokes if available
  useEffect(() => {
    if (visible) {
      if (initialSignature && initialSignature.startsWith('draw:')) {
        try {
          const parsed = JSON.parse(initialSignature.substring(5));
          if (Array.isArray(parsed.paths)) {
            setStrokes(parsed.paths);
          }
        } catch {
          setStrokes([]);
        }
      } else {
        setStrokes([]);
      }
      activeStrokeRef.current = [];
      setCurrentStroke([]);
    }
  }, [visible, initialSignature]);

  const pointsToSvgPath = useCallback((points: Point[]): string => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${(points[0].x + 0.5).toFixed(1)} ${(points[0].y + 0.5).toFixed(1)}`;
    }
    return points.reduce((acc, point, index) => {
      const x = point.x.toFixed(1);
      const y = point.y.toFixed(1);
      return index === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const pt = { x: locationX, y: locationY };
        activeStrokeRef.current = [pt];
        setCurrentStroke([pt]);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const pt = { x: locationX, y: locationY };
        activeStrokeRef.current.push(pt);
        setCurrentStroke([...activeStrokeRef.current]);
      },
      onPanResponderRelease: () => {
        if (activeStrokeRef.current.length > 0) {
          const finishedStroke = [...activeStrokeRef.current];
          setStrokes((prev) => [...prev, finishedStroke]);
        }
        activeStrokeRef.current = [];
        setCurrentStroke([]);
      },
      onPanResponderTerminate: () => {
        if (activeStrokeRef.current.length > 0) {
          const finishedStroke = [...activeStrokeRef.current];
          setStrokes((prev) => [...prev, finishedStroke]);
        }
        activeStrokeRef.current = [];
        setCurrentStroke([]);
      },
    })
  ).current;

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setCanvasLayout({ width, height });
    }
  };

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setStrokes([]);
    activeStrokeRef.current = [];
    setCurrentStroke([]);
  };

  const handleSave = () => {
    if (strokes.length === 0) {
      onClose();
      return;
    }

    const allPathsSvg = strokes.map(pointsToSvgPath).join(' ');
    const signaturePayload = JSON.stringify({
      width: Math.round(canvasLayout.width),
      height: Math.round(canvasLayout.height),
      paths: strokes,
      svg: allPathsSvg,
    });

    onSave(`draw:${signaturePayload}`);
    handleClear();
    onClose();
  };

  const hasContent = strokes.length > 0 || currentStroke.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.screenContainer,
          {
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerIconCircle}>
              <PenTool size={20} color={theme.colors.primaryDark} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Doctor Digital Signature</Text>
              <Text style={styles.headerSubtitle}>
                Sign smoothly inside the canvas below
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.closeHeaderBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Large Signature Canvas Container */}
        <View style={styles.canvasWrapper}>
          <View
            style={styles.canvasContainer}
            onLayout={handleCanvasLayout}
            {...panResponder.panHandlers}
          >
            <Svg
              style={styles.svgCanvas}
              width={canvasLayout.width}
              height={canvasLayout.height}
              pointerEvents="none"
            >
              {strokes.map((stroke, index) => (
                <Path
                  key={`stroke-${index}`}
                  d={pointsToSvgPath(stroke)}
                  stroke="#0F172A"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
              {currentStroke.length > 0 && (
                <Path
                  d={pointsToSvgPath(currentStroke)}
                  stroke="#0F172A"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}
            </Svg>

            {!hasContent && (
              <View style={styles.placeholderOverlay} pointerEvents="none">
                <PenTool size={36} color="#CBD5E1" />
                <Text style={styles.placeholderMainText}>Draw Signature with Finger or Stylus</Text>
                <Text style={styles.placeholderSubText}>Touch and move anywhere on the screen</Text>
              </View>
            )}

            {/* Signature Baseline Guide */}
            <View style={styles.baselineGuide} pointerEvents="none">
              <View style={styles.baselineLine} />
              <Text style={styles.baselineLabel}>Signature Line</Text>
            </View>
          </View>
        </View>

        {/* Bottom Actions Toolbar */}
        <View style={styles.bottomToolbar}>
          <View style={styles.leftTools}>
            <TouchableOpacity
              style={[styles.toolBtn, strokes.length === 0 && styles.toolBtnDisabled]}
              onPress={handleUndo}
              disabled={strokes.length === 0}
              activeOpacity={0.7}
            >
              <Undo2 size={16} color={strokes.length === 0 ? theme.colors.textLight : theme.colors.text} />
              <Text
                style={[
                  styles.toolBtnText,
                  strokes.length === 0 && { color: theme.colors.textLight },
                ]}
              >
                Undo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, !hasContent && styles.toolBtnDisabled]}
              onPress={handleClear}
              disabled={!hasContent}
              activeOpacity={0.7}
            >
              <RotateCcw size={16} color={!hasContent ? theme.colors.textLight : theme.colors.text} />
              <Text
                style={[
                  styles.toolBtnText,
                  !hasContent && { color: theme.colors.textLight },
                ]}
              >
                Clear
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rightTools}>
            <TouchableOpacity style={styles.cancelActionBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelActionText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveActionBtn, !hasContent && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!hasContent}
              activeOpacity={0.85}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.saveActionText}>Save Signature</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'space-between',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeHeaderBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBorder,
  },
  canvasWrapper: {
    flex: 1,
    marginVertical: theme.spacing.md,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.xl,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    position: 'relative',
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  svgCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  placeholderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderMainText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  placeholderSubText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  baselineGuide: {
    position: 'absolute',
    bottom: 40,
    left: 30,
    right: 30,
    alignItems: 'center',
  },
  baselineLine: {
    width: '100%',
    height: 1.5,
    backgroundColor: '#E2E8F0',
  },
  baselineLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    gap: 8,
  },
  leftTools: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  toolBtnDisabled: {
    opacity: 0.4,
  },
  toolBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  rightTools: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  cancelActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  cancelActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  saveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.md,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
