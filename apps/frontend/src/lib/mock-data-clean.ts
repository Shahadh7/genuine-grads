import { mockStudentData } from './mock-student-data';

// Mock data for GenuineGrads University Admin Dashboard
// This simulates the backend database until real APIs are implemented

export const mockPrograms = [
  'Bachelor of Computer Science',
  'Master of Computer Science',
  'Bachelor of Business Administration',
  'Master of Business Administration',
  'Bachelor of Engineering',
  'Master of Engineering',
  'PhD in Computer Science',
  'PhD in Engineering',
  'Bachelor of Arts',
  'Master of Arts',
  'Data Science Certificate',
  'Cybersecurity Certificate'
];

// Mock students data (simulates students.json)
export const mockStudents = [
  {
    id: 'stu-001',
    nic: 'NIC123456789',
    nicHash: 'hash_123456789_abc',
    name: 'John Doe',
    email: 'john.doe@student.edu',
    program: 'Bachelor of Computer Science',
    gpa: 3.8,
    achievements: ['Dean\'s List 2023', 'Hackathon Winner'],
    walletConnected: true,
    walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    dateAdded: '2024-01-15',
    certificates: 3
  },
  {
    id: 'stu-002',
    nic: 'NIC987654321',
    nicHash: 'hash_987654321_def',
    name: 'Jane Smith',
    email: 'jane.smith@student.edu',
    program: 'Master of Business Administration',
    gpa: 3.9,
    achievements: ['Academic Excellence Award'],
    walletConnected: false,
    walletAddress: null,
    dateAdded: '2024-02-20',
    certificates: 1
  },
  {
    id: 'stu-003',
    nic: 'NIC456789123',
    nicHash: 'hash_456789123_ghi',
    name: 'Mike Johnson',
    email: 'mike.johnson@student.edu',
    program: 'PhD in Engineering',
    gpa: 4.0,
    achievements: ['Research Grant Recipient', 'Best Paper Award'],
    walletConnected: true,
    walletAddress: '7XzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    dateAdded: '2024-03-10',
    certificates: 2
  }
];

// Mock courses data (simulates courses.json)
export const mockCourses = [
  {
    id: 'course-001',
    code: 'CS101',
    title: 'Introduction to Computer Science',
    program: 'Bachelor of Computer Science',
    credits: 3,
    semester: 'Fall 2024'
  },
  {
    id: 'course-002',
    code: 'CS201',
    title: 'Data Structures and Algorithms',
    program: 'Bachelor of Computer Science',
    credits: 4,
    semester: 'Spring 2024'
  },
  {
    id: 'course-003',
    code: 'MBA501',
    title: 'Business Strategy',
    program: 'Master of Business Administration',
    credits: 3,
    semester: 'Fall 2024'
  }
];

// Mock pending certificates data (simulates pendingCertificates.json)
export const mockPendingCertificates = [
  {
    id: 'cert-001',
    studentId: 'stu-001',
    enrollmentId: 'enr-123',
    certificateTitle: 'Bachelor of Computer Science',
    gpa: 3.8,
    badgeTitles: ['Dean\'s List 2023', 'Hackathon Winner'],
    issueReady: true,
    mintAddress: null,
    ipfsMetadataUrl: null,
    timestamp: null,
    zkpEnabled: false
  },
  {
    id: 'cert-002',
    studentId: 'stu-002',
    enrollmentId: 'enr-124',
    certificateTitle: 'Master of Business Administration',
    gpa: 3.9,
    badgeTitles: ['Academic Excellence Award'],
    issueReady: true,
    mintAddress: null,
    ipfsMetadataUrl: null,
    timestamp: null,
    zkpEnabled: true
  }
];

// Mock mint logs data (simulates mintLogs.json)
export const mockMintLogs = [
  {
    id: 'mint-001',
    certificateId: 'cert-005',
    studentId: 'stu-006',
    mintAddress: '5XzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    ipfsMetadataUrl: 'ipfs://QmXzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    timestamp: '2024-05-15T10:30:00Z',
    status: 'success',
    gasUsed: 0.001,
    transactionHash: '0x1234567890abcdef'
  }
];

// Mock global students index (simulates globalStudents.json)
export const mockGlobalStudents = [
  {
    nicHash: 'hash_123456789_abc',
    universityId: 'uni-xyz',
    studentId: 'stu-001',
    globalId: 'global-001'
  },
  {
    nicHash: 'hash_987654321_def',
    universityId: 'uni-xyz',
    studentId: 'stu-002',
    globalId: 'global-002'
  }
];

export const mockUniversityProfile = {
  id: 'uni-xyz',
  name: 'GenuineGrads University',
  email: 'admin@genuinegrads.edu',
  domain: 'genuinegrads.edu',
  admin: 'Dr. Jane Smith',
  phone: '+1 555 123 4567',
  wallet: '7wnLBEm3ftFJobu1yvv25JvyNVqzs4SEKYAfSbimCDN9',
  createdAt: '2024-01-15',
  logo: 'https://genuinegrads.edu/logo.png',
  stats: {
    activeCertificates: 1000,
    totalStudents: 10000,
    totalCertificates: 1000,
    totalRevoked: 100
  }
};

// Helper functions for data manipulation
export const generateId = (prefix) => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateNicHash = (nic) => {
  // Simple hash simulation - in real app this would be a proper hash
  return `hash_${nic}_${Math.random().toString(36).substr(2, 6)}`;
};

export const generateMintAddress = () => {
  // Generate a fake Solana address
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateIpfsUrl = () => {
  // Generate a fake IPFS URL
  const hash = Math.random().toString(36).substr(2, 46);
  return `ipfs://Qm${hash}`;
};

export const generateTransactionHash = () => {
  // Generate a fake transaction hash
  const chars = '0123456789abcdef';
  let result = '0x';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Validation functions
export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateNIC = (nic) => {
  // Basic NIC validation (adjust based on your country's format)
  return nic && nic.length >= 8;
};

export const validateGPA = (gpa) => {
  const num = parseFloat(gpa);
  return !isNaN(num) && num >= 0 && num <= 4.0;
};

export const isNicHashUnique = (nicHash, existingStudents = mockGlobalStudents) => {
  return !existingStudents.some(student => student.nicHash === nicHash);
};

// Initialize mock data in localStorage for demo purposes
export const initializeMockData = () => {
  if (typeof window === 'undefined') return;

  // Initialize students data if it doesn't exist
  if (!localStorage.getItem('students')) {
    const mockStudents = [
      {
        id: 'student_001',
        name: mockStudentData.name,
        email: 'ayesha.perera@genuinegrads.edu',
        walletAddress: mockStudentData.wallet,
        nic: mockStudentData.nic,
        universities: ['GenuineGrads University'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'student_002',
        name: 'John Doe',
        email: 'john.doe@techinstitute.edu',
        walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        nic: '123456789V',
        universities: ['Tech Institute of Innovation'],
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem('students', JSON.stringify(mockStudents));
  }

  // Initialize universities data if it doesn't exist
  if (!localStorage.getItem('universities')) {
    const mockUniversities = [
      {
        id: 'uni_001',
        name: 'GenuineGrads University',
        email: 'admin@genuinegrads.edu',
        domain: 'genuinegrads.edu',
        admin: 'Dr. Jane Smith',
        phone: '+1 555 123 4567',
        wallet: '7wnLBEm3ftFJobu1yvv25JvyNVqzs4SEKYAfSbimCDN9',
        createdAt: new Date().toISOString()
      },
      {
        id: 'uni_002',
        name: 'Tech Institute of Innovation',
        email: 'admin@techinstitute.edu',
        domain: 'techinstitute.edu',
        admin: 'Prof. John Wilson',
        phone: '+1 555 987 6543',
        wallet: '7wnLBEm3ftFJobu1yvv25JvyNVqzs4SEKYAfSbimCDN9',
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem('universities', JSON.stringify(mockUniversities));
  }

  // Initialize shared university index if it doesn't exist
  if (!localStorage.getItem('shared_university_index')) {
    const universities = JSON.parse(localStorage.getItem('universities') || '[]');
    const sharedIndex = universities.map(uni => ({
      id: uni.id,
      name: uni.name,
      domain: uni.domain,
      wallet: uni.wallet
    }));
    localStorage.setItem('shared_university_index', JSON.stringify(sharedIndex));
  }
};

// Clear all mock data
export const clearMockData = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('students');
  localStorage.removeItem('universities');
  localStorage.removeItem('shared_university_index');
  localStorage.removeItem('studentSession');
  localStorage.removeItem('adminSession');
  localStorage.removeItem('session');
};

// Get demo credentials for display
export const getDemoCredentials = () => {
  return {
    students: [
      { email: 'ayesha.perera@genuinegrads.edu', wallet: '7XdC8K9L2M3N4P5Q6R7S8T9U0V1W2X3Y4Z5' },
      { email: 'john.doe@techinstitute.edu', wallet: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' }
    ],
    universities: [
      { email: 'admin@genuinegrads.edu', wallet: '7wnLBEm3ftFJobu1yvv25JvyNVqzs4SEKYAfSbimCDN9' },
      { email: 'admin@techinstitute.edu', wallet: '7wnLBEm3ftFJobu1yvv25JvyNVqzs4SEKYAfSbimCDN9' }
    ]
  };
}; 

