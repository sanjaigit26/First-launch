/* ==========================================
   Petverz Landing Page Interactive Logic
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  initStickyHeader();
  initMobileMenu();
  initStatsCounters();
  initTimelineProgress();
  initEarlyAccessForm();
  initTestimonialsCarousel();
  initFaqAccordion();
});

/* ==========================================
   Sticky Header
   ========================================== */
function initStickyHeader() {
  const header = document.getElementById('main-header');
  const scrollThreshold = 50;

  const handleScroll = () => {
    if (window.scrollY > scrollThreshold) {
      header.classList.add('sticky');
    } else {
      header.classList.remove('sticky');
    }
  };

  window.addEventListener('scroll', handleScroll);
  // Trigger once on page load to set correct state
  handleScroll();
}

/* ==========================================
   Mobile Navigation Drawer
   ========================================== */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const navLinks = mobileMenu.querySelectorAll('.mobile-nav-link');

  const toggleMenu = () => {
    toggleBtn.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
  };

  const closeMenu = () => {
    toggleBtn.classList.remove('active');
    mobileMenu.classList.remove('active');
    document.body.style.overflow = '';
  };

  toggleBtn.addEventListener('click', toggleMenu);

  navLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}

/* ==========================================
   Stats Count-Up Animation
   ========================================== */
function initStatsCounters() {
  const statNumbers = document.querySelectorAll('.stat-number');
  const animationDuration = 2000; // 2 seconds

  const countUp = (element) => {
    const target = parseInt(element.getAttribute('data-target'), 10);
    const suffix = target >= 10000 ? '+' : (target === 8 ? '+' : (target === 45 ? '+' : ''));
    let startTime = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / animationDuration, 1);
      const currentValue = Math.floor(progress * target);
      
      // Format number with commas if large
      if (currentValue >= 10000) {
        element.textContent = currentValue.toLocaleString() + suffix;
      } else {
        element.textContent = currentValue + suffix;
      }

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        if (target >= 10000) {
          element.textContent = target.toLocaleString() + suffix;
        } else {
          element.textContent = target + suffix;
        }
      }
    };

    window.requestAnimationFrame(step);
  };

  // Intersection Observer to trigger animation when visible
  const observerOptions = {
    root: null,
    threshold: 0.2
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        countUp(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  statNumbers.forEach(num => observer.observe(num));
}

/* ==========================================
   Timeline Scroll Progress & Step Activation
   ========================================== */
function initTimelineProgress() {
  const timeline = document.querySelector('.timeline');
  if (!timeline) return;

  const timelineItems = document.querySelectorAll('.timeline-item');
  const progressBar = document.getElementById('timeline-bar');

  const updateTimeline = () => {
    const timelineRect = timeline.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Calculate how far through the timeline section the user has scrolled
    const triggerPoint = viewportHeight * 0.7; // Start lighting up steps when they hit 70% of screen height
    const timelineStart = timelineRect.top;
    const timelineEnd = timelineRect.bottom;
    const timelineHeight = timelineRect.height;

    let scrolledLength = triggerPoint - timelineStart;
    let progressPercentage = Math.max(0, Math.min(100, (scrolledLength / timelineHeight) * 100));
    
    progressBar.style.height = `${progressPercentage}%`;

    timelineItems.forEach((item, index) => {
      const itemRect = item.getBoundingClientRect();
      if (itemRect.top < triggerPoint) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  };

  window.addEventListener('scroll', updateTimeline);
  updateTimeline(); // Run initial check
}

/* ==========================================
   Early Access Form & Confetti Animation
   ========================================== */
function initEarlyAccessForm() {
  const form = document.getElementById('early-access-form');
  if (!form) return;

  const formContainer = document.getElementById('form-container');
  const successContainer = document.getElementById('success-container');
  const submitBtn = document.getElementById('submit-btn');
  const resetBtn = document.getElementById('reset-form-btn');
  let confettiActive = false;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Disable button, show progress status
    submitBtn.disabled = true;
    const btnText = submitBtn.querySelector('span');
    const originalText = btnText.textContent;
    btnText.textContent = 'Registering Profile...';

    // Simulate API request delay
    setTimeout(() => {
      // Transition panels
      formContainer.classList.add('hide');
      successContainer.classList.remove('hide');
      
      // Start confetti
      triggerConfetti();

      // Restore button status for subsequent trials
      submitBtn.disabled = false;
      btnText.textContent = originalText;
      form.reset();
    }, 1500);
  });

  resetBtn.addEventListener('click', () => {
    successContainer.classList.add('hide');
    formContainer.classList.remove('hide');
    stopConfetti();
  });

  // --- Confetti Engine ---
  let canvas, ctx, animationFrameId;
  const particles = [];
  const colors = ['#FF7A59', '#6366F1', '#10B981', '#F59E0B', '#EC4899', '#3B82F6'];

  function triggerConfetti() {
    canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    resizeCanvas();
    
    window.addEventListener('resize', resizeCanvas);
    confettiActive = true;

    // Create initial explosion particles
    const particleCount = 120;
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }

    animateConfetti();
  }

  function resizeCanvas() {
    const rect = successContainer.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  function createParticle() {
    return {
      x: canvas.width / 2,
      y: canvas.height - 20,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: Math.random() * 12 + 6,
      angle: Math.random() * Math.PI - Math.PI, // upward spray (-180 to 0 degrees)
      gravity: 0.35,
      friction: 0.98,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 10 - 5,
      opacity: 1,
      decay: Math.random() * 0.015 + 0.01
    };
  }

  function animateConfetti() {
    if (!confettiActive) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // Update positions
      p.speed *= p.friction;
      p.x += Math.cos(p.angle) * p.speed;
      p.y += Math.sin(p.angle) * p.speed + p.gravity;
      p.rotation += p.rotationSpeed;
      p.opacity -= p.decay;

      // Draw particle (rotated square/rectangle)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();

      // Remove invisible particles
      if (p.opacity <= 0 || p.y > canvas.height || p.x < 0 || p.x > canvas.width) {
        particles.splice(i, 1);
      }
    }

    // Keep generating a few background particles if list falls low to make it look sustained
    if (particles.length < 30 && particles.length > 0) {
      particles.push(createParticle());
    }

    if (particles.length > 0) {
      animationFrameId = requestAnimationFrame(animateConfetti);
    } else {
      stopConfetti();
    }
  }

  function stopConfetti() {
    confettiActive = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    if (canvas) {
      window.removeEventListener('resize', resizeCanvas);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    particles.length = 0;
  }
}

/* ==========================================
   Testimonials Carousel
   ========================================== */
function initTestimonialsCarousel() {
  const carousel = document.getElementById('testimonials-carousel');
  if (!carousel) return;

  const slides = carousel.querySelectorAll('.testimonial-slide');
  const dots = document.querySelectorAll('#carousel-dots .dot');
  let currentIndex = 0;
  let autoplayTimer = null;
  const autoplayInterval = 5000; // 5 seconds

  const showSlide = (index) => {
    // Reset previous active elements
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    // Set new index
    currentIndex = (index + slides.length) % slides.length;
    
    // Shift carousel container horizontally
    carousel.style.transform = `translateX(-${currentIndex * 100}%)`;
    
    // Add classes after slide transition starts
    slides[currentIndex].classList.add('active');
    dots[currentIndex].classList.add('active');
  };

  const startAutoplay = () => {
    stopAutoplay();
    autoplayTimer = setInterval(() => {
      showSlide(currentIndex + 1);
    }, autoplayInterval);
  };

  const stopAutoplay = () => {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
    }
  };

  // Add click listeners to dots
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const slideIndex = parseInt(dot.getAttribute('data-slide'), 10);
      showSlide(slideIndex);
      startAutoplay(); // Reset timer on manual click
    });
  });

  // Pause autoplay when hovering over carousel
  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);

  // Initialize
  showSlide(0);
  startAutoplay();
}

/* ==========================================
   FAQ Accordions
   ========================================== */
function initFaqAccordion() {
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const faqItem = btn.parentElement;
      const answerPanel = faqItem.querySelector('.faq-answer');
      const isActive = faqItem.classList.contains('active');

      // Collapse all FAQ items first
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
        item.querySelector('.faq-answer').style.maxHeight = null;
      });

      // Toggle clicked item
      if (!isActive) {
        faqItem.classList.add('active');
        // Set max-height dynamically to trigger CSS transition
        answerPanel.style.maxHeight = answerPanel.scrollHeight + 'px';
      }
    });
  });
}
