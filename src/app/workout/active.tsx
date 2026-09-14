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

/** One collapsed exercise row is about this tall; dragging that far moves one place. */
const ROW_STEP = 64;

type Sheet = null | { kind: "finish" } | { kind: "exercise"; ex: ExerciseEntry } | { kind: "set"; ex: ExerciseEntry; set: SetEntry; index: number } | { kind: "rest"; ex: ExerciseEntry } | { kind: "session" } | { kind: "discard" } | { kind: "note"; ex: ExerciseEntry };

/**
 * Active workout. Built for one-handed input between sets: the exercise you
 * are on is the only surface (both exercises when it is a superset), done and
 * upcoming exercises are plain rows above and below, the rest timer docks at
 * the bottom. Set rows swipe left to delete; the handle at the top-left of
 * an exercise drags it up or down the list.
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
  const openSets = stats.setsTotal - stats.setsDone;

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
  const openNote = (ex: ExerciseEntry) => {
    setNoteText(ex.note ?? "");
    setSheet({ kind: "note", ex });
  };
  const move = (ex: ExerciseEntry, steps: number) => {
    if (steps) {
      haptic("tap");
      w.moveExercise(ex.id, steps);
    }
  };

  const card = (ex: ExerciseEntry, isCurrentEx: boolean) => (
    <ExerciseCard
      key={ex.id}
      ex={ex}
      isCurrentEx={isCurrentEx}
      blocked={blocked}
      onMove={(steps) => move(ex, steps)}
      onNote={() => openNote(ex)}
      onRest={() => setSheet({ kind: "rest", ex })}
      onMore={() => setSheet({ kind: "exercise", ex })}
      onSetType={(s, i) => setSheet({ kind: "set", ex, set: s, index: i })}
      onChange={(s, patch) => w.updateSet(ex.id, s.id, patch)}
      onDone={(s, i) => complete(ex, s, i)}
      onRemoveSet={(s) => { haptic("tap"); w.removeSet(ex.id, s.id); }}
      onAddSet={() => w.addSet(ex.id)}
    />
  );

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
              <Button label="Finish" variant="inverse" size="S" full={false} onPress={() => setSheet({ kind: "finish" })} />
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
                <CollapsedExercise ex={it.ex} index={it.index} onPress={() => w.setCurrent(it.index)} onMore={() => setSheet({ kind: "exercise", ex: it.ex })} onMove={(steps) => move(it.ex, steps)} />
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
                <CollapsedExercise ex={g[0].ex} index={g[0].index} upNext={g[0].index === upNextIndex} onPress={() => w.setCurrent(g[0].index)} onMore={() => setSheet({ kind: "exercise", ex: g[0].ex })} onMove={(steps) => move(g[0].ex, steps)} />
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
                      <CollapsedExercise ex={it.ex} index={it.index} upNext={it.index === upNextIndex} onPress={() => w.setCurrent(it.index)} onMore={() => setSheet({ kind: "exercise", ex: it.ex })} onMove={(steps) => move(it.ex, steps)} />
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
            <SheetOption icon="reload" label="Swap exercise" sub="Keep the sets, change the movement" onPress={() => { const id = sheet.ex.id; setSheet(null); router.push(`/exercises?swap=${id}`); }} />
            <SheetOption icon="link" label={sheet.ex.supersetGroup ? "Remove from superset" : "Add to superset"} sub={sheet.ex.supersetGroup ? "Rest between them again" : "Pair with the next exercise, no rest between"} onPress={() => { w.toggleSuperset(sheet.ex.id); setSheet(null); }} />
            <SheetOption icon="trash" label="Remove from workout" sub="Its sets leave this session" danger onPress={() => { w.removeExercise(sheet.ex.id); setSheet(null); }} />
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
        <SheetOption icon="trash" label="Discard session" sub="Nothing from this session is saved" danger onPress={() => setSheet({ kind: "discard" })} />
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "finish"} onClose={() => setSheet(null)} title="Finish this session?" subtitle={openSets > 0 ? `${stats.setsDone} of ${stats.setsTotal} sets done, ${openSets} still open. Open sets are not counted.` : `All ${stats.setsTotal} sets done in ${stats.elapsed}.`}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 8 }}>
          <Button label="Finish session" onPress={() => { setSheet(null); haptic("done"); finish(); }} />
          <Button label="Keep training" variant="secondary" size="M" onPress={() => setSheet(null)} />
        </View>
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

/**
 * The open exercise. Drag the handle at the top-left to move it in the list;
 * the card lifts and follows, and on release it lands one place per row
 * travelled. Tap the line under the name to write or edit the note.
 */
function ExerciseCard({ ex, isCurrentEx, blocked, onMove, onNote, onRest, onMore, onSetType, onChange, onDone, onRemoveSet, onAddSet }: { ex: ExerciseEntry; isCurrentEx: boolean; blocked: { id: string; msg: string } | null; onMove: (steps: number) => void; onNote: () => void; onRest: () => void; onMore: () => void; onSetType: (s: SetEntry, i: number) => void; onChange: (s: SetEntry, patch: Partial<Pick<SetEntry, "kg" | "reps">>) => void; onDone: (s: SetEntry, i: number) => void; onRemoveSet: (s: SetEntry) => void; onAddSet: () => void }) {
  const { colors, radius } = useTheme();
  const { drag, style } = useDrag(onMove);
  let working = 0;
  return (
    <Animated.View style={style}>
      <Card padding={16} gap={6}>
        <Row gap={10} align="flex-start">
          <GestureDetector gesture={drag}>
            <Animated.View accessibilityRole="button" accessibilityLabel="Drag to reorder" style={{ width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg.raised, marginTop: 1 }}>
              <Icon name="dragVertical" size={16} color={colors.text.secondary} strokeWidth={2} />
            </Animated.View>
          </GestureDetector>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="displayM">{ex.name}</Txt>
            <Pressable accessibilityRole="button" accessibilityLabel={ex.note ? "Edit note" : "Add a note"} onPress={onNote} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Txt variant="bodyS" tone={ex.note ? "secondary" : "tertiary"} italic numberOfLines={2}>
                {ex.note || "Add a note"}
              </Txt>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Rest timer" onPress={onRest} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 10, paddingRight: 8, height: 34, borderRadius: radius.pill, backgroundColor: colors.bg.raised }}>
            <Icon name="timer" size={14} color={colors.text.secondary} strokeWidth={1.9} />
            <Txt variant="labelM">{fmtTime(ex.restSeconds)}</Txt>
            <Icon name="chevronDown" size={12} color={colors.text.tertiary} strokeWidth={2.2} />
          </Pressable>
          <IconButton name="moreHorizontal" size={34} iconSize={18} tone="raised" onPress={onMore} accessibilityLabel="Exercise options" />
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
            return <SetRow key={s.id} set={s} label={label} isCurrent={isCurrent} error={blocked?.id === s.id ? blocked.msg : undefined} onType={() => onSetType(s, i)} onChange={(patch) => onChange(s, patch)} onDone={() => onDone(s, i)} onRemove={() => onRemoveSet(s)} />;
          })}
        </View>

        <Pressable accessibilityRole="button" onPress={onAddSet} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 10, paddingHorizontal: 6 }}>
          <Icon name="addPlus" size={14} color={colors.text.secondary} strokeWidth={2.2} />
          <Txt variant="labelM" tone="secondary">
            Add set
          </Txt>
        </Pressable>
      </Card>
    </Animated.View>
  );
}

/** Vertical drag that lifts the element, follows the finger, and reports how many rows it travelled. */
function useDrag(onMove: (steps: number) => void) {
  const ty = useSharedValue(0);
  const lift = useSharedValue(0);
  const drag = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-16, 16])
    .onStart(() => {
      lift.value = withSpring(1, springs.snappy);
    })
    .onUpdate((e) => {
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      const steps = Math.round(e.translationY / ROW_STEP);
      lift.value = withSpring(0, springs.snappy);
      ty.value = withSpring(0, springs.base);
      runOnJS(onMove)(steps);
    })
    .onFinalize(() => {
      lift.value = withSpring(0, springs.snappy);
    });
  const style = useAnimatedStyle(() => ({ zIndex: lift.value > 0.01 ? 10 : 0, transform: [{ translateY: ty.value }, { scale: 1 + lift.value * 0.02 }], opacity: 1 - lift.value * 0.08 }));
  return { drag, style };
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
          <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, paddingHorizontal: 6, borderRadius: radius.setRow, backgroundColor: isCurrent ? colors.accent.soft : colors.bg.surface, opacity: dim && !error ? 0.6 : 1, borderWidth: error ? 1.5 : 0, borderColor: error ? colors.status.danger : "transparent" }, rowAnim]}>
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

/** A done or upcoming exercise as one row: drag handle, position, name, detail, options. */
function CollapsedExercise({ ex, index, upNext, onPress, onMore, onMove }: { ex: ExerciseEntry; index: number; upNext?: boolean; onPress: () => void; onMore: () => void; onMove: (steps: number) => void }) {
  const { colors } = useTheme();
  const { drag, style } = useDrag(onMove);
  const done = ex.sets.length > 0 && ex.sets.every((s) => s.done);
  const working = ex.sets.filter((s) => s.type !== "warmup");
  const top = working[0] ?? ex.sets[0];
  const detail = `${working.length || ex.sets.length} × ${top?.reps ?? 0}${top?.kg ? ` · ${top.kg} kg` : " · bodyweight"}`;
  return (
    <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 10, opacity: done ? 0.6 : 1, backgroundColor: colors.bg.ground }, style]}>
      <GestureDetector gesture={drag}>
        <Animated.View accessibilityRole="button" accessibilityLabel="Drag to reorder" style={{ width: 28, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Icon name="dragVertical" size={16} color={colors.text.tertiary} strokeWidth={2} />
        </Animated.View>
      </GestureDetector>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Go to ${ex.name}`} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
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
    </Animated.View>
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

export function SmallPill({ label, onPress, inverse }: { label: string; onPress: () => void; inverse?: boolean }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ paddingHorizontal: 12, height: 40, justifyContent: "center", borderRadius: radius.pill, backgroundColor: inverse ? colors.bg.inverse : colors.bg.surface, opacity: pressed ? 0.8 : 1 })}>
      <Txt variant="buttonM" tone={inverse ? "inverse" : "primary"}>
        {label}
      </Txt>
    </Pressable>
  );
}
