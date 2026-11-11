import cardFan from '../../assets/casino/create-game-card-fan.png';
import pokerFace from '../../assets/casino/create-game-poker-face.png';
import smugChip from '../../assets/casino/create-game-smug-chip.png';
import CasinoTicket from '../../components/casino-ticket';

function CreateGame() {
    return (
        <div className="relative mx-auto w-full max-w-[37.5rem]">
            <CasinoTicket compactEdges className="w-full min-w-0 p-6 text-[#620b19] sm:aspect-[1.18] sm:p-8">
                <div className="grid gap-5 sm:h-full sm:grid-rows-[auto_1fr_auto]">
                    <h2 className="casino-heading casino-title-band px-2 py-3 text-center text-3xl uppercase">
                        Create Game
                    </h2>

                    <div className="grid gap-4 sm:items-center sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        {/* Game identity and artwork occupy the left half on desktop. */}
                        <div className="grid min-w-0 content-start justify-items-center gap-3 text-center sm:justify-items-start sm:text-left">
                            <dl className="grid min-w-0 gap-1">
                                <dt className="font-semibold">Game name</dt>
                                <dd className="casino-heading break-words text-2xl font-bold sm:text-3xl">
                                    11_NOV_2026_2
                                </dd>
                                <dd className="text-sm">Wednesday, November 11 · Game 2</dd>
                            </dl>
                            <img src={cardFan} alt="" className="h-auto w-52 max-w-full" />
                        </div>

                        <section className="min-w-0 border-t border-[#620b19]/25 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                            <h3 className="mb-2 font-bold">Default buy-in limits</h3>
                            <dl className="grid gap-2 text-center">
                                <div className="rounded-lg border border-[#620b19]/35 bg-white/35 px-3 py-2">
                                    <dt className="text-sm font-semibold">Minimum</dt>
                                    <dd className="text-2xl font-bold tabular-nums">$100</dd>
                                </div>
                                <div className="rounded-lg border border-[#620b19]/35 bg-white/35 px-3 py-2">
                                    <dt className="text-sm font-semibold">Maximum</dt>
                                    <dd className="text-2xl font-bold tabular-nums">$500</dd>
                                </div>
                            </dl>
                            <label className="mt-3 flex items-center gap-2">
                                <input type="checkbox" disabled />
                                Use custom limits
                            </label>
                        </section>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <button type="button" disabled className="casino-button min-h-11 rounded-full px-4 py-2 text-xl uppercase">
                            Create Game
                        </button>
                        <button type="button" disabled className="min-h-11 rounded-full border border-current px-5 py-2 font-semibold">
                            Cancel
                        </button>
                    </div>
                </div>
            </CasinoTicket>

            {/* Keep the artwork in the space beside the ticket on wide screens. */}
            <img src={pokerFace} alt="" className="pointer-events-none absolute right-full top-0 mr-4 hidden w-[calc((100vw_-_37.5rem)*0.4344)] max-w-none xl:block" />
            <img src={smugChip} alt="" className="pointer-events-none absolute bottom-0 left-full ml-4 hidden w-[calc((100vw_-_37.5rem)*0.36)] max-w-none xl:block" />
        </div>
    );
}

export default CreateGame;
