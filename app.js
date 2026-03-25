/* ===== Scroll Progress ===== */
const scrollProgress = document.getElementById('scrollProgress');
window.addEventListener('scroll', () => {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  const progress = (window.scrollY / total) * 100;
  scrollProgress.style.width = progress + '%';
}, { passive: true });

/* ===== Nav: scroll shadow + active link ===== */
const nav = document.getElementById('nav');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);

  // Active nav link on scroll
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
  });
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + current);
  });
}, { passive: true });

/* ===== Smooth Scroll ===== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
      // Close mobile menu
      hamburger.classList.remove('open');
      navLinksEl.classList.remove('open');
    }
  });
});

/* ===== Hamburger Menu ===== */
const hamburger = document.getElementById('hamburger');
const navLinksEl = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinksEl.classList.toggle('open');
});

// Close on outside click
document.addEventListener('click', (e) => {
  if (!nav.contains(e.target)) {
    hamburger.classList.remove('open');
    navLinksEl.classList.remove('open');
  }
});

/* ===== Hero Particles ===== */
function createParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  const count = 40;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    const x = Math.random() * 100;
    const duration = Math.random() * 15 + 10;
    const delay = Math.random() * 15;
    const opacity = Math.random() * 0.5 + 0.1;
    p.style.cssText = `
      left: ${x}%;
      width: ${size}px;
      height: ${size}px;
      animation-duration: ${duration}s;
      animation-delay: -${delay}s;
      opacity: ${opacity};
    `;
    container.appendChild(p);
  }
}
createParticles();

/* ===== AOS (Animate on Scroll) ===== */
function initAOS() {
  const elements = document.querySelectorAll('[data-aos]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.aosDelay || 0;
        setTimeout(() => {
          entry.target.classList.add('aos-animate');
        }, parseInt(delay));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(el => observer.observe(el));
}
initAOS();

/* ===== Stats: Count-up Animation ===== */
function animateCountUp(el) {
  const text = el.textContent;
  const suffix = el.dataset.suffix || '';
  const format = el.dataset.format || 'exact';

  // Extract base number from display text
  const match = text.match(/[\d,.]+/);
  if (!match) return;

  let targetDisplay = text; // keep as-is for already formatted
  el.dataset.final = text;

  const duration = 1800;
  const start = performance.now();

  // For "wan" format, extract numeric value
  let targetNum;
  if (format === 'wan') {
    const num = parseFloat(text.replace(/[^0-9.]/g, ''));
    targetNum = num;
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = (targetNum * ease).toFixed(1);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = targetDisplay;
    }
    requestAnimationFrame(step);
    return;
  }

  if (format === 'exact') {
    // Just reveal the final text
    const chars = text.split('');
    let i = 0;
    el.textContent = '';
    const interval = setInterval(() => {
      if (i < chars.length) {
        el.textContent += chars[i];
        i++;
      } else {
        clearInterval(interval);
      }
    }, duration / (chars.length * 4));
    setTimeout(() => { el.textContent = text; }, duration + 100);
    return;
  }
}

/* ===== Stats Intersection ===== */
function initStats() {
  const cards = document.querySelectorAll('.stat-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
        entry.target.classList.add('animated');
        const numEl = entry.target.querySelector('.stat-number');
        const barEl = entry.target.querySelector('.stat-bar-fill');
        if (numEl) animateCountUp(numEl);
        if (barEl) {
          const targetWidth = barEl.style.width;
          barEl.style.width = '0%';
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              barEl.style.width = targetWidth;
            });
          });
        }
      }
    });
  }, { threshold: 0.3 });
  cards.forEach(card => observer.observe(card));
}
initStats();

/* ===== Video Filter Tabs ===== */
const filterBtns = document.querySelectorAll('.filter-btn');
const videoCards = document.querySelectorAll('.video-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', function () {
    filterBtns.forEach(b => b.classList.remove('active'));
    this.classList.add('active');

    const filter = this.dataset.filter;
    videoCards.forEach((card, i) => {
      const show = filter === 'all' || card.dataset.category === filter;
      if (show) {
        card.classList.remove('hidden');
        card.style.animationDelay = (i * 60) + 'ms';
      } else {
        card.classList.add('hidden');
      }
    });
  });
});

/* ===== Contact Form ===== */
const form = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');
const formSuccess = document.getElementById('formSuccess');

if (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      // Shake invalid fields
      [form.name, form.email, form.message].forEach(field => {
        if (!field.value.trim()) {
          field.style.borderColor = '#ff4444';
          field.addEventListener('input', () => {
            field.style.borderColor = '';
          }, { once: true });
        }
      });
      return;
    }

    // Simulate submit
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
        <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="0">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur=".8s" repeatCount="indefinite"/>
        </circle>
      </svg>
      전송 중...
    `;

    setTimeout(() => {
      form.reset();
      submitBtn.style.display = 'none';
      formSuccess.style.display = 'flex';
      setTimeout(() => {
        submitBtn.style.display = '';
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          메시지 전송
        `;
        formSuccess.style.display = 'none';
      }, 4000);
    }, 1200);
  });
}

/* ===== Parallax Hero ===== */
const hero = document.getElementById('hero');
window.addEventListener('scroll', () => {
  if (!hero) return;
  const scrolled = window.scrollY;
  if (scrolled < window.innerHeight) {
    const heroContent = hero.querySelector('.hero-content');
    if (heroContent) {
      heroContent.style.transform = `translateY(${scrolled * 0.2}px)`;
      heroContent.style.opacity = 1 - scrolled / (window.innerHeight * 0.75);
    }
  }
}, { passive: true });

/* ===== Scroll to top on logo click ===== */
document.querySelector('.logo')?.addEventListener('click', (e) => {
  if (window.location.hash === '' || window.location.hash === '#') {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
