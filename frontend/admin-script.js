// ===== GLOBAL VARIABLES =====
let bookings = [];
let services = {};
let gallery = [];
let settings = {};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Alra Care Admin Panel initialized');
    
    // Load data from localStorage
    loadData();
    
    // Setup navigation
    setupNavigation();
    
    // Setup form submissions
    setupForms();
    
    // Display initial data
    displayDashboardData();
    displayAllBookings();
    displayServiceCategories();
    displayServiceOptions();
    displayGallery();
    
    // Load settings into forms
    loadSettingsIntoForms();
});

// ===== DATA MANAGEMENT =====
function loadData() {
    try {
        // Load bookings
        const storedBookings = localStorage.getItem('klinikBookings');
        bookings = storedBookings ? JSON.parse(storedBookings) : [];
        
        // Load services
        const storedServices = localStorage.getItem('serviceDetails');
        services = storedServices ? JSON.parse(storedServices) : {};
        
        // Load gallery
        const storedGallery = localStorage.getItem('klinikGallery');
        gallery = storedGallery ? JSON.parse(storedGallery) : [];
        
        // Load settings
        const storedSettings = localStorage.getItem('adminSettings');
        settings = storedSettings ? JSON.parse(storedSettings) : {};
        
        console.log('Data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        // Initialize with empty data if there's an error
        bookings = [];
        services = {};
        gallery = [];
        settings = {};
    }
}

function saveData() {
    try {
        localStorage.setItem('klinikBookings', JSON.stringify(bookings));
        localStorage.setItem('serviceDetails', JSON.stringify(services));
        localStorage.setItem('klinikGallery', JSON.stringify(gallery));
        localStorage.setItem('adminSettings', JSON.stringify(settings));
        console.log('Data saved successfully');
    } catch (error) {
        console.error('Error saving data:', error);
        showNotification('Error menyimpan data', 'error');
    }
}

// ===== NAVIGATION =====
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Show selected page
            const pageId = this.getAttribute('data-page');
            const targetPage = document.getElementById(pageId);
            if (targetPage) {
                targetPage.classList.add('active');
                
                // Refresh data for specific pages
                if (pageId === 'dashboard') {
                    displayDashboardData();
                } else if (pageId === 'bookings') {
                    displayAllBookings();
                } else if (pageId === 'services') {
                    displayServiceCategories();
                    displayServiceOptions();
                } else if (pageId === 'gallery') {
                    displayGallery();
                }
            }
        });
    });
}

// ===== DASHBOARD FUNCTIONS =====
function displayDashboardData() {
    try {
        // Calculate dashboard statistics
        const totalBookings = bookings.length;
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = bookings.filter(booking => 
            booking.appointmentInfo && booking.appointmentInfo.date === today
        ).length;
        
        // Calculate monthly revenue
        const monthlyRevenue = bookings.reduce((total, booking) => {
            let price = 0;
            if (booking.serviceInfo && booking.serviceInfo.selectedOptions) {
                booking.serviceInfo.selectedOptions.forEach(option => {
                    if (option.price) {
                        const priceMatch = option.price.match(/(\d+\.?\d*)/g);
                        if (priceMatch) {
                            price += parseInt(priceMatch[0].replace(/\./g, '')) || 0;
                        }
                    }
                });
            }
            return total + price;
        }, 0);
        
        // Count available services
        let serviceCount = 0;
        Object.keys(services).forEach(category => {
            if (services[category] && services[category].options) {
                serviceCount += services[category].options.length;
            }
        });
        
        // Update dashboard cards
        const totalBookingsEl = document.getElementById('totalBookings');
        const todayBookingsEl = document.getElementById('todayBookings');
        const monthlyRevenueEl = document.getElementById('monthlyRevenue');
        const availableServicesEl = document.getElementById('availableServices');
        
        if (totalBookingsEl) totalBookingsEl.textContent = totalBookings;
        if (todayBookingsEl) todayBookingsEl.textContent = todayBookings;
        if (monthlyRevenueEl) monthlyRevenueEl.textContent = 'Rp ' + monthlyRevenue.toLocaleString('id-ID');
        if (availableServicesEl) availableServicesEl.textContent = serviceCount;
        
        // Display recent bookings
        displayRecentBookings();
    } catch (error) {
        console.error('Error displaying dashboard data:', error);
    }
}

function displayRecentBookings() {
    const tableBody = document.getElementById('recentBookingsTable');
    if (!tableBody) return;
    
    const recentBookings = bookings.slice(-5).reverse();
    
    if (recentBookings.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-calendar-times fa-2x text-muted mb-2"></i>
                    <p class="text-muted">Tidak ada booking terbaru</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = recentBookings.map(booking => {
        if (!booking.appointmentInfo) return '';
        
        const appointmentDate = new Date(booking.appointmentInfo.datetime);
        const formattedDate = appointmentDate.toLocaleDateString('id-ID');
        
        return `
            <tr>
                <td>${booking.bookingId || 'N/A'}</td>
                <td>${booking.patientInfo?.name || 'N/A'}</td>
                <td>${booking.serviceInfo?.serviceName || 'N/A'}</td>
                <td>${formattedDate}</td>
                <td>
                    <span class="status-badge status-${booking.status || 'pending'}">
                        ${getStatusText(booking.status)}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewBooking('${booking.bookingId}')" title="Lihat Detail">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="updateBookingStatus('${booking.bookingId}', 'confirmed')" title="Konfirmasi" ${booking.status === 'confirmed' ? 'disabled' : ''}>
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== BOOKING MANAGEMENT =====
function displayAllBookings() {
    const tableBody = document.getElementById('allBookingsTable');
    if (!tableBody) return;
    
    if (bookings.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-calendar-times fa-2x text-muted mb-2"></i>
                    <p class="text-muted">Tidak ada booking</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort bookings by date (newest first)
    const sortedBookings = [...bookings].sort((a, b) => 
        new Date(b.bookingDate || 0) - new Date(a.bookingDate || 0)
    );
    
    tableBody.innerHTML = sortedBookings.map(booking => {
        if (!booking.appointmentInfo) return '';
        
        const appointmentDate = new Date(booking.appointmentInfo.datetime);
        const formattedDate = appointmentDate.toLocaleDateString('id-ID');
        const formattedTime = booking.appointmentInfo.time || 'N/A';
        
        return `
            <tr>
                <td>${booking.bookingId || 'N/A'}</td>
                <td>${booking.patientInfo?.name || 'N/A'}</td>
                <td>${booking.patientInfo?.phone || 'N/A'}</td>
                <td>${booking.serviceInfo?.serviceName || 'N/A'}</td>
                <td>${formattedDate} ${formattedTime}</td>
                <td>
                    <span class="status-badge status-${booking.status || 'pending'}">
                        ${getStatusText(booking.status)}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewBooking('${booking.bookingId}')" title="Lihat Detail">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="updateBookingStatus('${booking.bookingId}', 'confirmed')" title="Konfirmasi" ${booking.status === 'confirmed' ? 'disabled' : ''}>
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="updateBookingStatus('${booking.bookingId}', 'pending')" title="Tunda" ${booking.status === 'pending' ? 'disabled' : ''}>
                            <i class="fas fa-clock"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="updateBookingStatus('${booking.bookingId}', 'cancelled')" title="Batalkan" ${booking.status === 'cancelled' ? 'disabled' : ''}>
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="deleteBooking('${booking.bookingId}')" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function viewBooking(bookingId) {
    const booking = bookings.find(b => b.bookingId === bookingId);
    if (!booking) {
        showNotification('Booking tidak ditemukan', 'error');
        return;
    }
    
    const appointmentDate = new Date(booking.appointmentInfo.datetime);
    const formattedDate = appointmentDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const servicesHTML = booking.serviceInfo?.selectedOptions ? 
        booking.serviceInfo.selectedOptions.map(option => `
            <div class="bg-light p-3 mb-2 rounded border-start border-4 border-primary">
                <div class="fw-bold small">${option.name || 'N/A'}</div>
                <div class="text-muted small">${option.price || 'N/A'}</div>
            </div>
        `).join('') : '';
    
    const content = `
        <div class="row">
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">ID Booking</label>
                <div class="form-control bg-light">${booking.bookingId || 'N/A'}</div>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Status</label>
                <div class="form-control bg-light">
                    <span class="status-badge status-${booking.status || 'pending'}">
                        ${getStatusText(booking.status)}
                    </span>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Nama Pasien</label>
                <div class="form-control bg-light">${booking.patientInfo?.name || 'N/A'}</div>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Telepon</label>
                <div class="form-control bg-light">${booking.patientInfo?.phone || 'N/A'}</div>
            </div>
        </div>
        
        <div class="mb-3">
            <label class="form-label fw-bold">Alamat</label>
            <div class="form-control bg-light" style="min-height: 80px;">${booking.patientInfo?.address || 'N/A'}</div>
        </div>
        
        <div class="mb-3">
            <label class="form-label fw-bold">Layanan</label>
            <div class="form-control bg-light">${booking.serviceInfo?.serviceName || 'N/A'}</div>
        </div>
        
        ${servicesHTML ? `
        <div class="mb-3">
            <label class="form-label fw-bold">Detail Layanan</label>
            ${servicesHTML}
        </div>
        ` : ''}
        
        <div class="row">
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Tanggal Perawatan</label>
                <div class="form-control bg-light">${formattedDate}</div>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Jam Perawatan</label>
                <div class="form-control bg-light">${booking.appointmentInfo?.time || 'N/A'}</div>
            </div>
        </div>
        
        <div class="mb-3">
            <label class="form-label fw-bold">Catatan</label>
            <div class="form-control bg-light" style="min-height: 80px;">${booking.patientInfo?.notes || 'Tidak ada catatan'}</div>
        </div>
        
        <div class="mb-3">
            <label class="form-label fw-bold">Tanggal Booking</label>
            <div class="form-control bg-light">${new Date(booking.bookingDate).toLocaleString('id-ID')}</div>
        </div>
        
        <div class="d-flex gap-2 justify-content-end mt-4">
            <button type="button" class="btn btn-primary" onclick="printBookingDetails('${booking.bookingId}')">
                <i class="fas fa-print me-1"></i> Cetak
            </button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="fas fa-times me-1"></i> Tutup
            </button>
        </div>
    `;
    
    // Create a temporary modal for viewing booking details
    const modalHTML = `
        <div class="modal fade" id="bookingDetailModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Detail Booking</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('bookingDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('bookingDetailModal'));
    modal.show();
}

function updateBookingStatus(bookingId, newStatus) {
    const bookingIndex = bookings.findIndex(b => b.bookingId === bookingId);
    if (bookingIndex === -1) {
        showNotification('Booking tidak ditemukan', 'error');
        return;
    }
    
    bookings[bookingIndex].status = newStatus;
    bookings[bookingIndex].lastUpdated = new Date().toISOString();
    
    saveData();
    displayAllBookings();
    displayRecentBookings();
    displayDashboardData();
    
    showNotification(`Status booking berhasil diubah menjadi ${getStatusText(newStatus)}`, 'success');
}

function deleteBooking(bookingId) {
    if (!confirm('Apakah Anda yakin ingin menghapus booking ini?')) {
        return;
    }
    
    const bookingIndex = bookings.findIndex(b => b.bookingId === bookingId);
    if (bookingIndex === -1) {
        showNotification('Booking tidak ditemukan', 'error');
        return;
    }
    
    bookings.splice(bookingIndex, 1);
    saveData();
    displayAllBookings();
    displayRecentBookings();
    displayDashboardData();
    
    showNotification('Booking berhasil dihapus', 'success');
}

function showAddBookingModal() {
    // Populate service options
    const serviceSelect = document.getElementById('newService');
    if (serviceSelect) {
        serviceSelect.innerHTML = '<option value="">Pilih Layanan</option>';
        
        Object.keys(services).forEach(serviceId => {
            const service = services[serviceId];
            if (service && service.title) {
                serviceSelect.innerHTML += `<option value="${serviceId}">${service.title}</option>`;
            }
        });
    }
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById('newAppointmentDate');
    if (dateInput) {
        dateInput.value = tomorrow.toISOString().split('T')[0];
        dateInput.min = new Date().toISOString().split('T')[0]; // Set min date to today
    }
    
    // Populate time options
    const timeSelect = document.getElementById('newAppointmentTime');
    if (timeSelect) {
        timeSelect.innerHTML = '<option value="">Pilih Jam</option>';
        
        for (let hour = 8; hour <= 17; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                if (hour === 17 && minute > 0) break;
                const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                timeSelect.innerHTML += `<option value="${time}">${time}</option>`;
            }
        }
    }
    
    const modal = new bootstrap.Modal(document.getElementById('addBookingModal'));
    modal.show();
}

// ===== SERVICE MANAGEMENT =====
function displayServiceCategories() {
    const tableBody = document.getElementById('serviceCategoriesTable');
    if (!tableBody) return;
    
    const serviceIds = Object.keys(services);
    
    if (serviceIds.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <i class="fas fa-concierge-bell fa-2x text-muted mb-2"></i>
                    <p class="text-muted">Tidak ada kategori layanan</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = serviceIds.map(serviceId => {
        const service = services[serviceId];
        const optionCount = service && service.options ? service.options.length : 0;
        
        return `
            <tr>
                <td>${serviceId}</td>
                <td>${service?.title || 'N/A'}</td>
                <td>${optionCount} layanan</td>
                <td>
                    <span class="status-badge status-confirmed">Aktif</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="editService('${serviceId}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteService('${serviceId}')" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function displayServiceOptions() {
    const grid = document.getElementById('serviceOptionsGrid');
    if (!grid) return;
    
    let allOptions = [];
    
    // Collect all service options from all categories
    Object.keys(services).forEach(serviceId => {
        const service = services[serviceId];
        if (service && service.options) {
            service.options.forEach(option => {
                allOptions.push({
                    ...option,
                    category: service.title,
                    categoryId: serviceId
                });
            });
        }
    });
    
    if (allOptions.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-4">
                <i class="fas fa-concierge-bell fa-2x text-muted mb-2"></i>
                <p class="text-muted">Tidak ada layanan</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = allOptions.map(option => {
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="service-option-card">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${option.name || 'N/A'}</h6>
                            <p class="text-muted small mb-1">${option.category || 'N/A'}</p>
                            <p class="fw-bold text-primary mb-0">${option.price || 'N/A'}</p>
                        </div>
                        <img src="${option.image || ''}" alt="${option.name || 'Service Image'}" 
                             class="service-option-image ms-3"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjhmOGY4IiByeD0iOCIvPgo8dGV4dCB4PSI0MCIgeT0iNDIiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2NjYyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gSW1nPC90ZXh0Pgo8L3N2Zz4K'">
                    </div>
                    <div class="d-flex gap-1">
                        <button class="btn btn-outline-primary btn-sm flex-fill" onclick="editServiceOption('${option.categoryId}', '${option.id}')" title="Edit">
                            <i class="fas fa-edit me-1"></i> Edit
                        </button>
                        <button class="btn btn-outline-danger btn-sm flex-fill" onclick="deleteServiceOption('${option.categoryId}', '${option.id}')" title="Hapus">
                            <i class="fas fa-trash me-1"></i> Hapus
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function showAddServiceModal() {
    const modal = new bootstrap.Modal(document.getElementById('addServiceModal'));
    modal.show();
}

function showAddServiceOptionModal() {
    // Populate service categories
    const serviceSelect = document.getElementById('newOptionService');
    if (serviceSelect) {
        serviceSelect.innerHTML = '<option value="">Pilih Kategori</option>';
        
        Object.keys(services).forEach(serviceId => {
            const service = services[serviceId];
            if (service && service.title) {
                serviceSelect.innerHTML += `<option value="${serviceId}">${service.title}</option>`;
            }
        });
    }
    
    const modal = new bootstrap.Modal(document.getElementById('addServiceOptionModal'));
    modal.show();
}

// ===== GALLERY MANAGEMENT =====
function displayGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    
    if (gallery.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-4">
                <i class="fas fa-images fa-2x text-muted mb-2"></i>
                <p class="text-muted">Tidak ada gambar di galeri</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = gallery.map((item, index) => {
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="gallery-item">
                    <img src="${item.url || ''}" alt="${item.title || 'Gallery Image'}" 
                         class="img-fluid rounded">
                    <div class="mt-2">
                        <h6 class="mb-1">${item.title || 'Tanpa Judul'}</h6>
                        <p class="text-muted small mb-2">${item.description || 'Tidak ada deskripsi'}</p>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteGalleryImage(${index})" title="Hapus Gambar">
                            <i class="fas fa-trash me-1"></i> Hapus
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function showAddGalleryModal() {
    const modal = new bootstrap.Modal(document.getElementById('addGalleryModal'));
    modal.show();
}

function deleteGalleryImage(index) {
    if (!confirm('Apakah Anda yakin ingin menghapus gambar ini dari galeri?')) {
        return;
    }
    
    gallery.splice(index, 1);
    saveData();
    displayGallery();
    
    showNotification('Gambar berhasil dihapus dari galeri', 'success');
}

// ===== FORM HANDLING =====
function setupForms() {
    // Add Booking Form
    const addBookingForm = document.getElementById('addBookingForm');
    if (addBookingForm) {
        addBookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const serviceId = document.getElementById('newService').value;
            const service = services[serviceId];
            
            if (!service) {
                showNotification('Pilih layanan yang valid', 'error');
                return;
            }
            
            const bookingData = {
                bookingId: 'BK' + Date.now(),
                patientInfo: {
                    name: document.getElementById('newPatientName').value,
                    phone: document.getElementById('newPatientPhone').value,
                    address: document.getElementById('newPatientAddress').value,
                    notes: document.getElementById('newPatientNotes').value || 'Tidak ada catatan'
                },
                appointmentInfo: {
                    date: document.getElementById('newAppointmentDate').value,
                    time: document.getElementById('newAppointmentTime').value,
                    datetime: new Date(document.getElementById('newAppointmentDate').value + 'T' + document.getElementById('newAppointmentTime').value).toISOString()
                },
                serviceInfo: {
                    serviceId: serviceId,
                    serviceName: service.title,
                    selectedOptions: []
                },
                status: 'pending',
                bookingDate: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };
            
            bookings.push(bookingData);
            saveData();
            displayAllBookings();
            displayRecentBookings();
            displayDashboardData();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addBookingModal'));
            modal.hide();
            this.reset();
            
            showNotification('Booking berhasil ditambahkan', 'success');
        });
    }
    
    // Add Service Form
    const addServiceForm = document.getElementById('addServiceForm');
    if (addServiceForm) {
        addServiceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const serviceId = document.getElementById('newServiceId').value.trim();
            const serviceTitle = document.getElementById('newServiceTitle').value.trim();
            const serviceDescription = document.getElementById('newServiceDescription').value.trim();
            
            if (!serviceId || !serviceTitle) {
                showNotification('ID dan nama kategori harus diisi', 'error');
                return;
            }
            
            if (services[serviceId]) {
                showNotification('ID layanan sudah ada', 'error');
                return;
            }
            
            services[serviceId] = {
                title: serviceTitle,
                description: serviceDescription,
                type: "checkbox",
                options: []
            };
            
            saveData();
            displayServiceCategories();
            displayServiceOptions();
            displayDashboardData();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addServiceModal'));
            modal.hide();
            this.reset();
            
            showNotification('Kategori layanan berhasil ditambahkan', 'success');
        });
    }
    
    // Add Service Option Form
    const addServiceOptionForm = document.getElementById('addServiceOptionForm');
    if (addServiceOptionForm) {
        addServiceOptionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const serviceId = document.getElementById('newOptionService').value;
            const optionId = document.getElementById('newOptionId').value.trim();
            const optionName = document.getElementById('newOptionName').value.trim();
            const optionPrice = document.getElementById('newOptionPrice').value.trim();
            const optionImage = document.getElementById('newOptionImage').value.trim();
            
            if (!services[serviceId]) {
                showNotification('Kategori layanan tidak valid', 'error');
                return;
            }
            
            if (!optionId || !optionName || !optionPrice) {
                showNotification('ID, nama, dan harga layanan harus diisi', 'error');
                return;
            }
            
            // Initialize options array if it doesn't exist
            if (!services[serviceId].options) {
                services[serviceId].options = [];
            }
            
            // Check if option ID already exists in this service
            if (services[serviceId].options.some(opt => opt.id === optionId)) {
                showNotification('ID layanan sudah ada dalam kategori ini', 'error');
                return;
            }
            
            services[serviceId].options.push({
                id: optionId,
                name: optionName,
                price: optionPrice,
                image: optionImage
            });
            
            saveData();
            displayServiceOptions();
            displayDashboardData();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addServiceOptionModal'));
            modal.hide();
            this.reset();
            
            showNotification('Layanan berhasil ditambahkan', 'success');
        });
    }
    
    // Add Gallery Form
    const addGalleryForm = document.getElementById('addGalleryForm');
    if (addGalleryForm) {
        addGalleryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const imageTitle = document.getElementById('newImageTitle').value.trim();
            const imageUrl = document.getElementById('newImageUrl').value.trim();
            const imageDescription = document.getElementById('newImageDescription').value.trim();
            
            if (!imageTitle || !imageUrl) {
                showNotification('Judul dan URL gambar harus diisi', 'error');
                return;
            }
            
            gallery.push({
                title: imageTitle,
                url: imageUrl,
                description: imageDescription,
                addedDate: new Date().toISOString()
            });
            
            saveData();
            displayGallery();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addGalleryModal'));
            modal.hide();
            this.reset();
            
            showNotification('Gambar berhasil ditambahkan ke galeri', 'success');
        });
    }
    
    // General Settings Form
    const generalSettingsForm = document.getElementById('generalSettingsForm');
    if (generalSettingsForm) {
        generalSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!settings.general) {
                settings.general = {};
            }
            
            settings.general = {
                clinicName: document.getElementById('clinicName').value,
                clinicAddress: document.getElementById('clinicAddress').value,
                clinicPhone: document.getElementById('clinicPhone').value,
                clinicEmail: document.getElementById('clinicEmail').value,
                businessHours: document.getElementById('businessHours').value
            };
            
            saveData();
            showNotification('Pengaturan umum berhasil disimpan', 'success');
        });
    }
    
    // Social Settings Form
    const socialSettingsForm = document.getElementById('socialSettingsForm');
    if (socialSettingsForm) {
        socialSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!settings.social) {
                settings.social = {};
            }
            
            settings.social = {
                instagram: document.getElementById('instagramAccounts').value.split(',').map(s => s.trim()).filter(s => s),
                facebook: document.getElementById('facebookAccounts').value.split(',').map(s => s.trim()).filter(s => s),
                youtube: document.getElementById('youtubeAccounts').value.split(',').map(s => s.trim()).filter(s => s),
                tiktok: document.getElementById('tiktokAccounts').value.split(',').map(s => s.trim()).filter(s => s)
            };
            
            saveData();
            showNotification('Pengaturan media sosial berhasil disimpan', 'success');
        });
    }
}

function loadSettingsIntoForms() {
    // Load general settings
    if (settings.general) {
        const clinicName = document.getElementById('clinicName');
        const clinicAddress = document.getElementById('clinicAddress');
        const clinicPhone = document.getElementById('clinicPhone');
        const clinicEmail = document.getElementById('clinicEmail');
        const businessHours = document.getElementById('businessHours');
        
        if (clinicName && settings.general.clinicName) clinicName.value = settings.general.clinicName;
        if (clinicAddress && settings.general.clinicAddress) clinicAddress.value = settings.general.clinicAddress;
        if (clinicPhone && settings.general.clinicPhone) clinicPhone.value = settings.general.clinicPhone;
        if (clinicEmail && settings.general.clinicEmail) clinicEmail.value = settings.general.clinicEmail;
        if (businessHours && settings.general.businessHours) businessHours.value = settings.general.businessHours;
    }
    
    // Load social settings
    if (settings.social) {
        const instagramAccounts = document.getElementById('instagramAccounts');
        const facebookAccounts = document.getElementById('facebookAccounts');
        const youtubeAccounts = document.getElementById('youtubeAccounts');
        const tiktokAccounts = document.getElementById('tiktokAccounts');
        
        if (instagramAccounts && settings.social.instagram) instagramAccounts.value = settings.social.instagram.join(', ');
        if (facebookAccounts && settings.social.facebook) facebookAccounts.value = settings.social.facebook.join(', ');
        if (youtubeAccounts && settings.social.youtube) youtubeAccounts.value = settings.social.youtube.join(', ');
        if (tiktokAccounts && settings.social.tiktok) tiktokAccounts.value = settings.social.tiktok.join(', ');
    }
}

// ===== UTILITY FUNCTIONS =====
function getStatusText(status) {
    const statusMap = {
        'pending': 'Menunggu',
        'confirmed': 'Dikonfirmasi',
        'cancelled': 'Dibatalkan'
    };
    return statusMap[status] || status || 'Menunggu';
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    if (notification && notificationText) {
        notificationText.textContent = message;
        
        // Remove existing alert classes
        notification.classList.remove('alert-primary', 'alert-success', 'alert-warning', 'alert-danger');
        
        // Set alert class based on type
        if (type === 'error') {
            notification.classList.add('alert-danger');
        } else if (type === 'success') {
            notification.classList.add('alert-success');
        } else if (type === 'warning') {
            notification.classList.add('alert-warning');
        } else {
            notification.classList.add('alert-primary');
        }
        
        notification.style.display = 'block';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }
}

function showAllBookings() {
    // Switch to bookings page
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const bookingsLink = document.querySelector('.nav-link[data-page="bookings"]');
    if (bookingsLink) {
        bookingsLink.classList.add('active');
    }
    
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const bookingsPage = document.getElementById('bookings');
    if (bookingsPage) {
        bookingsPage.classList.add('active');
        displayAllBookings();
    }
}

function exportBookings() {
    if (bookings.length === 0) {
        showNotification('Tidak ada data booking untuk diekspor', 'warning');
        return;
    }
    
    // Simple CSV export
    let csv = 'ID Booking,Nama Pasien,Telepon,Layanan,Tanggal,Jam,Status\n';
    
    bookings.forEach(booking => {
        csv += `"${booking.bookingId || ''}","${booking.patientInfo?.name || ''}","${booking.patientInfo?.phone || ''}","${booking.serviceInfo?.serviceName || ''}","${booking.appointmentInfo?.date || ''}","${booking.appointmentInfo?.time || ''}","${getStatusText(booking.status)}"\n`;
    });
    
    try {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookings-alracare-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Data booking berhasil diekspor', 'success');
    } catch (error) {
        console.error('Error exporting bookings:', error);
        showNotification('Error saat mengekspor data', 'error');
    }
}

function printBookingDetails(bookingId) {
    const booking = bookings.find(b => b.bookingId === bookingId);
    if (!booking) {
        showNotification('Booking tidak ditemukan', 'error');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showNotification('Tidak dapat membuka jendela print. Pastikan pop-up diizinkan.', 'error');
        return;
    }
    
    const servicesHTML = booking.serviceInfo?.selectedOptions ? 
        booking.serviceInfo.selectedOptions.map(option => `
            <div style="background: #f9f9f9; padding: 12px; margin: 8px 0; border-radius: 8px; border-left: 4px solid #3498db;">
                <div style="font-weight: bold; font-size: 14px;">${option.name || 'N/A'}</div>
                <div style="color: #666; font-size: 13px;">${option.price || 'N/A'}</div>
            </div>
        `).join('') : '';
    
    const printContent = `
        <!DOCTYPE html>
        <html>
            <head>
                <title>Booking Details - ${booking.bookingId}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 30px; line-height: 1.6; color: #333; }
                    .header { text-align: center; border-bottom: 4px solid #3498db; padding-bottom: 20px; margin-bottom: 30px; }
                    .details { margin: 30px 0; }
                    .detail-item { margin: 15px 0; padding: 12px 0; border-bottom: 2px solid #eee; display: flex; justify-content: space-between; font-size: 14px; }
                    .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; padding-top: 20px; border-top: 2px solid #ddd; }
                    .status { background: #fff3e0; color: #f39c12; padding: 6px 15px; border-radius: 25px; font-weight: bold; font-size: 12px; border: 2px solid #f39c12; display: inline-block; }
                    @media print { 
                        body { margin: 20px; }
                        .header { border-bottom-color: #000; }
                        .footer { page-break-inside: avoid; }
                    }
                    @page { margin: 1cm; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 style="margin: 0; color: #3498db; font-size: 28px;">Alra Care</h1>
                    <h2 style="margin: 10px 0; color: #333; font-size: 22px;">Detail Booking</h2>
                    <p style="margin: 0; color: #666; font-size: 16px;">Kesehatan & Kecantikan Profesional</p>
                </div>
                <div class="details">
                    <div class="detail-item"><strong>Nomor Booking:</strong> <span>${booking.bookingId || 'N/A'}</span></div>
                    <div class="detail-item"><strong>Nama Pasien:</strong> <span>${booking.patientInfo?.name || 'N/A'}</span></div>
                    <div class="detail-item"><strong>Telepon:</strong> <span>${booking.patientInfo?.phone || 'N/A'}</span></div>
                    <div class="detail-item"><strong>Alamat:</strong> <span>${booking.patientInfo?.address || 'N/A'}</span></div>
                    <div class="detail-item"><strong>Tanggal:</strong> <span>${booking.appointmentInfo?.date || 'N/A'}</span></div>
                    <div class="detail-item"><strong>Jam:</strong> <span>${booking.appointmentInfo?.time || 'N/A'}</span></div>
                    <div class="detail-item">
                        <strong>Layanan:</strong> 
                        <span>${booking.serviceInfo?.serviceName || 'N/A'}</span>
                    </div>
                    ${servicesHTML}
                    <div class="detail-item"><strong>Catatan:</strong> <span>${booking.patientInfo?.notes || 'Tidak ada catatan'}</span></div>
                    <div class="detail-item"><strong>Status:</strong> <span class="status">${getStatusText(booking.status)}</span></div>
                </div>
                <div class="footer">
                    <p style="font-weight: bold; font-size: 14px;">Harap datang 15 menit sebelum jadwal perawatan</p>
                    <p>Bawa bukti booking ini saat datang ke klinik</p>
                    <p>Terima kasih atas kepercayaan Anda kepada Alra Care</p>
                    <p>Jl. Akcaya, Pontianak • 0813-8122-3811</p>
                    <p>www.alracare.com • rahmadramadhanaswin@gmail.com</p>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() {
                            window.close();
                        }, 1000);
                    };
                </script>
            </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// Placeholder functions for future implementation
function editService(serviceId) {
    showNotification('Fitur edit layanan akan segera tersedia', 'info');
}

function deleteService(serviceId) {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori layanan ini? Semua layanan dalam kategori ini juga akan dihapus.')) {
        return;
    }
    
    delete services[serviceId];
    saveData();
    displayServiceCategories();
    displayServiceOptions();
    displayDashboardData();
    
    showNotification('Kategori layanan berhasil dihapus', 'success');
}

function editServiceOption(categoryId, optionId) {
    showNotification('Fitur edit layanan akan segera tersedia', 'info');
}

function deleteServiceOption(categoryId, optionId) {
    if (!confirm('Apakah Anda yakin ingin menghapus layanan ini?')) {
        return;
    }
    
    const service = services[categoryId];
    if (service && service.options) {
        const optionIndex = service.options.findIndex(opt => opt.id === optionId);
        if (optionIndex !== -1) {
            service.options.splice(optionIndex, 1);
            saveData();
            displayServiceOptions();
            displayDashboardData();
            
            showNotification('Layanan berhasil dihapus', 'success');
        }
    }
}

// Export functions for global access
window.viewBooking = viewBooking;
window.updateBookingStatus = updateBookingStatus;
window.deleteBooking = deleteBooking;
window.showAddBookingModal = showAddBookingModal;
window.showAddServiceModal = showAddServiceModal;
window.showAddServiceOptionModal = showAddServiceOptionModal;
window.showAddGalleryModal = showAddGalleryModal;
window.deleteGalleryImage = deleteGalleryImage;
window.exportBookings = exportBookings;
window.showAllBookings = showAllBookings;
window.printBookingDetails = printBookingDetails;
window.editService = editService;
window.deleteService = deleteService;
window.editServiceOption = editServiceOption;
window.deleteServiceOption = deleteServiceOption;