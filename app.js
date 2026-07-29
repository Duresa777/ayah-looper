const video = document.getElementById('quranVideo');
const videoUpload = document.getElementById('videoUpload');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const statusText = document.getElementById('statusText');
const markCutBtn = document.getElementById('markCutBtn');
const toggleLoopBtn = document.getElementById('toggleLoopBtn');
const sliceList = document.getElementById('sliceList');
const pauseInput = document.getElementById('pauseInput');

// NEW: Grab the timer overlay and custom timeline
const timeOverlay = document.getElementById('timeOverlay');
const customTimeline = document.getElementById('customTimeline');

let slices = [];
let currentSliceIndex = 0;
let lastCutTime = 0.0;
let isLooping = false; 
let currentFileName = ""; 
let loopTimeout = null; 

function saveCuts() {
    if (currentFileName) {
        localStorage.setItem('ayahCuts_' + currentFileName, JSON.stringify(slices));
    }
}

// --- 1. Load Local Video File & Restore Cuts ---
videoUpload.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        currentFileName = file.name; 
        video.src = URL.createObjectURL(file);
        
        // Wait for video metadata to load so we know the duration for the red dots
        video.onloadedmetadata = () => {
            const savedData = localStorage.getItem('ayahCuts_' + currentFileName);
            
            if (savedData) {
                slices = JSON.parse(savedData);
                if (slices.length > 0) {
                    lastCutTime = slices[slices.length - 1].end;
                } else {
                    lastCutTime = 0.0;
                }
                statusText.innerHTML = "Saved cuts loaded! Press Play to continue.";
            } else {
                slices = [];
                lastCutTime = 0.0;
                statusText.innerHTML = "New video loaded! Press Play, then click 'Cut Ayah Here'.";
            }
            
            isLooping = false;
            clearTimeout(loopTimeout); 
            timeOverlay.style.display = "block"; // Show timer
            renderSlices(); 
            
            toggleLoopBtn.textContent = "▶️ Start Looping";
            toggleLoopBtn.style.background = "#ea580c";
        };
    }
});

// --- 2. The Slicing Tool ---
markCutBtn.addEventListener('click', () => {
    const cutTime = video.currentTime;
    if (cutTime <= lastCutTime) return;

    const newSlice = {
        id: slices.length + 1,
        start: lastCutTime,
        end: cutTime
    };
    
    slices.push(newSlice); 
    lastCutTime = cutTime; 
    
    saveCuts(); 
    renderSlices(); 
});

// --- 3. The Render Function (Now includes Red Dots) ---
function renderSlices() {
    sliceList.innerHTML = ""; 
    customTimeline.innerHTML = ""; // Clear old red dots
    
    slices.forEach((slice, index) => {
        slice.id = index + 1; 
        
        // ---------------------------------------------------
        // NEW: Calculate and place the Red Dot on the timeline
        // ---------------------------------------------------
        if (video.duration) {
            const dot = document.createElement('div');
            dot.className = 'cut-dot';
            
            // Calculate where the dot should go (e.g., 50% across the bar)
            const percentage = (slice.end / video.duration) * 100;
            dot.style.left = percentage + "%";
            
            customTimeline.appendChild(dot);
        }

        // Build the list item as usual
        const listItem = document.createElement('li');
        
        const textSpan = document.createElement('span');
        textSpan.textContent = `Ayah ${slice.id}: ${slice.start.toFixed(1)}s to ${slice.end.toFixed(1)}s`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "❌ Delete";
        
        deleteBtn.addEventListener('click', () => {
            slices.splice(index, 1);
            
            if (slices.length > 0) {
                lastCutTime = slices[slices.length - 1].end;
            } else {
                lastCutTime = 0.0;
            }
            
            if (isLooping) {
                isLooping = false;
                video.pause();
                clearTimeout(loopTimeout); 
                toggleLoopBtn.textContent = "▶️ Start Looping";
                toggleLoopBtn.style.background = "#ea580c";
                prevBtn.disabled = true;
                nextBtn.disabled = true;
                statusText.textContent = "Looping stopped because a cut was deleted.";
                timeOverlay.style.display = "block"; // Show timer again
            }
            
            saveCuts(); 
            renderSlices();
        });
        
        listItem.appendChild(textSpan);
        listItem.appendChild(deleteBtn);
        sliceList.appendChild(listItem);
    });
}

// --- 4. Toggle Looping Mode ---
toggleLoopBtn.addEventListener('click', () => {
    if (slices.length === 0) {
        alert("Please make at least one cut first!");
        return;
    }
    
    isLooping = !isLooping; 
    
    if (isLooping) {
        toggleLoopBtn.textContent = "⏹️ Stop Looping";
        toggleLoopBtn.style.background = "#dc2626";
        timeOverlay.style.display = "none"; // Hide the timer when looping starts
        currentSliceIndex = 0; 
        video.currentTime = slices[currentSliceIndex].start;
        video.play();
        updateUI();
    } else {
        toggleLoopBtn.textContent = "▶️ Start Looping";
        toggleLoopBtn.style.background = "#ea580c";
        timeOverlay.style.display = "block"; // Show the timer again when slicing
        statusText.textContent = "Looping stopped. You can make more cuts.";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        
        video.pause();
        clearTimeout(loopTimeout); 
    }
});

// --- 5. The Core Engine (Now includes Live Timer updates) ---
video.addEventListener('timeupdate', () => {
    if (!video.src) return; 

    // NEW: Update the Live Timer if we are in Slicing Mode
    if (!isLooping) {
        timeOverlay.textContent = video.currentTime.toFixed(1) + "s";
    }

    if (!isLooping || slices.length === 0) return; 

    const currentSlice = slices[currentSliceIndex];
    
    if (video.currentTime >= currentSlice.end) {
        video.pause(); 
        video.currentTime = currentSlice.start; 
        
        const pauseSeconds = parseInt(pauseInput.value) || 0; 
        const pauseMilliseconds = pauseSeconds * 1000; 

        if (pauseSeconds > 0) {
            statusText.textContent = `⏸️ Your turn! (Pausing for ${pauseSeconds} seconds...)`;
        } else {
            statusText.textContent = `Looping Ayah ${currentSlice.id}...`;
        }
        
        loopTimeout = setTimeout(() => {
            if (isLooping) { 
                video.play();
                updateUI(); 
            }
        }, pauseMilliseconds); 
    }
});

// --- 6. Navigation Controls ---
nextBtn.addEventListener('click', () => {
    if (currentSliceIndex < slices.length - 1 && isLooping) {
        clearTimeout(loopTimeout); 
        currentSliceIndex++;
        video.currentTime = slices[currentSliceIndex].start;
        video.play(); 
        updateUI();
    }
});

prevBtn.addEventListener('click', () => {
    if (currentSliceIndex > 0 && isLooping) {
        clearTimeout(loopTimeout); 
        currentSliceIndex--;
        video.currentTime = slices[currentSliceIndex].start;
        video.play(); 
        updateUI();
    }
});

function updateUI() {
    const currentSlice = slices[currentSliceIndex];
    statusText.textContent = `Looping Ayah ${currentSlice.id} ( ${currentSlice.start.toFixed(1)}s to ${currentSlice.end.toFixed(1)}s )`;
    prevBtn.disabled = currentSliceIndex === 0;
    nextBtn.disabled = currentSliceIndex === slices.length - 1;
}