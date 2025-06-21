import { forwardRef } from 'react';
import ReactTextareaAutosize, { TextareaAutosizeProps } from 'react-textarea-autosize';

interface TextAreaProps extends TextareaAutosizeProps {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  helperText?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, fullWidth = true, className = '', id, ...rest }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    
    return (
      <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
        {label && (
          <label 
            htmlFor={textareaId}
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            {label}
          </label>
        )}
        
        <ReactTextareaAutosize
          ref={ref}
          id={textareaId}
          className={`
            px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400
            focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
            rounded-md text-slate-800 w-full min-h-[100px]
            disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200
            ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${textareaId}-error` : 
            helperText ? `${textareaId}-description` : 
            undefined
          }
          {...rest}
        />
        
        {error && (
          <p 
            id={`${textareaId}-error`}
            className="mt-1 text-sm text-rose-600"
            role="alert"
          >
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p 
            id={`${textareaId}-description`}
            className="mt-1 text-sm text-slate-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export default TextArea;