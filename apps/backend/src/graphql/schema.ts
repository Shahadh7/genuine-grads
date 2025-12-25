import gql from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # ============================================
  # ENUMS
  # ============================================
  
  enum UniversityStatus {
    PENDING_APPROVAL
    APPROVED
    REJECTED
    SUSPENDED
  }
  
  enum MintStatus {
    PENDING
    SUCCESS
    FAILED
  }
  
  enum CertificateStatus {
    PENDING
    MINTED
    FAILED
  }
  
  enum BatchJobStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
    CANCELLED
  }

  # ============================================
  # UNIVERSITY TYPES
  # ============================================
  
  type University {
    id: ID!
    name: String!
    domain: String!
    country: String!
    logoUrl: String
    websiteUrl: String
    walletAddress: String!
    universityPDA: String
    merkleTreeAddress: String
    collectionAddress: String
    status: UniversityStatus!
    approvedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    rejectedReason: String
    
    # Blockchain transaction signatures
    registrationTxSignature: String
    approvalTxSignature: String
    deactivationTxSignature: String
    
    # Relations
    admins: [Admin!]!
    stats: UniversityStats
    mintLogs: [MintActivityLog!]!
    databaseName: String
    databaseUrl: String
    superAdminPubkey: String
  }
  
  type UniversityStats {
    totalCertificates: Int!
    mintedCount: Int!
    pendingCount: Int!
    revokedCount: Int!
    activeStudents: Int!
    totalStudents: Int!
  }

  # ============================================
  # ADMIN TYPES
  # ============================================
  
  type Admin {
    id: ID!
    username: String!
    email: String!
    fullName: String
    isSuperAdmin: Boolean!
    isActive: Boolean!
    lastLoginAt: DateTime
    university: University
    createdAt: DateTime!
    totpEnabled: Boolean!
  }

  type AuthPayload {
    admin: Admin
    accessToken: String
    refreshToken: String
    requiresTOTP: Boolean!
  }

  type TOTPSetupPayload {
    secret: String!
    qrCodeDataUrl: String!
  }

  type StudentAuthPayload {
    student: Student!
    accessToken: String!
    refreshToken: String!
  }

  # ============================================
  # STUDENT TYPES
  # ============================================
  
  type Student {
    id: ID!
    email: String!
    fullName: String!
    studentNumber: String!
    walletAddress: String
    program: String
    department: String
    enrollmentYear: Int
    graduationYear: Int
    profilePicUrl: String
    isActive: Boolean!
    createdAt: DateTime!
    
    # Relations
    certificates: [Certificate!]!
    enrollments: [Enrollment!]!
  achievements: [StudentAchievement!]!
  }
  
  type GlobalStudentIndex {
    id: ID!
    nicHash: String!
    walletAddress: String
    createdByUniversity: University!
    createdAt: DateTime!
  }

  type StudentLookupResult {
    existsInUniversity: Boolean!
    globalExists: Boolean!
    studentId: ID
    fullName: String
    email: String
    walletAddress: String
    globalWalletAddress: String
    createdByUniversityName: String
  }

  # ============================================
  # CERTIFICATE TYPES
  # ============================================
  
  type Certificate {
    id: ID!
    certificateNumber: String!
    badgeTitle: String!
    description: String
    degreeType: String
    mintAddress: String!
    merkleTreeAddress: String
    ipfsMetadataUri: String # Nullable - some certificates may not have IPFS metadata yet
    transactionSignature: String
    status: CertificateStatus!
    issuedAt: DateTime!
    revoked: Boolean!
    revokedAt: DateTime
    revocationReason: String

    # Relations
    student: Student # Nullable - when fetched from MintActivityLog
    enrollment: Enrollment
    metadata: JSON
    achievementIds: [String!]!
  }
  
  type CertificateTemplate {
    id: ID!
    name: String!
    degreeType: String!
    description: String
    templateFields: JSON!
    designTemplate: JSON
    backgroundImage: String
    isActive: Boolean!
    timesUsed: Int!
    createdAt: DateTime!
  }

  type VerificationLog {
    id: ID!
    verifiedAt: DateTime!
    verificationType: String!
    verificationStatus: String!
    verifierIpAddress: String
    verifierLocation: String
    verifierUserAgent: String
    certificateNumber: String!
    mintAddress: String!
    errorMessage: String
    certificate: Certificate!
  }

  type VerificationLogStats {
    total: Int!
    successful: Int!
    failed: Int!
  }

  # ============================================
  # UNIVERSITY ANALYTICS TYPES (UNIVERSITY ADMIN)
  # ============================================

  type UniversityAnalytics {
    overview: UniversityOverview!
    blockchainMetrics: UniversityBlockchainMetrics!
    trends: UniversityTrends!
    topPrograms: [ProgramMetrics!]!
  }

  type UniversityOverview {
    totalCertificates: Int!
    mintedCertificates: Int!
    pendingCertificates: Int!
    revokedCertificates: Int!
    totalStudents: Int!
    activeStudents: Int!
    studentsWithWallet: Int!
    studentsWithoutWallet: Int!
    totalVerifications: Int!
    successfulVerifications: Int!
    failedVerifications: Int!
    totalCourses: Int!
  }

  type UniversityBlockchainMetrics {
    totalMintTransactions: Int!
    successfulMints: Int!
    failedMints: Int!
    treeAddress: String
    collectionAddress: String
    successRate: Float!
    recentMints: [RecentMint!]!
  }

  type RecentMint {
    id: ID!
    signature: String
    studentName: String!
    badgeTitle: String!
    timestamp: DateTime!
    status: String!
  }

  type UniversityTrends {
    certificatesPerDay: [DailyCount!]!
    verificationsPerDay: [DailyCount!]!
    studentsPerMonth: [MonthlyCount!]!
  }

  type DailyCount {
    date: String!
    count: Int!
  }

  type MonthlyCount {
    month: String!
    count: Int!
  }

  type ProgramMetrics {
    program: String!
    department: String
    studentCount: Int!
    certificateCount: Int!
  }

  # ============================================
  # ENROLLMENT & COURSE TYPES
  # ============================================
  
  type Course {
    id: ID!
    name: String!
    code: String!
    description: String
    credits: Int
    department: String
    isActive: Boolean!
  }
  
  type Enrollment {
    id: ID!
    student: Student!
    course: Course!
    gpa: Float
    grade: String
    batchYear: Int!
    achievements: [Achievement!]!
  }
  
  type Achievement {
    id: ID!
    badgeTitle: String!
    description: String
    badgeType: String
    semester: String
    achievementDate: DateTime
    zkpCommitmentHash: String
    proofGenerated: Boolean!
  }

type AchievementCatalog {
  id: ID!
  title: String!
  description: String
  category: String
  isActive: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type StudentAchievement {
  id: ID!
  achievement: AchievementCatalog!
  awardedAt: DateTime!
  notes: String
}

  # ============================================
  # MINTING & LOGS TYPES
  # ============================================
  
  type MintActivityLog {
    id: ID!
    studentWallet: String!
    mintAddress: String!
    university: University!
    badgeTitle: String!
    status: MintStatus!
    transactionSignature: String
    errorMessage: String
    timestamp: DateTime!
  }
  
  type RevokedCertIndex {
    id: ID!
    mintAddress: String!
    certificateNumber: String
    revokedByUniversity: University!
    reason: String!
    studentWallet: String
    revokedAt: DateTime!
  }

  # ============================================
  # BATCH ISSUANCE TYPES
  # ============================================

  type BatchIssuanceJob {
    id: ID!
    universityId: String!
    batchName: String
    totalCertificates: Int!
    status: String!
    processedCount: Int!
    successCount: Int!
    failedCount: Int!
    certificateIds: [String!]!
    successfulMints: [String!]!
    failedMints: [FailedMint!]
    resultsJson: JSON
    createdAt: DateTime!
    startedAt: DateTime
    completedAt: DateTime
    createdByAdminId: String
  }

  type FailedMint {
    certId: String!
    error: String!
    attempts: Int
    timestamp: String!
  }

  type BatchMintingPreparation {
    batchId: ID!
    totalCertificates: Int!
    estimatedTimeMinutes: Int!
    certificates: [BatchCertificateInfo!]!
  }

  type BatchCertificateInfo {
    certificateId: ID!
    certificateNumber: String!
    studentName: String!
    studentWallet: String!
    badgeTitle: String!
  }

  type BatchProgressUpdate {
    batchId: ID!
    status: String!
    processedCount: Int!
    successCount: Int!
    failedCount: Int!
    totalCertificates: Int!
  }

  type FixPendingCertificatesResult {
    success: Boolean!
    message: String!
    fixed: Int!
  }

  # ============================================
  # VERIFICATION TYPES (PUBLIC)
  # ============================================
  
  type CertificateVerification {
    isValid: Boolean!
    status: String! # VALID, REVOKED, INVALID
    certificate: CertificatePublicInfo
    revocationInfo: RevocationInfo
    blockchainProof: BlockchainProof
    verificationTimestamp: DateTime!
  }
  
  type CertificatePublicInfo {
    badgeTitle: String!
    issueDate: DateTime!
    university: UniversityPublicInfo!
    studentName: String
    degreeType: String
    achievements: [String!]
  }
  
  type UniversityPublicInfo {
    name: String!
    logoUrl: String
    isVerified: Boolean!
  }
  
  type RevocationInfo {
    isRevoked: Boolean!
    revokedAt: DateTime
    reason: String
  }
  
  type BlockchainProof {
    mintAddress: String!
    transactionSignature: String!
    merkleTreeAddress: String
    metadataUri: String!
    verifiedAt: DateTime!
  }

  type PreparedSolanaTransaction {
    operationType: String
    transaction: String!
    blockhash: String!
    lastValidBlockHeight: Int!
    message: String!
    metadata: JSON
    accountsCreated: [PreparedAccountDescriptor!]
  }

  type PreparedAccountDescriptor {
    name: String!
    address: String!
  }

  type TransactionSubmissionResult {
    success: Boolean!
    signature: String!
    message: String!
  }

  type PrepareMintCertificateWorkflowPayload {
    prerequisites: [PreparedSolanaTransaction!]!
    mint: PreparedSolanaTransaction
  }

  type ImageUploadResult {
    success: Boolean!
    imageUrl: String!
    ipfsHash: String!
  }

  # ============================================
  # ZKP TYPES
  # ============================================
  
  type ZKPProofRequest {
    id: ID!
    student: Student!
    claimType: String!
    proofJson: String
    verified: Boolean!
    verifiedAt: DateTime
    expiresAt: DateTime!
    shareToken: String
    shareUrl: String
    createdAt: DateTime!
  }

  # ============================================
  # QUERIES
  # ============================================
  
  type Query {
    # ========== AUTHENTICATION ==========
    me: Admin

    # ========== STUDENT ==========
    meStudent: Student @auth(requires: STUDENT)
    myCertificates: [Certificate!]! @auth(requires: STUDENT)
    myAchievements: [StudentAchievement!]! @auth(requires: STUDENT)
    myVerificationLogs(limit: Int, offset: Int): [VerificationLog!]! @auth(requires: STUDENT)
    myVerificationLogStats: VerificationLogStats! @auth(requires: STUDENT)

    # ========== SUPER ADMIN ==========
    pendingUniversities: [University!]! @auth(requires: SUPER_ADMIN)
    allUniversities(status: UniversityStatus): [University!]! @auth(requires: SUPER_ADMIN)
    university(id: ID!): University @auth(requires: SUPER_ADMIN)
    
    # ========== UNIVERSITY ADMIN ==========
    myUniversity: University! @auth(requires: ADMIN)
    universityStats: UniversityStats! @auth(requires: ADMIN)
    universityAnalytics(days: Int): UniversityAnalytics! @auth(requires: ADMIN)
    
    # Students
    students(
      search: String
      program: String
      batchYear: Int
      limit: Int
      offset: Int
    ): [Student!]! @auth(requires: ADMIN)
    
    studentsWithoutCertificates(
      limit: Int
      offset: Int
    ): [Student!]! @auth(requires: ADMIN)
    
    student(id: ID!): Student @auth(requires: ADMIN)
    lookupStudentByNationalId(nationalId: String!): StudentLookupResult! @auth(requires: ADMIN)
    
    # Certificates
    certificates(
      status: CertificateStatus
      studentId: ID
      search: String
      limit: Int
      offset: Int
    ): [Certificate!]! @auth(requires: ADMIN)
    
    certificate(id: ID!): Certificate @auth(requires: ADMIN)
    certificateByNumber(certificateNumber: String!): Certificate @auth(requires: ADMIN)
    
    # Templates
    certificateTemplates: [CertificateTemplate!]! @auth(requires: ADMIN)
    certificateTemplate(id: ID!): CertificateTemplate @auth(requires: ADMIN)
    
    # Courses
    courses(department: String, isActive: Boolean): [Course!]! @auth(requires: ADMIN)
    course(id: ID!): Course @auth(requires: ADMIN)
    
    # Logs
    mintActivityLogs(
      status: MintStatus
      studentWallet: String
      limit: Int
      offset: Int
    ): [MintActivityLog!]! @auth(requires: ADMIN)
    
  achievementCatalog(search: String): [AchievementCatalog!]! @auth(requires: ADMIN)
    revokedCertificates: [RevokedCertIndex!]! @auth(requires: ADMIN)
    
    # Batch Jobs
    batchIssuanceJobs(status: BatchJobStatus, limit: Int): [BatchIssuanceJob!]! @auth(requires: ADMIN)
    batchIssuanceJob(jobId: String!): BatchIssuanceJob @auth(requires: ADMIN)
    
    # ========== PUBLIC (NO AUTH) ==========
    verifyCertificatePublic(
      certificateNumber: String
      mintAddress: String
    ): CertificateVerification!

    # Get super admin wallet address for validation
    getSuperAdminWallet: String!
  }

  # ============================================
  # MUTATIONS
  # ============================================
  
  type Mutation {
    # ========== AUTHENTICATION ==========
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    logout: Boolean!

    # ========== TOTP 2FA ==========
    initiateTOTPSetup: TOTPSetupPayload! @auth(requires: ADMIN)
    verifyAndEnableTOTP(token: String!): Boolean! @auth(requires: ADMIN)
    disableTOTP(password: String!): Boolean! @auth(requires: ADMIN)

    # ========== STUDENT AUTHENTICATION ==========
    studentLoginWithWallet(walletAddress: String!): StudentAuthPayload!

    # ========== PUBLIC ==========
    registerUniversity(input: RegisterUniversityInput!): University!
    
    # ========== SUPER ADMIN ==========
    approveUniversity(input: ApproveUniversityInput!): University! @auth(requires: SUPER_ADMIN)
    deactivateUniversity(input: DeactivateUniversityInput!): University! @auth(requires: SUPER_ADMIN)
    rejectUniversity(universityId: ID!, reason: String!): University! @auth(requires: SUPER_ADMIN)
    suspendUniversity(input: SuspendUniversityInput!): University! @auth(requires: SUPER_ADMIN)
    
    # ========== UNIVERSITY ADMIN ==========
    updateUniversityProfile(input: UpdateUniversityInput!): University! @auth(requires: ADMIN)
    
    # Students
    registerStudent(input: RegisterStudentInput!): Student! @auth(requires: ADMIN)
    enrollStudentInCourse(input: EnrollStudentInCourseInput!): Enrollment! @auth(requires: ADMIN)
    bulkImportStudents(input: BulkStudentImportInput!): BulkStudentImportResult! @auth(requires: ADMIN)
    updateStudent(id: ID!, input: UpdateStudentInput!): Student! @auth(requires: ADMIN)
    deleteStudent(id: ID!): Boolean! @auth(requires: ADMIN)
    
    # Courses
    createCourse(input: CreateCourseInput!): Course! @auth(requires: ADMIN)
    updateCourse(id: ID!, input: UpdateCourseInput!): Course! @auth(requires: ADMIN)
    deleteCourse(id: ID!): Boolean! @auth(requires: ADMIN)
    
    # Enrollments
    createEnrollment(input: CreateEnrollmentInput!): Enrollment! @auth(requires: ADMIN)
    updateEnrollment(id: ID!, input: UpdateEnrollmentInput!): Enrollment! @auth(requires: ADMIN)
    
    # Achievements
    createAchievement(input: CreateAchievementInput!): Achievement! @auth(requires: ADMIN)
    deleteAchievement(id: ID!): Boolean! @auth(requires: ADMIN)
    
    # Certificate Templates
    createCertificateTemplate(input: CreateTemplateInput!): CertificateTemplate! @auth(requires: ADMIN)
    updateCertificateTemplate(id: ID!, input: UpdateTemplateInput!): CertificateTemplate! @auth(requires: ADMIN)
    deleteCertificateTemplate(id: ID!): Boolean! @auth(requires: ADMIN)
    
    # Certificate Issuance
    issueCertificate(input: IssueCertificateInput!): Certificate! @auth(requires: ADMIN)
    bulkIssueCertificates(input: BulkIssueInput!): BatchIssuanceJob! @auth(requires: ADMIN)

    # Batch Certificate Minting (Client-side signing)
    prepareBatchMinting(certificateIds: [ID!]!): BatchMintingPreparation! @auth(requires: ADMIN)
    updateBatchProgress(batchId: ID!, certificateId: ID!, success: Boolean!, signature: String, error: String): BatchProgressUpdate! @auth(requires: ADMIN)
    getBatchJob(batchId: ID!): BatchIssuanceJob @auth(requires: ADMIN)
    cancelBatchJob(batchId: ID!): BatchIssuanceJob! @auth(requires: ADMIN)
    fixPendingCertificates: FixPendingCertificatesResult! @auth(requires: ADMIN)

    # Certificate Revocation
    revokeCertificate(input: RevokeCertificateInput!): Certificate! @auth(requires: ADMIN)

    # On-chain certificate mint workflow
    prepareMintCertificateWorkflow(certificateId: ID!): PrepareMintCertificateWorkflowPayload! @auth(requires: ADMIN)
    prepareRegisterUniversityTransaction(universityId: ID!, superAdminPubkey: String!): PreparedSolanaTransaction! @auth(requires: SUPER_ADMIN)
    submitRegisterUniversityTransaction(universityId: ID!, signedTransaction: String!): TransactionSubmissionResult! @auth(requires: SUPER_ADMIN)
    prepareApproveUniversityTransaction(universityId: ID!): PreparedSolanaTransaction! @auth(requires: SUPER_ADMIN)
    prepareCreateTreeTransaction(universityId: ID!, maxDepth: Int!, maxBufferSize: Int!, isPublic: Boolean!): PreparedSolanaTransaction! @auth(requires: ADMIN)
    prepareCreateCollectionTransaction(universityId: ID!, name: String!, uri: String!): PreparedSolanaTransaction! @auth(requires: ADMIN)
    prepareMintCertificateTransaction(certificateId: ID!): PreparedSolanaTransaction! @auth(requires: ADMIN)
    submitSignedTransaction(signedTransaction: String!, operationType: String!, metadata: JSON): TransactionSubmissionResult! @auth(requires: ADMIN)

    # One-click transaction mutations (client-side signing with wallet)
    createMerkleTree(universityId: ID!, maxDepth: Int!, maxBufferSize: Int!, isPublic: Boolean!): PreparedSolanaTransaction! @auth(requires: ADMIN)
    createCollection(universityId: ID!, name: String!, imageBase64: String!, symbol: String, description: String): PreparedSolanaTransaction! @auth(requires: ADMIN)
    confirmTransaction(signature: String!, operationType: String!, metadata: JSON): TransactionSubmissionResult! @auth(requires: ADMIN)
    mintCertificate(certificateId: ID!, attachCollection: Boolean!): PreparedSolanaTransaction! @auth(requires: ADMIN)

    # Image upload for collections and certificates
    uploadImageToIPFS(imageBase64: String!, fileName: String!): ImageUploadResult! @auth(requires: ADMIN)
    
    # ZKP (would be called from student frontend, needs different auth)
    generateZKProof(input: ZKProofInput!): ZKPProofRequest!
  }

  # ============================================
  # INPUT TYPES
  # ============================================
  
  input RegisterInput {
    email: String!
    password: String!
    username: String!
    fullName: String
    universityId: ID
  }
  
  input LoginInput {
    email: String!
    password: String!
    totpToken: String
  }
  
  input RegisterUniversityInput {
    name: String!
    domain: String!
    country: String!
    logoUrl: String
    websiteUrl: String
    walletAddress: String!
    adminEmail: String!
    adminPassword: String!
    adminFullName: String!
    registrationSignature: String!
    universityPda: String!
  }
  
  input ApproveUniversityInput {
    universityId: ID!
    approvalSignature: String!
    universityPda: String!
  }

  input DeactivateUniversityInput {
    universityId: ID!
    deactivationSignature: String!
    universityPda: String!
    reason: String
  }

  input SuspendUniversityInput {
    universityId: ID!
    deactivationSignature: String!
    universityPda: String!
    reason: String!
  }

  input UpdateUniversityInput {
    name: String
    logoUrl: String
    websiteUrl: String
  }
  
  input StudentCourseInput {
    code: String!
    name: String!
    description: String
    credits: Int
    department: String!
    degreeType: String!
  }

  input StudentEnrollmentInput {
    course: StudentCourseInput!
    batchYear: Int!
    gpa: Float
    grade: String
  }

  input RegisterStudentInput {
    email: String!
    fullName: String!
    studentNumber: String!
    nationalId: String!
    walletAddress: String!
    program: String!
    department: String!
    enrollmentYear: Int!
    primaryEnrollment: StudentEnrollmentInput!
    achievements: [StudentAchievementInput!]
  }
  
  input UpdateStudentInput {
    email: String
    fullName: String
    walletAddress: String
    program: String
    department: String
    graduationYear: Int
  }

  input EnrollStudentInCourseInput {
    studentId: ID!
    course: StudentCourseInput!
    batchYear: Int!
    gpa: Float
    grade: String
    achievements: [StudentAchievementInput!]
  }

input StudentAchievementInput {
  id: ID
  title: String
  description: String
  category: String
  notes: String
  awardedAt: DateTime
}
  
  input CreateCourseInput {
    name: String!
    code: String!
    description: String
    credits: Int
    department: String
  }
  
  input UpdateCourseInput {
    name: String
    description: String
    credits: Int
    isActive: Boolean
  }
  
  input CreateEnrollmentInput {
    studentId: ID!
    courseId: ID!
    batchYear: Int!
  }
  
  input UpdateEnrollmentInput {
    gpa: Float
    grade: String
  }
  
  input CreateAchievementInput {
    enrollmentId: ID!
    badgeTitle: String!
    description: String
    badgeType: String
    semester: String
    achievementDate: DateTime
  }
  
  input CreateTemplateInput {
    name: String!
    degreeType: String!
    description: String
    templateFields: JSON!
    designTemplate: JSON!
    backgroundImage: String
  }
  
  input UpdateTemplateInput {
    name: String
    description: String
    templateFields: JSON
    designTemplate: JSON
    backgroundImage: String
    isActive: Boolean
  }
  
  input IssueCertificateInput {
    studentId: ID!
    enrollmentId: ID
    templateId: ID!
    badgeTitle: String!
    description: String
    degreeType: String
    metadata: JSON!
    achievementIds: [ID!]
    expiryDate: DateTime
  }
  
  input BulkIssueInput {
    studentIds: [ID!]!
    templateId: ID!
    batchName: String
    certificateData: JSON!
  }
  
  input RevokeCertificateInput {
    certificateId: ID!
    reason: String!
    adminPassword: String!
  }
  
  input ZKProofInput {
    certificateId: ID
    achievementId: ID
    claimType: String!
    claimData: JSON
    expiresIn: Int
  }
  
  input BulkStudentRowInput {
    rowNumber: Int!
    fullName: String!
    email: String!
    studentNumber: String!
    nationalId: String!
    walletAddress: String!
    program: String!
    department: String!
    enrollmentYear: Int!
    courseCode: String!
    courseName: String!
    courseDescription: String
    courseCredits: Int
    degreeType: String!
    enrollmentGpa: Float
    enrollmentGrade: String
    achievements: [String!]
  }

  input BulkStudentImportInput {
    students: [BulkStudentRowInput!]!
    overwriteWalletFromGlobalIndex: Boolean
  }

  type BulkStudentImportFailure {
    rowNumber: Int!
    message: String!
    field: String
    email: String
    studentNumber: String
  }

  type BulkStudentImportResult {
    successCount: Int!
    failureCount: Int!
    failures: [BulkStudentImportFailure!]!
  }

  # ============================================
  # DIRECTIVES
  # ============================================
  
  enum Role {
    SUPER_ADMIN
    ADMIN
    STUDENT
  }
  
  directive @auth(requires: Role!) on FIELD_DEFINITION
`;

