export default async function DebugPage() {
  try {
    // Test creating a record from Next.js
    const createResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/test-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: 'https://test-nextjs.com' })
    });
    const createResult = await createResponse.json();
    
    // Try to use the API route to test connectivity
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/fetch-url?id=test`, {
      method: 'GET',
    });
    
    const testResult = await response.json();
    
    // Also try to fetch the known IDs
    const o4Response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/fetch-url?id=O4`, {
      method: 'GET',
    });
    const o4Result = await o4Response.json();
    
    const wfResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/fetch-url?id=Wf`, {
      method: 'GET',
    });
    const wfResult = await wfResponse.json();
    
    // If we created a record, try to fetch it
    let createdRecordResult = null;
    if (createResult.success && createResult.testId) {
      const createdRecordResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/fetch-url?id=${createResult.testId}`, {
        method: 'GET',
      });
      createdRecordResult = await createdRecordResponse.json();
    }
    
                return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Debug: API Route Testing</h1>
          
          <div className="space-y-4">
            <div className="p-4 border rounded bg-[#467291]/10">
              <h3 className="font-bold">Create Test (Next.js created record):</h3>
              <pre>{JSON.stringify(createResult, null, 2)}</pre>
            </div>
            
            {createdRecordResult && (
              <div className="p-4 border rounded bg-green-50">
                <h3 className="font-bold">Reading Next.js Created Record:</h3>
                <pre>{JSON.stringify(createdRecordResult, null, 2)}</pre>
              </div>
            )}
            
            <div className="p-4 border rounded">
              <h3 className="font-bold">Test ID (should return null):</h3>
              <pre>{JSON.stringify(testResult, null, 2)}</pre>
            </div>
            
            <div className="p-4 border rounded">
              <h3 className="font-bold">ID &apos;O4&apos; (Lambda created, should exist):</h3>
              <pre>{JSON.stringify(o4Result, null, 2)}</pre>
            </div>
            
            <div className="p-4 border rounded">
              <h3 className="font-bold">ID &apos;Wf&apos; (Lambda created, should exist):</h3>
              <pre>{JSON.stringify(wfResult, null, 2)}</pre>
            </div>
          </div>
        </div>
      );
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Debug: Error</h1>
        <div className="p-4 bg-red-100 rounded">
          <strong>Error:</strong> {error instanceof Error ? error.message : String(error)}
        </div>
      </div>
    );
  }
} 