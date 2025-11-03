import { Crown, Star, Trophy, Target, Award } from 'lucide-react';

// Mock data for student dashboard
export const mockStudentData = {
  name: "Ayesha Perera",
  wallet: "7wnLBEm3ftFJobu1yvv25JvyNVqzs4SEKYAfSbimCDN9",
  email: "ayesha.perera@colombo.ac.lk",
  nic: "932582928V",
  universities: ["University of Colombo", "UCSC"],
  avatar: null
};

export const mockCertificates = [
  {
    id: "cert_001",
    title: "Bachelor of Information Technology",
    university: "University of Colombo",
    issued_date: "2024-07-20",
    asset_id: "ASSET123XYZ789",
    status: "valid",
    image_url: "/sample-cert.png",
    gpa: "3.95",
    course: "Computer Science",
    description: "Bachelor's degree in Information Technology with Computer Science specialization"
  },
  {
    id: "cert_002", 
    title: "Master of Computer Science",
    university: "UCSC",
    issued_date: "2024-12-15",
    asset_id: "ASSET456ABC123",
    status: "valid",
    image_url: "/sample-cert.png",
    gpa: "3.88",
    course: "Advanced Computing",
    description: "Master's degree in Computer Science with focus on advanced computing technologies"
  },
  {
    id: "cert_003",
    title: "Data Science Certification",
    university: "University of Colombo",
    issued_date: "2024-09-10",
    asset_id: "ASSET789DEF456",
    status: "valid",
    image_url: "/sample-cert.png",
    gpa: "4.0",
    course: "Data Science",
    description: "Professional certification in Data Science and Analytics"
  },
  {
    id: "cert_004",
    title: "Web Development Bootcamp",
    university: "UCSC",
    issued_date: "2024-06-05",
    asset_id: "ASSET012GHI789",
    status: "valid",
    image_url: "/sample-cert.png",
    gpa: "3.92",
    course: "Web Development",
    description: "Intensive bootcamp in modern web development technologies"
  }
];

export const mockAchievements = [
  {
    id: "ach_001",
    title: "Dean's List",
    description: "Top 5% of graduating class",
    certificate_id: "cert_001",
    status: "claimed",
    proof_id: "ZKP_PROOF_001",
    icon: Crown,
    issued_date: "2024-07-20"
  },
  {
    id: "ach_002",
    title: "Best Performer Semester 1",
    description: "Highest GPA in semester 1",
    certificate_id: "cert_001", 
    status: "claimable",
    icon: Star,
    issued_date: "2024-02-15"
  },
  {
    id: "ach_003",
    title: "Top 10% Graduate",
    description: "Graduated in top 10% of class",
    certificate_id: "cert_002",
    status: "claimed",
    proof_id: "ZKP_PROOF_002",
    icon: Trophy,
    issued_date: "2024-12-15"
  },
  {
    id: "ach_004",
    title: "Perfect Score",
    description: "Achieved 4.0 GPA in certification",
    certificate_id: "cert_003",
    status: "claimed",
    proof_id: "ZKP_PROOF_003",
    icon: Target,
    issued_date: "2024-09-10"
  },
  {
    id: "ach_005",
    title: "Innovation Award",
    description: "Outstanding project in web development",
    certificate_id: "cert_004",
    status: "claimable",
    icon: Award,
    issued_date: "2024-06-05"
  }
];

export const mockVerificationLogs = [
  {
    id: "log_001",
    date: "2024-12-20",
    asset_id: "ASSET123XYZ789",
    ip_address: "203.24.1.1",
    verified_by: "www.techcorp.lk",
    status: "verified",
    certificate_title: "Bachelor of Information Technology"
  },
  {
    id: "log_002", 
    date: "2024-12-18",
    asset_id: "ASSET456ABC123",
    ip_address: "192.168.1.100",
    verified_by: "www.startup.io",
    status: "verified",
    certificate_title: "Master of Computer Science"
  },
  {
    id: "log_003",
    date: "2024-12-15",
    asset_id: "ASSET789DEF456",
    ip_address: "10.0.0.50",
    verified_by: "www.consulting.com",
    status: "verified",
    certificate_title: "Data Science Certification"
  },
  {
    id: "log_004",
    date: "2024-12-12",
    asset_id: "ASSET123XYZ789",
    ip_address: "172.16.0.25",
    verified_by: "www.bank.lk",
    status: "verified",
    certificate_title: "Bachelor of Information Technology"
  },
  {
    id: "log_005",
    date: "2024-12-10",
    asset_id: "ASSET012GHI789",
    ip_address: "8.8.8.8",
    verified_by: "www.agency.gov.lk",
    status: "verified",
    certificate_title: "Web Development Bootcamp"
  }
];

export const mockDashboardMetrics = {
  totalCertificates: mockCertificates.length,
  totalUniversities: mockStudentData.universities.length,
  totalAchievements: mockAchievements.length,
  claimedAchievements: mockAchievements.filter(a => a.status === 'claimed').length,
  totalVerifications: mockVerificationLogs.length,
  walletConnected: true,
  walletAddress: mockStudentData.wallet
};

// Helper functions
export const getCertificateById = (id) => {
  return mockCertificates.find(cert => cert.id === id);
};

export const getAchievementById = (id) => {
  return mockAchievements.find(achievement => achievement.id === id);
};

export const getVerificationLogsByAssetId = (assetId) => {
  return mockVerificationLogs.filter(log => log.asset_id === assetId);
};

export const getAchievementsByCertificateId = (certificateId) => {
  return mockAchievements.filter(achievement => achievement.certificate_id === certificateId);
}; 