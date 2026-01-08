const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all service categories with their services
router.get('/', async (req, res) => {
  try {
    // Get all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('service_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (categoriesError) throw categoriesError;

    // Get all services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (servicesError) throw servicesError;

    // Group services by category
    const servicesByCategory = {};
    categories.forEach(category => {
      servicesByCategory[category.id] = {
        title: category.title,
        description: category.description,
        type: category.type,
        options: services
          .filter(service => service.category_id === category.id)
          .map(service => ({
            id: service.id,
            name: service.name,
            price: service.price,
            image: service.image_url
          }))
      };
    });

    res.json({
      success: true,
      data: servicesByCategory
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengambil data layanan'
    });
  }
});

// Get single service by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('services')
      .select('*, service_categories(*)')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Layanan tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengambil data layanan'
    });
  }
});

// Create new service (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category_id, name, price, price_numeric, image_url } = req.body;

    if (!category_id || !name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Category ID, nama, dan harga harus diisi'
      });
    }

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('services')
      .insert([{
        id: `${category_id}_${Date.now()}`,
        category_id,
        name,
        price,
        price_numeric: price_numeric || parseFloat(price.replace(/[^0-9]/g, '')),
        image_url,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Layanan berhasil ditambahkan',
      data
    });

  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Error menambahkan layanan'
    });
  }
});

// Update service (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, price_numeric, image_url, is_active } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (price_numeric !== undefined) updateData.price_numeric = price_numeric;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (is_active !== undefined) updateData.is_active = is_active;

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Layanan berhasil diupdate',
      data
    });

  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengupdate layanan'
    });
  }
});

// Delete service (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const client = supabaseAdmin || supabase;
    const { error } = await client
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Layanan berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Error menghapus layanan'
    });
  }
});

module.exports = router;