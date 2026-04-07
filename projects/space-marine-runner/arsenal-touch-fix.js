// Mobile Arsenal Touch Enhancement Script
// Add this to the bottom of your index.html before </body>

(function() {
    // Only run on mobile
    if (window.innerWidth > 767) return;
    
    const weaponList = document.querySelector('.weapon-list');
    if (!weaponList) return;
    
    // Enable smooth touch scrolling
    let isScrolling = false;
    let startY = 0;
    let scrollTop = 0;
    
    weaponList.addEventListener('touchstart', function(e) {
        isScrolling = true;
        startY = e.touches[0].pageY;
        scrollTop = this.scrollTop;
    }, { passive: true });
    
    weaponList.addEventListener('touchmove', function(e) {
        if (!isScrolling) return;
        const y = e.touches[0].pageY;
        const walk = (startY - y);
        this.scrollTop = scrollTop + walk;
    }, { passive: true });
    
    weaponList.addEventListener('touchend', function() {
        isScrolling = false;
    }, { passive: true });
    
    // Ensure proper scroll container
    weaponList.style.overflowY = 'scroll';
    weaponList.style.WebkitOverflowScrolling = 'touch';
    
    // Debug: log scroll events
    console.log('Mobile Arsenal touch enhancements loaded');
})();
