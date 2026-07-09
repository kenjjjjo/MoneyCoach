// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "clock.fill": "history",
  "chart.bar.fill": "bar-chart",
  "gearshape.fill": "settings",
  "plus": "add",
  // General
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "xmark": "close",
  "sparkles": "auto-awesome",
  "brain": "psychology",
  "clock.arrow.circlepath": "history",
  "slider.horizontal.3": "tune",
  "square.and.arrow.up": "share",
  // Categories
  "fork.knife": "restaurant",
  "bag.fill": "store",
  "tram.fill": "train",
  "gamecontroller.fill": "sports-esports",
  "heart.fill": "favorite",
  "creditcard.fill": "credit-card",
  "ellipsis": "more-horiz",
  // Misc
  "checkmark.circle.fill": "check-circle",
  "exclamationmark.triangle.fill": "warning",
  "lightbulb.fill": "lightbulb",
  "arrow.clockwise": "refresh",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
