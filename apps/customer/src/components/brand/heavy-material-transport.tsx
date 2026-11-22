import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

/**
 * A deliberately quiet home-footer illustration: a loaded tipper travelling
 * along a material route. It has no background or copy, so it can sit directly
 * on either app theme without becoming another card.
 */
export function HeavyMaterialTransport({
  width,
  accent,
  ink,
  soft,
}: {
  width: number;
  accent: string;
  ink: string;
  soft: string;
}) {
  const height = (width * 230) / 640;

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 640 230"
      accessibilityRole="image"
      accessibilityLabel="A tipper truck carrying construction material">
      {/* The route and material piles are intentionally low-contrast. */}
      <Path d="M44 190 C156 157 230 212 350 183 S512 157 598 182" fill="none" stroke={soft} strokeWidth={3} strokeDasharray="9 12" />
      <Path d="M42 199 H598" fill="none" stroke={soft} strokeWidth={2} opacity={0.72} />
      <G opacity={0.72}>
        <Path d="M72 172 L112 129 L154 172 Z" fill={soft} />
        <Path d="M116 172 L156 141 L196 172 Z" fill={soft} opacity={0.72} />
        <Path d="M481 177 L513 149 L545 177 Z" fill={soft} opacity={0.68} />
      </G>

      {/* Tipper body: a small set of durable shapes rather than a detailed scene. */}
      <G>
        <Path d="M204 72 H405 L431 139 H231 Z" fill={accent} />
        <Path d="M218 84 H389 L405 128 H235 Z" fill={ink} opacity={0.17} />
        <Path d="M206 72 L226 52 H395 L405 72 Z" fill={accent} opacity={0.78} />
        <Path d="M236 52 C270 30 330 30 367 52 Z" fill={soft} opacity={0.9} />

        <Path d="M431 91 H488 C500 91 508 99 510 111 L520 142 H431 Z" fill={accent} />
        <Path d="M454 101 H486 L494 121 H454 Z" fill={ink} opacity={0.2} />
        <Rect x={211} y={139} width={312} height={16} rx={8} fill={ink} opacity={0.92} />
        <Rect x={250} y={154} width={40} height={10} rx={5} fill={accent} />
        <Rect x={420} y={154} width={40} height={10} rx={5} fill={accent} />

        <Circle cx={272} cy={162} r={23} fill={ink} />
        <Circle cx={272} cy={162} r={10} fill={soft} />
        <Circle cx={447} cy={162} r={23} fill={ink} />
        <Circle cx={447} cy={162} r={10} fill={soft} />
        <Circle cx={272} cy={162} r={4} fill={accent} />
        <Circle cx={447} cy={162} r={4} fill={accent} />
      </G>

      {/* A subtle destination marker makes the transport intent legible without copy. */}
      <G transform="translate(557 64)">
        <Path d="M18 0 C8 0 0 8 0 18 C0 32 18 48 18 48 C18 48 36 32 36 18 C36 8 28 0 18 0 Z" fill={accent} />
        <Circle cx={18} cy={18} r={6} fill={ink} opacity={0.75} />
      </G>
    </Svg>
  );
}
