import React, { memo, useId, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import type { BannerPattern as BannerPatternData } from '../../lib/cosmetics';

/**
 * Anime / manga style overlays drawn on top of a banner gradient. Everything is original vector
 * art generated from a fixed seed, so a pattern looks the same on every device. Each pattern is a
 * handful of SVG paths (shapes are merged into one path), so it stays cheap to render.
 * The art is laid out on a 400×160 canvas and scaled to cover the banner.
 */

const W = 400;
const H = 160;

// Small deterministic PRNG (mulberry32)
const rng = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const f = (n: number) => n.toFixed(1);
const circlePath = (x: number, y: number, r: number) =>
    `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`;

/** Manga "concentration lines" bursting from a point on the right */
const speedLines = () => {
    const rand = rng(7);
    const cx = 300;
    const cy = 70;
    let d = '';
    for (let i = 0; i < 90; i++) {
        const a = (i / 90) * Math.PI * 2 + rand() * 0.05;
        const w = 0.008 + rand() * 0.02;
        const r0 = 45 + rand() * 50;
        const r1 = 520;
        const x0 = cx + Math.cos(a) * r0;
        const y0 = cy + Math.sin(a) * r0;
        d += `M${f(x0)} ${f(y0)}L${f(cx + Math.cos(a - w) * r1)} ${f(cy + Math.sin(a - w) * r1)}`
            + `L${f(cx + Math.cos(a + w) * r1)} ${f(cy + Math.sin(a + w) * r1)}Z`;
    }
    return d;
};

/** Screentone dots growing toward the top right */
const halftone = () => {
    let d = '';
    const step = 12;
    for (let row = 0; row * step <= H + step; row++) {
        const y = row * step;
        const offset = row % 2 ? step / 2 : 0;
        for (let x = offset; x <= W + step; x += step) {
            const t = Math.min(1, Math.max(0, (x / W) * 0.75 + (1 - y / H) * 0.35 - 0.1));
            const r = t * step * 0.48;
            if (r > 0.4) d += circlePath(x, y, r);
        }
    }
    return d;
};

const PETAL = 'M0 -9C6 -9 8.5 -2 0 9C-8.5 -2 -6 -9 0 -9Z';

/** Falling cherry blossom petals and a few full flowers */
const sakura = () => {
    const rand = rng(21);
    const petals: { x: number; y: number; r: number; s: number; o: number }[] = [];
    for (let i = 0; i < 26; i++) {
        petals.push({ x: rand() * W, y: rand() * H, r: rand() * 360, s: 0.5 + rand() * 0.9, o: 0.45 + rand() * 0.55 });
    }
    const flowers = [
        { x: 330, y: 40, s: 1.5 },
        { x: 372, y: 108, s: 1.1 },
        { x: 60, y: 120, s: 0.9 },
    ];
    return { petals, flowers };
};

/** Night sky: dust of stars plus a few four-point sparkles */
const stars = () => {
    const rand = rng(3);
    let dots = '';
    for (let i = 0; i < 110; i++) dots += circlePath(rand() * W, rand() * H, 0.4 + rand() * 1.1);
    let sparkles = '';
    for (let i = 0; i < 7; i++) {
        const x = 20 + rand() * (W - 140);
        const y = 15 + rand() * (H - 30);
        const s = 3 + rand() * 4;
        sparkles += `M${f(x)} ${f(y - s * 2)}Q${f(x)} ${f(y)} ${f(x + s * 2)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y + s * 2)}`
            + `Q${f(x)} ${f(y)} ${f(x - s * 2)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y - s * 2)}Z`;
    }
    return { dots, sparkles };
};

/** Seigaiha (blue ocean waves): rows of concentric arcs */
const seigaiha = () => {
    let d = '';
    const R = 22;
    for (let row = 0; row * (R / 2) <= H + R; row++) {
        const y = row * (R / 2);
        const offset = row % 2 ? R : 0;
        for (let x = offset - R; x <= W + R; x += R * 2) {
            for (const r of [R, R * 0.7, R * 0.4]) d += `M${f(x - r)} ${f(y)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}`;
        }
    }
    return d;
};

/** Retro "Neo Tokyo" grid running to a horizon */
const synthGrid = () => {
    const horizon = 112;
    let d = '';
    for (let i = -12; i <= 12; i++) d += `M${f(W / 2 + i * 6)} ${horizon}L${f(W / 2 + i * 70)} ${H}`;
    for (let k = 1; k <= 6; k++) {
        const y = horizon + Math.pow(k / 6, 1.8) * (H - horizon);
        d += `M0 ${f(y)}L${W} ${f(y)}`;
    }
    return { d, horizon };
};

/** Glossy diagonal light bands with soft bokeh */
const shine = () => {
    const rand = rng(11);
    const bands = `M60 -20L130 -20L40 ${H + 20}L-30 ${H + 20}Z M190 -20L215 -20L125 ${H + 20}L100 ${H + 20}Z M300 -20L390 -20L300 ${H + 20}L210 ${H + 20}Z`;
    let bokeh = '';
    for (let i = 0; i < 14; i++) bokeh += circlePath(rand() * W, rand() * H, 4 + rand() * 14);
    return { bands, bokeh };
};

const BannerPatternImpl: React.FC<{ pattern: BannerPatternData }> = ({ pattern }) => {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const { type, color, opacity } = pattern;

    const art = useMemo(() => {
        switch (type) {
            case 'speedlines':
                return <Path d={speedLines()} fill={color} opacity={opacity} />;
            case 'halftone':
                return <Path d={halftone()} fill={color} opacity={opacity} />;
            case 'sakura': {
                const { petals, flowers } = sakura();
                return (
                    <>
                        {petals.map((p, i) => (
                            <Path
                                key={`p${i}`}
                                d={PETAL}
                                fill={color}
                                opacity={opacity * p.o}
                                transform={`translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.r)}) scale(${f(p.s)})`}
                            />
                        ))}
                        {flowers.map((fl, i) => (
                            <React.Fragment key={`f${i}`}>
                                {[0, 72, 144, 216, 288].map(rot => (
                                    <Path
                                        key={rot}
                                        d={PETAL}
                                        fill={color}
                                        opacity={opacity}
                                        transform={`translate(${fl.x} ${fl.y}) rotate(${rot}) scale(${fl.s}) translate(0 -9)`}
                                    />
                                ))}
                                <Circle cx={fl.x} cy={fl.y} r={2.6 * fl.s} fill="#FDE68A" opacity={opacity} />
                            </React.Fragment>
                        ))}
                    </>
                );
            }
            case 'stars': {
                const { dots, sparkles } = stars();
                return (
                    <>
                        <Defs>
                            <Mask id={`moon${uid}`}>
                                <Rect x="0" y="0" width={W} height={H} fill="#fff" />
                                <Circle cx="355" cy="38" r="20" fill="#000" />
                            </Mask>
                        </Defs>
                        <Path d={dots} fill={color} opacity={opacity * 0.8} />
                        <Path d={sparkles} fill={color} opacity={opacity} />
                        <Circle cx="345" cy="45" r="22" fill={color} opacity={opacity} mask={`url(#moon${uid})`} />
                    </>
                );
            }
            case 'seigaiha':
                return <Path d={seigaiha()} stroke={color} strokeWidth={1.6} fill="none" opacity={opacity} />;
            case 'synthwave': {
                const { d, horizon } = synthGrid();
                return (
                    <>
                        <Defs>
                            <SvgGradient id={`sun${uid}`} x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor="#FDE047" />
                                <Stop offset="1" stopColor="#F43F5E" />
                            </SvgGradient>
                            <Mask id={`sunCut${uid}`}>
                                <Rect x="0" y="0" width={W} height={H} fill="#fff" />
                                {[78, 88, 96, 103, 109].map((y, i) => (
                                    <Rect key={y} x="0" y={y} width={W} height={1.5 + i * 0.8} fill="#000" />
                                ))}
                                {/* The sun sets behind the horizon */}
                                <Rect x="0" y={horizon} width={W} height={H - horizon} fill="#000" />
                            </Mask>
                        </Defs>
                        <Circle cx={W / 2} cy={horizon} r="58" fill={`url(#sun${uid})`} mask={`url(#sunCut${uid})`} opacity={0.95} />
                        <Rect x="0" y={horizon} width={W} height={H - horizon} fill="#0F0326" opacity={0.55} />
                        <Path d={d} stroke={color} strokeWidth={1.2} fill="none" opacity={opacity} />
                    </>
                );
            }
            case 'shine': {
                const { bands, bokeh } = shine();
                return (
                    <>
                        <Path d={bands} fill={color} opacity={opacity * 0.6} />
                        <Path d={bokeh} fill={color} opacity={opacity * 0.5} />
                    </>
                );
            }
            default:
                return null;
        }
    }, [type, color, opacity, uid]);

    return (
        <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" pointerEvents="none">
            {art}
        </Svg>
    );
};

export const BannerPattern = memo(BannerPatternImpl);
