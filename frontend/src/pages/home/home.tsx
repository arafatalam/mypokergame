import slowRollArtwork from '../../assets/casino/home-slow-roll.webp';
import jackpotCatArtwork from '../../assets/casino/home-jackpot-cat.webp';
import CasinoTicket from '../../components/casino-ticket';
import HomeSummaryTickets from './home-summary-tickets';
import HomeLeaderboardTicket from './home-leaderboard-ticket';
import OutstandingBalancesTicket from './outstanding-balances-ticket';
import { useHomeSummary } from './use-home-summary';

type HomeProps = {
    canViewSummary: boolean;
    onOpenCreateGame?: () => void;
    onOpenBuyIn?: () => void;
    onOpenCashout?: () => void;
    onOpenPayment?: () => void;
    onOpenHouseIncome?: () => void;
    onOpenLeaderboard?: () => void;
    onOpenOutstandingBalances?: () => void;
};

export default function Home(props: HomeProps) {
    const { summary, hasFailed, handleRetry } = useHomeSummary(props.canViewSummary);

    return (
        <div className="home-preview relative flex flex-1 items-center">
            {/* Keep the artwork in the left margin of the centered ticket grid. */}
            <img
                src={slowRollArtwork}
                alt=""
                className="pointer-events-none absolute left-0 top-0 hidden h-full w-[max(0px,calc((100%_-_1216px)/2))] object-fill min-[1440px]:block"
            />
            {/* Leave the casino building visible above the cat. */}
            <img
                src={jackpotCatArtwork}
                alt=""
                className="pointer-events-none absolute bottom-0 right-0 hidden h-[90%] w-[max(0px,calc((100%_-_1216px)/2))] object-fill min-[1440px]:block"
            />
            <div className="mx-auto grid w-full max-w-[1216px] gap-x-4 gap-y-3 text-center md:grid-cols-3">
                {props.canViewSummary && (
                    <HomeSummaryTickets summary={summary} hasFailed={hasFailed} onRetry={handleRetry} onOpenHouseIncome={props.onOpenHouseIncome} />
                )}
                {/* Keep the shortcut column narrower than the two tables on desktop. */}
                <div className="home-detail-tickets grid gap-x-4 gap-y-3 md:col-span-3 md:grid-cols-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.65fr)_minmax(0,1.45fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)_minmax(0,1.45fr)]">
                    {(props.onOpenCreateGame || props.onOpenBuyIn || props.onOpenCashout || props.onOpenPayment) && (
                        <CasinoTicket compactEdges className="flex w-full min-w-0 max-w-[440px] flex-col px-8 py-[22px] text-left text-[#620b19]">
                            <div className="flex flex-1 flex-col justify-evenly gap-2 [&>button]:min-h-8 [&>button]:px-2">
                                {props.onOpenCreateGame && (
                                    <button type="button" className="casino-button" onClick={props.onOpenCreateGame}>Create Game</button>
                                )}
                                {props.onOpenBuyIn && (
                                    <button type="button" className="casino-button" onClick={props.onOpenBuyIn}>Record Buy-in</button>
                                )}
                                {props.onOpenCashout && (
                                    <button type="button" className="casino-button" onClick={props.onOpenCashout}>Record Cashout</button>
                                )}
                                {props.onOpenPayment && (
                                    <button type="button" className="casino-button" onClick={props.onOpenPayment}>Record Payment</button>
                                )}
                            </div>
                        </CasinoTicket>
                    )}
                    {props.canViewSummary && (
                        <OutstandingBalancesTicket summary={summary} hasFailed={hasFailed} onRetry={handleRetry} onOpenAll={props.onOpenOutstandingBalances} />
                    )}
                    {props.canViewSummary && (
                        <HomeLeaderboardTicket
                            summary={summary}
                            hasFailed={hasFailed}
                            onRetry={handleRetry}
                            onOpenLeaderboard={props.onOpenLeaderboard}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
