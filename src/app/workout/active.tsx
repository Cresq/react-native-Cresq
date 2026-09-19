import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Share, TextInput, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Extrapolation, LayoutAnimationConfig, interpolate, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { delay, distance, gesture, layouts, opacity, pressScale, project, rubberband, scroll, springs, timings, useReducedMotion } from "@/motion";
import { useNav } from "@/nav";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { fmtKg, fmtTime, sessionStats, useWorkout } from "@/store/workout";
import { bestSet, finished } from "@/db/derive";
import { useNow } from "@/clock";
import type { ExerciseEntry, Session, SetEntry, SetType } from "@/db/types";
import { feel } from "@/haptics";
import { keepKeyboard } from "@/keyboard";
import { useT, usePlural } from "@/i18n";
import { useSocial } from "@/store/social";
import { useInvites } from "@/store/invites";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/PhotoSlot";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { SwipeAway } from "@/components/ui/SwipeAway";
import { AnimatedListItem } from "@/components/ui/AnimatedListItem";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { WheelPicker } from "@/components/ui/WheelPicker";
import { SUPERSET_INK, supersetColor } from "@/superset";
import { inviteFromSession, inviteLink } from "@/invite";
import { useDb } from "@/db/DbProvider";
import { ExerciseMark, findExercise } from "@/components/ExerciseMark";
import { MoveViewer } from "@/components/MoveViewer";
import { fontFamily } from "../../../constants/theme";

const REST_CHOICES = Array.from({ length: 20 }, (_, i) => (i + 1) * 15);

const setLabel = (s: SetEntry, workingIndex: number) => (s.type === "warmup" ? "W" : s.type === "drop" ? "D" : s.type === "failure" ? "F" : String(workingIndex));

type Sheet = null | { kind: "finish" } | { kind: "discard" } | { kind: "invite" } | { kind: "exercise"; ex: ExerciseEntry } | { kind: "set"; ex: ExerciseEntry; set: SetEntry; index: number } | { kind: "rest"; ex: ExerciseEntry } | { kind: "superset"; ex: ExerciseEntry };
type Slot = { id: string; y: number; h: number };


/**
 * Active workout. Every exercise is a card you open or close; open cards stay
 * open. The one you are on is lit. Drag the handle at the top-left and a line
 * shows where the exercise will land. Set rows swipe left to delete; the rest
 * timer docks at the bottom.
 */
export default function ActiveWorkout() {
  const { colors, radius, shadow } = useTheme();
  const router = useNav();
  const insets = useSafeAreaInsets();
  const t = useT();
  const w = useWorkout();
  const { db } = useDb();
  const { session, rest } = w;
  /** When Finish was pressed, for the one place the screen itself needs the time: the sheet that says how long it took. */
  const [finishAt, setFinishAt] = useState(0);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [blocked, setBlocked] = useState<{ id: string; msg: string } | null>(null);
  const [open, setOpen] = useState<string[] | null>(null);
  const [pick, setPick] = useState<string[]>([]);
  const [drop, setDrop] = useState<{ index: number; dragging: string } | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [restValue, setRestValue] = useState(90);
  const [watching, setWatching] = useState<string | null>(null);
  /** Something to do once the sheet has left, rather than after a guessed wait. */
  const [afterSheet, setAfterSheet] = useState<(() => void) | null>(null);
  const slots = useRef<Record<string, Slot>>({});
  const openBeforeDrag = useRef<string[] | null>(null);
  const plural = usePlural();
  const { following, person: findPerson } = useSocial();
  const { send, invitedTo } = useInvites();
  const [picked, setPicked] = useState<string[]>([]);
  const { height: viewportH } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const scrollY = useSharedValue(0);
  const listTop = useRef(0);
  const seenExercises = useRef(session?.exercises.length ?? 0);
  // The heaviest working set each movement has seen before today, for telling a record from a good set.
  const priorBest = useMemo(() => {
    const best = new Map<string, number>();
    for (const s of finished(db.sessions)) {
      for (const e of s.exercises) {
        const top = bestSet(s, e.exerciseId);
        if (top && top.kg > (best.get(e.exerciseId) ?? 0)) best.set(e.exerciseId, top.kg);
      }
    }
    return best;
  }, [db.sessions]);

  const current = session?.exercises[session.currentIndex];
  // First render: the current exercise (and its superset partners) start open.
  useEffect(() => {
    if (open === null && session && current) setOpen(session.exercises.filter((e) => e.id === current.id || (current.supersetGroup && e.supersetGroup === current.supersetGroup)).map((e) => e.id));
  }, [open, session, current]);
  // A newly current exercise opens; nothing closes on its own.
  useEffect(() => {
    if (!current || !open || open.includes(current.id)) return;
    const group = current.supersetGroup ? session?.exercises.filter((e) => e.supersetGroup === current.supersetGroup).map((e) => e.id) : null;
    setOpen((o) => [...(o ?? []).filter((id) => !group?.includes(id)), ...(group ?? [current.id])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // An exercise that was just added is at the bottom of the list; once it has been laid out it is brought into view.
  const exerciseCount = session?.exercises.length ?? 0;
  const newestId = session?.exercises[exerciseCount - 1]?.id;
  useEffect(() => {
    const grew = exerciseCount > seenExercises.current;
    seenExercises.current = exerciseCount;
    if (!grew || !newestId) return;
    const timer = setTimeout(() => {
      const slot = slots.current[newestId];
      if (slot) scroller.current?.scrollTo({ y: Math.max(0, listTop.current + slot.y - insets.top - 12), animated: true });
    }, delay.settle * 2);
    return () => clearTimeout(timer);
  }, [exerciseCount, newestId, insets.top]);

  if (!session) {
    return (
      <Screen>
        <Txt variant="displayL">{t("No session running")}</Txt>
        <Button label={t("Back")} variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} />
      </Screen>
    );
  }

  const stats = sessionStats(session, finishAt || session.startedAt);
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
  /** Every exercise this one alternates with, or just itself. */
  const groupOf = (id: string) => {
    const ex = session.exercises.find((e) => e.id === id);
    if (!ex?.supersetGroup) return [id];
    return session.exercises.filter((e) => e.supersetGroup === ex.supersetGroup).map((e) => e.id);
  };
  // A superset opens and closes whole: you alternate between its exercises, so
  // one of a pair on its own is never what the tap meant.
  const toggle = (id: string) =>
    setOpen((o) => {
      const cur = o ?? [];
      const ids = groupOf(id);
      const rest = cur.filter((x) => !ids.includes(x));
      return cur.includes(id) ? rest : [...rest, ...ids];
    });

  const myName = db.profile.first || db.profile.name || t("A friend");
  /** For somebody not on CresQ: the workout travels in the link itself, so there is nothing to upload and nobody to sign in. */
  const shareLink = () => {
    const payload = inviteFromSession(session, myName);
    Share.share({ message: t("{name} is doing {plan} on CresQ. Do it with them: {link}", { name: myName, plan: session.planName, link: inviteLink(payload) }) });
  };
  const invited = invitedTo(session.id);
  const followed = following.map((id) => findPerson(id)).filter((p): p is NonNullable<typeof p> => !!p);
  const sendInvites = () => {
    if (!picked.length) return;
    send(session, picked, myName);
    feel("sent");
    setPicked([]);
    setSheet(null);
  };
  /**
   * Bring the card the workout moved on to into view, unless it is already
   * there. Called once the fold has been laid out, so the measured slots are
   * the new ones; the cards are still sliding, and the scroll joins them.
   */
  const reveal = (id: string) => {
    const slot = slots.current[id];
    if (!slot) return;
    const top = listTop.current + slot.y;
    const seenTop = scrollY.get() + insets.top + 12;
    const seenBottom = scrollY.get() + viewportH - 140;
    if (top >= seenTop && top + slot.h <= seenBottom) return;
    scroller.current?.scrollTo({ y: Math.max(0, top - insets.top - 12), animated: true });
  };

  const finish = () => {
    w.finish();
    router.replace("/workout/summary");
  };
  const stop = () => {
    setSheet(null);
    feel("discard");
    w.discard();
    leave();
  };
  const complete = (ex: ExerciseEntry, s: SetEntry, i: number) => {
    const firstOpen = ex.sets.findIndex((x) => !x.done);
    if (!s.done && firstOpen !== -1 && firstOpen < i) {
      feel("refuse");
      setBlocked({ id: s.id, msg: t("Finish set {n} first, sets count in order", { n: firstOpen + 1 }) });
      setTimeout(() => setBlocked((b) => (b?.id === s.id ? null : b)), delay.refusalHold);
      return;
    }
    setBlocked(null);
    // A record says a little more than a set does, and says it instead of the set, not on top of it.
    const before = priorBest.get(ex.exerciseId) ?? 0;
    const top = Math.max(before, ...ex.sets.filter((x) => x.done && x.type !== "warmup").map((x) => x.kg));
    const record = !s.done && s.type !== "warmup" && before > 0 && s.kg > top;
    feel(s.done ? "setUndone" : record ? "record" : "setDone");
    w.completeSet(ex.id, s.id);
    // The set that finishes an exercise folds it away and opens the next one that
    // still has sets, after a beat so the tick lands before anything moves.
    const wasLast = !s.done && ex.sets.filter((x) => !x.done).length === 1;
    const order = session.exercises;
    // In a superset you alternate, so after a set the highlight goes to the
    // partner that still has sets, and after theirs it comes back.
    if (!wasLast && !s.done && ex.supersetGroup) {
      const group = order.filter((e) => e.supersetGroup === ex.supersetGroup);
      const at = group.findIndex((e) => e.id === ex.id);
      const partner = [...group.slice(at + 1), ...group.slice(0, at)].find((e) => e.sets.some((x) => !x.done));
      if (partner) {
        setTimeout(() => w.setCurrent(order.findIndex((e) => e.id === partner.id)), delay.afterTick);
        setTimeout(() => reveal(partner.id), delay.afterTick + delay.settle);
      }
      return;
    }
    if (!wasLast) return;
    const unfinished = (id: string) => order.find((e) => e.id === id)?.sets.some((x) => !x.done);
    const from = order.findIndex((e) => e.id === ex.id);
    const next = order.slice(from + 1).find((e) => e.sets.some((x) => !x.done));
    /**
     * A card finishing does not get to move somebody who is working elsewhere.
     * What is selected keeps the selection if it is still open with sets left;
     * failing that, the last card the person opened takes it. Only when nothing
     * else is open does the workout move on by itself and unfold what is next.
     */
    const stays = !!current && current.id !== ex.id && isOpen(current.id) && !!unfinished(current.id);
    const others = (open ?? []).filter((id) => id !== ex.id && unfinished(id));
    const goTo = stays ? current : others.length ? order.find((e) => e.id === others[others.length - 1]) : next;
    const unfold = !stays && others.length === 0;
    setTimeout(() => {
      setOpen((o) => {
        const rest = (o ?? []).filter((x) => x !== ex.id);
        if (!unfold || !goTo) return rest;
        const group = goTo.supersetGroup ? order.filter((e) => e.supersetGroup === goTo.supersetGroup).map((e) => e.id) : [goTo.id];
        return [...rest.filter((id) => !group.includes(id)), ...group];
      });
      if (goTo) w.setCurrent(order.findIndex((e) => e.id === goTo.id));
      if (unfold && goTo) setTimeout(() => reveal(goTo.id), delay.settle);
    }, delay.moveOn);
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
      feel("reorder");
      w.moveExercise(id, to - from);
    }
    setOpen(openBeforeDrag.current ?? []);
    openBeforeDrag.current = null;
    setHighlight(id);
    setTimeout(() => setHighlight((h) => (h === id ? null : h)), delay.highlightHold);
  };
  const measure = (id: string) => (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    slots.current[id] = { id, y, h: height };
  };
  const dragFrom = drop ? session.exercises.findIndex((e) => e.id === drop.dragging) : -1;
  const openFinish = () => setSheet({ kind: "finish" });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.ground }}>
      <Screen bottom={rest ? 110 : 20} contentStyle={{ gap: 20 }} scrollRef={scroller} scrollY={scrollY} keyboardInsets>
        <Header
          left={<IconButton name="chevronDown" onPress={leave} accessibilityLabel={t("Minimise")} />}
          title={session.planName}
          subtitle={t("Exercise {a} of {b}", { a: session.currentIndex + 1, b: session.exercises.length })}
          right={
            <Row gap={8}>
              <View>
                <IconButton name="users" size={34} iconSize={17} onPress={() => { setPicked([]); setSheet({ kind: "invite" }); }} accessibilityLabel={t("Invite somebody to this workout")} />
                {invited.length ? (
                  <View pointerEvents="none" style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: colors.accent.ember, alignItems: "center", justifyContent: "center" }}>
                    <Txt variant="labelS" style={{ color: colors.accent.on, fontSize: 10, lineHeight: 12 }}>
                      {invited.length}
                    </Txt>
                  </View>
                ) : null}
              </View>
              <IconButton name="close" size={34} iconSize={18} tone="danger" onPress={() => setSheet({ kind: "discard" })} accessibilityLabel={t("Stop and discard session")} />
              <Button label={t("Finish")} variant="inverse" size="S" full={false} onPress={() => { setFinishAt(Date.now()); openFinish(); }} />
            </Row>
          }
        />

        <Row gap={0}>
          <Elapsed label={t("Elapsed")} session={session} />
          <Strip label={t("Volume")} count={stats.volume} format={fmtKg} unit="kg" />
          <Strip label={t("Sets")} count={stats.setsDone} format={(n) => String(Math.round(n))} unit={t("of {n}", { n: stats.setsTotal })} />
        </Row>

        <LayoutAnimationConfig skipEntering skipExiting>
        <View style={{ gap: 8 }} onLayout={(e) => { listTop.current = e.nativeEvent.layout.y; }}>
          {session.exercises.map((ex, index) => {
            const lineAbove = drop && drop.index === index && dragFrom > index;
            const lineBelow = drop && drop.index === index && dragFrom !== -1 && dragFrom < index;
            const groupStart = ex.supersetGroup && (index === 0 || session.exercises[index - 1].supersetGroup !== ex.supersetGroup);
            const groupColor = supersetColor(ex.supersetGroup);
            return (
              <AnimatedListItem key={ex.id} onLayout={measure(ex.id)} style={{ gap: 8 }}>
                {lineAbove ? <DropLine /> : null}
                {groupStart && groupColor ? (
                  <Animated.View entering={layouts.enter} exiting={layouts.exit} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, paddingTop: 4 }}>
                    <Icon name="link" size={13} color={groupColor} strokeWidth={2} />
                    <Txt variant="labelS" style={{ color: groupColor }}>
                      {t("Superset, alternate, no rest between")}
                    </Txt>
                  </Animated.View>
                ) : null}
                <ExerciseCard
                  ex={ex}
                  index={index}
                  isCurrent={ex.id === current.id}
                  expanded={isOpen(ex.id)}
                  highlighted={highlight === ex.id}
                  groupColor={groupColor}
                  blocked={blocked}
                  priorBest={priorBest.get(ex.exerciseId) ?? 0}
                  onToggle={() => { if (!isOpen(ex.id)) feel("select"); toggle(ex.id); }}
                  onFocus={() => w.setCurrent(index)}
                  onDragStart={onDragStart}
                  onDragMove={(dy) => onDragMove(ex.id, dy)}
                  onDragEnd={(dy) => onDragEnd(ex.id, dy)}
                  onNote={(text) => w.setNote(ex.id, text)}
                  onRest={() => openRest(ex)}
                  onRemove={() => { feel("exerciseRemoved"); w.removeExercise(ex.id); }}
                  onMore={() => setSheet({ kind: "exercise", ex })}
                  onWatch={() => setWatching(ex.exerciseId)}
                  onSetType={(s, i) => setSheet({ kind: "set", ex, set: s, index: i })}
                  onChange={(s, patch) => w.updateSet(ex.id, s.id, patch)}
                  onDone={(s, i) => complete(ex, s, i)}
                  onRemoveSet={(s) => { feel("removeSet"); w.removeSet(ex.id, s.id); }}
                  onAddSet={() => { feel("addSet"); w.addSet(ex.id); }}
                />
                {lineBelow ? <DropLine /> : null}
              </AnimatedListItem>
            );
          })}
          <AnimatedListItem still>
            <Button label={t("Add exercise")} variant="secondary" size="M" icon="addPlus" onPress={() => router.push("/exercises?session=1")} style={{ marginTop: 4 }} />
          </AnimatedListItem>
        </View>
        </LayoutAnimationConfig>
      </Screen>

      <CompactBar scrollY={scrollY} session={session} finishLabel={t("Finish")} onFinish={() => { setFinishAt(Date.now()); openFinish(); }} />

      {rest ? (
        <Animated.View entering={layouts.rise} exiting={layouts.sink} style={{ position: "absolute", left: 16, right: 16, bottom: Math.max(insets.bottom, 16) + 8 }}>
          <SwipeAway onDismiss={w.skipRest}>
          <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingLeft: 16, borderRadius: radius.bar, backgroundColor: colors.bg.raised }, shadow.floating]}>
            <RestRing progress={rest.total > 0 ? rest.left / rest.total : 0} />
            <View style={{ flex: 1, gap: 1 }}>
              <Row gap={8} align="baseline">
                <Txt variant="numberL" tabular>
                  {fmtTime(rest.left)}
                </Txt>
                <Txt variant="labelM" tone="secondary">
                  {t("rest")}
                </Txt>
              </Row>
              <Txt variant="bodyS" tone="tertiary" numberOfLines={1}>
                {rest.next ? (rest.next.kg ? t("Set {n}, {kg} kg × {reps}", { n: rest.next.set, kg: rest.next.kg, reps: rest.next.reps }) : t("Set {n}, {reps} reps", { n: rest.next.set, reps: rest.next.reps })) : t("Next exercise")}
              </Txt>
            </View>
            <Pill label="−15" accessibilityLabel={t("15 seconds less")} onPress={() => w.adjustRest(-15)} />
            <Pill label="+15" accessibilityLabel={t("15 seconds more")} onPress={() => w.adjustRest(15)} />
            <Pill label={t("Skip")} tone="accent" accessibilityLabel={t("Skip rest")} onPress={w.skipRest} />
          </View>
          </SwipeAway>
        </Animated.View>
      ) : null}

      <BottomSheet
        visible={sheet?.kind === "exercise" || sheet?.kind === "superset"}
        onClose={() => setSheet(null)}
        onClosed={() => { const go = afterSheet; setAfterSheet(null); go?.(); }}
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
              <Button label={pick.length ? t("Save superset") : sheet.ex.supersetGroup ? t("Remove superset") : t("Pick at least one")} disabled={!pick.length && !sheet.ex.supersetGroup} onPress={() => { feel(pick.length ? "supersetLinked" : "supersetUnlinked"); w.groupExercises([sheet.ex.id, ...pick]); setSheet(null); }} />
            </View>
          </View>
        ) : null}
        {sheet?.kind === "exercise" ? (
          <>
            <SheetOption icon="reload" label={t("Swap exercise")} sub={t("Keep the sets, change the movement")} onPress={() => { const id = sheet.ex.id; setAfterSheet(() => () => router.push(`/exercises?swap=${id}`)); setSheet(null); }} />
            <SheetOption icon="link" label={sheet.ex.supersetGroup ? t("Edit superset") : t("Make a superset")} sub={t("Choose which exercises alternate")} onPress={() => openSuperset(sheet.ex)} />
            {sheet.ex.supersetGroup ? <SheetOption icon="close" label={t("Remove from superset")} sub={t("Rest between them again")} onPress={() => { feel("supersetUnlinked"); w.toggleSuperset(sheet.ex.id); setSheet(null); }} /> : null}
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

      <BottomSheet visible={sheet?.kind === "finish"} onClose={() => setSheet(null)} title={t("Finish this session?")} subtitle={openSets > 0 ? t("{a} of {b} sets done, {c} still open. Open sets are not counted.", { a: stats.setsDone, b: stats.setsTotal, c: openSets }) : t("All {n} sets done in {time}.", { n: stats.setsTotal, time: stats.elapsed })}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 8 }}>
          <Button label={t("Finish session")} onPress={() => { setSheet(null); feel("workoutFinished"); finish(); }} />
          <Button label={t("Keep training")} variant="secondary" size="M" onPress={() => setSheet(null)} />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={sheet?.kind === "invite"}
        onClose={() => setSheet(null)}
        onClosed={() => { const go = afterSheet; setAfterSheet(null); go?.(); }}
        title={t("Train together")}
        subtitle={t("They get {plan} with the same exercises and sets. The weights are their own.", { plan: session.planName })}
      >
        <View style={{ gap: 4 }}>
          {followed.map((p) => {
            const done = invited.includes(p.id);
            const on = picked.includes(p.id);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: done }}
                accessibilityLabel={p.name}
                disabled={done}
                onPress={() => setPicked((x) => (x.includes(p.id) ? x.filter((y) => y !== p.id) : [...x, p.id]))}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: radius.input, backgroundColor: on ? colors.accent.soft : "transparent", opacity: pressed ? 0.7 : done ? 0.55 : 1 })}
              >
                <Avatar source={p.avatar} size={40} initial={p.name[0]} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Txt variant="labelL">{p.name}</Txt>
                  <Txt variant="bodyS" tone="tertiary">
                    {done ? t("Invited") : p.handle}
                  </Txt>
                </View>
                {done ? (
                  <Icon name="check" size={18} color={colors.status.success} strokeWidth={2.4} />
                ) : (
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: on ? colors.accent.ember : colors.border.strong, backgroundColor: on ? colors.accent.ember : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {on ? <Icon name="check" size={14} color={colors.accent.on} strokeWidth={2.6} /> : null}
                  </View>
                )}
              </Pressable>
            );
          })}
          {followed.length === 0 ? (
            <Txt variant="bodyM" tone="secondary" style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
              {t("You are not following anyone yet. People you follow show up here.")}
            </Txt>
          ) : null}
          <View style={{ paddingHorizontal: 8, paddingTop: 8 }}>
            <Button label={picked.length ? plural(picked.length, "Invite {n} person", "Invite {n} people") : t("Pick who to invite")} disabled={!picked.length} onPress={sendInvites} />
          </View>
          <SheetOption icon="share" label={t("Share a link instead")} sub={t("For somebody who is not on CresQ yet")} onPress={() => { setAfterSheet(() => shareLink); setSheet(null); }} />
        </View>
      </BottomSheet>

      <MoveViewer exercise={watching ? findExercise(watching) ?? null : null} onClose={() => setWatching(null)} />

      <BottomSheet visible={sheet?.kind === "rest"} onClose={() => setSheet(null)} title={t("Rest timer")} subtitle={sheet?.kind === "rest" ? t("After each set of {name}", { name: sheet.ex.name }) : undefined}>
        {sheet?.kind === "rest" ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 12 }}>
            <WheelPicker values={REST_CHOICES} value={restValue} onChange={setRestValue} format={fmtTime} />
            <Button label={t("Use {time}", { time: fmtTime(restValue) })} onPress={() => { w.setRestSeconds(sheet.ex.id, restValue); setSheet(null); }} />
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

/**
 * The session clock. It keeps its own time, so a second passing redraws these
 * few characters and nothing else: the cards and their sets are left alone
 * until something about the session actually changes.
 */
function useElapsed(session: Session) {
  const now = useNow(1000);
  return sessionStats(session, now).elapsed;
}

function Elapsed({ label, session }: { label: string; session: Session }) {
  return <Strip label={label} value={useElapsed(session)} />;
}

function ElapsedLine({ session }: { session: Session }) {
  return (
    <Txt variant="labelS" tone="tertiary" tabular>
      {useElapsed(session)}
    </Txt>
  );
}

/**
 * The header, once it has scrolled away: the workout's name, the clock and
 * Finish stay within reach at the top of a long session. It follows the scroll
 * offset on the UI thread, so it costs the list nothing, and until it is there
 * it takes no touches and is hidden from screen readers.
 */
function CompactBar({ scrollY, session, finishLabel, onFinish }: { scrollY: SharedValue<number>; session: Session; finishLabel: string; onFinish: () => void }) {
  const { colors, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const from = scroll.compactFrom;
  const until = scroll.compactTo;
  const settle = distance.settle;
  const style = useAnimatedStyle(() => {
    const shown = interpolate(scrollY.get(), [from, until], [0, 1], Extrapolation.CLAMP);
    return { opacity: shown, transform: [{ translateY: reduced ? 0 : (shown - 1) * settle }] };
  });
  const reach = useAnimatedProps(() => {
    const there = scrollY.get() > (from + until) / 2;
    return { pointerEvents: there ? ("auto" as const) : ("none" as const), accessibilityElementsHidden: !there, importantForAccessibility: there ? ("auto" as const) : ("no-hide-descendants" as const) };
  });
  return (
    <Animated.View animatedProps={reach} style={[{ position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 12, paddingTop: insets.top + 6, paddingBottom: 8, paddingHorizontal: layout.screenInset, backgroundColor: colors.bg.ground, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }, style]}>
      <View style={{ flex: 1, gap: 1 }}>
        <Txt variant="labelL" numberOfLines={1}>
          {session.planName}
        </Txt>
        <ElapsedLine session={session} />
      </View>
      <Button label={finishLabel} variant="inverse" size="S" full={false} onPress={onFinish} />
    </Animated.View>
  );
}

/** The ember line that shows where a dragged exercise will land. */
function DropLine() {
  const { colors } = useTheme();
  return <Animated.View entering={layouts.enter} style={{ height: 3, borderRadius: 2, backgroundColor: colors.accent.ember, marginHorizontal: 8 }} />;
}

type CardProps = {
  ex: ExerciseEntry;
  index: number;
  isCurrent: boolean;
  expanded: boolean;
  highlighted: boolean;
  groupColor?: string;
  blocked: { id: string; msg: string } | null;
  /** The heaviest working set this movement has seen before today; 0 when there is no history. */
  priorBest: number;
  onToggle: () => void;
  onFocus: () => void;
  onDragStart: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: (dy: number) => void;
  onNote: (text: string) => void;
  onRest: () => void;
  onRemove: () => void;
  onMore: () => void;
  onWatch: () => void;
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
function ExerciseCard({ ex, index, isCurrent, expanded, highlighted, groupColor, blocked, priorBest, onToggle, onFocus, onDragStart, onDragMove, onDragEnd, onNote, onRest, onRemove, onMore, onWatch, onSetType, onChange, onDone, onRemoveSet, onAddSet }: CardProps) {
  const { colors, radius } = useTheme();
  const t = useT();
  const { drag, style } = useDrag(onDragStart, onDragMove, onDragEnd);
  const [noteEditing, setNoteEditing] = useState(false);
  const done = ex.sets.length > 0 && ex.sets.every((s) => s.done);
  const doneCount = ex.sets.filter((s) => s.done).length;
  // What changes about a card is a value between 0 and 1 on the UI thread, so nothing on it switches:
  // the ember ring of the card you are on, the chevron, and the brief ring in a superset's colour when
  // this card is linked into one. The rings are drawn over the card rather than as its border, so the
  // numbers inside never shift by the border's width.
  const lit = useSharedValue(isCurrent ? 1 : 0);
  const hi = useSharedValue(highlighted ? 1 : 0);
  const turn = useSharedValue(expanded ? 1 : 0);
  const link = useSharedValue(0);
  const linkedTo = useRef(ex.supersetGroup);
  useEffect(() => {
    lit.set(withTiming(isCurrent ? 1 : 0, timings.base));
  }, [isCurrent, lit]);
  useEffect(() => {
    hi.set(withTiming(highlighted ? 1 : 0, timings.fast));
  }, [highlighted, hi]);
  useEffect(() => {
    turn.set(withTiming(expanded ? 1 : 0, timings.base));
  }, [expanded, turn]);
  // Joining a superset lights every card that joined, at the same moment and in the group's colour,
  // which is what says they now belong together. Leaving one is quiet.
  useEffect(() => {
    if (linkedTo.current === ex.supersetGroup) return;
    linkedTo.current = ex.supersetGroup;
    if (ex.supersetGroup) link.set(withSequence(withTiming(1, timings.fast), withDelay(delay.linkHold, withTiming(0, timings.slow))));
  }, [ex.supersetGroup, link]);
  const ring = useAnimatedStyle(() => ({ opacity: Math.max(lit.get(), hi.get()) }));
  const linkRing = useAnimatedStyle(() => ({ opacity: link.get() }));
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 180}deg` }] }));
  const ringShape = { position: "absolute", top: -1, left: 0, right: 0, bottom: 0, borderRadius: radius.card, borderWidth: 1.5 } as const;
  // What each row is called, and whether it is a record: a done working set heavier than anything before it,
  // history first and then today's. Without a history there is nothing to beat, and a first session is not a list of records.
  const rows: { label: string; record: boolean }[] = [];
  let working = 0;
  let top = priorBest;
  for (const s of ex.sets) {
    if (s.type === "working") working++;
    const counts = s.done && s.type !== "warmup";
    rows.push({ label: setLabel(s, working), record: priorBest > 0 && counts && s.kg > top });
    if (counts && s.kg > top) top = s.kg;
  }
  return (
    <Animated.View style={style}>
      <Card padding={expanded ? 16 : 10} gap={8} style={highlighted ? { backgroundColor: colors.accent.soft } : undefined}>
        <Animated.View pointerEvents="none" style={[ringShape, { borderColor: colors.accent.ember }, ring]} />
        <Animated.View pointerEvents="none" style={[ringShape, { borderColor: groupColor ?? "transparent" }, linkRing]} />
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
              <Txt variant="labelM" style={{ color: SUPERSET_INK }}>
                S
              </Txt>
            ) : (
              <Txt variant="labelM" style={{ color: isCurrent ? colors.accent.on : colors.text.secondary }}>
                {index + 1}
              </Txt>
            )}
          </View>
          <ExerciseMark exerciseId={ex.exerciseId} name={ex.name} size={32} onPress={onWatch} />
          <View style={{ flex: 1, gap: 1 }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={ex.name} onPress={() => { onToggle(); if (!expanded && !done) onFocus(); }} style={({ pressed }) => ({ opacity: pressed ? opacity.pressed : 1 })}>
              <Txt variant={expanded ? "displayM" : "labelL"}>{ex.name}</Txt>
              {expanded ? null : (
                <Txt variant="bodyS" tone="tertiary">
                  {done ? t("Done") : t("{n} of {m} sets", { n: doneCount, m: ex.sets.length })}
                </Txt>
              )}
            </Pressable>
          </View>
          {expanded ? null : <IconButton name="moreHorizontal" size={30} iconSize={16} tone="raised" onPress={onMore} accessibilityLabel={t("Exercise options")} />}
          <Pressable accessibilityRole="button" accessibilityLabel={expanded ? t("Collapse") : t("Expand")} hitSlop={10} onPress={onToggle} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
            <Animated.View style={chevron}>
              <Icon name="chevronDown" size={18} color={colors.text.tertiary} strokeWidth={2} />
            </Animated.View>
          </Pressable>
        </Row>

        {expanded ? (
          <Animated.View entering={layouts.enter} exiting={layouts.exit} style={{ gap: 8 }}>
            <Row gap={8} style={{ paddingTop: 8 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={t("Rest timer")} onPress={onRest} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 12, paddingRight: 8, height: 34, borderRadius: radius.pill, backgroundColor: colors.bg.raised, opacity: pressed ? opacity.pressed : 1 })}>
                <Icon name="timer" size={14} color={colors.text.secondary} strokeWidth={1.9} />
                <Txt variant="labelM">{fmtTime(ex.restSeconds)}</Txt>
                <Icon name="chevronDown" size={12} color={colors.text.tertiary} strokeWidth={2.2} />
              </Pressable>
              <View style={{ flex: 1 }} />
              <IconButton name="trash" size={34} iconSize={17} tone="danger" onPress={onRemove} accessibilityLabel={t("Remove from workout")} />
              <IconButton name="moreHorizontal" size={34} iconSize={18} tone="raised" onPress={onMore} accessibilityLabel={t("Exercise options")} />
            </Row>

            {/* The note sits under the controls, well clear of the name you tap to fold the card. */}
            {noteEditing ? (
              <TextInput
                value={ex.note ?? ""}
                onChangeText={onNote}
                onBlur={() => setNoteEditing(false)}
                onSubmitEditing={() => setNoteEditing(false)}
                autoFocus
                multiline
                returnKeyType="done"
                placeholder={t("Feet planted, pause on the chest")}
                placeholderTextColor={colors.text.tertiary}
                accessibilityLabel={t("Note")}
                style={{ fontFamily: fontFamily.italic, fontSize: 13, lineHeight: 18, color: colors.text.secondary, paddingVertical: 2, paddingTop: 8 }}
              />
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel={ex.note ? t("Edit note") : t("Add a note")} onPress={() => { keepKeyboard(); setNoteEditing(true); }} hitSlop={6} style={{ paddingTop: 8 }}>
                <Txt variant="bodyS" tone={ex.note ? "secondary" : "tertiary"} italic numberOfLines={2}>
                  {ex.note || t("Add a note")}
                </Txt>
              </Pressable>
            )}

            <Row gap={8} style={{ paddingHorizontal: 8, paddingTop: 12 }}>
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

            {/* The sets that are there when the card opens simply are there; one added or removed after that fades, and the rest make room. */}
            <LayoutAnimationConfig skipEntering skipExiting>
              <View style={{ gap: 4 }}>
                {ex.sets.map((s, i) => {
                  const current = isCurrent && !s.done && ex.sets.findIndex((x) => !x.done) === i;
                  return (
                    <AnimatedListItem key={s.id}>
                      <SetRow set={s} label={rows[i].label} isCurrent={current} record={rows[i].record} error={blocked?.id === s.id ? blocked.msg : undefined} onType={() => onSetType(s, i)} onChange={(patch) => onChange(s, patch)} onDone={() => onDone(s, i)} onRemove={() => onRemoveSet(s)} />
                    </AnimatedListItem>
                  );
                })}
              </View>
            </LayoutAnimationConfig>

            <Button label={t("Add set")} variant="secondary" size="S" icon="addPlus" onPress={onAddSet} style={{ marginTop: 8 }} />
          </Animated.View>
        ) : null}
      </Card>
    </Animated.View>
  );
}

/** Vertical drag that lifts the element, follows the finger, reports where it is, and where it let go. */
function useDrag(onStart: () => void, onMove: (dy: number) => void, onEnd: (dy: number) => void) {
  const { shadow } = useTheme();
  const ty = useSharedValue(0);
  const lift = useSharedValue(0);
  const drag = Gesture.Pan()
    .activeOffsetY([-gesture.dragStart, gesture.dragStart])
    .failOffsetX([-gesture.dragCross, gesture.dragCross])
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
  const lifted = shadow.lifted;
  const grow = distance.lift;
  const style = useAnimatedStyle(() => ({
    zIndex: lift.value > 0.01 ? 10 : 0,
    transform: [{ translateY: ty.value }, { scale: 1 + lift.value * grow }],
    shadowColor: lifted.shadowColor,
    shadowOpacity: lifted.shadowOpacity * lift.value,
    shadowRadius: lifted.shadowRadius * lift.value,
    shadowOffset: { width: 0, height: lifted.shadowOffset.height * lift.value },
    elevation: lifted.elevation * lift.value,
  }));
  return { drag, style };
}

/**
 * A figure at the top of the session. Given `count` it runs to its new value
 * instead of jumping, and leans green on the way up, warm on the way down, so
 * a completed set is visible in the total without a word being said.
 */
function Strip({ label, value, count, format, unit }: { label: string; value?: string; count?: number; format?: (n: number) => string; unit?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Txt variant="labelS" tone="tertiary">
        {label}
      </Txt>
      <Row gap={4} align="baseline">
        {count !== undefined && format ? (
          <CountUp value={count} format={format} />
        ) : (
        <Txt variant="numberM" tabular>
          {value}
        </Txt>
        )}
        {unit ? (
          <Txt variant="labelS" tone="secondary">
            {unit}
          </Txt>
        ) : null}
      </Row>
    </View>
  );
}

/**
 * One set. Swipe left and a delete button slides in behind the row; release
 * past halfway or with a flick and it stays open, otherwise it settles back.
 * Tap "previous" to copy last time's numbers into this set.
 *
 * Nothing on a row switches. Being the set you are on, being done and having a
 * finger on the tick are each a value between 0 and 1 on the UI thread, drawn
 * as the opacity of a layer: the soft ember behind the current row, the ember
 * and then the green (gold for a record) in the tick. Layers rather than
 * interpolated colours, because opacity is the cheapest thing a phone can
 * animate and there can be thirty of these on the screen.
 */
function SetRow({ set, label, isCurrent, record, error, onType, onChange, onDone, onRemove }: { set: SetEntry; label: string; isCurrent: boolean; /** A done set heavier than anything before it. */ record: boolean; error?: string; onType: () => void; onChange: (p: Partial<Pick<SetEntry, "kg" | "reps">>) => void; onDone: () => void; onRemove: () => void }) {
  const { colors, radius } = useTheme();
  const t = useT();
  const reduced = useReducedMotion();
  const boxBg = isCurrent ? colors.bg.ground : colors.bg.raised;
  const hasPrev = set.prevKg !== null;
  const prev = hasPrev ? `${set.prevKg || "BW"} × ${set.prevReps}` : "–";
  const quiet = !set.done && !isCurrent;
  const inputStyle = { width: "100%" as const, textAlign: "center" as const, color: quiet ? colors.text.tertiary : colors.text.primary, fontFamily: fontFamily.displaySemi, fontSize: 20, paddingVertical: 0 };
  // While a box has focus the typed text is the truth. Reading the number back
  // out on every keystroke ate the decimal point, so 2.5 kg could not be typed.
  const [draft, setDraft] = useState<{ kg?: string; reps?: string }>({});
  const [editing, setEditing] = useState<"kg" | "reps" | null>(null);
  const focus = useSharedValue(isCurrent ? 1 : 0);
  const ticked = useSharedValue(set.done ? 1 : 0);
  const down = useSharedValue(0);
  const nudge = useSharedValue(0);
  const tx = useSharedValue(0);
  const startX = useSharedValue(0);
  useEffect(() => {
    focus.set(withTiming(isCurrent ? 1 : 0, timings.fast));
  }, [isCurrent, focus]);
  useEffect(() => {
    ticked.set(withTiming(set.done ? 1 : 0, timings.fast));
    if (set.done) tx.set(withSpring(0, springs.base));
  }, [set.done, ticked, tx]);
  // A refusal is one small step each way and back, not a shake; with Reduce Motion on the red outline and the words say it alone.
  useEffect(() => {
    if (error) nudge.set(withSequence(withTiming(-distance.nudge, timings.step), withTiming(distance.nudge, timings.step), withTiming(0, timings.step)));
  }, [error, nudge]);

  const reveal = gesture.reveal;
  const pan = Gesture.Pan()
    .activeOffsetX([-gesture.swipeStart, gesture.swipeStart])
    .failOffsetY([-gesture.swipeCross, gesture.swipeCross])
    .onStart(() => {
      startX.set(tx.get());
    })
    .onUpdate((e) => {
      const raw = startX.get() + e.translationX;
      tx.set(raw > 0 ? rubberband(raw, reveal, 0.3) : raw < -reveal ? -reveal + rubberband(raw + reveal, reveal, 0.3) : raw);
    })
    .onEnd((e) => {
      const projected = tx.get() + project(e.velocityX);
      tx.set(withSpring(projected < -reveal / 2 ? -reveal : 0, springs.base));
    });

  const dimTo = opacity.dimmed;
  const loud = !!error;
  const give = pressScale.check;
  const pressDim = opacity.reducedPress;
  const rowAnim = useAnimatedStyle(() => ({ transform: [{ translateX: tx.get() + nudge.get() }], opacity: loud ? 1 : dimTo + (1 - dimTo) * Math.max(focus.get(), ticked.get()) }));
  const focusFill = useAnimatedStyle(() => ({ opacity: focus.get() }));
  const trashAnim = useAnimatedStyle(() => ({ opacity: Math.min(1, -tx.get() / (reveal * 0.6)), transform: [{ scale: 0.7 + 0.3 * Math.min(1, -tx.get() / reveal) }] }));
  const tickGive = useAnimatedStyle(() => (reduced ? { opacity: 1 - (1 - pressDim) * down.get() } : { transform: [{ scale: 1 - (1 - give) * down.get() }] }));
  const emberFill = useAnimatedStyle(() => ({ opacity: focus.get() * (1 - ticked.get()) }));
  const doneFill = useAnimatedStyle(() => ({ opacity: ticked.get() }));
  const tickMark = useAnimatedStyle(() => ({ opacity: Math.max(focus.get(), ticked.get()) }));
  const close = () => {
    tx.set(withSpring(0, springs.base));
  };
  const cover = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;
  const box = (on: boolean) => ({ flex: 1, height: 40, borderRadius: radius.input, backgroundColor: boxBg, justifyContent: "center" as const, borderWidth: 1, borderColor: on ? colors.accent.ember : "transparent" });
  return (
    <View>
      <View style={{ position: "relative", overflow: "hidden", borderRadius: radius.setRow }}>
        <Animated.View style={[{ position: "absolute", right: 0, top: 0, bottom: 0, width: reveal, alignItems: "center", justifyContent: "center" }, trashAnim]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Delete set")} onPress={() => { close(); onRemove(); }} style={({ pressed }) => ({ width: 44, height: 40, borderRadius: radius.input, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.status.warning : colors.status.danger })}>
            <Icon name="trash" size={18} color={colors.text.primary} strokeWidth={2} />
          </Pressable>
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: radius.setRow, backgroundColor: colors.bg.surface }, rowAnim]}>
            <Animated.View pointerEvents="none" style={[cover, { borderRadius: radius.setRow, backgroundColor: colors.accent.soft }, focusFill]} />
            {error ? <View pointerEvents="none" style={[cover, { borderRadius: radius.setRow, borderWidth: 1.5, borderColor: colors.status.danger }]} /> : null}
            <Pressable accessibilityRole="button" onPress={onType} hitSlop={6} style={{ width: 28 }} accessibilityLabel={t("Set type")}>
              <Txt variant="labelL" tone={isCurrent ? "ember" : set.type === "warmup" ? "tertiary" : "primary"}>
                {label}
              </Txt>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={hasPrev ? t("Use previous, {prev}", { prev }) : t("No previous set")} disabled={!hasPrev} onPress={() => { feel("copyPrevious"); onChange({ kg: set.prevKg ?? set.kg, reps: set.prevReps ?? set.reps }); }} hitSlop={4} style={({ pressed }) => ({ width: 72, alignItems: "center", opacity: pressed ? opacity.pressed : 1 })}>
              <Txt style={{ fontFamily: fontFamily.displaySemi, fontSize: 15, lineHeight: 20, letterSpacing: -0.1, color: hasPrev ? colors.text.secondary : colors.text.tertiary }} tabular>
                {prev}
              </Txt>
            </Pressable>
            <View style={box(editing === "kg")}>
              <TextInput
                value={draft.kg ?? String(set.kg)}
                onChangeText={(v) => {
                  const clean = v.replace(",", ".").replace(/[^0-9.]/g, "");
                  setDraft((d) => ({ ...d, kg: clean }));
                  onChange({ kg: Number(clean) || 0 });
                }}
                onFocus={() => setEditing("kg")}
                onBlur={() => { setEditing((e) => (e === "kg" ? null : e)); setDraft((d) => ({ ...d, kg: undefined })); }}
                keyboardType="decimal-pad"
                selectTextOnFocus
                selectionColor={colors.accent.ember}
                accessibilityLabel={t("Weight in kilograms")}
                style={inputStyle}
              />
            </View>
            <View style={box(editing === "reps")}>
              <TextInput
                value={draft.reps ?? String(set.reps)}
                onChangeText={(v) => {
                  const clean = v.replace(/[^0-9]/g, "");
                  setDraft((d) => ({ ...d, reps: clean }));
                  onChange({ reps: Number(clean) || 0 });
                }}
                onFocus={() => setEditing("reps")}
                onBlur={() => { setEditing((e) => (e === "reps" ? null : e)); setDraft((d) => ({ ...d, reps: undefined })); }}
                keyboardType="number-pad"
                selectTextOnFocus
                selectionColor={colors.accent.ember}
                accessibilityLabel={t("Repetitions")}
                style={inputStyle}
              />
            </View>
            <Animated.View style={tickGive}>
              <Pressable
                onPress={onDone}
                onPressIn={() => { down.set(withSpring(1, springs.press)); }}
                onPressOut={() => { down.set(withSpring(0, springs.press)); }}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityState={{ checked: set.done }}
                accessibilityLabel={set.done ? (record ? t("Undo set, a record") : t("Undo set")) : t("Complete set")}
                style={{ width: 40, height: 40, borderRadius: radius.input, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: colors.bg.raised }}
              >
                <Animated.View pointerEvents="none" style={[cover, { backgroundColor: colors.accent.ember }, emberFill]} />
                <Animated.View pointerEvents="none" style={[cover, { backgroundColor: record ? colors.pr.gold : colors.status.success }, doneFill]} />
                <Animated.View style={tickMark}>
                  <Icon name={record ? "trophy" : "check"} size={18} color={colors.accent.on} strokeWidth={record ? 2 : 2.6} />
                </Animated.View>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>
      {error ? (
        <Animated.View entering={layouts.enter} exiting={layouts.exit} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, paddingTop: 4, paddingBottom: 2 }}>
          <Icon name="info" size={13} color={colors.status.danger} strokeWidth={2.2} />
          <Txt variant="labelS" style={{ color: colors.status.danger }}>
            {error}
          </Txt>
        </Animated.View>
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


/**
 * A number that travels to its new value in a quarter of a second, so a ticked
 * set is visible in the total. Nothing else moves: no pulse, no colour.
 */
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const a = shown;
    if (Math.abs(a - value) < 0.5) return;
    const started = Date.now();
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / 260);
      setShown(a + (value - a) * (1 - Math.pow(1 - p, 3)));
      if (p >= 1 && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    }, 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  return (
    <Txt variant="numberM" tabular>
      {format(shown)}
    </Txt>
  );
}
