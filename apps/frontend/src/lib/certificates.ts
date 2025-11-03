export interface Achievement {
  title: string;
  zkpRequired: boolean;
  description?: string;
}

export interface Certificate {
  id: string;
  studentName: string;
  studentNIC: string;
  universityName: string;
  degreeTitle: string;
  gpa: number;
  issueDate: string;
  cnftMintAddress: string;
  qrCode: string;
  isRevoked: boolean;
  achievements: Achievement[];
  metadata?: {
    major?: string;
    graduationYear?: number;
    honors?: string;
  };
}

// Mock certificate data
export const mockCertificates: Record<string, Certificate> = {
  "abc123": {
    id: "abc123",
    studentName: "Sarah Johnson",
    studentNIC: "1234567890",
    universityName: "MIT",
    degreeTitle: "Bachelor of Science in Computer Science",
    gpa: 3.9,
    issueDate: "2024-05-15",
    cnftMintAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    qrCode: "https://genuinegrads.xyz/verify/abc123",
    isRevoked: false,
    achievements: [
      { title: "Dean's List", zkpRequired: true, description: "Academic excellence recognition" },
      { title: "Top 10%", zkpRequired: false, description: "Graduated in top 10% of class" },
      { title: "Research Excellence", zkpRequired: true, description: "Outstanding research contribution" }
    ],
    metadata: {
      major: "Computer Science",
      graduationYear: 2024,
      honors: "Magna Cum Laude"
    }
  },
  "def456": {
    id: "def456",
    studentName: "Michael Chen",
    studentNIC: "1234567890",
    universityName: "Stanford University",
    degreeTitle: "Master of Science in Artificial Intelligence",
    gpa: 3.8,
    issueDate: "2024-06-20",
    cnftMintAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    qrCode: "https://genuinegrads.xyz/verify/def456",
    isRevoked: false,
    achievements: [
      { title: "Dean's List", zkpRequired: true, description: "Academic excellence recognition" },
      { title: "Research Grant", zkpRequired: false, description: "Received research funding" }
    ],
    metadata: {
      major: "Artificial Intelligence",
      graduationYear: 2024,
      honors: "Summa Cum Laude"
    }
  },
  "ghi789": {
    id: "ghi789",
    studentName: "Emily Rodriguez",
    studentNIC: "1234567890",
    universityName: "Harvard University",
    degreeTitle: "Bachelor of Arts in Economics",
    gpa: 3.7,
    issueDate: "2024-05-10",
    cnftMintAddress: "3xJ8tK1mN9pQ2rS4tU6vW8xY0zA1bC3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5z",
    qrCode: "https://genuinegrads.xyz/verify/ghi789",
    isRevoked: true,
    achievements: [
      { title: "Dean's List", zkpRequired: true, description: "Academic excellence recognition" }
    ],
    metadata: {
      major: "Economics",
      graduationYear: 2024,
      honors: "Cum Laude"
    }
  }
};

// Mock API function to fetch certificate
export async function fetchCertificate(certificateId: string): Promise<Certificate | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return mockCertificates[certificateId] || null;
}

// Mock ZKP verification function
export async function verifyZKPProof(proof: File, achievementTitle: string): Promise<{
  isValid: boolean;
  message: string;
  details?: string;
}> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock verification logic
  const random = Math.random();
  
  if (random > 0.7) {
    return {
      isValid: true,
      message: "✅ Valid Proof",
      details: "Zero-knowledge proof verified successfully"
    };
  } else if (random > 0.4) {
    return {
      isValid: false,
      message: "❌ Invalid Proof",
      details: "Proof verification failed - invalid signature"
    };
  } else {
    return {
      isValid: false,
      message: "⚠️ Mismatch",
      details: "Proof does not match certificate data"
    };
  }
} 