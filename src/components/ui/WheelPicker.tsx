import { useEffect, useRef, useState } from "react";
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { haptic } from "@/haptics";
import { Txt } from "./Text";

const ITEM = 44;
const VISIBLE = 5;

/**
 * A scrolling wheel, like the one in the Clock app. Rows snap to the centre
 * line; the chosen row is large and bright, its neighbours fade out. Works
 * with a finger and with a mouse wheel.
 */
export function WheelPicker({ values, value, onChange, format }: { values: number[]; value: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  const { colors, radius } = useTheme();
  const ref = useRef<ScrollView>(null);
  const [index, setIndex] = useState(Math.max(0, values.indexOf(value)));
  const pad = (ITEM * (VISIBLE - 1)) / 2;

  useEffect(() => {
    const i = Math.max(0, values.indexOf(value));
    const timer = setTimeout(() => ref.current?.scrollTo({ y: i * ITEM, animated: false }), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM)));
    if (i !== index) {
      setIndex(i);
      haptic("select");
    }
  };
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM)));
    setIndex(i);
    onChange(values[i]);
  };

  return (
    <View style={{ height: ITEM * VISIBLE, borderRadius: radius.input, overflow: "hidden", backgroundColor: colors.bg.raised }}>
      <View pointerEvents="none" style={{ position: "absolute", left: 12, right: 12, top: pad, height: ITEM, borderRadius: 12, backgroundColor: colors.bg.surface }} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={(e) => {
          if (!e.nativeEvent.velocity || Math.abs(e.nativeEvent.velocity.y) < 0.05) settle(e);
        }}
        contentContainerStyle={{ paddingVertical: pad }}
        nestedScrollEnabled
      >
        {values.map((v, i) => {
          const d = Math.abs(i - index);
          return (
            <View key={v} style={{ height: ITEM, alignItems: "center", justifyContent: "center", opacity: d === 0 ? 1 : d === 1 ? 0.55 : 0.25 }}>
              <Txt variant={d === 0 ? "numberM" : "labelL"} tabular>
                {format ? format(v) : String(v)}
              </Txt>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
