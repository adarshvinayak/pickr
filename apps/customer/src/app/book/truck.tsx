import {PrimaryButton} from '@/components/ui/primary-button';
import {TripMap} from '@/components/maps/trip-map';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { BookingLayout } from '@/components/booking/booking-layout';
import { AnimatedTruckCard } from '@/components/AnimatedTruckCard';
import { EmptyState } from '@/components/trips/empty-state';
import { Banknote, ChevronDown, type LucideIcon, Package, Truck } from '@/components/ui/icons';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { passReady, useBooking, useQuote } from '@/lib/booking';
import { loadsLabel, quantityText } from '@/lib/booking-format';
import { getCategory, pick, type VehicleId } from '@/lib/catalog';
import { choiceHaptic, tapHaptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import { formatRupees } from '@/lib/trip-format';
import { enterAt } from '@/lib/motion';

/**
 * Step 4 of 5 (handoff C08), ride-app style: the route on a live map, the
 * recommended truck selected first, other suitable trucks behind "More
 * trucks" (meeting 2026-11-04). Only quoted options; prices are approximate.
 */
export default function TruckStep() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, language } = useSession();
  const { draft, setVehicle } = useBooking();
  const {item,quotes,chosen,error,busy}=useQuote();
  const recommended = quotes[0];
  const others = quotes.slice(1);
  // Open the list straight away if the customer already picked a non-recommended truck.
  const [showMore, setShowMore] = useState(!!draft.vehicleId && draft.vehicleId !== recommended?.vehicle.id);

  if (!item || !recommended || !chosen) {
    return (
      <BookingLayout title={t('selectTruck')} step={4} footer={<PrimaryButton label={busy?t('continue'):t('checkLocations')} disabled={busy} onPress={()=>router.push('/book/route')}/>}>
        <EmptyState icon={Truck} title={busy?'Checking route and price…':t('noTruckFits')} body={error||t('noTruckFitsSub')} />
      </BookingLayout>
    );
  }

  const shown = showMore ? quotes : [recommended];

  // Truck selection stays on this screen until the customer presses Continue.
  function choose(vehicleId:VehicleId){choiceHaptic();setVehicle(vehicleId);}
  function next(){if (!busy && chosen) router.push(item?.transitPass&&!passReady(draft)?'/book/pass':'/book/review');}

  return (
    <BookingLayout
      title={t('selectTruck')}
      step={4}
      footer={<PrimaryButton label={t('continue')} disabled={busy||!chosen} onPress={next}/>}
      summary={`${pick(item.name, language)} · ${quantityText(t, item.measure, draft.quantity)} · ₹${formatRupees(chosen.total)}`}
>
      <View style={{height:200}}><TripMap pickup={draft.pickup?.coords} delivery={draft.delivery?.coords} pickupLabel="Pickup" deliveryLabel="Delivery"/></View>

      <View style={styles.loadChip}>
        <ImagePlaceholder source={item.image} tint={item.tint} icon={getCategory(item.category)!.icon} iconSize={14} style={styles.loadThumb} />
        <Text style={styles.loadText} numberOfLines={1}>
          {pick(item.name, language)} · {quantityText(t, item.measure, draft.quantity).split(' · ')[0]}
        </Text>
      </View>

      <Text style={styles.hint}>{t('truckContinueHint')}</Text>
      <View style={styles.list} accessibilityRole="radiogroup">
        {shown.map((quote:any, i:number) => (
          <Animated.View
            key={quote.vehicle.id}
            entering={i === 0 ? undefined : enterAt(0, i * 50)}
            layout={LinearTransition}>
            <AnimatedTruckCard
              quote={quote}
              language={language}
              badge={i === 0 ? t('recommended') : undefined}
              tripsLabel={loadsLabel(t, quote.loads)}
              selected={chosen.vehicle.id === quote.vehicle.id}
              onPress={() => choose(quote.vehicle.id)}
            />
          </Animated.View>
        ))}

        {others.length > 0 && !showMore && (
          <Pressable
            onPress={() => {
              tapHaptic();
              setShowMore(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('findMoreTrucks', { n: others.length })}
            hitSlop={6}
            style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
            <Text style={styles.moreText}>{t('findMoreTrucks', { n: others.length })}</Text>
            <ChevronDown size={18} color={Brand.link} strokeWidth={2.25} />
          </Pressable>
        )}
      </View>

      <View style={styles.facts}>
        <Fact icon={Banknote} label={t('cashUpiChip')} />
        <Fact icon={Package} label={t('noMaterialChip')} />
      </View>
    </BookingLayout>
  );
}

function Fact({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const Brand = useBrand();
  const styles = useStyles();
  return (
    <View style={styles.fact}>
      <Icon size={16} color={Brand.success} strokeWidth={2.25} />
      <Text style={styles.factText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  hint: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: Brand.muted,
  },
  facts: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Brand.surface,
  },
  factText: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.text,
  },
  loadChip: {
    marginTop: 14,
    marginBottom: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Brand.surface,
  },
  loadThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  loadText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.text,
  },
  list: {
    gap: 12,
  },
  more: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.6,
  },
  moreText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.link,
  },
}));
