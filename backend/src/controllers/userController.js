// controllers/userController.js
const User = require('../models/User'); // Ensure the model is imported

exports.getMyTeam = async (req, res) => {
  try {
    const managerId = req.user.id || req.user._id;

    const team = await User.find({ 
      'employmentDetails.reportingTo': managerId 
    })
    .populate('employmentDetails.reportingTo', 'personalDetails') 
    .select('-password -security.currentSessionId'); 

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

// --- UPGRADED: Comprehensive Dynamic Update Logic ---
exports.updateUserByHR = async (req, res) => {
  try {
    const { firstName, lastName, jobTitle, officeLocation, companyCode, role, reportingTo, salary, dateOfHire, isActive } = req.body;
    
    // 🚨 DYNAMIC UPDATE OBJECT: Only updates fields that are provided and not empty strings.
    // This explicitly prevents empty fields from wiping out existing database data!
    const updateData = {};
    
    if (firstName && firstName.trim() !== '') updateData['personalDetails.firstName'] = firstName.trim();
    if (lastName && lastName.trim() !== '') updateData['personalDetails.lastName'] = lastName.trim();
    if (jobTitle && jobTitle.trim() !== '') updateData['employmentDetails.jobTitle'] = jobTitle.trim();
    if (officeLocation && officeLocation.trim() !== '') updateData['employmentDetails.officeLocation'] = officeLocation.trim();
    
    if (companyCode !== undefined) {
      if (companyCode.trim() === '') return res.status(400).json({ success: false, message: "Company Code cannot be empty." });
      updateData['companyCode'] = companyCode.trim();
    }
    
    if (role && role.trim() !== '') updateData['security.role'] = role.trim();
    if (salary !== undefined && salary !== null && salary !== '') updateData['employmentDetails.salary'] = Number(salary);
    if (dateOfHire && dateOfHire.trim() !== '') updateData['employmentDetails.dateOfHire'] = dateOfHire;
    if (isActive !== undefined && isActive !== '') updateData['employmentDetails.isActive'] = isActive;

    // Handle reportingTo safely (Extracts ID and explicitly allows null for 'Unassigned')
    if (reportingTo !== undefined) {
      if (reportingTo === '' || reportingTo === 'unassigned' || reportingTo === null) {
        updateData['employmentDetails.reportingTo'] = null;
      } else if (typeof reportingTo === 'object' && reportingTo._id) {
        updateData['employmentDetails.reportingTo'] = reportingTo._id;
      } else {
        updateData['employmentDetails.reportingTo'] = reportingTo;
      }
    }

    // Failsafe: if nothing was changed, don't ping the database
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields provided to update." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.status(200).json({ success: true, message: "Employee updated successfully", data: updatedUser });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ success: false, message: "Error updating employee" });
  }
};
