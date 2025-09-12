let matrixLink = null;
let continuousGlowInterval;
let flickerInterval;
let letterSpacingInterval;

function applyBaseShadow(element) {
    element.style.textShadow = '0 0 8px rgba(224,0,0,.7),0 0 15px rgba(255,69,0,.4),0 0 25px rgba(255,99,71,.2)';
}

function startContinuousGlowPulse() {
    let isGlowState1 = true;
    continuousGlowInterval = setInterval(() => {
        if (matrixLink && !matrixLink.matches(':hover')) {
            if (isGlowState1) {
                matrixLink.style.textShadow = '0 0 10px rgba(224,0,0,.8),0 0 20px rgba(255,69,0,.6),0 0 30px rgba(255,99,71,.3)';
            } else {
                matrixLink.style.textShadow = '0 0 8px rgba(224,0,0,.7),0 0 15px rgba(255,69,0,.4),0 0 25px rgba(255,99,71,.2)';
            }
            isGlowState1 = !isGlowState1;
        }
    }, 800);
}

function startDigitalFlicker() {
    flickerInterval = setInterval(() => {
        if (matrixLink && !matrixLink.matches(':hover')) {
            if (Math.random() < 0.05) {
                matrixLink.style.color = `rgba(224,0,0,${0.4 + Math.random() * 0.4})`;
                matrixLink.style.textShadow = '0 0 5px rgba(255,50,50,.8),0 0 10px rgba(255,100,100,.5)';
                setTimeout(() => {
                    if (matrixLink && !matrixLink.matches(':hover')) {
                        matrixLink.style.color = '#E00000';
                        applyBaseShadow(matrixLink);
                    }
                }, 80);
            }
        }
    }, 120);
}

function startLetterSpacingPulse() {
    let isSpaced = false;
    letterSpacingInterval = setInterval(() => {
        if (matrixLink && !matrixLink.matches(':hover')) {
            matrixLink.style.letterSpacing = isSpaced ? '1px' : '1.8px';
            isSpaced = !isSpaced;
        }
    }, 1200);
}

function startMatrixAnimations() {
    if (continuousGlowInterval) clearInterval(continuousGlowInterval);
    if (flickerInterval) clearInterval(flickerInterval);
    if (letterSpacingInterval) clearInterval(letterSpacingInterval);
    applyBaseShadow(matrixLink);
    startContinuousGlowPulse();
    startDigitalFlicker();
    startLetterSpacingPulse();
}

function initializeMatrixLink() {
    matrixLink = document.getElementById('matrixLink');
    if (matrixLink) {
        startMatrixAnimations();

        matrixLink.addEventListener('mouseover', () => {
            if (continuousGlowInterval) clearInterval(continuousGlowInterval);
            if (flickerInterval) clearInterval(flickerInterval);
            if (letterSpacingInterval) clearInterval(letterSpacingInterval);

            let isHoverGlowState1 = true;
            this.hoverInterval = setInterval(() => {
                if (isHoverGlowState1) {
                    matrixLink.style.textShadow = '0 0 20px rgba(255,255,255,.8),0 0 35px rgba(255,80,80,.6),0 0 50px rgba(255,120,120,.4)';
                } else {
                    matrixLink.style.textShadow = '0 0 25px rgba(255,255,255,.9),0 0 40px rgba(255,100,100,.7),0 0 60px rgba(255,150,150,.5)';
                }
                isHoverGlowState1 = !isHoverGlowState1;
            }, 150);
        });

        matrixLink.addEventListener('mouseout', () => {
            if (this.hoverInterval) clearInterval(this.hoverInterval);
            startMatrixAnimations();
        });
    } else {
        setTimeout(initializeMatrixLink, 50);
    }
}

initializeMatrixLink();
