import { useEffect, useState } from 'react';
import { loadPlayerTab } from '../pages/users/user-list/load-users';
import type { PlayerTabDetails, UserListItem } from '../pages/users/user-list/load-users';
import PlayerTabCard, { PlayerTabBalance } from './player-tab-card';

type PlayerTabProps = {
    player: UserListItem;
    onViewHistory?: (player: UserListItem) => void;
    onRecordPayment?: (playerId: number) => void;
};

const monthFormat = new Intl.DateTimeFormat('en-CA', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const dateFormat = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeZone: 'UTC' });
const moneyFormat = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 });

function formatMoney(amount: number) {
    return '$' + moneyFormat.format(amount);
}

function PlayerTab(props: PlayerTabProps) {
    const playerId = props.player.id;
    const [details, setDetails] = useState<PlayerTabDetails | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(function fetchPlayerDetails() {
        const request = new AbortController();

        async function fetchDetails() {
            try {
                const result = await loadPlayerTab(playerId, request.signal);
                if (!request.signal.aborted) {
                    setDetails(result);
                }
            } catch {
                if (!request.signal.aborted) {
                    setFailed(true);
                }
            }
        }

        void fetchDetails();
        // A selection change or dismissal makes this request obsolete.
        return function cancelRequest() {
            request.abort();
        };
    }, [playerId]);

    const canRecordPayment = details !== null && details.can_record_payment;

    function handleRecordPayment() {
        if (canRecordPayment) {
            props.onRecordPayment?.(playerId);
        }
    }

    function handleViewHistory() {
        props.onViewHistory?.(props.player);
    }

    let subtitle = '';
    if (details) {
        subtitle = 'Player since ' + monthFormat.format(new Date(details.player_since));
    }

    return (
        <PlayerTabCard title="Player’s Tab" name={props.player.first_name + ' ' + props.player.last_name}
            photoUrl={props.player.photo_url} subtitle={subtitle}>
            {!details && <p>{failed ? 'Could not load player details. Select another row and reopen this card to retry.' : 'Loading player details…'}</p>}
            {details && (
                /* Keep the balance and recent activity together. */
                <div className="flex flex-col gap-4">
                    <div>
                        <PlayerTabBalance balance={details.balance} />
                        <dl>
                            <div>
                                <dt>Last payment</dt>
                                <dd>{details.last_payment ? formatMoney(details.last_payment.amount) + ' · ' + dateFormat.format(new Date(details.last_payment.paid_at)) : 'No payments yet'}</dd>
                            </div>
                            <div>
                                <dt>Last played</dt>
                                <dd>{details.last_game?.game_name ?? 'No games played yet'}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button type="button" className="casino-button player-tab-payment w-full rounded-lg px-3 py-2"
                            onClick={handleRecordPayment} disabled={!canRecordPayment || !props.onRecordPayment}>
                            Record Payment
                        </button>
                        <button type="button" className="player-tab-history w-full" onClick={handleViewHistory} disabled={!props.onViewHistory}>View History</button>
                    </div>
                </div>
            )}
        </PlayerTabCard>
    );
}

export default PlayerTab;
