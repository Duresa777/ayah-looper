const video = document.getElementById('quranVideo');
const videoUpload = document.getElementById('videoUpload');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const statusText = document.getElementById('statusText');
const markCutBtn = document.getElementById('markCutBtn');
const toggleLoopBtn = document.getElementById('toggleLoopBtn');
const sliceList = document.getElementById('sliceList');
const loopDelayInput = document.getElementById('loopDelay');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importInput = document.getElementById('importInput');

let slices = [];
let currentSliceIndex = 0;
let lastCutTime = 0.0;
let isLooping = false; 
let loopTimeout = null; 

function saveCutsToPhone() {
    localStorage.setItem('savedQuranCuts', JSON.stringify(slices));
}

function loadCutsFromPhone() {
    const savedData = localStorage.getItem('savedQuranCuts');
    if (savedData) {
        slices = JSON.parse(savedData);
        renderSlices();
        if (slices.length > 0) {
            lastCutTime = slices[slices.length - 1].end;
        }
        statusText.innerHTML = `Loaded ${slices.length} saved cuts! Press play.`;
    } else {
        statusText.innerHTML = "Upload a file! Press play, then click 'Cut' or press 'C'.";
    }
}

exportBtn.addEventListener('click', () => {
    if (slices.length === 0) {
        alert("You don't have any cuts to export yet!");
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(slices, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "ayah_cuts.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

importBtn.addEventListener('click', () => {
    importInput.click(); 
});

importInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedSlices = JSON.parse(e.target.result);
            if (Array.isArray(importedSlices)) {
                slices = importedSlices;
                lastCutTime = slices.length > 0 ? slices[slices.length - 1].end : 0.0;
                saveCutsToPhone();
                renderSlices();
                statusText.innerHTML = `Successfully imported ${slices.length} cuts!`;
            } else {
                alert("This file doesn't look like Ayah Looper cuts.");
            }
        } catch (error) {
            alert("Error reading the file. Make sure it's a valid .json file.");
        }
        importInput.value = ""; 
    };
    reader.readAsText(file);
});

function renderSlices() {
    sliceList.innerHTML = ""; 
    slices.forEach((slice, index) => {
        slice.id = index + 1; 
        const listItem = document.createElement('li');
        const textSpan = document.createElement('span');
        textSpan.textContent = `Ayah ${slice.id}: ${slice.start.toFixed(1)}s to ${slice.end.toFixed(1)}s`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="ph ph-trash"></i> Delete';
        
        deleteBtn.addEventListener('click', () => {
            slices.splice(index, 1);
            lastCutTime = slices.length > 0 ? slices[slices.length - 1].end : 0.0;
            saveCutsToPhone();
            
            if (isLooping) {
                isLooping = false;
                clearTimeout(loopTimeout);
                loopTimeout = null;
                video.pause();
                toggleLoopBtn.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Start Looping';
                toggleLoopBtn.style.background = "var(--warning)";
                prevBtn.disabled = true;
                nextBtn.disabled = true;
                statusText.textContent = "Looping stopped because a cut was deleted.";
            }
            renderSlices();
        });
        
        listItem.appendChild(textSpan);
        listItem.appendChild(deleteBtn);
        sliceList.appendChild(listItem);
    });
}

videoUpload.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        video.src = URL.createObjectURL(file);
        isLooping = false;
        clearTimeout(loopTimeout);
        loopTimeout = null;
        toggleLoopBtn.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Start Looping';
        toggleLoopBtn.style.background = "var(--warning)";
        loadCutsFromPhone();
    }
});

markCutBtn.addEventListener('click', () => {
    const cutTime = video.currentTime;
    if (cutTime <= lastCutTime) return;

    const newSlice = { id: slices.length + 1, start: lastCutTime, end: cutTime };
    slices.push(newSlice); 
    lastCutTime = cutTime; 
    
    saveCutsToPhone(); 
    renderSlices(); 

    const originalHTML = markCutBtn.innerHTML;
    markCutBtn.innerHTML = '<i class="ph ph-check-circle"></i> Saved!';
    if (navigator.vibrate) navigator.vibrate(50);

    setTimeout(() => { markCutBtn.innerHTML = originalHTML; }, 800); 
});

function getTotalSlicesCount() {
    if (video.duration && lastCutTime < video.duration - 0.5) {
        return slices.length + 1;
    }
    return slices.length;
}

function getActiveSlice() {
    if (slices.length === 0 && currentSliceIndex === 0) {
        if (video.duration) return { id: "Remaining", start: 0, end: video.duration };
        return null;
    }
    
    if (currentSliceIndex < slices.length) {
        return slices[currentSliceIndex];
    } else {
        return {
            id: "Remaining",
            start: lastCutTime,
            end: video.duration || video.currentTime + 1 
        };
    }
}

toggleLoopBtn.addEventListener('click', () => {
    if (!video.src) {
        alert("Please upload a file first!");
        return;
    }
    
    isLooping = !isLooping; 
    
    if (isLooping) {
        toggleLoopBtn.innerHTML = '<i class="ph ph-stop-circle"></i> Stop Looping';
        toggleLoopBtn.style.background = "var(--danger)";
        currentSliceIndex = 0; 
        
        const active = getActiveSlice();
        if (active) video.currentTime = active.start;
        video.play();
        updateUI();
    } else {
        toggleLoopBtn.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Start Looping';
        toggleLoopBtn.style.background = "var(--warning)";
        statusText.textContent = "Looping stopped. You can make more cuts.";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        
        clearTimeout(loopTimeout);
        loopTimeout = null;
    }
});

video.addEventListener('timeupdate', () => {
    if (!video.src || !isLooping) return; 

    const currentSlice = getActiveSlice();
    if (!currentSlice) return;

    if (video.currentTime >= currentSlice.end) {
        if (loopTimeout) return; 
        
        video.pause();
        
        const delayMs = (parseFloat(loopDelayInput.value) || 0) * 1000;
        
        if (delayMs > 0) {
            statusText.textContent = `Pausing for ${loopDelayInput.value}s...`;
        }

        loopTimeout = setTimeout(() => {
            video.currentTime = currentSlice.start;
            video.play();
            loopTimeout = null; 
            updateUI(); 
        }, delayMs);
    }
});

nextBtn.addEventListener('click', () => {
    const totalSlices = getTotalSlicesCount();
    
    if (currentSliceIndex < totalSlices - 1 && isLooping) {
        clearTimeout(loopTimeout); 
        loopTimeout = null;
        
        currentSliceIndex++;
        const active = getActiveSlice();
        if (active) {
            video.currentTime = active.start;
            video.play();
            updateUI();
        }
    }
});

prevBtn.addEventListener('click', () => {
    if (currentSliceIndex > 0 && isLooping) {
        clearTimeout(loopTimeout);
        loopTimeout = null;
        
        currentSliceIndex--;
        const active = getActiveSlice();
        if (active) {
            video.currentTime = active.start;
            video.play();
            updateUI();
        }
    }
});

function updateUI() {
    const currentSlice = getActiveSlice();
    if (!currentSlice) return;
    
    const totalSlices = getTotalSlicesCount();
    
    statusText.textContent = `Looping ${currentSlice.id === 'Remaining' ? 'Uncut Audio/Video' : 'Ayah ' + currentSlice.id} ( ${currentSlice.start.toFixed(1)}s to ${currentSlice.end.toFixed(1)}s )`;
    
    prevBtn.disabled = currentSliceIndex === 0;
    nextBtn.disabled = currentSliceIndex >= totalSlices - 1;
}

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'INPUT') return;
    if (!video.src || video.src === window.location.href) return;

    if (event.code === 'Space') {
        event.preventDefault(); 
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }

    if (event.key.toLowerCase() === 'c') {
        markCutBtn.click();
    }
});

// --- Floating Desktop Mini-Player (Document PiP API) ---
const pipBtn = document.getElementById('pipBtn');

// 1. Check if the browser supports the modern Document PiP API
if ('documentPictureInPicture' in window) {
    pipBtn.style.display = 'flex'; 
}

pipBtn.addEventListener('click', async () => {
    if (window.documentPictureInPicture.window) return;

    try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
            width: 320,
            height: 240
        });

        // Clone all CSS stylesheets
        [...document.styleSheets].forEach((styleSheet) => {
            try {
                const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
                const style = document.createElement('style');
                style.textContent = cssRules;
                pipWindow.document.head.appendChild(style);
            } catch (e) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = styleSheet.type;
                link.media = styleSheet.media;
                link.href = styleSheet.href;
                pipWindow.document.head.appendChild(link);
            }
        });

        // Inject Phosphor Icons
        const script = document.createElement('script');
        script.src = "https://unpkg.com/@phosphor-icons/web";
        pipWindow.document.head.appendChild(script);

        // Match the current theme
        pipWindow.document.body.className = document.body.className;

        const titleText = document.getElementById('displayTitle') ? document.getElementById('displayTitle').innerText : 'Ayah Looper';

        // Build the Mini-Player UI
        pipWindow.document.body.innerHTML = `
            <div style="height: 100vh; width: 100vw; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-color); color: var(--text-main); font-family: 'Poppins', sans-serif; padding: 20px; margin: 0;">
                
                <div style="background: var(--surface); width: 100%; padding: 20px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid var(--border-color); display: flex; flex-direction: column; align-items: center; gap: 15px;">
                    
                    <div style="text-align: center;">
                        <h3 id="pipTitle" style="margin: 0 0 5px 0; font-size: 1.1rem; color: var(--text-main);">${titleText}</h3>
                        <p id="pipStatus" style="margin: 0; font-size: 0.75rem; color: var(--text-muted); line-height: 1.3;">${statusText.textContent}</p>
                    </div>
                    
                    <div style="display: flex; gap: 15px; align-items: center; margin-top: 5px;">
                        <button id="pipPrev" style="background: var(--secondary); border: none; width: 45px; height: 45px; border-radius: 50%; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;">
                            <i class="ph-fill ph-skip-back" style="font-size: 1.2rem;"></i>
                        </button>
                        
                        <button id="pipPlay" style="background: var(--primary); border: none; width: 60px; height: 60px; border-radius: 50%; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(163, 130, 90, 0.3); transition: transform 0.2s;">
                            <i class="ph-fill ${video.paused ? 'ph-play' : 'ph-pause'}" style="font-size: 1.8rem;"></i>
                        </button>
                        
                        <button id="pipNext" style="background: var(--secondary); border: none; width: 45px; height: 45px; border-radius: 50%; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;">
                            <i class="ph-fill ph-skip-forward" style="font-size: 1.2rem;"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        const pipPlay = pipWindow.document.getElementById('pipPlay');
        const pipPrev = pipWindow.document.getElementById('pipPrev');
        const pipNext = pipWindow.document.getElementById('pipNext');
        const pipStatus = pipWindow.document.getElementById('pipStatus');

        pipPlay.addEventListener('click', () => {
            if (video.paused) video.play();
            else video.pause();
        });

        pipPrev.addEventListener('click', () => { prevBtn.click(); });
        pipNext.addEventListener('click', () => { nextBtn.click(); });

        [pipPlay, pipPrev, pipNext].forEach(btn => {
            btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.9)');
            btn.addEventListener('mouseup', () => btn.style.transform = 'scale(1)');
            btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
        });

        const updatePipPlayState = () => {
            pipPlay.innerHTML = `<i class="ph-fill ${video.paused ? 'ph-play' : 'ph-pause'}" style="font-size: 1.8rem;"></i>`;
        };
        video.addEventListener('play', updatePipPlayState);
        video.addEventListener('pause', updatePipPlayState);

        const observer = new MutationObserver(() => {
            pipStatus.textContent = statusText.textContent;
        });
        observer.observe(statusText, { childList: true, characterData: true, subtree: true });

        pipWindow.addEventListener('pagehide', () => {
            video.removeEventListener('play', updatePipPlayState);
            video.removeEventListener('pause', updatePipPlayState);
            observer.disconnect();
        });

    } catch (err) {
        console.error('Failed to open PiP window:', err);
    }
});