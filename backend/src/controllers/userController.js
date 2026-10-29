const User = require('../models/User');

exports.getMyTeam = async (req, res) => {
  try {
    const managerId = req.user.id || req.user._id;

    const team = await User.find({ 
      'employmentDetails.reportingTo': managerId,
      'employmentDetails.isDeleted': { $ne: true } 
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
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          'employmentDetails.isDeleted': true,
          'employmentDetails.isActive': false 
        } 
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({ success: true, message: "Employee moved to recycle bin successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting employee" });
  }
};

exports.restoreUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          'employmentDetails.isDeleted': false,
          'employmentDetails.isActive': true 
        } 
      },
      { new: true }
    );
    
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({ success: true, message: "Employee restored successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error restoring employee" });
  }
};

exports.updateUserByHR = async (req, res) => {
  try {
    // 🚨 FIX: Added executiveTo and secondaryRoles to the destructured body parameters
    const { firstName, lastName, jobTitle, officeLocation, companyCode, role, reportingTo, salary, dateOfHire, isActive, executiveTo, secondaryRoles } = req.body;
    
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

    if (reportingTo !== undefined) {
      if (reportingTo === '' || reportingTo === 'unassigned' || reportingTo === null) {
        updateData['employmentDetails.reportingTo'] = null;
      } else if (typeof reportingTo === 'object' && reportingTo._id) {
        updateData['employmentDetails.reportingTo'] = reportingTo._id;
      } else {
        updateData['employmentDetails.reportingTo'] = reportingTo;
      }
    }

    // 🚨 FIX: Explicitly handle and save the Executive Assignment
    if (executiveTo !== undefined) {
      if (executiveTo === '' || executiveTo === 'unassigned' || executiveTo === null) {
        updateData['employmentDetails.executiveTo'] = null;
      } else if (typeof executiveTo === 'object' && executiveTo._id) {
        updateData['employmentDetails.executiveTo'] = executiveTo._id;
      } else {
        updateData['employmentDetails.executiveTo'] = executiveTo;
      }
    }

    // 🚨 FIX: Explicitly handle secondary roles mapping
    if (secondaryRoles !== undefined && Array.isArray(secondaryRoles)) {
      updateData['security.secondaryRoles'] = secondaryRoles;
    }

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

exports.getExecutives = async (req, res) => {
  try {
    // 🚨 FIX: Query the correct 'security.role' path based on the User schema, and include secondary roles
    const executives = await User.find({
      $or: [
        { 'security.role': 'EXECUTIVE' },
        { 'security.secondaryRoles': 'EXECUTIVE' }
      ],
      'employmentDetails.isDeleted': { $ne: true }
    }).select('-password');

    res.status(200).json({ success: true, data: executives });
  } catch (error) {
    console.error("Executive Fetch Error:", error);
    res.status(500).json({ success: false, message: 'Server Error fetching executives.' });
  }
};