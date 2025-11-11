const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: Record<string, any>;
  }>;
}

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

      if (json.errors) {
        console.error('GraphQL Errors:', json.errors);
      }

      return json;
    } catch (error) {
      console.error('GraphQL Request Failed:', error);
      throw error;
    }
  }

  // Auth mutations
  async login(email: string, password: string) {
    const query = `
      mutation Login($input: LoginInput!) {
        login(input: $input) {
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
              walletAddress
              status
            }
          }
          accessToken
          refreshToken
        }
      }
    `;

    const response = await this.request<{
      login: {
        admin: any;
        accessToken: string;
        refreshToken: string;
      };
    }>(query, {
      input: { email, password },
    });

    // Store tokens and user data on successful login
    if (response.data?.login) {
      this.setToken(response.data.login.accessToken);
      if (typeof window !== 'undefined') {
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
      console.warn(
        '[GraphQLClient] Falling back to legacy university query without rejectedReason field'
      );
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
        semester?: string;
        department: string;
        degreeType: string;
      };
      batchYear: number;
      semester?: string;
      status?: string;
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
            semester
            status
            gpa
            grade
            course {
              id
              code
              name
              level
              department
              credits
              semester
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
      courseSemester?: string | null;
      degreeType: string;
      enrollmentSemester?: string | null;
      enrollmentStatus?: string | null;
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
            semester
            status
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
}

export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT);

