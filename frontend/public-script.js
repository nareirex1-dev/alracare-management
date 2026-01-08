// ===== CONFIGURATION =====
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : `${window.location.origin}/api`;

// ===== GLOBAL VARIABLES =====
let serviceDetails = {};
let serviceCategoryMapping = {}; // Map static IDs to dynamic category IDs
let availableTimeSlots = [];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Alra Care Public Site initialized');
    
    // Load service details from API
    loadServiceDetails();
    
    // Setup navigation
    setupMobileMenu();
    
    // Setup scroll effects
    setupScrollEffects();
    
    // Generate time slots
    generateTimeSlots();
});

// ===== API FUNCTIONS =====
async function loadServiceDetails() {
    try {
        const response = await fetch(`${API_BASE_URL}/services`);
        const result = await response.json();
        
        if (result.success) {
            serviceDetails = result.data;
            
            // Create mapping from static IDs to dynamic category IDs
            createServiceMapping(serviceDetails);
            
            console.log('Service details loaded:', serviceDetails);
            console.log('Service mapping:', serviceCategoryMapping);
        } else {
            console.error('Failed to load services:', result.message);
            loadServiceDetailsFromLocalStorage();
        }
    } catch (error) {
        console.error('Error loading services:', error);
        loadServiceDetailsFromLocalStorage();
    }
}

function createServiceMapping(services) {
    // Map static IDs (perawatan1, perawatan2, etc.) to actual category IDs from API
    const categories = Object.keys(services);
    
    categories.forEach((categoryId, index) => {
        const service = services[categoryId];
        const staticId = `perawatan${index + 1}`;
        
        // Create bidirectional mapping
        serviceCategoryMapping[staticId] = categoryId;
        serviceCategoryMapping[categoryId] = staticId;
        
        console.log(`Mapping: ${staticId} <-> ${categoryId} (${service.title})`);
    });
}

function loadServiceDetailsFromLocalStorage() {
    const stored = localStorage.getItem('serviceDetails');
    if (stored) {
        serviceDetails = JSON.parse(stored);
        createServiceMapping(serviceDetails);
        console.log('Service details loaded from localStorage');
    }
}

// ===== SERVICE DETAIL MODAL =====
function showServiceDetail(serviceId) {
    console.log('showServiceDetail called with ID:', serviceId);
    
    // Try to get service with the provided ID first
    let service = serviceDetails[serviceId];
    let actualServiceId = serviceId;
    
    // If not found, try to map from static ID to dynamic ID
    if (!service && serviceCategoryMapping[serviceId]) {
        actualServiceId = serviceCategoryMapping[serviceId];
        service = serviceDetails[actualServiceId];
        console.log(`Mapped ${serviceId} to ${actualServiceId}`);
    }
    
    // If still not found, try to find by matching title
    if (!service) {
        const titleMap = {
            'perawatan1': 'Perawatan Luka Modern',
            'perawatan2': 'Perawatan Kecantikan',
            'perawatan3': 'Sunat Modern',
            'perawatan4': 'Hipnoterapi',
            'perawatan5': 'Skincare'
        };
        
        const targetTitle = titleMap[serviceId];
        if (targetTitle) {
            for (const [key, val] of Object.entries(serviceDetails)) {
                if (val.title === targetTitle) {
                    service = val;
                    actualServiceId = key;
                    console.log(`Found service by title: ${targetTitle}`);
                    break;
                }
            }
        }
    }
    
    if (!service) {
        console.error(`Service not found for ID: ${serviceId}`);
        showNotification('Layanan tidak ditemukan', 'error');
        return;
    }
    
    const modalContent = document.getElementById('serviceModalContent');
    if (!modalContent) {
        console.error('Modal content element not found');
        return;
    }
    
    // Build service options HTML
    let optionsHTML = '';
    if (service.options && service.options.length > 0) {
        optionsHTML = `
            <div class="service-options">
                <h4>Pilih Layanan:</h4>
                <div class="options-list">
                    ${service.options.map(option => `
                        <div class="option-item">
                            <input type="checkbox" 
                                   id="option-${option.id}" 
                                   name="service-option" 
                                   value="${option.id}"
                                   data-name="${option.name}"
                                   data-price="${option.price}">
                            <label for="option-${option.id}">
                                <div class="option-info">
                                    <div class="option-image">
                                        <img src="${option.image || ''}" alt="${option.name}" 
                                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjhmOGY4IiByeD0iOCIvPgo8dGV4dCB4PSI0MCIgeT0iNDIiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2NjYyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gSW1nPC90ZXh0Pgo8L3N2Zz4K'">
                                    </div>
                                    <div class="option-details">
                                        <span class="option-name">${option.name}</span>
                                        <span class="option-price">${option.price}</span>
                                    </div>
                                </div>
                            </label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    modalContent.innerHTML = `
        <h2>${service.title}</h2>
        <p class="service-description">${service.description || ''}</p>
        ${optionsHTML}
        <div class="modal-actions">
            <button class="btn-secondary" onclick="modalManager.closeAll()">
                <i class="fas fa-times"></i> Tutup
            </button>
            <button class="btn-primary" onclick="proceedToBooking('${actualServiceId}')">
                <i class="fas fa-calendar-check"></i> Lanjut Booking
            </button>
        </div>
    `;
    
    // Show modal
    const modal = document.getElementById('serviceModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// ===== BOOKING FUNCTIONS =====
function proceedToBooking(serviceId) {
    const service = serviceDetails[serviceId];
    
    if (!service) {
        showNotification('Layanan tidak ditemukan', 'error');
        return;
    }
    
    // Get selected options
    const selectedOptions = [];
    const checkboxes = document.querySelectorAll('input[name="service-option"]:checked');
    
    checkboxes.forEach(checkbox => {
        selectedOptions.push({
            id: checkbox.value,
            name: checkbox.dataset.name,
            price: checkbox.dataset.price
        });
    });
    
    if (service.options && service.options.length > 0 && selectedOptions.length === 0) {
        showNotification('Pilih minimal satu layanan', 'warning');
        return;
    }
    
    // Store booking data temporarily
    const bookingData = {
        serviceId: serviceId,
        serviceName: service.title,
        selectedOptions: selectedOptions
    };
    
    sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
    
    // Close service modal and show booking modal
    modalManager.closeAll();
    showQuickBooking();
}

function showQuickBooking() {
    const pendingBooking = sessionStorage.getItem('pendingBooking');
    let serviceInfo = '';
    
    if (pendingBooking) {
        const booking = JSON.parse(pendingBooking);
        serviceInfo = `
            <div class="selected-service-info">
                <h4>Layanan yang Dipilih:</h4>
                <p><strong>${booking.serviceName}</strong></p>
                ${booking.selectedOptions.length > 0 ? `
                    <ul class="selected-options">
                        ${booking.selectedOptions.map(opt => `
                            <li>${opt.name} - ${opt.price}</li>
                        `).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
    }
    
    const modalContent = document.getElementById('quickBookingContent');
    if (!modalContent) return;
    
    modalContent.innerHTML = `
        <h2><i class="fas fa-calendar-check"></i> Booking Sekarang</h2>
        ${serviceInfo}
        <form id="quickBookingForm">
            <div class="form-group">
                <label for="bookingName">Nama Lengkap *</label>
                <input type="text" id="bookingName" required placeholder="Masukkan nama lengkap">
            </div>
            
            <div class="form-group">
                <label for="bookingPhone">Nomor Telepon *</label>
                <input type="tel" id="bookingPhone" required placeholder="08xxxxxxxxxx" pattern="[0-9]{10,13}">
            </div>
            
            <div class="form-group">
                <label for="bookingAddress">Alamat *</label>
                <textarea id="bookingAddress" required placeholder="Masukkan alamat lengkap" rows="3"></textarea>
            </div>
            
            ${!pendingBooking ? `
            <div class="form-group">
                <label for="bookingService">Pilih Layanan *</label>
                <select id="bookingService" required>
                    <option value="">-- Pilih Layanan --</option>
                    ${Object.keys(serviceDetails).map(key => `
                        <option value="${key}">${serviceDetails[key].title}</option>
                    `).join('')}
                </select>
            </div>
            ` : ''}
            
            <div class="form-row">
                <div class="form-group">
                    <label for="bookingDate">Tanggal Perawatan *</label>
                    <input type="date" id="bookingDate" required min="${new Date().toISOString().split('T')[0]}">
                </div>
                
                <div class="form-group">
                    <label for="bookingTime">Jam Perawatan *</label>
                    <select id="bookingTime" required>
                        <option value="">-- Pilih Jam --</option>
                        ${availableTimeSlots.map(time => `
                            <option value="${time}">${time}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="bookingNotes">Catatan (Opsional)</label>
                <textarea id="bookingNotes" placeholder="Tambahkan catatan jika ada" rows="3"></textarea>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="modalManager.closeAll()">
                    <i class="fas fa-times"></i> Batal
                </button>
                <button type="submit" class="btn-primary">
                    <i class="fas fa-paper-plane"></i> Kirim Booking
                </button>
            </div>
        </form>
    `;
    
    // Setup form submission
    const form = document.getElementById('quickBookingForm');
    if (form) {
        form.addEventListener('submit', handleBookingSubmit);
    }
    
    // Show modal
    const modal = document.getElementById('quickBookingModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    
    const pendingBooking = sessionStorage.getItem('pendingBooking');
    let serviceId, serviceName, selectedOptions = [];
    
    if (pendingBooking) {
        const booking = JSON.parse(pendingBooking);
        serviceId = booking.serviceId;
        serviceName = booking.serviceName;
        selectedOptions = booking.selectedOptions;
    } else {
        serviceId = document.getElementById('bookingService').value;
        serviceName = serviceDetails[serviceId]?.title || '';
    }
    
    const bookingData = {
        patientInfo: {
            name: document.getElementById('bookingName').value,
            phone: document.getElementById('bookingPhone').value,
            address: document.getElementById('bookingAddress').value,
            notes: document.getElementById('bookingNotes').value || 'Tidak ada catatan'
        },
        appointmentInfo: {
            date: document.getElementById('bookingDate').value,
            time: document.getElementById('bookingTime').value,
            datetime: new Date(document.getElementById('bookingDate').value + 'T' + document.getElementById('bookingTime').value).toISOString()
        },
        serviceInfo: {
            serviceId: serviceId,
            serviceName: serviceName,
            selectedOptions: selectedOptions
        },
        status: 'pending',
        bookingDate: new Date().toISOString()
    };
    
    try {
        // Try to submit to API
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Booking berhasil! Kami akan menghubungi Anda dalam 1x24 jam untuk konfirmasi jadwal.', 'success');
            sessionStorage.removeItem('pendingBooking');
            modalManager.closeAll();
            document.getElementById('quickBookingForm').reset();
        } else {
            throw new Error(result.message || 'Gagal membuat booking');
        }
    } catch (error) {
        console.error('Error submitting booking:', error);
        
        // Fallback to localStorage
        const bookings = JSON.parse(localStorage.getItem('klinikBookings') || '[]');
        bookingData.bookingId = 'BK' + Date.now();
        bookings.push(bookingData);
        localStorage.setItem('klinikBookings', JSON.stringify(bookings));
        
        showNotification('Booking berhasil disimpan! Kami akan menghubungi Anda dalam 1x24 jam untuk konfirmasi jadwal.', 'success');
        sessionStorage.removeItem('pendingBooking');
        modalManager.closeAll();
        document.getElementById('quickBookingForm').reset();
    }
}

// ===== UTILITY FUNCTIONS =====
function generateTimeSlots() {
    availableTimeSlots = [];
    for (let hour = 8; hour <= 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            if (hour === 17 && minute > 0) break;
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            availableTimeSlots.push(time);
        }
    }
}

function scrollToServices() {
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking on a link
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

function setupScrollEffects() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href !== '#footer') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
    
    // Navbar background on scroll
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });
}

// ===== MODAL MANAGER =====
const modalManager = {
    closeAll: function() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
        document.body.style.overflow = '';
    }
};

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        modalManager.closeAll();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        modalManager.closeAll();
    }
});

// ===== NOTIFICATION =====
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    if (notification && notificationText) {
        notificationText.textContent = message;
        
        // Remove existing classes
        notification.className = 'notification';
        
        // Add type class
        notification.classList.add(type);
        notification.classList.add('show');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }
}

// Export functions for global access
window.showServiceDetail = showServiceDetail;
window.showQuickBooking = showQuickBooking;
window.scrollToServices = scrollToServices;
window.proceedToBooking = proceedToBooking;
window.modalManager = modalManager;
