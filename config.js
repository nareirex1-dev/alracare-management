// API Configuration
const API_CONFIG = {
  // Change this to your Vercel deployment URL in production
  BASE_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : `${window.location.origin}/api`,
  
  ENDPOINTS: {
    // Auth
    LOGIN: '/auth/login',
    VERIFY: '/auth/verify',
    
    // Services
    SERVICES: '/services',
    SERVICE_BY_ID: (id) => `/services/${id}`,
    
    // Bookings
    BOOKINGS: '/bookings',
    BOOKING_BY_ID: (id) => `/bookings/${id}`,
    BOOKING_STATUS: (id) => `/bookings/${id}/status`,
    BOOKING_STATS: '/bookings/stats/dashboard',
    
    // Gallery
    GALLERY: '/gallery',
    GALLERY_BY_ID: (id) => `/gallery/${id}`,
    
    // Settings
    SETTINGS: '/settings',
    SETTING_BY_ID: (id) => `/settings/${id}`,
    SOCIAL_MEDIA: '/settings/social/accounts'
  }
};

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_CONFIG, apiCall };
}