import {PrimaryButton} from '@/components/ui/primary-button';
import { router } from 'expo-router';
import { Text, View,Switch,TextInput } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { BookingLayout } from '@/components/booking/booking-layout';
import { SchedulePicker } from '@/components/booking/schedule-picker';
import { CheckCircle2, School, TriangleAlert } from '@/components/ui/icons';
import { IconChip, type MIconName } from '@/components/ui/m-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { useBooking } from '@/lib/booking';
import { choiceHaptic } from '@/lib/haptics';
import { asapBlockedUntil, checkSchedule, DEFAULT_SCHEDULE, type ScheduleInput } from '@/lib/schedule';
import { useSession } from '@/lib/session';
import { formatWhen, useNow } from '@/lib/trip-format';
import { enterAt } from '@/lib/motion';

/** Step 3: choose timing and site instructions, then confirm with Continue. */
export default function WhenStep() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, language } = useSession();
  const { draft, update } = useBooking();
  const now = new Date(useNow(30_000));

  const scheduling = draft.when.mode === 'schedule';
  const schedule = draft.when.mode === 'schedule' ? draft.when : DEFAULT_SCHEDULE;
  const check = checkSchedule(schedule, now);
  const asapUntil = asapBlockedUntil(now);

  function advance() {
    if (scheduling ? check.ok : !asapUntil) router.push('/book/truck');
  }

  function pickSlot(next: ScheduleInput) {
    update({when:{mode:'schedule',...next}});
  }

  return (
    <BookingLayout
      title={t('whenTitle')}
      step={3}
      footer={<PrimaryButton label={t('continue')} disabled={scheduling ? !check.ok : !!asapUntil} onPress={advance} />}>
      <Text style={styles.h1} accessibilityRole="header">
        {t('whenNeeded')}
      </Text>

      <Text style={styles.notesLabel}>{t('notesLabel')}</Text>
      <TextInput
        accessibilityLabel={t('notesLabel')}
        multiline
        maxLength={1000}
        value={draft.notes}
        onChangeText={(notes) => update({ notes })}
        placeholder={t('notesPlaceholder')}
        placeholderTextColor={Brand.muted}
        style={styles.notes}
      />
      <View style={styles.helpers}>
        <Text style={styles.helperLabel}>{t('helpersLabel')}</Text>
        <Switch
          accessibilityLabel={t('helpersLabel')}
          value={!!draft.labourNeeded}
          onValueChange={(labourNeeded) => update({ labourNeeded })}
        />
      </View>
      <View style={styles.choices} accessibilityRole="radiogroup">
        <Choice
          icon={asapUntil ? 'lock-outline' : 'truck-fast'}
          title={t('nowShort')}
          sub={asapUntil ? t('fromTime', { time: asapUntil }) : t('earliestTruck')}
          selected={!scheduling}
          blocked={!!asapUntil}
          onPress={() => {
            update({ when: { mode: 'now' } });

          }}
        />
        <Choice
          icon="calendar-clock"
          title={t('laterShort')}
          sub={scheduling && check.ok ? formatWhen(language, check.date) : t('pickSlot')}
          selected={scheduling}
          onPress={() => update({ when: { mode: 'schedule', ...schedule } })}
        />
      </View>

      <View style={styles.school}>
        <School size={16} color={Brand.link} strokeWidth={2} />
        <Text style={styles.schoolText}>School-hour restrictions · Coming soon</Text>
      </View>

      {scheduling && (
        <Animated.View entering={enterAt()} exiting={FadeOut.duration(120)} style={styles.picker}>
          <SchedulePicker
            value={schedule}
            now={now}
            onChange={(next) => update({ when: { mode: 'schedule', ...next } })}
            onSlotPicked={pickSlot}
          />
          {check.ok ? (
            <View style={styles.status}>
              <CheckCircle2 size={18} color={Brand.success} strokeWidth={2.25} />
              <Text style={[styles.statusText, styles.ok]}>{formatWhen(language, check.date)}</Text>
            </View>
          ) : (
            <View style={styles.status} accessibilityRole="alert">
              <TriangleAlert size={18} color={Brand.danger} strokeWidth={2.25} />
              <Text style={[styles.statusText, styles.bad]}>
                {check.reason === 'past' ? t('timePast') : check.reason === 'restricted' ? t('timeRestricted') : t('pickSlot')}
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </BookingLayout>
  );
}

function Choice({
  icon,
  title,
  sub,
  selected,
  blocked,
  onPress,
}: {
  icon: MIconName;
  title: string;
  sub: string;
  selected: boolean;
  blocked?: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <PressableScale
      onPress={() => {
        choiceHaptic();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}, ${sub}`}
      style={[styles.choice, selected && styles.choiceOn, selected && blocked && styles.choiceBlocked]}>
      <IconChip name={icon} size={46} tone={selected ? 'solid' : 'neutral'} />
      <View style={styles.choiceText}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={[styles.choiceSub, selected && blocked && styles.bad]} numberOfLines={2}>
          {sub}
        </Text>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>
    </PressableScale>
  );
}

const useStyles = makeStyles((Brand) => ({
  notesLabel: { color: Brand.text, marginTop: 16, marginBottom: 8, fontSize: 15 },
  notes: {
    color: Brand.text,
    backgroundColor: Brand.card,
    borderColor: Brand.border,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helpers: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  helperLabel: { flex: 1, color: Brand.text, fontSize: 15 },
  h1: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    color: Brand.text,
  },
  // Two full-width rows, one decision: now, or a chosen time.
  choices: {
    marginTop: 16,
    gap: 10,
  },
  choice: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
  },
  choiceOn: {
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  choiceBlocked: {
    borderColor: Brand.danger,
    backgroundColor: Brand.dangerFill,
  },
  choiceText: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.text,
  },
  choiceSub: {
    marginTop: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Brand.muted,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: Brand.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Brand.primary,
  },
  school: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Brand.selected,
  },
  schoolText: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.link,
  },
  picker: {
    marginTop: 20,
    gap: 12,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  ok: {
    color: Brand.success,
  },
  bad: {
    color: Brand.danger,
  },
}));
