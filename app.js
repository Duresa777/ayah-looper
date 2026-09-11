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

// NEW: Tajweed Mode Button
const speedBtn = document.getElementById('speedBtn');

let slices = [];
let currentSliceIndex = 0;
let lastCutTime = 0.0;
let isLooping = false; 
let loopTimeout = null; 

// NEW: Dynamic Memory Key (Surah-Specific Saving)
let currentFileKey = 'savedQuranCuts_default'; 

// Auto-detect if we loaded a Surah from the library on page load
const urlParams = new URLSearchParams(window.location.search);
const passedTitle = urlParams.get('title');
if (passedTitle) {
    // Strip spaces to make a clean database key (e.g., "ayahLooper_Al-Mulk")
    currentFileKey = `ayahLooper_${passedTitle.replace(/\s+/g, '_')}`;
    setTimeout(() => loadCutsFromPhone(), 200); // Auto-load previously saved cuts!
}

function saveCutsToPhone() {
    localStorage.setItem(currentFileKey, JSON.stringify(slices));
}

function loadCutsFromPhone() {
    const savedData = localStorage.getItem(currentFileKey);
    if (savedData) {
        slices = JSON.parse(savedData);
        renderSlices();
        if (slices.length > 0) {
            lastCutTime = slices[slices.length - 1].end;
        }
        statusText.innerHTML = `✅ Loaded ${slices.length} saved cuts for this Surah!`;
    } else {
        statusText.innerHTML = "Play the audio, then click 'Cut' or press 'C' to slice Ayahs.";
    }
}

// --- NEW: Tajweed Mode (Speed Control) ---
const speeds = [1, 0.75, 0.5];
let currentSpeedIndex = 0;

if (speedBtn) {
    speedBtn.addEventListener('click', () => {
        currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
        const newSpeed = speeds[currentSpeedIndex];
        video.playbackRate = newSpeed;
        speedBtn.innerHTML = `<i class="ph-bold ph-gauge"></i> ${newSpeed}x Speed`;
    });
}

exportBtn.addEventListener('click', () => {
    if (slices.length === 0) {
        alert("You don't have any cuts to export yet!");
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(slices, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    // Name the export file based on the Surah!
    downloadAnchorNode.setAttribute("download", `${currentFileKey}.json`);
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

importBtn.addEventListener('click', () => { importInput.click(); });

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

// ==========================================
// EDIT MODAL LOGIC & STATE
// ==========================================
let currentEditIndex = null;
const editModal = document.getElementById('editModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const editModalTitle = document.getElementById('editModalTitle');
const editStartVal = document.getElementById('editStartVal');
const editEndVal = document.getElementById('editEndVal');
const mergeUpBtn = document.getElementById('mergeUpBtn');
const mergeDownBtn = document.getElementById('mergeDownBtn');

// Close Modal Event
closeEditModalBtn.addEventListener('click', () => editModal.classList.remove('show'));
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) editModal.classList.remove('show');
});

// Helper to refresh the modal's text numbers dynamically
function updateModalUI() {
    if (currentEditIndex === null) return;
    const slice = slices[currentEditIndex];
    editStartVal.innerText = slice.start.toFixed(1);
    editEndVal.innerText = slice.end.toFixed(1);
    
    // Hide/Show merge buttons if they are at the very top or bottom of the list
    mergeUpBtn.style.opacity = currentEditIndex > 0 ? '1' : '0.3';
    mergeUpBtn.style.pointerEvents = currentEditIndex > 0 ? 'auto' : 'none';
    
    mergeDownBtn.style.opacity = currentEditIndex < slices.length - 1 ? '1' : '0.3';
    mergeDownBtn.style.pointerEvents = currentEditIndex < slices.length - 1 ? 'auto' : 'none';
}

// Modal Fine-Tune Logic
function nudgeCutModal(property, amount) {
    if (currentEditIndex === null) return;
    let newValue = slices[currentEditIndex][property] + amount;
    
    // Safety checks to prevent overlapping cuts
    if (property === 'start') {
        if (newValue < 0) newValue = 0;
        if (newValue >= slices[currentEditIndex].end - 0.5) newValue = slices[currentEditIndex].end - 0.5;
    } else if (property === 'end') {
        if (newValue <= slices[currentEditIndex].start + 0.5) newValue = slices[currentEditIndex].start + 0.5;
        if (video.duration && newValue > video.duration) newValue = video.duration;
    }
    
    slices[currentEditIndex][property] = newValue;
    
    if (currentEditIndex === slices.length - 1 && property === 'end') {
        lastCutTime = newValue;
    }
    
    saveCutsToPhone();
    updateModalUI(); // Updates the text in the popup instantly
    renderSlices();  // Updates the list behind the popup
}

// Attach Tune Button Listeners
document.getElementById('editStartMinus').addEventListener('click', () => nudgeCutModal('start', -0.5));
document.getElementById('editStartPlus').addEventListener('click', () => nudgeCutModal('start', 0.5));
document.getElementById('editEndMinus').addEventListener('click', () => nudgeCutModal('end', -0.5));
document.getElementById('editEndPlus').addEventListener('click', () => nudgeCutModal('end', 0.5));

// Attach Merge Button Listeners
mergeUpBtn.addEventListener('click', () => {
    if (currentEditIndex > 0) {
        slices[currentEditIndex - 1].end = slices[currentEditIndex].end;
        slices.splice(currentEditIndex, 1);
        finishMerge();
    }
});

mergeDownBtn.addEventListener('click', () => {
    if (currentEditIndex < slices.length - 1) {
        slices[currentEditIndex].end = slices[currentEditIndex + 1].end;
        slices.splice(currentEditIndex + 1, 1);
        finishMerge();
    }
});

function finishMerge() {
    lastCutTime = slices.length > 0 ? slices[slices.length - 1].end : 0.0;
    saveCutsToPhone();
    renderSlices();
    editModal.classList.remove('show'); // Close modal when done merging
}

// ==========================================
// THE NEW CLEAN RENDER FUNCTION
// ==========================================
function renderSlices() {
    sliceList.innerHTML = ""; 
    
    slices.forEach((slice, index) => {
        slice.id = index + 1; 
        
        const listItem = document.createElement('li');
        listItem.style.display = 'flex';
        listItem.style.justifyContent = 'space-between';
        listItem.style.alignItems = 'center';
        listItem.style.padding = '12px 16px';
        
        // Clean Text Display
        const textSpan = document.createElement('span');
        textSpan.innerHTML = `<strong style="color: var(--primary);">Ayah ${slice.id}</strong> <span style="opacity: 0.6; margin: 0 8px;">|</span> ${slice.start.toFixed(1)}s – ${slice.end.toFixed(1)}s`;
        textSpan.style.fontSize = '0.95rem';
        
        const actionGroup = document.createElement('div');
        actionGroup.style.display = 'flex';
        actionGroup.style.gap = '8px';

        // Clean Edit Button
        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="ph ph-pencil-simple" style="font-size: 1.1rem;"></i> Edit';
        editBtn.style.background = 'var(--secondary)';
        editBtn.style.padding = '8px 12px';
        
        editBtn.addEventListener('click', () => {
            currentEditIndex = index;
            editModalTitle.innerText = `Edit Ayah ${slice.id}`;
            updateModalUI();
            editModal.classList.add('show');
        });

        // Clean Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="ph ph-trash" style="font-size: 1.1rem;"></i>';
        deleteBtn.style.background = 'var(--danger)';
        deleteBtn.style.padding = '8px 12px';
        deleteBtn.title = "Delete";
        
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
            }
            renderSlices();
        });

        actionGroup.appendChild(editBtn);
        actionGroup.appendChild(deleteBtn);
        
        listItem.appendChild(textSpan);
        listItem.appendChild(actionGroup);
        sliceList.appendChild(listItem);
    });
}

videoUpload.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        // Update the unique key based on the local file name!
        currentFileKey = `ayahLooper_${file.name.replace(/\s+/g, '_')}`;
        video.src = URL.createObjectURL(file);
        isLooping = false;
        clearTimeout(loopTimeout);
        loopTimeout = null;
        toggleLoopBtn.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Start Looping';
        toggleLoopBtn.style.background = "var(--warning)";
        
        // Wipe the array and load any past cuts for this specific file
        slices = [];
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
        alert("Please upload a file or load a Surah first!");
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
    
    statusText.textContent = `Looping ${currentSlice.id === 'Remaining' ? 'Uncut Audio' : 'Ayah ' + currentSlice.id} ( ${currentSlice.start.toFixed(1)}s to ${currentSlice.end.toFixed(1)}s )`;
    
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

        const script = document.createElement('script');
        script.src = "https://unpkg.com/@phosphor-icons/web";
        pipWindow.document.head.appendChild(script);

        pipWindow.document.body.className = document.body.className;
        const titleText = document.getElementById('displayTitle') ? document.getElementById('displayTitle').innerText : 'Ayah Looper';

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

// --- Initialize PWA Service Worker ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered successfully!'))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}