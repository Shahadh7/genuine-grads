# In-App Notification System - Implementation Plan

## Overview

A comprehensive in-app notification system for GenuineGrads that provides real-time notifications via Server-Sent Events (SSE) with full database persistence, supporting all user roles (Super Admins, University Admins, Students).

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                    │
├─────────────────────────────────────────────────────────────────────┤
│  NotificationProvider (Context)                                      │
│    ├── SSE Client (EventSource) ──────────────────────┐             │
│    ├── Notification State (unread count, list)        │             │
│    └── Actions (markAsRead, delete, fetchMore)        │             │
│                                                        │             │
│  NotificationBell (shared component)                   │             │
│    ├── Bell icon with unread badge                    │             │
│    ├── Dropdown with 5 latest notifications           │             │
│    └── "View All" → /notifications page               │             │
│                                                        │             │
│  NotificationsPage (/notifications)                    │             │
│    └── Infinite scroll list (load 5, then more)       │             │
└────────────────────────────────────────────────────────│─────────────┘
                                                         │
                          SSE Stream                     │
                                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          BACKEND                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Express SSE Endpoint (/api/notifications/stream)                    │
│    ├── JWT Authentication                                            │
│    └── Per-user connection management                                │
│                                                                      │
│  NotificationService                                                 │
│    ├── create() → Insert to DB + Emit SSE                           │
│    ├── getNotifications() → Paginated fetch                         │
│    ├── getUnreadCount() → Count query                               │
│    ├── markAsRead() / markAllAsRead()                               │
│    └── delete()                                                      │
│                                                                      │
│  GraphQL Resolvers (Queries + Mutations)                            │
│                                                                      │
│  Event Triggers (in existing mutations)                             │
│    ├── Certificate mutations → notify student                       │
│    ├── University mutations → notify admins                         │
│    ├── ZK proof mutations → notify student                          │
│    └── Auth mutations → security notifications                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE                                      │
├─────────────────────────────────────────────────────────────────────┤
│  Shared DB (shared.prisma)                                          │
│    └── AdminNotification (for Super Admins & Uni Admins)            │
│                                                                      │
│  University DB (university.prisma)                                   │
│    └── StudentNotification (for Students)                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema

### 1.1 Add AdminNotification to `shared.prisma`

```prisma
enum NotificationType {
  CERTIFICATE_ISSUED
  CERTIFICATE_MINTED
  CERTIFICATE_REVOKED
  UNIVERSITY_REGISTERED
  UNIVERSITY_APPROVED
  UNIVERSITY_REJECTED
  UNIVERSITY_SUSPENDED
  ZK_PROOF_VERIFIED
  ZK_PROOF_FAILED
  SECURITY_LOGIN_FAILED
  SECURITY_ACCOUNT_LOCKED
  SECURITY_NEW_DEVICE
  BATCH_JOB_COMPLETED
  BATCH_JOB_FAILED
  SYSTEM_ANNOUNCEMENT
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

model AdminNotification {
  id              String               @id @default(cuid())

  // Recipient
  adminId         String
  admin           Admin                @relation(fields: [adminId], references: [id], onDelete: Cascade)

  // Content
  type            NotificationType
  title           String
  message         String               @db.Text
  priority        NotificationPriority @default(NORMAL)

  // Optional metadata (JSON for flexibility)
  metadata        Json?                // { certificateId, universityId, studentWallet, etc. }
  actionUrl       String?              // Deep link to relevant page

  // Status
  read            Boolean              @default(false)
  readAt          DateTime?

  // Timestamps
  createdAt       DateTime             @default(now())
  expiresAt       DateTime?            // Auto-cleanup old notifications

  @@index([adminId, read])
  @@index([adminId, createdAt])
  @@index([type])
  @@map("admin_notifications")
}
```

### 1.2 Add StudentNotification to `university.prisma`

```prisma
enum NotificationType {
  CERTIFICATE_ISSUED
  CERTIFICATE_MINTED
  CERTIFICATE_REVOKED
  CERTIFICATE_VERIFIED
  ZK_COMMITMENT_REGISTERED
  ZK_PROOF_UPLOADED
  ZK_PROOF_VERIFIED
  ZK_PROOF_FAILED
  ACHIEVEMENT_AWARDED
  ENROLLMENT_ADDED
  SECURITY_NEW_LOGIN
  SECURITY_WALLET_LINKED
  SYSTEM_ANNOUNCEMENT
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

model StudentNotification {
  id              String               @id @default(cuid())

  // Recipient
  studentId       String
  student         Student              @relation(fields: [studentId], references: [id], onDelete: Cascade)

  // Content
  type            NotificationType
  title           String
  message         String               @db.Text
  priority        NotificationPriority @default(NORMAL)

  // Optional metadata
  metadata        Json?
  actionUrl       String?

  // Status
  read            Boolean              @default(false)
  readAt          DateTime?

  // Timestamps
  createdAt       DateTime             @default(now())
  expiresAt       DateTime?

  @@index([studentId, read])
  @@index([studentId, createdAt])
  @@index([type])
  @@map("student_notifications")
}
```

### 1.3 Update Student Model Relationship

Add to Student model in `university.prisma`:
```prisma
notifications   StudentNotification[]
```

Add to Admin model in `shared.prisma`:
```prisma
notifications   AdminNotification[]
```

---

## Phase 2: Backend Implementation

### 2.1 Files to Create

| File | Description |
|------|-------------|
| `backend/src/services/notification/notification.service.ts` | Core notification service |
| `backend/src/services/notification/notification.types.ts` | TypeScript interfaces |
| `backend/src/services/notification/sse.manager.ts` | SSE connection manager |
| `backend/src/routes/sse.routes.ts` | Express SSE endpoint |
| `backend/src/graphql/resolvers/queries/notification.queries.ts` | GraphQL queries |
| `backend/src/graphql/resolvers/mutations/notification.mutations.ts` | GraphQL mutations |

### 2.2 SSE Manager (`sse.manager.ts`)

```typescript
// Manages SSE connections per user
interface SSEConnection {
  response: Response;
  role: 'admin' | 'student';
  userId: string;
  universityId?: string; // For students
}

class SSEManager {
  private connections: Map<string, SSEConnection[]>;

  addConnection(userId: string, connection: SSEConnection): void;
  removeConnection(userId: string, response: Response): void;
  sendToUser(userId: string, event: NotificationEvent): void;
  sendToRole(role: string, event: NotificationEvent): void;
  sendToUniversity(universityId: string, event: NotificationEvent): void;
}
```

### 2.3 SSE Express Route (`sse.routes.ts`)

```typescript
// GET /api/notifications/stream
// Headers: Authorization: Bearer <token>
// Query params: ?role=admin|student

router.get('/stream', authenticateSSE, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Add to SSE manager
  sseManager.addConnection(req.user.id, { response: res, ... });

  // Send initial heartbeat
  res.write('event: connected\ndata: {"status":"connected"}\n\n');

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    res.write('event: heartbeat\ndata: {}\n\n');
  }, 30000);

  // Cleanup on close
  req.on('close', () => {
    clearInterval(heartbeat);
    sseManager.removeConnection(req.user.id, res);
  });
});
```

### 2.4 Notification Service (`notification.service.ts`)

```typescript
class NotificationService {
  // Create notification and emit SSE event
  async createAdminNotification(params: CreateAdminNotificationParams): Promise<AdminNotification>;
  async createStudentNotification(params: CreateStudentNotificationParams): Promise<StudentNotification>;

  // Queries
  async getAdminNotifications(adminId: string, options: PaginationOptions): Promise<PaginatedResult>;
  async getStudentNotifications(studentId: string, uniDb: PrismaClient, options: PaginationOptions): Promise<PaginatedResult>;
  async getUnreadCount(userId: string, role: 'admin' | 'student', uniDb?: PrismaClient): Promise<number>;

  // Actions
  async markAsRead(notificationId: string, role: 'admin' | 'student', uniDb?: PrismaClient): Promise<void>;
  async markAllAsRead(userId: string, role: 'admin' | 'student', uniDb?: PrismaClient): Promise<void>;
  async deleteNotification(notificationId: string, role: 'admin' | 'student', uniDb?: PrismaClient): Promise<void>;
}
```

### 2.5 GraphQL Schema Additions

Add to `schema.ts`:

```graphql
# Types
enum NotificationType {
  CERTIFICATE_ISSUED
  CERTIFICATE_MINTED
  CERTIFICATE_REVOKED
  UNIVERSITY_REGISTERED
  UNIVERSITY_APPROVED
  UNIVERSITY_REJECTED
  UNIVERSITY_SUSPENDED
  ZK_PROOF_VERIFIED
  ZK_PROOF_FAILED
  SECURITY_LOGIN_FAILED
  SECURITY_ACCOUNT_LOCKED
  ACHIEVEMENT_AWARDED
  BATCH_JOB_COMPLETED
  SYSTEM_ANNOUNCEMENT
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

type Notification {
  id: ID!
  type: NotificationType!
  title: String!
  message: String!
  priority: NotificationPriority!
  metadata: JSON
  actionUrl: String
  read: Boolean!
  readAt: DateTime
  createdAt: DateTime!
}

type NotificationConnection {
  nodes: [Notification!]!
  pageInfo: PageInfo!
  totalCount: Int!
  unreadCount: Int!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

# Queries (add to existing Query type)
extend type Query {
  notifications(first: Int, after: String): NotificationConnection! @auth(requires: [ADMIN, SUPER_ADMIN, STUDENT])
  unreadNotificationCount: Int! @auth(requires: [ADMIN, SUPER_ADMIN, STUDENT])
}

# Mutations (add to existing Mutation type)
extend type Mutation {
  markNotificationAsRead(id: ID!): Notification! @auth(requires: [ADMIN, SUPER_ADMIN, STUDENT])
  markAllNotificationsAsRead: Boolean! @auth(requires: [ADMIN, SUPER_ADMIN, STUDENT])
  deleteNotification(id: ID!): Boolean! @auth(requires: [ADMIN, SUPER_ADMIN, STUDENT])
}
```

### 2.6 Event Trigger Integration Points

Modify these existing mutation files to emit notifications:

| File | Events to Trigger |
|------|-------------------|
| `certificate.mutations.ts` | `CERTIFICATE_ISSUED`, `CERTIFICATE_MINTED`, `CERTIFICATE_REVOKED` |
| `university.mutations.ts` | `UNIVERSITY_APPROVED`, `UNIVERSITY_REJECTED`, `UNIVERSITY_SUSPENDED` |
| `auth.mutations.ts` | `SECURITY_LOGIN_FAILED`, `SECURITY_ACCOUNT_LOCKED` |
| `student-auth.mutations.ts` | `SECURITY_NEW_LOGIN`, `SECURITY_WALLET_LINKED` |
| `zk.mutations.ts` | `ZK_PROOF_VERIFIED`, `ZK_PROOF_FAILED`, `ZK_COMMITMENT_REGISTERED` |
| `student.mutations.ts` | `ACHIEVEMENT_AWARDED`, `ENROLLMENT_ADDED` |
| `solana.mutations.ts` | `CERTIFICATE_MINTED` (after blockchain confirmation) |

---

## Phase 3: Frontend Implementation

### 3.1 Files to Create

| File | Description |
|------|-------------|
| `frontend/src/contexts/NotificationContext.tsx` | Notification state + SSE client |
| `frontend/src/components/notifications/NotificationBell.tsx` | Bell icon with dropdown |
| `frontend/src/components/notifications/NotificationItem.tsx` | Single notification card |
| `frontend/src/components/notifications/NotificationList.tsx` | List with infinite scroll |
| `frontend/src/app/notifications/page.tsx` | Full notifications page |
| `frontend/src/app/student/notifications/page.tsx` | Student notifications page |
| `frontend/src/app/admin/notifications/page.tsx` | Admin notifications page |
| `frontend/src/lib/graphql-client.ts` | Add notification queries/mutations |

### 3.2 NotificationContext (`NotificationContext.tsx`)

```typescript
interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;

  // Actions
  fetchNotifications: (reset?: boolean) => Promise<void>;
  fetchMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export function NotificationProvider({ children, role }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // SSE Connection
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const eventSource = new EventSource(
      `${API_URL}/api/notifications/stream?token=${token}&role=${role}`
    );

    eventSource.addEventListener('notification', (event) => {
      const notification = JSON.parse(event.data);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast for high priority
      if (notification.priority === 'HIGH' || notification.priority === 'URGENT') {
        toast.info({ title: notification.title, description: notification.message });
      }
    });

    return () => eventSource.close();
  }, [role]);

  // ... rest of implementation
}
```

### 3.3 NotificationBell Component (`NotificationBell.tsx`)

```typescript
export function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Show only 5 latest
  const latestNotifications = notifications.slice(0, 5);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {latestNotifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            latestNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => {
                  markAsRead(notification.id);
                  if (notification.actionUrl) {
                    router.push(notification.actionUrl);
                  }
                  setOpen(false);
                }}
              />
            ))
          )}
        </div>

        <div className="p-2 border-t">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              router.push('/notifications');
              setOpen(false);
            }}
          >
            View All Notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 3.4 NotificationItem Component (`NotificationItem.tsx`)

```typescript
const typeIcons: Record<NotificationType, LucideIcon> = {
  CERTIFICATE_ISSUED: FileCheck,
  CERTIFICATE_MINTED: Award,
  CERTIFICATE_REVOKED: XCircle,
  UNIVERSITY_APPROVED: CheckCircle,
  UNIVERSITY_SUSPENDED: Ban,
  ZK_PROOF_VERIFIED: Shield,
  SECURITY_LOGIN_FAILED: AlertTriangle,
  // ... etc
};

const priorityColors: Record<NotificationPriority, string> = {
  LOW: 'border-l-gray-300',
  NORMAL: 'border-l-blue-500',
  HIGH: 'border-l-orange-500',
  URGENT: 'border-l-red-500',
};

export function NotificationItem({ notification, onClick }: Props) {
  const Icon = typeIcons[notification.type] || Bell;

  return (
    <div
      className={cn(
        "p-3 border-l-4 cursor-pointer hover:bg-muted/50 transition-colors",
        priorityColors[notification.priority],
        !notification.read && "bg-muted/30"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-full",
          notification.read ? "bg-muted" : "bg-primary/10"
        )}>
          <Icon className={cn(
            "h-4 w-4",
            notification.read ? "text-muted-foreground" : "text-primary"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm",
            !notification.read && "font-medium"
          )}>
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>
        {!notification.read && (
          <div className="h-2 w-2 rounded-full bg-primary" />
        )}
      </div>
    </div>
  );
}
```

### 3.5 Notifications Page with Infinite Scroll (`/notifications/page.tsx`)

```typescript
export default function NotificationsPage() {
  const {
    notifications,
    loading,
    hasMore,
    fetchMore,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const observerRef = useRef<IntersectionObserver>();
  const lastNotificationRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchMore();
      }
    });

    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, fetchMore]);

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button variant="outline" onClick={markAllAsRead}>
          Mark All as Read
        </Button>
      </div>

      <div className="space-y-2">
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            ref={index === notifications.length - 1 ? lastNotificationRef : null}
          >
            <NotificationItem
              notification={notification}
              onMarkRead={() => markAsRead(notification.id)}
              onDelete={() => deleteNotification(notification.id)}
              showActions
            />
          </div>
        ))}

        {loading && (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {!hasMore && notifications.length > 0 && (
          <p className="text-center text-muted-foreground p-4">
            No more notifications
          </p>
        )}
      </div>
    </div>
  );
}
```

### 3.6 Layout Integration

**Update University Topbar** (`components/university/topbar.tsx`):
- Replace static bell icon with `<NotificationBell />`

**Update Student Layout** (`app/student/layout.tsx`):
- Add `<NotificationBell />` to the header section

**Update Admin Layout** (`app/admin/layout.tsx`):
- Create a topbar component with `<NotificationBell />`

**Update Root Layout**:
- Wrap app with `<NotificationProvider>`

---

## Phase 4: Event Mapping

### 4.1 Notification Events by User Role

| Event | Super Admin | Uni Admin | Student |
|-------|-------------|-----------|---------|
| University registered | Yes | - | - |
| University approved | Yes | Yes (own) | - |
| University rejected | Yes | Yes (own) | - |
| University suspended | Yes | Yes (own) | - |
| Certificate issued | - | Yes | Yes |
| Certificate minted | - | Yes | Yes |
| Certificate revoked | - | Yes | Yes |
| ZK commitment registered | - | - | Yes |
| ZK proof uploaded | - | - | Yes |
| ZK proof verified | - | - | Yes |
| ZK proof failed | - | - | Yes |
| Batch job completed | - | Yes | - |
| Batch job failed | - | Yes | - |
| Login failed (3+ times) | Yes (all) | Yes (own) | - |
| Account locked | Yes (all) | Yes (own) | - |
| New device login | - | Yes | Yes |
| Achievement awarded | - | Yes | Yes |

### 4.2 Notification Message Templates

```typescript
const notificationTemplates = {
  CERTIFICATE_ISSUED: {
    title: 'Certificate Issued',
    message: (data) => `Your certificate "${data.badgeTitle}" has been issued and is pending blockchain confirmation.`,
    actionUrl: (data) => `/student/certificates/${data.certificateId}`,
  },
  CERTIFICATE_MINTED: {
    title: 'Certificate Minted on Blockchain',
    message: (data) => `Your certificate "${data.badgeTitle}" is now live on Solana blockchain!`,
    actionUrl: (data) => `/student/certificates/${data.certificateId}`,
  },
  UNIVERSITY_APPROVED: {
    title: 'University Approved',
    message: (data) => `${data.universityName} has been approved. Merkle tree and collection are ready.`,
    actionUrl: () => '/university/dashboard',
  },
  // ... etc
};
```

---

## Phase 5: Implementation Checklist

### Backend Tasks

- [ ] Add AdminNotification model to `shared.prisma`
- [ ] Add StudentNotification model to `university.prisma`
- [ ] Run `prisma migrate` for both databases
- [ ] Create `notification.types.ts` with interfaces
- [ ] Create `sse.manager.ts` for connection management
- [ ] Create `notification.service.ts` with CRUD operations
- [ ] Create `sse.routes.ts` Express endpoint
- [ ] Register SSE routes in `server.ts`
- [ ] Add notification types to GraphQL schema
- [ ] Create `notification.queries.ts` resolver
- [ ] Create `notification.mutations.ts` resolver
- [ ] Add resolvers to main resolver map
- [ ] Integrate notification triggers in `certificate.mutations.ts`
- [ ] Integrate notification triggers in `university.mutations.ts`
- [ ] Integrate notification triggers in `auth.mutations.ts`
- [ ] Integrate notification triggers in `zk.mutations.ts`
- [ ] Integrate notification triggers in `solana.mutations.ts`
- [ ] Add notification cleanup job (delete expired)

### Frontend Tasks

- [ ] Create `NotificationContext.tsx` with SSE client
- [ ] Create `NotificationBell.tsx` component
- [ ] Create `NotificationItem.tsx` component
- [ ] Create `NotificationList.tsx` with infinite scroll
- [ ] Create `/notifications/page.tsx` (general)
- [ ] Create `/student/notifications/page.tsx`
- [ ] Create `/admin/notifications/page.tsx`
- [ ] Add notification methods to `graphql-client.ts`
- [ ] Update university `topbar.tsx` with NotificationBell
- [ ] Update student `layout.tsx` with NotificationBell
- [ ] Create admin topbar with NotificationBell
- [ ] Wrap layouts with NotificationProvider
- [ ] Add navigation item for "View All" page
- [ ] Test SSE reconnection on network issues
- [ ] Add loading and empty states

### Testing Tasks

- [ ] Test SSE connection establishment
- [ ] Test SSE reconnection after disconnect
- [ ] Test notification creation and delivery
- [ ] Test mark as read functionality
- [ ] Test mark all as read
- [ ] Test infinite scroll pagination
- [ ] Test notification deletion
- [ ] Test multi-tab synchronization
- [ ] Load test with multiple concurrent connections

---

## Technical Considerations

### SSE vs WebSocket Decision

**Why SSE over WebSocket:**
1. Simpler implementation (no special protocol)
2. Native browser support via `EventSource`
3. Automatic reconnection built-in
4. Works through HTTP/2 multiplexing
5. Notifications are one-way (server → client)
6. No need for bidirectional communication

### Security

1. JWT token validation for SSE connections
2. Rate limiting on SSE endpoint
3. Validate user can only receive their own notifications
4. Sanitize notification content (XSS prevention)
5. Connection timeout after inactivity

### Performance

1. Limit stored notifications per user (e.g., last 100)
2. Auto-cleanup expired notifications (cron job)
3. Connection pooling for SSE manager
4. Efficient cursor-based pagination
5. Index on (userId, read, createdAt)

### Error Handling

1. SSE reconnection with exponential backoff
2. Fallback to polling if SSE fails
3. Queue notifications during disconnect
4. Toast errors for failed operations

---

## File Structure Summary

```
backend/
├── prisma/
│   ├── shared.prisma          # + AdminNotification model
│   └── university.prisma      # + StudentNotification model
├── src/
│   ├── routes/
│   │   └── sse.routes.ts      # NEW: SSE endpoint
│   ├── services/
│   │   └── notification/
│   │       ├── notification.service.ts    # NEW
│   │       ├── notification.types.ts      # NEW
│   │       └── sse.manager.ts             # NEW
│   ├── graphql/
│   │   ├── schema.ts          # + Notification types
│   │   └── resolvers/
│   │       ├── queries/
│   │       │   └── notification.queries.ts  # NEW
│   │       └── mutations/
│   │           └── notification.mutations.ts # NEW
│   └── server.ts              # + SSE routes

frontend/
├── src/
│   ├── contexts/
│   │   └── NotificationContext.tsx        # NEW
│   ├── components/
│   │   ├── notifications/
│   │   │   ├── NotificationBell.tsx       # NEW
│   │   │   ├── NotificationItem.tsx       # NEW
│   │   │   └── NotificationList.tsx       # NEW
│   │   └── university/
│   │       └── topbar.tsx                 # MODIFY
│   ├── app/
│   │   ├── notifications/
│   │   │   └── page.tsx                   # NEW (shared)
│   │   ├── student/
│   │   │   ├── layout.tsx                 # MODIFY
│   │   │   └── notifications/
│   │   │       └── page.tsx               # NEW
│   │   └── admin/
│   │       └── notifications/
│   │           └── page.tsx               # NEW
│   └── lib/
│       └── graphql-client.ts              # MODIFY
```

---

## Approval Required

Please review this plan and confirm if you'd like me to proceed with implementation. Let me know if you have any questions or would like to modify any aspect of the design.
