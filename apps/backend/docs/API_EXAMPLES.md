# GenuineGrads API Examples

Complete GraphQL query and mutation examples for all operations.

## 🔐 Authentication

### Login

```graphql
mutation Login {
  login(input: {
    email: "admin@genuinegrads.com"
    password: "ChangeMe123!"
  }) {
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
```

### Refresh Token

```graphql
mutation RefreshToken {
  refreshToken(refreshToken: "your_refresh_token_here") {
    admin {
      id
      email
    }
    accessToken
    refreshToken
  }
}
```

### Get Current User

```graphql
query Me {
  me {
    id
    email
    username
    isSuperAdmin
    lastLoginAt
    university {
      id
      name
      status
    }
  }
}
```

## 🏛️ University Management (Super Admin)

### List Pending Universities

```graphql
query PendingUniversities {
  pendingUniversities {
    id
    name
    domain
    country
    status
    createdAt
    admins {
      email
      fullName
    }
  }
}
```

### Register University

```graphql
mutation RegisterUniversity {
  registerUniversity(input: {
    name: "Massachusetts Institute of Technology"
    domain: "mit.edu"
    country: "United States"
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0c/MIT_logo.svg"
    websiteUrl: "https://mit.edu"
    adminEmail: "admin@mit.edu"
    adminPassword: "SecurePassword123!"
    adminFullName: "John Smith"
  }) {
    id
    name
    domain
    status
    walletAddress
    createdAt
  }
}
```

### Approve University

```graphql
mutation ApproveUniversity {
  approveUniversity(universityId: "clx123abc") {
    id
    name
    status
    approvedAt
    merkleTreeAddress
  }
}
```

### Reject University

```graphql
mutation RejectUniversity {
  rejectUniversity(
    universityId: "clx123abc"
    reason: "Invalid documentation provided"
  ) {
    id
    name
    status
    rejectedReason
  }
}
```

## 👨‍🎓 Student Management (University Admin)

### List Students

```graphql
query Students {
  students(
    search: "john"
    program: "Computer Science"
    batchYear: 2024
    limit: 20
    offset: 0
  ) {
    id
    fullName
    email
    studentNumber
    program
    department
    enrollmentYear
    walletAddress
    isActive
    createdAt
  }
}
```

### Get Student Details

```graphql
query Student {
  student(id: "clx456def") {
    id
    fullName
    email
    studentNumber
    program
    department
    enrollmentYear
    graduationYear
    walletAddress
    certificates {
      id
      certificateNumber
      badgeTitle
      status
      issuedAt
      revoked
    }
    enrollments {
      id
      course {
        name
        code
      }
      gpa
      grade
      batchYear
    }
  }
}
```

### Register Student

```graphql
mutation RegisterStudent {
  registerStudent(input: {
    email: "john.doe@mit.edu"
    fullName: "John Doe"
    studentNumber: "2024CS001"
    nationalId: "123456789"
    walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
    program: "Computer Science"
    department: "Engineering"
    enrollmentYear: 2024
  }) {
    id
    fullName
    email
    studentNumber
    program
  }
}
```

### Update Student

```graphql
mutation UpdateStudent {
  updateStudent(
    id: "clx456def"
    input: {
      walletAddress: "NewWalletAddress123"
      graduationYear: 2025
    }
  ) {
    id
    fullName
    walletAddress
    graduationYear
  }
}
```

## 📜 Certificate Management (University Admin)

### List Certificates

```graphql
query Certificates {
  certificates(
    status: MINTED
    search: "Computer"
    limit: 20
  ) {
    id
    certificateNumber
    badgeTitle
    status
    issuedAt
    revoked
    student {
      fullName
      studentNumber
      email
    }
    mintAddress
    transactionSignature
  }
}
```

### Get Certificate Details

```graphql
query Certificate {
  certificate(id: "clx789ghi") {
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
    student {
      id
      fullName
      studentNumber
      email
      walletAddress
    }
    metadata
  }
}
```

### Issue Certificate

```graphql
mutation IssueCertificate {
  issueCertificate(input: {
    studentId: "clx456def"
    badgeTitle: "Bachelor of Science in Computer Science"
    description: "Awarded for successfully completing all requirements"
    degreeType: "Bachelor"
    metadata: {
      gpa: 3.85
      honors: "Magna Cum Laude"
      specialization: "Artificial Intelligence"
      graduationDate: "2024-05-15"
    }
    achievementIds: ["achievement_id_1", "achievement_id_2"]
  }) {
    id
    certificateNumber
    badgeTitle
    mintAddress
    transactionSignature
    status
    issuedAt
    student {
      fullName
      email
    }
  }
}
```

### Bulk Issue Certificates

```graphql
mutation BulkIssueCertificates {
  bulkIssueCertificates(input: {
    studentIds: ["clx456def", "clx789ghi", "clx012jkl"]
    templateId: "template_id_123"
    batchName: "Class of 2024 - CS Department"
    certificateData: {
      degreeType: "Bachelor"
      program: "Computer Science"
      graduationDate: "2024-05-15"
    }
  }) {
    jobId
    totalStudents
    status
    createdAt
  }
}
```

### Check Batch Status

```graphql
query BatchIssuanceJob {
  batchIssuanceJob(jobId: "job_1234567890") {
    id
    jobId
    batchName
    status
    totalStudents
    processedCount
    successCount
    failedCount
    resultsJson
    createdAt
    completedAt
  }
}
```

### Revoke Certificate

```graphql
mutation RevokeCertificate {
  revokeCertificate(input: {
    certificateId: "clx789ghi"
    reason: "Academic misconduct discovered"
    adminPassword: "YourAdminPassword"
  }) {
    id
    certificateNumber
    revoked
    revokedAt
    revocationReason
  }
}
```

## 📊 Analytics (University Admin)

### University Dashboard Stats

```graphql
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
```

### My University

```graphql
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
    status
    createdAt
    stats {
      totalCertificates
      mintedCount
      activeStudents
    }
  }
}
```

### Mint Activity Logs

```graphql
query MintActivityLogs {
  mintActivityLogs(
    status: SUCCESS
    limit: 50
  ) {
    id
    studentWallet
    mintAddress
    badgeTitle
    status
    transactionSignature
    timestamp
    university {
      name
    }
  }
}
```

### Revoked Certificates

```graphql
query RevokedCertificates {
  revokedCertificates {
    id
    mintAddress
    certificateNumber
    reason
    studentWallet
    revokedAt
    revokedByUniversity {
      name
    }
  }
}
```

## ✅ Public Certificate Verification (No Auth)

### Verify by Certificate Number

```graphql
query VerifyCertificate {
  verifyCertificatePublic(
    certificateNumber: "MIT-2024-CS-00123"
  ) {
    isValid
    status
    verificationTimestamp
    certificate {
      badgeTitle
      issueDate
      degreeType
      studentName
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
```

### Verify by Mint Address

```graphql
query VerifyCertificateByMint {
  verifyCertificatePublic(
    mintAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
  ) {
    isValid
    status
    certificate {
      badgeTitle
      issueDate
      university {
        name
        logoUrl
      }
    }
    blockchainProof {
      transactionSignature
      metadataUri
    }
  }
}
```

## 📚 Course & Enrollment Management

### Create Course

```graphql
mutation CreateCourse {
  createCourse(input: {
    name: "Introduction to Algorithms"
    code: "CS6.006"
    description: "Design and analysis of algorithms"
    credits: 4
    department: "Computer Science"
  }) {
    id
    name
    code
    credits
  }
}
```

### Create Enrollment

```graphql
mutation CreateEnrollment {
  createEnrollment(input: {
    studentId: "clx456def"
    courseId: "clx111aaa"
    batchYear: 2024
    semester: "Fall 2024"
  }) {
    id
    student {
      fullName
    }
    course {
      name
      code
    }
    batchYear
  }
}
```

### Update Enrollment (Add Grades)

```graphql
mutation UpdateEnrollment {
  updateEnrollment(
    id: "clx222bbb"
    input: {
      gpa: 3.9
      grade: "A"
      status: "COMPLETED"
    }
  ) {
    id
    gpa
    grade
    status
  }
}
```

## 🏆 Achievement Management

### Create Achievement

```graphql
mutation CreateAchievement {
  createAchievement(input: {
    enrollmentId: "clx222bbb"
    badgeTitle: "Dean's List"
    description: "Achieved GPA above 3.8"
    badgeType: "ACADEMIC"
    semester: "Fall 2024"
    achievementDate: "2024-12-15T00:00:00Z"
  }) {
    id
    badgeTitle
    description
    badgeType
  }
}
```

## 🎨 Certificate Templates

### Create Template

```graphql
mutation CreateCertificateTemplate {
  createCertificateTemplate(input: {
    name: "Bachelor of Science"
    degreeType: "Bachelor"
    description: "Standard undergraduate degree template"
    templateFields: {
      gpa: "number",
      honors: "string",
      specialization: "string",
      thesis: "string"
    }
  }) {
    id
    name
    degreeType
    templateFields
  }
}
```

### List Templates

```graphql
query CertificateTemplates {
  certificateTemplates {
    id
    name
    degreeType
    description
    templateFields
    isActive
    timesUsed
  }
}
```

## 🔍 Advanced Queries

### Students with Certificates

```graphql
query StudentsWithCertificates {
  students(limit: 50) {
    id
    fullName
    studentNumber
    program
    certificates {
      id
      certificateNumber
      badgeTitle
      status
      issuedAt
    }
  }
}
```

### University with Full Stats

```graphql
query UniversityFull {
  myUniversity {
    id
    name
    domain
    stats {
      totalCertificates
      mintedCount
      pendingCount
      revokedCount
      activeStudents
      totalStudents
    }
    admins {
      email
      fullName
      lastLoginAt
    }
  }
}
```

---

## 💡 Tips

1. **Always set Authorization header** for authenticated requests:
   ```json
   {
     "Authorization": "Bearer YOUR_ACCESS_TOKEN"
   }
   ```

2. **Use variables** for dynamic values:
   ```graphql
   mutation IssueCertificate($input: IssueCertificateInput!) {
     issueCertificate(input: $input) {
       id
     }
   }
   ```

3. **Request only needed fields** to optimize performance

4. **Use fragments** for repeated field selections:
   ```graphql
   fragment CertificateBasic on Certificate {
     id
     certificateNumber
     badgeTitle
     status
   }
   ```

5. **Check errors** in response - GraphQL returns partial data with errors

---

For more examples, explore the GraphQL Playground at http://localhost:4000/graphql

