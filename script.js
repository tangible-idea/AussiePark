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
const MINUTES_PER_SECOND = 100; // 10 in-game minutes per 0.1 seconds = 100 minutes per second

// Cloud system
let clouds = [];
const MAX_CLOUDS = 10;

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
    
    // Initialize clouds
    generateClouds();
    
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
    
    // Format time as HH:MM
    timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Update period display
    let currentPeriod = determineCurrentPeriod();
    periodDisplay.textContent = currentPeriod.name;
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
        const totalNightMinutes = PERIODS.NIGHT.endMinute + (MINUTES_PER_DAY - PERIODS.NIGHT.startMinute);
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
    
    // Center Y is positioned much higher to make sun/moon rise and set higher in the sky
    // Increased distance from horizon (was horizonY - celestialRadius - 10)
    const lowestPointY = horizonY - celestialRadius - canvas.height * 0.25; // Significantly higher from horizon
    const centerY = lowestPointY;
    
    // Calculate position on arc
    const x = centerX - arcRadius * Math.cos(angle);
    // For y position, use a semi-circle arc that stays high in the sky
    // Increased heightFactor (was 0.4) to make the arc taller
    const heightFactor = 0.6; // Controls the height of the arc - higher value makes taller arc
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

// Start the game
window.onload = init;
