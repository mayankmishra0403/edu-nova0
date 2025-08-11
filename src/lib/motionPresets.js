// Motion presets for smooth animations and professional interactions
// Used throughout the app except EduAI chat which remains untouched

export const motionPresets = {
  // Smooth easing curves
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  },

  // Duration scales
  duration: {
    fast: 150,
    medium: 250,
    slow: 350,
    slower: 500
  },

  // Common transforms
  transforms: {
    slideUp: 'translateY(32px)',
    slideDown: 'translateY(-32px)',
    slideLeft: 'translateX(32px)',
    slideRight: 'translateX(-32px)',
    scaleUp: 'scale(1.05)',
    scaleDown: 'scale(0.95)',
    none: 'translateY(0) scale(1)'
  }
};

// Intersection Observer for reveal animations
export class ScrollReveal {
  constructor(options = {}) {
    this.options = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
      ...options
    };
    this.observer = null;
    this.init();
  }

  init() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        this.options
      );
      this.observeElements();
    } else {
      // Fallback: show all elements immediately
      this.revealAll();
    }
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        this.observer?.unobserve(entry.target);
      }
    });
  }

  observeElements() {
    const elements = document.querySelectorAll('.reveal:not(.is-visible)');
    elements.forEach(el => {
      this.observer?.observe(el);
    });
  }

  revealAll() {
    const elements = document.querySelectorAll('.reveal');
    elements.forEach(el => {
      el.classList.add('is-visible');
    });
  }

  refresh() {
    if (this.observer) {
      this.observer.disconnect();
      setTimeout(() => this.observeElements(), 100);
    }
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Ripple effect for buttons
export function createRipple(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  ripple.style.cssText = `
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple 600ms ease-out;
    left: ${x}px;
    top: ${y}px;
    width: ${size}px;
    height: ${size}px;
    pointer-events: none;
  `;

  // Ensure button has relative positioning
  if (getComputedStyle(button).position === 'static') {
    button.style.position = 'relative';
  }

  button.style.overflow = 'hidden';
  button.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
}

// Page transition manager
export class PageTransition {
  constructor() {
    this.isTransitioning = false;
    this.init();
  }

  init() {
    // Add CSS for page transitions if not already present
    if (!document.querySelector('#page-transition-styles')) {
      const style = document.createElement('style');
      style.id = 'page-transition-styles';
      style.textContent = `
        .page-enter {
          opacity: 0;
          transform: translateY(20px);
        }
        .page-enter-active {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 400ms cubic-bezier(0.4, 0, 0.2, 1), 
                      transform 400ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .page-exit {
          opacity: 1;
          transform: translateY(0);
        }
        .page-exit-active {
          opacity: 0;
          transform: translateY(-10px);
          transition: opacity 300ms cubic-bezier(0.4, 0, 1, 1),
                      transform 300ms cubic-bezier(0.4, 0, 1, 1);
        }
      `;
      document.head.appendChild(style);
    }
  }

  async transition(callback) {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    const main = document.querySelector('main');
    
    if (main) {
      main.classList.add('page-exit', 'page-exit-active');
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (callback) callback();
      
      main.classList.remove('page-exit', 'page-exit-active');
      main.classList.add('page-enter');
      
      requestAnimationFrame(() => {
        main.classList.add('page-enter-active');
      });
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      main.classList.remove('page-enter', 'page-enter-active');
    } else {
      if (callback) callback();
    }
    
    this.isTransitioning = false;
  }
}

// Smooth scroll utility
export function smoothScrollTo(target, duration = 800) {
  const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
  if (!targetElement) return;

  const targetPosition = targetElement.offsetTop;
  const startPosition = window.pageYOffset;
  const distance = targetPosition - startPosition;
  let startTime = null;

  function animation(currentTime) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const run = easeInOutQuart(timeElapsed, startPosition, distance, duration);
    window.scrollTo(0, run);
    if (timeElapsed < duration) requestAnimationFrame(animation);
  }

  function easeInOutQuart(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t * t * t + b;
    t -= 2;
    return -c / 2 * (t * t * t * t - 2) + b;
  }

  requestAnimationFrame(animation);
}

const motionUtils = {
  motionPresets,
  ScrollReveal,
  createRipple,
  PageTransition,
  smoothScrollTo
};

export default motionUtils;
