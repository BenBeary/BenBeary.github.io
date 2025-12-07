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
    buildCatalogue();          // Create card elements
    // sortProjectsByNewest();    // Sort newest → oldest
    sortProjectsBy("programming");
    buildProjectDots();
    loadProject(projectNames[currentProjectIndex]);
    startAutoSlide();
    loop();
};


function loop() {

    // setTimeout(() => {

    //     console.log(isHovering);
    //     loop()
    // }, 500);
}


// #######################################
// ########### BACKGROUND SWAP ###########
// #######################################

function changeBackground(path) {
    const bg = document.querySelector(".wrapper");
    bg.style.opacity = 0;

    setTimeout(() => {

        if(!path || path.trim() === ""){
            bg.style.backgroundImage = "none";
        }
        else {
            bg.style.backgroundImage = `url('${path}')`;
        }

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

    const oldSlide = !slideIndex ? 0 : slideIndex;

    slideIndex = index;
    
    
    stopAutoSlide();
    startAutoSlide();
    scheduleProjectAutoSwitch();

    if(slideIndex === thumbs.length - 1){
        stopAutoSlide();
    }

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

    // make it so it shows the next thumb as well as the selected
    let viewThumb = thumb[slideIndex];

    if(oldSlide <= slideIndex){
        viewThumb = slideIndex + 1 < thumbs.length ? thumbs[slideIndex + 1] : thumbs[slideIndex];
    }
    else {
        viewThumb = slideIndex - 1 < 0 ? thumbs[slideIndex] : thumbs[slideIndex - 1];
    }

    scrollThumbIntoView(viewThumb);
}

function scrollThumbIntoView(thumb) {
    const strip = document.querySelector(".thumb-strip");
    if (!strip) return;

    const stripRect = strip.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();

    // How far the thumb is relative to the strip
    const leftOffset = thumbRect.left - stripRect.left;
    const rightOffset = thumbRect.right - stripRect.right;

    // Scroll left if needed
    if (leftOffset < 0) {
        strip.scrollBy({
            left: leftOffset - 20, // extra margin
            behavior: "smooth"
        });
    }

    // Scroll right if needed
    if (rightOffset > 0) {
        strip.scrollBy({
            left: rightOffset + 20, // extra margin
            behavior: "smooth"
        });
    }
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
            changeBackground(p.background);

            // Title
            document.getElementById("Title").textContent = p.title;

            // Button
            const playButton = document.querySelector(".header button");
            
            if(!p.playLink || p.playLink.trim() === ""){
                playButton.style.display = "none";
            }
            else{
                playButton.style.display = "inline-block";
                playButton.onclick = () => window.open(p.playLink, "_blank");
            }

            // Date
            document.getElementById("dateEntry").textContent = p.date;

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

let isHovering = false;
const affectArea = document.querySelector(".wrapper");

// Track hover state
affectArea.addEventListener("mouseenter", () => {
    isHovering = true;
});
affectArea.addEventListener("mouseleave", () => {
    isHovering = false;
    clearInterval(autoProjectInterval);
});

// Updated auto-switch function
function scheduleProjectAutoSwitch() {
    clearTimeout(autoProjectTimeout);

    const thumbs = document.querySelectorAll(".thumb-strip .thumb");
    if (!thumbs.length) return;

    const isLastImageActive = (slideIndex === thumbs.length - 1);
    if (!isLastImageActive) return;

    // Wait 5 seconds AFTER reaching last slide, but only if not hovering
    autoProjectTimeout = setTimeout(() => {
        if (!isHovering) {
            currentProjectIndex = (currentProjectIndex + 1) % projectNames.length;
            loadProject(projectNames[currentProjectIndex]);
        } else {
            // If hovering, retry after 500ms
            scheduleProjectAutoSwitch();
        }
    }, 5000);
}



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

    reorderCatalogue();
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

// Mobile arrows

document.getElementById("prevProjectMobile").onclick = () => {
    currentProjectIndex =
        (currentProjectIndex - 1 + projectNames.length) % projectNames.length;
    loadProject(projectNames[currentProjectIndex]);
};
document.getElementById("nextProjectMobile").onclick = () => {
    currentProjectIndex =
        (currentProjectIndex + 1) % projectNames.length;
    loadProject(projectNames[currentProjectIndex]);
};

// ===================================
// BUILD CATALOGUE SECTION
// ===================================

// Store card elements so we don't rebuild them
let catalogueCards = {};

function buildCatalogue() {
    const grid = document.getElementById("catalogueGrid");
    if (!grid) return;

    grid.innerHTML = "";
    catalogueCards = {};

    // Create each card ONCE
    Object.entries(projects).forEach(([key, p]) => {
        const card = document.createElement("div");
        card.className = "catalogue-card";

        card.onclick = () => {
            currentProjectIndex = projectNames.indexOf(key);
            document.getElementById("projects").scrollIntoView({ behavior: "smooth" });
            loadProject(key);
        };

        // FIRST IMAGE
        const img = document.createElement("img");
        img.className = "catalogue-image";
        img.src = p.images[0];

        // TITLE
        const title = document.createElement("h3");
        title.className = "catalogue-card-title";
        title.textContent = p.title;

        const date = document.createElement("p");
        date.className = "catalogue-summary";
        date.textContent = p.date;

        // TAGS
        const tagWrap = document.createElement("div");
        tagWrap.className = "catalogue-tags";
        p.tags.forEach(t => {
            const tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = t;
            tagWrap.appendChild(tag);
        });

        // SUMMARY
        const summary = document.createElement("p");
        summary.className = "catalogue-summary";
        summary.textContent = p.summary;

        // Assemble
        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(date);
        card.appendChild(tagWrap);
        card.appendChild(summary);

        // Save for reuse
        catalogueCards[key] = card;
    });

    // Initial order placement
    reorderCatalogue();
}

function reorderCatalogue() {
    const grid = document.getElementById("catalogueGrid");
    grid.innerHTML = "";

    // Reappend cards IN THE ORDER OF projectNames
    projectNames.forEach(key => {
        grid.appendChild(catalogueCards[key]);
    });
}

function sortProjectsByNewest() {
    projectNames = Object.keys(projects).sort((a, b) => {
        const dateA = new Date(projects[a].date);
        const dateB = new Date(projects[b].date);
        return dateB - dateA; // newest first
    });

    reorderCatalogue();
}


// -------------------------------------------
// NAV BAR UPDATING
// -------------------------------------------

const hamburger = document.getElementById("navHamburger");
const mobileMenu = document.getElementById("mobileMenu");

hamburger.addEventListener("click", () => {
    mobileMenu.classList.toggle("show");
});
const mobileLinks = mobileMenu.querySelectorAll('a');
mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.remove('show');
    });
});