// Mock API layer for GenuineGrads University Admin Dashboard
// This simulates backend API calls until real backend is implemented

import {
  mockStudents,
  mockCourses,
  mockPendingCertificates,
  mockMintLogs,
  mockGlobalStudents,
  generateId,
  generateNicHash,
  generateMintAddress,
  generateIpfsUrl,
  generateTransactionHash,
  validateEmail,
  validateNIC,
  validateGPA,
  isNicHashUnique
} from './mock-data-clean';

// In-memory storage (simulates database)
let students = [...mockStudents];
let courses = [...mockCourses];
let pendingCertificates = [...mockPendingCertificates];
let mintLogs = [...mockMintLogs];
let globalStudents = [...mockGlobalStudents];

// Simulate API delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Students API
export const studentsAPI = {
  // Get all students
  getAll: async () => {
    await delay();
    return { success: true, data: students };
  },

  // Get student by ID
  getById: async (id) => {
    await delay();
    const student = students.find(s => s.id === id);
    return { success: !!student, data: student };
  },

  // Add new student
  create: async (studentData) => {
    await delay();
    
    // Validation
    const errors = [];
    if (!studentData.name) errors.push('Name is required');
    if (!studentData.nic) errors.push('NIC is required');
    if (!studentData.email) errors.push('Email is required');
    if (!studentData.program) errors.push('Program is required');
    
    if (!validateEmail(studentData.email)) {
      errors.push('Invalid email format');
    }
    
    if (!validateNIC(studentData.nic)) {
      errors.push('Invalid NIC format');
    }
    
    if (studentData.gpa && !validateGPA(studentData.gpa)) {
      errors.push('GPA must be between 0 and 4.0');
    }
    
    if (errors.length > 0) {
      return { success: false, errors };
    }
    
    // Check for duplicate NIC
    const existingStudent = students.find(s => s.nic === studentData.nic);
    if (existingStudent) {
      return { success: false, errors: ['Student with this NIC already exists'] };
    }
    
    // Generate NIC hash and check global uniqueness
    const nicHash = generateNicHash(studentData.nic);
    if (!isNicHashUnique(nicHash, globalStudents)) {
      return { success: false, errors: ['NIC hash conflict - student may exist in another university'] };
    }
    
    // Create new student
    const newStudent = {
      id: generateId('stu'),
      nicHash,
      gpa: studentData.gpa || 0,
      achievements: studentData.achievements ? studentData.achievements.split(',').map(a => a.trim()) : [],
      walletConnected: !!studentData.walletAddress,
      walletAddress: studentData.walletAddress || null,
      dateAdded: new Date().toISOString().split('T')[0],
      certificates: 0,
      ...studentData
    };
    
    students.push(newStudent);
    
    // Add to global students index
    globalStudents.push({
      nicHash,
      universityId: 'uni-xyz', // This would come from session
      studentId: newStudent.id,
      globalId: generateId('global')
    });
    
    return { success: true, data: newStudent };
  },

  // Bulk create students from CSV
  bulkCreate: async (csvData) => {
    await delay(1000); // Longer delay for bulk operations
    
    const results = {
      success: [],
      errors: [],
      total: csvData.length
    };
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // +2 because we start from line 2 and index starts at 0
      
      try {
        const result = await studentsAPI.create({
          name: row.name,
          nic: row.nic,
          email: row.email,
          program: row.program,
          achievements: row.achievements,
          gpa: row.gpa,
          walletAddress: row.walletAddress
        });
        
        if (result.success) {
          results.success.push({
            rowNumber,
            student: result.data
          });
        } else {
          results.errors.push({
            rowNumber,
            errors: result.errors
          });
        }
      } catch (error) {
        results.errors.push({
          rowNumber,
          errors: ['Unexpected error processing row']
        });
      }
    }
    
    return results;
  },

  // Update student
  update: async (id, updates) => {
    await delay();
    const index = students.findIndex(s => s.id === id);
    if (index === -1) {
      return { success: false, error: 'Student not found' };
    }
    
    students[index] = { ...students[index], ...updates };
    return { success: true, data: students[index] };
  },

  // Delete student
  delete: async (id) => {
    await delay();
    const index = students.findIndex(s => s.id === id);
    if (index === -1) {
      return { success: false, error: 'Student not found' };
    }
    
    students.splice(index, 1);
    return { success: true };
  }
};

// Certificates API
export const certificatesAPI = {
  // Get all pending certificates
  getPending: async () => {
    await delay();
    return { success: true, data: pendingCertificates };
  },

  // Get certificates ready for issuance
  getReadyForIssuance: async () => {
    await delay();
    const ready = pendingCertificates.filter(cert => cert.issueReady && !cert.mintAddress);
    return { success: true, data: ready };
  },

  // Issue certificate (mint cNFT)
  issue: async (certificateId) => {
    await delay(2000); // Simulate blockchain transaction time
    
    const certIndex = pendingCertificates.findIndex(c => c.id === certificateId);
    if (certIndex === -1) {
      return { success: false, error: 'Certificate not found' };
    }
    
    const certificate = pendingCertificates[certIndex];
    if (!certificate.issueReady) {
      return { success: false, error: 'Certificate not ready for issuance' };
    }
    
    if (certificate.mintAddress) {
      return { success: false, error: 'Certificate already issued' };
    }
    
    // Generate mint data
    const mintAddress = generateMintAddress();
    const ipfsMetadataUrl = generateIpfsUrl();
    const timestamp = new Date().toISOString();
    const transactionHash = generateTransactionHash();
    
    // Update certificate
    pendingCertificates[certIndex] = {
      ...certificate,
      mintAddress,
      ipfsMetadataUrl,
      timestamp
    };
    
    // Log mint activity
    const mintLog = {
      id: generateId('mint'),
      certificateId,
      studentId: certificate.studentId,
      mintAddress,
      ipfsMetadataUrl,
      timestamp,
      status: 'success',
      gasUsed: 0.001,
      transactionHash
    };
    
    mintLogs.push(mintLog);
    
    return {
      success: true,
      data: {
        certificate: pendingCertificates[certIndex],
        mintLog
      }
    };
  },

  // Bulk issue certificates
  bulkIssue: async (certificateIds) => {
    await delay(3000); // Longer delay for bulk operations
    
    const results = {
      success: [],
      errors: [],
      total: certificateIds.length
    };
    
    for (const certificateId of certificateIds) {
      try {
        const result = await certificatesAPI.issue(certificateId);
        if (result.success) {
          results.success.push({
            certificateId,
            data: result.data
          });
        } else {
          results.errors.push({
            certificateId,
            error: result.error
          });
        }
      } catch (error) {
        results.errors.push({
          certificateId,
          error: 'Unexpected error during issuance'
        });
      }
    }
    
    return results;
  },

  // Revoke certificate
  revoke: async (certificateId) => {
    await delay();
    const certIndex = pendingCertificates.findIndex(c => c.id === certificateId);
    if (certIndex === -1) {
      return { success: false, error: 'Certificate not found' };
    }
    
    // In a real system, this would interact with the blockchain
    // For now, we'll just mark it as revoked in our mock data
    pendingCertificates[certIndex] = {
      ...pendingCertificates[certIndex],
      status: 'revoked',
      revokedAt: new Date().toISOString()
    };
    
    return { success: true, data: pendingCertificates[certIndex] };
  }
};

// Analytics API
export const analyticsAPI = {
  // Get dashboard statistics
  getDashboardStats: async () => {
    await delay();
    
    const totalStudents = students.length;
    const totalCertificates = pendingCertificates.length;
    const activeCertificates = pendingCertificates.filter(c => c.mintAddress && c.status !== 'revoked').length;
    const revokedCertificates = pendingCertificates.filter(c => c.status === 'revoked').length;
    
    return {
      success: true,
      data: {
        totalStudents,
        totalCertificates,
        activeCertificates,
        revokedCertificates,
        walletConnected: students.filter(s => s.walletConnected).length,
        walletUnconnected: students.filter(s => !s.walletConnected).length
      }
    };
  },

  // Get mint logs
  getMintLogs: async () => {
    await delay();
    return { success: true, data: mintLogs };
  },

  // Get recent certificates for dashboard
  getRecentCertificates: async () => {
    await delay();
    
    // Get recent certificates from mint logs and pending certificates
    const recentCerts = [];
    
    // Add from mint logs (already issued)
    mintLogs.forEach((log: any) => {
      const student = students.find(s => s.id === log.studentId);
      if (student) {
        recentCerts.push({
          id: log.id,
          studentName: student.name,
          title: 'Certificate Issued',
          status: 'Active',
          issueDate: new Date(log.timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        });
      }
    });
    
    // Add from pending certificates (recently created)
    pendingCertificates
      .filter(cert => cert.issueReady)
      .slice(0, 5)
      .forEach((cert: any) => {
        const student = students.find(s => s.id === cert.studentId);
        if (student) {
          recentCerts.push({
            id: cert.id,
            studentName: student.name,
            title: cert.certificateTitle,
            status: cert.mintAddress ? 'Active' : 'Pending',
            issueDate: cert.timestamp ? 
              new Date(cert.timestamp).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }) : 'Pending'
          });
        }
      });
    
    // Sort by date (most recent first) and take top 5
    return {
      success: true,
      data: recentCerts
        .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate))
        .slice(0, 5)
    };
  }
};

// Courses API
export const coursesAPI = {
  // Get all courses
  getAll: async () => {
    await delay();
    return { success: true, data: courses };
  },

  // Get courses by program
  getByProgram: async (program) => {
    await delay();
    const programCourses = courses.filter(c => c.program === program);
    return { success: true, data: programCourses };
  }
};

// Utility functions
export const apiUtils = {
  // Reset all data to initial state
  resetData: () => {
    students = [...mockStudents];
    courses = [...mockCourses];
    pendingCertificates = [...mockPendingCertificates];
    mintLogs = [...mockMintLogs];
    globalStudents = [...mockGlobalStudents];
  },

  // Get current data state (for debugging)
  getCurrentState: () => ({
    students,
    courses,
    pendingCertificates,
    mintLogs,
    globalStudents
  })
}; 