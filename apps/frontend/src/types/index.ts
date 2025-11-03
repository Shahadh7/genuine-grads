// Student types
export interface Student {
  id: string;
  nic: string;
  nicHash: string;
  name: string;
  email: string;
  program: string;
  gpa: number;
  achievements: string[];
  walletConnected: boolean;
  walletAddress: string;
  dateAdded: string;
  certificates: number;
}

// Certificate types
export interface Certificate {
  id: string;
  studentId: string;
  enrollmentId: string;
  certificateTitle: string;
  gpa: number;
  badgeTitles: string[];
  issueReady: boolean;
  mintAddress: string | null;
  ipfsMetadataUrl: string | null;
  timestamp: string | null;
  zkpEnabled: boolean;
}

// Certificate element types for designer
export interface CertificateElement {
  id: string;
  type: 'text' | 'qr_placeholder' | 'image';
  x: number;
  y: number;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  textAlign?: string;
  width?: number;
  height?: number;
  src?: string;
  content?: string;
}

// Issuance result types
export interface IssuanceResult {
  success: string[];
  errors: string[];
  total: number;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Pagination types
export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

// Component props types
export interface LayoutProps {
  children: React.ReactNode;
}

export interface PageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
  params?: { [key: string]: string };
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

// Wallet types
export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  connecting: boolean;
}

// Theme types
export interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

// UI Component types
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

export interface InputProps {
  type?: string;
  value?: any;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
  side?: string;
  position?: string;
}

export interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

export interface PopoverContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface DataTableProps {
  data: any[];
  columns: any[];
  itemsPerPage?: number;
  className?: string;
  emptyMessage?: string;
  showPagination?: boolean;
  showItemsPerPage?: boolean;
}

export interface PaginationProps {
  children: React.ReactNode;
  className?: string;
}

export interface PaginationContentProps {
  children: React.ReactNode;
}

export interface PaginationItemProps {
  children: React.ReactNode;
  key?: string | number;
}

export interface PaginationEllipsisProps {
  className?: string;
}

export interface AvatarProps {
  children: React.ReactNode;
  className?: string;
}

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export interface TabsProps {
  children: React.ReactNode;
  defaultValue?: string;
  className?: string;
}

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export interface TabsTriggerProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export interface TabsContentProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export interface AlertProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableRowProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableCellProps {
  children: React.ReactNode;
  className?: string;
}

export interface DropdownMenuProps {
  children: React.ReactNode;
}

export interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface DropdownMenuItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export interface TextareaProps {
  children?: React.ReactNode;
  className?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
} 