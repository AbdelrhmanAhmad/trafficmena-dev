
import React, { useCallback, useMemo } from 'react';
import ReactQuill from 'react-quill';
import DOMPurify from 'dompurify';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder,
  maxLength = 5000 
}) => {
  // Configure DOMPurify with strict settings
  const sanitizeConfig = useMemo(() => ({
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'u', 's',
      'ol', 'ul', 'li', 'blockquote', 'pre', 'code', 'a'
    ],
    ALLOWED_ATTR: ['href', 'class'],
    ALLOWED_SCHEMES: ['http', 'https', 'mailto'],
    FORBID_ATTR: ['style', 'onclick', 'onerror', 'onload'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    KEEP_CONTENT: true,
    FORCE_BODY: false
  }), []);

  // Quill modules with restricted functionality
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link'],
      ['clean']
    ],
    clipboard: {
      // Strip formatting when pasting
      matchVisual: false,
    }
  }), []);

  // Allowed formats - restricted set
  const formats = useMemo(() => [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'blockquote', 'code-block',
    'link'
  ], []);

  // Sanitize content on change
  const handleChange = useCallback((content: string) => {
    // Check length limit
    const textLength = new DOMParser().parseFromString(content, 'text/html').body.textContent?.length || 0;
    if (textLength > maxLength) {
      return; // Don't allow content exceeding max length
    }

    // Sanitize the content
    const sanitizedContent = DOMPurify.sanitize(content, sanitizeConfig);
    
    // Additional security check - remove any remaining script content
    const finalContent = sanitizedContent
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
    
    onChange(finalContent);
  }, [onChange, sanitizeConfig, maxLength]);

  // Sanitize initial value
  const sanitizedValue = useMemo(() => {
    if (!value) return '';
    return DOMPurify.sanitize(value, sanitizeConfig);
  }, [value, sanitizeConfig]);

  return (
    <div className="bg-white">
      <ReactQuill
        theme="snow"
        value={sanitizedValue}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="min-h-[200px]"
        bounds="self" // Restrict to container
      />
      <div className="text-xs text-gray-500 mt-2">
        {new DOMParser().parseFromString(sanitizedValue, 'text/html').body.textContent?.length || 0} / {maxLength} characters
      </div>
    </div>
  );
};

export default RichTextEditor;
