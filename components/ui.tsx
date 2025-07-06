import React from 'react';
import { CardProps, ButtonProps, InputProps, SelectProps, ModalProps } from '../types';

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => (
  <div className={`bg-surface rounded-lg shadow-lg p-6 ${className}`}>
    {title && <h2 className="text-xl font-bold mb-4 text-text-primary">{title}</h2>}
    {children}
  </div>
);

export const Button: React.FC<ButtonProps> = ({ children, className = '', variant = 'primary', size = 'base', ...props }) => {
  const baseClasses = "rounded-md font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";
  
  const variantClasses = {
    primary: 'bg-accent hover:bg-blue-600 focus:ring-accent',
    secondary: 'bg-secondary hover:bg-slate-700 focus:ring-secondary',
    danger: 'bg-error hover:bg-red-700 focus:ring-error',
  };

  const sizeClasses = {
      base: 'px-4 py-2',
      sm: 'p-2'
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Input: React.FC<InputProps> = ({ label, id, className = '', type = 'text', ...props }) => (
  <div className="w-full">
    <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">
      {label}
    </label>
    <input
      id={id}
      type={type}
      className={`w-full bg-background border border-secondary rounded-md p-2 text-text-primary focus:ring-2 focus:ring-accent focus:border-accent outline-none ${className}`}
      {...props}
    />
  </div>
);

export const Select: React.FC<SelectProps> = ({ label, id, children, className = '', ...props }) => (
  <div className="w-full">
    <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">
      {label}
    </label>
    <select
      id={id}
      className={`w-full bg-background border border-secondary rounded-md p-2 text-text-primary focus:ring-2 focus:ring-accent focus:border-accent outline-none ${className}`}
      {...props}
    >
      {children}
    </select>
  </div>
);

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-secondary">
          <h3 className="text-lg font-bold text-text-primary">{title}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
