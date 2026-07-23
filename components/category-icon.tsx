import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { View } from "react-native";

import { useExpenses } from "@/lib/expense-context";

type Props = {
  category: string;
  size?: number;
  iconSize?: number;
};

export function CategoryIcon({ category, size = 44, iconSize = 22 }: Props) {
  const { getCategoryColor, getCategoryIcon } = useExpenses();
  const bgColor = getCategoryColor(category);
  const iconName = (getCategoryIcon(category) || "category") as React.ComponentProps<typeof MaterialIcons>["name"];

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
