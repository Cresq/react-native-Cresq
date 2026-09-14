import { useEffect, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeInDown, FadeOutDown, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { project, rubberband, springs } from "@/motion";
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { fmtKg, fmtTime, sessionStats, useWorkout } from "@/store/workout";
import type { ExerciseEntry, SetEntry, SetType } from "@/db/types";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { Field } from "@/components/ui/Field";
import { fontFamily } from "../../../constants/theme";

export const haptic = (kind: "tap" | "done" | "error") => {
  if (Platform.OS === "web") return;
  if (kind === "tap") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else if (kind === "done") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
};

const setLabel = (s: SetEntry, workingIndex: number) => (s.type === "warmup" ? "W" : s.type === "drop" ? "D" : s.type === "failure" ? "F" : String(workingIndex));

type Sheet = null | { kind: "exercise"; ex: ExerciseEntry } | { kind: "set"; ex: ExerciseEntry; set: SetEntry; index: number } | { kind: "rest"; ex: ExerciseEntry } | { kind: "session" } | { kind: "discard" } | { kind: "note"; ex: ExerciseEntry };

/**
 * Active workout. Built for one-handed input between sets: the exercise you
 * are on is the only surface (both exercises when it is a superset), done and
 * upcoming exercises are plain rows above and below, the rest timer docks at
 * the bottom. A set row swipes left to reveal delete.
 */
export default function ActiveWorkout() {
  const { colors, radius, shadow } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const w = useWorkout();
  const { session, rest } = w;
  const [, force] = useState(0);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [noteText, setNoteText] = useState("");
  const [blocked, setBlocked] = useState<{ id: string; msg: string } | null>(null);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!session) {
    return (
      <Screen>
        <Txt variant="displayL">No session running</Txt>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const stats = sessionStats(session);
  const current = session.exercises[session.currentIndex];
  if (!current) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronDown" onPress={() => router.back()} accessibilityLabel="Minimise" />} title={session.planName} subtitle="Empty session" />
        <Txt variant="bodyM" tone="secondary">
          Add an exercise from the library to start logging.
        </Txt>
        <Button label="Add exercise" icon="addPlus" onPress={() => router.push("/exercises?session=1")} />
        <Button label="Discard session" variant="tertiary" size="M" onPress={() => { w.discard(); router.back(); }} />
      </Screen>
    );
  }

  const items = session.exercises.map((ex, index) => ({ ex, index }));
  const group = current.supersetGroup ? items.filter((it) => it.ex.supersetGroup === current.supersetGroup) : [{ ex: current, index: session.currentIndex }];
  const groupIds = new Set(group.map((g) => g.ex.id));
  const firstIdx = group[0].index;
  const before = items.filter((it) => it.index < firstIdx && !groupIds.has(it.ex.id));
  const after = items.filter((it) => it.index > firstIdx && !groupIds.has(it.ex.id));
  const upNextIndex = after[0]?.index;

  const finish = () => {
    w.finish();
    router.replace("/workout/summary");
  };
  const complete = (ex: ExerciseEntry, s: SetEntry, i: number) => {
    const firstOpen = ex.sets.findIndex((x) => !x.done);
    if (!s.done && firstOpen !== -1 && firstOpen < i) {
      haptic("error");
      setBlocked({ id: s.id, msg: `Finish set ${firstOpen + 1} first, sets count in order` });
      setTimeout(() => setBlocked((b) => (b?.id === s.id ? null : b)), 2500);
      return;
    }
    setBlocked(null);
    haptic(s.done ? "tap" : "done");
    w.completeSet(ex.id, s.id);
  };

  const card = (ex: ExerciseEntry, isCurrentEx: boolean) => {
    let working = 0;
    return (
      <Card key={ex.id} padding={16} gap={6}>
        <Row gap={10} align="flex-start">
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="displayM">{ex.name}</Txt>
            {ex.note ? (
              <Txt variant="bodyS" tone="secondary" italic>
                {ex.note}
              </Txt>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Rest timer" onPress={() => setSheet({ kind: "rest", ex })} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 10, paddingRight: 8, height: 34, borderRadius: radius.pill, backgroundColor: colors.bg.raised }}>
            <Icon name="timer" size={14} color={colors.text.secondary} strokeWidth={1.9} />
            <Txt variant="labelM">{fmtTime(ex.restSeconds)}</Txt>
            <Icon name="chevronDown" size={12} color={colors.text.tertiary} strokeWidth={2.2} />
          </Pressable>
          <IconButton name="moreHorizontal" size={34} iconSize={18} tone="raised" onPress={() => setSheet({ kind: "exercise", ex })} accessibilityLabel="Exercise options" />
        </Row>

        <Row gap={8} style={{ paddingHorizontal: 6, paddingTop: 10 }}>
          <Txt variant="labelS" tone="tertiary" style={{ width: 28 }}>
            Set
          </Txt>
          <Txt variant="labelS" tone="tertiary" style={{ width: 72 }} align="center">
            Previous
          </Txt>
          <Txt variant="labelS" tone="tertiary" style={{ flex: 1 }} align="center">
            kg
          </Txt>
          <Txt variant="labelS" tone="tertiary" style={{ flex: 1 }} align="center">
            Reps
          </Txt>
          <View style={{ width: 40 }} />
        </Row>

        <View style={{ gap: 4 }}>
          {ex.sets.map((s, i) => {
            if (s.type === "working") working++;
            const label = setLabel(s, working);
            const isCurrent = isCurrentEx && !s.done && ex.sets.findIndex((x) => !x.done) === i;
            return (
              <SetRow
                key={s.id}
                set={s}
                label={label}
                isCurrent={isCurrent}
                error={blocked?.id === s.id ? blocked.msg : undefined}
                onType={() => setSheet({ kind: "set", ex, set: s, index: i })}
                onChange={(patch) => w.updateSet(ex.id, s.id, patch)}
                onDone={() => complete(ex, s, i)}
                onRemove={() => { haptic("tap"); w.removeSet(ex.id, s.id); }}
              />
            );
          })}
        </View>

        <Pressable accessibilityRole="button" onPress={() => w.addSet(ex.id)} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 10, paddingHorizontal: 6 }}>
          <Icon name="addPlus" size={14} color={colors.text.secondary} strokeWidth={2.2} />
          <Txt variant="labelM" tone="secondary">
            Add set
          </Txt>
        </Pressable>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.ground }}>
      <Screen bottom={rest ? 110 : 20} contentStyle={{ gap: 20 }}>
        <Header
          left={<IconButton name="chevronDown" onPress={() => router.back()} accessibilityLabel="Minimise" />}
          title={session.planName}
          subtitle={`Exercise ${session.currentIndex + 1} of ${session.exercises.length}`}
          right={
            <Row gap={6}>
              <IconButton name="moreHorizontal" size={34} iconSize={18} tone="raised" onPress={() => setSheet({ kind: "session" })} accessibilityLabel="Session options" />
              <Button label="Finish" variant="inverse" size="S" full={false} onPress={finish} />
            </Row>
          }
        />

        <Row gap={0}>
          <Strip label="Elapsed" value={stats.elapsed} />
          <Strip label="Volume" value={fmtKg(stats.volume)} unit="kg" />
          <Strip label="Sets" value={String(stats.setsDone)} unit={`of ${stats.setsTotal}`} />
        </Row>

        {before.length ? (
          <View>
            {before.map((it, i) => (
              <View key={it.ex.id}>
                {i > 0 ? <Divider inset={42} /> : null}
                <CollapsedExercise ex={it.ex} index={it.index} onPress={() => w.setCurrent(it.index)} onMore={() => setSheet({ kind: "exercise", ex: it.ex })} />
              </View>
            ))}
          </View>
        ) : null}

        {group.length > 1 ? (
          <View style={{ gap: 8 }}>
            <Row gap={6} style={{ paddingHorizontal: 4 }}>
              <Icon name="link" size={13} color={colors.accent.ember} strokeWidth={2} />
              <Txt variant="labelS" tone="ember">
                Superset · alternate, no rest between
              </Txt>
            </Row>
            <View style={{ gap: 8, borderLeftWidth: 2, borderLeftColor: colors.accent.ember, paddingLeft: 8, marginLeft: -10 }}>
              {group.map((it) => card(it.ex, true))}
            </View>
          </View>
        ) : (
          card(current, true)
        )}

        <View>
          {groupSupersets(after).map((g, gi) => (
            <View key={g[0].ex.id}>
              {gi > 0 ? <Divider inset={42} /> : null}
              {g.length === 1 ? (
                <CollapsedExercise ex={g[0].ex} index={g[0].index} upNext={g[0].index === upNextIndex} onPress={() => w.setCurrent(g[0].index)} onMore={() => setSheet({ kind: "exercise", ex: g[0].ex })} />
              ) : (
                <View style={{ borderLeftWidth: 2, borderLeftColor: colors.border.strong, paddingLeft: 12, marginLeft: 6, marginVertical: 6 }}>
                  <Row gap={6} style={{ paddingTop: 4, paddingBottom: 2 }}>
                    <Icon name="link" size={13} color={colors.text.tertiary} strokeWidth={1.8} />
                    <Txt variant="labelS" tone="tertiary">
                      Superset · no rest between
                    </Txt>
                  </Row>
                  {g.map((it, ii) => (
                    <View key={it.ex.id}>
                      {ii > 0 ? <Divider inset={42} /> : null}
                      <CollapsedExercise ex={it.ex} index={it.index} upNext={it.index === upNextIndex} onPress={() => w.setCurrent(it.index)} onMore={() => setSheet({ kind: "exercise", ex: it.ex })} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
          {after.length ? <Divider inset={42} /> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Add exercise" onPress={() => router.push("/exercises?session=1")} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 }}>
            <View style={{ width: 28, alignItems: "center" }}>
              <Icon name="addPlus" size={16} color={colors.text.secondary} strokeWidth={2} />
            </View>
            <Txt variant="labelM" tone="secondary">
              Add exercise
            </Txt>
          </Pressable>
        </View>
      </Screen>

      {rest ? (
        <Animated.View entering={FadeInDown.springify().damping(18).stiffness(180)} exiting={FadeOutDown.duration(180)} style={{ position: "absolute", left: 16, right: 16, bottom: Math.max(insets.bottom, 16) + 8 }}>
          <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingLeft: 14, borderRadius: radius.bar, backgroundColor: colors.bg.raised }, shadow.floating]}>
            <RestRing progress={rest.left / rest.total} />
            <View style={{ flex: 1, gap: 1 }}>
              <Row gap={6} align="baseline">
                <Txt variant="numberL" tabular>
                  {fmtTime(rest.left)}
                </Txt>
                <Txt variant="labelM" tone="secondary">
                  rest
                </Txt>
              </Row>
              <Txt variant="bodyS" tone="tertiary" numberOfLines={1}>
                {rest.nextLabel}
              </Txt>
            </View>
            <SmallPill label="−15" onPress={() => w.adjustRest(-15)} />
            <SmallPill label="+15" onPress={() => w.adjustRest(15)} />
            <SmallPill label="Skip" inverse onPress={w.skipRest} />
          </View>
        </Animated.View>
      ) : null}

      <BottomSheet visible={sheet?.kind === "exercise"} onClose={() => setSheet(null)} title={sheet?.kind === "exercise" ? sheet.ex.name : ""} subtitle={sheet?.kind === "exercise" ? `Exercise ${session.exercises.indexOf(sheet.ex) + 1} of ${session.exercises.length}` : undefined}>
        {sheet?.kind === "exercise" ? (
          <>
            <SheetOption icon="dragVertical" label="Move up" sub="Do this exercise earlier" onPress={() => { w.moveExercise(sheet.ex.id, -1); setSheet(null); }} />
            <SheetOption icon="dragVertical" label="Move down" sub="Do this exercise later" onPress={() => { w.moveExercise(sheet.ex.id, 1); setSheet(null); }} />
            <SheetOption icon="reload" label="Swap exercise" sub="Keep the sets, change the movement" onPress={() => { const id = sheet.ex.id; setSheet(null); router.push(`/exercises?swap=${id}`); }} />
            <SheetOption icon="link" label={sheet.ex.supersetGroup ? "Remove from superset" : "Add to superset"} sub={sheet.ex.supersetGroup ? "Rest between them again" : "Pair with the next exercise, no rest between"} onPress={() => { w.toggleSuperset(sheet.ex.id); setSheet(null); }} />
            <SheetOption icon="noteEdit" label={sheet.ex.note ? "Edit note" : "Add a note"} sub={sheet.ex.note ?? "Cues for next time"} onPress={() => { setNoteText(sheet.ex.note ?? ""); setSheet({ kind: "note", ex: sheet.ex }); }} />
            <SheetOption icon="timer" label="Rest timer" sub={`${fmtTime(sheet.ex.restSeconds)} after each set`} onPress={() => setSheet({ kind: "rest", ex: sheet.ex })} />
            <SheetOption icon="trash" label="Remove from workout" sub="You can restore it from the summary" danger onPress={() => { w.removeExercise(sheet.ex.id); setSheet(null); }} />
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "set"} onClose={() => setSheet(null)} title={sheet?.kind === "set" ? `Set ${sheet.index + 1}` : ""} subtitle={sheet?.kind === "set" ? `${sheet.ex.name} · ${sheet.set.kg} kg × ${sheet.set.reps}` : undefined}>
        {sheet?.kind === "set" ? (
          <>
            {(
              [
                ["warmup", "sun", "Warm-up", "Lighter weight, not counted in volume"],
                ["working", "circleCheck", "Working set", "Counts toward volume and records"],
                ["drop", "chevronDown", "Drop set", "Lower the weight and keep going"],
                ["failure", "star", "Failure set", "Reps until you can't do another"],
              ] as const
            ).map(([type, icon, label, sub]) => (
              <SheetOption key={type} icon={icon} label={label} sub={sub} selected={sheet.set.type === type} onPress={() => { w.setSetType(sheet.ex.id, sheet.set.id, type as SetType); setSheet(null); }} />
            ))}
            <SheetOption icon="trash" label="Remove set" sub="Removes only this set" danger onPress={() => { w.removeSet(sheet.ex.id, sheet.set.id); setSheet(null); }} />
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "note"} onClose={() => setSheet(null)} title="Note" subtitle={sheet?.kind === "note" ? `${sheet.ex.name} · shown under the name, and next time you do it` : undefined}>
        {sheet?.kind === "note" ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 10 }}>
            <Field label="Note" value={noteText} onChangeText={setNoteText} placeholder="Feet planted, pause on the chest" multiline autoFocus />
            <Button label="Save note" onPress={() => { w.setNote(sheet.ex.id, noteText.trim()); setSheet(null); }} />
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "session"} onClose={() => setSheet(null)} title={session.planName} subtitle={`${stats.elapsed} elapsed · ${stats.setsDone} of ${stats.setsTotal} sets`}>
        <SheetOption icon="addPlus" label="Add exercise" sub="From your library" onPress={() => { setSheet(null); router.push("/exercises?session=1"); }} />
        <SheetOption icon="chevronDown" label="Minimise" sub="Keep it running, look around the app" onPress={() => { setSheet(null); router.back(); }} />
        <SheetOption icon="circleCheck" label="Finish session" sub="Go to the summary" onPress={() => { setSheet(null); finish(); }} />
        <SheetOption icon="trash" label="Discard session" sub="Nothing from this session is saved" danger onPress={() => setSheet({ kind: "discard" })} />
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "discard"} onClose={() => setSheet(null)} title="Discard this session?" subtitle={`${stats.setsDone} completed set${stats.setsDone === 1 ? "" : "s"} will be lost. This cannot be undone.`}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 8 }}>
          <Button label="Discard session" variant="danger" size="M" onPress={() => { setSheet(null); w.discard(); router.back(); }} />
          <Button label="Keep training" variant="secondary" size="M" onPress={() => setSheet(null)} />
        </View>
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "rest"} onClose={() => setSheet(null)} title="Rest timer" subtitle={sheet?.kind === "rest" ? `After each set of ${sheet.ex.name}` : undefined}>
        {sheet?.kind === "rest" ? (
          <Row gap={8} style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
            {[60, 90, 120, 150, 180].map((s) => (
              <Chip key={s} label={fmtTime(s)} selected={sheet.ex.restSeconds === s} onPress={() => { w.setRestSeconds(sheet.ex.id, s); setSheet(null); }} style={{ flex: 1, justifyContent: "center" }} />
            ))}
          </Row>
        ) : null}
      </BottomSheet>
    </View>
  );
}

function Strip({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Txt variant="labelS" tone="tertiary">
        {label}
      </Txt>
      <Row gap={3} align="baseline">
        <Txt variant="numberM" tabular>
          {value}
        </Txt>
        {unit ? (
          <Txt variant="labelS" tone="secondary">
            {unit}
          </Txt>
        ) : null}
      </Row>
    </View>
  );
}

const REVEAL = 72;

/**
 * One set. Swipe left and a delete button slides in behind the row; release
 * past halfway or with a flick and it stays open, otherwise it settles back.
 * Tap "previous" to copy last time's numbers into this set.
 */
function SetRow({ set, label, isCurrent, error, onType, onChange, onDone, onRemove }: { set: SetEntry; label: string; isCurrent: boolean; error?: string; onType: () => void; onChange: (p: Partial<Pick<SetEntry, "kg" | "reps">>) => void; onDone: () => void; onRemove: () => void }) {
  const { colors, radius } = useTheme();
  const dim = !set.done && !isCurrent;
  const boxBg = isCurrent ? colors.bg.ground : colors.bg.raised;
  const hasPrev = set.prevKg !== null;
  const prev = hasPrev ? `${set.prevKg || "BW"} × ${set.prevReps}` : "–";
  const inputStyle = { width: "100%" as const, textAlign: "center" as const, color: dim ? colors.text.tertiary : colors.text.primary, fontFamily: fontFamily.displaySemi, fontSize: 20, paddingVertical: 0 };
  const shake = useSharedValue(0);
  const pop = useSharedValue(1);
  const tx = useSharedValue(0);
  const startX = useSharedValue(0);
  useEffect(() => {
    if (error) shake.value = withSequence(withTiming(-6, { duration: 50 }), withTiming(6, { duration: 50 }), withTiming(-4, { duration: 50 }), withTiming(0, { duration: 60 }));
  }, [error, shake]);
  useEffect(() => {
    if (set.done) {
      pop.value = withSequence(withTiming(1.18, { duration: 90 }), withSpring(1, springs.bouncy));
      tx.value = withSpring(0, springs.base);
    }
  }, [set.done, pop, tx]);
  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onStart(() => {
      startX.value = tx.value;
    })
    .onUpdate((e) => {
      const raw = startX.value + e.translationX;
      tx.value = raw > 0 ? rubberband(raw, REVEAL, 0.3) : raw < -REVEAL ? -REVEAL + rubberband(raw + REVEAL, REVEAL, 0.3) : raw;
    })
    .onEnd((e) => {
      const projected = tx.value + project(e.velocityX);
      tx.value = withSpring(projected < -REVEAL / 2 ? -REVEAL : 0, springs.base);
    });
  const rowAnim = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value + shake.value }] }));
  const trashAnim = useAnimatedStyle(() => ({ opacity: Math.min(1, -tx.value / (REVEAL * 0.6)), transform: [{ scale: 0.7 + 0.3 * Math.min(1, -tx.value / REVEAL) }] }));
  const checkAnim = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const close = () => {
    tx.value = withSpring(0, springs.base);
  };
  return (
    <View>
      <View style={{ position: "relative", overflow: "hidden", borderRadius: radius.setRow }}>
        <Animated.View style={[{ position: "absolute", right: 0, top: 0, bottom: 0, width: REVEAL, alignItems: "center", justifyContent: "center" }, trashAnim]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Delete set" onPress={() => { close(); onRemove(); }} style={({ pressed }) => ({ width: 44, height: 40, borderRadius: radius.input, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.status.warning : colors.status.danger })}>
            <Icon name="trash" size={18} color={colors.text.primary} strokeWidth={2} />
          </Pressable>
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, paddingHorizontal: 6, borderRadius: radius.setRow, backgroundColor: isCurrent ? colors.accent.soft : error ? colors.bg.surface : colors.bg.surface, opacity: dim && !error ? 0.6 : 1, borderWidth: error ? 1.5 : 0, borderColor: error ? colors.status.danger : "transparent" }, rowAnim]}>
            <Pressable accessibilityRole="button" onPress={onType} hitSlop={6} style={{ width: 28 }} accessibilityLabel="Set type">
              <Txt variant="labelL" tone={isCurrent ? "ember" : set.type === "warmup" ? "tertiary" : "primary"}>
                {label}
              </Txt>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={hasPrev ? `Use previous, ${prev}` : "No previous set"} disabled={!hasPrev} onPress={() => { haptic("tap"); onChange({ kg: set.prevKg ?? set.kg, reps: set.prevReps ?? set.reps }); }} hitSlop={4} style={({ pressed }) => ({ width: 72, alignItems: "center", opacity: pressed ? 0.6 : 1 })}>
              <Txt style={{ fontFamily: fontFamily.displaySemi, fontSize: 15, lineHeight: 20, letterSpacing: -0.1, color: hasPrev ? colors.text.secondary : colors.text.tertiary }} tabular>
                {prev}
              </Txt>
            </Pressable>
            <View style={{ flex: 1, height: 40, borderRadius: radius.input, backgroundColor: boxBg, justifyContent: "center" }}>
              <TextInput value={String(set.kg)} onChangeText={(t) => onChange({ kg: Number(t.replace(",", ".")) || 0 })} keyboardType="decimal-pad" selectTextOnFocus style={inputStyle} />
            </View>
            <View style={{ flex: 1, height: 40, borderRadius: radius.input, backgroundColor: boxBg, justifyContent: "center" }}>
              <TextInput value={String(set.reps)} onChangeText={(t) => onChange({ reps: Number(t) || 0 })} keyboardType="number-pad" selectTextOnFocus style={inputStyle} />
            </View>
            <Animated.View style={checkAnim}>
              <Pressable
                onPress={onDone}
                onPressIn={() => { pop.value = withSpring(0.9, springs.snappy); }}
                onPressOut={() => { pop.value = withSpring(1, springs.snappy); }}
                accessibilityRole="button"
                accessibilityLabel={set.done ? "Undo set" : "Complete set"}
                style={{ width: 40, height: 40, borderRadius: radius.input, alignItems: "center", justifyContent: "center", backgroundColor: set.done ? colors.status.success : isCurrent ? colors.accent.ember : colors.bg.raised }}
              >
                {set.done || isCurrent ? <Icon name="check" size={18} color={colors.accent.on} strokeWidth={2.6} /> : null}
              </Pressable>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>
      {error ? (
        <Row gap={6} style={{ paddingHorizontal: 8, paddingTop: 4, paddingBottom: 2 }}>
          <Icon name="info" size={13} color={colors.status.danger} strokeWidth={2.2} />
          <Txt variant="labelS" style={{ color: colors.status.danger }}>
            {error}
          </Txt>
        </Row>
      ) : null}
    </View>
  );
}

function CollapsedExercise({ ex, index, upNext, onPress, onMore }: { ex: ExerciseEntry; index: number; upNext?: boolean; onPress: () => void; onMore: () => void }) {
  const { colors } = useTheme();
  const done = ex.sets.length > 0 && ex.sets.every((s) => s.done);
  const working = ex.sets.filter((s) => s.type !== "warmup");
  const top = working[0] ?? ex.sets[0];
  const detail = `${working.length || ex.sets.length} × ${top?.reps ?? 0}${top?.kg ? ` · ${top.kg} kg` : " · bodyweight"}`;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, opacity: done ? 0.6 : 1 }}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Go to ${ex.name}`} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: done ? colors.status.success : colors.bg.surface }}>
          {done ? (
            <Icon name="check" size={15} color={colors.accent.on} strokeWidth={2.4} />
          ) : (
            <Txt variant="labelM" tone="secondary">
              {index + 1}
            </Txt>
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Row gap={8}>
            <Txt variant="labelL" tone={done ? "secondary" : "primary"}>
              {ex.name}
            </Txt>
            {upNext ? (
              <Txt variant="labelS" tone="ember">
                Up next
              </Txt>
            ) : null}
          </Row>
          <Txt variant="bodyS" tone="tertiary">
            {done ? "Done" : detail}
          </Txt>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onMore} hitSlop={10} accessibilityLabel="Options" style={{ paddingVertical: 12 }}>
        <Icon name="moreHorizontal" size={18} color={colors.text.tertiary} />
      </Pressable>
    </View>
  );
}

function groupSupersets(list: { ex: ExerciseEntry; index: number }[]) {
  const groups: { ex: ExerciseEntry; index: number }[][] = [];
  list.forEach((item) => {
    const last = groups[groups.length - 1];
    if (item.ex.supersetGroup && last && last[0].ex.supersetGroup === item.ex.supersetGroup) last.push(item);
    else groups.push([item]);
  });
  return groups;
}

function RestRing({ progress }: { progress: number }) {
  const { colors } = useTheme();
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={52} height={52} viewBox="0 0 52 52">
      <Circle cx={26} cy={26} r={r} stroke={colors.border.strong} strokeWidth={5} fill="none" />
      <Circle cx={26} cy={26} r={r} stroke={colors.accent.ember} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 26 26)" />
    </Svg>
  );
}

export function SmallPill({ label, onPress, inverse, onEmber }: { label: string; onPress: () => void; inverse?: boolean; onEmber?: boolean }) {
  const { colors, radius } = useTheme();
  const bg = onEmber ? colors.bg.ground : inverse ? colors.bg.inverse : colors.bg.surface;
  const fg = onEmber ? "primary" : inverse ? "inverse" : "primary";
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ paddingHorizontal: 12, height: 40, justifyContent: "center", borderRadius: radius.pill, backgroundColor: bg, opacity: pressed ? 0.8 : 1 })}>
      <Txt variant="buttonM" tone={fg}>
        {label}
      </Txt>
    </Pressable>
  );
}
