import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../../constants/theme';
import { X, RotateCcw, Check, PenTool } from 'lucide-react-native';

interface Point {
  x: number;
  y: number;
}

interface SignaturePadModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [paths, setPaths] = useState<Point[][]>([]);
  const currentPathRef = useRef<Point[]>([]);
  const [currentPathState, setCurrentPathState] = useState<Point[]>([]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPoint = { x: locationX, y: locationY };
        currentPathRef.current = [newPoint];
        setCurrentPathState([newPoint]);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPoint = { x: locationX, y: locationY };
        currentPathRef.current.push(newPoint);
        setCurrentPathState([...currentPathRef.current]);
      },
      onPanResponderRelease: () => {
        if (currentPathRef.current.length > 0) {
          setPaths((prev) => [...prev, currentPathRef.current]);
          currentPathRef.current = [];
          setCurrentPathState([]);
        }
      },
    })
  ).current;

  const pointsToSvgPath = (points: Point[]): string => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.5} ${points[0].y + 0.5}`;
    }
    return points.reduce((acc, point, index) => {
      return index === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
    }, '');
  };

  const handleClear = () => {
    setPaths([]);
    currentPathRef.current = [];
    setCurrentPathState([]);
  };

  const handleSave = () => {
    if (paths.length === 0) {
      onClose();
      return;
    }

    // Convert all paths into combined SVG path data and points
    const allPathsSvg = paths.map(pointsToSvgPath).join(' ');
    const signaturePayload = JSON.stringify({
      width: 320,
      height: 160,
      paths: paths,
      svg: allPathsSvg,
    });

    onSave(`draw:${signaturePayload}`);
    handleClear();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <PenTool size={18} color={theme.colors.primaryDark} />
              <Text style={styles.headerTitle}>Doctor's Digital Signature</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.hintText}>
            Sign below using your finger or stylus inside the signature box.
          </Text>

          {/* Canvas Box */}
          <View style={styles.canvasContainer} {...panResponder.panHandlers}>
            <Svg style={styles.svgCanvas} width="100%" height="100%">
              {paths.map((p, i) => (
                <Path
                  key={i}
                  d={pointsToSvgPath(p)}
                  stroke="#0F172A"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
              {currentPathState.length > 0 && (
                <Path
                  d={pointsToSvgPath(currentPathState)}
                  stroke="#0F172A"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}
            </Svg>

            {paths.length === 0 && currentPathState.length === 0 && (
              <View style={styles.placeholderWrap} pointerEvents="none">
                <Text style={styles.placeholderText}>✍️ Draw Signature Here</Text>
              </View>
            )}

            {/* Signature Baseline */}
            <View style={styles.baseline} pointerEvents="none" />
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClear}
              disabled={paths.length === 0}
              activeOpacity={0.7}
            >
              <RotateCcw size={14} color={paths.length === 0 ? theme.colors.textLight : theme.colors.text} />
              <Text
                style={[
                  styles.clearBtnText,
                  paths.length === 0 && { color: theme.colors.textLight },
                ]}
              >
                Clear
              </Text>
            </TouchableOpacity>

            <View style={styles.rightActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, paths.length === 0 && styles.disabledBtn]}
                onPress={handleSave}
                disabled={paths.length === 0}
                activeOpacity={0.85}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save Signature</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBorder,
  },
  hintText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  canvasContainer: {
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.cardBorderHighlight,
    borderStyle: 'dashed',
    position: 'relative',
    overflow: 'hidden',
  },
  svgCanvas: {
    flex: 1,
  },
  placeholderWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  baseline: {
    position: 'absolute',
    bottom: 36,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.md,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
