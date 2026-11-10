import { useLayoutEffect, useRef } from 'react';
import './casino-marquee.css';

type CasinoMarqueeProps = {
    text: string;
    id?: string;
};

function CasinoMarquee(props: CasinoMarqueeProps) {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);

    useLayoutEffect(function fitMarqueeText() {
        const heading = headingRef.current;
        const text = textRef.current;

        if (!heading || !text) {
            return;
        }

        function fitText(heading: HTMLHeadingElement, text: HTMLSpanElement) {
            // Measure the unscaled text and leave room for the cream outline.
            const scale = Math.min(1, heading.clientWidth * 0.96 / text.offsetWidth, heading.clientHeight / text.offsetHeight);
            text.style.setProperty('--marquee-text-scale', String(scale));
        }

        fitText(heading, text);

        // Refit when the available space or the lettering's natural size changes.
        const observer = new ResizeObserver(function refitText() {
            fitText(heading, text);
        });
        observer.observe(heading);
        observer.observe(text);

        return function stopWatchingMarquee() {
            observer.disconnect();
        };
    }, [props.text]);

    return (
        <div className="casino-marquee mx-auto mb-6">
            {/* The artwork and suits decorate the real, readable page heading. */}
            <span className="casino-marquee-spade" aria-hidden="true">♠</span>
            <h2 ref={headingRef} id={props.id} className="casino-heading uppercase">
                <span ref={textRef}>{props.text}</span>
            </h2>
            <span className="casino-marquee-heart" aria-hidden="true">♥</span>
        </div>
    );
}

export default CasinoMarquee;
