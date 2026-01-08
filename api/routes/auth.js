const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password harus diisi'
      });
    }

    // Call Supabase authentication function
    const { data, error } = await supabase.rpc('authenticate_user', {
      input_username: username,
      input_password: password
    });

    if (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error saat autentikasi'
      });
    }

    // Check if authentication was successful
    const authResult = data && data.length > 0 ? data[0] : null;

    if (!authResult || !authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult?.message || 'Username atau password salah'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: authResult.user_id,
        username: authResult.username,
        role: authResult.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: authResult.user_id,
          username: authResult.username,
          full_name: authResult.full_name,
          role: authResult.role
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Token tidak valid atau sudah expired'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.user_id,
            username: user.username,
            role: user.role
          }
        }
      });
    });

  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;