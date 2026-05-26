// controllers/userController.js
const User = require('../models/User'); // Ensure the model is imported

// backend/src/controllers/userController.js

exports.getMyTeam = async (req, res) => {
  try {
    // 1. Get the securely authenticated Manager's ID from the token
    const managerId = req.user.id || req.user._id;

    // 2. Query the database for anyone who reports to this specific manager
    const team = await User.find({ 
      'employmentDetails.reportingTo': managerId 
    }).select('-password -security.currentSessionId'); // Hide sensitive data

    // 3. Return the array of employees
    res.status(200).json({ success: true, data: team });
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({ success: false, message: 'Server error fetching team data.' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, message: "Employee deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting employee" });
  }
};

// --- UPGRADED: Added HR Update Logic ---
exports.updateUserByHR = async (req, res) => {
  try {
    const { firstName, lastName, jobTitle, companyCode, role, reportingTo } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          'personalDetails.firstName': firstName,
          'personalDetails.lastName': lastName,
          'employmentDetails.jobTitle': jobTitle,
          'employmentDetails.reportingTo': reportingTo || null,
          'companyCode': companyCode,
          'security.role': role
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.status(200).json({ success: true, message: "Employee updated successfully", data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating employee" });
  }
};