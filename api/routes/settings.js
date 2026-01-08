const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all settings
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    let query = supabase
      .from('settings')
      .select('*');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform to key-value object
    const settings = {};
    data.forEach(setting => {
      if (!settings[setting.category]) {
        settings[setting.category] = {};
      }
      settings[setting.category][setting.id] = setting.value;
    });

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengambil pengaturan'
    });
  }
});

// Get single setting by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Pengaturan tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengambil pengaturan'
    });
  }
});

// Update settings (Admin only)
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Format pengaturan tidak valid'
      });
    }

    const client = supabaseAdmin || supabase;
    const updates = [];

    // Prepare updates
    for (const [key, value] of Object.entries(settings)) {
      updates.push(
        client
          .from('settings')
          .update({ value })
          .eq('id', key)
      );
    }

    // Execute all updates
    await Promise.all(updates);

    res.json({
      success: true,
      message: 'Pengaturan berhasil diupdate'
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengupdate pengaturan'
    });
  }
});

// Get social media accounts
router.get('/social/accounts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('social_media')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    // Group by platform
    const socialMedia = {};
    data.forEach(account => {
      if (!socialMedia[account.platform]) {
        socialMedia[account.platform] = [];
      }
      socialMedia[account.platform].push({
        name: account.account_name,
        url: account.account_url
      });
    });

    res.json({
      success: true,
      data: socialMedia
    });

  } catch (error) {
    console.error('Get social media error:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengambil data media sosial'
    });
  }
});

module.exports = router;