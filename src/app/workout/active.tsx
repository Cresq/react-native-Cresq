import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeInDown, FadeOutDown, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { project, rubberband, springs } from "@/motion";
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { fmtKg, fmtTime, sessionStats, useWorkout } from "@/store/workout";
import type { ExerciseEntry, SetEntry, SetType } from "@/db/types";
import { haptic } from "@/haptics";
import { useT } from "@/i18n";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { Field } from "@/components/ui/Field";
import { WheelPicker } from "@/components/ui/WheelPicker";
import { SUPERSET_INK, supersetColor } from "@/superset";
import { fontFamily } from "../../../constants/theme";

const REST_CHOICES = Array.from({ length: 20 }, (_, i) => (i + 1) * 15);

const setLabel = (s: SetEntry, workingIndex: number) => (s.type === "warmup" ? "W" : s.type === "drop" ? "D" : s.type === "failure" ? "F" : String(workingIndex));

type Sheet = null | { kind: "finish" } | { kind: "discard" } | { kind: "exercise"; ex: ExerciseEntry } | { kind: "set"; ex: ExerciseEntry; set: SetEntry; index: number } | { kind: "rest"; ex: ExerciseEntry } | { kind: "note"; ex: ExerciseEntry } | { kind: "superset"; ex: ExerciseEntry };
type Slot = { id: string; y: number; h: number };

/**
 * Active workout. Every exercise is a card you open or close; open cards stay
 * open. The one you are on is lit. Drag the handle at the top-left and a line
 * shows where the exercise will land. Set rows swipe left to delete; the rest
 * timer docks at the bottom.
 */
export default function ActiveWorkout() {
  const { colors, radius, shadow } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const w = useWorkout();
  const { session, rest } = w;
  const [, force] = useState(0);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [noteText, setNoteText] = useState("");
  const [blocked, setBlocked] = useState<{ id: string; msg: string } | null>(null);
  const [open, setOpen] = useState<string[] | null>(null);
  const [pick, setPick] = useState<string[]>([]);
  const [drop, setDrop] = useState<{ index: number; dragging: string } | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [restValue, setRestValue] = useState(90);
  const slots = useRef<Record<string, Slot>>({});
  const openBeforeDrag = useRef<string[] | null>(null);

  useEffect(() => {
    const i = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const current = session?.exercises[session.currentIndex];
  // First render: the current exercise (and its superset partners) start open.
  useEffect(() => {
    if (open === null && session && current) setOpen(session.exercises.filter((e) => e.id === current.id || (current.supersetGroup && e.supersetGroup === current.supersetGroup)).map((e) => e.id));
  }, [open, session, current]);
  // A newly current exercise opens; nothing closes on its own.
  useEffect(() => {
    if (current && open && !open.includes(current.id)) setOpen((o) => [...(o ?? []), current.id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!session) {
    return (
      <Screen>
        <Txt variant="displayL">{t("No session running")}</Txt>
        <Button label={t("Back")} variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} />
      </Screen>
    );
  }

  const stats = sessionStats(session);
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));
  if (!current) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronDown" onPress={leave} accessibilityLabel={t("Minimise")} />} title={session.planName} subtitle={t("Empty session")} />
        <Txt variant="bodyM" tone="secondary">
          {t("Add an exercise from the library to start logging.")}
        </Txt>
        <Button label={t("Add exercise")} icon="addPlus" onPress={() => router.push("/exercises?session=1")} />
        <Button label={t("Discard session")} variant="tertiary" size="M" onPress={() => { w.discard(); leave(); }} />
      </Screen>
    );
  }

  const openSets = stats.setsTotal - stats.setsDone;
  const isOpen = (id: string) => (open ?? []).includes(id);
  const toggle = (id: string) => setOpen((o) => ((o ?? []).includes(id) ? (o ?? []).filter((x) => x !== id) : [...(o ?? []), id]));

  const finish = () => {
    w.finish();
    router.replace("/workout/summary");
  };
  const stop = () => {
    setSheet(null);
    haptic("error");
    w.discard();
    leave();
  };
  const complete = (ex: ExerciseEntry, s: SetEntry, i: number) => {
    const firstOpen = ex.sets.findIndex((x) => !x.done);
    if (!s.done && firstOpen !== -1 && firstOpen < i) {
      haptic("error");
      setBlocked({ id: s.id, msg: t("Finish set {n} first, sets count in order", { n: firstOpen + 1 }) });
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
  // The picker lives in the same sheet as the exercise menu: the content swaps, the modal stays.
  const openSuperset = (ex: ExerciseEntry) => {
    setPick(session.exercises.filter((e) => e.id !== ex.id && ex.supersetGroup && e.supersetGroup === ex.supersetGroup).map((e) => e.id));
    setSheet({ kind: "superset", ex });
  };
  const openRest = (ex: ExerciseEntry) => {
    setRestValue(ex.restSeconds);
    setSheet({ kind: "rest", ex });
  };

  /** Where a card dragged by `dy` from its slot would land, by walking the measured slots. */
  const targetIndex = (id: string, dy: number) => {
    const order = session.exercises.map((e) => e.id);
    const from = order.indexOf(id);
    const mine = slots.current[id];
    if (!mine) return from;
    const centre = mine.y + mine.h / 2 + dy;
    let idx = from;
    if (dy < 0) {
      for (let i = from - 1; i >= 0; i--) {
        const s = slots.current[order[i]];
        if (s && centre < s.y + s.h / 2) idx = i;
      }
    } else {
      for (let i = from + 1; i < order.length; i++) {
        const s = slots.current[order[i]];
        if (s && centre > s.y + s.h / 2) idx = i;
      }
    }
    return idx;
  };
  // While a card is being dragged every card is closed, so the list is short and
  // the target is easy to read; afterwards they open again and the moved card lights up.
  const onDragStart = () => {
    openBeforeDrag.current = open ?? [];
    setOpen([]);
  };
  const onDragMove = (id: string, dy: number) => {
    const idx = targetIndex(id, dy);
    setDrop((d) => (d && d.index === idx && d.dragging === id ? d : { index: idx, dragging: id }));
  };
  const onDragEnd = (id: string, dy: number) => {
    const from = session.exercises.findIndex((e) => e.id === id);
    const to = targetIndex(id, dy);
    setDrop(null);
    if (to !== from) {
      haptic("tap");
      w.moveExercise(id, to - from);
    }
    setOpen(openBeforeDrag.current ?? []);
    openBeforeDrag.current = null;
    setHighlight(id);
    setTimeout(() => setHighlight((h) => (h === id ? null : h)), 1400);
  };
  const measure = (id: string) => (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    slots.current[id] = { id, y, h: height };
  };
  const dragFrom = drop ? session.exercises.findIndex((e) => e.id === drop.dragging) : -1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.ground }}>
      <Screen bottom={rest ? 110 : 20} contentStyle={{ gap: 20 }}>
        <Header
          left={<IconButton name="chevronDown" onPress={leave} accessibilityLabel={t("Minimise")} />}
          title={session.planName}
          subtitle={t("Exercise {a} of {b}", { a: session.currentIndex + 1, b: session.exercises.length })}
          right={
            <Row gap={6}>
              <IconButton name="trash" size={34} iconSize={17} tone="danger" onPress={() => setSheet({ kind: "discard" })} accessibilityLabel={t("Stop and discard session")} />
              <Button label={t("Finish")} variant="inverse" size="S" full={false} onPress={() => setSheet({ kind: "finish" })} />
            </Row>
          }
        />

        <Row gap={0}>
          <Strip label={t("Elapsed")} value={stats.elapsed} />
          <Strip label={t("Volume")} value={fmtKg(stats.volume)} unit="kg" />
          <Strip label={t("Sets")} value={String(stats.setsDone)} unit={t("of {n}", { n: stats.setsTotal })} />
        </Row>

        <View style={{ gap: 8 }}>
          {session.exercises.map((ex, index) => {
            const lineAbove = drop && drop.index === index && dragFrom > index;
            const lineBelow = drop && drop.index === index && dragFrom !== -1 && dragFrom < index;
            const groupStart = ex.supersetGroup && (index === 0 || session.exercises[index - 1].supersetGroup !== ex.supersetGroup);
            const groupColor = supersetColor(ex.supersetGroup);
            return (
              <View key={ex.id} onLayout={measure(ex.id)} style={{ gap: 8 }}>
                {lineAbove ? <DropLine /> : null}
                {groupStart && groupColor ? (
                  <Row gap={6} style={{ paddingHorizontal: 4, paddingTop: 4 }}>
                    <Icon name="link" size={13} color={groupColor} strokeWidth={2} />
                    <Txt variant="labelS" style={{ color: groupColor }}>
                      {t("Superset, alternate, no rest between")}
                    </Txt>
                  </Row>
                ) : null}
                <ExerciseCard
                  ex={ex}
                  index={index}
                  isCurrent={ex.id === current.id}
                  expanded={isOpen(ex.id)}
                  highlighted={highlight === ex.id}
                  groupColor={groupColor}
                  blocked={blocked}
                  onToggle={() => toggle(ex.id)}
                  onFocus={() => w.setCurrent(index)}
                  onDragStart={onDragStart}
                  onDragMove={(dy) => onDragMove(ex.id, dy)}
                  onDragEnd={(dy) => onDragEnd(ex.id, dy)}
                  onNote={() => openNote(ex)}
                  onRest={() => openRest(ex)}
                  onRemove={() => { haptic("error"); w.removeExercise(ex.id); }}
                  onMore={() => setSheet({ kind: "exercise", ex })}
                  onSetType={(s, i) => setSheet({ kind: "set", ex, set: s, index: i })}
                  onChange={(s, patch) => w.updateSet(ex.id, s.id, patch)}
                  onDone={(s, i) => complete(ex, s, i)}
                  onRemoveSet={(s) => { haptic("tap"); w.removeSet(ex.id, s.id); }}
                  onAddSet={() => w.addSet(ex.id)}
                />
                {lineBelow ? <DropLine /> : null}
              </View>
            );
          })}
          <Button label={t("Add exercise")} variant="secondary" size="M" icon="addPlus" onPress={() => router.push("/exercises?session=1")} style={{ marginTop: 4 }} />
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
                  {t("rest")}
                </Txt>
              </Row>
              <Txt variant="bodyS" tone="tertiary" numberOfLines={1}>
                {rest.nextLabel}
              </Txt>
            </View>
            <SmallPill label="−15" onPress={() => w.adjustRest(-15)} />
            <SmallPill label="+15" onPress={() => w.adjustRest(15)} />
            <SmallPill label={t("Skip")} inverse onPress={w.skipRest} />
          </View>
        </Animated.View>
      ) : null}

      <BottomSheet
        visible={sheet?.kind === "exercise" || sheet?.kind === "superset"}
        onClose={() => setSheet(null)}
        title={sheet?.kind === "exercise" ? sheet.ex.name : sheet?.kind === "superset" ? t("Superset") : ""}
        subtitle={sheet?.kind === "exercise" ? t("Exercise {a} of {b}", { a: session.exercises.indexOf(sheet.ex) + 1, b: session.exercises.length }) : sheet?.kind === "superset" ? t("Pick the exercises to alternate with {name}. No rest between them.", { name: sheet.ex.name }) : undefined}
      >
        {sheet?.kind === "superset" ? (
          <View style={{ gap: 4 }}>
            {session.exercises.filter((e) => e.id !== sheet.ex.id).map((e) => {
              const on = pick.includes(e.id);
              const elsewhere = e.supersetGroup && e.supersetGroup !== sheet.ex.supersetGroup && !on;
              return <SheetOption key={e.id} icon={on ? "circleCheck" : "addPlus"} label={e.name} sub={elsewhere ? t("In another superset, tap to move it here") : undefined} selected={on} onPress={() => setPick((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]))} />;
            })}
            <View style={{ paddingHorizontal: 8, paddingTop: 8 }}>
              <Button label={pick.length ? t("Save superset") : sheet.ex.supersetGroup ? t("Remove superset") : t("Pick at least one")} disabled={!pick.length && !sheet.ex.supersetGroup} onPress={() => { w.groupExercises([sheet.ex.id, ...pick]); setSheet(null); }} />
            </View>
          </View>
        ) : null}
        {sheet?.kind === "exercise" ? (
          <>
            <SheetOption icon="reload" label={t("Swap exercise")} sub={t("Keep the sets, change the movement")} onPress={() => { const id = sheet.ex.id; setSheet(null); setTimeout(() => router.push(`/exercises?swap=${id}`), 380); }} />
            <SheetOption icon="link" label={sheet.ex.supersetGroup ? t("Edit superset") : t("Make a superset")} sub={t("Choose which exercises alternate")} onPress={() => openSuperset(sheet.ex)} />
            {sheet.ex.supersetGroup ? <SheetOption icon="close" label={t("Remove from superset")} sub={t("Rest between them again")} onPress={() => { w.toggleSuperset(sheet.ex.id); setSheet(null); }} /> : null}
            <SheetOption icon="trash" label={t("Remove from workout")} sub={t("Its sets leave this session")} danger onPress={() => { w.removeExercise(sheet.ex.id); setSheet(null); }} />
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "discard"} onClose={() => setSheet(null)} title={t("Stop this workout?")} subtitle={t("Nothing from this session is saved. You can undo for a few seconds afterwards.")}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 8 }}>
          <Button label={t("No, keep going")} variant="secondary" size="M" onPress={() => setSheet(null)} />
          <Button label={t("Yes, stop this workout")} variant="danger" size="M" onPress={stop} />
        </View>
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "set"} onClose={() => setSheet(null)} title={sheet?.kind === "set" ? t("Set {n}", { n: sheet.index + 1 }) : ""} subtitle={sheet?.kind === "set" ? `${sheet.ex.name}, ${sheet.set.kg} kg × ${sheet.set.reps}` : undefined}>
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
              <SheetOption key={type} icon={icon} label={t(label)} sub={t(sub)} selected={sheet.set.type === type} onPress={() => { w.setSetType(sheet.ex.id, sheet.set.id, type as SetType); setSheet(null); }} />
            ))}
            <SheetOption icon="trash" label={t("Remove set")} sub={t("Removes only this set")} danger onPress={() => { w.removeSet(sheet.ex.id, sheet.set.id); setSheet(null); }} />
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "note"} onClose={() => setSheet(null)} title={t("Note")} subtitle={sheet?.kind === "note" ? t("{name}, shown under the name, and next time you do it", { name: sheet.ex.name }) : undefined}>
        {sheet?.kind === "note" ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 10 }}>
            <Field label={t("Note")} value={noteText} onChangeText={(v) => { setNoteText(v); w.setNote(sheet.ex.id, v.trimStart()); }} placeholder={t("Feet planted, pause on the chest")} multiline autoFocus />
            <Button label={t("Done")} onPress={() => { w.setNote(sheet.ex.id, noteText.trim()); setSheet(null); }} />
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "finish"} onClose={() => setSheet(null)} title={t("Finish this session?")} subtitle={openSets > 0 ? t("{a} of {b} sets done, {c} still open. Open sets are not counted.", { a: stats.setsDone, b: stats.setsTotal, c: openSets }) : t("All {n} sets done in {time}.", { n: stats.setsTotal, time: stats.elapsed })}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 8 }}>
          <Button label={t("Finish session")} onPress={() => { setSheet(null); haptic("done"); finish(); }} />
          <Button label={t("Keep training")} variant="secondary" size="M" onPress={() => setSheet(null)} />
        </View>
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "rest"} onClose={() => setSheet(null)} title={t("Rest timer")} subtitle={sheet?.kind === "rest" ? t("After each set of {name}", { name: sheet.ex.name }) : undefined}>
        {sheet?.kind === "rest" ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 12 }}>
            <WheelPicker values={REST_CHOICES} value={restValue} onChange={setRestValue} format={fmtTime} />
            <Row gap={8}>
              {[60, 90, 120, 180].map((s) => (
                <Chip key={s} label={fmtTime(s)} selected={restValue === s} onPress={() => setRestValue(s)} style={{ flex: 1, justifyContent: "center" }} />
              ))}
            </Row>
            <Button label={t("Use {time}", { time: fmtTime(restValue) })} onPress={() => { w.setRestSeconds(sheet.ex.id, restValue); setSheet(null); }} />
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

/** The ember line that shows where a dragged exercise will land. */
function DropLine() {
  const { colors } = useTheme();
  return <Animated.View entering={FadeInDown.duration(120)} style={{ height: 3, borderRadius: 2, backgroundColor: colors.accent.ember, marginHorizontal: 8 }} />;
}

type CardProps = {
  ex: ExerciseEntry;
  index: number;
  isCurrent: boolean;
  expanded: boolean;
  highlighted: boolean;
  groupColor?: string;
  blocked: { id: string; msg: string } | null;
  onToggle: () => void;
  onFocus: () => void;
  onDragStart: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: (dy: number) => void;
  onNote: () => void;
  onRest: () => void;
  onRemove: () => void;
  onMore: () => void;
  onSetType: (s: SetEntry, i: number) => void;
  onChange: (s: SetEntry, patch: Partial<Pick<SetEntry, "kg" | "reps">>) => void;
  onDone: (s: SetEntry, i: number) => void;
  onRemoveSet: (s: SetEntry) => void;
  onAddSet: () => void;
};

/**
 * One exercise: a header row that is always there (handle, position, name,
 * note line, chevron) and, when open, the rest pill, a delete button, the
 * options button, the set table and an Add set button.
 */
function ExerciseCard({ ex, index, isCurrent, expanded, highlighted, groupColor, blocked, onToggle, onFocus, onDragStart, onDragMove, onDragEnd, onNote, onRest, onRemove, onMore, onSetType, onChange, onDone, onRemoveSet, onAddSet }: CardProps) {
  const { colors, radius } = useTheme();
  const t = useT();
  const { drag, style } = useDrag(onDragStart, onDragMove, onDragEnd);
  const done = ex.sets.length > 0 && ex.sets.every((s) => s.done);
  const doneCount = ex.sets.filter((s) => s.done).length;
  let working = 0;
  return (
    <Animated.View style={style}>
      <Card padding={expanded ? 16 : 10} gap={6} style={highlighted ? { borderWidth: 1.5, borderColor: colors.accent.ember, backgroundColor: colors.accent.soft } : isCurrent ? { borderWidth: 1.5, borderColor: colors.accent.ember } : undefined}>
        <Row gap={10} align="center">
          <GestureDetector gesture={drag}>
            <Animated.View accessibilityRole="button" accessibilityLabel={t("Drag to reorder")} style={{ width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg.raised }}>
              <Icon name="dragVertical" size={16} color={colors.text.secondary} strokeWidth={2} />
            </Animated.View>
          </GestureDetector>
          <View style={{ width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: done ? colors.status.success : groupColor ? groupColor : isCurrent ? colors.accent.ember : colors.bg.raised }}>
            {done ? (
              <Icon name="check" size={14} color={colors.accent.on} strokeWidth={2.4} />
            ) : groupColor ? (
              <Txt variant="labelS" style={{ color: SUPERSET_INK, letterSpacing: 0.3 }}>
                SS
              </Txt>
            ) : (
              <Txt variant="labelM" style={{ color: isCurrent ? colors.accent.on : colors.text.secondary }}>
                {index + 1}
              </Txt>
            )}
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={ex.name} onPress={() => { onToggle(); if (!expanded && !done) onFocus(); }} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Txt variant={expanded ? "displayM" : "labelL"}>{ex.name}</Txt>
              {expanded ? null : (
                <Txt variant="bodyS" tone="tertiary">
                  {done ? t("Done") : t("{n} of {m} sets", { n: doneCount, m: ex.sets.length })}
                </Txt>
              )}
            </Pressable>
            {expanded ? (
              <Pressable accessibilityRole="button" accessibilityLabel={ex.note ? t("Edit note") : t("Add a note")} onPress={onNote} hitSlop={6}>
                <Txt variant="bodyS" tone={ex.note ? "secondary" : "tertiary"} italic numberOfLines={2}>
                  {ex.note || t("Add a note")}
                </Txt>
              </Pressable>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={expanded ? t("Collapse") : t("Expand")} hitSlop={10} onPress={onToggle} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center", transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}>
            <Icon name="chevronDown" size={18} color={colors.text.tertiary} strokeWidth={2} />
          </Pressable>
        </Row>

        {expanded ? (
          <>
            <Row gap={8} style={{ paddingTop: 8 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={t("Rest timer")} onPress={onRest} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 10, paddingRight: 8, height: 34, borderRadius: radius.pill, backgroundColor: colors.bg.raised }}>
                <Icon name="timer" size={14} color={colors.text.secondary} strokeWidth={1.9} />
                <Txt variant="labelM">{fmtTime(ex.restSeconds)}</Txt>
                <Icon name="chevronDown" size={12} color={colors.text.tertiary} strokeWidth={2.2} />
              </Pressable>
              <View style={{ flex: 1 }} />
              <IconButton name="trash" size={34} iconSize={17} tone="danger" onPress={onRemove} accessibilityLabel={t("Remove from workout")} />
              <IconButton name="moreHorizontal" size={34} iconSize={18} tone="raised" onPress={onMore} accessibilityLabel={t("Exercise options")} />
            </Row>

            <Row gap={8} style={{ paddingHorizontal: 6, paddingTop: 10 }}>
              <Txt variant="labelS" tone="tertiary" style={{ width: 28 }}>
                {t("Set")}
              </Txt>
              <Txt variant="labelS" tone="tertiary" style={{ width: 72 }} align="center">
                {t("Previous")}
              </Txt>
              <Txt variant="labelS" tone="tertiary" style={{ flex: 1 }} align="center">
                kg
              </Txt>
              <Txt variant="labelS" tone="tertiary" style={{ flex: 1 }} align="center">
                {t("Reps")}
              </Txt>
              <View style={{ width: 40 }} />
            </Row>

            <View style={{ gap: 4 }}>
              {ex.sets.map((s, i) => {
                if (s.type === "working") working++;
                const label = setLabel(s, working);
                const current = isCurrent && !s.done && ex.sets.findIndex((x) => !x.done) === i;
                return <SetRow key={s.id} set={s} label={label} isCurrent={current} error={blocked?.id === s.id ? blocked.msg : undefined} onType={() => onSetType(s, i)} onChange={(patch) => onChange(s, patch)} onDone={() => onDone(s, i)} onRemove={() => onRemoveSet(s)} />;
              })}
            </View>

            <Button label={t("Add set")} variant="secondary" size="S" icon="addPlus" onPress={onAddSet} style={{ marginTop: 8 }} />
          </>
        ) : null}
      </Card>
    </Animated.View>
  );
}

/** Vertical drag that lifts the element, follows the finger, reports where it is, and where it let go. */
function useDrag(onStart: () => void, onMove: (dy: number) => void, onEnd: (dy: number) => void) {
  const ty = useSharedValue(0);
  const lift = useSharedValue(0);
  const drag = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-16, 16])
    .onStart(() => {
      lift.value = withSpring(1, springs.snappy);
      runOnJS(onStart)();
    })
    .onUpdate((e) => {
      ty.value = e.translationY;
      runOnJS(onMove)(e.translationY);
    })
    .onEnd((e) => {
      lift.value = withSpring(0, springs.snappy);
      ty.value = withSpring(0, springs.base);
      runOnJS(onEnd)(e.translationY);
    })
    .onFinalize(() => {
      lift.value = withSpring(0, springs.snappy);
    });
  const style = useAnimatedStyle(() => ({ zIndex: lift.value > 0.01 ? 10 : 0, transform: [{ translateY: ty.value }, { scale: 1 + lift.value * 0.02 }], opacity: 1 - lift.value * 0.1 }));
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
  const t = useT();
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
          <Pressable accessibilityRole="button" accessibilityLabel={t("Delete set")} onPress={() => { close(); onRemove(); }} style={({ pressed }) => ({ width: 44, height: 40, borderRadius: radius.input, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.status.warning : colors.status.danger })}>
            <Icon name="trash" size={18} color={colors.text.primary} strokeWidth={2} />
          </Pressable>
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, paddingHorizontal: 6, borderRadius: radius.setRow, backgroundColor: isCurrent ? colors.accent.soft : colors.bg.surface, opacity: dim && !error ? 0.6 : 1, borderWidth: error ? 1.5 : 0, borderColor: error ? colors.status.danger : "transparent" }, rowAnim]}>
            <Pressable accessibilityRole="button" onPress={onType} hitSlop={6} style={{ width: 28 }} accessibilityLabel={t("Set type")}>
              <Txt variant="labelL" tone={isCurrent ? "ember" : set.type === "warmup" ? "tertiary" : "primary"}>
                {label}
              </Txt>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={hasPrev ? t("Use previous, {prev}", { prev }) : t("No previous set")} disabled={!hasPrev} onPress={() => { haptic("tap"); onChange({ kg: set.prevKg ?? set.kg, reps: set.prevReps ?? set.reps }); }} hitSlop={4} style={({ pressed }) => ({ width: 72, alignItems: "center", opacity: pressed ? 0.6 : 1 })}>
              <Txt style={{ fontFamily: fontFamily.displaySemi, fontSize: 15, lineHeight: 20, letterSpacing: -0.1, color: hasPrev ? colors.text.secondary : colors.text.tertiary }} tabular>
                {prev}
              </Txt>
            </Pressable>
            <View style={{ flex: 1, height: 40, borderRadius: radius.input, backgroundColor: boxBg, justifyContent: "center" }}>
              <TextInput value={String(set.kg)} onChangeText={(v) => onChange({ kg: Number(v.replace(",", ".")) || 0 })} keyboardType="decimal-pad" selectTextOnFocus style={inputStyle} />
            </View>
            <View style={{ flex: 1, height: 40, borderRadius: radius.input, backgroundColor: boxBg, justifyContent: "center" }}>
              <TextInput value={String(set.reps)} onChangeText={(v) => onChange({ reps: Number(v) || 0 })} keyboardType="number-pad" selectTextOnFocus style={inputStyle} />
            </View>
            <Animated.View style={checkAnim}>
              <Pressable
                onPress={onDone}
                onPressIn={() => { pop.value = withSpring(0.9, springs.snappy); }}
                onPressOut={() => { pop.value = withSpring(1, springs.snappy); }}
                accessibilityRole="button"
                accessibilityLabel={set.done ? t("Undo set") : t("Complete set")}
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
