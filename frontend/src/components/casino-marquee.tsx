import './casino-marquee.css'

type CasinoMarqueeProps = {
    text: string;
    id?: string;
}

function CasinoMarquee(props: CasinoMarqueeProps) {
    return (
        <div className="casino-marquee mx-auto mb-6">
            {/* The artwork and suits decorate the real, readable page heading. */}
            <span className="casino-marquee-spade" aria-hidden="true">♠</span>
            <h2 id={props.id} className="casino-heading uppercase">{props.text}</h2>
            <span className="casino-marquee-heart" aria-hidden="true">♥</span>
        </div>
    )
}

export default CasinoMarquee
