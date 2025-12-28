// Mock student data for development/fallback
export const mockStudentData = {
  name: 'Student User',
  email: 'student@university.edu',
  nic: '123456789V',
  wallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  avatar: '',
  universities: ['University of Technology'],
  achievements: [
    {
      id: '1',
      title: 'Bachelor of Science',
      description: 'Computer Science',
      date: new Date().toISOString(),
      type: 'degree'
    }
  ],
  certificates: [],
  stats: {
    totalCertificates: 0,
    verifiedCertificates: 0,
    pendingCertificates: 0
  }
};

// Mock achievements for development/fallback
export const mockAchievements = [
  {
    id: '1',
    title: 'Bachelor of Science',
    description: 'Computer Science',
    date: new Date().toISOString(),
    type: 'degree',
    icon: 'graduation-cap',
    color: 'blue'
  }
];
