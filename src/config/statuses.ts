import { BookingStatus } from '@/types';

export interface StatusMeta {
  key: BookingStatus;
  userLabel: string;
  driverLabel: string;
  ladderStep: number | null; // 1-6 for ladder rungs, null for draft/searching/cancelled/no_drivers
}

export const TRIP_LADDER_STATUSES: BookingStatus[] = [
  'ACCEPTED',
  'AT_PICKUP',
  'LOADED',
  'IN_TRANSIT',
  'AT_DROP',
  'COMPLETED',
];

export const STATUS_DEFINITIONS: Record<BookingStatus, StatusMeta> = {
  DRAFT: {
    key: 'DRAFT',
    userLabel: 'Draft',
    driverLabel: 'Draft',
    ladderStep: null,
  },
  SEARCHING: {
    key: 'SEARCHING',
    userLabel: 'Finding a lorry for you',
    driverLabel: 'Searching',
    ladderStep: null,
  },
  ACCEPTED: {
    key: 'ACCEPTED',
    userLabel: 'Lorry confirmed',
    driverLabel: 'Go to pickup',
    ladderStep: 1,
  },
  AT_PICKUP: {
    key: 'AT_PICKUP',
    userLabel: 'Driver at pickup point',
    driverLabel: 'Confirm loading',
    ladderStep: 2,
  },
  LOADED: {
    key: 'LOADED',
    userLabel: 'Load picked up',
    driverLabel: 'Start trip',
    ladderStep: 3,
  },
  IN_TRANSIT: {
    key: 'IN_TRANSIT',
    userLabel: 'On the way to your site',
    driverLabel: 'Reached drop point',
    ladderStep: 4,
  },
  AT_DROP: {
    key: 'AT_DROP',
    userLabel: 'Driver reached your site',
    driverLabel: 'Confirm unload',
    ladderStep: 5,
  },
  COMPLETED: {
    key: 'COMPLETED',
    userLabel: 'Delivered',
    driverLabel: 'Trip complete',
    ladderStep: 6,
  },
  CANCELLED: {
    key: 'CANCELLED',
    userLabel: 'Trip cancelled',
    driverLabel: 'Trip cancelled',
    ladderStep: null,
  },
  NO_DRIVERS: {
    key: 'NO_DRIVERS',
    userLabel: 'No lorry available right now',
    driverLabel: 'No drivers found',
    ladderStep: null,
  },
};
