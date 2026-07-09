import React from "react";
import { View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { CATEGORY_COLORS, type Category } from "@/lib/expense-context";

type Segment = {
  category: Category;
  value: number;
};

type Props = {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
};

export function DonutChart({ segments, size = 100, strokeWidth = 14 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="none"
          />
        </Svg>
      </View>
    );
  }

  let cumulativeOffset = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {segments.map((segment, index) => {
            const percentage = segment.value / total;
            const dashArray = percentage * circumference;
            const dashOffset = circumference - cumulativeOffset * circumference;
            cumulativeOffset += percentage;

            return (
              <Circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                stroke={CATEGORY_COLORS[segment.category]}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${dashArray} ${circumference}`}
                strokeDashoffset={-(cumulativeOffset - percentage) * circumference}
                strokeLinecap="butt"
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
}
