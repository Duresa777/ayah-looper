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

// --- NEW: Keyboard Shortcuts ---
document.addEventListener('keydown', (event) => {
    // Prevent shortcuts from firing if the user is typing in the delay input box
    if (event.target.tagName === 'INPUT') return;

    // Check if media is loaded
    if (!video.src || video.src === window.location.href) return;

    // Spacebar: Play or Pause
    if (event.code === 'Space') {
        event.preventDefault(); // Stop page from scrolling down
        
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }

    // Letter 'C': Trigger Cut
    if (event.key.toLowerCase() === 'c') {
        markCutBtn.click();
    }
});