import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import edgePaper from '../assets/casino/home-turquoise-paper.png';

type CasinoTicketProps = {
    children: ReactNode;
    className?: string;
    compactEdges?: boolean;
    borderInset?: number;
};

/** Adapted from the demo geometry, with concentric inset centre cut-outs. */
function ticketPath(w: number, h: number, inset = 0, waves = true, compactEdges = false): string {
    const x = inset;
    const y = inset;
    const right = w - inset;
    const bottom = h - inset;
    let cornerLimit = 34;
    let notchLimit = 24;
    if (compactEdges) {
        cornerLimit = 18;
        notchLimit = 7;
    }
    const corner = Math.min(w * 0.04, h * 0.14, cornerLimit);
    const notch = Math.min(w * 0.026, h * 0.07, notchLimit);
    const notchRadius = notch + inset;
    const notchHalfHeight = Math.sqrt(notchRadius ** 2 - inset ** 2);
    const mid = h * 0.5;
    let path = `M${x + corner},${y}H${right - corner}A${corner},${corner} 0 0 0 ${right},${y + corner}`;

    function side(start: number, end: number, edge: number, direction: number): string {
        if (!waves) {
            return `V${end}`;
        }

        let segment = '';
        for (let cy = start + 9; cy < end - 8; cy += 19) {
            segment += `V${cy - 2.7}Q${edge + direction * 5.5},${cy} ${edge},${cy + 2.7}`;
        }
        return segment + `V${end}`;
    }

    function up(start: number, end: number): string {
        let segment = '';
        if (waves) {
            for (let cy = start - 9; cy > end + 8; cy -= 19) {
                segment += `V${cy + 2.7}Q${x + 5.5},${cy} ${x},${cy - 2.7}`;
            }
        }
        return segment + `V${end}`;
    }

    path += side(y + corner, mid - notchHalfHeight, right, -1);
    path += `A${notchRadius},${notchRadius} 0 0 0 ${right},${mid + notchHalfHeight}`;
    path += side(mid + notchHalfHeight, bottom - corner, right, -1);
    path += `A${corner},${corner} 0 0 0 ${right - corner},${bottom}H${x + corner}A${corner},${corner} 0 0 0 ${x},${bottom - corner}`;
    path += up(bottom - corner, mid + notchHalfHeight);
    path += `A${notchRadius},${notchRadius} 0 0 0 ${x},${mid - notchHalfHeight}`;
    path += up(mid - notchHalfHeight, y + corner);
    return path + `A${corner},${corner} 0 0 0 ${x + corner},${y}Z`;
}

function CasinoTicket(props: CasinoTicketProps) {
    const element = useRef<HTMLDivElement>(null);
    const clipId = useId();
    const edgeTextureId = useId();
    const [size, setSize] = useState({ width: 0, height: 0 });

    // Fit the decorative SVG to the content when the ticket or viewport changes size.
    useLayoutEffect(function () {
        const section = element.current;
        if (!section) {
            return;
        }

        function redraw() {
            if (!section) {
                return;
            }
            const width = section.clientWidth;
            const height = section.clientHeight;
            setSize(function (previous) {
                if (previous.width === width && previous.height === height) {
                    return previous;
                }
                return { width, height };
            });
        }

        const observer = new ResizeObserver(redraw);
        observer.observe(section);
        redraw();

        // Release the observer when React removes this component.
        return function () {
            observer.disconnect();
        };
    }, []);

    const outer = ticketPath(size.width, size.height, 0, true, props.compactEdges);
    const borderInset = props.borderInset ?? 12;
    const inner = ticketPath(size.width, size.height, borderInset, false, props.compactEdges);

    return (
        <div ref={element} className={'casino-panel ' + (props.className ?? '')}>
            {/* Decoration stays hidden from screen readers; content remains normal HTML. */}
            {size.width > 0 && size.height > 0 && (
                <svg
                    className="casino-ticket-skin"
                    aria-hidden="true"
                    focusable="false"
                    viewBox={`0 0 ${size.width} ${size.height}`}
                >
                    <defs>
                        <clipPath id={clipId}>
                            <path d={outer} />
                        </clipPath>
                        {/* Tint stays separate from paper brightness so the edge keeps its chosen colour. */}
                        <pattern id={edgeTextureId} width={size.width} height={size.height} patternUnits="userSpaceOnUse">
                            <rect width={size.width} height={size.height} fill="var(--casino-ticket-edge-fill, none)" />
                            <image
                                href={edgePaper}
                                width={size.width}
                                height={size.height}
                                preserveAspectRatio="xMidYMid slice"
                                style={{ mixBlendMode: 'luminosity', opacity: 'var(--casino-ticket-edge-texture-opacity, 0)' }}
                            />
                        </pattern>
                    </defs>
                    <g clipPath={`url(#${clipId})`}>
                        <foreignObject width={size.width} height={size.height}>
                            <div className="casino-ticket-surface" />
                        </foreignObject>
                        {/* Fill only the strip outside the inset border when a ticket supplies an edge colour. */}
                        <path d={outer + ' ' + inner} fill={'url(#' + edgeTextureId + ')'} fillRule="evenodd" />
                        <path className="casino-ticket-border" d={inner} />
                    </g>
                </svg>
            )}
            {props.children}
        </div>
    );
}

export default CasinoTicket;
