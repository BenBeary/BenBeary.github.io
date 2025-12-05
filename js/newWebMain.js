// #######################################
// ########### GLOBAL VARIABLES ###########
// #######################################

let slideIndex = 0;
let autoSlideInterval = null;

let projectNames = Object.keys(projects);
let currentProjectIndex = 0;

let isHoveringCol1 = false;
let autoProjectInterval = null;
let autoProjectTimeout = null;


// #######################################
// ########### WINDOW ONLOAD ##############
// #######################################

window.onload = () => {
    sortProjectsBy("level_design");
    buildProjectDots();
    loadProject(projectNames[currentProjectIndex]);
    startAutoSlide();

};


// #######################################
// ########### BACKGROUND SWAP ###########
// #######################################

function changeBackground(path) {
    const bg = document.querySelector(".wrapper");
    bg.style.opacity = 0;

    setTimeout(() => {
        bg.style.backgroundImage = `url('${path}')`;
        bg.style.opacity = 1;
    }, 200);
}


// #######################################
// ########### SLIDESHOW LOGIC ###########
// #######################################

function setSlide(imgElement, indexOverride = null) {
    const thumbs = Array.from(document.querySelectorAll(".thumb-strip .thumb"));
    if (!thumbs.length) return;

    // Determine index
    let index = indexOverride !== null ? indexOverride : thumbs.indexOf(imgElement);

    if (index < 0 || index >= thumbs.length) return;

    // Skip if already active
    if (slideIndex === index && imgElement.classList.contains("active")) return;

    slideIndex = index;

    stopAutoSlide();
    startAutoSlide();
    scheduleProjectAutoSwitch();

    const main = document.getElementById("mainSlide");
    const thumb = thumbs[slideIndex];

    // Set image
    main.classList.remove("fade");
    void main.offsetWidth; // Force reflow
    main.classList.add("fade");
    main.src = thumb.dataset.full || thumb.src;

    // Update active highlight
    thumbs.forEach(t => t.classList.remove("active"));
    thumb.classList.add("active");

    thumb.scrollIntoView({ behavior: "smooth", inline: "center" })
}

// Auto-sliding
function startAutoSlide() {
    autoSlideInterval = setInterval(() => {
        if (!isHoveringCol1) showNextSlide();
    }, 4000);
}

function stopAutoSlide() {
    clearInterval(autoSlideInterval);
}

function showNextSlide() {
    const thumbs = document.querySelectorAll(".thumb-strip .thumb");
    if (!thumbs.length) return;

    slideIndex = (slideIndex + 1) % thumbs.length;
    setSlide(thumbs[slideIndex], slideIndex);
}

// Hover pause logic
document.addEventListener("DOMContentLoaded", () => {
    const col1 = document.querySelector(".col1");
    if (col1) {
        col1.addEventListener("mouseenter", () => isHoveringCol1 = true);
        col1.addEventListener("mouseleave", () => isHoveringCol1 = false);
    }
});


// #######################################
// ########### LOAD PROJECT ##############
// #######################################

function preloadImages(imageArray) {
    return Promise.all(
        imageArray.map(
            src =>
                new Promise(resolve => {
                    const img = new Image();
                    img.onload = resolve;
                    img.onerror = resolve;
                    img.src = src;
                })
        )
    );
}

function loadProject(projectName) {
    const wrapper = document.querySelector(".wrapper");
    const p = projects[projectName];
    if (!p) return;

    // STEP 1: fade out
    wrapper.style.opacity = 0;

    // STEP 2: preload all images for the new project
    preloadImages(p.images).then(() => {

        // STEP 3: once loaded, continue updating everything
        setTimeout(() => {

            currentProjectIndex = projectNames.indexOf(projectName);

            // Background
            if (p.background) changeBackground(p.background);

            // Title
            document.getElementById("Title").textContent = p.title;

            // Button
            const playButton = document.querySelector(".header button");
            playButton.onclick = () => window.open(p.playLink, "_blank");

            // Summary
            document.getElementById("Summary").textContent = p.summary;

            // Tags
            const tagContainer = document.getElementById("tags");
            tagContainer.innerHTML = "";
            p.tags.forEach(tag => {
                const t = document.createElement("span");
                t.className = "tag";
                t.textContent = tag;
                tagContainer.appendChild(t);
            });

            // Bullets
            const bulletContainer = document.getElementById("bullets");
            bulletContainer.innerHTML = "";
            p.bullets.forEach(text => {
                const li = document.createElement("li");
                li.textContent = text;
                bulletContainer.appendChild(li);
            });

            // Thumbnails
            const thumbStrip = document.querySelector(".thumb-strip");
            thumbStrip.innerHTML = "";

            p.images.forEach((path, index) => {
                const thumb = document.createElement("img");
                thumb.className = "thumb";
                thumb.src = path;
                thumb.dataset.full = path;

                thumb.onclick = () => setSlide(thumb, index);
                thumbStrip.appendChild(thumb);
            });

            // Reset slideshow
            slideIndex = 0;
            const firstThumb = document.querySelector(".thumb-strip .thumb");
            if (firstThumb) setSlide(firstThumb, 0);

            // Update dots
            updateProjectDots();

            // STEP 4: fade back in (ONLY after images are ready)
            wrapper.style.opacity = 1;

        }, 500); // matches background fade timing

        clearInterval(autoProjectInterval);
    });
}

function scheduleProjectAutoSwitch() {
    clearTimeout(autoProjectTimeout);

    const thumbs = document.querySelectorAll(".thumb-strip .thumb");
    if (!thumbs.length) return;

    const isLastImageActive = (slideIndex === thumbs.length - 1);
    if (!isLastImageActive) return;

    // Wait 5 seconds AFTER reaching last slide
    autoProjectTimeout = setTimeout(() => {
        currentProjectIndex = (currentProjectIndex + 1) % projectNames.length;
        loadProject(projectNames[currentProjectIndex]);
    }, 5000);
}


// pause on hovering

document.querySelector(".wrapper").addEventListener("mouseenter", () => {
    clearInterval(scheduleProjectAutoSwitch);
});

document.querySelector(".wrapper").addEventListener("mouseleave", () => {
    scheduleProjectAutoSwitch();
});

// #######################################
// ###### PROJECT RANKING SORT ###########
// #######################################

function sortProjectsBy(category) {
    const lower = category.toLowerCase();

    const entries = Object.entries(projects);

  
    entries.sort((a, b) => {
        const rankA = a[1].rankings?.[lower] ?? Number.MAX_SAFE_INTEGER;
        const rankB = b[1].rankings?.[lower] ?? Number.MAX_SAFE_INTEGER;
        return rankA - rankB;  
    });

    // Update projectNames array
    projectNames = entries.map(entry => entry[0]);

    // Rebuild UI & load the first project
    buildProjectDots();
    currentProjectIndex = 0;
    loadProject(projectNames[currentProjectIndex]);
}


// #######################################
// ######## PROJECT DOT NAVIGATION #######
// #######################################

function buildProjectDots() {
    const container = document.getElementById("projectDots");
    container.innerHTML = "";

    projectNames.forEach((name, index) => {
        const dot = document.createElement("div");
        dot.className = "project-dot";
        if (index === currentProjectIndex) dot.classList.add("active");

        dot.onclick = () => {
            loadProject(name);
            updateProjectDots();
        };

        container.appendChild(dot);
    });
}

function updateProjectDots() {
    const dots = document.querySelectorAll(".project-dot");
    dots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === currentProjectIndex);
    });
}


// #######################################
// ######## ARROW NAVIGATION #############
// #######################################

document.getElementById("prevProject").onclick = () => {
    currentProjectIndex =
        (currentProjectIndex - 1 + projectNames.length) % projectNames.length;
    loadProject(projectNames[currentProjectIndex]);
};

document.getElementById("nextProject").onclick = () => {
    currentProjectIndex =
        (currentProjectIndex + 1) % projectNames.length;
    loadProject(projectNames[currentProjectIndex]);
};


