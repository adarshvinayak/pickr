import {getSnapshot} from '@/lib/api';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { ProfilePage } from '@/components/profile/settings';
import { Clock, Handshake, type LucideIcon, ShieldCheck, Star, UserRoundCheck } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { enterAt, STAGGER_MS } from '@/lib/motion';
import { demoRating } from '@/lib/rating';
import { useSession } from '@/lib/session';
import { useTrips } from '@/lib/trips';

const HERO = require('@/assets/images/profile/rating.webp');
const PILL_FROM = 150;

/**
 * My rating: an illustration, the rating large in the centre (it stays
 * centred in a pill at the top once you scroll), how it is calculated, and
 * the four things drivers rate, as equal icon tiles.
 */
export default function Rating(){const {average,count}=getSnapshot()?.account.rating||{average:null,count:0};return <ProfilePage title="My customer rating"><Text style={{fontSize:36,fontWeight:'700'}}>{average==null?'Not rated yet':average.toFixed(2)+' / 5'}</Text><Text>{count} driver ratings from completed paid trips.</Text></ProfilePage>;}
