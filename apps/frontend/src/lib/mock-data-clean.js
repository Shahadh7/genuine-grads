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
  },
  {
    id: 'stu-004',
    nic: 'NIC789123456',
    nicHash: 'hash_789123456_jkl',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@student.edu',
    program: 'Bachelor of Arts',
    gpa: 3.7,
    achievements: ['Creative Writing Award'],
    walletConnected: true,
    walletAddress: '8YzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    dateAdded: '2024-01-30',
    certificates: 1
  },
  {
    id: 'stu-005',
    nic: 'NIC321654987',
    nicHash: 'hash_321654987_mno',
    name: 'David Brown',
    email: 'david.brown@student.edu',
    program: 'Master of Science',
    gpa: 3.5,
    achievements: [],
    walletConnected: false,
    walletAddress: null,
    dateAdded: '2024-02-15',
    certificates: 0
  },
  {
    id: 'stu-006',
    nic: 'NIC111222333',
    nicHash: 'hash_111222333_pqr',
    name: 'Alice Johnson',
    email: 'alice.johnson@student.edu',
    program: 'Bachelor of Computer Science',
    gpa: 3.9,
    achievements: ['Dean\'s List 2024', 'Academic Excellence'],
    walletConnected: true,
    walletAddress: '5XzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    dateAdded: '2024-03-05',
    certificates: 2
  },
  {
    id: 'stu-007',
    nic: 'NIC444555666',
    nicHash: 'hash_444555666_stu',
    name: 'Bob Wilson',
    email: 'bob.wilson@student.edu',
    program: 'Master of Business Administration',
    gpa: 3.8,
    achievements: ['Leadership Award'],
    walletConnected: true,
    walletAddress: '6XzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    dateAdded: '2024-03-12',
    certificates: 1
  },
  {
    id: 'stu-008',
    nic: 'NIC777888999',
    nicHash: 'hash_777888999_vwx',
    name: 'Carol Davis',
    email: 'carol.davis@student.edu',
    program: 'PhD in Engineering',
    gpa: 4.0,
    achievements: ['Research Excellence', 'Best Paper Award'],
    walletConnected: true,
    walletAddress: '7XzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    dateAdded: '2024-03-18',
    certificates: 3
  },
  {
    id: 'stu-009',
    nic: 'NIC000111222',
    nicHash: 'hash_000111222_yz1',
    name: 'Eve Martinez',
    email: 'eve.martinez@student.edu',
    program: 'Bachelor of Arts',
    gpa: 3.6,
    achievements: ['Creative Excellence'],
    walletConnected: false,
    walletAddress: null,
    dateAdded: '2024-03-25',
    certificates: 1
  },
  {
    id: 'stu-010',
    nic: 'NIC333444555',
    nicHash: 'hash_333444555_abc',
    name: 'Frank Garcia',
    email: 'frank.garcia@student.edu',
    program: 'Master of Engineering',
    gpa: 3.7,
    achievements: ['Engineering Innovation'],
    walletConnected: true,
    walletAddress: '8XzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    dateAdded: '2024-04-01',
    certificates: 2
  },
  {
    id: 'stu-011',
    nic: 'NIC666777888',
    nicHash: 'hash_666777888_def',
    name: 'Grace Lee',
    email: 'grace.lee@student.edu',
    program: 'Bachelor of Computer Science',
    gpa: 3.8,
    achievements: ['Hackathon Winner', 'Code Excellence'],
    walletConnected: true,
    walletAddress: '9XzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    dateAdded: '2024-04-08',
    certificates: 1
  },
  {
    id: 'stu-012',
    nic: 'NIC999000111',
    nicHash: 'hash_999000111_ghi',
    name: 'Henry Taylor',
    email: 'henry.taylor@student.edu',
    program: 'Master of Business Administration',
    gpa: 3.9,
    achievements: ['Business Strategy Award'],
    walletConnected: false,
    walletAddress: null,
    dateAdded: '2024-04-15',
    certificates: 0
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
  },
  {
    id: 'course-004',
    code: 'ENG301',
    title: 'Advanced Engineering Design',
    program: 'Bachelor of Engineering',
    credits: 4,
    semester: 'Spring 2024'
  }
];

// Mock pending certificates data (simulates pendingCertificates.json) - CLEAN VERSION
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
  },
  {
    id: 'cert-003',
    studentId: 'stu-003',
    enrollmentId: 'enr-125',
    certificateTitle: 'PhD in Engineering',
    gpa: 4.0,
    badgeTitles: ['Research Grant Recipient', 'Best Paper Award'],
    issueReady: true,
    mintAddress: null,
    ipfsMetadataUrl: null,
    timestamp: null,
    zkpEnabled: true
  },
  {
    id: 'cert-004',
    studentId: 'stu-004',
    enrollmentId: 'enr-126',
    certificateTitle: 'Bachelor of Arts',
    gpa: 3.7,
    badgeTitles: ['Creative Writing Award'],
    issueReady: false, // Not ready for issuance
    mintAddress: null,
    ipfsMetadataUrl: null,
    timestamp: null,
    zkpEnabled: false
  },
  {
    id: 'cert-005',
    studentId: 'stu-005',
    enrollmentId: 'enr-127',
    certificateTitle: 'Master of Science',
    gpa: 3.5,
    badgeTitles: [],
    issueReady: true,
    mintAddress: null,
    ipfsMetadataUrl: null,
    timestamp: null,
    zkpEnabled: false
  },
  {
    id: 'cert-006',
    studentId: 'stu-006',
    enrollmentId: 'enr-128',
    certificateTitle: 'Data Science Certificate',
    gpa: 3.9,
    badgeTitles: ['Data Science Excellence'],
    issueReady: true,
    mintAddress: null,
    ipfsMetadataUrl: null,
    timestamp: null,
    zkpEnabled: true
  },
  {
    id: 'cert-007',
    studentId: 'stu-007',
    enrollmentId: 'enr-129',
    certificateTitle: 'Cybersecurity Certificate',
    gpa: 4.0,
    badgeTitles: ['Security Expert', 'Ethical Hacking'],
    issueReady: true,
    mintAddress: null,
    ipfsMetadataUrl: null,
    timestamp: null,
    zkpEnabled: true
  },
  {
    id: 'cert-008',
    studentId: 'stu-008',
    enrollmentId: 'enr-130',
    certificateTitle: 'Advanced Engineering Certificate',
    gpa: 3.8,
    badgeTitles: ['Engineering Innovation'],
    issueReady: true,
    mintAddress: null,
    ipfsMetadataUrl: null,
    timestamp: null,
    zkpEnabled: false
  },
  {
    id: 'cert-009',
    studentId: 'stu-009',
    enrollmentId: 'enr-131',
    certificateTitle: 'Digital Marketing Certificate',
    gpa: 3.6,
    badgeTitles: ['Marketing Excellence'],
    issueReady: true,
    mintAddress: null,
    ipfsMetadataUrl: null,
    timestamp: null,
    zkpEnabled: true
  },
  {
    id: 'cert-010',
    studentId: 'stu-010',
    enrollmentId: 'enr-132',
    certificateTitle: 'Web Development Certificate',
    gpa: 3.7,
    badgeTitles: ['Frontend Mastery', 'Backend Excellence'],
    issueReady: true,
    mintAddress: null,
    ipfsMetadataUrl: null,
    timestamp: null,
    zkpEnabled: true
  },
  {
    id: 'cert-011',
    studentId: 'stu-011',
    enrollmentId: 'enr-133',
    certificateTitle: 'Machine Learning Certificate',
    gpa: 3.9,
    badgeTitles: ['AI Pioneer', 'ML Expert'],
    issueReady: true,
    mintAddress: null,
    ipfsMetadataUrl: null,
    timestamp: null,
    zkpEnabled: true
  },
  {
    id: 'cert-012',
    studentId: 'stu-012',
    enrollmentId: 'enr-134',
    certificateTitle: 'Blockchain Development Certificate',
    gpa: 4.0,
    badgeTitles: ['Blockchain Innovator'],
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
  },
  {
    id: 'mint-002',
    certificateId: 'cert-006',
    studentId: 'stu-007',
    mintAddress: '6XzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    ipfsMetadataUrl: 'ipfs://QmYzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    timestamp: '2024-05-14T15:45:00Z',
    status: 'success',
    gasUsed: 0.001,
    transactionHash: '0xabcdef1234567890'
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
  },
  {
    nicHash: 'hash_456789123_ghi',
    universityId: 'uni-xyz',
    studentId: 'stu-003',
    globalId: 'global-003'
  },
  {
    nicHash: 'hash_789123456_jkl',
    universityId: 'uni-xyz',
    studentId: 'stu-004',
    globalId: 'global-004'
  },
  {
    nicHash: 'hash_321654987_mno',
    universityId: 'uni-xyz',
    studentId: 'stu-005',
    globalId: 'global-005'
  },
  {
    nicHash: 'hash_111222333_pqr',
    universityId: 'uni-xyz',
    studentId: 'stu-006',
    globalId: 'global-006'
  },
  {
    nicHash: 'hash_444555666_stu',
    universityId: 'uni-xyz',
    studentId: 'stu-007',
    globalId: 'global-007'
  },
  {
    nicHash: 'hash_777888999_vwx',
    universityId: 'uni-xyz',
    studentId: 'stu-008',
    globalId: 'global-008'
  },
  {
    nicHash: 'hash_000111222_yz1',
    universityId: 'uni-xyz',
    studentId: 'stu-009',
    globalId: 'global-009'
  },
  {
    nicHash: 'hash_333444555_abc',
    universityId: 'uni-xyz',
    studentId: 'stu-010',
    globalId: 'global-010'
  },
  {
    nicHash: 'hash_666777888_def',
    universityId: 'uni-xyz',
    studentId: 'stu-011',
    globalId: 'global-011'
  },
  {
    nicHash: 'hash_999000111_ghi',
    universityId: 'uni-xyz',
    studentId: 'stu-012',
    globalId: 'global-012'
  }
];

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

// Mock university profile data
export const mockUniversityProfile = {
  name: 'GenuineGrads University',
  email: 'admin@genuinegrads.edu',
  description: 'A leading institution in blockchain-based education and certificate issuance. We are committed to providing secure, verifiable academic credentials using cutting-edge blockchain technology.',
  walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  stats: {
    totalStudents: 1250,
    totalCertificates: 3420,
    activeCertificates: 3150,
    totalRevoked: 15
  }
};

// Mock issued certificates data (for revoke functionality)
export const mockCertificates = [
  {
    id: 'cert-005',
    certificateId: 'CERT-2024-001',
    studentId: 'stu-006',
    studentName: 'Alice Johnson',
    studentNIC: 'NIC111222333',
    title: 'Bachelor of Computer Science',
    program: 'Computer Science',
    gpa: 3.9,
    issueDate: '2024-05-15T10:30:00Z',
    badges: ['Dean\'s List 2024', 'Academic Excellence'],
    mintAddress: '5XzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    status: 'active'
  },
  {
    id: 'cert-006',
    certificateId: 'CERT-2024-002',
    studentId: 'stu-007',
    studentName: 'Bob Wilson',
    studentNIC: 'NIC444555666',
    title: 'Master of Business Administration',
    program: 'Business Administration',
    gpa: 3.8,
    issueDate: '2024-05-14T15:45:00Z',
    badges: ['Leadership Award'],
    mintAddress: '6XzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    status: 'active'
  },
  {
    id: 'cert-007',
    certificateId: 'CERT-2024-003',
    studentId: 'stu-008',
    studentName: 'Carol Davis',
    studentNIC: 'NIC777888999',
    title: 'PhD in Engineering',
    program: 'Engineering',
    gpa: 4.0,
    issueDate: '2024-05-13T09:15:00Z',
    badges: ['Research Excellence', 'Best Paper Award'],
    mintAddress: '7XzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    status: 'active'
  }
]; 