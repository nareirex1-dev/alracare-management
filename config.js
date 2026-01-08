// ===== API CONFIGURATION =====
const API_CONFIG = {
    BASE_URL: window.location.origin, // Adjust this to your backend URL
    ENDPOINTS: {
        SERVICES: '/api/services',
        BOOKINGS: '/api/bookings',
        BOOKING_BY_ID: (id) => `/api/bookings/${id}`
    }
};

// ===== API CALL FUNCTION =====
async function apiCall(endpoint, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    try {
        const url = endpoint.startsWith('http') ? endpoint : `${API_CONFIG.BASE_URL}${endpoint}`;
        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}
