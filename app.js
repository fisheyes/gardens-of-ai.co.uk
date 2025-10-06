// DOM elements
const contactForm = document.getElementById('contactForm');
const successModal = document.getElementById('successModal');
const ctaButton = document.querySelector('.cta-button');

// Smooth scroll to contact section
function scrollToContact() {
    const contactSection = document.getElementById('contact');
    contactSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// Form validation
function validateForm(formData) {
    const errors = [];
    
    // Required field validation
    if (!formData.get('name').trim()) {
        errors.push('Name is required');
    }
    
    if (!formData.get('company').trim()) {
        errors.push('Company is required');
    }
    
    if (!formData.get('email').trim()) {
        errors.push('Email is required');
    } else if (!isValidEmail(formData.get('email'))) {
        errors.push('Please enter a valid email address');
    }
    
    if (!formData.get('message').trim()) {
        errors.push('Message is required');
    }
    
    return errors;
}

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show validation errors
function showFormErrors(errors) {
    // Remove existing error messages
    const existingErrors = document.querySelectorAll('.form-error');
    existingErrors.forEach(error => error.remove());
    
    if (errors.length > 0) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'form-error';
        errorContainer.style.cssText = `
            background: rgba(192, 21, 47, 0.1);
            color: var(--color-error);
            padding: var(--space-12);
            border-radius: var(--radius-base);
            margin-bottom: var(--space-16);
            border: 1px solid rgba(192, 21, 47, 0.2);
        `;
        
        const errorList = document.createElement('ul');
        errorList.style.cssText = 'margin: 0; padding-left: var(--space-16);';
        
        errors.forEach(error => {
            const errorItem = document.createElement('li');
            errorItem.textContent = error;
            errorList.appendChild(errorItem);
        });
        
        errorContainer.appendChild(errorList);
        contactForm.insertBefore(errorContainer, contactForm.firstChild);
        
        // Scroll to form to show errors
        errorContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }
}

// Handle form submission
function handleFormSubmission(event) {
    event.preventDefault();
    
    const formData = new FormData(contactForm);
    const errors = validateForm(formData);
    
    if (errors.length > 0) {
        showFormErrors(errors);
        return;
    }
    
    // Remove any existing errors
    showFormErrors([]);
    
    // Show loading state
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Sending...';
    submitButton.disabled = true;
    
    // Simulate form submission (in a real application, this would make an API call)
    setTimeout(() => {
        // Reset form
        contactForm.reset();
        
        // Reset button
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        
        // Show success modal
        showModal();
        
        // Track form submission (analytics would go here)
        trackFormSubmission(formData);
    }, 1500);
}

// Show success modal
function showModal() {
    successModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Focus trap for accessibility
    const focusableElements = successModal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
        focusableElements[0].focus();
    }
}

// Close modal
function closeModal() {
    successModal.classList.add('hidden');
    document.body.style.overflow = '';
    
    // Return focus to the submit button
    const submitButton = contactForm.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.focus();
    }
}

// Track form submission for analytics
function trackFormSubmission(formData) {
    // In a real application, you would send this data to your analytics service
    console.log('Form submitted:', {
        name: formData.get('name'),
        company: formData.get('company'),
        email: formData.get('email'),
        phone: formData.get('phone') || 'Not provided',
        message: formData.get('message'),
        timestamp: new Date().toISOString(),
        domain: 'garden-of-ai.co.uk'
    });
}

// Intersection Observer for animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for scroll animations
    const animatedElements = document.querySelectorAll(
        '.value-card, .buyer-card, .highlight-item, .market-visual'
    );
    
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(element);
    });
}

// Chart animation
function animateChartBars() {
    const chartBars = document.querySelectorAll('.chart-bar');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bar = entry.target;
                const height = bar.getAttribute('data-height');
                
                // Reset height
                bar.style.height = '0';
                
                // Animate to target height
                setTimeout(() => {
                    bar.style.height = height + '%';
                }, 100);
                
                observer.unobserve(bar);
            }
        });
    }, { threshold: 0.5 });
    
    chartBars.forEach(bar => {
        observer.observe(bar);
    });
}

// Keyboard navigation for modal
function handleModalKeyNavigation(event) {
    if (!successModal.classList.contains('hidden')) {
        if (event.key === 'Escape') {
            closeModal();
        }
        
        // Tab trap
        if (event.key === 'Tab') {
            const focusableElements = successModal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (event.shiftKey) {
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        }
    }
}

// Form input enhancements
function enhanceFormInputs() {
    const inputs = contactForm.querySelectorAll('.form-control');
    
    inputs.forEach(input => {
        // Add floating label effect
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
            if (!input.value) {
                input.parentElement.classList.remove('focused');
            }
        });
        
        // Real-time validation feedback
        input.addEventListener('input', () => {
            const errorMessages = document.querySelectorAll('.form-error');
            if (errorMessages.length > 0) {
                // Clear errors when user starts typing
                setTimeout(() => {
                    errorMessages.forEach(error => error.remove());
                }, 100);
            }
        });
    });
}

// Smooth reveal animation for hero stats
function animateHeroStats() {
    const statItems = document.querySelectorAll('.stat-item');
    
    statItems.forEach((stat, index) => {
        stat.style.opacity = '0';
        stat.style.transform = 'translateY(20px)';
        stat.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        setTimeout(() => {
            stat.style.opacity = '1';
            stat.style.transform = 'translateY(0)';
        }, 500 + (index * 200));
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Event listeners
    contactForm.addEventListener('submit', handleFormSubmission);
    document.addEventListener('keydown', handleModalKeyNavigation);
    
    // Initialize features
    initScrollAnimations();
    animateChartBars();
    enhanceFormInputs();
    animateHeroStats();
    
    // Add click outside to close modal
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    });
});

// Export functions for use in HTML
window.scrollToContact = scrollToContact;
window.closeModal = closeModal;

// Add some performance monitoring
window.addEventListener('load', () => {
    // Performance tracking
    const loadTime = performance.now();
    console.log(`Page loaded in ${Math.round(loadTime)}ms`);
    
    // Track page view (analytics would go here)
    console.log('Page view tracked for garden-of-ai.co.uk domain sale page');
});