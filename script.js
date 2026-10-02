// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Contact form (front-end only placeholder)
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('感谢您的咨询！我们会尽快与您联系。');
    contactForm.reset();
  });
}

// Navbar scrolled state
const navbar = document.getElementById('navbar');
const backToTop = document.getElementById('backToTop');
const progressBar = document.getElementById('progressBar');
const heroBgWrap = document.getElementById('heroBgWrap');
const parallaxImgs = document.querySelectorAll('.service-img, .gallery-item img, .singer-float img');

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Unified rAF-throttled scroll handler for smooth parallax & progress effects
let ticking = false;

function onScroll() {
  const scrollY = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;

  // Top progress bar
  progressBar.style.width = docHeight > 0 ? `${(scrollY / docHeight) * 100}%` : '0%';

  // Navbar & back-to-top state
  navbar.classList.toggle('scrolled', scrollY > 40);
  backToTop.classList.toggle('show', scrollY > 500);

  // Hero parallax (background drifts slower than scroll)
  if (heroBgWrap) {
    heroBgWrap.style.transform = `translateY(${scrollY * 0.35}px)`;
  }

  // Image parallax: pans background/object position as each image crosses the viewport
  const viewportCenter = window.innerHeight / 2;
  parallaxImgs.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return; // skip offscreen
    const elCenter = rect.top + rect.height / 2;
    const progress = Math.max(-1, Math.min(1, (elCenter - viewportCenter) / viewportCenter));
    const posY = 50 + progress * 25; // pans between ~25% and 75%
    if (el.tagName === 'IMG') {
      el.style.objectPosition = `center ${posY}%`;
    } else {
      el.style.backgroundPosition = `center ${posY}%`;
    }
  });

  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(onScroll);
    ticking = true;
  }
}, { passive: true });

onScroll(); // run once on load

// Scroll reveal animations
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealEls.forEach(el => revealObserver.observe(el));

// Count-up animation for stats
const statNums = document.querySelectorAll('.stat-num');
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10) || 0;
      const suffix = el.dataset.suffix || '';
      const duration = 1500;
      const start = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      statObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

statNums.forEach(el => statObserver.observe(el));

// Lightbox gallery
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxClose = document.getElementById('lightboxClose');

document.querySelectorAll('.gallery-item, .singer-card').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const img = item.querySelector('img');
    lightboxImg.src = img.src.replace(/w=\d+/, 'w=1400');
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = item.dataset.caption || img.alt;
    lightbox.classList.add('open');
  });
});

function closeLightbox() {
  lightbox.classList.remove('open');
  lightboxImg.src = '';
}

lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

