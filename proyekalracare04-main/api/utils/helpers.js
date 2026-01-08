// Helper functions for API

// Parse price string to numeric value
function parsePrice(priceString) {
  if (!priceString) return 0;
  const match = priceString.match(/(\d+\.?\d*)/g);
  return match ? parseInt(match[0].replace(/\./g, '')) : 0;
}

// Format price to Indonesian Rupiah
function formatPrice(price) {
  return 'Rp ' + price.toLocaleString('id-ID');
}

// Generate booking ID
function generateBookingId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `BK${timestamp}${random}`;
}

// Validate phone number (Indonesian format)
function validatePhone(phone) {
  const phoneRegex = /^[0-9]{10,13}$/;
  return phoneRegex.test(phone);
}

// Validate email
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Format date to Indonesian locale
function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Check if date is in the past
function isPastDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

// Sanitize input to prevent XSS
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

module.exports = {
  parsePrice,
  formatPrice,
  generateBookingId,
  validatePhone,
  validateEmail,
  formatDate,
  isPastDate,
  sanitizeInput
};