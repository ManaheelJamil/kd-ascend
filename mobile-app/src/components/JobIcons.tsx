/**
 * Icons of the Jobs module, exported from the Figma file (assets/figma/jobs, see assets.ts).
 * Each SVG keeps its Figma size and sits centred in the box the design gives it.
 * Only the copy icon of the booking header is drawn here (its asset couldn't be exported).
 */
import React from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { Path, Rect, Svg } from 'react-native-svg';
import { JobSvg, jobImages } from '../assets';
import { colors } from '../theme';

function Box({ size, children, style }: { size: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>{children}</View>;
}

/* Cards (Figma "Frame 22") */
export const IconPin = () => (
  <Box size={14.917}>
    <JobSvg.CardLocation />
  </Box>
);
export const IconCalendarSmall = () => <JobSvg.CardCalendar />;
export const Dot = () => <JobSvg.Dot />;
export const IconPerson = () => <JobSvg.Person />;
/** Orange arrow of "View Detail", turned to point up-right like the design. */
export const IconArrowUpRight = () => (
  <Box size={8} style={{ overflow: 'visible' }}>
    <View style={{ transform: [{ rotate: '-45deg' }, { scale: 0.86 }] }}>
      <JobSvg.ArrowOrange />
    </View>
  </Box>
);
export const IconArrowRightWhite = () => <JobSvg.ArrowWhite />;

/* Home header */
/** Bell button (44pt); the red dot shows only when there are unread notifications. */
export const IconBell = ({ dot = false }: { dot?: boolean }) => (dot ? <JobSvg.Bell /> : <JobSvg.BellPlain />);
export const IconVerified = () => <JobSvg.Verified />;
export const IconSearch = () => (
  <Box size={27}>
    <JobSvg.Search />
  </Box>
);
export const IconFilterWhite = () => <JobSvg.FilterWhite />;

/* Search / filters */
export const IconBack = () => <JobSvg.Back />;
export const IconSearchSmall = () => (
  <Box size={23}>
    <JobSvg.SearchSm />
  </Box>
);
export const IconFilterOrangeSmall = () => <JobSvg.FilterOrangeSm />;
export const IconFilterOrange = () => <JobSvg.FilterOrange />;
export const IconSort = () => <JobSvg.Sort />;
export const IconChevronDown = () => <JobSvg.ChevronDown />;
export const SliderThumb = () => <JobSvg.Thumb />;
export const Toggle = ({ on }: { on: boolean }) => (on ? <JobSvg.Toggle /> : <JobSvg.ToggleOff />);

/* Job detail */
export const IconPinDetail = () => (
  <Box size={14.917}>
    <JobSvg.DetailLocation />
  </Box>
);
export const TileCalendar = () => (
  <Box size={32}>
    <JobSvg.CalendarLg />
  </Box>
);
export const TileClock = () => (
  <Box size={32}>
    <JobSvg.ClockLg />
  </Box>
);
export const TileDollar = () => (
  <Box size={32}>
    <JobSvg.DollarLg />
  </Box>
);
/** Clock for the "Time" tile of the completed booking (28pt box, no padding). */
export const TileClockTight = () => (
  <Box size={28}>
    <JobSvg.ClockLg />
  </Box>
);
export const IconPersonOrange = () => <JobSvg.PersonOrange />;
export const IconTick = () => (
  <Box size={15}>
    <JobSvg.Tick />
  </Box>
);
/** Red warning triangle of the Cancellation Policy box (sits 20% lower in its frame). */
export const IconWarning = () => (
  <View style={{ width: 23.646, height: 24.986 }}>
    <View style={{ position: 'absolute', top: 24.986 * 0.2001 }}>
      <JobSvg.Warning />
    </View>
  </View>
);
export const IconNavigate = () => <JobSvg.MapNavigate />;
export const MapPin = () => <JobSvg.MapPin />;
export const MapImage = ({ style }: { style?: StyleProp<ViewStyle> }) => (
  <Image source={jobImages.map} style={[{ width: '100%', height: '100%' }, style as object]} resizeMode="cover" />
);

/* Popups */
export const ModalClock = () => (
  <Box size={23}>
    <JobSvg.ClockSm />
  </Box>
);
export const ModalCalendar = () => (
  <Box size={23}>
    <JobSvg.CalendarSm />
  </Box>
);
export const ModalDollar = () => (
  <Box size={23}>
    <JobSvg.DollarSm />
  </Box>
);
export const PendingClock = () => <JobSvg.PendingMask />;
/** Green badge with a tick (Figma mask group 281:892, 93×93). */
export const IllusSubmitted = () => (
  <Image source={jobImages.badgeMask} style={{ width: 93, height: 93, tintColor: colors.green }} resizeMode="contain" />
);
/** Red calendar with a cross (Figma mask group 308:665, 97×97). */
export const IllusCancelBooking = () => (
  <Image source={jobImages.cancelMask} style={{ width: 97, height: 97, tintColor: colors.error }} resizeMode="contain" />
);

/* Bookings */
export const IconBuilding = () => <JobSvg.Building />;
export const IconBookingCalendar = () => <JobSvg.BookingCalendar />;
/** Dollar coin (shown flipped vertically in the design). */
export const IconDollarCircle = () => (
  <Box size={20}>
    <View style={{ transform: [{ scaleY: -1 }] }}>
      <JobSvg.DollarCircle />
    </View>
  </Box>
);

/** tabler:copy (28pt) — drawn, as the asset couldn't be exported. */
export function IconCopy({ size = 28, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={7} y={7} width={14} height={14} rx={2.5} stroke={color} strokeWidth={1.6} />
      <Path d="M17 7V5.5A2.5 2.5 0 0 0 14.5 3h-9A2.5 2.5 0 0 0 3 5.5v9A2.5 2.5 0 0 0 5.5 17H7" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}
