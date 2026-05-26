// controllers/userController.js
const User = require('../models/User'); // Ensure the model is imported

exports.getMyTeam = async (req, res) => {
  try {
    // req.user is populated by your authentication middleware
    const managerId = req.user._id; 
    
    // Only fetch employees where managerId matches the logged-in user
    const team = await User.find({ managerId: managerId });
    
    res.status(200).json({ success: true, data: team });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
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
    
   // Change this:
const updatedUser = await User.findByIdAndUpdate(
  req.params.id,
  {
    $set: {
      'personalDetails.firstName': firstName,
      'personalDetails.lastName': lastName,
      'employmentDetails.jobTitle': jobTitle,
      'employmentDetails.reportingTo': reportingTo || null,
      companyCode: companyCode,
      'security.role': role
    }
  },
  { returnDocument: 'after' } // UPDATED HERE
);

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.status(200).json({ success: true, message: "Employee updated successfully", data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating employee" });
  }
};