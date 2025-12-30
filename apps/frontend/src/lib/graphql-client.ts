const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: Record<string, any>;
  }>;
}

const PREPARED_TRANSACTION_FIELDS = `
  operationType
  transaction
  blockhash
  lastValidBlockHeight
  message
  metadata
  accountsCreated {
    name
    address
  }
`;

class GraphQLClient {
  private endpoint: string;
  private token: string | null = null;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('accessToken');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  }

  async request<T>(
    query: string,
    variables?: Record<string, any>
  ): Promise<GraphQLResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      const json: GraphQLResponse<T> = await response.json();

      return json;
    } catch (error) {
      throw error;
    }
  }

  // Auth mutations
  async login(email: string, password: string, totpToken?: string) {
    const query = `
      mutation Login($input: LoginInput!) {
        login(input: $input) {
          admin {
            id
            email
            username
            fullName
            isSuperAdmin
            totpEnabled
            university {
              id
              name
              domain
              walletAddress
              status
            }
          }
          accessToken
          refreshToken
          requiresTOTP
        }
      }
    `;

    const response = await this.request<{
      login: {
        admin: any | null;
        accessToken: string | null;
        refreshToken: string | null;
        requiresTOTP: boolean;
      };
    }>(query, {
      input: { email, password, totpToken },
    });

    // Store tokens and user data on successful login (not when TOTP is required)
    if (response.data?.login && response.data.login.accessToken) {
      this.setToken(response.data.login.accessToken);
      if (typeof window !== 'undefined' && response.data.login.refreshToken) {
        localStorage.setItem('refreshToken', response.data.login.refreshToken);
      }
    }

    return response;
  }

  async me() {
    const query = `
      query Me {
        me {
          id
          email
          username
          fullName
          isSuperAdmin
          totpEnabled
          university {
            id
            name
            domain
            walletAddress
            status
            merkleTreeAddress
            collectionAddress
          }
        }
      }
    `;

    return this.request<{ me: any }>(query);
  }

  async register(input: {
    email: string;
    password: string;
    username: string;
    fullName?: string;
    universityId?: string;
  }) {
    const query = `
      mutation Register($input: RegisterInput!) {
        register(input: $input) {
          admin {
            id
            email
            username
            fullName
            isSuperAdmin
            university {
              id
              name
              domain
            }
          }
          accessToken
          refreshToken
        }
      }
    `;

    return this.request<{
      register: {
        admin: any;
        accessToken: string;
        refreshToken: string;
      };
    }>(query, { input });
  }

  async logout() {
    const query = `
      mutation Logout {
        logout
      }
    `;

    const response = await this.request<{ logout: boolean }>(query);

    // Clear local storage
    this.setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('session'); // Clear old session format
      localStorage.removeItem('adminSession');
      localStorage.removeItem('studentSession');
    }

    return response;
  }

  async refreshAccessToken() {
    if (typeof window === 'undefined') {
      return { data: null, errors: [{ message: 'Not in browser environment' }] };
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return { data: null, errors: [{ message: 'No refresh token available' }] };
    }

    const query = `
      mutation RefreshToken($refreshToken: String!) {
        refreshToken(refreshToken: $refreshToken) {
          admin {
            id
            email
            username
            fullName
            isSuperAdmin
          }
          accessToken
          refreshToken
        }
      }
    `;

    const response = await this.request<{
      refreshToken: {
        admin: any;
        accessToken: string;
        refreshToken: string;
      };
    }>(query, { refreshToken });

    if (response.data?.refreshToken) {
      // Update tokens
      this.setToken(response.data.refreshToken.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken.refreshToken);
    }

    return response;
  }

  getCurrentUser() {
    if (typeof window === 'undefined') return null;
    
    const userStr = localStorage.getItem('session');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    if (this.token) return true;
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('accessToken');
  }

  // University queries
  async getAllUniversities(status?: string) {
    const query = `
      query AllUniversities($status: UniversityStatus) {
        allUniversities(status: $status) {
          id
          name
          domain
          country
          logoUrl
          websiteUrl
          walletAddress
          status
          createdAt
          approvedAt
        }
      }
    `;

    return this.request<{ allUniversities: any[] }>(query, { status });
  }

  async getMyUniversity() {
    const query = `
      query MyUniversity {
        myUniversity {
          id
          name
          domain
          country
          logoUrl
          websiteUrl
          walletAddress
          merkleTreeAddress
          collectionAddress
          status
          createdAt
          stats {
            totalCertificates
            mintedCount
            pendingCount
            revokedCount
            activeStudents
            totalStudents
          }
        }
      }
    `;

    return this.request<{ myUniversity: any }>(query);
  }

  async getUniversityStats() {
    const query = `
      query UniversityStats {
        universityStats {
          totalCertificates
          mintedCount
          pendingCount
          revokedCount
          activeStudents
          totalStudents
        }
      }
    `;

    return this.request<{ universityStats: any }>(query);
  }

  async getUniversityAnalytics(days: number = 30) {
    const query = `
      query UniversityAnalytics($days: Int) {
        universityAnalytics(days: $days) {
          overview {
            totalCertificates
            mintedCertificates
            pendingCertificates
            revokedCertificates
            totalStudents
            activeStudents
            studentsWithWallet
            studentsWithoutWallet
            totalVerifications
            successfulVerifications
            failedVerifications
            totalCourses
          }
          blockchainMetrics {
            totalMintTransactions
            successfulMints
            failedMints
            treeAddress
            collectionAddress
            successRate
            recentMints {
              id
              signature
              studentName
              badgeTitle
              timestamp
              status
            }
          }
          trends {
            certificatesPerDay {
              date
              count
            }
            verificationsPerDay {
              date
              count
            }
            studentsPerMonth {
              month
              count
            }
          }
          topPrograms {
            program
            department
            studentCount
            certificateCount
          }
        }
      }
    `;

    return this.request<{
      universityAnalytics: {
        overview: {
          totalCertificates: number;
          mintedCertificates: number;
          pendingCertificates: number;
          revokedCertificates: number;
          totalStudents: number;
          activeStudents: number;
          studentsWithWallet: number;
          studentsWithoutWallet: number;
          totalVerifications: number;
          successfulVerifications: number;
          failedVerifications: number;
          totalCourses: number;
        };
        blockchainMetrics: {
          totalMintTransactions: number;
          successfulMints: number;
          failedMints: number;
          treeAddress: string | null;
          collectionAddress: string | null;
          successRate: number;
          recentMints: Array<{
            id: string;
            signature: string | null;
            studentName: string;
            badgeTitle: string;
            timestamp: string;
            status: string;
          }>;
        };
        trends: {
          certificatesPerDay: Array<{ date: string; count: number }>;
          verificationsPerDay: Array<{ date: string; count: number }>;
          studentsPerMonth: Array<{ month: string; count: number }>;
        };
        topPrograms: Array<{
          program: string;
          department: string | null;
          studentCount: number;
          certificateCount: number;
        }>;
      };
    }>(query, { days });
  }

  async getMintActivityLogs(params?: {
    status?: string;
    studentWallet?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = `
      query MintActivityLogs($status: MintStatus, $studentWallet: String, $limit: Int, $offset: Int) {
        mintActivityLogs(status: $status, studentWallet: $studentWallet, limit: $limit, offset: $offset) {
          id
          studentWallet
          mintAddress
          badgeTitle
          status
          transactionSignature
          timestamp
        }
      }
    `;

    return this.request<{ mintActivityLogs: any[] }>(query, params);
  }

  // University mutations
  async registerUniversity(input: {
    name: string;
    domain: string;
    country: string;
    logoUrl?: string;
    websiteUrl?: string;
    walletAddress: string;
    adminEmail: string;
    adminPassword: string;
    adminFullName: string;
    registrationSignature: string;
    universityPda: string;
  }) {
    const query = `
      mutation RegisterUniversity($input: RegisterUniversityInput!) {
        registerUniversity(input: $input) {
          id
          name
          domain
          country
          logoUrl
          websiteUrl
          walletAddress
          status
          createdAt
          universityPDA
          registrationTxSignature
        }
      }
    `;

    return this.request<{ registerUniversity: any }>(query, { input });
  }

  async approveUniversity(input: {
    universityId: string;
    approvalSignature: string;
    universityPda: string;
  }) {
    const query = `
      mutation ApproveUniversity($input: ApproveUniversityInput!) {
        approveUniversity(input: $input) {
          id
          name
          status
          approvedAt
          universityPDA
          approvalTxSignature
        }
      }
    `;

    return this.request<{ approveUniversity: any }>(query, { input });
  }

  async deactivateUniversity(input: {
    universityId: string;
    deactivationSignature: string;
    universityPda: string;
    reason?: string;
  }) {
    const query = `
      mutation DeactivateUniversity($input: DeactivateUniversityInput!) {
        deactivateUniversity(input: $input) {
          id
          status
          deactivationTxSignature
        }
      }
    `;

    return this.request<{ deactivateUniversity: any }>(query, { input });
  }

  async rejectUniversity(universityId: string, reason: string) {
    const query = `
      mutation RejectUniversity($universityId: ID!, $reason: String!) {
        rejectUniversity(universityId: $universityId, reason: $reason) {
          id
          status
        }
      }
    `;

    return this.request<{ rejectUniversity: any }>(query, { universityId, reason });
  }

  async suspendUniversity(input: {
    universityId: string;
    deactivationSignature: string;
    universityPda: string;
    reason: string;
  }) {
    const query = `
      mutation SuspendUniversity($input: SuspendUniversityInput!) {
        suspendUniversity(input: $input) {
          id
          status
          deactivationTxSignature
        }
      }
    `;

    return this.request<{ suspendUniversity: any }>(query, { input });
  }

  async updateUniversityProfile(input: {
    name?: string;
    logoUrl?: string;
    websiteUrl?: string;
  }) {
    const query = `
      mutation UpdateUniversityProfile($input: UpdateUniversityInput!) {
        updateUniversityProfile(input: $input) {
          id
          name
          logoUrl
          websiteUrl
        }
      }
    `;

    return this.request<{ updateUniversityProfile: any }>(query, { input });
  }

  async getUniversity(id: string) {
    const query = `
      query University($id: ID!) {
        university(id: $id) {
          id
          name
          domain
          country
          logoUrl
          websiteUrl
          walletAddress
          universityPDA
          merkleTreeAddress
          collectionAddress
          status
          createdAt
          approvedAt
          registrationTxSignature
          approvalTxSignature
          deactivationTxSignature
          rejectedReason
          databaseName
          databaseUrl
          superAdminPubkey
          admins {
            id
            email
            fullName
            isSuperAdmin
          }
          mintLogs {
            id
            badgeTitle
            status
            transactionSignature
            timestamp
          }
        }
      }
    `;

    const legacyQuery = `
      query UniversityLegacy($id: ID!) {
        university(id: $id) {
          id
          name
          domain
          country
          logoUrl
          websiteUrl
          walletAddress
          universityPDA
          merkleTreeAddress
          collectionAddress
          status
          createdAt
          approvedAt
          registrationTxSignature
          approvalTxSignature
          deactivationTxSignature
          databaseName
          databaseUrl
          superAdminPubkey
          admins {
            id
            email
            fullName
            isSuperAdmin
          }
          mintLogs {
            id
            badgeTitle
            status
            transactionSignature
            timestamp
          }
        }
      }
    `;

    const response = await this.request<{ university: any }>(query, { id });

    if (
      response.errors?.some((error) =>
        typeof error.message === 'string' &&
        error.message.includes('Cannot query field "rejectedReason"')
      )
    ) {
      const fallbackResponse = await this.request<{ university: any }>(legacyQuery, { id });

      // Preserve original errors if fallback also fails
      if (fallbackResponse.errors && !fallbackResponse.data?.university) {
        return {
          data: fallbackResponse.data,
          errors: [...response.errors, ...fallbackResponse.errors],
        };
      }

      return fallbackResponse;
    }

    return response;
  }

  // Students
  async getStudents(params?: {
    search?: string;
    program?: string;
    batchYear?: number;
    limit?: number;
    offset?: number;
  }) {
    const query = `
      query Students($search: String, $program: String, $batchYear: Int, $limit: Int, $offset: Int) {
        students(search: $search, program: $program, batchYear: $batchYear, limit: $limit, offset: $offset) {
          id
          email
          fullName
          studentNumber
          walletAddress
          program
          department
          enrollmentYear
          graduationYear
          isActive
          createdAt
          achievements {
            id
            notes
            awardedAt
            achievement {
              id
              title
              description
              category
            }
          }
          enrollments {
            id
            batchYear
            gpa
            grade
            course {
              id
              code
              name
              credits
              department
              level
            }
          }
        }
      }
    `;

    return this.request<{ students: any[] }>(query, params);
  }

  async registerStudent(input: {
    email: string;
    fullName: string;
    studentNumber: string;
    nationalId: string;
    walletAddress: string;
    program: string;
    department: string;
    enrollmentYear: number;
    primaryEnrollment: {
      course: {
        code: string;
        name: string;
        description?: string;
        credits?: number;
        department: string;
        degreeType: string;
      };
      batchYear: number;
      gpa?: number;
      grade?: string;
    };
    achievements?: Array<{
      id?: string;
      title?: string;
      description?: string;
      category?: string;
      notes?: string;
      awardedAt?: string;
    }>;
  }) {
    const query = `
      mutation RegisterStudent($input: RegisterStudentInput!) {
        registerStudent(input: $input) {
          id
          email
          fullName
          studentNumber
          walletAddress
          program
          department
          enrollmentYear
          enrollments {
            id
            batchYear
            gpa
            grade
            course {
              id
              code
              name
              department
              credits
            }
          }
          achievements {
            id
            notes
            awardedAt
            achievement {
              id
              title
              description
              category
            }
          }
        }
      }
    `;

    return this.request<{ registerStudent: any }>(query, { input });
  }

  async enrollStudentInCourse(input: {
    studentId: string;
    course: {
      code: string;
      name: string;
      description?: string;
      credits?: number;
      department: string;
      degreeType: string;
    };
    batchYear: number;
    gpa?: number;
    grade?: string;
    achievements?: Array<{
      id?: string;
      title?: string;
      description?: string;
      category?: string;
      notes?: string;
      awardedAt?: string;
    }>;
  }) {
    const query = `
      mutation EnrollStudentInCourse($input: EnrollStudentInCourseInput!) {
        enrollStudentInCourse(input: $input) {
          id
          batchYear
          gpa
          grade
          student {
            id
            fullName
            email
            studentNumber
            program
            department
          }
          course {
            id
            name
            code
            department
          }
          achievements {
            id
            badgeTitle
            description
            badgeType
          }
        }
      }
    `;

    return this.request<{ enrollStudentInCourse: any }>(query, { input });
  }

  async bulkImportStudents(input: {
    students: Array<{
      rowNumber: number;
      fullName: string;
      email: string;
      studentNumber: string;
      nationalId: string;
      walletAddress: string;
      program: string;
      department: string;
      enrollmentYear: number;
      courseCode: string;
      courseName: string;
      courseDescription?: string | null;
      courseCredits?: number | null;
      degreeType: string;
      enrollmentGpa?: number | null;
      enrollmentGrade?: string | null;
      achievements?: string[] | null;
    }>;
    overwriteWalletFromGlobalIndex?: boolean;
  }) {
    const query = `
      mutation BulkImportStudents($input: BulkStudentImportInput!) {
        bulkImportStudents(input: $input) {
          successCount
          failureCount
          failures {
            rowNumber
            message
            field
            email
            studentNumber
          }
        }
      }
    `;

    return this.request<{
      bulkImportStudents: {
        successCount: number;
        failureCount: number;
        failures: Array<{
          rowNumber: number;
          message: string;
          field?: string | null;
          email?: string | null;
          studentNumber?: string | null;
        }>;
      };
    }>(query, { input });
  }

  async deleteStudent(id: string) {
    const query = `
      mutation DeleteStudent($id: ID!) {
        deleteStudent(id: $id)
      }
    `;

    return this.request<{ deleteStudent: boolean }>(query, { id });
  }

  async getAchievementCatalog(search?: string) {
    const query = `
      query AchievementCatalog($search: String) {
        achievementCatalog(search: $search) {
          id
          title
          description
          category
        }
      }
    `;

    return this.request<{ achievementCatalog: any[] }>(query, { search });
  }

  async lookupStudentByNationalId(nationalId: string) {
    const query = `
      query LookupStudentByNationalId($nationalId: String!) {
        lookupStudentByNationalId(nationalId: $nationalId) {
          existsInUniversity
          globalExists
          studentId
          fullName
          email
          walletAddress
          globalWalletAddress
          createdByUniversityName
        }
      }
    `;

    return this.request<{
      lookupStudentByNationalId: {
        existsInUniversity: boolean;
        globalExists: boolean;
        studentId?: string | null;
        fullName?: string | null;
        email?: string | null;
        walletAddress?: string | null;
        globalWalletAddress?: string | null;
        createdByUniversityName?: string | null;
      };
    }>(query, { nationalId });
  }

  async getStudentsWithoutCertificates(params?: { limit?: number; offset?: number }) {
    const query = `
      query StudentsWithoutCertificates($limit: Int, $offset: Int) {
        studentsWithoutCertificates(limit: $limit, offset: $offset) {
          id
          fullName
          email
          studentNumber
          walletAddress
          program
          department
          enrollmentYear
          achievements {
            id
            notes
            awardedAt
            achievement {
              id
              title
              description
              category
            }
          }
          enrollments {
            id
            batchYear
            gpa
            grade
            achievements {
              id
              badgeTitle
              achievementDate
            }
            course {
              id
              code
              name
              description
              credits
              department
            }
          }
          certificates {
            id
            status
          }
        }
      }
    `;

    return this.request<{ studentsWithoutCertificates: any[] }>(query, params);
  }

  // Certificates
  async getCertificates(params?: {
    status?: string;
    studentId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = `
      query Certificates($status: CertificateStatus, $studentId: ID, $search: String, $limit: Int, $offset: Int) {
        certificates(status: $status, studentId: $studentId, search: $search, limit: $limit, offset: $offset) {
          id
          certificateNumber
          badgeTitle
          description
          degreeType
          mintAddress
          ipfsMetadataUri
          transactionSignature
          status
          issuedAt
          revoked
          revokedAt
          revocationReason
          revocationTransactionSignature
          student {
            id
            fullName
            email
            walletAddress
            studentNumber
            program
            department
          }
        }
      }
    `;

    return this.request<{ certificates: any[] }>(query, params);
  }

  async revokeCertificate(input: {
    certificateId: string;
    reason: string;
    adminPassword: string;
  }) {
    const mutation = `
      mutation RevokeCertificate($input: RevokeCertificateInput!) {
        revokeCertificate(input: $input) {
          id
          certificateNumber
          badgeTitle
          revoked
          revokedAt
          revocationReason
          student {
            id
            fullName
            email
            walletAddress
            studentNumber
          }
        }
      }
    `;

    return this.request<{ revokeCertificate: any }>(mutation, { input });
  }

  async verifyCertificatePublic(params: {
    certificateNumber?: string;
    mintAddress?: string;
  }) {
    const query = `
      query VerifyCertificatePublic($certificateNumber: String, $mintAddress: String) {
        verifyCertificatePublic(certificateNumber: $certificateNumber, mintAddress: $mintAddress) {
          isValid
          status
          verificationTimestamp
          certificate {
            badgeTitle
            issueDate
            degreeType
            studentName
            achievements
            university {
              name
              logoUrl
              isVerified
            }
          }
          revocationInfo {
            isRevoked
            revokedAt
            reason
            transactionSignature
          }
          blockchainProof {
            mintAddress
            transactionSignature
            merkleTreeAddress
            metadataUri
            verifiedAt
          }
        }
      }
    `;

    return this.request<{
      verifyCertificatePublic: {
        isValid: boolean;
        status: string;
        verificationTimestamp: string;
        certificate: any;
        revocationInfo: any;
        blockchainProof: any;
      };
    }>(query, params);
  }

  async getSuperAdminWallet() {
    const query = `
      query GetSuperAdminWallet {
        getSuperAdminWallet
      }
    `;

    return this.request<{
      getSuperAdminWallet: string;
    }>(query);
  }

  async getCertificateTemplates() {
    const query = `
      query CertificateTemplates {
        certificateTemplates {
          id
          name
          degreeType
          description
          templateFields
          designTemplate
          backgroundImage
          isActive
          timesUsed
          createdAt
        }
      }
    `;

    return this.request<{ certificateTemplates: any[] }>(query, {});
  }

  async createCertificateTemplate(input: {
    name: string;
    degreeType: string;
    description?: string;
    templateFields: Record<string, unknown>;
    designTemplate: Record<string, unknown>;
    backgroundImage?: string | null;
  }) {
    const mutation = `
      mutation CreateCertificateTemplate($input: CreateTemplateInput!) {
        createCertificateTemplate(input: $input) {
          id
          name
          degreeType
          description
          templateFields
          designTemplate
          backgroundImage
          isActive
          timesUsed
          createdAt
        }
      }
    `;

    return this.request<{ createCertificateTemplate: any }>(mutation, { input });
  }

  async updateCertificateTemplate(
    id: string,
    input: {
      name?: string;
      description?: string;
      templateFields?: Record<string, unknown>;
      designTemplate?: Record<string, unknown>;
      backgroundImage?: string | null;
      isActive?: boolean;
    }
  ) {
    const mutation = `
      mutation UpdateCertificateTemplate($id: ID!, $input: UpdateTemplateInput!) {
        updateCertificateTemplate(id: $id, input: $input) {
          id
          name
          degreeType
          description
          templateFields
          designTemplate
          backgroundImage
          isActive
          timesUsed
          createdAt
        }
      }
    `;

    return this.request<{ updateCertificateTemplate: any }>(mutation, { id, input });
  }

  async deleteCertificateTemplate(id: string) {
    const mutation = `
      mutation DeleteCertificateTemplate($id: ID!) {
        deleteCertificateTemplate(id: $id)
      }
    `;

    return this.request<{ deleteCertificateTemplate: boolean }>(mutation, { id });
  }

  async issueCertificate(input: {
    studentId: string;
    templateId: string;
    enrollmentId?: string;
    badgeTitle: string;
    description?: string;
    degreeType?: string;
    metadata: Record<string, any>;
    achievementIds?: string[];
    expiryDate?: string;
  }) {
    const query = `
      mutation IssueCertificate($input: IssueCertificateInput!) {
        issueCertificate(input: $input) {
          id
          certificateNumber
          badgeTitle
          status
          mintAddress
          ipfsMetadataUri
          achievementIds
        }
      }
    `;

    return this.request<{ issueCertificate: any }>(query, { input });
  }

  async prepareRegisterUniversityTransaction(params: {
    universityId: string;
    superAdminPubkey: string;
  }) {
    const mutation = `
      mutation PrepareRegisterUniversityTransaction($universityId: ID!, $superAdminPubkey: String!) {
        prepareRegisterUniversityTransaction(universityId: $universityId, superAdminPubkey: $superAdminPubkey) {
          ${PREPARED_TRANSACTION_FIELDS}
        }
      }
    `;

    return this.request<{
      prepareRegisterUniversityTransaction: any;
    }>(mutation, params);
  }

  async submitRegisterUniversityTransaction(params: {
    universityId: string;
    signedTransaction: string;
  }) {
    const mutation = `
      mutation SubmitRegisterUniversityTransaction($universityId: ID!, $signedTransaction: String!) {
        submitRegisterUniversityTransaction(universityId: $universityId, signedTransaction: $signedTransaction) {
          success
          signature
          message
        }
      }
    `;

    return this.request<{
      submitRegisterUniversityTransaction: {
        success: boolean;
        signature: string;
        message: string;
      };
    }>(mutation, params);
  }

  async prepareApproveUniversityTransaction(universityId: string) {
    const mutation = `
      mutation PrepareApproveUniversityTransaction($universityId: ID!) {
        prepareApproveUniversityTransaction(universityId: $universityId) {
          ${PREPARED_TRANSACTION_FIELDS}
        }
      }
    `;

    return this.request<{
      prepareApproveUniversityTransaction: any;
    }>(mutation, { universityId });
  }

  async prepareCreateTreeTransaction(params: {
    universityId: string;
    maxDepth: number;
    maxBufferSize: number;
    isPublic: boolean;
  }) {
    const mutation = `
      mutation PrepareCreateTreeTransaction(
        $universityId: ID!
        $maxDepth: Int!
        $maxBufferSize: Int!
        $isPublic: Boolean!
      ) {
        prepareCreateTreeTransaction(
          universityId: $universityId
          maxDepth: $maxDepth
          maxBufferSize: $maxBufferSize
          isPublic: $isPublic
        ) {
          ${PREPARED_TRANSACTION_FIELDS}
        }
      }
    `;

    return this.request<{
      prepareCreateTreeTransaction: any;
    }>(mutation, params);
  }

  async prepareCreateCollectionTransaction(params: {
    universityId: string;
    name: string;
    uri: string;
  }) {
    const mutation = `
      mutation PrepareCreateCollectionTransaction(
        $universityId: ID!
        $name: String!
        $uri: String!
      ) {
        prepareCreateCollectionTransaction(
          universityId: $universityId
          name: $name
          uri: $uri
        ) {
          ${PREPARED_TRANSACTION_FIELDS}
        }
      }
    `;

    return this.request<{
      prepareCreateCollectionTransaction: any;
    }>(mutation, params);
  }

  async prepareMintCertificateTransaction(certificateId: string) {
    const mutation = `
      mutation PrepareMintCertificateTransaction($certificateId: ID!) {
        prepareMintCertificateTransaction(certificateId: $certificateId) {
          ${PREPARED_TRANSACTION_FIELDS}
        }
      }
    `;

    return this.request<{
      prepareMintCertificateTransaction: any;
    }>(mutation, { certificateId });
  }

  async prepareMintCertificateWorkflow(certificateId: string) {
    const mutation = `
      mutation PrepareMintCertificateWorkflow($certificateId: ID!) {
        prepareMintCertificateWorkflow(certificateId: $certificateId) {
          prerequisites {
            ${PREPARED_TRANSACTION_FIELDS}
          }
          mint {
            ${PREPARED_TRANSACTION_FIELDS}
          }
        }
      }
    `;

    return this.request<{
      prepareMintCertificateWorkflow: {
        prerequisites: any[];
        mint: any;
      };
    }>(mutation, { certificateId });
  }

  async prepareBurnCertificateTransaction(certificateId: string, reason: string) {
    const mutation = `
      mutation PrepareBurnCertificateTransaction($certificateId: ID!, $reason: String!) {
        prepareBurnCertificateTransaction(certificateId: $certificateId, reason: $reason) {
          ${PREPARED_TRANSACTION_FIELDS}
        }
      }
    `;

    return this.request<{
      prepareBurnCertificateTransaction: any;
    }>(mutation, { certificateId, reason });
  }

  async prepareBurnCertificateWorkflow(certificateId: string, reason: string) {
    const mutation = `
      mutation PrepareBurnCertificateWorkflow($certificateId: ID!, $reason: String!) {
        prepareBurnCertificateWorkflow(certificateId: $certificateId, reason: $reason) {
          prerequisites {
            ${PREPARED_TRANSACTION_FIELDS}
          }
          burn {
            ${PREPARED_TRANSACTION_FIELDS}
          }
        }
      }
    `;

    return this.request<{
      prepareBurnCertificateWorkflow: {
        prerequisites: any[];
        burn: any | null;
      };
    }>(mutation, { certificateId, reason });
  }

  async submitSignedTransaction(params: {
    signedTransaction: string;
    operationType: string;
    metadata?: Record<string, any>;
  }) {
    const mutation = `
      mutation SubmitSignedTransaction(
        $signedTransaction: String!
        $operationType: String!
        $metadata: JSON
      ) {
        submitSignedTransaction(
          signedTransaction: $signedTransaction
          operationType: $operationType
          metadata: $metadata
        ) {
          success
          signature
          message
        }
      }
    `;

    return this.request<{
      submitSignedTransaction: {
        success: boolean;
        signature: string;
        message: string;
      };
    }>(mutation, params);
  }

  // New one-click transaction mutations
  async createMerkleTree(params: {
    universityId: string;
    maxDepth: number;
    maxBufferSize: number;
    isPublic: boolean;
  }) {
    const mutation = `
      mutation CreateMerkleTree(
        $universityId: ID!
        $maxDepth: Int!
        $maxBufferSize: Int!
        $isPublic: Boolean!
      ) {
        createMerkleTree(
          universityId: $universityId
          maxDepth: $maxDepth
          maxBufferSize: $maxBufferSize
          isPublic: $isPublic
        ) {
          ${PREPARED_TRANSACTION_FIELDS}
        }
      }
    `;

    return this.request<{ createMerkleTree: any }>(mutation, params);
  }

  async createCollection(params: {
    universityId: string;
    name: string;
    imageBase64: string;
    symbol?: string;
    description?: string;
  }) {
    const mutation = `
      mutation CreateCollection(
        $universityId: ID!
        $name: String!
        $imageBase64: String!
        $symbol: String
        $description: String
      ) {
        createCollection(
          universityId: $universityId
          name: $name
          imageBase64: $imageBase64
          symbol: $symbol
          description: $description
        ) {
          ${PREPARED_TRANSACTION_FIELDS}
        }
      }
    `;

    return this.request<{ createCollection: any }>(mutation, params);
  }

  async confirmTransaction(params: {
    signature: string;
    operationType: string;
    metadata?: Record<string, any>;
  }) {
    const mutation = `
      mutation ConfirmTransaction(
        $signature: String!
        $operationType: String!
        $metadata: JSON
      ) {
        confirmTransaction(
          signature: $signature
          operationType: $operationType
          metadata: $metadata
        ) {
          success
          signature
          message
        }
      }
    `;

    return this.request<{
      confirmTransaction: {
        success: boolean;
        signature: string;
        message: string;
      };
    }>(mutation, params);
  }

  async mintCertificate(params: {
    certificateId: string;
    attachCollection: boolean;
  }) {
    const mutation = `
      mutation MintCertificate(
        $certificateId: ID!
        $attachCollection: Boolean!
      ) {
        mintCertificate(
          certificateId: $certificateId
          attachCollection: $attachCollection
        ) {
          ${PREPARED_TRANSACTION_FIELDS}
        }
      }
    `;

    return this.request<{ mintCertificate: any }>(mutation, params);
  }

  // ============================================
  // STUDENT AUTHENTICATION
  // ============================================

  async studentLoginWithWallet(walletAddress: string) {
    const mutation = `
      mutation StudentLoginWithWallet($walletAddress: String!) {
        studentLoginWithWallet(walletAddress: $walletAddress) {
          student {
            id
            email
            fullName
            studentNumber
            walletAddress
            program
            department
            enrollmentYear
            graduationYear
            profilePicUrl
            isActive
          }
          accessToken
          refreshToken
        }
      }
    `;

    return this.request<{
      studentLoginWithWallet: {
        student: any;
        accessToken: string;
        refreshToken: string;
      };
    }>(mutation, { walletAddress });
  }

  async meStudent() {
    const query = `
      query MeStudent {
        meStudent {
          id
          email
          fullName
          studentNumber
          walletAddress
          program
          department
          enrollmentYear
          graduationYear
          profilePicUrl
          isActive
          certificates {
            id
            certificateNumber
            badgeTitle
            description
            degreeType
            mintAddress
            status
            issuedAt
            revoked
          }
          enrollments {
            id
            gpa
            grade
            batchYear
            course {
              id
              name
              code
              department
            }
            achievements {
              id
              badgeTitle
              description
              badgeType
              achievementDate
            }
          }
          achievements {
            id
            awardedAt
            notes
            achievement {
              id
              title
              description
              category
            }
          }
        }
      }
    `;

    return this.request<{ meStudent: any }>(query);
  }

  async myCertificates() {
    const query = `
      query MyCertificates {
        myCertificates {
          id
          certificateNumber
          badgeTitle
          description
          degreeType
          mintAddress
          merkleTreeAddress
          ipfsMetadataUri
          transactionSignature
          status
          issuedAt
          revoked
          revokedAt
          revocationReason
          metadata
          achievementIds
          student {
            id
            fullName
            email
          }
          enrollment {
            id
            course {
              name
              code
            }
          }
        }
      }
    `;

    return this.request<{ myCertificates: any[] }>(query);
  }

  async myAchievements() {
    const query = `
      query MyAchievements {
        myAchievements {
          id
          awardedAt
          notes
          achievement {
            id
            title
            description
            category
            isActive
          }
        }
      }
    `;

    return this.request<{ myAchievements: any[] }>(query);
  }

  async myVerificationLogs(limit: number = 50, offset: number = 0) {
    const query = `
      query MyVerificationLogs($limit: Int, $offset: Int) {
        myVerificationLogs(limit: $limit, offset: $offset) {
          id
          verifiedAt
          verificationType
          verificationStatus
          verifierIpAddress
          verifierLocation
          verifierUserAgent
          certificateNumber
          mintAddress
          errorMessage
          certificate {
            id
            certificateNumber
            badgeTitle
            mintAddress
            status
            issuedAt
          }
        }
      }
    `;

    return this.request<{ myVerificationLogs: any[] }>(query, { limit, offset });
  }

  async myVerificationLogStats() {
    const query = `
      query MyVerificationLogStats {
        myVerificationLogStats {
          total
          successful
          failed
        }
      }
    `;

    return this.request<{ myVerificationLogStats: { total: number; successful: number; failed: number } }>(query);
  }

  // ============================================
  // TOTP 2FA
  // ============================================

  async initiateTOTPSetup() {
    const mutation = `
      mutation InitiateTOTPSetup {
        initiateTOTPSetup {
          secret
          qrCodeDataUrl
        }
      }
    `;

    return this.request<{
      initiateTOTPSetup: {
        secret: string;
        qrCodeDataUrl: string;
      };
    }>(mutation);
  }

  async verifyAndEnableTOTP(token: string) {
    const mutation = `
      mutation VerifyAndEnableTOTP($token: String!) {
        verifyAndEnableTOTP(token: $token)
      }
    `;

    return this.request<{ verifyAndEnableTOTP: boolean }>(mutation, { token });
  }

  async disableTOTP(password: string) {
    const mutation = `
      mutation DisableTOTP($password: String!) {
        disableTOTP(password: $password)
      }
    `;

    return this.request<{ disableTOTP: boolean }>(mutation, { password });
  }

  // ============================================
  // ZK ACHIEVEMENT VERIFICATION
  // ============================================

  /**
   * Register a commitment for an achievement (student only)
   */
  async registerAchievementCommitment(input: {
    credentialId: string;
    achievementCode: string;
    commitment: string;
  }) {
    const mutation = `
      mutation RegisterAchievementCommitment($input: RegisterCommitmentInput!) {
        registerAchievementCommitment(input: $input) {
          success
          commitmentId
          message
        }
      }
    `;

    return this.request<{
      registerAchievementCommitment: {
        success: boolean;
        commitmentId: string | null;
        message: string | null;
      };
    }>(mutation, { input });
  }

  /**
   * Batch register commitments for multiple achievements
   */
  async registerAchievementCommitmentsBatch(
    inputs: Array<{
      credentialId: string;
      achievementCode: string;
      commitment: string;
    }>
  ) {
    const mutation = `
      mutation RegisterAchievementCommitmentsBatch($inputs: [RegisterCommitmentInput!]!) {
        registerAchievementCommitmentsBatch(inputs: $inputs) {
          success
          commitmentId
          message
        }
      }
    `;

    return this.request<{
      registerAchievementCommitmentsBatch: Array<{
        success: boolean;
        commitmentId: string | null;
        message: string | null;
      }>;
    }>(mutation, { inputs });
  }

  /**
   * Upload a proof for an achievement (student only)
   */
  async uploadAchievementProof(input: {
    credentialId: string;
    achievementCode: string;
    proof: any;
    publicSignals: string[];
  }) {
    const mutation = `
      mutation UploadAchievementProof($input: UploadProofInput!) {
        uploadAchievementProof(input: $input) {
          success
          proofId
          proofHash
          message
        }
      }
    `;

    return this.request<{
      uploadAchievementProof: {
        success: boolean;
        proofId: string | null;
        proofHash: string | null;
        message: string | null;
      };
    }>(mutation, { input });
  }

  /**
   * Batch upload proofs for multiple achievements
   */
  async uploadAchievementProofsBatch(
    inputs: Array<{
      credentialId: string;
      achievementCode: string;
      proof: any;
      publicSignals: string[];
    }>
  ) {
    const mutation = `
      mutation UploadAchievementProofsBatch($inputs: [UploadProofInput!]!) {
        uploadAchievementProofsBatch(inputs: $inputs) {
          success
          proofId
          proofHash
          message
        }
      }
    `;

    return this.request<{
      uploadAchievementProofsBatch: Array<{
        success: boolean;
        proofId: string | null;
        proofHash: string | null;
        message: string | null;
      }>;
    }>(mutation, { inputs });
  }

  /**
   * Get ZK status for a certificate (student dashboard)
   */
  async myZkCertificateStatus(credentialId: string) {
    const query = `
      query MyZkCertificateStatus($credentialId: String!) {
        myZkCertificateStatus(credentialId: $credentialId) {
          credentialId
          achievements {
            achievementCode
            achievementTitle
            zkEnabled
            hasCommitment
            hasProof
            lastVerifiedAt
            verificationCount
          }
        }
      }
    `;

    return this.request<{
      myZkCertificateStatus: {
        credentialId: string;
        achievements: Array<{
          achievementCode: string;
          achievementTitle: string;
          zkEnabled: boolean;
          hasCommitment: boolean;
          hasProof: boolean;
          lastVerifiedAt: string | null;
          verificationCount: number;
        }>;
      } | null;
    }>(query, { credentialId });
  }

  /**
   * Get ZK status for achievements on a certificate (public)
   */
  async getZkAchievementStatuses(credentialId: string) {
    const query = `
      query GetZkAchievementStatuses($credentialId: String!) {
        getZkAchievementStatuses(credentialId: $credentialId) {
          achievementCode
          achievementTitle
          zkEnabled
          hasCommitment
          hasProof
          lastVerifiedAt
          verificationCount
        }
      }
    `;

    return this.request<{
      getZkAchievementStatuses: Array<{
        achievementCode: string;
        achievementTitle: string;
        zkEnabled: boolean;
        hasCommitment: boolean;
        hasProof: boolean;
        lastVerifiedAt: string | null;
        verificationCount: number;
      }>;
    }>(query, { credentialId });
  }

  /**
   * Verify a stored proof (public - employer verification)
   */
  async verifyStoredAchievementProof(input: {
    credentialId: string;
    achievementCode: string;
  }) {
    const query = `
      query VerifyStoredAchievementProof($input: VerifyProofInput!) {
        verifyStoredAchievementProof(input: $input) {
          verified
          verifiedAt
          failureReason
          proofHash
        }
      }
    `;

    return this.request<{
      verifyStoredAchievementProof: {
        verified: boolean;
        verifiedAt: string | null;
        failureReason: string | null;
        proofHash: string | null;
      };
    }>(query, { input });
  }

  // ============================================================================
  // NOTIFICATION METHODS
  // ============================================================================

  /**
   * Get notifications for admin (university admin or super admin)
   */
  async getNotifications(first: number = 5, after?: string) {
    const query = `
      query GetNotifications($first: Int, $after: String) {
        notifications(first: $first, after: $after) {
          nodes {
            id
            type
            title
            message
            priority
            metadata
            actionUrl
            read
            readAt
            createdAt
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
          unreadCount
        }
      }
    `;

    return this.request<{
      notifications: {
        nodes: Array<{
          id: string;
          type: string;
          title: string;
          message: string;
          priority: string;
          metadata: Record<string, unknown> | null;
          actionUrl: string | null;
          read: boolean;
          readAt: string | null;
          createdAt: string;
        }>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
        totalCount: number;
        unreadCount: number;
      };
    }>(query, { first, after });
  }

  /**
   * Get unread notification count for admin
   */
  async getUnreadNotificationCount() {
    const query = `
      query GetUnreadNotificationCount {
        unreadNotificationCount
      }
    `;

    return this.request<{ unreadNotificationCount: number }>(query);
  }

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(id: string) {
    const query = `
      mutation MarkNotificationAsRead($id: ID!) {
        markNotificationAsRead(id: $id) {
          id
          read
          readAt
        }
      }
    `;

    return this.request<{
      markNotificationAsRead: {
        id: string;
        read: boolean;
        readAt: string | null;
      };
    }>(query, { id });
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead() {
    const query = `
      mutation MarkAllNotificationsAsRead {
        markAllNotificationsAsRead
      }
    `;

    return this.request<{ markAllNotificationsAsRead: boolean }>(query);
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string) {
    const query = `
      mutation DeleteNotification($id: ID!) {
        deleteNotification(id: $id)
      }
    `;

    return this.request<{ deleteNotification: boolean }>(query, { id });
  }

  /**
   * Get notifications for student
   */
  async getStudentNotifications(first: number = 5, after?: string) {
    const query = `
      query GetStudentNotifications($first: Int, $after: String) {
        studentNotifications(first: $first, after: $after) {
          nodes {
            id
            type
            title
            message
            priority
            metadata
            actionUrl
            read
            readAt
            createdAt
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
          unreadCount
        }
      }
    `;

    return this.request<{
      studentNotifications: {
        nodes: Array<{
          id: string;
          type: string;
          title: string;
          message: string;
          priority: string;
          metadata: Record<string, unknown> | null;
          actionUrl: string | null;
          read: boolean;
          readAt: string | null;
          createdAt: string;
        }>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
        totalCount: number;
        unreadCount: number;
      };
    }>(query, { first, after });
  }

  /**
   * Get unread notification count for student
   */
  async getStudentUnreadNotificationCount() {
    const query = `
      query GetStudentUnreadNotificationCount {
        studentUnreadNotificationCount
      }
    `;

    return this.request<{ studentUnreadNotificationCount: number }>(query);
  }

  /**
   * Mark a student notification as read
   */
  async markStudentNotificationAsRead(id: string) {
    const query = `
      mutation MarkStudentNotificationAsRead($id: ID!) {
        markStudentNotificationAsRead(id: $id) {
          id
          read
          readAt
        }
      }
    `;

    return this.request<{
      markStudentNotificationAsRead: {
        id: string;
        read: boolean;
        readAt: string | null;
      };
    }>(query, { id });
  }

  /**
   * Mark all student notifications as read
   */
  async markAllStudentNotificationsAsRead() {
    const query = `
      mutation MarkAllStudentNotificationsAsRead {
        markAllStudentNotificationsAsRead
      }
    `;

    return this.request<{ markAllStudentNotificationsAsRead: boolean }>(query);
  }

  /**
   * Delete a student notification
   */
  async deleteStudentNotification(id: string) {
    const query = `
      mutation DeleteStudentNotification($id: ID!) {
        deleteStudentNotification(id: $id)
      }
    `;

    return this.request<{ deleteStudentNotification: boolean }>(query, { id });
  }

  /**
   * Get SSE endpoint URL with token
   */
  getSSEEndpoint(): string {
    const baseUrl = this.endpoint.replace('/graphql', '');
    const token = this.token || '';
    return `${baseUrl}/api/notifications/stream?token=${token}`;
  }
}

export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT);

