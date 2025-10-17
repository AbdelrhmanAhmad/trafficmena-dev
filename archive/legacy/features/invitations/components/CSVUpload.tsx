import { AlertCircle, File, Loader2, Upload } from 'lucide-react';
import type React from 'react';
import { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';

interface CSVUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  disabled?: boolean;
  maxSizeInMB?: number;
}

export function CSVUpload({
  onFileSelect,
  isProcessing = false,
  disabled = false,
  maxSizeInMB = 10,
}: CSVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        // Handle rejected files
        const errors = rejectedFiles.flatMap((file) => file.errors);
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    maxSize: maxSizeInMB * 1024 * 1024, // Convert MB to bytes
    disabled: disabled || isProcessing,
  });

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag and Drop Zone */}
      <Card>
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200 ease-in-out
              ${
                isDragActive && !isDragReject
                  ? 'border-primary bg-primary/5'
                  : isDragReject
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400'
              }
              ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />

            <div className="space-y-4">
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <h3 className="text-lg font-medium text-gray-900">Processing CSV...</h3>
                  <p className="text-sm text-gray-500">Please wait while we validate your file</p>
                </div>
              ) : isDragReject ? (
                <div className="flex flex-col items-center">
                  <AlertCircle className="h-12 w-12 text-red-500" />
                  <h3 className="text-lg font-medium text-red-600">Invalid File</h3>
                  <p className="text-sm text-red-500">
                    Please upload a valid CSV file (max {maxSizeInMB}MB)
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="h-12 w-12 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900">
                    {isDragActive ? 'Drop the CSV file here' : 'Drag & drop CSV file here'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    or click to select a file (max {maxSizeInMB}MB)
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alternative Upload Button */}
      <div className="flex justify-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isProcessing}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={disabled || isProcessing}
          className="flex items-center gap-2"
        >
          <File className="h-4 w-4" />
          Choose CSV File
        </Button>
      </div>

      {/* Instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">CSV Format Requirements:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                Required columns: <code>email</code>, <code>first_name</code>,{' '}
                <code>last_name</code>
              </li>
              <li>
                Optional column: <code>custom_message</code>
              </li>
              <li>First row should contain column headers</li>
              <li>Email addresses must be valid and unique</li>
              <li>Maximum file size: {maxSizeInMB}MB</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
