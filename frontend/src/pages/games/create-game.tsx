import { useEffect, useState } from "react";

function CreateGame() {
    const [music, setMusic] = useState("First Render");

    console.log("Rendering screen:", music);

    function handleJazzClick() {
        setMusic("Jazz");
    }

    function handleRockClick() {
        setMusic("Rock");
    }

    function handleStopClick() {
        setMusic("Stopped");
    }

    function stopMusic() {



        document.title = "Music stopped";
        console.log("Cleanup title:", document.title);
    }

    function playMusic() {

        // Nothing should start when Stop is selected.
        if (music === "Stopped") {
            return;
        }


        console.log("Effect starts:", music);

        document.title = "Music: " + music;

        // Give React the function to call during cleanup.
        return stopMusic;
    }

    useEffect(playMusic, [music]);

    return (
        <section className="rounded-lg bg-white p-6 text-black">
            {/* Playback is represented by Console messages. */}
            <h2>Music practice</h2>
            <p>Selected music: {music}</p>
            <p>This example logs messages instead of playing sound.</p>

            {/* Choose the music that the Effect will use. */}
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={handleJazzClick}
                    className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                >
                    Play Jazz
                </button>
                <button
                    type="button"
                    onClick={handleRockClick}
                    className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                >
                    Play Rock
                </button>
                <button
                    type="button"
                    onClick={handleStopClick}
                    className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                >
                    Stop
                </button>
            </div>
        </section>
    );
}

export default CreateGame;
