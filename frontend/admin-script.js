// ===== GLOBAL VARIABLES =====
let bookings = [];
let services = {};
let gallery = [];
let settings = {};
let currentUser = null;

// ===== AUTHENTICATION =====
function checkAuthentication() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

async function verifyToken() {
    try {
        const response = await apiCall(API_CONFIG.ENDPOINTS.VERIFY);
        if (response.success) {
            currentUser = response.data.user;
            updateUserDisplay();
            return true;
        } else {
            logout();
            return false;
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        logout();
        return false;
    }
}

function updateUserDisplay() {
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement && currentUser) {
        userNameElement.textContent = currentUser.username || 'Administrator';
    }
}

function logout() {
    localStorage.removeItem('authToken');
    window.location.href = 'index.html';
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Alra Care Admin Panel (API Version) initialized');
    
    // Check authentication
    if (!checkAuthentication()) return;
    
    // Verify token
    const isValid = await verifyToken();
    if (!isValid) return;
    
    // Load data from API
    await loadAllData();
    
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
    loadSettingsIntoForms();
});

// ===== DATA MANAGEMENT - API INTEGRATION =====
async function loadAllData() {
    try {
        showNotification('⏳ Memuat data dari server...', 'info');
        
        // Load all data in parallel
        await Promise.all([
            loadBookings(),
            loadServices(),
            loadGallery(),
            loadSettings()
        ]);
        
        showNotification('✅ Data berhasil dimuat', 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('❌ Gagal memuat data dari server', 'error');
    }
}

async function loadBookings() {
    try {
        const response = await apiCall(API_CONFIG.ENDPOINTS.BOOKINGS);
        if (response.success) {
            bookings = response.data || [];
            console.log('Bookings loaded:', bookings.length);
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        bookings = [];
    }
}

async function loadServices() {
    try {
        const response = await apiCall(API_CONFIG.ENDPOINTS.SERVICES);
        if (response.success) {
            services = response.data || {};
            console.log('Services loaded:', Object.keys(services).length);
        }
    } catch (error) {
        console.error('Error loading services:', error);
        services = {};
    }
}

async function loadGallery() {
    try {
        const response = await apiCall(API_CONFIG.ENDPOINTS.GALLERY);
        if (response.success) {
            gallery = response.data || [];
            console.log('Gallery loaded:', gallery.length);
        }
    } catch (error) {
        console.error('Error loading gallery:', error);
        gallery = [];
    }
}

async function loadSettings() {
    try {
        const response = await apiCall(API_CONFIG.ENDPOINTS.SETTINGS);
        if (response.success) {
            settings = response.data || {};
            console.log('Settings loaded');
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        settings = {};
    }
}

// ===== NAVIGATION =====
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            const pageId = this.getAttribute('data-page');
            const targetPage = document.getElementById(pageId);
            if (targetPage) {
                targetPage.classList.add('active');
                
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
async function displayDashboardData() {
    try {
        // Get stats from API
        const response = await apiCall(API_CONFIG.ENDPOINTS.BOOKING_STATS);
        
        if (response.success && response.data) {
            const stats = response.data;
            
            const totalBookingsEl = document.getElementById('totalBookings');
            const todayBookingsEl = document.getElementById('todayBookings');
            const monthlyRevenueEl = document.getElementById('monthlyRevenue');
            const availableServicesEl = document.getElementById('availableServices');
            
            if (totalBookingsEl) totalBookingsEl.textContent = stats.total_bookings || 0;
            if (todayBookingsEl) todayBookingsEl.textContent = stats.pending_bookings || 0;
            if (monthlyRevenueEl) monthlyRevenueEl.textContent = 'Rp ' + (parseInt(stats.total_revenue) || 0).toLocaleString('id-ID');
            
            // Count services
            let serviceCount = 0;
            Object.keys(services).forEach(category => {
                if (services[category] && services[category].options) {
                    serviceCount += services[category].options.length;
                }
            });
            if (availableServicesEl) availableServicesEl.textContent = serviceCount;
        }
        
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
        const formattedDate = new Date(booking.appointment_date).toLocaleDateString('id-ID');
        
        return `
            <tr>
                <td>${booking.id || 'N/A'}</td>
                <td>${booking.patient_name || 'N/A'}</td>
                <td>${getServiceNames(booking.booking_services)}</td>
                <td>${formattedDate}</td>
                <td>
                    <span class="status-badge status-${booking.status || 'pending'}">
                        ${getStatusText(booking.status)}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewBooking('${booking.id}')" title="Lihat Detail">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="updateBookingStatus('${booking.id}', 'confirmed')" title="Konfirmasi" ${booking.status === 'confirmed' ? 'disabled' : ''}>
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getServiceNames(bookingServices) {
    if (!bookingServices || bookingServices.length === 0) return 'N/A';
    return bookingServices.map(s => s.service_name).join(', ');
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
    
    const sortedBookings = [...bookings].sort((a, b) => 
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
    
    tableBody.innerHTML = sortedBookings.map(booking => {
        const formattedDate = new Date(booking.appointment_date).toLocaleDateString('id-ID');
        
        return `
            <tr>
                <td>${booking.id || 'N/A'}</td>
                <td>${booking.patient_name || 'N/A'}</td>
                <td>${booking.patient_phone || 'N/A'}</td>
                <td>${getServiceNames(booking.booking_services)}</td>
                <td>${formattedDate} ${booking.appointment_time || ''}</td>
                <td>
                    <span class="status-badge status-${booking.status || 'pending'}">
                        ${getStatusText(booking.status)}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewBooking('${booking.id}')" title="Lihat Detail">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="updateBookingStatus('${booking.id}', 'confirmed')" title="Konfirmasi" ${booking.status === 'confirmed' ? 'disabled' : ''}>
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="updateBookingStatus('${booking.id}', 'pending')" title="Tunda" ${booking.status === 'pending' ? 'disabled' : ''}>
                            <i class="fas fa-clock"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="updateBookingStatus('${booking.id}', 'cancelled')" title="Batalkan" ${booking.status === 'cancelled' ? 'disabled' : ''}>
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="deleteBooking('${booking.id}')" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function viewBooking(bookingId) {
    try {
        const response = await apiCall(API_CONFIG.ENDPOINTS.BOOKING_BY_ID(bookingId));
        if (!response.success || !response.data) {
            showNotification('Booking tidak ditemukan', 'error');
            return;
        }
        
        const booking = response.data;
        const formattedDate = new Date(booking.appointment_date).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const servicesHTML = booking.booking_services ? 
            booking.booking_services.map(service => `
                <div class="bg-light p-3 mb-2 rounded border-start border-4 border-primary">
                    <div class="fw-bold small">${service.service_name || 'N/A'}</div>
                    <div class="text-muted small">${service.service_price || 'N/A'}</div>
                </div>
            `).join('') : '';
        
        const content = `
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">ID Booking</label>
                    <div class="form-control bg-light">${booking.id || 'N/A'}</div>
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
                    <div class="form-control bg-light">${booking.patient_name || 'N/A'}</div>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Telepon</label>
                    <div class="form-control bg-light">${booking.patient_phone || 'N/A'}</div>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="form-label fw-bold">Alamat</label>
                <div class="form-control bg-light" style="min-height: 80px;">${booking.patient_address || 'N/A'}</div>
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
                    <div class="form-control bg-light">${booking.appointment_time || 'N/A'}</div>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="form-label fw-bold">Catatan</label>
                <div class="form-control bg-light" style="min-height: 80px;">${booking.patient_notes || 'Tidak ada catatan'}</div>
            </div>
            
            <div class="mb-3">
                <label class="form-label fw-bold">Tanggal Booking</label>
                <div class="form-control bg-light">${new Date(booking.created_at).toLocaleString('id-ID')}</div>
            </div>
            
            <div class="d-flex gap-2 justify-content-end mt-4">
                <button type="button" class="btn btn-primary" onclick="printBookingDetails('${booking.id}')">
                    <i class="fas fa-print me-1"></i> Cetak
                </button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times me-1"></i> Tutup
                </button>
            </div>
        `;
        
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
        
        const existingModal = document.getElementById('bookingDetailModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('bookingDetailModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error viewing booking:', error);
        showNotification('Gagal memuat detail booking', 'error');
    }
}

async function updateBookingStatus(bookingId, newStatus) {
    try {
        showNotification('⏳ Mengupdate status...', 'info');
        
        const response = await apiCall(API_CONFIG.ENDPOINTS.BOOKING_STATUS(bookingId), {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.success) {
            await loadBookings();
            displayAllBookings();
            displayRecentBookings();
            displayDashboardData();
            showNotification(`✅ Status booking berhasil diubah menjadi ${getStatusText(newStatus)}`, 'success');
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        console.error('Error updating booking status:', error);
        showNotification('❌ Gagal mengupdate status booking', 'error');
    }
}

async function deleteBooking(bookingId) {
    if (!confirm('Apakah Anda yakin ingin menghapus booking ini?')) {
        return;
    }
    
    try {
        showNotification('⏳ Menghapus booking...', 'info');
        
        const response = await apiCall(API_CONFIG.ENDPOINTS.BOOKING_BY_ID(bookingId), {
            method: 'DELETE'
        });
        
        if (response.success) {
            await loadBookings();
            displayAllBookings();
            displayRecentBookings();
            displayDashboardData();
            showNotification('✅ Booking berhasil dihapus', 'success');
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        showNotification('❌ Gagal menghapus booking', 'error');
    }
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
    
    grid.innerHTML = gallery.map(item => {
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="gallery-item">
                    <img src="${item.image_url || ''}" alt="${item.title || 'Gallery Image'}" 
                         class="img-fluid rounded">
                    <div class="mt-2">
                        <h6 class="mb-1">${item.title || 'Tanpa Judul'}</h6>
                        <p class="text-muted small mb-2">${item.description || 'Tidak ada deskripsi'}</p>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteGalleryImage('${item.id}')" title="Hapus Gambar">
                            <i class="fas fa-trash me-1"></i> Hapus
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteGalleryImage(imageId) {
    if (!confirm('Apakah Anda yakin ingin menghapus gambar ini dari galeri?')) {
        return;
    }
    
    try {
        showNotification('⏳ Menghapus gambar...', 'info');
        
        const response = await apiCall(API_CONFIG.ENDPOINTS.GALLERY_BY_ID(imageId), {
            method: 'DELETE'
        });
        
        if (response.success) {
            await loadGallery();
            displayGallery();
            showNotification('✅ Gambar berhasil dihapus dari galeri', 'success');
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        console.error('Error deleting gallery image:', error);
        showNotification('❌ Gagal menghapus gambar', 'error');
    }
}

// ===== FORM HANDLING =====
function setupForms() {
    // Add Gallery Form
    const addGalleryForm = document.getElementById('addGalleryForm');
    if (addGalleryForm) {
        addGalleryForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const imageTitle = document.getElementById('newImageTitle').value.trim();
            const imageUrl = document.getElementById('newImageUrl').value.trim();
            const imageDescription = document.getElementById('newImageDescription').value.trim();
            
            if (!imageTitle || !imageUrl) {
                showNotification('Judul dan URL gambar harus diisi', 'error');
                return;
            }
            
            try {
                showNotification('⏳ Menambahkan gambar...', 'info');
                
                const response = await apiCall(API_CONFIG.ENDPOINTS.GALLERY, {
                    method: 'POST',
                    body: JSON.stringify({
                        title: imageTitle,
                        image_url: imageUrl,
                        description: imageDescription
                    })
                });
                
                if (response.success) {
                    await loadGallery();
                    displayGallery();
                    
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addGalleryModal'));
                    modal.hide();
                    this.reset();
                    
                    showNotification('✅ Gambar berhasil ditambahkan ke galeri', 'success');
                } else {
                    throw new Error(response.message);
                }
            } catch (error) {
                console.error('Error adding gallery image:', error);
                showNotification('❌ Gagal menambahkan gambar', 'error');
            }
        });
    }
    
    // General Settings Form
    const generalSettingsForm = document.getElementById('generalSettingsForm');
    if (generalSettingsForm) {
        generalSettingsForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                showNotification('⏳ Menyimpan pengaturan...', 'info');
                
                const settingsData = {
                    clinic_name: document.getElementById('clinicName').value,
                    clinic_address: document.getElementById('clinicAddress').value,
                    clinic_phone: document.getElementById('clinicPhone').value,
                    clinic_email: document.getElementById('clinicEmail').value,
                    business_hours: document.getElementById('businessHours').value
                };
                
                const response = await apiCall(API_CONFIG.ENDPOINTS.SETTINGS, {
                    method: 'PUT',
                    body: JSON.stringify({ settings: settingsData })
                });
                
                if (response.success) {
                    await loadSettings();
                    showNotification('✅ Pengaturan umum berhasil disimpan', 'success');
                } else {
                    throw new Error(response.message);
                }
            } catch (error) {
                console.error('Error saving settings:', error);
                showNotification('❌ Gagal menyimpan pengaturan', 'error');
            }
        });
    }
}

function loadSettingsIntoForms() {
    if (settings.general) {
        const clinicName = document.getElementById('clinicName');
        const clinicAddress = document.getElementById('clinicAddress');
        const clinicPhone = document.getElementById('clinicPhone');
        const clinicEmail = document.getElementById('clinicEmail');
        const businessHours = document.getElementById('businessHours');
        
        if (clinicName && settings.general.clinic_name) clinicName.value = settings.general.clinic_name;
        if (clinicAddress && settings.general.clinic_address) clinicAddress.value = settings.general.clinic_address;
        if (clinicPhone && settings.general.clinic_phone) clinicPhone.value = settings.general.clinic_phone;
        if (clinicEmail && settings.general.clinic_email) clinicEmail.value = settings.general.clinic_email;
        if (businessHours && settings.general.business_hours) businessHours.value = settings.general.business_hours;
    }
}

// ===== UTILITY FUNCTIONS =====
function getStatusText(status) {
    const statusMap = {
        'pending': 'Menunggu',
        'confirmed': 'Dikonfirmasi',
        'completed': 'Selesai',
        'cancelled': 'Dibatalkan'
    };
    return statusMap[status] || status || 'Menunggu';
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    if (notification && notificationText) {
        notificationText.textContent = message;
        
        notification.classList.remove('alert-primary', 'alert-success', 'alert-warning', 'alert-danger');
        
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
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }
}

function showAllBookings() {
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

async function exportBookings() {
    if (bookings.length === 0) {
        showNotification('Tidak ada data booking untuk diekspor', 'warning');
        return;
    }
    
    let csv = 'ID Booking,Nama Pasien,Telepon,Layanan,Tanggal,Jam,Status\n';
    
    bookings.forEach(booking => {
        csv += `"${booking.id || ''}","${booking.patient_name || ''}","${booking.patient_phone || ''}","${getServiceNames(booking.booking_services)}","${booking.appointment_date || ''}","${booking.appointment_time || ''}","${getStatusText(booking.status)}"\n`;
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
        
        showNotification('✅ Data booking berhasil diekspor', 'success');
    } catch (error) {
        console.error('Error exporting bookings:', error);
        showNotification('❌ Error saat mengekspor data', 'error');
    }
}

async function printBookingDetails(bookingId) {
    try {
        const response = await apiCall(API_CONFIG.ENDPOINTS.BOOKING_BY_ID(bookingId));
        if (!response.success || !response.data) {
            showNotification('Booking tidak ditemukan', 'error');
            return;
        }
        
        const booking = response.data;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showNotification('Tidak dapat membuka jendela print. Pastikan pop-up diizinkan.', 'error');
            return;
        }
        
        const servicesHTML = booking.booking_services ? booking.booking_services.map(service => `
            <div style="background: #f9f9f9; padding: 12px; margin: 8px 0; border-radius: 8px; border-left: 4px solid #3498db;">
                <div style="font-weight: bold; font-size: 14px;">${service.service_name || 'N/A'}</div>
                <div style="color: #666; font-size: 13px;">${service.service_price || 'N/A'}</div>
            </div>
        `).join('') : '';
        
        const printContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Booking Details - ${booking.id}</title>
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
                        <div class="detail-item"><strong>Nomor Booking:</strong> <span>${booking.id || 'N/A'}</span></div>
                        <div class="detail-item"><strong>Nama Pasien:</strong> <span>${booking.patient_name || 'N/A'}</span></div>
                        <div class="detail-item"><strong>Telepon:</strong> <span>${booking.patient_phone || 'N/A'}</span></div>
                        <div class="detail-item"><strong>Alamat:</strong> <span>${booking.patient_address || 'N/A'}</span></div>
                        <div class="detail-item"><strong>Tanggal:</strong> <span>${booking.appointment_date || 'N/A'}</span></div>
                        <div class="detail-item"><strong>Jam:</strong> <span>${booking.appointment_time || 'N/A'}</span></div>
                        ${servicesHTML}
                        <div class="detail-item"><strong>Catatan:</strong> <span>${booking.patient_notes || 'Tidak ada catatan'}</span></div>
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
    } catch (error) {
        console.error('Error printing booking:', error);
        showNotification('❌ Gagal mencetak booking', 'error');
    }
}

function showAddGalleryModal() {
    const modal = new bootstrap.Modal(document.getElementById('addGalleryModal'));
    modal.show();
}

// Placeholder functions
function editService(serviceId) {
    showNotification('Fitur edit layanan akan segera tersedia', 'info');
}

function deleteService(serviceId) {
    showNotification('Fitur hapus kategori layanan akan segera tersedia', 'info');
}

function editServiceOption(categoryId, optionId) {
    showNotification('Fitur edit layanan akan segera tersedia', 'info');
}

function deleteServiceOption(categoryId, optionId) {
    showNotification('Fitur hapus layanan akan segera tersedia', 'info');
}

function showAddBookingModal() {
    showNotification('Fitur tambah booking manual akan segera tersedia', 'info');
}

function showAddServiceModal() {
    showNotification('Fitur tambah kategori layanan akan segera tersedia', 'info');
}

function showAddServiceOptionModal() {
    showNotification('Fitur tambah layanan akan segera tersedia', 'info');
}

// Export functions for global access
window.viewBooking = viewBooking;
window.updateBookingStatus = updateBookingStatus;
window.deleteBooking = deleteBooking;
window.deleteGalleryImage = deleteGalleryImage;
window.exportBookings = exportBookings;
window.showAllBookings = showAllBookings;
window.printBookingDetails = printBookingDetails;
window.showAddGalleryModal = showAddGalleryModal;
window.showAddBookingModal = showAddBookingModal;
window.showAddServiceModal = showAddServiceModal;
window.showAddServiceOptionModal = showAddServiceOptionModal;
window.editService = editService;
window.deleteService = deleteService;
window.editServiceOption = editServiceOption;
window.deleteServiceOption = deleteServiceOption;
window.logout = logout;