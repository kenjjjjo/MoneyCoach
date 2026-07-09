import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { View } from "react-native";

import { CATEGORY_COLORS, CATEGORY_ICONS, type Category } from "@/lib/expense-context";

type Props = {
  category: Category;
  size?: number;
  iconSize?: number;
};

export function CategoryIcon({ category, size = 44, iconSize = 22 }: Props) {
  const bgColor = CATEGORY_COLORS[category];
  const iconName = CATEGORY_ICONS[category] as React.ComponentProps<typeof MaterialIcons>["name"];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor + "22",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialIcons name={iconName} size={iconSize} color={bgColor} />
    </View>
  );
}
