'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { importLinks } from '@/utilities/import-links';

interface ImportLink {
  id: string;
  destination: string;
  createdAt?: string;
  ip?: string;
  owner?: string;
  source?: string;
  status?: 'active' | 'reported' | 'inactive';
}

interface ValidationError {
  index: number;
  field: string;
  message: string;
  link: ImportLink;
}

interface ImportStats {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
}

interface ExportLink {
  id: string;
  destination: string;
  createdAt?: string;
  source?: string;
  status?: string;
  owner?: string;
  ip?: string;
  deletedAt?: string;
  deletedReason?: string;
}

interface ValidationResult {
  totalLinks: number;
  validLinks: number;
  errorCount: number;
  isValid: boolean;
}

interface ShortenedUrl {
  id: string;
  destination: string;
  createdAt?: string;
  source?: string;
  status?: string;
  owner?: string;
  ip?: string;
}

interface ImportResult {
  successful: ShortenedUrl[];
  duplicates: ImportLink[];
}

const SAMPLE_CSV = `id,destination,createdAt,source,status
example1,https://www.example.com,2024-01-01T10:00:00Z,upload,active
example2,https://www.google.com,2024-01-02T11:00:00Z,manual,active
example3,https://www.github.com,2024-01-03T12:00:00Z,api,inactive`;

const SAMPLE_JSON = `[
  {
    "id": "example1",
    "destination": "https://www.example.com",
    "createdAt": "2024-01-01T10:00:00Z",
    "source": "upload",
    "status": "active"
  },
  {
    "id": "example2", 
    "destination": "https://www.google.com",
    "createdAt": "2024-01-02T11:00:00Z",
    "source": "manual",
    "status": "active"
  }
]`;

export default function LinkImporter() {
  const [importData, setImportData] = useState('');
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [parsedLinks, setParsedLinks] = useState<ImportLink[]>([]);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showForceUpdateDialog, setShowForceUpdateDialog] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);


  const toShortenedUrls = (items: any[]): ShortenedUrl[] => {
    return (items || [])
      .filter((item: any) => item?.id && item?.destination)
      .map((item: any) => ({
        id: String(item.id),
        destination: String(item.destination),
        createdAt: item.createdAt ?? undefined,
        source: item.source ?? undefined,
        status: item.status ?? undefined,
        owner: item.owner ?? undefined,
        ip: item.ip ?? undefined,
      }));
  };

  const parseCSV = useCallback((csvText: string): ImportLink[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have at least a header and one data row');
    
    const headers = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['id', 'destination'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}`);
    }
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const link: Record<string, string> = {};
      
      headers.forEach((header, i) => {
        if (values[i] && values[i] !== '') {
          link[header] = values[i];
        }
      });
      
      if (!link.id || !link.destination) {
        throw new Error(`Row ${index + 2}: Missing required fields (id, destination)`);
      }
      
      return link as unknown as ImportLink;
    });
  }, []);

  const parseData = useCallback((): ImportLink[] => {
    if (!importData.trim()) {
      throw new Error('Import data is required');
    }

    try {
      if (importFormat === 'json') {
        const parsed = JSON.parse(importData);
        if (!Array.isArray(parsed)) {
          throw new Error('JSON data must be an array of link objects');
        }
        return parsed;
      } else {
        return parseCSV(importData);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to parse import data');
    }
  }, [importData, importFormat, parseCSV]);

  const handleValidate = async () => {
    try {
      setValidating(true);
      setError(null);
      setValidationErrors([]);
      setValidationResult(null);
      setImportResult(null);
      setImportStats(null);

      const links = parseData();
      setParsedLinks(links);
      setShowPreview(true);

      console.log('[LinkImporter] Validating', links.length, 'links');

      // Basic validation - just check required fields
      const validLinks = links.filter(link => link.id && link.destination);
      const errorCount = links.length - validLinks.length;

      setValidationResult({
        totalLinks: links.length,
        validLinks: validLinks.length,
        errorCount,
        isValid: errorCount === 0
      });

      // Set validation errors for missing required fields
      const errors: ValidationError[] = [];
      links.forEach((link, index) => {
        if (!link.id) {
          errors.push({
            index,
            field: 'id',
            message: 'ID is required',
            link
          });
        }
        if (!link.destination) {
          errors.push({
            index,
            field: 'destination',
            message: 'Destination is required',
            link
          });
        }
      });
      setValidationErrors(errors);

    } catch (err) {
      console.error('[LinkImporter] Validation error:', err);
      setError(err instanceof Error ? err.message : 'Validation failed');
      setShowPreview(false);
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      setError(null);
      setImportStats(null);
      setImportResult(null);

      if (!parsedLinks.length) {
        throw new Error('No valid links to import. Please validate first.');
      }

      // Filter to only valid links (have id and destination)
      const validLinks = parsedLinks.filter(link => link.id && link.destination).map(link => ({
        id: link.id,
        destination: link.destination
      }));

      console.log('[LinkImporter] Starting import of', validLinks.length, 'links');

      // const response = await fetch('/api/v2/admin/import', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     links: validLinks,
      //     updateDuplicates: false
      //   })
      // });

      // const data = await response.json();

      // if (!response.ok) {
      //   throw new Error(data.error || 'Import failed');
      // }

      const data = await importLinks(validLinks, false);

      // Handle the response from the new API
      const successful = toShortenedUrls(data?.successfulImports || []);
      const duplicates = data?.failedImports || [];

      setImportResult({
        successful,
        duplicates
      });

      // Set import stats for existing UI
      setImportStats({
        total: validLinks.length,
        processed: validLinks.length,
        successful: successful.length,
        failed: duplicates.length,
        skipped: 0
      });

      // Clear the form after successful import
      setImportData('');
      setParsedLinks([]);
      setShowPreview(false);
      setValidationResult(null);

    } catch (err) {
      console.error('[LinkImporter] Import error:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (format: 'json' | 'csv') => {
    setImportFormat(format);
    setImportData(format === 'json' ? SAMPLE_JSON : SAMPLE_CSV);
    setUploadedFileName(null);
    setError(null);
    setValidationErrors([]);
    setValidationResult(null);
    setShowPreview(false);
    setParsedLinks([]);
    setImportResult(null);
    setImportStats(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !['json', 'csv'].includes(fileExtension)) {
      setError('Please select a .json or .csv file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setImportFormat(fileExtension as 'json' | 'csv');
        setImportData(content);
        setUploadedFileName(file.name);
        setError(null);
        setValidationErrors([]);
        setValidationResult(null);
        setShowPreview(false);
        setParsedLinks([]);
        setImportResult(null);
        setImportStats(null);
      }
    };
    reader.onerror = () => {
      setError('Error reading file');
    };
    reader.readAsText(file);
  };

  const handleForceUpdate = async () => {
    try {
      setLoading(true);
      setError(null);
      setShowForceUpdateDialog(false);

      if (!importResult || !importResult.duplicates.length) {
        throw new Error('No duplicates to update');
      }

      console.log('[LinkImporter] Force updating', importResult.duplicates.length, 'duplicates');

      // const response = await fetch('/api/v2/admin/import', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     links: importResult.duplicates,
      //     updateDuplicates: true
      //   })
      // });

      // const data = await response.json();

      // if (!response.ok) {
      //   throw new Error(data.error || 'Force update failed');
      // }

      const data = await importLinks(importResult.duplicates, true);

      // Handle the response from force update
      const successful = toShortenedUrls(data?.successfulImports || []);
      const stillFailed = data?.failedImports || [];

      // Update the import result to remove successfully updated duplicates
      setImportResult(prev => prev ? {
        successful: [...prev.successful, ...successful],
        duplicates: stillFailed
      } : null);

      // Update import stats
      setImportStats(prev => prev ? {
        ...prev,
        successful: prev.successful + successful.length,
        failed: stillFailed.length
      } : null);

      if (successful.length > 0) {
        console.log('[LinkImporter] Successfully force updated', successful.length, 'duplicates');
      }

    } catch (err) {
      console.error('[LinkImporter] Force update error:', err);
      setError(err instanceof Error ? err.message : 'Force update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setExporting(true);
      setError(null);

      console.log('[LinkImporter] Starting export, format:', format);

      const response = await fetch('/api/v2/admin/export', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const links = await response.json();
      
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        content = JSON.stringify(links, null, 2);
        filename = `links-export-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        // Convert to CSV
        if (links.length === 0) {
          content = 'id,destination,createdAt,source,status,owner,ip,deletedAt,deletedReason\n';
        } else {
          const headers = ['id', 'destination', 'createdAt', 'source', 'status', 'owner', 'ip', 'deletedAt', 'deletedReason'];
          const csvHeaders = headers.join(',');
          const csvRows = links.map((link: ExportLink) => 
            headers.map(header => {
              const value = link[header as keyof ExportLink];
              // Handle null/undefined values and escape commas
              const stringValue = value == null ? '' : String(value);
              return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
            }).join(',')
          );
          content = [csvHeaders, ...csvRows].join('\n');
        }
        filename = `links-export-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('[LinkImporter] Export completed successfully');

    } catch (err) {
      console.error('[LinkImporter] Export error:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Link Importer</h2>
        <p className="text-gray-600">Import previously created links in bulk</p>
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle>Export Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={() => handleExport('json')}
              disabled={exporting}
              variant="outline"
            >
              {exporting ? 'Exporting...' : 'Download JSON'}
            </Button>
            <Button 
              onClick={() => handleExport('csv')}
              disabled={exporting}
              variant="outline"
            >
              {exporting ? 'Exporting...' : 'Download CSV'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Import Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button
              variant={importFormat === 'json' ? 'default' : 'outline'}
              onClick={() => {
                setImportFormat('json');
                setUploadedFileName(null);
                setImportResult(null);
                setImportStats(null);
              }}
            >
              JSON
            </Button>
            <Button
              variant={importFormat === 'csv' ? 'default' : 'outline'}
              onClick={() => {
                setImportFormat('csv');
                setUploadedFileName(null);
                setImportResult(null);
                setImportStats(null);
              }}
            >
              CSV
            </Button>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => loadSample('json')}>
              Load JSON Sample
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadSample('csv')}>
              Load CSV Sample
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Upload File
            </Button>
          </div>
          <input
            id="file-upload"
            type="file"
            accept=".json,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Data Input */}
      <Card>
        <CardHeader>
          <CardTitle>Import Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {uploadedFileName && (
              <div className="text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200">
                📁 Uploaded: {uploadedFileName}
              </div>
            )}
            <Textarea
              placeholder={importFormat === 'json' 
                ? 'Paste your JSON array of link objects here...'
                : 'Paste your CSV data here (first row should be headers: id,destination,createdAt,source,status)...'
              }
              value={importData}
              onChange={(e) => {
                setImportData(e.target.value);
                setUploadedFileName(null); // Clear uploaded file name when manually editing
              }}
              rows={10}
              className="font-mono text-sm"
            />
            
            <div className="flex gap-2">
              <Button 
                onClick={handleValidate}
                disabled={validating || !importData.trim()}
                variant="outline"
              >
                {validating ? 'Validating...' : 'Validate Data'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                                  <div className="text-2xl font-bold text-[#467291]">{validationResult.totalLinks}</div>
                <div className="text-sm text-gray-600">Total Links</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{validationResult.validLinks}</div>
                <div className="text-sm text-gray-600">Valid Links</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{validationResult.errorCount}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
            </div>

            {validationResult.isValid ? (
              <div className="flex gap-2">
                <Button onClick={handleImport} disabled={loading}>
                  {loading ? 'Importing...' : 'Import Links'}
                </Button>
              </div>
            ) : (
              <div className="text-red-600 text-sm">
                Please fix validation errors before importing
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {validationErrors.map((error, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                  <div className="font-medium text-red-800">
                    Row {error.index + 1}, Field: {error.field}
                  </div>
                  <div className="text-red-600">{error.message}</div>
                  <div className="text-gray-600 mt-1">
                    Link ID: {error.link.id || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {showPreview && parsedLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">Destination</th>
                    <th className="text-left p-2">Created At</th>
                    <th className="text-left p-2">Source</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsedLinks.slice(0, 10).map((link, index) => (
                    <tr key={index}>
                      <td className="p-2 font-mono">{link.id}</td>
                      <td className="p-2 max-w-xs truncate">{link.destination}</td>
                      <td className="p-2">{link.createdAt || 'N/A'}</td>
                      <td className="p-2">{link.source || 'N/A'}</td>
                      <td className="p-2">{link.status || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedLinks.length > 10 && (
                <div className="text-sm text-gray-500 text-center mt-2">
                  Showing first 10 of {parsedLinks.length} links
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Stats */}
      {importStats && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold">{importStats.total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div className="text-center">
                                  <div className="text-lg font-bold text-[#467291]">{importStats.processed}</div>
                <div className="text-xs text-gray-600">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{importStats.successful}</div>
                <div className="text-xs text-gray-600">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{importStats.failed}</div>
                <div className="text-xs text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">{importStats.skipped}</div>
                <div className="text-xs text-gray-600">Skipped</div>
              </div>
            </div>
            
            {importStats.total > 0 && (
              <Progress 
                value={(importStats.successful / importStats.total) * 100} 
                className="w-full"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Duplicates */}
      {importResult && importResult.duplicates && importResult.duplicates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Duplicates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-gray-600">
              The following links were not imported because they already exist:
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {importResult.duplicates.map((link, index) => (
                <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <div className="font-medium text-yellow-800">
                    ID: {link.id}
                  </div>
                  <div className="text-gray-600 mt-1 break-all">
                    Destination: {link.destination}
                  </div>
                </div>
              ))}
            </div>
            <Button 
              onClick={() => setShowForceUpdateDialog(true)}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Force Update Duplicates
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Force Update Confirmation Dialog */}
      {showForceUpdateDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 min-h-screen">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Confirm Force Update</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to overwrite the existing data for these {importResult?.duplicates.length} links? 
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline"
                onClick={() => setShowForceUpdateDialog(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleForceUpdate}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? 'Updating...' : 'Yes, Force Update'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 min-h-screen">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#467291] mb-4"></div>
              <div className="text-lg font-medium text-gray-900">Processing Import...</div>
              <div className="text-sm text-gray-600 mt-2 text-center">
                Please wait while we import your links
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="font-medium mb-1">Import Error</div>
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Format Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Import Format Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Required Fields:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><code>id</code> - Unique identifier for the short link</li>
                <li><code>destination</code> - The full URL to redirect to</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Optional Fields:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><code>createdAt</code> - ISO 8601 date string</li>
                <li><code>ip</code> - IP address of creator</li>
                <li><code>owner</code> - Username of owner (defaults to current user)</li>
                <li><code>source</code> - Source of creation: upload, manual, api, or import (defaults to upload)</li>
                <li><code>status</code> - active, reported, or inactive</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}