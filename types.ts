export enum Role {
  Admin = 'ADMIN',
  Operator = 'OPERATOR',
}

export interface User {
  id: string;
  username: string;
  password?: string; // Only for creation/login, not stored as plain text in real apps
  fullName: string;
  role: Role;
  defaultMachineId?: string;
}

export interface Machine {
  id: string;
  name: string;
}

export interface ProductionReport {
  id?: string;
  deploymentDate: string;
  projectCode: string;
  customerCode: string;
  itemName: string;
  partName: string;
  machineName: string;
  plannedQty: number;
  actualQty: number;
  ngQty: number;
  startTime: string;
  endTime: string;
  surfaceProcess: string;
  otherProcess: string;
  operator: string;
  supervisor: string;
  programmer?: string;
  setter?: string;
  estimatedTimePerPiece: number;
}

export interface DowntimeReport {
  id?: string;
  downtimeDate: string;
  machineName: string;
  startTime: string;
  endTime: string;
  reason: string;
}

// Props for UI components
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'base' | 'sm';
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: React.ReactNode;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}