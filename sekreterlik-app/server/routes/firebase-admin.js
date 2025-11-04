// Firebase Admin SDK Routes
// Bu endpoint'ler Firebase Auth yönetimi için kullanılır
const express = require('express');
const router = express.Router();
const admin = require('../config/firebase-admin');
const { authenticateToken } = require('../middleware/auth');

// Kullanıcı silme (Firebase Auth'dan)
router.delete('/users/:uid', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı UID gerekli'
      });
    }

    // Firebase Auth'dan kullanıcıyı sil
    await admin.auth().deleteUser(uid);
    
    console.log('✅ Firebase Auth user deleted:', uid);
    
    res.json({
      success: true,
      message: 'Kullanıcı Firebase Auth\'dan silindi',
      uid
    });
  } catch (error) {
    console.error('Delete Firebase Auth user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı silinirken hata oluştu: ' + error.message
    });
  }
});

// Kullanıcı şifresini güncelle
router.put('/users/:uid/password', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.params;
    const { password } = req.body;
    
    if (!uid || !password) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı UID ve şifre gerekli'
      });
    }

    // Firebase Auth'da kullanıcı şifresini güncelle
    await admin.auth().updateUser(uid, {
      password: password
    });
    
    console.log('✅ Firebase Auth user password updated:', uid);
    
    res.json({
      success: true,
      message: 'Kullanıcı şifresi güncellendi',
      uid
    });
  } catch (error) {
    console.error('Update Firebase Auth user password error:', error);
    res.status(500).json({
      success: false,
      message: 'Şifre güncellenirken hata oluştu: ' + error.message
    });
  }
});

// Kullanıcı email/username'ini güncelle
router.put('/users/:uid/email', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.params;
    const { email } = req.body;
    
    if (!uid || !email) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı UID ve email gerekli'
      });
    }

    // Firebase Auth'da kullanıcı email'ini güncelle
    await admin.auth().updateUser(uid, {
      email: email
    });
    
    console.log('✅ Firebase Auth user email updated:', uid, email);
    
    res.json({
      success: true,
      message: 'Kullanıcı email\'i güncellendi',
      uid,
      email
    });
  } catch (error) {
    console.error('Update Firebase Auth user email error:', error);
    res.status(500).json({
      success: false,
      message: 'Email güncellenirken hata oluştu: ' + error.message
    });
  }
});

// Kullanıcı bilgilerini al
router.get('/users/:uid', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı UID gerekli'
      });
    }

    // Firebase Auth'dan kullanıcı bilgilerini al
    const userRecord = await admin.auth().getUser(uid);
    
    res.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        metadata: {
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime
        }
      }
    });
  } catch (error) {
    console.error('Get Firebase Auth user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgileri alınırken hata oluştu: ' + error.message
    });
  }
});

// Tüm kullanıcıları listele (sayfalama ile)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const { maxResults = 1000, pageToken } = req.query;
    
    // Firebase Auth'dan kullanıcıları listele
    const listUsersResult = await admin.auth().listUsers(
      parseInt(maxResults),
      pageToken
    );
    
    const users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime
      }
    }));
    
    res.json({
      success: true,
      users,
      pageToken: listUsersResult.pageToken,
      total: users.length
    });
  } catch (error) {
    console.error('List Firebase Auth users error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar listelenirken hata oluştu: ' + error.message
    });
  }
});

module.exports = router;

