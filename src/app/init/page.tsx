'use client';

import React, { useState } from 'react';

export default function InitPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const initializeDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/init', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMessage(`✅ Database initialized successfully! Tenant ID: ${result.tenantId}`);
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Initialize CRM Database</h1>
        <p className="text-slate-600 mb-6">
          This will create the default tenant and seed it with sample data for the CRM system.
        </p>
        
        <button
          onClick={initializeDatabase}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
        >
          {loading ? 'Initializing...' : 'Initialize Database'}
        </button>
        
        {message && (
          <div className="mt-4 p-3 rounded-lg bg-slate-100 text-slate-800">
            {message}
          </div>
        )}
        
        <div className="mt-6 text-sm text-slate-500">
          <p>After initialization, you'll be redirected to login.</p>
          <p>Default credentials will be created for demo purposes.</p>
        </div>
      </div>
    </div>
  );
}