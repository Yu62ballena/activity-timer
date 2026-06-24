const CIRCLE_CIRCUMFERENCE = 553; // 2 * PI * r(88)

// DOM Elements
const breathTimeSelect = document.getElementById('breath-time');
const totalTimeSelect = document.getElementById('total-time');
const settingsPanel = document.getElementById('settings-panel');
const startButton = document.getElementById('start-button');
const readingText = document.getElementById('reading-text');
const timerText = document.getElementById('timer-text');
const progressCircle = document.querySelector('.progress-ring__circle');

// App State
let breathTime = 4;
let totalTime = 60;
let voices = [];
let isPlaying = false;
let timeoutIds = [];

// Initialize Web Speech API
function initSpeech() {
    voices = speechSynthesis.getVoices();
}

speechSynthesis.onvoiceschanged = initSpeech;
// Fallback initialization
initSpeech();

function speak(text, rate = 1.0) {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = rate;

    // Find Japanese voice
    const jpVoice = voices.find(voice => voice.lang.includes('ja') || voice.lang.includes('JP'));
    if (jpVoice) {
        utterance.voice = jpVoice;
    }

    speechSynthesis.speak(utterance);
}

function speakCompletion() {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance('よくできました');
    utterance.lang = 'ja-JP';

    const jpVoice = voices.find(voice => voice.lang.includes('ja') || voice.lang.includes('JP'));
    if (jpVoice) {
        utterance.voice = jpVoice;
    }

    speechSynthesis.speak(utterance);
}


function setProgress(percent, timeStr) {
    // percent is 0.0 to 1.0
    // stroke-dashoffset goes from CIRCLE_CIRCUMFERENCE (empty) to 0 (full)
    const offset = CIRCLE_CIRCUMFERENCE - percent * CIRCLE_CIRCUMFERENCE;

    // Disable transition temporarily if we are resetting to 0
    if (percent === 0) {
        progressCircle.style.transition = 'none';
        progressCircle.style.strokeDashoffset = offset;
        // Force reflow
        progressCircle.getBoundingClientRect();
        progressCircle.style.transition = `stroke-dashoffset ${timeStr} linear`;
    } else {
        progressCircle.style.transition = `stroke-dashoffset ${timeStr} linear`;
        progressCircle.style.strokeDashoffset = offset;
    }
}

function setReadingText(text) {
    readingText.classList.add('fade-out');
    setTimeout(() => {
        readingText.textContent = text;
        readingText.classList.remove('fade-out');
    }, 150); // half of CSS transition time
}

function updateTimerText(text) {
    timerText.classList.remove('pop');
    // Force reflow to restart animation
    void timerText.offsetWidth;
    timerText.textContent = text;
    timerText.classList.add('pop');
}

function clearAllTimeouts() {
    timeoutIds.forEach(id => clearTimeout(id));
    timeoutIds = [];
}

function wait(ms) {
    return new Promise(resolve => {
        const id = setTimeout(() => {
            resolve();
        }, ms);
        timeoutIds.push(id);
    });
}

async function runCountdown() {
    for (let i = 3; i > 0; i--) {
        updateTimerText(i);
        speak(i.toString());
        await wait(1000);
    }
    updateTimerText('');
}

async function runBreathingCycle() {
    const startTime = Date.now();

    while (isPlaying) {
        const elapsedTime = (Date.now() - startTime) / 1000;
        if (elapsedTime >= totalTime) {
            break;
        }

        if (!isPlaying) return;

        // Inhale
        setReadingText(`すってー`);
        speak("すってー", 0.8);

        // Reset progress and animate to full
        setProgress(0, '0s');
        await wait(50); // slight delay to ensure CSS transition applies
        setProgress(1, `${breathTime}s`);

        for(let i = breathTime; i > 0; i--) {
            if (!isPlaying) return;
            updateTimerText(i);
            await wait(1000);
        }

        if (!isPlaying) return;

        // Exhale
        setReadingText(`はいてー`);
        speak("はいてー", 0.8);

        // Animate from full to empty
        setProgress(0, `${breathTime}s`);

        for(let i = breathTime; i > 0; i--) {
            if (!isPlaying) return;
            updateTimerText(i);
            await wait(1000);
        }
    }
}

function finishTraining() {
    isPlaying = false;
    clearAllTimeouts();

    updateTimerText('');
    setReadingText('おつかれさまでした！');
    setProgress(0, '0.5s'); // Smoothly reset ring

    speakCompletion();

    // Reset UI state
    setTimeout(() => {
        settingsPanel.classList.remove('hidden');
        startButton.disabled = false;
        startButton.textContent = 'もういちど！';
        setReadingText('じゅんびはいいかな？');
    }, 3000);
}


async function startTraining() {
    if (isPlaying) return;

    isPlaying = true;
    breathTime = parseInt(breathTimeSelect.value, 10);
    totalTime = parseInt(totalTimeSelect.value, 10);

    // Update UI
    settingsPanel.classList.add('hidden');
    startButton.disabled = true;

    // Wait for settings panel to fade out
    await wait(300);

    try {
        setReadingText('いくよ！');
        await runCountdown();

        if (isPlaying) {
            await runBreathingCycle();
        }

        if (isPlaying) {
            finishTraining();
        }
    } catch (e) {
        console.error("Training interrupted or error occurred:", e);
    }
}

startButton.addEventListener('click', startTraining);

// Add empty text to timer initially so it doesn't take up 0 space height
timerText.textContent = '';
