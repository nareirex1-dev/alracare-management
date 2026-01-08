// ===== GLOBAL VARIABLES =====
let currentService = null;
let isModalTransitioning = false;
let imageCache = new Map();

// Nomor WhatsApp klinik
const clinicWhatsApp = "6281381223811";

// Load serviceDetails from backend API on page load
let serviceDetails = {};

// ===== API INTEGRATION =====
async function loadServicesFromAPI() {
    try {
        const response = await apiCall(API_CONFIG.ENDPOINTS.SERVICES);
        if (response.success) {
            serviceDetails = response.data;
            console.log('Services loaded from API:', serviceDetails);
        }
    } catch (error) {
        console.error('Error loading services from API:', error);
        showNotification('⚠️ Gagal memuat layanan dari server. Menggunakan data lokal.', 'warning');
        // Fallback to hardcoded data if API fails
        loadFallbackServices();
    }
}

function loadFallbackServices() {
    // Keep existing hardcoded serviceDetails as fallback
    serviceDetails = {
        perawatan1: {
            title: "Perawatan Luka Modern",
            description: "Pilih jenis perawatan luka yang Anda butuhkan",
            type: "checkbox",
            options: [
                {
                    id: "Perawatan Luka di Klinik",
                    name: "1. Perawatan Luka di Klinik",
                    price: "Rp 150.000",
                    image: "/images/WoundCare.jpg",
                },
                {
                    id: "Perawatan Luka Ke Rumah",
                    name: "2. Perawatan Luka Ke Rumah di Area Pontianak",
                    price: "Rp 200.000",
                    image: "/images/WoundCare.jpg",
                },
                {
                    id: "L_SENDALDIABETES",
                    name: "3. Sendal Diabetes",
                    price: "Rp 500.000",
                    image: "/images/DiabetesSandals.jpg",
                }
            ]
        }
        // ... rest of fallback data
    };
}

// ===== UTILITY FUNCTIONS =====
function extractPrice(priceString) {
    if (!priceString) return 0;
    const match = priceString.match(/(\d+\.?\d*)/g);
    return match ? parseInt(match[0].replace(/\./g, '')) : 0;
}

function formatPrice(price) {
    return 'Rp ' + price.toLocaleString('id-ID');
}

function preloadImage(src) {
    return new Promise((resolve, reject) => {
        if (imageCache.has(src)) {
            resolve(imageCache.get(src));
            return;
        }

        const img = new Image();
        img.onload = () => {
            imageCache.set(src, {
                width: img.width,
                height: img.height,
                aspectRatio: img.width / img.height
            });
            resolve(imageCache.get(src));
        };
        img.onerror = () => {
            const fallback = {
                width: 400,
                height: 300,
                aspectRatio: 4/3,
                isFallback: true
            };
            imageCache.set(src, fallback);
            resolve(fallback);
        };
        img.src = src;
    });
}

function getImageContainerClass(orientation) {
    if (orientation.aspectRatio < 0.8) return 'portrait';
    if (orientation.aspectRatio > 1.2) return 'landscape';
    return 'square';
}

// ===== WHATSAPP FUNCTION =====
async function contactViaWhatsApp(bookingId = null) {
    let message = "Halo Alra Care, saya ingin bertanya tentang layanan yang tersedia.";
    
    if (bookingId) {
        try {
            // Try to get booking from API
            const response = await apiCall(API_CONFIG.ENDPOINTS.BOOKING_BY_ID(bookingId));
            if (response.success && response.data) {
                const booking = response.data;
                message = `Halo Alra Care, saya ${booking.patient_name} dengan nomor booking ${bookingId}. Saya ingin konfirmasi booking untuk layanan pada ${booking.appointment_date} jam ${booking.appointment_time}.`;
            }
        } catch (error) {
            console.error('Error fetching booking:', error);
        }
    }
    
    const whatsappUrl = `https://wa.me/${clinicWhatsApp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// ===== MODAL MANAGEMENT =====
const modalManager = {
    openModal: function(modalId) {
        try {
            if (isModalTransitioning) return;
            isModalTransitioning = true;
            
            const modal = document.getElementById(modalId);
            if (!modal) {
                throw new Error(`Modal dengan ID ${modalId} tidak ditemukan`);
            }
            
            modal.style.display = 'block';
            modal.scrollTop = 0;
            
            document.body.style.overflow = 'hidden';
            
            setTimeout(() => {
                modal.classList.add('show');
                isModalTransitioning = false;
            }, 10);
        } catch (error) {
            console.error('Modal error:', error);
            showNotification('Terjadi error saat membuka modal', 'error');
            isModalTransitioning = false;
        }
    },
    
    closeModal: function(modalId) {
        try {
            if (isModalTransitioning) return;
            isModalTransitioning = true;
            
            const modal = document.getElementById(modalId);
            if (!modal) {
                isModalTransitioning = false;
                return;
            }
            
            modal.classList.remove('show');
            
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
                
                if (modalId === 'serviceModal') {
                    const modalContent = document.getElementById('serviceModalContent');
                    if (modalContent) modalContent.innerHTML = '';
                }
                if (modalId === 'quickBookingModal') {
                    const modalContent = document.getElementById('quickBookingContent');
                    if (modalContent) modalContent.innerHTML = '';
                }
                isModalTransitioning = false;
            }, 300);
        } catch (error) {
            console.error('Modal close error:', error);
            isModalTransitioning = false;
        }
    },
    
    closeAll: function() {
        if (isModalTransitioning) return;
        isModalTransitioning = true;
        
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('show');
            
            setTimeout(() => {
                modal.style.display = 'none';
                
                if (modal.id === 'serviceModal') {
                    const modalContent = document.getElementById('serviceModalContent');
                    if (modalContent) modalContent.innerHTML = '';
                }
                if (modal.id === 'quickBookingModal') {
                    const modalContent = document.getElementById('quickBookingContent');
                    if (modalContent) modalContent.innerHTML = '';
                }
            }, 300);
        });
        
        document.body.style.overflow = 'auto';
        
        setTimeout(() => {
            isModalTransitioning = false;
        }, 350);
    }
};

// ===== SERVICE DETAIL MODAL FUNCTIONS =====
async function showServiceDetail(serviceId) {
    if (isModalTransitioning) return;
    
    const service = serviceDetails[serviceId];
    if (!service) {
        console.error(`Service dengan ID ${serviceId} tidak ditemukan`);
        showNotification('❌ Layanan tidak ditemukan', 'error');
        return;
    }

    const modalContent = document.getElementById('serviceModalContent');
    if (!modalContent) {
        console.error('Element serviceModalContent tidak ditemukan');
        return;
    }

    // Show loading state
    modalContent.innerHTML = `
        <div class="loading-state">
            <div class="loading-icon">⏳</div>
            <h3>Memuat Layanan...</h3>
            <p>Sedang memuat detail layanan yang dipilih</p>
        </div>
    `;

    modalManager.openModal('serviceModal');

    try {
        // Preload images in batches for better performance
        const batchSize = 3;
        const imageOrientations = [];
        
        for (let i = 0; i < service.options.length; i += batchSize) {
            const batch = service.options.slice(i, i + batchSize);
            const batchPromises = batch.map(option => preloadImage(option.image));
            const batchResults = await Promise.all(batchPromises);
            imageOrientations.push(...batchResults);
        }

        renderServiceOptions(serviceId, service, imageOrientations);
    } catch (error) {
        console.error('Error loading service details:', error);
        showErrorState(service);
    }
}

function renderServiceOptions(serviceId, service, imageOrientations) {
    const optionsHTML = service.options.map((option, index) => {
        const orientation = imageOrientations[index] || { aspectRatio: 1 };
        const containerClass = getImageContainerClass(orientation);
        
        return `
            <div class="option-card" onclick="toggleOptionSelection('${option.id}')">
                <div class="option-header">
                    <div class="option-checkbox">
                        <input type="checkbox" id="${option.id}" name="service-option" value="${option.id}" 
                               onclick="event.stopPropagation(); updateSelectionSummary('${serviceId}')">
                    </div>
                    <div class="option-image-container ${containerClass}">
                        <img src="${option.image}" alt="${option.name}" 
                             loading="lazy"
                             onload="this.style.opacity='1'"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjZjhmOGY4IiByeD0iMjAiLz4KPHRleHQgeD0iMjAwIiB5PSIyMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2NjYyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pgo8L3N2Zz4K'; this.style.opacity='1'"
                             style="opacity: 0; transition: opacity 0.3s ease">
                    </div>
                    <div class="option-title">
                        <h3>${option.name}</h3>
                        ${option.category ? `<span class="option-category">${option.category}</span>` : ''}
                    </div>
                </div>
                
                <div class="option-details">
                    <div class="option-price">
                        <strong>💰 Harga:</strong> ${option.price}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const content = `
        <div class="service-modal-header">
            <h2>${service.title}</h2>
            <p class="service-description">${service.description}</p>
            <p class="selection-info">✅ Pilih satu atau beberapa perawatan dengan mengklik card-nya</p>
        </div>
        
        <div class="options-container">
            ${optionsHTML}
        </div>
        
        <div class="selection-summary" id="selectionSummary" style="display: none;">
            <h4>📋 Perawatan yang Dipilih:</h4>
            <div id="selectedOptionsList"></div>
            <div class="total-price">
                <strong>💰 Total Estimasi: <span id="totalPrice">Rp 0</span></strong>
            </div>
        </div>
        
        <div class="service-modal-footer">
            <button class="cta-button secondary" onclick="modalManager.closeAll()">
                <i class="fas fa-arrow-left"></i> Kembali
            </button>
            <button class="cta-button" id="bookingBtn" onclick="proceedToBooking('${serviceId}')" disabled style="opacity: 0.6; cursor: not-allowed;">
                <i class="fas fa-calendar-check"></i> Lanjut ke Booking
            </button>
        </div>
    `;

    const modalContent = document.getElementById('serviceModalContent');
    if (!modalContent) return;

    modalContent.style.opacity = '0';
    
    setTimeout(() => {
        modalContent.innerHTML = content;
        modalContent.style.opacity = '1';
        
        if (service.type === "checkbox") {
            attachCheckboxListeners(serviceId);
        }
        
        updateSelectionSummary(serviceId);
    }, 200);
}

function showErrorState(service) {
    const modalContent = document.getElementById('serviceModalContent');
    if (!modalContent) return;

    modalContent.innerHTML = `
        <div class="error-state">
            <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
            <h3>Gagal Memuat Layanan</h3>
            <p>Terjadi kesalahan saat memuat detail layanan. Silakan coba lagi.</p>
            <button class="cta-button" onclick="modalManager.closeAll()" style="margin-top: 1rem;">
                <i class="fas fa-times"></i> Tutup
            </button>
        </div>
    `;
}

function toggleOptionSelection(optionId) {
    const checkbox = document.getElementById(optionId);
    if (!checkbox) return;

    checkbox.checked = !checkbox.checked;
    
    const optionCard = checkbox.closest('.option-card');
    if (optionCard) {
        if (checkbox.checked) {
            optionCard.classList.add('selected');
        } else {
            optionCard.classList.remove('selected');
        }
    }
    
    const serviceId = Object.keys(serviceDetails).find(id => 
        serviceDetails[id].options.some(opt => opt.id === optionId)
    );
    if (serviceId) {
        updateSelectionSummary(serviceId);
    }
}

function attachCheckboxListeners(serviceId) {
    const checkboxes = document.querySelectorAll('input[name="service-option"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const optionCard = this.closest('.option-card');
            if (optionCard) {
                if (this.checked) {
                    optionCard.classList.add('selected');
                } else {
                    optionCard.classList.remove('selected');
                }
            }
            updateSelectionSummary(serviceId);
        });
    });
}

function updateSelectionSummary(serviceId) {
    const service = serviceDetails[serviceId];
    if (!service) return;

    const selectedCheckboxes = document.querySelectorAll('input[name="service-option"]:checked');
    const bookingBtn = document.getElementById('bookingBtn');
    const selectionSummary = document.getElementById('selectionSummary');
    const selectedOptionsList = document.getElementById('selectedOptionsList');
    const totalPriceElement = document.getElementById('totalPrice');

    if (bookingBtn) {
        bookingBtn.disabled = selectedCheckboxes.length === 0;
        
        if (selectedCheckboxes.length > 0) {
            bookingBtn.style.opacity = "1";
            bookingBtn.style.cursor = "pointer";
            bookingBtn.innerHTML = `<i class="fas fa-calendar-check"></i> Lanjut ke Booking (${selectedCheckboxes.length})`;
        } else {
            bookingBtn.style.opacity = "0.6";
            bookingBtn.style.cursor = "not-allowed";
            bookingBtn.innerHTML = `<i class="fas fa-calendar-check"></i> Lanjut ke Booking`;
        }
    }
    
    if (selectedCheckboxes.length > 0) {
        if (selectionSummary) selectionSummary.style.display = 'block';
        
        let optionsHTML = '';
        let totalPrice = 0;
        
        selectedCheckboxes.forEach(checkbox => {
            const option = service.options.find(opt => opt.id === checkbox.value);
            if (option) {
                optionsHTML += `
                    <div class="selected-option">
                        <span class="option-name">${option.name}</span>
                        <span class="option-price">${option.price}</span>
                    </div>
                `;
                
                totalPrice += extractPrice(option.price);
            }
        });
        
        if (selectedOptionsList) selectedOptionsList.innerHTML = optionsHTML;
        if (totalPriceElement) {
            totalPriceElement.textContent = formatPrice(totalPrice);
        }
        
    } else {
        if (selectionSummary) selectionSummary.style.display = 'none';
    }
}

function proceedToBooking(serviceId) {
    console.log('Memproses booking untuk service:', serviceId);
    
    const service = serviceDetails[serviceId];
    if (!service) {
        console.error('Service tidak ditemukan:', serviceId);
        showNotification('❌ Gagal memproses booking. Service tidak ditemukan.', 'error');
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('input[name="service-option"]:checked');
    const selectedOptions = [];
    
    console.log('Jumlah opsi terpilih:', selectedCheckboxes.length);
    
    selectedCheckboxes.forEach(checkbox => {
        const option = service.options.find(opt => opt.id === checkbox.value);
        if (option) {
            selectedOptions.push({
                id: option.id,
                name: option.name,
                price: option.price
            });
            console.log('Opsi terpilih:', option.name);
        }
    });
    
    if (selectedOptions.length === 0) {
        showNotification('❌ Silakan pilih minimal satu perawatan sebelum booking.', 'warning');
        return;
    }
    
    const bookingData = {
        serviceId: serviceId,
        serviceName: service.title,
        selectedOptions: selectedOptions,
        type: 'checkbox',
        timestamp: new Date().toISOString()
    };
    
    try {
        // Store temporarily in sessionStorage (not localStorage)
        sessionStorage.setItem('selectedService', JSON.stringify(bookingData));
        console.log('Data booking disimpan:', bookingData);
        showBookingForm();
    } catch (error) {
        console.error('Error menyimpan data booking:', error);
        showNotification('❌ Gagal menyimpan data booking.', 'error');
    }
}

// ===== QUICK BOOKING FUNCTION =====
function showQuickBooking() {
    const content = `
        <div class="booking-form-modal">
            <div class="booking-header">
                <h2><i class="fas fa-calendar-plus"></i> Booking Cepat</h2>
                <p class="form-description">Pilih layanan yang ingin Anda booking</p>
            </div>
            
            <div class="quick-booking-options">
                <div class="quick-service-grid">
                    ${Object.entries(serviceDetails).map(([id, service]) => `
                        <div class="quick-service-card" onclick="showServiceDetail('${id}')">
                            <div class="quick-service-icon">
                                <i class="fas fa-${getServiceIcon(id)}"></i>
                            </div>
                            <h4>${service.title}</h4>
                            <p>${service.options.length} pilihan layanan</p>
                            <button class="cta-button secondary">
                                <i class="fas fa-arrow-right"></i> Pilih
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="form-actions">
                <button class="cta-button secondary" onclick="modalManager.closeAll()">
                    <i class="fas fa-times"></i> Tutup
                </button>
                <button class="cta-button" onclick="scrollToServices()">
                    <i class="fas fa-eye"></i> Lihat Semua Layanan
                </button>
            </div>
        </div>
    `;

    const modalContent = document.getElementById('quickBookingContent');
    if (modalContent) {
        modalContent.innerHTML = content;
        modalManager.openModal('quickBookingModal');
    }
}

function getServiceIcon(serviceId) {
    const icons = {
        perawatan1: 'stethoscope',
        perawatan2: 'spa',
        perawatan3: 'user-md',
        perawatan4: 'brain',
        perawatan5: 'prescription-bottle'
    };
    return icons[serviceId] || 'heart';
}

// ===== BOOKING FORM FUNCTIONS =====
function showBookingForm() {
    let selectedData;
    try {
        selectedData = JSON.parse(sessionStorage.getItem('selectedService') || '{}');
    } catch (error) {
        console.error('Error parsing selectedService:', error);
        selectedData = {};
    }
    
    console.log('Data yang akan ditampilkan di form:', selectedData);
    
    if (!selectedData.serviceId || !selectedData.selectedOptions) {
        showNotification('❌ Data booking tidak valid. Silakan pilih layanan kembali.', 'error');
        modalManager.closeAll();
        return;
    }
    
    const timeOptions = generateTimeOptions();
    const today = new Date().toISOString().split('T')[0];
    
    const servicesHTML = selectedData.selectedOptions.map(option => `
        <div class="service-summary-item">
            <div>
                <strong>${option.name}</strong>
            </div>
            <span class="service-price">${option.price}</span>
        </div>
    `).join('');

    const content = `
        <div class="booking-form-modal">
            <div class="booking-header">
                <h2><i class="fas fa-calendar-check"></i> Formulir Booking</h2>
                <p class="form-description">Lengkapi data diri Anda untuk melanjutkan booking</p>
            </div>
            
            <div class="selected-services-summary">
                <h4><i class="fas fa-shopping-cart"></i> Layanan yang Dipilih:</h4>
                ${servicesHTML}
            </div>
            
            <form id="patientBookingForm" class="booking-form">
                <div class="form-section">
                    <h4><i class="fas fa-user"></i> Data Diri Pasien</h4>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="patientName">Nama Lengkap *</label>
                            <input type="text" id="patientName" name="patientName" required 
                                   placeholder="Masukkan nama lengkap"
                                   pattern="[a-zA-Z\\s]{3,}">
                            <div class="validation-message" id="nameValidation"></div>
                        </div>
                        <div class="form-group">
                            <label for="patientPhone">Nomor Telepon *</label>
                            <input type="tel" id="patientPhone" name="patientPhone" required 
                                   placeholder="Contoh: 081234567890"
                                   pattern="[0-9]{10,13}">
                            <div class="validation-message" id="phoneValidation"></div>
                        </div>
                    </div>
                    
                    <div class="form-group full-width">
                        <label for="patientAddress">Alamat Lengkap *</label>
                        <textarea id="patientAddress" name="patientAddress" rows="4" required 
                                  placeholder="Masukkan alamat lengkap (jalan, RT/RW, kelurahan, kecamatan, kota)"></textarea>
                        <div class="validation-message" id="addressValidation"></div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4><i class="fas fa-calendar-alt"></i> Jadwal Perawatan</h4>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="appointmentDate">Tanggal Perawatan *</label>
                            <input type="date" id="appointmentDate" name="appointmentDate" 
                                   min="${today}" required>
                            <small class="date-note">Pilih tanggal mulai hari ini</small>
                            <div class="validation-message" id="dateValidation"></div>
                        </div>
                        <div class="form-group">
                            <label for="appointmentTime">Jam Perawatan *</label>
                            <select id="appointmentTime" name="appointmentTime" required>
                                <option value="">Pilih Jam</option>
                                ${timeOptions}
                            </select>
                            <small class="time-note">Jam praktik: 08:00 - 17:00</small>
                            <div class="validation-message" id="timeValidation"></div>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4><i class="fas fa-notes-medical"></i> Informasi Tambahan</h4>
                    <div class="form-group full-width">
                        <label for="patientNotes">Catatan Tambahan (opsional)</label>
                        <textarea id="patientNotes" name="patientNotes" rows="4" 
                                  placeholder="Keluhan khusus, alergi, riwayat penyakit, atau informasi lain yang perlu kami ketahui..."></textarea>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="cta-button secondary" onclick="goBackToServiceSelection()">
                        <i class="fas fa-arrow-left"></i> Kembali ke Pilihan Layanan
                    </button>
                    <button type="submit" class="cta-button">
                        <i class="fas fa-paper-plane"></i> Konfirmasi Booking
                    </button>
                </div>
            </form>
        </div>
    `;

    const modalContent = document.getElementById('serviceModalContent');
    if (!modalContent) return;

    modalContent.innerHTML = content;
    
    setDefaultAppointmentDate();
    setupEnhancedFormValidation();
    
    const form = document.getElementById('patientBookingForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            submitBookingForm();
        });
    }
}

function generateTimeOptions() {
    let options = '';
    for (let hour = 8; hour <= 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            if (hour === 17 && minute > 0) break;
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            options += `<option value="${time}">${time}</option>`;
        }
    }
    return options;
}

function setDefaultAppointmentDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowFormatted = tomorrow.toISOString().split('T')[0];
    
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        dateInput.value = tomorrowFormatted;
    }
}

function setupEnhancedFormValidation() {
    const phoneInput = document.getElementById('patientPhone');
    const nameInput = document.getElementById('patientName');
    const addressInput = document.getElementById('patientAddress');
    const dateInput = document.getElementById('appointmentDate');
    const timeInput = document.getElementById('appointmentTime');

    // Real-time phone validation
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            const value = this.value.replace(/[^0-9]/g, '');
            this.value = value;
            
            const validationElement = document.getElementById('phoneValidation');
            if (value.length >= 10 && value.length <= 13) {
                this.style.borderColor = 'var(--success-color)';
                if (validationElement) {
                    validationElement.textContent = '✓ Nomor telepon valid';
                    validationElement.style.color = 'var(--success-color)';
                }
            } else {
                this.style.borderColor = 'var(--error-color)';
                if (validationElement) {
                    validationElement.textContent = 'Nomor telepon harus 10-13 digit';
                    validationElement.style.color = 'var(--error-color)';
                }
            }
        });
    }

    // Name validation
    if (nameInput) {
        nameInput.addEventListener('input', function(e) {
            const value = this.value.trim();
            const words = value.split(/\s+/).filter(word => word.length > 0);
            const validationElement = document.getElementById('nameValidation');
            
            if (words.length >= 2) {
                this.style.borderColor = 'var(--success-color)';
                if (validationElement) {
                    validationElement.textContent = '✓ Nama lengkap valid';
                    validationElement.style.color = 'var(--success-color)';
                }
            } else {
                this.style.borderColor = 'var(--error-color)';
                if (validationElement) {
                    validationElement.textContent = 'Minimal 2 kata (nama lengkap)';
                    validationElement.style.color = 'var(--error-color)';
                }
            }
        });
    }

    // Date validation
    if (dateInput) {
        dateInput.addEventListener('change', function(e) {
            const selectedDate = new Date(this.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const validationElement = document.getElementById('dateValidation');
            
            if (selectedDate < today) {
                this.style.borderColor = 'var(--error-color)';
                if (validationElement) {
                    validationElement.textContent = 'Tidak bisa memilih tanggal yang sudah lewat';
                    validationElement.style.color = 'var(--error-color)';
                }
            } else {
                this.style.borderColor = 'var(--success-color)';
                if (validationElement) {
                    validationElement.textContent = '✓ Tanggal valid';
                    validationElement.style.color = 'var(--success-color)';
                }
            }
        });
    }

    // Real-time validation for all fields
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value.trim() !== '' && this.checkValidity()) {
                this.style.borderColor = 'var(--success-color)';
            } else if (this.checkValidity() === false) {
                this.style.borderColor = 'var(--error-color)';
            }
        });
    });
}

function goBackToServiceSelection() {
    let selectedData;
    try {
        selectedData = JSON.parse(sessionStorage.getItem('selectedService') || '{}');
    } catch (error) {
        selectedData = {};
    }
    
    if (selectedData.serviceId) {
        showServiceDetail(selectedData.serviceId);
    } else {
        modalManager.closeAll();
    }
}

// ===== SUBMIT BOOKING TO API =====
async function submitBookingForm() {
    const form = document.getElementById('patientBookingForm');
    if (!form) return;

    const formData = new FormData(form);
    let selectedData;
    
    try {
        selectedData = JSON.parse(sessionStorage.getItem('selectedService') || '{}');
    } catch (error) {
        selectedData = {};
    }
    
    if (!validateBookingForm(formData)) {
        return;
    }
    
    // Prepare data for API
    const bookingPayload = {
        patient_name: formData.get('patientName'),
        patient_phone: formData.get('patientPhone'),
        patient_address: formData.get('patientAddress'),
        patient_notes: formData.get('patientNotes') || 'Tidak ada catatan',
        appointment_date: formData.get('appointmentDate'),
        appointment_time: formData.get('appointmentTime'),
        selected_services: selectedData.selectedOptions
    };
    
    try {
        // Show loading
        showNotification('⏳ Menyimpan booking...', 'info');
        
        // Call API
        const response = await apiCall(API_CONFIG.ENDPOINTS.BOOKINGS, {
            method: 'POST',
            body: JSON.stringify(bookingPayload)
        });
        
        if (response.success) {
            showBookingConfirmation(response.data);
            sessionStorage.removeItem('selectedService');
        } else {
            throw new Error(response.message || 'Gagal menyimpan booking');
        }
        
    } catch (error) {
        console.error('Error saving booking:', error);
        showNotification('❌ ' + error.message, 'error');
    }
}

function validateBookingForm(formData) {
    const name = formData.get('patientName');
    const phone = formData.get('patientPhone');
    const address = formData.get('patientAddress');
    const date = formData.get('appointmentDate');
    const time = formData.get('appointmentTime');
    
    if (!name || !phone || !address || !date || !time) {
        showNotification('Harap lengkapi semua field yang wajib diisi', 'error');
        return false;
    }
    
    const nameWords = name.trim().split(/\s+/);
    if (nameWords.length < 2) {
        showNotification('Harap masukkan nama lengkap (minimal 2 kata)', 'error');
        return false;
    }
    
    if (phone.length < 10 || phone.length > 13) {
        showNotification('Nomor telepon harus 10-13 digit', 'error');
        return false;
    }
    
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showNotification('Tidak bisa memilih tanggal yang sudah lewat', 'error');
        return false;
    }
    
    return true;
}

function showBookingConfirmation(bookingData) {
    const appointmentDate = new Date(bookingData.appointment_datetime);
    const formattedDate = appointmentDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const servicesHTML = bookingData.booking_services ? bookingData.booking_services.map(service => `
        <div class="detail-item">
            <span><strong>${service.service_name}</strong></span>
            <span>${service.service_price}</span>
        </div>
    `).join('') : '';
    
    const content = `
        <div class="confirmation-modal">
            <div class="confirmation-icon">✅</div>
            <h2>Booking Berhasil!</h2>
            
            <div class="confirmation-details">
                <div class="detail-item">
                    <strong>Nomor Booking:</strong>
                    <span>${bookingData.id}</span>
                </div>
                <div class="detail-item">
                    <strong>Nama Pasien:</strong>
                    <span>${bookingData.patient_name}</span>
                </div>
                <div class="detail-item">
                    <strong>Telepon:</strong>
                    <span>${bookingData.patient_phone}</span>
                </div>
                ${servicesHTML}
                <div class="detail-item">
                    <strong>Tanggal & Jam:</strong>
                    <span>${formattedDate}, ${bookingData.appointment_time}</span>
                </div>
                <div class="detail-item">
                    <strong>Status:</strong>
                    <span class="status-pending">Menunggu Konfirmasi</span>
                </div>
            </div>
            
            <div class="confirmation-message">
                <p>📞 <strong>Konfirmasi Booking:</strong> Kami akan menghubungi Anda di <strong>${bookingData.patient_phone}</strong> 
                   dalam 1x24 jam untuk konfirmasi jadwal.</p>
                
                <div class="whatsapp-contact">
                    <p>💬 <strong>Butuh Bantuan Cepat?</strong></p>
                    <p>Hubungi kami via WhatsApp:</p>
                    <div class="whatsapp-number">
                        <button class="whatsapp-btn large" onclick="contactViaWhatsApp('${bookingData.id}')">
                            <i class="fab fa-whatsapp"></i>
                            6281381223811
                        </button>
                    </div>
                    <small>Klik tombol di atas untuk chat langsung via WhatsApp</small>
                </div>
                
                <p>📍 <strong>Ketentuan:</strong> Pastikan Anda datang 15 menit sebelum jadwal perawatan.</p>
                <p>💳 <strong>Pembayaran:</strong> Siapkan pembayaran sesuai dengan layanan yang dipilih.</p>
                <p>📝 <strong>Catatan:</strong> ${bookingData.patient_notes}</p>
            </div>
            
            <div class="confirmation-actions">
                <button class="cta-button whatsapp-btn" onclick="contactViaWhatsApp('${bookingData.id}')">
                    <i class="fab fa-whatsapp"></i> Hubungi via WhatsApp
                </button>
                <button class="cta-button" onclick="modalManager.closeAll(); showNotification('Terima kasih telah membooking layanan kami!', 'success')">
                    <i class="fas fa-check"></i> Tutup & Selesai
                </button>
            </div>
        </div>
    `;

    const modalContent = document.getElementById('serviceModalContent');
    if (modalContent) {
        modalContent.innerHTML = content;
    }
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    if (notification && notificationText) {
        notificationText.textContent = message;
        
        // Set styles based on type
        if (type === 'error') {
            notification.style.borderLeftColor = 'var(--error-color)';
            notification.style.background = '#ffeaea';
        } else if (type === 'success') {
            notification.style.borderLeftColor = 'var(--success-color)';
            notification.style.background = '#f0f9f0';
        } else if (type === 'warning') {
            notification.style.borderLeftColor = 'var(--warning-color)';
            notification.style.background = '#fff3e0';
        } else {
            notification.style.borderLeftColor = 'var(--primary-color)';
            notification.style.background = '#f0f9f0';
        }
        
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }
}

// ===== NAVIGATION FUNCTIONS =====
function scrollToServices() {
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
        servicesSection.scrollIntoView({
            behavior: 'smooth'
        });
    }
    modalManager.closeAll();
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Alra Care Public Website initialized successfully!');
    
    // Load services from API
    await loadServicesFromAPI();
    
    // Smooth scroll untuk anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            
            if (href === '#admin' || href === '#') return;
            
            e.preventDefault();
            
            const targetElement = document.querySelector(href);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Close mobile menu if open
                const hamburger = document.querySelector('.hamburger');
                const navMenu = document.querySelector('.nav-menu');
                if (hamburger && navMenu) {
                    hamburger.classList.remove('active');
                    navMenu.classList.remove('active');
                }
            }
        });
    });

    // Mobile Navigation
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                if (hamburger && navMenu) {
                    hamburger.classList.remove('active');
                    navMenu.classList.remove('active');
                }
            });
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modalManager.closeAll();
            }
        });
    });

    // Escape key to close modal
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            modalManager.closeAll();
        }
    });

    // Add CSS for validation messages
    const style = document.createElement('style');
    style.textContent = `
        .validation-message {
            font-size: 0.875rem;
            margin-top: 0.25rem;
            min-height: 1.25rem;
        }
        .option-category {
            display: inline-block;
            background: var(--primary-light);
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.875rem;
            margin-top: 0.5rem;
        }
        .quick-booking-options {
            margin: 2rem 0;
        }
        .quick-service-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .quick-service-card {
            background: white;
            padding: 2rem;
            border-radius: var(--border-radius);
            text-align: center;
            box-shadow: var(--shadow);
            transition: var(--transition);
            cursor: pointer;
        }
        .quick-service-card:hover {
            transform: translateY(-5px);
            box-shadow: var(--shadow-hover);
        }
        .quick-service-icon {
            font-size: 3rem;
            color: var(--primary-color);
            margin-bottom: 1rem;
        }
        .quick-service-card h4 {
            margin-bottom: 0.5rem;
            color: var(--text-dark);
        }
        .quick-service-card p {
            color: var(--text-light);
            margin-bottom: 1.5rem;
        }
    `;
    document.head.appendChild(style);
});