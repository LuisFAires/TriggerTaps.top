/*
This file is responsible for everything that happens out side of canvas tag

Every time that the canvas is moved the X and Y cordinates must be refreshed by calling setCanvasBoundings()
*/

loadingOverlay.innerText = lang.loading
rotateOverlay.innerText = lang.rotate

const gameArea = document.querySelector("canvas")
const upper = document.getElementById("upper")
const left = document.getElementById("left")
const center = document.getElementById("center")
const right = document.getElementById("right")
const promotion = document.getElementById("promotion")

let afterResizeTimeout
let lastWidth
let lastHeigth
let lastPrompt = 0
let lastAdUpdate = 0
let deferredPrompt

let showPromotion

const touchDevice = navigator.maxTouchPoints > 0 ? true : false

let deviceOS
if (/iPad|iPhone|iPod/.test(window.navigator.userAgent)) {
    deviceOS = "IOS"
} else if (/Macintosh|Mac|Mac OS|MacIntel|MacPPC|Mac68K/gi.test(window.navigator.userAgent)) {
    deviceOS = "Mac"
} else if (/Win32|Win64|Windows|Windows NT|WinCE/gi.test(window.navigator.userAgent)) {
    deviceOS = "Win"
} else if (/Android/gi.test(window.navigator.userAgent)) {
    deviceOS = "Android"
} else if (/Linux/gi.test(window.navigator.userAgent)) {
    deviceOS = "Linux"
}

function showRotateOverlay() {
    rotateOverlay.style.display = (window.innerWidth > window.innerHeight || !touchDevice) ? "none" : "flex"
}

function promotionAction(os, url) {
    if (deviceOS == os && deferredPrompt != undefined) {
        try {
            installPrompt()
        } catch {
            location.href = url
        }
        return
    }
    location.href = url
}

function fullscreenLock() {
    if (!touchDevice) return
    if (document.fullscreenElement === null) {
        setTimeout(async () => {
            try {
                await document.documentElement.requestFullscreen()
                try {
                    await screen.orientation.lock("landscape")
                } catch {
                    console.log("unable to get orientation locked")
                }
            } catch {
                //console.log("unable to get fullscreen")
            }

        }, 200);
    }
    waitForUserInteraction(document, ["touchstart", "mousedown"], fullscreenLock, true)
}

async function installPrompt() {
    deferredPrompt.prompt()
    lastPrompt = new Date()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome == "accepted") {
        //
    } else {
        //
    }
    return outcome === "accepted"
}

function waitForUserInteraction(element, interactions, callback = undefined, keyboard = false) {
    return new Promise((resolve) => {
        function triggeredEvent() {
            for (interaction of interactions) {
                element.removeEventListener(interaction, triggeredEvent)
            }
            if (keyboard) document.removeEventListener("keydown", triggeredEvent)
            if (callback) callback()
            resolve()
        }
        for (interaction of interactions) {
            element.addEventListener(interaction, triggeredEvent)
        }
        if (keyboard) document.addEventListener("keydown", triggeredEvent)
    })
}

function calculateDivs() {
    //set external divs size
    if (loadingOverlay.style.display != "none") return
    if (rotateOverlay.style.display != "none") return
    if (lastHeigth === window.innerHeight && lastWidth === window.innerWidth) return
    if (touchDevice && document.fullscreenElement === null) return

    left.style.width = right.style.width = (window.innerWidth - center.clientWidth) / 2 + "px"

    promotion.style.display = (window.innerHeight >= gameArea.height + 50 && showPromotion) ? "flex" : "none"

    //Bottom row divs must have zero height so the upper div height can be evaluated without intervention when screen is downsized
    left.style.height = center.style.height = right.style.height = 0

    if (window.innerHeight >= (showPromotion ? 350 : 300)) {
        upper.style.height = (window.innerHeight - (showPromotion ? 300 : 250)) + "px"
    } else {
        upper.style.height = 0
    }

    left.style.height = center.style.height = right.style.height = window.innerHeight - upper.clientHeight + "px"

    lastWidth = window.innerWidth
    lastHeigth = window.innerHeight


    insertAds()

    setCanvasBoundings()
}

function insertAds() {
    lastAdUpdate = new Date()
    let containers = document.getElementsByClassName("adContainer")
    for (container of containers) {
        let containerWidth = container.clientWidth
        let containerHeight = container.clientHeight
        container.innerHTML = containerWidth >= 135 && containerHeight >= 50 ? adString(containerHeight) : ""
        container.innerHTML
    }

    function adString(adHeight = 50) {
        console.log("Ad placed")
        //setTimeout(()=>{(adsbygoogle = window.adsbygoogle || []).push({});},100)
        return `<div style="height:100%; width:100%; background-color: #0003;">Ads will be placed here</div>`
        return ` <ins class="adsbygoogle" style="display:block; height: ${adHeight}px;" data-ad-client="ca-pub-4327628330003063" data-ad-slot="1070652247" data-full-width-responsive="true" data-adtest="on"></ins>`
    }
}

function updateAds() {
    if (new Date() - lastAdUpdate > 60000 && currentScreen.name == "menu") {
        insertAds()
    }
    waitForUserInteraction(gameArea, ["mousedown", "touchstart"], updateAds, true)
}

window.addEventListener("load", () => {
    let loadingInterval = setInterval(async () => {
        if (gameAssetsLoaded) {
            clearInterval(loadingInterval)
            document.querySelector("#loadingOverlay").innerHTML = lang.ready
            await waitForUserInteraction(loadingOverlay, ["click"], undefined, true)
            loadingOverlay.style.display = "none"
            screen.orientation.addEventListener("change", showRotateOverlay)
            window.addEventListener("resize", showRotateOverlay)
            showRotateOverlay()
            fullscreenLock()
            initializeGame()
            setTimeout(async () => {
                showPromotion = window.matchMedia("(display-mode: standalone)").matches ? false : true
                await calculateDivs()
                updateAds()
            }, 500)
            window.addEventListener("resize", () => {
                clearTimeout(afterResizeTimeout)
                afterResizeTimeout = setTimeout(calculateDivs, 500)
            })
        }
    })
})

if ("serviceWorker" in navigator) {
    window.addEventListener("beforeinstallprompt", (ev) => {
        ev.preventDefault()
        deferredPrompt = ev
        waitForUserInteraction(gameArea, ["touchstart", "mousedown"], endScreenInstallPrompt)
    })

    function endScreenInstallPrompt() {
        setTimeout(async () => {
            let installed
            if (
                currentScreen.name == "end" &&
                ((mode == "single" && players.second.status == "dead" && currentLevel > 1) || mode == "multi") &&
                new Date() - lastPrompt > 60000
            ) {
                installed = await installPrompt()
            }
            if (!installed) {
                waitForUserInteraction(gameArea, ["touchstart", "mousedown"], endScreenInstallPrompt, true)
            }
        }, 500)
    }

    window.addEventListener("appinstalled", () => {
        window.removeEventListener("beforeinstallprompt", definePrompt)
        deferredPrompt = null
    })
    navigator.serviceWorker.register("./serviceworker.js")
}

