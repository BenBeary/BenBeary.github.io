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


let userUnlockedAudio = false;
let userSetVolume = 1;


let modalOpen = false;
let modalIndex = 0; // Track which slide the modal is on


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


// Video Check

function isVideo(path) {
    if (!path || typeof path !== "string") return false;
    return path.toLowerCase().endsWith(".mp4");
}
function isGif(path) {
    if (!path || typeof path !== "string") return false;
    return path.toLowerCase().endsWith(".gif");
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
    if (slideIndex === index && imgElement && imgElement.classList.contains("active")) return;

    const oldSlide = !slideIndex ? 0 : slideIndex;

    slideIndex = index;

    stopAutoSlide();
    startAutoSlide();
    scheduleProjectAutoSwitch();

    if (slideIndex === thumbs.length - 1) {
        stopAutoSlide();
    }

    const thumb = thumbs[slideIndex];

    // Get the source once and reuse it
    const src = thumb && thumb.dataset ? thumb.dataset.full : null;
    if (!src || typeof src !== "string") {
        console.warn("setSlide: invalid src for thumb", thumb);
        return;
    }

    // Get container
    const displayArea = document.getElementById("mainSlideContainer");
    if (!displayArea) return;
    displayArea.innerHTML = ""; // clear previous


    if (isVideo(src)) {
        const vid = document.createElement("video");

        vid.src = src;
        vid.controls = true;
        vid.autoplay = true;
        vid.loop = false;
        vid.classList.add("fade-video");
        

        vid.volume = userSetVolume;
        vid.muted = !userUnlockedAudio;

        // When the user clicks the mute/unmute control
        vid.onvolumechange = () => {
            userUnlockedAudio = !vid.muted;
            userSetVolume = vid.volume;
        };

        displayArea.appendChild(vid);

        stopAutoSlide();
        vid.onended = () => {
            startAutoSlide();
            showNextSlide();
        };
    } else if (isGif(src)) {
        const img = document.createElement("img");
        img.src = src;
        img.classList.add("fade");

        // open modal with the correct src when clicked
        img.onclick = () => openModalWithSlide(src);

        displayArea.appendChild(img);

        // Stop auto-slide while GIF plays
        stopAutoSlide();

        // Measure how long the GIF takes to loop once
        measureGifDuration(src, (loopDuration) => {
            const totalDuration = loopDuration * 2; // loop twice

            // After 2 loops, resume auto-slide and move forward
            setTimeout(() => {
                startAutoSlide();
                // showNextSlide();
            }, totalDuration);
        });
    } else {
        const img = document.createElement("img");
        img.src = src;
        img.classList.add("fade");

        // open modal with the correct src when clicked
        img.onclick = () => openModalWithSlide(src);

        displayArea.appendChild(img);
    }

    // Update active highlight
    thumbs.forEach(t => t.classList.remove("active"));
    thumb.classList.add("active");

    // make it so it shows the next thumb as well as the selected
    let viewThumb;

    if (oldSlide <= slideIndex) {
        // moving forward → view the next thumb if exists
        viewThumb = thumbs[Math.min(slideIndex + 1, thumbs.length - 1)];
    } else {
        // moving backward → view the previous thumb if exists
        viewThumb = thumbs[Math.max(slideIndex - 1, 0)];
    }

    scrollThumbIntoView(viewThumb);
}


function measureGifDuration(src, callback) {
    const img = document.createElement("img");
    img.src = src;

    img.onload = () => {
        try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;

            let frames = 0;
            let duration = 0;

            const gif = new Image();
            gif.src = src;

            callback(3000); // fallback: 3 seconds
        } catch (e) {
            callback(3000); // fallback
        }
    };

    img.onerror = () => callback(3000); // fallback
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


// Start autoslide (idempotent)
function startAutoSlide() {
    // If modal is open, don't start
    if (typeof modalOpen !== "undefined" && modalOpen) return;

    // already running -> do nothing
    if (autoSlideInterval) return;

    autoSlideInterval = setInterval(() => {
        if (!isHoveringCol1 && !modalOpen) {
            showNextSlide();
        }
    }, 4000);
}

// Stop autoslide (idempotent)
function stopAutoSlide() {
    if (!autoSlideInterval) return;
    clearInterval(autoSlideInterval);
    autoSlideInterval = null;
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

function preloadMedia(fileArray) {
    return Promise.all(
        fileArray.map(src => 
            new Promise(resolve => {

                // Skip preloading for videos
                if (isVideo(src)) {
                    resolve();
                    return;
                }

                // Image preload
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
    preloadMedia(p.images).then(() => {

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
                let thumb = null;

                // VIDEO
                if (isVideo(path)) {
                    const wrapper = document.createElement("div");
                    wrapper.className = "thumb video-thumb-wrapper";

                    const img = document.createElement("img");
                    img.className = "video-thumb-img";
                    img.src = "images/Default_VideoThumbnail.jpg"; // fallback image

                    const playIcon = document.createElement("div");
                    playIcon.className = "video-thumb-play";
                    playIcon.innerHTML = "▶";

                    wrapper.appendChild(img);
                    wrapper.appendChild(playIcon);

                    // Generate halfway thumbnail
                    createVideoFrameThumbnail(path)
                        .then(dataUrl => {
                            img.src = dataUrl;   // Replace fallback with actual thumbnail
                        })
                        .catch(() => {
                            img.src = "images/Default_VideoThumbnail.jpg"; // Keep fallback
                        });

                    thumb = wrapper;
                }


                // IMAGE / GIF / FALLBACK
                else {
                    thumb = document.createElement("img"); 
                    thumb.className = "thumb";
                    thumb.src = path;
                }

                // ❗ ALWAYS assigned
                thumb.dataset.full = path;

                // ❗ ALWAYS clickable
                thumb.onclick = () => setSlide(thumb, index);

                // add to strip
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


// create a thumbnail dataURL from a video file (tries to be lightweight)
function createVideoFrameThumbnail(url, timeoutMs = 2500) {
    return new Promise((resolve, reject) => {
        try {
            const video = document.createElement("video");
            video.preload = "metadata";
            video.muted = true;
            video.playsInline = true;
            video.crossOrigin = "anonymous"; 
            video.src = url;

            let settled = false;

            const cleanup = () => {
                video.pause();
                video.removeAttribute("src");
                video.load();
            };

            const fail = (err) => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(err || new Error("thumbnail-failed"));
            };

            const succeed = (dataUrl) => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve(dataUrl);
            };

            const timeout = setTimeout(() => fail("timeout"), timeoutMs);

            // We only need metadata to determine duration.
            video.addEventListener("loadedmetadata", () => {
                if (!video.duration || video.duration === Infinity) {
                    fail("no-duration");
                    return;
                }

                // Seek to halfway point
                const mid = video.duration / 2;

                const onSeeked = () => {
                    try {
                        const w = video.videoWidth || 320;
                        const h = video.videoHeight || 180;
                        const canvas = document.createElement("canvas");
                        canvas.width = w;
                        canvas.height = h;

                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(video, 0, 0, w, h);

                        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
                        clearTimeout(timeout);
                        video.removeEventListener("seeked", onSeeked);
                        succeed(dataUrl);
                    } catch (e) {
                        clearTimeout(timeout);
                        video.removeEventListener("seeked", onSeeked);
                        fail(e);
                    }
                };

                video.addEventListener("seeked", onSeeked, { once: true });

                // Trigger the seek
                try { 
                    video.currentTime = mid; 
                } catch (e) { 
                    fail(e); 
                }
            }, { once: true });

            video.addEventListener("error", () => fail("video-error"), { once: true });

        } catch (err) {
            reject(err);
        }
    });
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



// -------------------------------------------
// MODAL WINDOW
// -------------------------------------------

const modal = document.getElementById("slideModal");
const modalInner = document.getElementById("modalInner");
const modalClose = document.getElementById("modalClose");


modalClose.onclick = closeModal;
document.getElementById("modalNext").onclick = modalNext;
document.getElementById("modalPrev").onclick = modalPrev;


// Open modal with current slide
function openModalWithSlide(src) {
    pauseCurrentSlideVideo();

    stopAutoSlide();
    modalOpen = true;

    // Find which slide index this source belongs to
    const thumbs = Array.from(document.querySelectorAll(".thumb-strip .thumb"));
    modalIndex = thumbs.findIndex(t => t.dataset.full === src);

    modalInner.innerHTML = "";
    loadModalContent(src);

    modal.style.display = "flex";
}

function loadModalContent(src) {
    modalInner.innerHTML = "";

    if (isVideo(src)) {
        const vid = document.createElement("video");
        vid.src = src;
        vid.controls = true;
        vid.autoplay = true;
        
        vid.volume = userSetVolume;
        vid.muted = !userUnlockedAudio;

        vid.onvolumechange = () => {
            userUnlockedAudio = !vid.muted;
            userSetVolume = vid.volume;
        };

        modalInner.appendChild(vid);

    } else {
        const img = document.createElement("img");
        img.src = src;
        modalInner.appendChild(img);
    }
}

function pauseCurrentSlideVideo() {
    const displayArea = document.getElementById("mainSlideContainer");
    if (!displayArea) return;

    // find if a video is currently inside the slideshow display
    const vid = displayArea.querySelector("video");
    if (vid) {
        vid.pause();
    }
}

// Close modal
function closeModal() {
    modal.style.display = "none";
    modalOpen = false;
    modalInner.innerHTML = "";
    startAutoSlide();      // ✨ Resume autoslide
}

function modalNext() {
    const thumbs = Array.from(document.querySelectorAll(".thumb-strip .thumb"));
    modalIndex = (modalIndex + 1) % thumbs.length;
    loadModalContent(thumbs[modalIndex].dataset.full);
}

function modalPrev() {
    const thumbs = Array.from(document.querySelectorAll(".thumb-strip .thumb"));
    modalIndex = (modalIndex - 1 + thumbs.length) % thumbs.length;
    loadModalContent(thumbs[modalIndex].dataset.full);
}

// Close on button click
modalClose.onclick = closeModal;

// Close on clicking outside modal content
modal.onclick = (e) => {
    if (e.target === modal) closeModal();
};