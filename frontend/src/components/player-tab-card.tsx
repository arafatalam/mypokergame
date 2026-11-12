import { useId } from 'react';
import type { ReactNode } from 'react';
import TurquoisePaperTicket from './turquoise-paper-ticket';
import './player-tab.css';

type PlayerTabCardProps = {
    title: string;
    name: string;
    photoUrl: string;
    subtitle?: string;
    className?: string;
    children: ReactNode;
};

type PlayerTabBalanceProps = {
    balance: number;
};

const moneyFormat = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 });

export function PlayerTabBalance(props: PlayerTabBalanceProps) {
    let label = 'Settled';
    if (props.balance < 0) {
        label = 'Owes the house';
    }
    if (props.balance > 0) {
        label = 'House owes';
    }

    return (
        <div className="player-tab-balance flex flex-col gap-1.5">
            <p>{label}</p>
            <strong>{'$' + moneyFormat.format(Math.abs(props.balance))}</strong>
        </div>
    );
}

export default function PlayerTabCard(props: PlayerTabCardProps) {
    const headingId = useId();

    return (
        <TurquoisePaperTicket className={'player-tab relative ' + (props.className ?? '')}>
            <section aria-labelledby={headingId} className="flex flex-col gap-4">
                <h3 id={headingId}>{props.title}</h3>
                <div className="flex flex-col gap-3">
                    <img src={props.photoUrl} alt="" className="size-16 self-center rounded-full object-cover" />
                    <div className="flex flex-col gap-1.5">
                        <h4 className="player-tab-name wrap-anywhere">{props.name}</h4>
                        {props.subtitle && <p className="player-tab-since">{props.subtitle}</p>}
                    </div>
                </div>
                {props.children}
            </section>
        </TurquoisePaperTicket>
    );
}
