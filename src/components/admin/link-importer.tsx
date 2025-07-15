'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

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
  const [importId, setImportId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [parsedLinks, setParsedLinks] = useState<ImportLink[]>([]);

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
      const link: any = {};
      
      headers.forEach((header, i) => {
        if (values[i] && values[i] !== '') {
          link[header] = values[i];
        }
      });
      
      if (!link.id || !link.destination) {
        throw new Error(`Row ${index + 2}: Missing required fields (id, destination)`);
      }
      
      return link as ImportLink;
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

      const links = parseData();
      setParsedLinks(links);
      setShowPreview(true);

      console.log('[LinkImporter] Validating', links.length, 'links');

      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'validateImport',
          links
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed');
      }

      setValidationResult(data.data);
      if (data.validationErrors) {
        setValidationErrors(data.validationErrors);
      }

    } catch (err) {
      console.error('[LinkImporter] Validation error:', err);
      setError(err instanceof Error ? err.message : 'Validation failed');
      setShowPreview(false);
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async (dryRun = false) => {
    try {
      setLoading(true);
      setError(null);
      setImportStats(null);

      if (!parsedLinks.length) {
        throw new Error('No valid links to import. Please validate first.');
      }

      console.log('[LinkImporter] Starting import, dryRun:', dryRun);

      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'importLinks',
          links: parsedLinks,
          batchSize: 25,
          dryRun
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportStats(data.stats);
      setImportId(data.importId);
      
      if (!dryRun && data.success) {
        // Clear the form after successful import
        setImportData('');
        setParsedLinks([]);
        setShowPreview(false);
        setValidationResult(null);
      }

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
    setError(null);
    setValidationErrors([]);
    setValidationResult(null);
    setShowPreview(false);
    setParsedLinks([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Link Importer</h2>
        <p className="text-gray-600">Import previously created links in bulk</p>
      </div>

      {/* Import Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Import Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button
              variant={importFormat === 'json' ? 'default' : 'outline'}
              onClick={() => setImportFormat('json')}
            >
              JSON
            </Button>
            <Button
              variant={importFormat === 'csv' ? 'default' : 'outline'}
              onClick={() => setImportFormat('csv')}
            >
              CSV
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => loadSample('json')}>
              Load JSON Sample
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadSample('csv')}>
              Load CSV Sample
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Input */}
      <Card>
        <CardHeader>
          <CardTitle>Import Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder={importFormat === 'json' 
                ? 'Paste your JSON array of link objects here...'
                : 'Paste your CSV data here (first row should be headers: id,destination,createdAt,source,status)...'
              }
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
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
                <div className="text-2xl font-bold text-blue-600">{validationResult.totalLinks}</div>
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
                <Button onClick={() => handleImport(true)} disabled={loading}>
                  Dry Run
                </Button>
                <Button onClick={() => handleImport(false)} disabled={loading}>
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
                <div className="text-lg font-bold text-blue-600">{importStats.processed}</div>
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
            
            {importId && (
              <div className="mt-4 text-sm text-gray-600">
                Import ID: <code className="bg-gray-100 px-1 rounded">{importId}</code>
              </div>
            )}
          </CardContent>
        </Card>
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