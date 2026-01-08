const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all gallery images
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengambil data galeri'
    });
  }
});

// Get single gallery image by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Gambar tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Get gallery image error:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengambil data gambar'
    });
  }
});

// Add new gallery image (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, image_url, category } = req.body;

    if (!title || !image_url) {
      return res.status(400).json({
        success: false,
        message: 'Judul dan URL gambar harus diisi'
      });
    }

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('gallery')
      .insert([{
        title,
        description,
        image_url,
        category,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Gambar berhasil ditambahkan',
      data
    });

  } catch (error) {
    console.error('Create gallery error:', error);
    res.status(500).json({
      success: false,
      message: 'Error menambahkan gambar'
    });
  }
});

// Update gallery image (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image_url, category, is_active } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (category !== undefined) updateData.category = category;
    if (is_active !== undefined) updateData.is_active = is_active;

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('gallery')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Gambar berhasil diupdate',
      data
    });

  } catch (error) {
    console.error('Update gallery error:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengupdate gambar'
    });
  }
});

// Delete gallery image (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const client = supabaseAdmin || supabase;
    const { error } = await client
      .from('gallery')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Gambar berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete gallery error:', error);
    res.status(500).json({
      success: false,
      message: 'Error menghapus gambar'
    });
  }
});

module.exports = router;