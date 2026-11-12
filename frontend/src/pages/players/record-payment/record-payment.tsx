import { useState } from 'react';
import type { PaymentDirection } from './record-payment-api';
import PaymentTicket from './payment-ticket';

type RecordPaymentProps = {
    onCancel: () => void;
    initialPlayerId?: number;
    initialDirection?: PaymentDirection;
};

export default function RecordPayment(props: RecordPaymentProps) {
    const [direction, setDirection] = useState<PaymentDirection>(props.initialDirection ?? 'house_pays_player');
    const [refreshKey, setRefreshKey] = useState(0);
    const [resetKey, setResetKey] = useState(0);
    const [initialPlayerId, setInitialPlayerId] = useState(props.initialPlayerId);

    function handlePaymentSaved() {
        setRefreshKey(function nextKey(previous) { return previous + 1; });
    }

    function handleRecordAnotherPayment() {
        // Remount the form so its draft and receipt clear without leaving this screen.
        setInitialPlayerId(undefined);
        setResetKey(function nextKey(previous) { return previous + 1; });
    }

    return (
        <div className="mx-auto grid w-full min-w-0 max-w-[1500px] items-start gap-5 px-3">
            <PaymentTicket
                key={resetKey}
                direction={direction}
                onDirectionChange={setDirection}
                initialPlayerId={initialPlayerId}
                refreshKey={refreshKey}
                onPaymentSaved={handlePaymentSaved}
                onRecordAnotherPayment={handleRecordAnotherPayment}
                onCancel={props.onCancel}
            />
        </div>
    );
}
