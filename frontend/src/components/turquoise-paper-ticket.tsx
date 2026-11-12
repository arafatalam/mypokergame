import type { ReactNode } from 'react';
import CasinoTicket from './casino-ticket';
import './turquoise-paper-ticket.css';

type TurquoisePaperTicketProps = {
    children: ReactNode;
    className?: string;
};

export default function TurquoisePaperTicket(props: TurquoisePaperTicketProps) {
    return (
        <CasinoTicket compactEdges className={'turquoise-paper-ticket ' + (props.className ?? '')}>
            {props.children}
        </CasinoTicket>
    );
}
