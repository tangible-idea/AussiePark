// Game canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Set canvas to full window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Time and day/night cycle variables
let gameMinutes = 360; // Start at 6:00 AM (6 hours * 60 minutes = 360 minutes from midnight)
let lastTimestamp = 0; // For smooth animation
let accumulatedTime = 0; // For time updates
const MINUTES_PER_DAY = 1440; // 24 hours * 60 minutes
const MINUTES_PER_SECOND = 20; // Time 5x slower: 20 minutes per second (was 100)
let gameDay = 0; // Track the current day (0 = Monday, 1 = Tuesday, etc.)

// Cloud system
let clouds = [];
const MAX_CLOUDS = 10;

// Star system
let stars = [];
const MAX_STARS = 100;
let starOpacity = 0; // For fading in stars

// Car and parking variables
const car = { x: 100, y: 0 }; // Car will be positioned at the left side of the screen
let isParking = false; // Flag to track if the car is currently parking (user is clicking)
let currentSign = null;
let timeUntilNextSign = 0;
let signX = 0; // Current X position of the sign

// Australian parking signs with time and day information
const AUSSIE_SIGNS = [
    { 
        type: 'P', 
        color: '#0055B8', 
        textColor: '#FFFFFF',
        timeRestriction: '9AM - 5:30PM',
        days: 'MON-FRI'
    },
    { 
        type: 'P', 
        color: '#0055B8', 
        textColor: '#FFFFFF',
        timeRestriction: '7AM - 8:30PM',
        days: 'MON-SAT'
    },
    { 
        type: '1P', 
        color: '#0055B8', 
        textColor: '#FFFFFF',
        timeRestriction: '9AM - 5:30PM',
        days: 'MON-FRI'
    },
    { 
        type: '1P', 
        color: '#0055B8', 
        textColor: '#FFFFFF',
        timeRestriction: '10AM - 4:30PM',
        days: 'SAT & SUN'
    },
    { 
        type: '2P', 
        color: '#0055B8', 
        textColor: '#FFFFFF',
        timeRestriction: '9AM - 5:30PM',
        days: 'MON-SAT'
    },
    { 
        type: '1/2P', 
        color: '#0055B8', 
        textColor: '#FFFFFF',
        timeRestriction: '10AM - 4:30PM',
        days: 'MON-SAT'
    },
    { 
        type: '4P', 
        color: '#0055B8', 
        textColor: '#FFFFFF',
        timeRestriction: '7AM - 8:30PM',
        days: 'SAT'
    },
    { 
        type: 'P METER', 
        color: '#0055B8', 
        textColor: '#FFFFFF',
        timeRestriction: '7AM - 9PM',
        days: 'MON-SAT'
    },
    { 
        type: 'NO PARKING', 
        color: '#FF0000', 
        textColor: '#FFFFFF',
        timeRestriction: '6AM - 9PM',
        days: 'MON-FRI'
    },
    { 
        type: 'NO STOPPING', 
        color: '#FF0000', 
        textColor: '#FFFFFF',
        timeRestriction: '7AM - 8:30PM',
        days: 'SUN'
    },
    { 
        type: 'TICKET', 
        color: '#00AA00', 
        textColor: '#FFFFFF',
        timeRestriction: '9AM - 5:30PM',
        days: 'MON-FRI'
    }
];

// Day periods configuration
const PERIODS = {
    MORNING: { 
        name: '아침', 
        startMinute: 360, 
        endMinute: 660, 
        skyColors: [
            ['#FF9E80', '#FFCC80', '#B3E5FC'], // Horizon to zenith (morning - orange to light blue)
            ['#82B1FF', '#90CAF9', '#E1F5FE']  // Transition colors
        ]
    },
    NOON: { 
        name: '낮', 
        startMinute: 660, 
        endMinute: 1020, 
        skyColors: [
            ['#BBDEFB', '#64B5F6', '#1976D2'], // Light blue to deeper blue
            ['#42A5F5', '#1E88E5', '#0D47A1']  // Deeper blue transition
        ]
    },
    SUNSET: { 
        name: '해질녘', 
        startMinute: 1020, 
        endMinute: 1200, 
        skyColors: [
            ['#FF9E80', '#FF5722', '#7B1FA2'], // Orange/red to purple
            ['#E65100', '#6A1B9A', '#4A148C']  // Deeper sunset colors
        ]
    },
    NIGHT: { 
        name: '밤', 
        startMinute: 1200, 
        endMinute: 360, 
        skyColors: [
            ['#3F51B5', '#303F9F', '#1A237E'], // Dark blue to very dark blue
            ['#283593', '#1A237E', '#0D0221']  // Very dark blue to almost black
        ]
    }
};

// Transition buffer (minutes) for smoother day/night transitions
const TRANSITION_BUFFER = 60; // Blend colors 60 minutes before/after period change

// Initialize the game
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Add event listeners for parking (mouse and touch)
    canvas.addEventListener('mousedown', () => { isParking = true; });
    canvas.addEventListener('mouseup', () => { isParking = false; });
    canvas.addEventListener('mouseleave', () => { isParking = false; });
    
    // Touch events for mobile devices
    canvas.addEventListener('touchstart', () => { isParking = true; });
    canvas.addEventListener('touchend', () => { isParking = false; });
    canvas.addEventListener('touchcancel', () => { isParking = false; });
    
    // Initialize clouds
    generateClouds();
    
    // Initialize stars
    generateStars();
    
    // Set car y position at horizon level
    car.y = canvas.height * 0.7 - 10; // Position wheels right at the ground level
    
    requestAnimationFrame(gameLoop);
}

// Generate initial set of clouds
function generateClouds() {
    clouds = [];
    const numClouds = 5 + Math.floor(Math.random() * 6); // 5 to 10 clouds
    
    for (let i = 0; i < numClouds; i++) {
        createCloud(Math.random() * canvas.width);
    }
}

// Generate stars for the night sky
function generateStars() {
    stars = [];
    
    for (let i = 0; i < MAX_STARS; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * (canvas.height * 0.7); // Only in the sky portion
        const size = 0.5 + Math.random() * 1.5; // Random size between 0.5 and 2
        const twinkleSpeed = 0.3 + Math.random() * 0.7; // Random twinkle speed
        const twinklePhase = Math.random() * Math.PI * 2; // Random starting phase
        
        stars.push({
            x,
            y,
            size,
            twinkleSpeed,
            twinklePhase,
            visible: Math.random() > 0.3 // Some stars start invisible for better effect
        });
    }
}

// Create a single cloud
function createCloud(x = null) {
    // If x is null, create cloud just off the left edge of the screen
    if (x === null) {
        x = -200;
    }
    
    // Random cloud properties
    const y = 50 + Math.random() * (canvas.height * 0.4);
    const width = 120 + Math.random() * 180; // Larger width for more impressive clouds
    const height = 50 + Math.random() * 40;
    const numSegments = 7 + Math.floor(Math.random() * 8); // More segments for fluffier clouds
    const speed = 5 + Math.random() * 10;
    const opacity = 0.7 + Math.random() * 0.3; // Vary the opacity
    
    // Create cloud segments (each cloud is made of multiple circles)
    const segments = [];
    
    // Main larger segment in the center
    segments.push({
        offsetX: width / 2,
        offsetY: height / 2,
        radius: 35 + Math.random() * 15
    });
    
    // Other segments distributed around to create a fluffy look
    for (let i = 0; i < numSegments; i++) {
        const angle = (i / numSegments) * Math.PI * 2;
        const dist = (width / 3) * (0.6 + Math.random() * 0.4);
        
        segments.push({
            offsetX: width / 2 + Math.cos(angle) * dist * (0.5 + Math.random() * 0.5),
            offsetY: height / 2 + Math.sin(angle) * (dist/2) * (0.5 + Math.random() * 0.5),
            radius: 20 + Math.random() * 25
        });
    }
    
    clouds.push({
        x, y, width, height, speed, segments, opacity
    });
}

// Update all clouds positions
function updateClouds(deltaTime) {
    // Only move clouds if not parking
    if (!isParking) {
        // Move each cloud
        clouds.forEach((cloud, index) => {
            cloud.x += cloud.speed * deltaTime;
            
            // If cloud is off the right edge of the screen, remove it and create a new one
            if (cloud.x > canvas.width + 200) {
                clouds.splice(index, 1);
                createCloud();
            }
        });
        
        // If we have fewer than MAX_CLOUDS, randomly add a new one
        if (clouds.length < MAX_CLOUDS && Math.random() < 0.01) {
            createCloud();
        }
    }
}

// Update sign positions with parallax scrolling
function updateSigns(deltaTime) {
    // Check if it's time to create a new sign
    if (!currentSign) {
        if (timeUntilNextSign <= 0) {
            // Create a new sign at the rightmost edge of the screen
            currentSign = AUSSIE_SIGNS[Math.floor(Math.random() * AUSSIE_SIGNS.length)];
            signX = canvas.width + 100; // Start off-screen to the right
            timeUntilNextSign = 7; // Set timer for next sign (7 seconds)
        } else {
            timeUntilNextSign -= deltaTime;
        }
    } else if (!isParking) { // Only move signs if not parking
        // Move existing sign from right to left
        signX -= 100 * deltaTime; // Speed: 100 pixels per second
        
        // If sign has moved off-screen to the left, remove it
        if (signX < -150) {
            currentSign = null;
        }
    }
}

// Update star appearance and twinkling effect
function updateStars(deltaTime) {
    const currentPeriod = determineCurrentPeriod();
    const isNight = currentPeriod === PERIODS.NIGHT;
    
    // Determine if we're in early night (for fading in stars)
    const isEarlyNight = isNight && 
        (gameMinutes >= PERIODS.NIGHT.startMinute && 
         gameMinutes < PERIODS.NIGHT.startMinute + 120); // First 2 hours of night
    
    // Gradually increase star opacity at night start
    if (isNight) {
        if (isEarlyNight) {
            // Calculate how far we are into early night (0 to 1)
            const minutesIntoNight = gameMinutes - PERIODS.NIGHT.startMinute;
            const earlyNightProgress = Math.min(minutesIntoNight / 120, 1);
            starOpacity = earlyNightProgress;
        } else {
            starOpacity = 1; // Full opacity for rest of night
        }
    } else {
        starOpacity = 0; // No stars during day
    }
    
    // Update stars twinkling
    stars.forEach(star => {
        // Only update visible stars
        if (!star.visible && Math.random() < 0.01) {
            star.visible = true; // Random chance to make invisible stars visible
        }
        
        // Update twinkle phase
        star.twinklePhase += star.twinkleSpeed * deltaTime;
        if (star.twinklePhase > Math.PI * 2) {
            star.twinklePhase -= Math.PI * 2;
        }
    });
}

// Draw all clouds
function drawClouds() {
    const currentPeriod = determineCurrentPeriod();
    const isSunset = currentPeriod === PERIODS.SUNSET;
    const isNight = currentPeriod === PERIODS.NIGHT;
    
    // Sort clouds by y position to create depth (clouds higher in sky render behind)
    const sortedClouds = [...clouds].sort((a, b) => a.y - b.y);
    
    sortedClouds.forEach(cloud => {
        // Determine cloud color based on time of day
        let cloudColor;
        if (isNight) {
            cloudColor = `rgba(40, 50, 80, ${cloud.opacity * 0.8})`; // Darker for night
        } else if (isSunset) {
            cloudColor = `rgba(255, 190, 170, ${cloud.opacity})`; // Pinkish for sunset
        } else {
            cloudColor = `rgba(255, 255, 255, ${cloud.opacity})`; // White for day
        }
        
        // Create a cloud shape by drawing overlapping circles
        ctx.save();
        
        // Draw cloud base (blend all segments together)
        const path = new Path2D();
        cloud.segments.forEach(segment => {
            path.arc(
                cloud.x + segment.offsetX, 
                cloud.y + segment.offsetY, 
                segment.radius, 
                0, 
                Math.PI * 2
            );
        });
        
        // Fill the entire cloud shape
        ctx.fillStyle = cloudColor;
        ctx.fill(path);
        
        // Add subtle highlight on top
        const highlightPath = new Path2D();
        cloud.segments.forEach(segment => {
            highlightPath.arc(
                cloud.x + segment.offsetX, 
                cloud.y + segment.offsetY - segment.radius * 0.3, // Offset upward for highlight
                segment.radius * 0.7, // Smaller highlight
                0, 
                Math.PI * 2
            );
        });
        
        // Fill with a subtle highlight
        if (isNight) {
            ctx.fillStyle = `rgba(60, 70, 100, ${cloud.opacity * 0.3})`;
        } else if (isSunset) {
            ctx.fillStyle = `rgba(255, 220, 200, ${cloud.opacity * 0.3})`;
        } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity * 0.4})`;
        }
        ctx.fill(highlightPath);
        
        ctx.restore();
    });
}

// Update game time - now called from gameLoop with deltaTime
function updateGameTime(deltaTime) {
    // Add time proportional to elapsed real time
    const minutesToAdd = MINUTES_PER_SECOND * deltaTime;
    gameMinutes += minutesToAdd;
    
    // Keep time within 24 hour cycle
    if (gameMinutes >= MINUTES_PER_DAY) {
        gameMinutes -= MINUTES_PER_DAY;
        gameDay = (gameDay + 1) % 7; // Increment day of the week
    }
    
    // Update time display - only do this when accumulated time reaches threshold
    accumulatedTime += deltaTime;
    if (accumulatedTime >= 0.1) { // Update display every 0.1 seconds
        updateTimeDisplay();
        accumulatedTime -= 0.1;
    }
}

// Update the time indicator
function updateTimeDisplay() {
    const hours = Math.floor(gameMinutes / 60);
    const minutes = Math.floor(gameMinutes % 60);
    
    const timeDisplay = document.getElementById('time-display');
    const periodDisplay = document.getElementById('period-display');
    const dayDisplay = document.getElementById('day-display');
    
    // Format time as HH:MM
    timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Update period display with AM/PM instead of Korean labels
    const isPM = (hours >= 12);
    periodDisplay.textContent = isPM ? 'PM' : 'AM';
    
    // Update day display
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    dayDisplay.textContent = daysOfWeek[gameDay];
}

// Determine current time period (morning, noon, sunset, night)
function determineCurrentPeriod() {
    if (PERIODS.NIGHT.startMinute <= gameMinutes || gameMinutes < PERIODS.MORNING.startMinute) {
        return PERIODS.NIGHT;
    } else if (PERIODS.MORNING.startMinute <= gameMinutes && gameMinutes < PERIODS.NOON.startMinute) {
        return PERIODS.MORNING;
    } else if (PERIODS.NOON.startMinute <= gameMinutes && gameMinutes < PERIODS.SUNSET.startMinute) {
        return PERIODS.NOON;
    } else {
        return PERIODS.SUNSET;
    }
}

// Get sky color based on current time with improved transitions
function getSkyColor() {
    // Determine the current primary period
    const currentPeriod = determineCurrentPeriod();
    
    // Find the period that comes next
    let nextPeriodName;
    if (currentPeriod === PERIODS.MORNING) nextPeriodName = 'NOON';
    else if (currentPeriod === PERIODS.NOON) nextPeriodName = 'SUNSET';
    else if (currentPeriod === PERIODS.SUNSET) nextPeriodName = 'NIGHT';
    else nextPeriodName = 'MORNING';
    
    const nextPeriod = PERIODS[nextPeriodName];
    
    // Calculate how far we are in the current period (0 to 1)
    let periodProgress;
    let transitionProgress = 0; // 0 means use current period colors, 1 means use next period colors
    
    if (currentPeriod === PERIODS.NIGHT) {
        // Special case for night which wraps around midnight
        const totalNightMinutes = MINUTES_PER_DAY - PERIODS.NIGHT.startMinute + PERIODS.NIGHT.endMinute;
        const minutesIntoNight = (gameMinutes >= PERIODS.NIGHT.startMinute) ? 
            gameMinutes - PERIODS.NIGHT.startMinute : 
            gameMinutes + (MINUTES_PER_DAY - PERIODS.NIGHT.startMinute);
            
        periodProgress = minutesIntoNight / totalNightMinutes;
        
        // Calculate transition to morning
        const minutesToNextPeriod = (PERIODS.NIGHT.endMinute - gameMinutes + MINUTES_PER_DAY) % MINUTES_PER_DAY;
        if (minutesToNextPeriod < TRANSITION_BUFFER) {
            transitionProgress = 1 - (minutesToNextPeriod / TRANSITION_BUFFER);
        }
    } else {
        const periodDuration = currentPeriod.endMinute - currentPeriod.startMinute;
        const minutesIntoPeriod = gameMinutes - currentPeriod.startMinute;
        periodProgress = minutesIntoPeriod / periodDuration;
        
        // Calculate transition to next period
        const minutesToNextPeriod = currentPeriod.endMinute - gameMinutes;
        if (minutesToNextPeriod < TRANSITION_BUFFER) {
            transitionProgress = 1 - (minutesToNextPeriod / TRANSITION_BUFFER);
        }
    }
    
    // Get the appropriate gradient colors for current period
    const startGradient = currentPeriod.skyColors[0];
    const endGradient = currentPeriod.skyColors[1];
    
    // Get the appropriate gradient colors for next period
    const nextStartGradient = nextPeriod.skyColors[0];
    const nextEndGradient = nextPeriod.skyColors[1];
    
    // Interpolate between gradients within the current period
    const currentBottom = interpolateColor(startGradient[0], endGradient[0], periodProgress);
    const currentMiddle = interpolateColor(startGradient[1], endGradient[1], periodProgress);
    const currentTop = interpolateColor(startGradient[2], endGradient[2], periodProgress);
    
    // Interpolate between gradients within the next period (using the start of next period)
    const nextBottom = nextStartGradient[0];
    const nextMiddle = nextStartGradient[1];
    const nextTop = nextStartGradient[2];
    
    // Apply easing to transition progress for smoother blending
    const easedTransition = easeInOutCubic(transitionProgress);
    
    // Final blended colors between current and next period
    return {
        bottom: interpolateColor(currentBottom, nextBottom, easedTransition),
        middle: interpolateColor(currentMiddle, nextMiddle, easedTransition),
        top: interpolateColor(currentTop, nextTop, easedTransition)
    };
}

// Interpolate between two hex colors
function interpolateColor(color1, color2, factor) {
    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    }
    
    function rgbToHex(r, g, b) {
        return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
    }
    
    const [r1, g1, b1] = hexToRgb(color1);
    const [r2, g2, b2] = hexToRgb(color2);
    
    const r = r1 + factor * (r2 - r1);
    const g = g1 + factor * (g2 - g1);
    const b = b1 + factor * (b2 - b1);
    
    return rgbToHex(r, g, b);
}

// Easing function for smoother transitions
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Main game loop
function gameLoop(timestamp) {
    // Calculate delta time in seconds
    if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
    }
    const deltaTime = (timestamp - lastTimestamp) / 1000; // Convert to seconds
    lastTimestamp = timestamp;
    
    // Update game time based on elapsed real time
    updateGameTime(deltaTime);
    
    // Update clouds
    updateClouds(deltaTime);
    
    // Update signs
    updateSigns(deltaTime);
    
    // Update stars
    updateStars(deltaTime);
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw sky background based on time of day
    const skyColors = getSkyColor();
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.7);
    skyGradient.addColorStop(0, skyColors.top);     // Top of sky
    skyGradient.addColorStop(0.5, skyColors.middle); // Middle of sky
    skyGradient.addColorStop(1, skyColors.bottom);  // Horizon
    
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.7);
    
    // Draw ground with a subtle gradient
    const groundGradient = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height);
    groundGradient.addColorStop(0, '#2E7D32');  // Darker green at top of ground
    groundGradient.addColorStop(1, '#43A047');  // Lighter green at bottom
    
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
    
    // Draw sun or moon
    drawCelestialBody();
    
    // Draw clouds
    drawClouds();
    
    // Draw stars
    drawStars();
    
    // Draw signs
    drawSigns();
    
    // Draw car
    drawCar();
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Draw sun or moon based on time of day
function drawCelestialBody() {
    const currentPeriod = determineCurrentPeriod();
    const isSun = currentPeriod !== PERIODS.NIGHT;
    
    // Calculate position along an arc from left to right
    let progress;
    if (isSun) {
        // For sun, calculate position across daylight hours (morning through sunset)
        const dayMinutes = PERIODS.SUNSET.endMinute - PERIODS.MORNING.startMinute;
        progress = (gameMinutes - PERIODS.MORNING.startMinute) / dayMinutes;
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;
    } else {
        // For moon, calculate position across night hours
        const nightDuration = PERIODS.MORNING.startMinute + (MINUTES_PER_DAY - PERIODS.NIGHT.startMinute);
        const minutesIntoNight = (gameMinutes >= PERIODS.NIGHT.startMinute) ? 
            gameMinutes - PERIODS.NIGHT.startMinute : 
            gameMinutes + (MINUTES_PER_DAY - PERIODS.NIGHT.startMinute);
            
        progress = minutesIntoNight / nightDuration;
    }
    
    // Arc parameters - modified to ensure sun/moon appears higher in the sky
    const horizonY = canvas.height * 0.7; // Horizon Y position
    
    // Calculate position on semi-circle arc
    // Map progress (0-1) to angle (0-180 degrees in radians)
    const angle = Math.PI * progress;
    
    // For sun/moon radius
    const celestialRadius = 40;
    
    // Calculate center position for the arc
    const arcRadius = canvas.width * 0.5; // Use half the canvas width as radius
    const centerX = canvas.width * 0.5; // Center X is middle of canvas
    
    // Adjust the height to keep the sun/moon within the visible area
    // Reduce the distance from horizon to prevent going off-screen
    const lowestPointY = horizonY - celestialRadius - canvas.height * 0.15; // Reduced from 0.25 to 0.15
    const centerY = lowestPointY;
    
    // Calculate position on arc
    const x = centerX - arcRadius * Math.cos(angle);
    // Reduce the height factor to create a flatter arc
    const heightFactor = 0.4; // Reduced from 0.6 to 0.4
    const y = centerY - Math.sin(angle) * horizonY * heightFactor;
    
    // Draw sun or moon
    ctx.beginPath();
    ctx.arc(x, y, celestialRadius, 0, Math.PI * 2);
    
    if (isSun) {
        // Draw sun
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, celestialRadius);
        gradient.addColorStop(0, '#FFFF00');
        gradient.addColorStop(1, '#FFA500');
        ctx.fillStyle = gradient;
    } else {
        // Draw moon
        ctx.fillStyle = '#F5F5F5';
    }
    
    ctx.fill();
    
    // Add simple glow effect for sun
    if (isSun) {
        ctx.beginPath();
        ctx.arc(x, y, celestialRadius * 1.3, 0, Math.PI * 2);
        const glowGradient = ctx.createRadialGradient(x, y, celestialRadius, x, y, celestialRadius * 1.3);
        glowGradient.addColorStop(0, 'rgba(255, 255, 0, 0.4)');
        glowGradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fill();
    }
}

// Draw stars
function drawStars() {
    if (starOpacity <= 0) return; // Skip if stars aren't visible at all
    
    ctx.save();
    stars.forEach(star => {
        if (star.visible) {
            // Calculate individual star twinkle effect (0.3 to 1.0 range)
            const twinkleFactor = 0.3 + (Math.sin(star.twinklePhase) + 1) * 0.35;
            
            // Apply global opacity fade-in and individual twinkle
            const finalOpacity = starOpacity * twinkleFactor;
            
            // Draw the star with its unique opacity
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`;
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    ctx.restore();
}

// Draw signs
function drawSigns() {
    if (currentSign) {
        ctx.save();
        
        // Draw pole
        const poleWidth = 10;
        const poleHeight = 200;
        const poleX = signX;
        const poleY = canvas.height * 0.7; // Align with ground level
        const signSize = 120;
        const signY = poleY - poleHeight - signSize/2;
        
        // Draw pole
        ctx.fillStyle = '#555555';
        ctx.fillRect(poleX - poleWidth/2, poleY - poleHeight, poleWidth, poleHeight);
        
        // Draw sign backing based on sign type
        const isRectangular = ['P', '1P', '2P', '1/2P', '4P'].includes(currentSign.type);
        
        if (isRectangular) {
            // Draw rectangular background for P-type signs (more like the reference)
            const width = signSize * 0.8;
            const height = signSize * 1.4;
            
            // Black border
            ctx.fillStyle = '#000000';
            ctx.fillRect(signX - width/2 - 3, signY - height/2 - 3, width + 6, height + 6);
            
            // Main background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(signX - width/2, signY - height/2, width, height);
            
            // Draw main text (P, 1P, 2P etc.)
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = '#006400'; // Dark green like in the reference image
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(currentSign.type, signX, signY - height/2 + 15);
            
            // Draw time restriction
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#006400'; // Dark green
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Split the time restriction for better formatting
            const timeText = currentSign.timeRestriction.split(' - ');
            if (timeText.length === 2) {
                ctx.fillText(timeText[0], signX - 20, signY + 20);
                ctx.fillText('-', signX, signY + 20);
                ctx.fillText(timeText[1], signX + 20, signY + 40);
            } else {
                ctx.fillText(currentSign.timeRestriction, signX, signY + 30);
            }
            
            // Draw days
            ctx.font = 'bold 18px Arial';
            ctx.fillText(currentSign.days, signX, signY + 70);
            
            // Draw arrow pointing left like in the reference
            ctx.beginPath();
            ctx.fillStyle = '#006400';
            const arrowY = signY + 110;
            const arrowWidth = 40;
            ctx.moveTo(signX - arrowWidth/2, arrowY);
            ctx.lineTo(signX + arrowWidth/2, arrowY);
            ctx.lineTo(signX + arrowWidth/2, arrowY - 10);
            ctx.lineTo(signX + arrowWidth/2 + 15, arrowY + 5);
            ctx.lineTo(signX + arrowWidth/2, arrowY + 20);
            ctx.lineTo(signX + arrowWidth/2, arrowY + 10);
            ctx.lineTo(signX - arrowWidth/2, arrowY + 10);
            ctx.closePath();
            ctx.fill();
        } else if (currentSign.type === 'P METER') {
            // Draw meter sign with square format like 3rd panel in reference
            const size = signSize * 1.4;
            
            // Black border
            ctx.fillStyle = '#000000';
            ctx.fillRect(signX - size/2 - 3, signY - size/2 - 3, size + 6, size + 6);
            
            // White background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(signX - size/2, signY - size/2, size, size);
            
            // Draw divider lines to create sections
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(signX - size/2, signY);
            ctx.lineTo(signX + size/2, signY);
            ctx.stroke();
            
            // P METER text
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = '#006400'; // Dark green
            ctx.textAlign = 'center';
            ctx.fillText('P', signX, signY - size/4 - 10);
            ctx.font = 'bold 16px Arial';
            ctx.fillText('METER', signX, signY - size/4 + 15);
            
            // Time restriction
            ctx.font = 'bold 14px Arial';
            const timeText = currentSign.timeRestriction.split(' - ');
            if (timeText.length === 2) {
                ctx.fillText(timeText[0], signX - 15, signY + size/4 - 15);
                ctx.fillText('-', signX, signY + size/4 - 15);
                ctx.fillText(timeText[1], signX + 15, signY + size/4 - 15);
            }
            
            // Days
            ctx.font = 'bold 14px Arial';
            ctx.fillText(currentSign.days, signX, signY + size/4 + 10);
            
            // Arrow
            ctx.beginPath();
            ctx.fillStyle = '#006400';
            const arrowY = signY + size/4 - 40;
            const arrowWidth = 30;
            ctx.moveTo(signX - arrowWidth/2, arrowY);
            ctx.lineTo(signX - arrowWidth/2 - 15, arrowY + 5);
            ctx.lineTo(signX - arrowWidth/2, arrowY + 10);
            ctx.closePath();
            ctx.fill();
        } else {
            // Draw circular/square sign for prohibitory signs (NO PARKING, NO STOPPING)
            const radius = signSize / 2;
            
            // Draw black border
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(signX, signY, radius + 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw main circle background
            ctx.fillStyle = currentSign.color;
            ctx.beginPath();
            ctx.arc(signX, signY, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw main text
            if (currentSign.type === 'NO PARKING' || currentSign.type === 'NO STOPPING') {
                // Draw crossed circle for prohibition
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.arc(signX, signY, radius * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                
                // Draw diagonal line
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(signX - radius * 0.5, signY - radius * 0.5);
                ctx.lineTo(signX + radius * 0.5, signY + radius * 0.5);
                ctx.stroke();
                
                // Draw text below the sign
                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                
                // Split the text into two lines if it's 'NO PARKING' or 'NO STOPPING'
                const words = currentSign.type.split(' ');
                ctx.fillText(words[0], signX, signY + radius + 10);
                ctx.fillText(words[1], signX, signY + radius + 30);
                
                // Time and days smaller below
                ctx.font = '12px Arial';
                ctx.fillText(currentSign.timeRestriction, signX, signY + radius + 55);
                ctx.fillText(currentSign.days, signX, signY + radius + 70);
            } else {
                // For TICKET and other signs
                ctx.font = 'bold 20px Arial';
                ctx.fillStyle = currentSign.textColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(currentSign.type, signX, signY);
                
                // Time and days
                ctx.font = '14px Arial';
                ctx.fillText(currentSign.timeRestriction, signX, signY + radius + 15);
                ctx.fillText(currentSign.days, signX, signY + radius + 35);
            }
        }
        
        ctx.restore();
    }
}

// Draw car
function drawCar() {
    ctx.save();
    
    // Calculate car's position (fixed on left side)
    const x = car.x;
    const y = car.y;
    
    // Draw car body
    ctx.fillStyle = '#D32F2F'; // Red color
    ctx.fillRect(x - 50, y - 40, 100, 30); // Main body
    ctx.fillRect(x - 30, y - 60, 60, 20); // Top part
    
    // Draw windows
    ctx.fillStyle = '#90CAF9'; // Light blue
    ctx.fillRect(x - 25, y - 58, 50, 15); // Windshield and rear window
    
    // Draw wheels
    ctx.fillStyle = '#212121'; // Dark gray/black
    ctx.beginPath();
    ctx.arc(x - 30, y, 10, 0, Math.PI * 2); // Left wheel
    ctx.arc(x + 30, y, 10, 0, Math.PI * 2); // Right wheel
    ctx.fill();
    
    // Draw wheel rims
    ctx.fillStyle = '#BDBDBD'; // Light gray
    ctx.beginPath();
    ctx.arc(x - 30, y, 4, 0, Math.PI * 2); // Left wheel rim
    ctx.arc(x + 30, y, 4, 0, Math.PI * 2); // Right wheel rim
    ctx.fill();
    
    // Draw headlights
    ctx.fillStyle = '#FFEB3B'; // Yellow
    ctx.fillRect(x + 45, y - 30, 5, 5); // Right headlight
    
    // Draw taillights
    ctx.fillStyle = '#F44336'; // Red
    ctx.fillRect(x - 50, y - 30, 5, 5); // Left taillight
    
    ctx.restore();
}

// Start the game
window.onload = init;
