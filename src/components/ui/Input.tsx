import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  icon?: ReactNode;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, fullWidth = true, icon, className = '', id, ...rest }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    
    return (
      <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={`
              px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400
              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
              rounded-md text-slate-800 w-full
              disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200
              ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
              ${icon ? 'pl-10' : ''}
              ${className}
            `}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${inputId}-error` : 
              helperText ? `${inputId}-description` : 
              undefined
            }
            {...rest}
          />
        </div>
        
        {error && (
          <p 
            id={`${inputId}-error`}
            className="mt-1 text-sm text-rose-600"
            role="alert"
          >
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p 
            id={`${inputId}-description`}
            className="mt-1 text-sm text-slate-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;