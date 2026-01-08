const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all bookings (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, date } = req.query;

    let query = supabase
      .from('bookings')
      .select(`
        *,
        booking_services (
          id,
          service_id,
          service_name,
          service_price,
          price_numeric,
          quantity
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (date) {
      query = query.eq('appointment_date', date);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengambil data booking'
    });
  }
});

// Get single booking by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_services (
          id,
          service_id,
          service_name,
          service_price,
          price_numeric,
          quantity
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Booking tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengambil data booking'
    });
  }
});

// Create new booking (Public)
router.post('/', async (req, res) => {
  try {
    const {
      patient_name,
      patient_phone,
      patient_address,
      patient_notes,
      appointment_date,
      appointment_time,
      selected_services
    } = req.body;

    // Validation
    if (!patient_name || !patient_phone || !patient_address || !appointment_date || !appointment_time || !selected_services || selected_services.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Data tidak lengkap'
      });
    }

    // Check for duplicate booking
    const { data: duplicateCheck } = await supabase.rpc('check_duplicate_booking', {
      p_phone: patient_phone,
      p_appointment_date: appointment_date
    });

    if (duplicateCheck) {
      return res.status(409).json({
        success: false,
        message: 'Anda sudah memiliki booking untuk tanggal yang sama'
      });
    }

    // Create booking
    const bookingId = 'BK' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const appointmentDatetime = new Date(`${appointment_date}T${appointment_time}:00`);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        id: bookingId,
        patient_name,
        patient_phone,
        patient_address,
        patient_notes,
        appointment_date,
        appointment_time,
        appointment_datetime: appointmentDatetime.toISOString(),
        status: 'pending'
      }])
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Create booking services
    const bookingServices = selected_services.map(service => ({
      booking_id: bookingId,
      service_id: service.id,
      service_name: service.name,
      service_price: service.price,
      price_numeric: parseFloat(service.price.replace(/[^0-9]/g, '')),
      quantity: 1
    }));

    const { error: servicesError } = await supabase
      .from('booking_services')
      .insert(bookingServices);

    if (servicesError) throw servicesError;

    // Get complete booking data
    const { data: completeBooking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_services (
          id,
          service_id,
          service_name,
          service_price,
          price_numeric,
          quantity
        )
      `)
      .eq('id', bookingId)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json({
      success: true,
      message: 'Booking berhasil dibuat',
      data: completeBooking
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error membuat booking'
    });
  }
});

// Update booking status (Admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }

    const updateData = { status };
    
    if (status === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Status booking berhasil diupdate',
      data
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengupdate status booking'
    });
  }
});

// Delete booking (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const client = supabaseAdmin || supabase;
    const { error } = await client
      .from('bookings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Booking berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error menghapus booking'
    });
  }
});

// Get booking statistics (Admin only)
router.get('/stats/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('get_daily_booking_stats', {
      p_date: today
    });

    if (error) throw error;

    res.json({
      success: true,
      data: data && data.length > 0 ? data[0] : {}
    });

  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengambil statistik booking'
    });
  }
});

module.exports = router;