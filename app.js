const video = document.getElementById('quranVideo');
const videoUpload = document.getElementById('videoUpload');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const statusText = document.getElementById('statusText');
const markCutBtn = document.getElementById('markCutBtn');
const toggleLoopBtn = document.getElementById('toggleLoopBtn');
const sliceList = document.getElementById('sliceList');

let slices = [];
let currentSliceIndex = 0;
let lastCutTime = 0.0;
let isLooping = false; 

// --- Helper: Save and Load from Phone Memory ---
function saveCutsToPhone() {
    localStorage.setItem('savedQuranCuts', JSON.stringify(slices));
}

function loadCutsFromPhone() {
    const savedData = localStorage.getItem('savedQuranCuts');
    if (savedData) {
        slices = JSON.parse(savedData);
        
        renderSlices(); // Draw the list with delete buttons

        if (slices.length > 0) {
            lastCutTime = slices[slices.length - 1].end;
        }
        
        statusText.innerHTML = `Loaded ${slices.length} saved cuts! Press play on the video.`;
    } else {
        statusText.innerHTML = "Video loaded! Press play on the video screen, then click 'Cut Ayah Here'.";
    }
}

// --- NEW / RESTORED: The Render Function with Delete Button ---
function renderSlices() {
    sliceList.innerHTML = ""; // Clear the current visual list
    
    slices.forEach((slice, index) => {
        // Fix the IDs just in case a middle piece was deleted
        slice.id = index + 1; 
        
        const listItem = document.createElement('li');
        listItem.style.display = "flex";
        listItem.style.justifyContent = "space-between";
        listItem.style.alignItems = "center";
        
        const textSpan = document.createElement('span');
        textSpan.textContent = `Ayah ${slice.id}: ${slice.start.toFixed(1)}s to ${slice.end.toFixed(1)}s`;
        
        // Create the Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "❌ Delete";
        deleteBtn.style.background = "#ef4444"; // Red color
        deleteBtn.style.padding = "6px 12px";
        deleteBtn.style.fontSize = "12px";
        deleteBtn.style.minWidth = "auto"; // Prevents the button from stretching
        deleteBtn.style.flex = "none";
        
        // What happens when they click Delete
        deleteBtn.addEventListener('click', () => {
            // 1. Remove from array
            slices.splice(index, 1);
            
            // 2. Fix the last cut time
            if (slices.length > 0) {
                lastCutTime = slices[slices.length - 1].end;
            } else {
                lastCutTime = 0.0;
            }
            
            // 3. Save the updated (smaller) array to the phone's memory!
            saveCutsToPhone();
            
            // 4. Stop looping if they delete while practicing
            if (isLooping) {
                isLooping = false;
                video.pause();
                toggleLoopBtn.textContent = "▶️ Start Looping";
                toggleLoopBtn.style.background = "#ea580c";
                prevBtn.disabled = true;
                nextBtn.disabled = true;
                statusText.textContent = "Looping stopped because a cut was deleted.";
            }
            
            // 5. Redraw the list
            renderSlices();
        });
        
        listItem.appendChild(textSpan);
        listItem.appendChild(deleteBtn);
        sliceList.appendChild(listItem);
    });
}

// --- 1. Load Local Video File ---
videoUpload.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        video.src = URL.createObjectURL(file);
        
        isLooping = false;
        toggleLoopBtn.textContent = "▶️ Start Looping";
        toggleLoopBtn.style.background = "#ea580c";
        
        loadCutsFromPhone();
    }
});

// --- 2. The Slicing Tool with Visual Feedback ---
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
    
    saveCutsToPhone(); 
    renderSlices(); // Draw the new cut with a delete button

    const originalText = markCutBtn.textContent;
    markCutBtn.textContent = "✅ Saved!";
    markCutBtn.style.background = "#059669"; 
    
    if (navigator.vibrate) navigator.vibrate(50);

    setTimeout(() => {
        markCutBtn.textContent = originalText;
        markCutBtn.style.background = "#16a34a"; 
    }, 600); 
});

// --- 3. Toggle Looping Mode ---
toggleLoopBtn.addEventListener('click', () => {
    if (slices.length === 0) {
        alert("Please make at least one cut first!");
        return;
    }
    
    isLooping = !isLooping; 
    
    if (isLooping) {
        toggleLoopBtn.textContent = "⏹️ Stop Looping";
        toggleLoopBtn.style.background = "#dc2626";
        currentSliceIndex = 0; 
        video.currentTime = slices[currentSliceIndex].start;
        video.play();
        updateUI();
    } else {
        toggleLoopBtn.textContent = "▶️ Start Looping";
        toggleLoopBtn.style.background = "#ea580c";
        statusText.textContent = "Looping stopped. You can make more cuts.";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    }
});

// --- 4. The Core Looping Engine ---
video.addEventListener('timeupdate', () => {
    if (!video.src || !isLooping || slices.length === 0) return; 

    const currentSlice = slices[currentSliceIndex];
    if (video.currentTime >= currentSlice.end) {
        video.currentTime = currentSlice.start;
        video.play(); 
    }
});

// --- 5. Navigation Controls ---
nextBtn.addEventListener('click', () => {
    if (currentSliceIndex < slices.length - 1 && isLooping) {
        currentSliceIndex++;
        video.currentTime = slices[currentSliceIndex].start;
        updateUI();
    }
});

prevBtn.addEventListener('click', () => {
    if (currentSliceIndex > 0 && isLooping) {
        currentSliceIndex--;
        video.currentTime = slices[currentSliceIndex].start;
        updateUI();
    }
});

function updateUI() {
    const currentSlice = slices[currentSliceIndex];
    statusText.textContent = `Looping Ayah ${currentSlice.id} ( ${currentSlice.start.toFixed(1)}s to ${currentSlice.end.toFixed(1)}s )`;
    prevBtn.disabled = currentSliceIndex === 0;
    nextBtn.disabled = currentSliceIndex === slices.length - 1;
}