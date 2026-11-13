import CorrectionHistory from './records/correction-history/correction-history';
import RecordCorrection from './records/record-correction/record-correction';
import type { GameFilters, GameListItem } from './games/game-list/load-games';
import casinoLogo from '../assets/casino/skanders-game-logo.png';
import jackpotCatPodium from '../assets/casino/leaderboard-jackpot-cat-podium.webp';
import chipKingTrophy from '../assets/casino/leaderboard-chip-king-trophy.webp';
import houseIncomeAccountant from '../assets/casino/house-income-accountant.webp';
import houseIncomeCat from '../assets/casino/house-income-cat.webp';
import NavigationGroup from '../components/navigation-group';
import CasinoMarquee from '../components/casino-marquee';
import CloseGame from './games/close-game/close-game';
import CreateGame from './games/create-game/create-game';
import GameDetails from './games/game-details/game-details';
import HouseIncome from './games/house-income/house-income';
import Leaderboard from './games/leaderboard/leaderboard';
import GameList from './games/game-list/game-list';
import RecordBuyIn from './games/record-buy-in/record-buy-in';
import RecordCashout from './games/record-cashout/record-cashout';
import RecordGameTotals from './games/record-game-totals/record-game-totals';
import type { UserListItem } from './users/user-list/load-users';
import PaymentList from './players/payment-list/payment-list';
import OutstandingBalances from './players/outstanding-balances/outstanding-balances';
import RecordPayment from './players/record-payment/record-payment';
import type { PaymentDirection } from './players/record-payment/record-payment-api';
import './signed-in-layout.css';
import Home from './home/home';
import CreateUser from './users/create-user/create-user.tsx';
import { signOut } from './auth/sign-out';
import { useState } from 'react';
import UserList from "./users/user-list/user-list.tsx";
import ShowUser from './users/show-user/show-user';

const monthlyReportGrid = 'grid min-w-0 lg:grid-cols-7';

type SignedInLayoutProps = {
    signedInUserId: number;
    canManageGames: boolean;
    isStaff: boolean;
};

function SignedInLayout(props: SignedInLayoutProps) {

    const [selectedPage, setSelectedPage] = useState('home');
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [signOutMessage, setSignOutMessage] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<number>();
    const [selectedGame, setSelectedGame] = useState<GameListItem>();
    const [initialGameFilters, setInitialGameFilters] = useState<GameFilters>();
    const [totalsRevision, setTotalsRevision] = useState(0);
    const [historyPlayer, setHistoryPlayer] = useState<UserListItem>();
    const [paymentPlayerId, setPaymentPlayerId] = useState<number>();
    const [balancePayment, setBalancePayment] = useState<{ playerId: number; direction: PaymentDirection }>();
    const [buyInGameId, setBuyInGameId] = useState<number>();


    function handleOpenCreateUser() {
        setSelectedPage('create');
    }

    function handleOpenUserList() {
        setSelectedPage('list');
    }

    function handleOpenPlayerPayment(playerId: number) {
        setPaymentPlayerId(playerId);
        setSelectedPage('payment-from-list');
    }

    function handleOpenPlayerPaymentHistory(player: UserListItem) {
        setHistoryPlayer(player);
        setSelectedPage('payment-list');
    }

    function handleOpenPaymentFromPaymentList() {
        setSelectedPage('payment-from-payment-list');
    }

    function handleReturnToPaymentList() {
        setSelectedPage('payment-list');
    }

    function handleOpenUserProfile(userId: number) {
        setSelectedUserId(userId);
        setSelectedPage('user-profile');
    }

    function handleOpenHouseIncome() {
        setSelectedPage('house-income');
    }

    function handleOpenOutstandingBalances() {
        setSelectedPage('outstanding-balances');
    }

    function handleOpenBalancePayment(playerId: number, direction: PaymentDirection) {
        setBalancePayment({ playerId, direction });
        setSelectedPage('payment-from-balances');
    }

    function handleOpenIncomeMonth(month: string) {
        const fromDate = month + '-01';
        const lastDay = new Date(fromDate + 'T00:00:00Z');
        // Day zero of the next month is the last day of the selected month.
        lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
        setInitialGameFilters({ fromDate, toDate: lastDay.toISOString().slice(0, 10), status: 'all' });
        setSelectedPage('game-list');
    }

    function handleOpenLeaderboard() {
        setSelectedPage('leaderboard');
    }

    function handleOpenRankedPlayer(userId: number) {
        setSelectedUserId(userId);
        setSelectedPage('leaderboard-user');
    }

    function handleOpenHome() {
        setSelectedPage('home');
    }

    function handleOpenGame(_gameName: string, game: GameListItem) {
        setSelectedGame(game);
        setSelectedPage('game-details');
    }

    function handleOpenCreateGame() {
        setSelectedPage('create-game');
    }

    function handleOpenBuyIn() {
        // A standalone buy-in starts without a preselected game.
        setBuyInGameId(undefined);
        setSelectedPage('buy-in');
    }

    function handleOpenCashout() {
        setSelectedPage('cashout');
    }

    function handleOpenPayment() {
        handlePlayerSelection('payment');
    }

    function handleGameTotalsSaved() {
        // Reload the same list request so its filters and page survive the edit.
        setTotalsRevision(function nextRevision(previous) {
            return previous + 1;
        });
    }

    function handleGameCreated(gameId: number) {
        setBuyInGameId(gameId);
        setSelectedPage('buy-in');
    }

    // Choose which screen appears below the shared navigation.
    let content = (
        <Home
            canViewSummary={props.canManageGames}
            onOpenCreateGame={props.canManageGames ? handleOpenCreateGame : undefined}
            onOpenBuyIn={props.canManageGames ? handleOpenBuyIn : undefined}
            onOpenCashout={props.canManageGames ? handleOpenCashout : undefined}
            onOpenPayment={props.canManageGames ? handleOpenPayment : undefined}
            onOpenHouseIncome={props.canManageGames ? handleOpenHouseIncome : undefined}
            onOpenLeaderboard={props.canManageGames ? handleOpenLeaderboard : undefined}
            onOpenOutstandingBalances={props.canManageGames ? handleOpenOutstandingBalances : undefined}
        />
    );
    let marqueeText = 'home';

    if (selectedPage === 'create' && props.isStaff) {
        content = <CreateUser onOpenUserList={handleOpenUserList} />;
        marqueeText = 'create user';
    } else if (props.isStaff && (selectedPage === 'list' || (selectedPage === 'payment-from-list' && props.canManageGames))) {
        const showingPayment = selectedPage === 'payment-from-list';
        // Keep the list mounted so Cancel restores its filters, page and selected Player.
        content = (
            <div className="w-full min-w-0">
                <div hidden={showingPayment}>
                    <UserList onOpenUserProfile={handleOpenUserProfile}
                        onCreateUser={handleOpenCreateUser}
                        onRecordPayment={props.canManageGames ? handleOpenPlayerPayment : undefined}
                        onViewHistory={props.canManageGames ? handleOpenPlayerPaymentHistory : undefined}
                        suspendPlayerTab={showingPayment} />
                </div>
                {showingPayment && <RecordPayment initialPlayerId={paymentPlayerId} onCancel={handleOpenUserList} />}
            </div>
        );
        marqueeText = 'user list';
        if (showingPayment) {
            marqueeText = 'record payment';
        }
    } else if (props.isStaff && selectedPage === 'user-profile') {
        content = <ShowUser userId={selectedUserId} />;
        marqueeText = 'user profile';
    } else if (props.canManageGames && (selectedPage === 'outstanding-balances' || selectedPage === 'payment-from-balances')) {
        const showingPayment = selectedPage === 'payment-from-balances';
        content = (
            <div className={showingPayment ? 'w-full min-w-0' : 'outstanding-balances-content w-full min-w-0'}>
                <div hidden={showingPayment}>
                    <OutstandingBalances onMakePayment={handleOpenBalancePayment} showingPayment={showingPayment} />
                </div>
                {showingPayment && balancePayment && (
                    <RecordPayment
                        initialPlayerId={balancePayment.playerId}
                        initialDirection={balancePayment.direction}
                        onCancel={handleOpenOutstandingBalances}
                    />
                )}
            </div>
        );
        marqueeText = showingPayment ? 'record payment' : 'outstanding balances';
    } else if (props.canManageGames && selectedPage === 'house-income') {
        content = (
            <div className={monthlyReportGrid + ' w-full'}>
                {/* The ticket sets the row height, so the illustrations follow its bottom edge. */}
                <div className="relative hidden lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:block">
                    <img src={houseIncomeAccountant} alt="" className="absolute inset-0 h-full w-full object-contain object-right-bottom" />
                </div>
                <HouseIncome onOpenMonth={handleOpenIncomeMonth} />
                <div className="relative hidden lg:col-span-2 lg:col-start-6 lg:row-start-1 lg:block">
                    <img src={houseIncomeCat} alt="" className="absolute inset-0 h-full w-full object-contain object-left-bottom" />
                </div>
            </div>
        );
        marqueeText = 'house income';
    } else if (props.canManageGames && (selectedPage === 'leaderboard' || selectedPage === 'leaderboard-user')) {
        const showingPlayer = selectedPage === 'leaderboard-user';
        // Keep the applied month range, page and draft filters when opening a profile.
        content = (
            <div className="w-full min-w-0">
                <div hidden={showingPlayer}>
                    {/* Let the ticket set the row height so taller artwork stays bottom-aligned. */}
                    <div className={monthlyReportGrid}>
                        <div className="relative hidden lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:block">
                            <img src={jackpotCatPodium} alt="" className="absolute right-0 bottom-0 h-[min(100%,33vw,480px)] w-full max-w-[440px] object-fill" />
                        </div>
                        <Leaderboard onOpenPlayer={handleOpenRankedPlayer} />
                        <div className="relative hidden lg:col-span-2 lg:col-start-6 lg:row-start-1 lg:block">
                            <img src={chipKingTrophy} alt="" className="absolute bottom-0 left-0 h-[min(100%,33vw,480px)] w-full max-w-[440px] object-fill" />
                        </div>
                    </div>
                </div>
                {showingPlayer && (
                    <>
                        <div className="mx-auto mb-3 w-full max-w-[800px] px-4">
                            <button className="casino-button" type="button" onClick={handleOpenLeaderboard}>Back to Leaderboard</button>
                        </div>
                        <ShowUser key={selectedUserId} userId={selectedUserId} />
                    </>
                )}
            </div>
        );
        marqueeText = showingPlayer ? 'user profile' : 'leaderboard';
    } else if (selectedPage === 'my-account') {
        content = <ShowUser key="my-account" userId={props.signedInUserId} showSideArtwork />;
        marqueeText = 'my account';
    } else if (props.canManageGames && (selectedPage === 'game-list' || selectedPage === 'game-details')) {
        const showingDetails = selectedPage === 'game-details';
        // Keep the list mounted so returning restores its filters and page.
        content = (
            <div className="w-full min-w-0">
                <div hidden={showingDetails}>
                    <GameList key={initialGameFilters?.fromDate} initialFilters={initialGameFilters} onOpenGame={handleOpenGame} onCreateGame={handleOpenCreateGame} totalsRevision={totalsRevision} />
                </div>
                {showingDetails && selectedGame && (
                    <GameDetails key={selectedGame.id} game={selectedGame} onTotalsSaved={handleGameTotalsSaved} />
                )}
            </div>
        );
        marqueeText = 'games';
        if (showingDetails) {
            marqueeText = 'game details';
        }
    } else if (props.canManageGames && selectedPage === 'create-game') {
        content = <CreateGame onCancel={handleOpenHome} onGameCreated={handleGameCreated} />;
        marqueeText = 'create game';
    } else if (props.canManageGames && selectedPage === 'buy-in') {
        content = <RecordBuyIn key={buyInGameId} initialGameId={buyInGameId} onCancel={handleOpenHome} />;
        marqueeText = 'buy in';
    } else if (props.canManageGames && selectedPage === 'cashout') {
        content = <RecordCashout onCancel={handleOpenHome} />;
        marqueeText = 'cashout';
    } else if (props.canManageGames && selectedPage === 'game-totals') {
        content = <RecordGameTotals />;
        marqueeText = 'game totals';
    } else if (props.canManageGames && selectedPage === 'close-game') {
        content = <CloseGame />;
        marqueeText = 'close game';
    } else if (props.canManageGames && (selectedPage === 'payment-list' || selectedPage === 'payment-from-payment-list')) {
        const showingPayment = selectedPage === 'payment-from-payment-list';
        // Keep the list mounted so Cancel restores its current filters and page.
        content = (
            <div className="w-full min-w-0">
                <div hidden={showingPayment}>
                    <PaymentList key={historyPlayer?.id} initialPlayer={historyPlayer} onRecordPayment={handleOpenPaymentFromPaymentList} />
                </div>
                {showingPayment && <RecordPayment onCancel={handleReturnToPaymentList} />}
            </div>
        );
        marqueeText = showingPayment ? 'record payment' : 'payments';
    } else if (selectedPage === 'correction-history' && props.canManageGames) {
        content = <CorrectionHistory />;
        marqueeText = 'correction history';
    } else if (selectedPage === 'correction' && props.canManageGames) {
        content = <RecordCorrection />;
        marqueeText = 'record correction';
    } else if (selectedPage === 'payment' && props.canManageGames) {
        content = <RecordPayment onCancel={handleOpenHome} />;
        marqueeText = 'record payment';
    }

    function handleUserSelection(task: string) {
        if (props.isStaff && (task === 'create' || task === 'list')) {
            setSelectedPage(task);
        }
    }

    function handleGameSelection(task: string) {
        if (!props.canManageGames) {
            return;
        }

        if (task === 'create') {
            handleOpenCreateGame();
        } else if (task === 'list') {
            setInitialGameFilters(undefined);
            setSelectedPage('game-list');
        } else if (task === 'buy-in') {
            handleOpenBuyIn();
        } else if (task === 'cashout') {
            handleOpenCashout();
        } else if (task === 'game-totals') {
            setSelectedPage('game-totals');
        } else if (task === 'close-game') {
            setSelectedPage('close-game');
        }
    }

    function handlePlayerSelection(task: string) {
        if (props.canManageGames && (task === 'payment' || task === 'payment-list')) {
            setHistoryPlayer(undefined);
            setSelectedPage(task);
        }
    }

    function handleRecordSelection(task: string) {
        if ((task === 'correction' || task === 'correction-history') && props.canManageGames) {
            setSelectedPage(task);
        }
    }

    async function handleAccountSelection(task: string) {
        if (task === 'profile') {
            setSelectedPage('my-account');
            return;
        }

        if (task !== 'sign-out' || isSigningOut) {
            return;
        }

        setIsSigningOut(true);
        setSignOutMessage('Signing out…');

        try {
            await signOut();
        } catch {
            setSignOutMessage('Could not sign out. Please try again.');
            setIsSigningOut(false);
        }
    }

    const gameTasks = [
        { task: 'create', label: 'Create Game' },
        { task: 'list', label: 'Game List' },
        { task: 'buy-in', label: 'Record Buy-in' },
        { task: 'cashout', label: 'Record Cashout' },
        { task: 'game-totals', label: 'Record Game Totals' },
        { task: 'close-game', label: 'Close Game' },
    ];
    const playerTasks = [
        { task: 'payment', label: 'Record Payment' },
        { task: 'payment-list', label: 'Payment List' },
    ];

    const recordTasks = [
        { task: 'correction', label: 'Record Correction' },
        { task: 'correction-history', label: 'Correction History' },
    ];

    return (
        <div className="home-viewport overflow-x-clip">
            <div className="home-screen relative min-h-screen w-full">
                <a className="home-skip-link" href="#task-content">Skip to content</a>
                {/* Keep banner sizing separate from the full-width task area. */}
                <div className="home-banner mx-auto w-full max-w-[1536px] shrink-0">
                {/* Group buttons expand choices without replacing the current page. */}
                <header className="home-header relative flex items-start">
                    <h1 className="home-brand shrink-0">
                        <img src={casinoLogo} alt="Skander’s Game" className="block h-auto w-full" />
                    </h1>
                    <nav className="home-navigation flex min-w-0 flex-1 items-center" aria-label="Main tasks">
                        <button type="button" className="home-link" onClick={handleOpenHome}><span>Home</span></button>
                        {props.isStaff && (
                            <NavigationGroup
                                label="Users"
                                view="users"
                                onSelect={handleUserSelection}
                                items={[
                                    { task: 'create', label: 'Create User' },
                                    { task: 'list', label: 'User List' },
                                ]}
                            />
                        )}
                        {props.canManageGames && (
                            <>
                                <NavigationGroup label="Games" view="games" onSelect={handleGameSelection} items={gameTasks} />
                                <NavigationGroup label="Payments" view="players" onSelect={handlePlayerSelection} items={playerTasks} />
                                <NavigationGroup label="Records" view="records" onSelect={handleRecordSelection} items={recordTasks} />
                            </>
                        )}
                        <NavigationGroup label="Accounts" view="my-account" onSelect={handleAccountSelection} items={[
                            { task: 'profile', label: 'My Account' },
                            { task: 'sign-out', label: 'Sign Out' },
                        ]} />
                    </nav>
                </header>
                </div>

                <p className="home-status text-center text-sm">{signOutMessage}</p>

                {/* Keep one shared sign above whichever screen is selected. */}
                <div id="task-content" className="home-content" tabIndex={-1}>
                    <CasinoMarquee text={marqueeText} id="user-list-title" />
                    {content}
                </div>
            </div>

        </div>
    );
}

export default SignedInLayout;
