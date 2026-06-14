// backend/src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authGuard } = require('../middleware/auth');

router.use(authGuard);

// GET /api/v1/notifications
router.get('/', async (req, res) => {
  try {
    // Now filters by both Recipient ID AND Active Portal Role
    const notifications = await Notification.find({ 
      recipient: req.user.id || req.user._id,
      targetRole: req.user.role 
    })
      .sort({ createdAt: -1 })
      .limit(50);
      
    res.status(200).json({ success: true, data: notifications });
  } catch (error) { 
    console.error("Fetch Notifications Error:", error);
    res.status(500).json({ success: false, message: 'Error fetching notifications' }); 
  }
});

router.patch('/mark-all-read', async (req, res) => {
  try {
    await Notification.updateMany(
      { 
        recipient: req.user.id || req.user._id, 
        targetRole: req.user.role, // Only clear the active dashboard
        isRead: false 
      }, 
      { $set: { isRead: true } }
    );
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'Error updating notifications' }); 
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id || req.user._id },
      { $set: { isRead: true } },
      { returnDocument: 'after' }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: notification });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'Error updating notification' }); 
  }
});

// 🚨 UPGRADE: Route to Clear/Delete ALL notifications for the current role
router.delete('/clear-all', async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient: req.user.id || req.user._id,
      targetRole: req.user.role
    });
    res.status(200).json({ success: true, message: 'All notifications cleared' });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'Error clearing notifications' }); 
  }
});

// 🚨 UPGRADE: Route to Clear/Delete an INDIVIDUAL notification
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id || req.user._id
    });
    if (!notification) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, message: 'Notification cleared' });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'Error clearing notification' }); 
  }
});

module.exports = router;