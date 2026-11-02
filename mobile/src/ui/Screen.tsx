import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, gradients, layout, spacing } from './theme';

type ScreenProps = {
  children: ReactNode;
  /** Wrap the content in a ScrollView (forms and long pages). Default true. */
  scroll?: boolean;
  /** Centre the content vertically (welcome-style pages). */
  centered?: boolean;
  /** Which edges get safe-area padding. Screens under a header usually skip 'top'. */
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * The background and frame for every screen: midnight gradient, safe areas (notch,
 * gesture bar), keyboard handling, and a maximum width so tablets don't stretch content.
 */
export function Screen({ children, scroll = true, centered = false, edges = ['top', 'bottom'], contentStyle }: ScreenProps) {
  const inner = [styles.content, centered && styles.centered, contentStyle];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient colors={gradients.background} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <SafeAreaView style={styles.flex} edges={edges}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {scroll ? (
            <ScrollView
              contentContainerStyle={[styles.scrollContent, centered && styles.grow]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={inner}>{children}</View>
            </ScrollView>
          ) : (
            <View style={[styles.flex, styles.scrollContent]}>
              <View style={[inner, styles.flex]}>{children}</View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, alignItems: 'center' },
  content: { width: '100%', maxWidth: layout.maxContentWidth, gap: spacing.md },
  centered: { flexGrow: 1, justifyContent: 'center' },
});
