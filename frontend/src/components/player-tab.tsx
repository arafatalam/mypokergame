import { useId } from 'react';
import CasinoTicket from './casino-ticket';
import './player-tab.css';

function PlayerTab() {
    // Each copy gets its own heading ID, even when two tabs share a screen.
    const headingId = useId();

    return (
        <CasinoTicket compactEdges borderInset={12} className="player-tab relative">
            {/* Keep this preview static until player selection is connected. */}
            <section aria-labelledby={headingId} className="flex flex-col gap-5">
                <h3 id={headingId}>Player’s Tab</h3>

                {/* Each parent controls the spacing between its related details. */}
                <div className="flex flex-col gap-3">
                    <span className="player-tab-portrait self-center" aria-hidden="true" />
                    <div className="flex flex-col gap-1.5">
                        <h4 className="player-tab-name">Alex Morgan</h4>
                        <p className="player-tab-since">Player since Nov 2026</p>
                    </div>
                </div>

                {/* A single direction makes the outstanding balance easy to read. */}
                <div className="flex flex-col gap-4">
                    <div>
                        <div className="player-tab-balance flex flex-col gap-1.5">
                            <p>Owes the house</p>
                            <strong>$120</strong>
                        </div>
                        <dl>
                            <div><dt>Last payment</dt><dd>$50</dd></div>
                            <div><dt>Last played</dt><dd>Friday Night</dd></div>
                        </dl>
                    </div>

                    {/* Payments and history remain disabled in this sample. */}
                    <div className="flex flex-col gap-3">
                        <button type="button" className="casino-button player-tab-payment w-full rounded-lg px-3 py-2" disabled>
                            Record Payment
                        </button>
                        <button type="button" className="player-tab-history w-full" disabled>View History</button>
                    </div>
                </div>
            </section>
        </CasinoTicket>
    );
}

export default PlayerTab;
